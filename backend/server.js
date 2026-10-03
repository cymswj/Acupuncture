import http from 'node:http'
import crypto from 'node:crypto'
import pg from 'pg'

const { Pool } = pg
const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const PORT = Number(process.env.PORT || 8787)
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || ''
const ORIGIN = process.env.CORS_ORIGIN || 'https://cymswj.github.io'
const stages = new Set(['new','qualified','appointment_requested','confirmed','visited','followup','closed'])

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', ORIGIN)
  res.setHeader('Vary', 'Origin')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Token')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PATCH,OPTIONS')
}
function json(res, status, body) {
  cors(res)
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.writeHead(status)
  res.end(body == null ? '' : JSON.stringify(body))
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
function isAdmin(req) {
  return Boolean(ADMIN_TOKEN) && req.headers['x-admin-token'] === ADMIN_TOKEN
}
function cleanLead(input) {
  return {
    id: String(input.id || crypto.randomUUID()).slice(0, 80),
    source: String(input.source || 'direct').slice(0, 80),
    medium: String(input.medium || '').slice(0, 80),
    campaign: String(input.campaign || '').slice(0, 120),
    language: String(input.language || 'ru').slice(0, 16),
    name: String(input.name || '').trim().slice(0, 120),
    contact: String(input.contact || '').trim().slice(0, 160),
    preferredDate: input.preferredDate || null,
    service: String(input.service || '').trim().slice(0, 160),
  }
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

    if (req.method === 'POST' && url.pathname === '/api/leads') {
      const lead = cleanLead(await readBody(req))
      if (!lead.name || !lead.contact || !lead.service) return json(res, 400, { error: 'name, contact and service are required' })
      await pool.query('INSERT INTO leads (id,stage,source,medium,campaign,language,name,contact,preferred_date,service) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT (id) DO UPDATE SET updated_at=NOW(),stage=$2,source=$3,medium=$4,campaign=$5,language=$6,name=$7,contact=$8,preferred_date=$9,service=$10', [lead.id,'appointment_requested',lead.source,lead.medium,lead.campaign,lead.language,lead.name,lead.contact,lead.preferredDate,lead.service])
      return json(res, 201, { ok: true, id: lead.id, stage: 'appointment_requested' })
    }

    if (req.method === 'POST' && url.pathname === '/api/events') {
      const input = await readBody(req)
      const eventName = String(input.eventName || '').slice(0, 80)
      if (!eventName) return json(res, 400, { error: 'eventName is required' })
      await pool.query('INSERT INTO funnel_events(event_name,path,language,source,medium,campaign) VALUES($1,$2,$3,$4,$5,$6)', [eventName,String(input.path || '').slice(0,200),String(input.language || '').slice(0,16),String(input.source || '').slice(0,80),String(input.medium || '').slice(0,80),String(input.campaign || '').slice(0,120)])
      return json(res, 201, { ok: true })
    }

    if (req.method === 'GET' && url.pathname === '/api/leads') {
      if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' })
      const result = await pool.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 500')
      return json(res, 200, { leads: result.rows })
    }

    if (req.method === 'PATCH' && url.pathname.startsWith('/api/leads/')) {
      if (!isAdmin(req)) return json(res, 401, { error: 'unauthorized' })
      const id = decodeURIComponent(url.pathname.slice('/api/leads/'.length))
      const input = await readBody(req)
      const stage = String(input.stage || '')
      if (!stages.has(stage)) return json(res, 400, { error: 'invalid stage' })
      await pool.query('UPDATE leads SET stage=$1,updated_at=NOW(),appointment_date=COALESCE($2,appointment_date),visit_date=COALESCE($3,visit_date),followup_date=COALESCE($4,followup_date),value_cny=COALESCE($5,value_cny),owner=COALESCE($6,owner) WHERE id=$7', [stage,input.appointmentDate || null,input.visitDate || null,input.followupDate || null,input.valueCny || null,input.owner || null,id])
      return json(res, 200, { ok: true, id, stage })
    }

    return json(res, 404, { error: 'not found' })
  } catch (error) {
    console.error(error)
    return json(res, error.statusCode || 500, { error: 'server error' })
  }
})

server.listen(PORT, () => console.log('Sanya TCM API listening on :' + PORT))
