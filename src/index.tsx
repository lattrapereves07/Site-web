import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
  OWNER_PASSWORD?: string
  SQUARE_ACCESS_TOKEN?: string
  BREVO_API_KEY?: string
}

const SQUARE_LOCATION_ID = 'L1QHZTGHT0PC7' // LA FABRIQUE AUX MERVEILLES

const app = new Hono<{ Bindings: Bindings }>()

app.use('/api/*', cors())

// ===== AUTH MIDDLEWARE =====
const requireAuth = async (c: any, next: any) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) {
    return c.json({ error: 'Non autorisé' }, 401)
  }
  const token = auth.replace('Bearer ', '')
  const password = c.env.ADMIN_PASSWORD
  if (!password) return c.json({ error: 'ADMIN_PASSWORD non configuré' }, 500)
  if (token !== password) {
    return c.json({ error: 'Mot de passe incorrect' }, 401)
  }
  await next()
}

// Accès caisse : staff (ADMIN_PASSWORD) ou propriétaire (OWNER_PASSWORD)
const requireCaisse = async (c: any, next: any) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.replace('Bearer ', '')
  const admin = c.env.ADMIN_PASSWORD
  const owner = c.env.OWNER_PASSWORD
  if (token !== admin && token !== owner) return c.json({ error: 'Mot de passe incorrect' }, 401)
  c.set('isOwner', token === owner)
  await next()
}

// Accès propriétaire uniquement
const requireOwner = async (c: any, next: any) => {
  const auth = c.req.header('Authorization')
  if (!auth || !auth.startsWith('Bearer ')) return c.json({ error: 'Non autorisé' }, 401)
  const token = auth.replace('Bearer ', '')
  const owner = c.env.OWNER_PASSWORD
  if (!owner || token !== owner) return c.json({ error: 'Accès propriétaire requis' }, 403)
  await next()
}

async function ensureCaisseTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS caisse_comptages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caisse TEXT NOT NULL,
      comptage_date TEXT NOT NULL,
      comptage_heure TEXT NOT NULL,
      billet_500 INTEGER NOT NULL DEFAULT 0,
      billet_200 INTEGER NOT NULL DEFAULT 0,
      billet_100 INTEGER NOT NULL DEFAULT 0,
      billet_50  INTEGER NOT NULL DEFAULT 0,
      billet_20  INTEGER NOT NULL DEFAULT 0,
      billet_10  INTEGER NOT NULL DEFAULT 0,
      billet_5   INTEGER NOT NULL DEFAULT 0,
      piece_200  INTEGER NOT NULL DEFAULT 0,
      piece_100  INTEGER NOT NULL DEFAULT 0,
      piece_050  INTEGER NOT NULL DEFAULT 0,
      piece_020  INTEGER NOT NULL DEFAULT 0,
      piece_010  INTEGER NOT NULL DEFAULT 0,
      piece_005  INTEGER NOT NULL DEFAULT 0,
      piece_002  INTEGER NOT NULL DEFAULT 0,
      piece_001  INTEGER NOT NULL DEFAULT 0,
      total_centimes INTEGER NOT NULL DEFAULT 0,
      fond_caisse_centimes INTEGER NOT NULL DEFAULT 20000,
      cheques_vacances_centimes INTEGER NOT NULL DEFAULT 0,
      cheques_centimes INTEGER NOT NULL DEFAULT 0,
      square_cash_centimes INTEGER,
      square_card_centimes INTEGER,
      ecart_centimes INTEGER,
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS caisse_retraits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      caisse TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'retrait',
      montant_centimes INTEGER NOT NULL,
      note TEXT,
      depose_banque INTEGER NOT NULL DEFAULT 0,
      depose_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

// Mapping des appareils Square par caisse (carte = Terminal, espèces = Redmi Pad / Square POS)
const SQUARE_DEVICE_MAP: Record<string, { card: string; cash: string }> = {
  A: { card: '549CS145C5000087', cash: 'DEVICE_INSTALLATION_ID:cdf5564b-0308-4646-b10c-a1dbd56d02b6' }, // Roulotte
  B: { card: '549CS145C5000140', cash: 'DEVICE_INSTALLATION_ID:912e77bc-53b9-4969-a078-fb1be20f4b5f' }, // Buvette / Boutique
}

// Calcule le décalage horaire Paris (UTC+1 hiver / UTC+2 été, règle UE : dernier dimanche mars-octobre)
function parisOffsetHours(date: Date): number {
  const year = date.getUTCFullYear()
  const lastSunday = (month: number) => {
    const d = new Date(Date.UTC(year, month + 1, 0, 1, 0, 0)) // dernier jour du mois à 01:00 UTC
    d.setUTCDate(d.getUTCDate() - d.getUTCDay())
    return d
  }
  const dstStart = lastSunday(2) // mars
  const dstEnd = lastSunday(9)   // octobre
  return (date >= dstStart && date < dstEnd) ? 2 : 1
}

// Convertit une date locale Paris (YYYY-MM-DD) en plage UTC [début, fin[ pour l'API Square
function parisDayRangeUTC(dateStr: string): { begin: string; end: string } {
  const [y, m, d] = dateStr.split('-').map(Number)
  const noonUTCGuess = new Date(Date.UTC(y, m - 1, d, 12, 0, 0))
  const offset = parisOffsetHours(noonUTCGuess)
  const begin = new Date(Date.UTC(y, m - 1, d, 0 - offset, 0, 0))
  const end = new Date(Date.UTC(y, m - 1, d + 1, 0 - offset, 0, 0))
  return { begin: begin.toISOString(), end: end.toISOString() }
}

// ===== BILLETTERIE SQUARE =====

// Articles Square existants dans le catalogue (variation IDs)
const TARIFS: Record<string, { name: string; price: number; variationId: string }> = {
  'plein':       { name: 'Billet plein tarif',              price: 1100, variationId: 'OBQDPUSZV2KUFECXYRMGR6SB' },
  'reduit':      { name: 'Billet tarif réduit 3 à 12 ans',  price: 900,  variationId: 'VYOH7TXPOJ4QM325K6SGNRH2' },
  'enfant':      { name: 'Billet enfants de moins de 3 ans', price: 0,    variationId: 'DQS557AAPP6TITV3YIFCQKWM' },
  'pass-plein':  { name: 'Pass saison plein tarif',          price: 3000, variationId: 'WH7V3I3NIHVWJPWQOWE7CQ73' },
  'pass-reduit': { name: 'Pass saison tarif réduit',    price: 2500, variationId: 'O3KVWZFEVR33JO3FF7RA6BCZ' },
}

