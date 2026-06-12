import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  ADMIN_PASSWORD?: string
}

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
  
  // Convert to base64 data URL
  const arrayBuffer = await file.arrayBuffer()
  const bytes = new Uint8Array(arrayBuffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
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
