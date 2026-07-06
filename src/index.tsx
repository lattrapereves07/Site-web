import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
  OWNER_PASSWORD?: string
  SQUARE_ACCESS_TOKEN?: string
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

app.post('/api/billetterie/pay', async (c) => {
  const token = c.env.SQUARE_ACCESS_TOKEN
  if (!token) return c.json({ error: 'Paiement non configuré' }, 500)

  const body = await c.req.json() as any
  const { sourceId, items, buyerInfo, idempotencyKey } = body

  if (!sourceId || !Array.isArray(items) || !idempotencyKey) {
    return c.json({ error: 'Données manquantes' }, 400)
  }
  if (!buyerInfo?.nom?.trim() || !buyerInfo?.prenom?.trim() || !buyerInfo?.email?.trim()) {
    return c.json({ error: 'Nom, prénom et email requis' }, 400)
  }

  const lineItems: any[] = []
  let expectedTotal = 0

  for (const item of items) {
    const tarif = TARIFS[item.id]
    if (!tarif) return c.json({ error: `Tarif inconnu: ${item.id}` }, 400)
    const qty = parseInt(item.qty)
    if (isNaN(qty) || qty < 0 || qty > 50) return c.json({ error: 'Quantité invalide' }, 400)
    if (qty === 0) continue
    lineItems.push({ catalog_object_id: tarif.variationId, quantity: String(qty) })
    expectedTotal += tarif.price * qty
  }

  if (lineItems.length === 0) return c.json({ error: 'Panier vide' }, 400)
  if (expectedTotal === 0) return c.json({ error: 'Montant nul — pas de paiement requis' }, 400)

  const orderBody: any = {
    order: {
      location_id: SQUARE_LOCATION_ID,
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
    if (code === 'CARD_DECLINED') return c.json({ error: 'Carte refusée — vérifiez vos informations bancaires' }, 402)
    if (code === 'INSUFFICIENT_FUNDS') return c.json({ error: 'Fonds insuffisants' }, 402)
    if (code === 'CVV_FAILURE') return c.json({ error: 'Code CVV incorrect' }, 402)
    return c.json({ error: detail }, 402)
  }
  const payData = await payRes.json() as any
  const payment = payData.payment

  return c.json({ success: true, orderId, paymentId: payment.id, receiptUrl: payment.receipt_url, totalCentimes: orderTotal })
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
  const { title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published } = body
  
  const result = await c.env.DB.prepare(`
    INSERT INTO events (title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).bind(
    title, description || null, event_date, event_time || null,
    end_date || null, end_time || null, category || 'evenement',
    booking_url || null, is_published ?? 1
  ).run()
  
  return c.json({ id: result.meta.last_row_id, ...body }, 201)
})

// Update event
app.put('/api/admin/events/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  const body = await c.req.json()
  const { title, description, event_date, event_time, end_date, end_time, category, booking_url, is_published } = body
  
  await c.env.DB.prepare(`
    UPDATE events SET title=?, description=?, event_date=?, event_time=?, end_date=?, end_time=?,
    category=?, booking_url=?, is_published=?, updated_at=datetime('now')
    WHERE id=?
  `).bind(
    title, description || null, event_date, event_time || null,
    end_date || null, end_time || null, category || 'evenement',
    booking_url || null, is_published ?? 1, id
  ).run()
  
  return c.json({ success: true })
})

// Delete event
app.delete('/api/admin/events/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
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
