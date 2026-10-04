import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const required = [
  'index.html',
  'ru/index.html',
  'zh/index.html',
  'en/index.html',
  'admin/index.html',
  'admin/main.jsx',
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
  'backend/server.js',
  'backend/schema.sql',
  'backend/hash-password.mjs',
  'backend/.env.example',
  'scripts/sync-runtime-config.mjs',
]

const missing = required.filter(file => !fs.existsSync(path.resolve(file)))
if (missing.length) {
  console.error('Missing required files:', missing.join(', '))
  process.exit(1)
}

const packageJson = JSON.parse(fs.readFileSync('package.json','utf8'))
if (packageJson.scripts?.['sync-config'] !== 'node scripts/sync-runtime-config.mjs') throw new Error('sync-config script is missing')
if (packageJson.scripts?.dev !== 'npm run sync-config && vite') throw new Error('dev must sync runtime config')
if (!String(packageJson.scripts?.build || '').includes('npm run sync-config')) throw new Error('build must sync runtime config')

const config = JSON.parse(fs.readFileSync('config/site.json','utf8'))
if (!config.seo?.siteUrl?.startsWith('https://')) throw new Error('seo.siteUrl must be HTTPS')
if (!config.hospital?.website?.startsWith('https://')) throw new Error('hospital.website must be HTTPS')
if (!Array.isArray(config.funnel?.stages) || !config.funnel.stages.includes('appointment_requested')) throw new Error('funnel stages are incomplete')
if (config.contact?.telegramUrl === 'https://t.me/') throw new Error('Telegram placeholder must stay empty until configured')
if (config.contact?.telegramHandle === '@example') throw new Error('Telegram example handle is not allowed')
if (typeof config.adminApi?.enabled !== 'boolean') throw new Error('adminApi.enabled must be boolean')
if (typeof config.adminApi?.baseUrl !== 'string') throw new Error('adminApi.baseUrl must be a string')
if (config.adminApi.enabled && !config.adminApi.baseUrl.startsWith('https://')) throw new Error('enabled adminApi.baseUrl must be HTTPS')
if (config.leadsApi?.enabled && !config.leadsApi.url.startsWith('https://')) throw new Error('enabled leadsApi.url must be HTTPS')
if (config.analyticsApi?.enabled && !config.analyticsApi.url.startsWith('https://')) throw new Error('enabled analyticsApi.url must be HTTPS')

const sitemap = fs.readFileSync('public/sitemap.xml','utf8')
for (const segment of ['ru/evidence/','ru/patient-guide/','ru/how-to-choose/','ru/doctors/','ru/privacy/','ru/terms/']) {
  if (!sitemap.includes('/Acupuncture/' + segment)) throw new Error('Sitemap missing ' + segment)
}

const source = fs.readFileSync('src/main.jsx','utf8')
if (source.includes('enabled !== false')) throw new Error('Doctor display guard is unsafe; use enabled === true')
if (source.includes("https://t.me/'") || source.includes('https://t.me/"')) throw new Error('Telegram placeholder is hard-coded in source')

const admin = fs.readFileSync('admin/main.jsx','utf8')
for (const textValue of ['/api/auth/login','/api/auth/logout','/api/dashboard']) {
  if (!admin.includes(textValue)) throw new Error('Admin is missing ' + textValue)
}
const backend = fs.readFileSync('backend/server.js','utf8')
for (const file of ['backend/server.js','backend/hash-password.mjs']) {
  const syntax = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' })
  if (syntax.status !== 0) throw new Error(`${file} syntax check failed: ${syntax.stderr || syntax.stdout}`)
}
for (const textValue of ['/api/auth/login','/api/auth/me','/api/auth/logout','/api/dashboard']) {
  if (!backend.includes(textValue)) throw new Error('Backend is missing ' + textValue)
}
if (!backend.includes('timingSafeEqual')) throw new Error('Password verification must use timingSafeEqual')
if (!backend.includes('admin_sessions')) throw new Error('Database-backed admin sessions are missing')
if (!backend.includes('allowPublicRequest')) throw new Error('Public endpoint rate limiting is missing')
if (!backend.includes('createLeadId')) throw new Error('Server-generated Lead IDs are missing')
if (!backend.includes('HttpOnly')) throw new Error('HttpOnly session cookie is missing')
if (!backend.includes('Access-Control-Allow-Credentials')) throw new Error('credentialed CORS support is missing')
if (admin.includes('sessionStorage') || admin.includes('localStorage')) throw new Error('Admin must not store authentication state in browser storage')
if (backend.includes("ADMIN_PASSWORD = process.env")) throw new Error('Do not support plaintext admin passwords')

console.log('Repository checks passed')
