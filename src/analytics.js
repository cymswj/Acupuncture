const STORAGE_KEY = 'sanya_tcm_events_v1'

export const FUNNEL_EVENTS = [
  'page_view',
  'resource_view',
  'cta_click',
  'form_start',
  'lead_created',
  'contact_opened',
  'appointment_requested',
  'appointment_confirmed',
  'visit_completed',
  'followup_due',
  'followup_completed',
  'lead_stage_changed',
]

const SAFE_PROPERTY_KEYS = new Set([
  'placement',
  'channel',
  'form',
  'stage',
  'leadStage',
  'language',
  'source',
  'medium',
  'campaign',
])

function getStoredEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function sanitizeProperties(properties = {}) {
  const input = properties && typeof properties === 'object' ? properties : {}
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => SAFE_PROPERTY_KEYS.has(key))
      .map(([key, value]) => [key, String(value ?? '').slice(0, 160)])
  )
}

function sendRemoteEvent(name, safe, options = {}) {
  const remoteUrl = String(options.remoteUrl || '')
  if (!remoteUrl || !FUNNEL_EVENTS.includes(name)) return
  const payload = {
    eventName: name,
    path: String(safe.path || '').slice(0, 200),
    language: String(safe.language || 'ru').slice(0, 16),
    source: String(safe.source || '').slice(0, 80),
    medium: String(safe.medium || '').slice(0, 80),
    campaign: String(safe.campaign || '').slice(0, 120),
  }
  fetch(remoteUrl, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function trackEvent(name, properties = {}, options = {}) {
  if (!FUNNEL_EVENTS.includes(name)) return null
  const safe = {
    name,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    language: document.documentElement.lang || 'ru',
    ...sanitizeProperties(properties),
  }

  try {
    const events = getStoredEvents()
    events.push(safe)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500)))
  } catch {}

  sendRemoteEvent(name, safe, options)
  return safe
}

export function readEvents() {
  return getStoredEvents()
}

export function clearEvents() {
  try { localStorage.removeItem(STORAGE_KEY) } catch {}
}