// Référence courte lisible (sans caractères ambigus O/0/I/1)
function genReference(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let ref = ''
  for (const b of bytes) ref += alphabet[b % alphabet.length]
  return 'AR-' + ref
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

// Email de confirmation via Brevo (best effort : un échec n'annule pas le paiement)
async function sendConfirmationEmail(
  apiKey: string,
  params: {
    buyerInfo: { nom: string; prenom: string; email: string }
    lines: { name: string; qty: number; price: number }[]
    totalCentimes: number
    reference: string
    receiptUrl?: string
  }
): Promise<boolean> {
  const { buyerInfo, lines, totalCentimes, reference, receiptUrl } = params
  const fmtEur = (cts: number) => (cts / 100).toFixed(2).replace('.', ',') + ' €'
  const rows = lines.map(l =>
    `<tr><td style="padding:6px 0;">${escapeHtml(l.name)} × ${l.qty}</td><td style="padding:6px 0;text-align:right;">${l.price === 0 ? 'Gratuit' : fmtEur(l.price * l.qty)}</td></tr>`
  ).join('')

  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#3F3E3E;">
    <h1 style="color:#D57956;font-size:22px;">Merci ${escapeHtml(buyerInfo.prenom)}, vos billets sont réservés !</h1>
    <p>Voici le récapitulatif de votre commande à <strong>L'Attrape-Rêves</strong>, ferme de découverte et d'émerveillement à Gravières (Ardèche).</p>
    <div style="background:#FDF3E7;border-radius:12px;padding:16px 20px;margin:20px 0;text-align:center;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;opacity:.6;">Référence de commande</div>
      <div style="font-size:26px;font-weight:bold;color:#D57956;letter-spacing:2px;">${reference}</div>
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">
      ${rows}
      <tr><td style="padding:10px 0;border-top:2px solid #D57956;font-weight:bold;">Total</td><td style="padding:10px 0;border-top:2px solid #D57956;text-align:right;font-weight:bold;">${fmtEur(totalCentimes)}</td></tr>
    </table>
    <p style="margin-top:20px;">Le jour de votre visite, donnez simplement votre nom ou votre référence à l'accueil. Les billets sont valables à la journée — vous pouvez sortir et revenir librement.</p>
    ${receiptUrl ? `<p><a href="${receiptUrl}" style="color:#D57956;">Voir le reçu de paiement</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:13px;opacity:.7;">
      L'Attrape-Rêves — 514 chemin de la Vernède, 07140 Gravières<br>
      04 28 40 00 49 · contact@lattrapereves07.fr · lattrapereves07.fr
    </p>
  </div>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        // Expéditeur : doit être vérifié dans Brevo (Expéditeurs → contact@)
        sender: { name: "L'Attrape-Rêves", email: 'contact@lattrapereves07.fr' },
        to: [{ email: buyerInfo.email, name: `${buyerInfo.prenom} ${buyerInfo.nom}` }],
        bcc: [{ email: 'contact@lattrapereves07.fr' }],
        replyTo: { email: 'contact@lattrapereves07.fr' },
        subject: `Vos billets L'Attrape-Rêves — ${reference}`,
        htmlContent: html
      })
    })
    return res.ok
  } catch {
    return false
  }
}

app.post('/api/billetterie/pay', async (c) => {
  const token = c.env.SQUARE_ACCESS_TOKEN
  if (!token) return c.json({ error: 'Paiement non configuré' }, 500)

  const body = await c.req.json() as any
  const { sourceId, verificationToken, items, buyerInfo, idempotencyKey, passHolders } = body

  if (!sourceId || !Array.isArray(items) || !idempotencyKey) {
    return c.json({ error: 'Données manquantes' }, 400)
  }
  if (!buyerInfo?.nom?.trim() || !buyerInfo?.prenom?.trim() || !buyerInfo?.email?.trim()) {
    return c.json({ error: 'Nom, prénom et email requis' }, 400)
  }

  const lineItems: any[] = []
  const emailLines: { name: string; qty: number; price: number }[] = []
  let expectedTotal = 0
  const passQtyByType: Record<string, number> = {}

  for (const item of items) {
    const tarif = TARIFS[item.id]
    if (!tarif) return c.json({ error: `Tarif inconnu: ${item.id}` }, 400)
    const qty = parseInt(item.qty)
    if (isNaN(qty) || qty < 0 || qty > 50) return c.json({ error: 'Quantité invalide' }, 400)
    if (qty === 0) continue
    lineItems.push({ catalog_object_id: tarif.variationId, quantity: String(qty) })
    emailLines.push({ name: tarif.name, qty, price: tarif.price })
    expectedTotal += tarif.price * qty
    if (item.id === 'pass-plein' || item.id === 'pass-reduit') passQtyByType[item.id] = qty
  }

  if (lineItems.length === 0) return c.json({ error: 'Panier vide' }, 400)
  if (expectedTotal === 0) return c.json({ error: 'Montant nul — pas de paiement requis' }, 400)

  // Les pass saison sont nominatifs : un titulaire (prénom + nom) par pass du panier.
  const expectedPassCount = Object.values(passQtyByType).reduce((a, b) => a + b, 0)
  const holders = Array.isArray(passHolders) ? passHolders : []
  if (expectedPassCount > 0) {
    if (holders.length !== expectedPassCount) {
      return c.json({ error: 'Merci de renseigner un titulaire pour chaque pass saison' }, 400)
    }
    const countByType: Record<string, number> = {}
    for (const h of holders) {
      if (!h?.prenom?.trim() || !h?.nom?.trim()) {
        return c.json({ error: 'Prénom et nom requis pour chaque titulaire de pass saison' }, 400)
      }
      if (h.type !== 'pass-plein' && h.type !== 'pass-reduit') {
        return c.json({ error: 'Type de pass invalide' }, 400)
      }
      countByType[h.type] = (countByType[h.type] || 0) + 1
    }
    for (const [type, expected] of Object.entries(passQtyByType)) {
      if (countByType[type] !== expected) {
        return c.json({ error: 'Le nombre de titulaires ne correspond pas au nombre de pass saison sélectionnés' }, 400)
      }
    }
  }

  const reference = genReference()

  const orderBody: any = {
    order: {
      location_id: SQUARE_LOCATION_ID,
      reference_id: reference,
      line_items: lineItems,
      metadata: { buyer_nom: buyerInfo.nom, buyer_prenom: buyerInfo.prenom, buyer_email: buyerInfo.email }
    },
    idempotency_key: idempotencyKey + '-order'
  }

  const orderRes = await fetch('https://connect.squareup.com/v2/orders', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Square-Version': '2025-01-23' },
    body: JSON.stringify(orderBody)
  })
  if (!orderRes.ok) {
    const err = await orderRes.json() as any
    return c.json({ error: 'Erreur création commande', details: err?.errors?.[0]?.detail }, 502)
  }
  const orderData = await orderRes.json() as any
  const orderId = orderData.order.id
  const orderTotal = orderData.order.total_money?.amount ?? expectedTotal

  const paymentBody: any = {
    source_id: sourceId,
    idempotency_key: idempotencyKey,
    amount_money: { amount: orderTotal, currency: 'EUR' },
    order_id: orderId,
    location_id: SQUARE_LOCATION_ID,
  }
  if (verificationToken) paymentBody.verification_token = verificationToken
  paymentBody.buyer_email_address = buyerInfo.email.trim()
  paymentBody.note = `${buyerInfo.prenom} ${buyerInfo.nom}`

  const payRes = await fetch('https://connect.squareup.com/v2/payments', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Square-Version': '2025-01-23' },
    body: JSON.stringify(paymentBody)
  })
  if (!payRes.ok) {
    const err = await payRes.json() as any
    const code = err?.errors?.[0]?.code || ''
    const detail = err?.errors?.[0]?.detail || 'Paiement refusé'
    if (code === 'CARD_DECLINED_VERIFICATION_REQUIRED') return c.json({ error: 'Votre banque exige une vérification 3D Secure qui n\'a pas abouti. Rechargez la page et réessayez.' }, 402)
    if (code === 'CARD_DECLINED') return c.json({ error: 'Carte refusée — vérifiez vos informations bancaires' }, 402)
    if (code === 'INSUFFICIENT_FUNDS') return c.json({ error: 'Fonds insuffisants' }, 402)
    if (code === 'CVV_FAILURE') return c.json({ error: 'Code CVV incorrect' }, 402)
    return c.json({ error: detail }, 402)
  }
  const payData = await payRes.json() as any
  const payment = payData.payment

  // Email de confirmation (best effort)
  let emailSent = false
  if (c.env.BREVO_API_KEY) {
    emailSent = await sendConfirmationEmail(c.env.BREVO_API_KEY, {
      buyerInfo: { nom: buyerInfo.nom.trim(), prenom: buyerInfo.prenom.trim(), email: buyerInfo.email.trim() },
      lines: emailLines,
      totalCentimes: orderTotal,
      reference,
      receiptUrl: payment.receipt_url
    })
  }

  // Enregistrement nominatif des pass saison (best effort, n'affecte pas le paiement)
  let passCodesSent = false
  if (expectedPassCount > 0) {
    const passResult = await createSeasonPasses(c.env.DB, c.env.BREVO_API_KEY, {
      email: buyerInfo.email.trim(),
      source: 'internet',
      orderReference: reference,
      holders: holders.map((h: any) => ({ prenom: h.prenom.trim(), nom: h.nom.trim(), type: h.type }))
    })
    passCodesSent = passResult.emailSent
  }

  return c.json({
    success: true,
    reference,
    orderId,
    paymentId: payment.id,
    receiptUrl: payment.receipt_url,
    totalCentimes: orderTotal,
    emailSent,
    email: buyerInfo.email.trim(),
    passCodesSent
  })
})

