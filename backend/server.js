import http from 'node:http'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10, idleTimeoutMillis: 30000, connectionTimeoutMillis: 5000 })
pool.on('error', error => console.error('Unexpected PostgreSQL pool error', error))
const PORT = Number(process.env.PORT || 8787)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || ''
const SESSION_TTL_HOURS = Math.max(1, Math.min(168, Number(process.env.SESSION_TTL_HOURS || 12)))
const SESSION_SAMESITE = ['strict', 'lax', 'none'].includes(String(process.env.SESSION_SAMESITE || 'lax').toLowerCase()) ? String(process.env.SESSION_SAMESITE || 'lax').toLowerCase() : 'lax'
const ORIGIN = process.env.CORS_ORIGIN || 'https://cymswj.github.io'
const stages = new Set(['new','qualified','appointment_requested','confirmed','visited','followup','closed'])
const publicEvents = new Set(['page_view','resource_view','cta_click','form_start','lead_created','contact_opened','appointment_requested','appointment_confirmed','visit_completed','followup_due','followup_completed','lead_stage_changed'])
const loginAttempts = new Map()
const publicAttempts = new Map()
const SESSION_COOKIE = '__Host-sanya_session'

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Admin-Token')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
  res.setHeader('Access-Control-Max-Age', '600')
}
function securityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Referrer-Policy', 'no-referrer')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
}

function json(res, status, body) {
  cors(res)
  securityHeaders(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  res.writeHead(status)
  res.end(body == null ? '' : JSON.stringify(body))
}
function requireJson(req) {
  const contentType = String(req.headers['content-type'] || '').toLowerCase()
  return contentType.startsWith('application/json')
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0
    const chunks = []
    req.on('data', chunk => {
      size += chunk.length
      if (size > 32768) {
        reject(Object.assign(new Error('payload too large'), { statusCode: 413 }))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')) }
      catch { reject(Object.assign(new Error('invalid json'), { statusCode: 400 })) }
    })
    req.on('error', reject)
  })
}

