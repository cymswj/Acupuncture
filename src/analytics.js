const STORAGE_KEY = 'sanya_tcm_events_v1'

function getStoredEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

function sanitizeProperties(properties = {}) {
  const safe = { ...properties }
  for (const key of ['note','message','diagnosis','medicalRecords','patientName','phone','telegram','contact','email','address','ip','userId']) {
    delete safe[key]
  }
  return safe
}

function sendRemoteEvent(name, safe, options = {}) {
  const remoteUrl = String(options.remoteUrl || '')
  if (!remoteUrl) return
  const payload = {
    eventName: name,
    path: safe.path,
    language: safe.language,
    source: safe.source,
    medium: safe.medium,
    campaign: safe.campaign,
  }
  fetch(remoteUrl, {
    method: options.method || 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {})
}

export function trackEvent(name, properties = {}, options = {}) {
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
]
