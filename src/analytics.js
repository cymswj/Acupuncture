const STORAGE_KEY = 'sanya_tcm_events_v1'

function getStoredEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
  } catch {
    return []
  }
}

export function trackEvent(name, properties = {}) {
  const safe = {
    name,
    timestamp: new Date().toISOString(),
    path: window.location.pathname,
    language: document.documentElement.lang || 'ru',
    ...properties,
  }
  delete safe.note
  delete safe.message
  delete safe.diagnosis
  delete safe.medicalRecords
  delete safe.patientName
  delete safe.phone
  delete safe.telegram
  try {
    const events = getStoredEvents()
    events.push(safe)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(-500)))
  } catch {}
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
