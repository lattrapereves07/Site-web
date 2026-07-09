// Génère les versions FR/EN/NL/DE statiques des pages touristiques du site
// à partir des templates public/*.html (attributs data-i18n) et des
// dictionnaires public/assets/lang/*.json. Lancé avant `vite build`.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cheerio from 'cheerio'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..', 'public')
const LANGS = ['fr', 'en', 'nl', 'de']
const SITE = 'https://www.lattrapereves07.fr'
const OG_LOCALE = { fr: 'fr_FR', en: 'en_US', nl: 'nl_NL', de: 'de_DE' }

const PAGES = [
  { file: 'index.html', metaKey: 'index' },
  { file: 'le-lieu.html', metaKey: 'le_lieu' },
  { file: 'decouvrir.html', metaKey: 'decouvrir' },
  { file: 'manger-et-boire.html', metaKey: 'manger' },
  { file: 'agenda.html', metaKey: 'agenda' },
  { file: 'infos-pratiques.html', metaKey: 'infos' },
  { file: 'billetterie.html', metaKey: 'billetterie' },
  { file: 'la-legende.html', metaKey: 'legende' },
  { file: 'animaux.html', metaKey: 'animaux' },
  { file: 'filets-arbres.html', metaKey: 'filets_arbres' },
  { file: 'parcours-sensoriel.html', metaKey: 'parcours_sensoriel' },
  { file: 'jeux-emerveillement.html', metaKey: 'jeux_emerveillement' },
  { file: 'mentions-legales.html', metaKey: 'mentions' },
  { file: 'politique-de-confidentialite.html', metaKey: 'politique' },
]

function loadJson(lang) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/lang', `${lang}.json`), 'utf-8'))
}

function getNested(obj, key) {
  return key.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj)
}

function urlFor(lang, file) {
  return lang === 'fr' ? `${SITE}/${file}` : `${SITE}/${lang}/${file}`
}

// Chemin relatif (utilisé pour la navigation lang-btn) : fonctionne aussi bien
// en local (dev server) qu'en production, contrairement à une URL absolue.
function relativeUrlFor(fromLang, toLang, file) {
  if (fromLang === toLang) return file
  if (fromLang === 'fr') return `${toLang}/${file}`
  if (toLang === 'fr') return `../${file}`
  return `../${toLang}/${file}`
}

const translations = Object.fromEntries(LANGS.map((l) => [l, loadJson(l)]))