async function ensureReservationFlagsTable(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS reservation_flags (
      reference TEXT PRIMARY KEY,
      hidden INTEGER NOT NULL DEFAULT 0,
      visited INTEGER NOT NULL DEFAULT 0,
      visited_at TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

const RESERVATION_REF_RE = /^AR-[A-Z0-9]+$/

// Recherche des réservations billetterie (lecture seule, source de vérité = Square)
// Par référence / nom / prénom / email (recherche texte côté serveur) et/ou période.
// Les statuts "masqué" / "visite validée" sont des annotations locales (reservation_flags),
// Square reste la seule source de vérité pour les commandes elles-mêmes.
app.get('/api/admin/reservations', requireAuth, async (c) => {
  const token = c.env.SQUARE_ACCESS_TOKEN
  if (!token) return c.json({ error: 'Square non configuré' }, 500)
  await ensureReservationFlagsTable(c.env.DB)

  const q = (c.req.query('q') || '').trim().toLowerCase()
  const from = c.req.query('from') || '2026-06-28' // ouverture du site
  const to = c.req.query('to') || new Date().toISOString().slice(0, 10)
  const startAt = `${from}T00:00:00Z`
  const endAt = `${to}T23:59:59Z`

  const orders: any[] = []
  let cursor: string | undefined
  try {
    do {
      const searchBody: any = {
        location_ids: [SQUARE_LOCATION_ID],
        query: {
          filter: {
            date_time_filter: { created_at: { start_at: startAt, end_at: endAt } },
            state_filter: { states: ['COMPLETED'] }
          },
          sort: { sort_field: 'CREATED_AT', sort_order: 'DESC' }
        },
        limit: 100,
        ...(cursor ? { cursor } : {})
      }
      const res = await fetch('https://connect.squareup.com/v2/orders/search', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json', 'Square-Version': '2025-01-23' },
        body: JSON.stringify(searchBody)
      })
      if (!res.ok) {
        const err = await res.json() as any
        return c.json({ error: 'Erreur recherche Square', details: err?.errors?.[0]?.detail }, 502)
      }
      const data = await res.json() as any
      orders.push(...(data.orders || []))
      cursor = data.cursor
    } while (cursor && orders.length < 1000)
  } catch (e: any) {
    return c.json({ error: 'Erreur réseau Square', details: e.message }, 502)
  }

  const { results: flagRows } = await c.env.DB.prepare(
    'SELECT reference, hidden, visited, visited_at FROM reservation_flags'
  ).all()
  const flags = new Map((flagRows as any[]).map((f) => [f.reference, f]))

  const results = orders
    .filter((o) => typeof o.reference_id === 'string' && o.reference_id.startsWith('AR-'))
    .map((o) => {
      const flag = flags.get(o.reference_id)
      return {
        reference: o.reference_id,
        orderId: o.id,
        createdAt: o.created_at,
        totalCentimes: o.total_money?.amount ?? 0,
        buyerNom: o.metadata?.buyer_nom || null,
        buyerPrenom: o.metadata?.buyer_prenom || null,
        buyerEmail: o.metadata?.buyer_email || null,
        items: (o.line_items || []).map((li: any) => ({ name: li.name, qty: li.quantity })),
        hidden: !!flag?.hidden,
        visited: !!flag?.visited,
        visitedAt: flag?.visited_at || null
      }
    })
    .filter((r) => (c.req.query('includeHidden') === '1' ? true : !r.hidden))
    .filter((r) => {
      if (!q) return true
      const hay = [r.reference, r.buyerNom, r.buyerPrenom, r.buyerEmail].filter(Boolean).join(' ').toLowerCase()
      return hay.includes(q)
    })

  return c.json({ results, count: results.length })
})

// Masque une réservation dans l'admin (n'affecte pas la commande Square — annulation/remboursement à faire dans Square directement)
app.post('/api/admin/reservations/:reference/hide', requireAuth, async (c) => {
  const reference = c.req.param('reference')
  if (!RESERVATION_REF_RE.test(reference)) return c.json({ error: 'Référence invalide' }, 400)
  await ensureReservationFlagsTable(c.env.DB)
  await c.env.DB.prepare(`
    INSERT INTO reservation_flags (reference, hidden, updated_at) VALUES (?, 1, datetime('now'))
    ON CONFLICT(reference) DO UPDATE SET hidden = 1, updated_at = datetime('now')
  `).bind(reference).run()
  return c.json({ ok: true })
})

// Marque (ou démarque) la visite d'une réservation comme effectuée — check-in à l'accueil
app.post('/api/admin/reservations/:reference/visit', requireAuth, async (c) => {
  const reference = c.req.param('reference')
  if (!RESERVATION_REF_RE.test(reference)) return c.json({ error: 'Référence invalide' }, 400)
  const body = await c.req.json().catch(() => ({})) as { visited?: boolean }
  const visited = body.visited !== false
  await ensureReservationFlagsTable(c.env.DB)
  await c.env.DB.prepare(`
    INSERT INTO reservation_flags (reference, visited, visited_at, updated_at)
    VALUES (?, ?, ?, datetime('now'))
    ON CONFLICT(reference) DO UPDATE SET visited = ?, visited_at = ?, updated_at = datetime('now')
  `).bind(reference, visited ? 1 : 0, visited ? new Date().toISOString() : null, visited ? 1 : 0, visited ? new Date().toISOString() : null).run()
  return c.json({ ok: true })
})

// ===== PASS SAISON =====
// Registre nominatif des pass saison (guichet ou internet) + comptage des visites.
// Le paiement lui-même reste dans Square (caisse ou billetterie en ligne) ; cette
// table sert uniquement à l'aspect nominatif (qui a un pass) et au suivi des passages,
// que Square ne sait pas représenter simplement pour un pass illimité.

async function ensureSeasonPassTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS season_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      prenom TEXT NOT NULL,
      nom TEXT NOT NULL,
      type TEXT NOT NULL,
      email TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'guichet',
      order_reference TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS season_pass_visits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pass_id INTEGER NOT NULL,
      visited_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
}

const PASS_TYPE_NAMES: Record<string, string> = {
  'pass-plein': 'Pass saison plein tarif',
  'pass-reduit': 'Pass saison tarif réduit'
}

function genPassCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint8Array(6)
  crypto.getRandomValues(bytes)
  let code = ''
  for (const b of bytes) code += alphabet[b % alphabet.length]
  return 'PS-' + code
}

