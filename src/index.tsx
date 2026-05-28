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
    `SELECT present, nb_enfants, repas_json FROM invitations`
  ).all()

  const counts = { cochon: 0, hareng: 0, biquet: 0 }
  let adultesMangent = 0
  let enfantsMangent = 0

  for (const inv of results as any[]) {
    if (!inv.present || !inv.repas_json) continue
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
    adultes: adultesMangent,
    enfants: enfantsMangent,
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

// Delete an RSVP (admin)
app.delete('/api/admin/invitations/:id', requireAuth, async (c) => {
  const id = c.req.param('id')
  await c.env.DB.prepare('DELETE FROM invitations WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

export default app
