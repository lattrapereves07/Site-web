import { Hono } from 'hono'
import { cors } from 'hono/cors'

type Bindings = {
  DB: D1Database
  IMAGES: R2Bucket
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
  const password = c.env.ADMIN_PASSWORD || 'attrapereves2026'
  if (token !== password) {
    return c.json({ error: 'Mot de passe incorrect' }, 401)
  }
  await next()
}

// ===== PUBLIC API =====

// Get all published events (future first)
app.get('/api/events', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT id, title, description, event_date, event_time, end_date, end_time, 
           category, image_key, booking_url
    FROM events 
    WHERE is_published = 1 
    ORDER BY event_date ASC, event_time ASC
  `).all()
  
  // Add image URLs
  const events = results.map((e: any) => ({
    ...e,
    image_url: e.image_key ? `/api/images/${e.image_key}` : null
  }))
  
  return c.json(events)
})

// Serve image from R2
app.get('/api/images/:key', async (c) => {
  const key = c.req.param('key')
  const object = await c.env.IMAGES.get(`events/${key}`)
  if (!object) return c.notFound()
  
  const headers = new Headers()
  headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg')
  headers.set('Cache-Control', 'public, max-age=86400')
  
  return new Response(object.body, { headers })
})

// ===== ADMIN API =====

// Login check
app.post('/api/admin/login', async (c) => {
  const { password } = await c.req.json()
  const adminPwd = c.env.ADMIN_PASSWORD || 'attrapereves2026'
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
  
  const events = results.map((e: any) => ({
    ...e,
    image_url: e.image_key ? `/api/images/${e.image_key}` : null
  }))
  
  return c.json(events)
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
  
  // Delete associated image if any
  const event: any = await c.env.DB.prepare('SELECT image_key FROM events WHERE id=?').bind(id).first()
  if (event?.image_key) {
    await c.env.IMAGES.delete(`events/${event.image_key}`)
  }
  
  await c.env.DB.prepare('DELETE FROM events WHERE id=?').bind(id).run()
  return c.json({ success: true })
})

// Upload image for event
app.post('/api/admin/events/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  const formData = await c.req.formData()
  const file = formData.get('image') as File
  
  if (!file) return c.json({ error: 'Aucune image fournie' }, 400)
  
  // Delete old image if exists
  const event: any = await c.env.DB.prepare('SELECT image_key FROM events WHERE id=?').bind(id).first()
  if (event?.image_key) {
    await c.env.IMAGES.delete(`events/${event.image_key}`)
  }
  
  const ext = file.name.split('.').pop() || 'jpg'
  const key = `${id}-${Date.now()}.${ext}`
  
  await c.env.IMAGES.put(`events/${key}`, file.stream(), {
    httpMetadata: { contentType: file.type }
  })
  
  await c.env.DB.prepare('UPDATE events SET image_key=?, updated_at=datetime(\'now\') WHERE id=?')
    .bind(key, id).run()
  
  return c.json({ image_key: key, image_url: `/api/images/${key}` })
})

// Delete image for event
app.delete('/api/admin/events/:id/image', requireAuth, async (c) => {
  const id = c.req.param('id')
  
  const event: any = await c.env.DB.prepare('SELECT image_key FROM events WHERE id=?').bind(id).first()
  if (event?.image_key) {
    await c.env.IMAGES.delete(`events/${event.image_key}`)
  }
  
  await c.env.DB.prepare('UPDATE events SET image_key=NULL, updated_at=datetime(\'now\') WHERE id=?')
    .bind(id).run()
  
  return c.json({ success: true })
})

export default app