function clientIp(req) {
  return String(req.headers['x-real-ip'] || req.socket.remoteAddress || 'unknown').trim()
}
function requestFromAllowedOrigin(req) {
  const origin = String(req.headers.origin || '')
  return !origin || origin === ORIGIN
}
function safeDecode(value) {
  try { return decodeURIComponent(value) } catch { return '' }
}
function parseCookies(req) {
  const raw = String(req.headers.cookie || '')
  return Object.fromEntries(
    raw.split(';').map(part => part.trim()).filter(Boolean).map(part => {
      const index = part.indexOf('=')
      return index < 0 ? [part, ''] : [part.slice(0, index), safeDecode(part.slice(index + 1))]
    })
  )
}
function setSessionCookie(res, token, maxAgeSeconds) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=${SESSION_SAMESITE}`)
}
function clearSessionCookie(res) {
  res.setHeader('Set-Cookie', `${SESSION_COOKIE}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=${SESSION_SAMESITE}`)
}

function isRateLimited(ip) {
  const now = Date.now()
  const item = loginAttempts.get(ip)
  if (!item || now >= item.resetAt) return false
  return item.count >= 8
}
function recordFailedLogin(ip) {
  const now = Date.now()
  const item = loginAttempts.get(ip)
  if (!item || now >= item.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + 15 * 60 * 1000 })
  } else {
    item.count += 1
  }
}
function clearFailedLogins(ip) {
  loginAttempts.delete(ip)
}
function cleanupLoginAttempts() {
  const now = Date.now()
  for (const [ip, item] of loginAttempts) {
    if (now >= item.resetAt) loginAttempts.delete(ip)
  }
  for (const [key, item] of publicAttempts) {
    if (now >= item.resetAt) publicAttempts.delete(key)
  }
}
function allowPublicRequest(kind, ip, limit, windowMs) {
  const key = kind + ':' + ip
  const now = Date.now()
  const item = publicAttempts.get(key)
  if (!item || now >= item.resetAt) {
    publicAttempts.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }
  if (item.count >= limit) return false
  item.count += 1
  return true
}
setInterval(cleanupLoginAttempts, 15 * 60 * 1000).unref()

function parsePasswordHash(value) {
  const parts = String(value || '').split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return null
  const N = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4], 'base64')
  const expected = Buffer.from(parts[5], 'base64')
  if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p) || !salt.length || !expected.length) return null
  return { N, r, p, salt, expected }
}
function verifyPassword(password) {
  const parsed = parsePasswordHash(ADMIN_PASSWORD_HASH)
  if (!parsed || parsed.expected.length !== 64) return false
  const derived = crypto.scryptSync(String(password || ''), parsed.salt, parsed.expected.length, {
    N: parsed.N,
    r: parsed.r,
    p: parsed.p,
    maxmem: 64 * 1024 * 1024,
  })
  return crypto.timingSafeEqual(derived, parsed.expected)
}
function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex')
}
async function audit(username, action, targetId, req, metadata = {}) {
  await pool.query('INSERT INTO audit_logs(username,action,target_id,ip,metadata) VALUES($1,$2,$3,$4,$5)', [username, action, targetId || null, clientIp(req), metadata])
}

async function createSession(username) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + SESSION_TTL_HOURS * 60 * 60 * 1000)
  await pool.query(
    'INSERT INTO admin_sessions(token_hash,username,expires_at) VALUES($1,$2,$3)',
    [tokenHash(token), username, expires]
  )
  await pool.query('DELETE FROM admin_sessions WHERE expires_at < NOW()')
  return { token, expiresAt: expires.toISOString() }
}
async function getSession(req) {
  const cookies = parseCookies(req)
  const cookieToken = cookies[SESSION_COOKIE] || ''
  const auth = String(req.headers.authorization || '')
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : cookieToken
  const legacy = String(req.headers['x-admin-token'] || '')
  if (legacy && ADMIN_TOKEN && legacy === ADMIN_TOKEN) {
    return { username: ADMIN_USERNAME, legacy: true }
  }
  if (!bearer) return null
  const result = await pool.query(
    'SELECT username, expires_at FROM admin_sessions WHERE token_hash=$1 AND expires_at > NOW()',
    [tokenHash(bearer)]
  )
  const row = result.rows[0]
  if (!row) return null
  await pool.query('UPDATE admin_sessions SET last_seen_at=NOW() WHERE token_hash=$1', [tokenHash(bearer)])
  return { username: row.username, legacy: false, tokenHash: tokenHash(bearer) }
}
async function requireAdmin(req) {
  const session = await getSession(req)
  return session
}

function cleanLead(input) {
  return {
    source: String(input.source || 'direct').slice(0, 80),
    medium: String(input.medium || '').slice(0, 80),
    campaign: String(input.campaign || '').slice(0, 120),
    language: String(input.language || 'ru').slice(0, 16),
    name: String(input.name || '').trim().slice(0, 120),
    contact: String(input.contact || '').trim().slice(0, 160),
    preferredDate: /^\\d{4}-\\d{2}-\\d{2}$/.test(String(input.preferredDate || '')) ? input.preferredDate : null,
    service: String(input.service || '').trim().slice(0, 160),
  }
}

function createLeadId() {
  const date = new Date().toISOString().slice(2, 10).replaceAll('-', '')
  const suffix = crypto.randomBytes(3).toString('hex').toUpperCase()
  return 'SAN-' + date + '-' + suffix
}

function positiveInt(value, fallback, max) {
  const parsed = Number(value)
  if (!Number.isInteger(parsed) || parsed < 0) return fallback
  return Math.min(parsed, max)
}
function parsePagination(url, defaultLimit = 100, maxLimit = 500) {
  const limit = Math.max(1, positiveInt(url.searchParams.get('limit'), defaultLimit, maxLimit))
  const offset = positiveInt(url.searchParams.get('offset'), 0, 1000000)
  return { limit, offset }
}
function cleanOptionalDate(value) {
  const candidate = String(value || '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(candidate) ? candidate : null
}
function cleanOptionalValue(value) {
  if (value === '' || value == null) return null
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1000000000) return null
  return Math.round(numeric * 100) / 100
}
function cleanOwner(value) {
  return String(value || '').trim().slice(0, 120)
}

async function ensureSchema() {
  const schemaPath = new URL('./schema.sql', import.meta.url)
  const schema = await fs.readFile(schemaPath, 'utf8')
  await pool.query(schema)
}

const server = http.createServer(async (req, res) => {
  try {
    cors(res)
    if (req.method === 'OPTIONS') return json(res, 204, null)
    const url = new URL(req.url, 'http://localhost')

    if (req.method === 'GET' && url.pathname === '/health') {
      await pool.query('SELECT 1')
      return json(res, 200, { ok: true, service: 'sanya-tcm-api' })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      const ip = clientIp(req)
      if (isRateLimited(ip)) return json(res, 429, { error: 'too many login attempts' })
      const input = await readBody(req)
      const username = String(input.username || '').trim()
      const password = String(input.password || '')
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      if (!ADMIN_PASSWORD_HASH || username !== ADMIN_USERNAME || !verifyPassword(password)) {
        recordFailedLogin(ip)
        return json(res, 401, { error: 'invalid credentials' })
      }
      clearFailedLogins(ip)
      const session = await createSession(username)
      setSessionCookie(res, session.token, SESSION_TTL_HOURS * 60 * 60)
      await audit(username, 'login', null, req)
      return json(res, 200, { ok: true, username, expiresAt: session.expiresAt })
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      return json(res, 200, { ok: true, username: session.username })
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      const cookies = parseCookies(req)
      const bearer = cookies[SESSION_COOKIE] || ''
      if (bearer) await pool.query('DELETE FROM admin_sessions WHERE token_hash=$1', [tokenHash(bearer)])
      if (session) await audit(session.username, 'logout', null, req)
      clearSessionCookie(res)
      return json(res, 200, { ok: true })
    }

    if (req.method === 'POST' && url.pathname === '/api/leads') {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const ip = clientIp(req)
      if (!allowPublicRequest('lead', ip, 30, 15 * 60 * 1000)) return json(res, 429, { error: 'too many lead requests' })
      const lead = cleanLead(await readBody(req))
      if (!lead.name || !lead.contact || !lead.service) return json(res, 400, { error: 'name, contact and service are required' })
      const id = createLeadId()
      await pool.query(
        'INSERT INTO leads (id,stage,source,medium,campaign,language,name,contact,preferred_date,service) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [id,'appointment_requested',lead.source,lead.medium,lead.campaign,lead.language,lead.name,lead.contact,lead.preferredDate,lead.service]
      )
      return json(res, 201, { ok: true, id, stage: 'appointment_requested' })
    }

    if (req.method === 'POST' && url.pathname === '/api/events') {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const ip = clientIp(req)
      if (!allowPublicRequest('event', ip, 120, 15 * 60 * 1000)) return json(res, 429, { error: 'too many event requests' })
      const input = await readBody(req)
      const eventName = String(input.eventName || '').slice(0, 80)
      if (!publicEvents.has(eventName)) return json(res, 400, { error: 'unsupported event' })
      await pool.query(
        'INSERT INTO funnel_events(event_name,path,language,source,medium,campaign) VALUES($1,$2,$3,$4,$5,$6)',
        [eventName,String(input.path || '').slice(0,200),String(input.language || '').slice(0,16),String(input.source || '').slice(0,80),String(input.medium || '').slice(0,80),String(input.campaign || '').slice(0,120)]
      )
      return json(res, 201, { ok: true })
    }

    if (req.method === 'GET' && url.pathname === '/api/leads') {
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const { limit, offset } = parsePagination(url, 100, 500)
      const stageFilter = String(url.searchParams.get('stage') || '').trim()
      const sourceFilter = String(url.searchParams.get('source') || '').trim().slice(0, 80)
      const queryFilter = String(url.searchParams.get('q') || '').trim().slice(0, 120)
      const where = []
      const values = []
      if (stages.has(stageFilter)) {
        values.push(stageFilter)
        where.push('stage=
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      const appointmentDate = cleanOptionalDate(input.appointmentDate)
      const visitDate = cleanOptionalDate(input.visitDate)
      const followupDate = cleanOptionalDate(input.followupDate)
      const valueCny = cleanOptionalValue(input.valueCny)
      const owner = cleanOwner(input.owner)
      const updateResult = await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,appointmentDate,visitDate,followupDate,valueCny,owner || null,id]
      )
      if (!updateResult.rowCount) return json(res, 404, { error: 'lead not found' })
      await audit(session.username, 'lead_update', id, req, { stage, appointmentDate, visitDate, followupDate, valueCny, owner: owner || null })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + values.length)
      }
      if (sourceFilter) {
        values.push(sourceFilter)
        where.push('source=
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + values.length)
      }
      if (queryFilter) {
        values.push('%' + queryFilter + '%')
        where.push('(name ILIKE 
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + values.length + ' OR contact ILIKE 
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + values.length + ' OR service ILIKE 
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + values.length + ')')
      }
      const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : ''
      const countResult = await pool.query('SELECT COUNT(*)::int AS count FROM leads ' + whereSql, values)
      const rowValues = [...values, limit, offset]
      const result = await pool.query(
        'SELECT * FROM leads ' + whereSql + ' ORDER BY created_at DESC LIMIT 
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + (values.length + 1) + ' OFFSET 
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
 + (values.length + 2),
        rowValues
      )
      return json(res, 200, { leads: result.rows, total: countResult.rows[0]?.count || 0, limit, offset })
    }

    if (req.method === 'GET' && url.pathname === '/api/audit') {
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const { limit, offset } = parsePagination(url, 50, 200)
      const [countResult, result] = await Promise.all([
        pool.query('SELECT COUNT(*)::int AS count FROM audit_logs'),
        pool.query('SELECT id,occurred_at,username,action,target_id,ip,metadata FROM audit_logs ORDER BY occurred_at DESC LIMIT $1 OFFSET $2', [limit, offset]),
      ])
      return json(res, 200, { logs: result.rows, total: countResult.rows[0]?.count || 0, limit, offset })
    }

    if (req.method === 'GET' && url.pathname === '/api/dashboard') {
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const [counts, sources, events] = await Promise.all([
        pool.query('SELECT stage, COUNT(*)::int AS count FROM leads GROUP BY stage'),
        pool.query("SELECT COALESCE(source,'direct') AS source, COUNT(*)::int AS count FROM leads GROUP BY 1 ORDER BY count DESC LIMIT 10"),
        pool.query('SELECT COUNT(*)::int AS count FROM funnel_events'),
      ])
      const stageCounts = Object.fromEntries(counts.rows.map(row => [row.stage, row.count]))
      return json(res, 200, {
        totals: {
          leads: Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
          confirmed: stageCounts.confirmed || 0,
          visited: stageCounts.visited || 0,
          followup: stageCounts.followup || 0,
          events: events.rows[0]?.count || 0,
        },
        stageCounts,
        sources: sources.rows,
      })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!requireJson(req)) return json(res, 415, { error: 'content-type must be application/json' })
      if (!requestFromAllowedOrigin(req)) return json(res, 403, { error: 'origin not allowed' })
      const session = await requireAdmin(req)
      if (!session) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query(
        'UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7',
        [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id]
      )
      await audit(session.username, 'lead_update', id, req, { stage })
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

ensureSchema()
  .then(() => server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT)))
  .catch(error => {
    console.error('Database schema initialization failed', error)
    process.exit(1)
  })

async function shutdown(signal) {
  console.log('Received ' + signal + ', shutting down')
  server.close(async () => {
    await pool.end()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