function generatePage(page, lang, srcHtml) {
  const $ = cheerio.load(srcHtml, { decodeEntities: false })
  const dict = translations[lang]

  // 1. Contenu traduit (data-i18n*)
  // Les valeurs non-string (ex: payload JSON pour un script) sont sérialisées.
  $('[data-i18n]').each((_, el) => {
    const val = getNested(dict, $(el).attr('data-i18n'))
    if (val !== null) $(el).html(typeof val === 'string' ? val : JSON.stringify(val))
  })
  $('[data-i18n-placeholder]').each((_, el) => {
    const val = getNested(dict, $(el).attr('data-i18n-placeholder'))
    if (val !== null) $(el).attr('placeholder', val)
  })
  $('[data-i18n-title]').each((_, el) => {
    const val = getNested(dict, $(el).attr('data-i18n-title'))
    if (val !== null) $(el).attr('title', val)
  })
  $('[data-i18n-alt]').each((_, el) => {
    const val = getNested(dict, $(el).attr('data-i18n-alt'))
    if (val !== null) $(el).attr('alt', val)
  })

  // 2. Langue du document
  $('html').attr('lang', lang)

  // 3. Title / meta description / Open Graph
  const metaEntry = getNested(dict, `meta.${page.metaKey}`)
  if (metaEntry) {
    $('title').text(metaEntry.title)
    $('meta[name="description"]').attr('content', metaEntry.description)
    $('meta[property="og:title"]').attr('content', metaEntry.title)
    $('meta[property="og:description"]').attr('content', metaEntry.description)
  }
  $('meta[property="og:url"]').attr('content', urlFor(lang, page.file))
  if ($('meta[property="og:locale"]').length) {
    $('meta[property="og:locale"]').attr('content', OG_LOCALE[lang])
  }

  // Remplace le logo générique par une vraie photo quand c'est encore le cas
  const ogImg = $('meta[property="og:image"]')
  if (ogImg.attr('content') && ogImg.attr('content').includes('logo-full.png')) {
    ogImg.attr('content', `${SITE}/assets/images/og-image-parc.jpg`)
    if ($('meta[property="og:image:width"]').length === 0) {
      ogImg.after('\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">')
    }
  }

  // 4. Canonical (supprime l'existant, en ajoute un propre après <title>)
  $('link[rel="canonical"]').remove()
  $('title').after(`\n  <link rel="canonical" href="${urlFor(lang, page.file)}">`)

  // 5. hreflang complet (fr/en/nl/de + x-default)
  $('link[rel="alternate"]').remove()
  const hreflangBlock =
    LANGS.map((l) => `  <link rel="alternate" hreflang="${l}" href="${urlFor(l, page.file)}">`).join('\n') +
    `\n  <link rel="alternate" hreflang="x-default" href="${urlFor('fr', page.file)}">`
  $('link[rel="canonical"]').after(`\n${hreflangBlock}`)

  // 6. Chemins relatifs des assets (une profondeur en plus pour en/nl/de)
  if (lang !== 'fr') {
    $('[href^="assets/"]').each((_, el) => $(el).attr('href', '../' + $(el).attr('href')))
    $('[src^="assets/"]').each((_, el) => $(el).attr('src', '../' + $(el).attr('src')))
  }

  // 7. Sélecteur de langue : navigation directe vers la page sœur (chemin relatif)
  $('.lang-btn[data-lang]').each((_, el) => {
    const targetLang = $(el).attr('data-lang')
    $(el).attr('data-href', relativeUrlFor(lang, targetLang, page.file))
    $(el).toggleClass('active', targetLang === lang)
  })

  // 8. Schema.org FAQPage généré depuis les .faq-item déjà traduits (SEO)
  // Supprime toute balise générée par un run précédent avant d'en réinsérer une
  // (le run 'fr' est auto-référent : sans ce nettoyage, le schema s'accumule).
  $('script[data-generated="faq-schema"]').remove()
  const faqEntities = []
  $('.faq-item').each((_, el) => {
    const q = $(el).find('.faq-question [data-i18n]').first().text().trim()
    const a = $(el).find('.faq-answer p').first().text().trim()
    if (q && a) faqEntities.push({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })
  })
  if (faqEntities.length) {
    const faqSchema = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqEntities }
    $('head').append(`\n  <script type="application/ld+json" data-generated="faq-schema">${JSON.stringify(faqSchema)}</script>\n`)
  }

  return stripBlankLinesInHead($.html())
}

// cheerio.remove() détache l'élément mais laisse le texte (retour à ligne +
// indentation) qui l'entourait ; comme ce script réécrit ses propres fichiers
// de sortie, ces lignes vides s'accumulent à chaque exécution (non-idempotent).
// On les nettoie dans <head>, seule zone où le script ajoute/retire des balises.
function stripBlankLinesInHead(html) {
  return html.replace(/<head>[\s\S]*?<\/head>/, (head) =>
    head
      .split('\n')
      .filter((line) => line.trim() !== '')
      .join('\n')
  )
}

let count = 0
for (const page of PAGES) {
  const srcPath = path.join(ROOT, page.file)
  const srcHtml = fs.readFileSync(srcPath, 'utf-8')

  for (const lang of LANGS) {
    const output = generatePage(page, lang, srcHtml)
    const outPath = lang === 'fr' ? srcPath : path.join(ROOT, lang, page.file)
    fs.mkdirSync(path.dirname(outPath), { recursive: true })
    fs.writeFileSync(outPath, output, 'utf-8')
    count++
  }
}

console.log(`✓ ${count} pages générées (${PAGES.length} pages × ${LANGS.length} langues)`)

// ===== SITEMAP.XML =====
// Une entrée <url> par langue, avec le jeu complet d'alternates hreflang
// (format sitemap multilingue recommandé par Google).
const urlEntries = []
for (const page of PAGES) {
  for (const lang of LANGS) {
    const alternates = LANGS.map(
      (l) => `    <xhtml:link rel="alternate" hreflang="${l}" href="${urlFor(l, page.file)}"/>`
    ).join('\n')
    urlEntries.push(
      `  <url>\n    <loc>${urlFor(lang, page.file)}</loc>\n${alternates}\n    <xhtml:link rel="alternate" hreflang="x-default" href="${urlFor('fr', page.file)}"/>\n  </url>`
    )
  }
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urlEntries.join('\n')}
</urlset>
`
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), sitemap, 'utf-8')
console.log(`✓ sitemap.xml généré (${urlEntries.length} URLs)`)