async function sendSeasonPassEmail(
  apiKey: string,
  params: { email: string; holders: { prenom: string; nom: string; code: string; type: string }[] }
): Promise<boolean> {
  const { email, holders } = params
  const rows = holders.map(h => `
    <tr>
      <td style="padding:8px 0;">${escapeHtml(h.prenom)} ${escapeHtml(h.nom)}<br><span style="font-size:12px;opacity:.6;">${escapeHtml(PASS_TYPE_NAMES[h.type] || h.type)}</span></td>
      <td style="padding:8px 0;text-align:right;font-weight:bold;color:#D57956;letter-spacing:1px;">${escapeHtml(h.code)}</td>
    </tr>`).join('')

  const year = new Date().getFullYear()
  const html = `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#3F3E3E;">
    <h1 style="color:#D57956;font-size:22px;">Vos pass saison L'Attrape-Rêves</h1>
    <p style="font-style:italic;">Merci d'avoir choisi le pass saison — vous faites maintenant partie de la grande famille de l'Attrape-Rêves !</p>
    <p>Voici les pass saison rattachés à cette adresse email. Chaque titulaire peut se présenter indépendamment à l'accueil, avec son nom ou son code.</p>
    <table style="width:100%;border-collapse:collapse;font-size:15px;">${rows}</table>
    <p style="margin-top:20px;">Le pass saison donne un accès illimité pour l'année ${year}, à chaque jour d'ouverture de la ferme. Présentez simplement le nom du titulaire ou son code à l'accueil.</p>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;">
    <p style="font-size:13px;opacity:.7;">
      L'Attrape-Rêves — 514 chemin de la Vernède, 07140 Gravières<br>
      04 28 40 00 49 · contact@lattrapereves07.fr · lattrapereves07.fr
    </p>
  </div>`

  try {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: { name: "L'Attrape-Rêves", email: 'contact@lattrapereves07.fr' },
        to: [{ email }],
        bcc: [{ email: 'contact@lattrapereves07.fr' }],
        replyTo: { email: 'contact@lattrapereves07.fr' },
        subject: `Vos pass saison L'Attrape-Rêves (${holders.length})`,
        htmlContent: html
      })
    })
    return res.ok
  } catch {
    return false
  }
}

// Crée des pass saison nominatifs pour une adresse email (guichet ou internet),
// génère un code unique par pass, et envoie un email récapitulatif (best effort).
async function createSeasonPasses(
  db: D1Database,
  brevoApiKey: string | undefined,
  params: { email: string; source: string; orderReference?: string; holders: { prenom: string; nom: string; type: string }[] }
): Promise<{ passes: { id: number; code: string; prenom: string; nom: string; type: string }[]; emailSent: boolean }> {
  await ensureSeasonPassTables(db)
  const created: { id: number; code: string; prenom: string; nom: string; type: string }[] = []

  for (const h of params.holders) {
    let code = ''
    for (let attempt = 0; attempt < 5; attempt++) {
      code = genPassCode()
      const exists = await db.prepare('SELECT 1 FROM season_passes WHERE code=?').bind(code).first()
      if (!exists) break
    }
    const result = await db.prepare(`
      INSERT INTO season_passes (code, prenom, nom, type, email, source, order_reference)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(code, h.prenom.trim(), h.nom.trim(), h.type, params.email.trim().toLowerCase(), params.source, params.orderReference || null).run()
    created.push({ id: result.meta.last_row_id as number, code, prenom: h.prenom.trim(), nom: h.nom.trim(), type: h.type })
  }

  let emailSent = false
  if (brevoApiKey && created.length) {
    emailSent = await sendSeasonPassEmail(brevoApiKey, { email: params.email.trim(), holders: created })
  }

  return { passes: created, emailSent }
}

// Saisie manuelle des pass saison achetés au guichet — le paiement est géré séparément
// en caisse Square, cet endpoint ne fait qu'enregistrer les titulaires et envoyer les codes.
app.post('/api/admin/season-passes', requireAuth, async (c) => {
  const body = await c.req.json().catch(() => ({})) as any
  const email = (body.email || '').trim()
  const holders = Array.isArray(body.holders) ? body.holders : []

  if (!email || !email.includes('@')) return c.json({ error: 'Email invalide' }, 400)
  if (!holders.length) return c.json({ error: 'Aucun titulaire' }, 400)
  for (const h of holders) {
    if (!h.prenom?.trim() || !h.nom?.trim()) return c.json({ error: 'Prénom et nom requis pour chaque titulaire' }, 400)
    if (h.type !== 'pass-plein' && h.type !== 'pass-reduit') return c.json({ error: `Type de pass invalide: ${h.type}` }, 400)
  }

  const result = await createSeasonPasses(c.env.DB, c.env.BREVO_API_KEY, { email, source: 'guichet', holders })
  return c.json(result)
})

// Recherche des pass saison (nom / email / code)
app.get('/api/admin/season-passes', requireAuth, async (c) => {
  await ensureSeasonPassTables(c.env.DB)
  const q = (c.req.query('q') || '').trim().toLowerCase()
  const { results } = await c.env.DB.prepare(`
    SELECT sp.id, sp.code, sp.prenom, sp.nom, sp.type, sp.email, sp.source, sp.order_reference, sp.active, sp.created_at,
           COUNT(v.id) as visit_count, MAX(v.visited_at) as last_visit
    FROM season_passes sp
    LEFT JOIN season_pass_visits v ON v.pass_id = sp.id
    WHERE sp.active = 1
    GROUP BY sp.id
    ORDER BY sp.created_at DESC
  `).all()

  const filtered = (results as any[]).filter((r) => {
    if (!q) return true
    const hay = [r.code, r.prenom, r.nom, r.email].filter(Boolean).join(' ').toLowerCase()
    return hay.includes(q)
  })

  return c.json({ results: filtered, count: filtered.length })
})

// Enregistre une visite pour un pass saison (une ligne par passage)
app.post('/api/admin/season-passes/:id/visit', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'ID invalide' }, 400)
  await ensureSeasonPassTables(c.env.DB)
  const pass = await c.env.DB.prepare('SELECT id FROM season_passes WHERE id=?').bind(id).first()
  if (!pass) return c.json({ error: 'Pass introuvable' }, 404)
  await c.env.DB.prepare('INSERT INTO season_pass_visits (pass_id) VALUES (?)').bind(id).run()
  return c.json({ ok: true })
})

// Masque un pass saison de la liste (ne touche pas à un éventuel paiement Square)
app.post('/api/admin/season-passes/:id/hide', requireAuth, async (c) => {
  const id = parseInt(c.req.param('id'))
  if (isNaN(id)) return c.json({ error: 'ID invalide' }, 400)
  await ensureSeasonPassTables(c.env.DB)
  await c.env.DB.prepare('UPDATE season_passes SET active=0 WHERE id=?').bind(id).run()
  return c.json({ ok: true })
})

// ===== PUBLIC API =====

// Initialise la table site_config si elle n'existe pas encore
async function ensureSiteConfig(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_config (
      id INTEGER PRIMARY KEY DEFAULT 1,
      statut TEXT NOT NULL DEFAULT 'open',
      dates_fermeture TEXT NOT NULL DEFAULT '[]',
      date_ouverture_speciale TEXT NOT NULL DEFAULT '',
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
  await db.prepare(`
    INSERT OR IGNORE INTO site_config (id, statut, dates_fermeture, date_ouverture_speciale)
    VALUES (1, 'open', '[]', '')
  `).run()
}

const defaultSiteConfig = () => ({
  fermeture: { actif: false, type: 'weather', dates: [] as string[], motif: '' },
  ouverture_speciale: { actif: false, date: '', motif: '' }
})

// Get site status (météo / fermetures)
app.get('/api/site-status', async (c) => {
  try {
    await ensureSiteConfig(c.env.DB)
    const row = await c.env.DB.prepare(
      'SELECT statut, dates_fermeture, date_ouverture_speciale FROM site_config WHERE id=1'
    ).first() as any
    if (!row) return c.json(defaultSiteConfig())

    // Nouveau format : JSON objet stocké dans statut
    try {
      const cfg = JSON.parse(row.statut)
      if (cfg && typeof cfg === 'object' && 'fermeture' in cfg) {
        return c.json(cfg)
      }
    } catch {}

    // Rétrocompatibilité : ancien format (string)
    const cfg = defaultSiteConfig()
    if (row.statut === 'seasonal') {
      cfg.fermeture.actif = true
      cfg.fermeture.type = 'winter'
    } else if (row.statut === 'weather') {
      cfg.fermeture.actif = true
      cfg.fermeture.type = 'weather'
      try { cfg.fermeture.dates = JSON.parse(row.dates_fermeture || '[]') } catch {}
    } else if (row.statut === 'special') {
      cfg.ouverture_speciale.actif = true
      cfg.ouverture_speciale.date = row.date_ouverture_speciale || ''
    }
    return c.json(cfg)
  } catch {
    return c.json(defaultSiteConfig())
  }
})

// Get all published events
app.get('/api/events', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, title, description, event_date, event_time, end_date, end_time, 
           category, image_data, booking_url
    FROM events 
    WHERE is_published = 1 
    ORDER BY event_date ASC, event_time ASC
  `).all()
  
  return c.json(results)
})

