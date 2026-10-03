import fs from 'node:fs'
import path from 'node:path'

const required = [
  'index.html',
  'ru/index.html',
  'zh/index.html',
  'en/index.html',
  'admin/index.html',
  'src/main.jsx',
  'src/styles.css',
  'src/crm.js',
  'src/analytics.js',
  'config/site.json',
  'public/robots.txt',
  'public/sitemap.xml',
  'public/ru/evidence/index.html',
  'public/ru/patient-guide/index.html',
  'public/ru/how-to-choose/index.html',
  'public/ru/doctors/index.html',
  'public/ru/privacy/index.html',
  'public/ru/terms/index.html',
]

const missing = required.filter(file => !fs.existsSync(path.resolve(file)))
if (missing.length) {
  console.error('Missing required files:', missing.join(', '))
  process.exit(1)
}

const config = JSON.parse(fs.readFileSync('config/site.json','utf8'))
if (!config.seo?.siteUrl?.startsWith('https://')) throw new Error('seo.siteUrl must be HTTPS')
if (!config.hospital?.website?.startsWith('https://')) throw new Error('hospital.website must be HTTPS')
if (!Array.isArray(config.funnel?.stages) || !config.funnel.stages.includes('appointment_requested')) throw new Error('funnel stages are incomplete')
if (config.contact?.telegramUrl === 'https://t.me/') throw new Error('Telegram placeholder must stay empty until configured')
if (config.contact?.telegramHandle === '@example') throw new Error('Telegram example handle is not allowed')

const sitemap = fs.readFileSync('public/sitemap.xml','utf8')
for (const segment of ['ru/evidence/','ru/patient-guide/','ru/how-to-choose/','ru/doctors/','ru/privacy/','ru/terms/']) {
  if (!sitemap.includes('/Acupuncture/' + segment)) throw new Error('Sitemap missing ' + segment)
}

const source = fs.readFileSync('src/main.jsx','utf8')
if (source.includes('enabled !== false')) throw new Error('Doctor display guard is unsafe; use enabled === true')
if (source.includes('https://t.me/\'') || source.includes('https://t.me/"')) throw new Error('Telegram placeholder is hard-coded in source')

console.log('Repository checks passed')
