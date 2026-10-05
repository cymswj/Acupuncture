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
if (typeof config.contact?.phone !== 'string' || config.contact.phone.trim() && !/^\+?[\d ()-]{7,40}$/.test(config.contact.phone.trim())) throw new Error('service phone format is invalid')
if (config.contact?.telegramUrl && !config.contact.telegramUrl.startsWith('https://')) throw new Error('Telegram URL must be HTTPS')
if (config.contact?.telegramQrPath !== '/Acupuncture/telegram-qr.svg') throw new Error('Telegram QR asset path is not configured')
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
if (source.includes("const recordEvent = (name, properties = {}) => recordEvent(")) throw new Error('recordEvent must delegate to trackEvent, not itself')
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
for (const textValue of ['/api/auth/login','/api/auth/me','/api/auth/logout','/api/dashboard','/api/settings','/api/public-settings']) {
  if (!backend.includes(textValue)) throw new Error('Backend is missing ' + textValue)
}
if (!backend.includes('timingSafeEqual')) throw new Error('Password verification must use timingSafeEqual')
if (!backend.includes('admin_sessions')) throw new Error('Database-backed admin sessions are missing')
if (!backend.includes('allowPublicRequest')) throw new Error('Public endpoint rate limiting is missing')
if (!backend.includes('createLeadId')) throw new Error('Server-generated Lead IDs are missing')
if (!backend.includes('HttpOnly')) throw new Error('HttpOnly session cookie is missing')
if (!backend.includes('Access-Control-Allow-Credentials')) throw new Error('credentialed CORS support is missing')
if (!backend.includes("'GET,POST,PUT,PATCH,OPTIONS'")) throw new Error('CORS must allow website settings PUT')
if (!backend.includes("allowPublicRequest('public-settings'")) throw new Error('Public settings endpoint must be rate limited')
if (!backend.includes("'lead_created'" ) || !backend.includes("'appointment_requested'" ) || !backend.includes("await client.query('BEGIN')")) throw new Error('Lead creation must record initial funnel events transactionally')
if (!source.includes('if (!remoteLead)')) throw new Error('Frontend must avoid duplicate remote lead funnel events')
if (!source.includes('activeDoctors')) throw new Error('Frontend must support multiple verified doctors')
const qrSvg = fs.readFileSync('public/telegram-qr.svg','utf8')
if (qrSvg.length < 2000 || !qrSvg.includes('<svg') || !qrSvg.includes('viewBox')) throw new Error('Telegram QR asset looks incomplete')

if (!backend.includes("url.pathname === '/api/audit'")) throw new Error('Audit endpoint is missing')
if (!backend.includes("url.pathname === '/api/public-settings'")) throw new Error('Public settings endpoint is missing')
if (!backend.includes("url.pathname === '/api/settings'")) throw new Error('Admin settings endpoint is missing')
if (!backend.includes('site_settings')) throw new Error('Persistent site settings table is missing')
if (!backend.includes('cleanPublicSettings')) throw new Error('Public settings validation is missing')
if (!admin.includes('医院公开资料')) throw new Error('Hospital settings UI is missing')
if (!source.includes('/api/public-settings')) throw new Error('Frontend public settings loader is missing')
if (!source.includes('siteFooter')) throw new Error('Responsive site footer is missing')
if (!source.includes('mergePublicConfig')) throw new Error('Frontend public config isolation is missing')
if (!admin.includes("api('/api/leads?' + params.toString())")) throw new Error('CRM server-side filtering path is missing')
if (!admin.includes('remoteTotal') || !admin.includes('PAGE_SIZE')) throw new Error('CRM pagination state is missing')
if (!admin.includes('maxExport')) throw new Error('CRM bounded export is missing')
if (!fs.existsSync('public/seo-runtime.js')) throw new Error('SEO runtime settings bridge is missing')
const seoPages = ['acupuncture','hospital','pricing','doctors','faq','prepare-for-visit','evidence','patient-guide','how-to-choose','privacy','terms'].map(name => fs.readFileSync(`public/ru/${name}/index.html`,'utf8'))
if (seoPages.some(page => !page.includes('class="seoFooter"'))) throw new Error('Russian SEO pages must share the unified footer')
if (seoPages.some(page => !page.includes('telegram-qr.svg'))) throw new Error('Russian SEO pages must expose Telegram QR')
const servicePhoneDigits = String(config.contact.phone || '').replace(/\D/g, '')
if (servicePhoneDigits && seoPages.some(page => !page.includes(servicePhoneDigits))) throw new Error('Russian SEO pages must expose configured service phone')
if (!backend.includes('parsePagination')) throw new Error('API pagination helper is missing')
if (!backend.includes('safeDecode')) throw new Error('Cookie parser must fail closed on malformed encoding')
if (backend.includes('^\\\\d{4}')) throw new Error('Backend date regex contains an accidental double backslash')
if (!admin.includes("api('/api/audit?limit=20')")) throw new Error('Admin must load audit records')
if (!admin.includes("api('/api/settings')")) throw new Error('Admin settings API is missing')
if (!admin.includes('网站设置')) throw new Error('Admin settings UI is missing')
const analytics = fs.readFileSync('src/analytics.js','utf8')
if (!analytics.includes('sendRemoteEvent')) throw new Error('Remote funnel analytics helper is missing')
if (!analytics.includes('delete safe[key]')) throw new Error('Analytics sensitive-field stripping is missing')
const doctorPage = fs.readFileSync('public/ru/doctors/index.html','utf8')
if (doctorPage.includes('刘建浩') || doctorPage.includes('徐琼') || doctorPage.includes('黄建福') || doctorPage.includes('王天磊') || doctorPage.includes('王波')) throw new Error('Doctor SEO page contains disabled/unverified named doctors')
if (admin.includes('sessionStorage') || admin.includes('localStorage')) throw new Error('Admin must not store authentication state in browser storage')
if (backend.includes("ADMIN_PASSWORD = process.env")) throw new Error('Do not support plaintext admin passwords')

console.log('Repository checks passed')