// ===== ADMIN API =====

// Login check
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json()
  const adminPwd = c.env.ADMIN_PASSWORD
  if (!adminPwd) return c.json({ error: 'ADMIN_PASSWORD non configuré' }, 500)
  if (password === adminPwd) {
    return c.json({ success: true, token: password })
  }
  return c.json({ error: 'Mot de passe incorrect' }, 401)
})

// Update site status (météo / fermetures) - admin
app.post('/api/admin/site-status', requireAuth, async (c) => {
  const body = await c.req.json() as any
  const cfg = {
    fermeture: {
      actif: !!body.fermeture?.actif,
      type: body.fermeture?.type || 'weather',
      dates: Array.isArray(body.fermeture?.dates) ? body.fermeture.dates : [],
      motif: body.fermeture?.motif || ''
    },
    ouverture_speciale: {
      actif: !!body.ouverture_speciale?.actif,
      date: body.ouverture_speciale?.date || '',
      motif: body.ouverture_speciale?.motif || ''
    }
  }
  await ensureSiteConfig(c.env.DB)
  await c.env.DB.prepare(`
    UPDATE site_config SET statut=?, updated_at=datetime('now') WHERE id=1
  `).bind(JSON.stringify(cfg)).run()
  return c.json({ success: true })
})

// Get all events (including unpublished) - admin
app.get('/api/admin/events', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT * FROM events ORDER BY event_date ASC, event_time ASC
  `).all()
  
  return c.json(results)
})

// Create event
app.post('/api/admin/events', requireAuth, async (c) => {
  const body = await c.req.json()
  const { title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published,
    benevoles_actif, benevole_referent_nom, benevole_referent_contact, benevole_info } = body

  const result = await c.env.DB.prepare(`
    INSERT INTO events (title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published,
      benevoles_actif, benevole_referent_nom, benevole_referent_contact, benevole_info)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    title, description || null, event_date, event_time || null,
    end_date || null, end_time || null, category || 'evenement',
    booking_url || null, is_published ?? 1,
    benevoles_actif ? 1 : 0, benevole_referent_nom?.trim() || null,
    benevole_referent_contact?.trim() || null, benevole_info?.trim() || null
  ).run()

  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

// Update event
app.put('/api/admin/events/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published,
    benevoles_actif, benevole_referent_nom, benevole_referent_contact, benevole_info } = body

  await c.env.DB.prepare(`
    UPDATE events SET title=?, description=?, event_date=?, event_time=?, end_date=?, end_time=?,
    category=?, booking_url=?, is_published=?,
    benevoles_actif=?, benevole_referent_nom=?, benevole_referent_contact=?, benevole_info=?,
    updated_at=datetime('now')
    WHERE id=?
  `).bind(
    title, description || null, event_date, event_time || null,
    end_date || null, end_time || null, category || 'evenement',
    booking_url || null, is_published ?? 1,
    benevoles_actif ? 1 : 0, benevole_referent_nom?.trim() || null,
    benevole_referent_contact?.trim() || null, benevole_info?.trim() || null,
    id
  ).run()

  return c.json({ success: true })
})

// Delete event
app.delete('/api/admin/events/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare(`
    DELETE FROM benevole_inscriptions WHERE poste_id IN (SELECT id FROM benevole_postes WHERE event_id=?)
  `).bind(id).run()
  await c.env.DB.prepare('DELETE FROM benevole_postes WHERE event_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM events WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// Upload image for event (base64 stored in D1)
app.post('/api/admin/events/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('image') as File
  
  if (!file) return c.json({ error: 'Aucune image fournie' }, 400)
  
  // Convert to base64 data URL (chunks pour éviter la limite CPU Cloudflare Workers)
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  const CHUNK = 8192
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  const base64 = btoa(binary)
  const dataUrl = `data:${file.type};base64,${base64}`
  
  await c.env.DB.prepare('UPDATE events SET image_data=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(dataUrl, id).run()
  
  return c.json({ success: true, image_data: dataUrl })
})

// Delete image for event
app.delete('/api/admin/events/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('UPDATE events SET image_data=NULL, updated_at=datetime(\'now\') WHERE id=?')
    .bind(id).run()

  return c.json({ success: true })
})

// ===== BENEVOLES API =====

async function attachPostesEtInscriptions(db: D1Database, events: any[]) {
  const eventIds = events.map((e: any) => e.id)
  if (eventIds.length === 0) return []

  const evPlaceholders = eventIds.map(() => '?').join(',')
  const { results: postes } = await db.prepare(`
    SELECT * FROM benevole_postes WHERE event_id IN (${evPlaceholders}) ORDER BY ordre ASC, id ASC
  `).bind(...eventIds).all()

  const posteIds = postes.map((p: any) => p.id)
  let inscriptions: any[] = []
  if (posteIds.length > 0) {
    const poPlaceholders = posteIds.map(() => '?').join(',')
    const r = await db.prepare(`
      SELECT id, poste_id, nom, remarque FROM benevole_inscriptions WHERE poste_id IN (${poPlaceholders}) ORDER BY id ASC
    `).bind(...posteIds).all()
    inscriptions = r.results
  }

  return events.map((e: any) => ({
    ...e,
    postes: postes.filter((p: any) => p.event_id === e.id).map((p: any) => ({
      ...p,
      inscriptions: inscriptions.filter((i: any) => i.poste_id === p.id)
    }))
  }))
}

// Liste publique des événements recherchant des bénévoles, avec postes + inscriptions
app.get('/api/benevoles', async (c) => {
  const { results: events } = await c.env.DB.prepare(`
    SELECT id, title, event_date, event_time, end_date, end_time,
           benevole_referent_nom, benevole_referent_contact, benevole_info
    FROM events
    WHERE benevoles_actif = 1 AND is_published = 1 AND event_date >= date('now')
    ORDER BY event_date ASC, event_time ASC
  `).all()

  return c.json(await attachPostesEtInscriptions(c.env.DB, events))
})

// Inscription bénévole sur un poste (public, sans mot de passe)
app.post('/api/benevoles/postes/:posteId/inscriptions', async (c) => {
  const posteId = c.req.param('posteId')
  const { nom, remarque } = await c.req.json()
  if (!nom?.trim()) return c.json({ error: 'Le nom est obligatoire' }, 400)

  const poste = await c.env.DB.prepare('SELECT places FROM benevole_postes WHERE id=?').bind(posteId).first() as any
  if (!poste) return c.json({ error: 'Poste introuvable' }, 404)

  const countRow = await c.env.DB.prepare('SELECT COUNT(*) as n FROM benevole_inscriptions WHERE poste_id=?').bind(posteId).first() as any
  if ((countRow?.n ?? 0) >= poste.places) return c.json({ error: 'Ce poste est complet' }, 409)

  const result = await c.env.DB.prepare(`
    INSERT INTO benevole_inscriptions (poste_id, nom, remarque) VALUES (?, ?, ?)
  `).bind(posteId, nom.trim(), remarque?.trim() || null).run()

  return c.json({ id: result.meta.last_row_id, poste_id: Number(posteId), nom: nom.trim(), remarque: remarque?.trim() || null }, 201)
})

// Désinscription (public, auto-gestion depuis le navigateur du bénévole)
app.delete('/api/benevoles/inscriptions/:id', async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM benevole_inscriptions WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// ===== ADMIN BENEVOLES API =====

// Liste admin des événements avec bénévoles activés (tous statuts) + postes + inscriptions
app.get('/api/admin/benevoles', requireAuth, async (c) => {
  const { results: events } = await c.env.DB.prepare(`
    SELECT id, title, event_date, event_time, is_published,
           benevole_referent_nom, benevole_referent_contact, benevole_info
    FROM events
    WHERE benevoles_actif = 1
    ORDER BY event_date ASC, event_time ASC
  `).all()

  return c.json(await attachPostesEtInscriptions(c.env.DB, events))
})

// Créer un poste bénévole
app.post('/api/admin/benevoles/postes', requireAuth, async (c) => {
  const { event_id, nom, heure_debut, heure_fin, places, note } = await c.req.json()
  if (!event_id || !nom?.trim()) return c.json({ error: 'event_id et nom sont obligatoires' }, 400)

  const result = await c.env.DB.prepare(`
    INSERT INTO benevole_postes (event_id, nom, heure_debut, heure_fin, places, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(event_id, nom.trim(), heure_debut || null, heure_fin || null, places || 1, note?.trim() || null).run()

  return c.json({ id: result.meta.last_row_id }, 201)
})

