const CRM_KEY = 'sanya_tcm_crm_v1'

export const LEAD_STAGES = [
  'new',
  'qualified',
  'appointment_requested',
  'confirmed',
  'visited',
  'followup',
  'closed',
]

export const DEFAULT_LEAD = {
  id: '',
  createdAt: '',
  updatedAt: '',
  stage: 'new',
  source: 'direct',
  medium: '',
  campaign: '',
  language: 'ru',
  name: '',
  contact: '',
  preferredDate: '',
  service: '',
  appointmentDate: '',
  visitDate: '',
  followupDate: '',
  valueCny: '',
  owner: '',
  note: '',
}

function read() {
  try { return JSON.parse(localStorage.getItem(CRM_KEY) || '[]') } catch { return [] }
}
function write(items) {
  localStorage.setItem(CRM_KEY, JSON.stringify(items))
}
export function listLeads() { return read() }
export function saveLead(input) {
  const now = new Date().toISOString()
  const existing = input.id ? read().find(x => x.id === input.id) : null
  const { note, ...safeInput } = input
  const lead = { ...DEFAULT_LEAD, ...existing, ...safeInput, note: '', updatedAt: now, createdAt: existing?.createdAt || now }
  const items = read().filter(x => x.id !== lead.id)
  items.unshift(lead)
  write(items)
  return lead
}
export function updateLead(id, patch) {
  const lead = read().find(x => x.id === id)
  if (!lead) return null
  return saveLead({ ...lead, ...patch })
}
export function deleteLead(id) {
  write(read().filter(x => x.id !== id))
}
export function exportLeadsCsv() {
  const rows = read()
  const headers = ['id','createdAt','updatedAt','stage','source','medium','campaign','language','name','contact','preferredDate','service','appointmentDate','visitDate','followupDate','valueCny','owner','note']
  const safeCell = v => {
    const text = String(v ?? '')
    const protectedText = /^[=+\-@]/.test(text.trimStart()) ? "'" + text : text
    return '"' + protectedText.replace(/"/g, '""') + '"'
  }
  return [headers.join(','), ...rows.map(r => headers.map(h => safeCell(r[h])).join(','))].join('\n')
}