// Modifier un poste bénévole
app.put('/api/admin/benevoles/postes/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const { nom, heure_debut, heure_fin, places, note } = await c.req.json()

  await c.env.DB.prepare(`
    UPDATE benevole_postes SET nom=?, heure_debut=?, heure_fin=?, places=?, note=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(nom.trim(), heure_debut || null, heure_fin || null, places || 1, note?.trim() || null, id).run()

  return c.json({ success: true })
})

// Supprimer un poste bénévole (et ses inscriptions)
app.delete('/api/admin/benevoles/postes/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM benevole_inscriptions WHERE poste_id=?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM benevole_postes WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// Supprimer une inscription (admin)
app.delete('/api/admin/benevoles/inscriptions/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM benevole_inscriptions WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// ===== CAISSE API =====

// Login caisse (retourne le rôle : 'staff' ou 'owner')
app.post('/api/caisse/login', async (c) => {
  const { password } = await c.req.json()
  const admin = c.env.ADMIN_PASSWORD
  const owner = c.env.OWNER_PASSWORD
  if (password === owner) return c.json({ success: true, token: password, role: 'owner' })
  if (password === admin) return c.json({ success: true, token: password, role: 'staff' })
  return c.json({ error: 'Mot de passe incorrect' }, 401)
})

// Saisir un comptage (staff ou owner)
app.post('/api/caisse/comptages', requireCaisse, async (c) => {
  await ensureCaisseTable(c.env.DB)
  const b = await c.req.json() as any
  const coupures = [
    ['billet_500', 50000], ['billet_200', 20000], ['billet_100', 10000],
    ['billet_50', 5000], ['billet_20', 2000], ['billet_10', 1000], ['billet_5', 500],
    ['piece_200', 200], ['piece_100', 100], ['piece_050', 50],
    ['piece_020', 20], ['piece_010', 10], ['piece_005', 5], ['piece_002', 2], ['piece_001', 1]
  ]
  let total = 0
  for (const [key, val] of coupures) total += (parseInt(b[key]) || 0) * (val as number)

  const fondCaisse = b.fond_caisse_centimes != null ? parseInt(b.fond_caisse_centimes) || 0 : 20000
  const chequesVacances = parseInt(b.cheques_vacances_centimes) || 0
  const cheques = parseInt(b.cheques_centimes) || 0
  const squareCash = b.square_cash_centimes != null ? parseInt(b.square_cash_centimes) : null
  const squareCard = b.square_card_centimes != null ? parseInt(b.square_card_centimes) : null
  // Écart = espèces comptées (hors chèques vacances/chèques) - fond de caisse - espèces Square attendues
  const ecart = squareCash != null
    ? (total - chequesVacances - cheques) - fondCaisse - squareCash
    : null

  const result = await c.env.DB.prepare(`
    INSERT INTO caisse_comptages
      (caisse, comptage_date, comptage_heure,
       billet_500, billet_200, billet_100, billet_50, billet_20, billet_10, billet_5,
       piece_200, piece_100, piece_050, piece_020, piece_010, piece_005, piece_002, piece_001,
       total_centimes, fond_caisse_centimes, cheques_vacances_centimes, cheques_centimes,
       square_cash_centimes, square_card_centimes, ecart_centimes, note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `).bind(
    b.caisse, b.comptage_date, b.comptage_heure,
    parseInt(b.billet_500)||0, parseInt(b.billet_200)||0, parseInt(b.billet_100)||0,
    parseInt(b.billet_50)||0, parseInt(b.billet_20)||0, parseInt(b.billet_10)||0, parseInt(b.billet_5)||0,
    parseInt(b.piece_200)||0, parseInt(b.piece_100)||0, parseInt(b.piece_050)||0,
    parseInt(b.piece_020)||0, parseInt(b.piece_010)||0, parseInt(b.piece_005)||0,
    parseInt(b.piece_002)||0, parseInt(b.piece_001)||0,
    total, fondCaisse, chequesVacances, cheques, squareCash, squareCard, ecart, b.note || null
  ).run()
  return c.json({ success: true, id: result.meta.last_row_id, total_centimes: total, ecart_centimes: ecart }, 201)
})

// Récupérer les totaux Square (espèces/carte) pour une caisse et une date donnée
app.get('/api/caisse/square-sync', requireCaisse, async (c) => {
  const caisse = c.req.query('caisse')
  const date = c.req.query('date')
  const token = c.env.SQUARE_ACCESS_TOKEN
  if (!caisse || !date) return c.json({ error: 'Paramètres caisse et date requis' }, 400)
  if (!token) return c.json({ error: 'Intégration Square non configurée' }, 500)
  const devices = SQUARE_DEVICE_MAP[caisse]
  if (!devices) return c.json({ error: 'Caisse inconnue' }, 400)

  const { begin, end } = parisDayRangeUTC(date)
  let cashCentimes = 0
  let cardCentimes = 0
  let cursor: string | undefined
  try {
    do {
      const url = new URL('https://connect.squareup.com/v2/payments')
      url.searchParams.set('location_id', SQUARE_LOCATION_ID)
      url.searchParams.set('begin_time', begin)
      url.searchParams.set('end_time', end)
      url.searchParams.set('limit', '100')
      url.searchParams.set('sort_order', 'ASC')
      if (cursor) url.searchParams.set('cursor', cursor)

      const res = await fetch(url.toString(), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Square-Version': '2025-01-23'
        }
      })
      if (!res.ok) {
        const errBody = await res.text()
        return c.json({ error: 'Erreur Square API', details: errBody }, 502)
      }
      const data = await res.json() as any
      for (const p of (data.payments || [])) {
        if (p.status !== 'COMPLETED') continue
        const deviceId = p.device_details?.device_id
        const amount = p.total_money?.amount || 0
        if (p.source_type === 'CASH' && deviceId === devices.cash) cashCentimes += amount
        if (p.source_type === 'CARD' && deviceId === devices.card) cardCentimes += amount
      }
      cursor = data.cursor
    } while (cursor)
  } catch (e: any) {
    return c.json({ error: 'Erreur lors de la synchronisation Square', details: e.message }, 502)
  }

  return c.json({ cash_centimes: cashCentimes, card_centimes: cardCentimes })
})

// Historique des comptages (staff ou owner)
app.get('/api/caisse/comptages', requireCaisse, async (c) => {
  await ensureCaisseTable(c.env.DB)
  const caisse = c.req.query('caisse')
  const limit = parseInt(c.req.query('limit') || '50')
  const query = caisse
    ? `SELECT * FROM caisse_comptages WHERE caisse=? ORDER BY comptage_date DESC, comptage_heure DESC LIMIT ?`
    : `SELECT * FROM caisse_comptages ORDER BY comptage_date DESC, comptage_heure DESC LIMIT ?`
  const { results } = caisse
    ? await c.env.DB.prepare(query).bind(caisse, limit).all()
    : await c.env.DB.prepare(query).bind(limit).all()
  return c.json(results)
})

// Supprimer un comptage (owner uniquement)
app.delete('/api/caisse/comptages/:id', requireOwner, async (c) => {
  await c.env.DB.prepare('DELETE FROM caisse_comptages WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// Enregistrer un retrait ou un dépôt de chèques vacances (owner uniquement)
app.post('/api/caisse/retraits', requireOwner, async (c) => {
  await ensureCaisseTable(c.env.DB)
  const { caisse, montant_centimes, note, type } = await c.req.json() as any
  const t = type === 'cheque_vacances' ? 'cheque_vacances' : 'retrait'
  const result = await c.env.DB.prepare(
    `INSERT INTO caisse_retraits (caisse, montant_centimes, note, type) VALUES (?,?,?,?)`
  ).bind(caisse, montant_centimes, note || null, t).run()
  return c.json({ success: true, id: result.meta.last_row_id }, 201)
})

// Lister les retraits (owner uniquement)
app.get('/api/caisse/retraits', requireOwner, async (c) => {
  await ensureCaisseTable(c.env.DB)
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM caisse_retraits ORDER BY created_at DESC`
  ).all()
  return c.json(results)
})

// Marquer un retrait comme déposé en banque (owner uniquement)
app.patch('/api/caisse/retraits/:id/depose', requireOwner, async (c) => {
  await c.env.DB.prepare(
    `UPDATE caisse_retraits SET depose_banque=1, depose_at=datetime('now') WHERE id=?`
  ).bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// Annuler le dépôt banque (owner uniquement)
app.patch('/api/caisse/retraits/:id/annule-depose', requireOwner, async (c) => {
  await c.env.DB.prepare(
    `UPDATE caisse_retraits SET depose_banque=0, depose_at=NULL WHERE id=?`
  ).bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// Supprimer un retrait (owner uniquement)
app.delete('/api/caisse/retraits/:id', requireOwner, async (c) => {
  await c.env.DB.prepare('DELETE FROM caisse_retraits WHERE id=?').bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// ===== INVITATIONS API =====

// Meal counts only — no personal data (public, for kitchen display)
app.get('/api/cuisine', async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT present, nb_adultes, nb_enfants, repas_json FROM invitations`
  ).all()

  const counts = { cochon: 0, hareng: 0, biquet: 0 }
  let totalAdultes = 0
  let totalEnfants = 0
  let adultesMangent = 0
  let enfantsMangent = 0

  for (const inv of results as any[]) {
    if (!inv.present) continue
    totalAdultes += inv.nb_adultes || 0
    totalEnfants += inv.nb_enfants || 0
    if (!inv.repas_json) continue
    try {
      const repas = JSON.parse(inv.repas_json)
      if (repas.adulte1 && counts[repas.adulte1] !== undefined) { counts[repas.adulte1]++; adultesMangent++ }
      if (repas.adulte2 && counts[repas.adulte2] !== undefined) { counts[repas.adulte2]++; adultesMangent++ }
      for (const r of (repas.enfants || [])) {
        if (r && counts[r] !== undefined) { counts[r]++; enfantsMangent++ }
      }
    } catch {}
  }

  return c.json({
    totalAdultes,
    totalEnfants,
    adultesMangent,
    enfantsMangent,
    cochon: counts.cochon,
    hareng: counts.hareng,
    biquet: counts.biquet,
    total: counts.cochon + counts.hareng + counts.biquet
  })
})

// Submit RSVP (public)
app.post('/api/invitation', async (c) => {
  const body = await c.req.json()
  const { nom_prenom, type_invitation, present, nb_adultes, nb_enfants, repas_json, message } = body

  if (!nom_prenom?.trim() || !type_invitation) {
    return c.json({ error: 'Champs requis manquants' }, 400)
  }
  if (!['pro', 'perso'].includes(type_invitation)) {
    return c.json({ error: 'Type invalide' }, 400)
  }

  const result = await c.env.DB.prepare(
    `INSERT INTO invitations (nom_prenom, type_invitation, present, nb_adultes, nb_enfants, repas_json, message)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    nom_prenom.trim(),
    type_invitation,
    present ? 1 : 0,
    nb_adultes ?? null,
    nb_enfants ?? null,
    repas_json ?? null,
    message?.trim() || null
  ).run()

  return c.json({ success: true, id: result.meta.last_row_id }, 201)
})

// List all RSVPs (admin)
app.get('/api/admin/invitations', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM invitations ORDER BY submitted_at DESC`
  ).all()
  return c.json(results)
})

// Update name of an RSVP (admin)
app.patch('/api/admin/invitations/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const { nom_prenom } = await c.req.json()
  if (!nom_prenom?.trim()) return c.json({ error: 'Nom requis' }, 400)
  await c.env.DB.prepare('UPDATE invitations SET nom_prenom=? WHERE id=?')
    .bind(nom_prenom.trim(), id).run()
  return c.json({ success: true })
})

// Delete an RSVP (admin)
app.delete('/api/admin/invitations/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM invitations WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// ===== CERCLE ANIMÔ API =====

async function ensureCercleAnimoTables(db: D1Database) {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS cercle_animo_schedule (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      day_of_week INTEGER NOT NULL DEFAULT 1,
      time TEXT,
      activity_type TEXT NOT NULL DEFAULT 'Nourrissage',
      description TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'available',
      volunteer_name TEXT,
      volunteers TEXT NOT NULL DEFAULT '[]',
      is_urgent_when_free INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `).run()
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS cercle_animo_audit_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT DEFAULT (datetime('now')),
      action_type TEXT NOT NULL,
      actor_name TEXT,
      slot_id INTEGER,
      slot_date TEXT,
      slot_activity TEXT,
      details TEXT
    )
  `).run()
}

// GET /api/schedule — liste complète
app.get('/api/schedule', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM cercle_animo_schedule ORDER BY date ASC, activity_type ASC`
  ).all()
  return c.json(results.map((r: any) => ({
    ...r,
    volunteers: (() => { try { return JSON.parse(r.volunteers) } catch { return [] } })(),
    is_urgent_when_free: r.is_urgent_when_free === 1
  })))
})

// POST /api/schedule — remplace tout le planning
app.post('/api/schedule', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const items = await c.req.json() as any[]
  if (!Array.isArray(items)) return c.json({ error: 'Array attendu' }, 400)

  await c.env.DB.prepare(`DELETE FROM cercle_animo_schedule`).run()

  const stmts = items.map((item: any) =>
    c.env.DB.prepare(`
      INSERT INTO cercle_animo_schedule
        (id, date, day_of_week, time, activity_type, description, notes, status, volunteer_name, volunteers, is_urgent_when_free, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      item.id ?? null,
      item.date,
      item.day_of_week ?? 1,
      item.time ?? null,
      item.activity_type ?? 'Nourrissage',
      item.description ?? null,
      item.notes ?? null,
      item.status ?? 'available',
      item.volunteer_name ?? null,
      JSON.stringify(Array.isArray(item.volunteers) ? item.volunteers : []),
      item.is_urgent_when_free ? 1 : 0,
      item.created_at ?? null,
      item.updated_at ?? null
    )
  )

  if (stmts.length > 0) await c.env.DB.batch(stmts)

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM cercle_animo_schedule ORDER BY date ASC, activity_type ASC`
  ).all()
  return c.json(results.map((r: any) => ({
    ...r,
    volunteers: (() => { try { return JSON.parse(r.volunteers) } catch { return [] } })(),
    is_urgent_when_free: r.is_urgent_when_free === 1
  })))
})

// PUT /api/schedule/:id — mise à jour ciblée
app.put('/api/schedule/:id', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const id = c.req.param('id')
  const body = await c.req.json() as any

  const fields: string[] = []
  const values: any[] = []

  if (body.notes !== undefined)               { fields.push('notes=?');               values.push(body.notes) }
  if (body.status !== undefined)              { fields.push('status=?');              values.push(body.status) }
  if (body.volunteer_name !== undefined)      { fields.push('volunteer_name=?');      values.push(body.volunteer_name) }
  if (body.volunteers !== undefined)          { fields.push('volunteers=?');          values.push(JSON.stringify(body.volunteers)) }
  if (body.is_urgent_when_free !== undefined) { fields.push('is_urgent_when_free=?'); values.push(body.is_urgent_when_free ? 1 : 0) }
  if (body.date !== undefined)               { fields.push('date=?');               values.push(body.date) }
  if (body.day_of_week !== undefined)        { fields.push('day_of_week=?');        values.push(body.day_of_week) }
  if (body.activity_type !== undefined)      { fields.push('activity_type=?');      values.push(body.activity_type) }

  if (fields.length === 0) return c.json({ error: 'Rien à mettre à jour' }, 400)
  fields.push("updated_at=datetime('now')")
  values.push(id)

  await c.env.DB.prepare(`UPDATE cercle_animo_schedule SET ${fields.join(', ')} WHERE id=?`).bind(...values).run()
  return c.json({ success: true })
})

// DELETE /api/schedule/:id — suppression d'un créneau
app.delete('/api/schedule/:id', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  await c.env.DB.prepare(`DELETE FROM cercle_animo_schedule WHERE id=?`).bind(c.req.param('id')).run()
  return c.json({ success: true })
})

// POST /api/schedule/:id/assign — inscription bénévole
app.post('/api/schedule/:id/assign', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const id = c.req.param('id')
  const { volunteer_name } = await c.req.json() as any

  const row = await c.env.DB.prepare(`SELECT * FROM cercle_animo_schedule WHERE id=?`).bind(id).first() as any
  if (!row) return c.json({ error: 'Créneau non trouvé' }, 404)

  const volunteers: string[] = (() => { try { return JSON.parse(row.volunteers) } catch { return [] } })()
  if (!volunteers.includes(volunteer_name)) volunteers.push(volunteer_name)

  const newStatus = 'assigned'
  const newVolunteerName = row.activity_type === 'Nourrissage' ? volunteer_name : row.volunteer_name

  await c.env.DB.prepare(`
    UPDATE cercle_animo_schedule SET volunteers=?, status=?, volunteer_name=?, updated_at=datetime('now') WHERE id=?
  `).bind(JSON.stringify(volunteers), newStatus, newVolunteerName, id).run()

  return c.json({ success: true })
})

// POST /api/schedule/:id/unassign — désinscription bénévole
app.post('/api/schedule/:id/unassign', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const id = c.req.param('id')
  const { volunteer_name } = await c.req.json() as any

  const row = await c.env.DB.prepare(`SELECT * FROM cercle_animo_schedule WHERE id=?`).bind(id).first() as any
  if (!row) return c.json({ error: 'Créneau non trouvé' }, 404)

  let volunteers: string[] = (() => { try { return JSON.parse(row.volunteers) } catch { return [] } })()
  volunteers = volunteers.filter((v: string) => v !== volunteer_name)

  const newStatus = volunteers.length === 0
    ? (row.is_urgent_when_free ? 'urgent' : 'available')
    : 'assigned'
  const newVolunteerName = row.activity_type === 'Nourrissage' ? null : row.volunteer_name

  await c.env.DB.prepare(`
    UPDATE cercle_animo_schedule SET volunteers=?, status=?, volunteer_name=?, updated_at=datetime('now') WHERE id=?
  `).bind(JSON.stringify(volunteers), newStatus, volunteers.length > 0 ? row.volunteer_name : newVolunteerName, id).run()

  return c.json({ success: true })
})

// GET /api/audit-log — journal paginé avec filtres
app.get('/api/audit-log', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const limit = parseInt(c.req.query('limit') || '20')
  const offset = parseInt(c.req.query('offset') || '0')
  const actionType = c.req.query('action_type') || ''
  const actorName = c.req.query('actor_name') || ''

  let where = ''
  const params: any[] = []

  if (actionType) { where += (where ? ' AND ' : ' WHERE ') + 'action_type=?'; params.push(actionType) }
  if (actorName)  { where += (where ? ' AND ' : ' WHERE ') + 'actor_name LIKE ?'; params.push(`%${actorName}%`) }

  const total = (await c.env.DB.prepare(`SELECT COUNT(*) as count FROM cercle_animo_audit_log${where}`).bind(...params).first() as any).count
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM cercle_animo_audit_log${where} ORDER BY id DESC LIMIT ? OFFSET ?`
  ).bind(...params, limit, offset).all()

  return c.json({ success: true, entries: results, total, limit, offset })
})

// POST /api/audit-log/record — enregistrement d'une action
app.post('/api/audit-log/record', async (c) => {
  await ensureCercleAnimoTables(c.env.DB)
  const body = await c.req.json() as any
  await c.env.DB.prepare(`
    INSERT INTO cercle_animo_audit_log (action_type, actor_name, slot_id, slot_date, slot_activity, details)
    VALUES (?, ?, ?, ?, ?, ?)
  `).bind(
    body.action_type,
    body.actor_name ?? null,
    body.slot_id ?? null,
    body.slot_date ?? null,
    body.slot_activity ?? null,
    body.details ?? null
  ).run()
  return c.json({ success: true })
})

// ===== GUESTS API =====

app.get('/api/admin/guests', requireAuth, async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT * FROM guests ORDER BY categorie, nom`
  ).all()
  return c.json(results)
})

app.post('/api/admin/guests', requireAuth, async (c) => {
  const { nom, categorie, save_the_date, invitation, a_repondu, notes } = await c.req.json()
  if (!nom?.trim()) return c.json({ error: 'Nom requis' }, 400)
  const result = await c.env.DB.prepare(
    `INSERT INTO guests (nom, categorie, save_the_date, invitation, a_repondu, notes) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(nom.trim(), categorie || 'perso', save_the_date ? 1 : 0, invitation ? 1 : 0, a_repondu ? 1 : 0, notes?.trim() || null).run()
  return c.json({ success: true, id: result.meta.last_row_id }, 201)
})

app.patch('/api/admin/guests/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const fields: string[] = []
  const values: any[] = []
  if (body.nom !== undefined)           { fields.push('nom=?');           values.push(body.nom.trim()) }
  if (body.categorie !== undefined)     { fields.push('categorie=?');     values.push(body.categorie) }
  if (body.save_the_date !== undefined) { fields.push('save_the_date=?'); values.push(body.save_the_date ? 1 : 0) }
  if (body.invitation !== undefined)    { fields.push('invitation=?');    values.push(body.invitation ? 1 : 0) }
  if (body.a_repondu !== undefined)     { fields.push('a_repondu=?');     values.push(body.a_repondu ? 1 : 0) }
  if (body.relance2 !== undefined)      { fields.push('relance2=?');      values.push(body.relance2 ? 1 : 0) }
  if (body.notes !== undefined)         { fields.push('notes=?');         values.push(body.notes?.trim() || null) }
  if (fields.length === 0) return c.json({ error: 'Rien à mettre à jour' }, 400)
  values.push(id)
  await c.env.DB.prepare(`UPDATE guests SET ${fields.join(', ')} WHERE id=?`).bind(...values).run()
  return c.json({ success: true })
})

app.delete('/api/admin/guests/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM guests WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

export default app
