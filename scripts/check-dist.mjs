import fs from 'node:fs'

const required = [
  'dist/config/site.json',
  'dist/telegram-qr.svg',
  'dist/index.html',
  'dist/admin/index.html',
  'dist/ru/acupuncture/index.html',
  'dist/ru/hospital/index.html',
  'dist/ru/privacy/index.html',
  'dist/ru/terms/index.html',
  'dist/robots.txt',
  'dist/sitemap.xml',
]

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error('Missing build artifact: ' + file)
}

const config = JSON.parse(fs.readFileSync('dist/config/site.json', 'utf8'))
const servicePhoneDigits = String(config.contact.phone || '').replace(/\D/g, '')
if (typeof config.contact?.phone !== 'string' || config.contact.phone.trim() && !/^\+?[\d ()-]{7,40}$/.test(config.contact.phone.trim())) throw new Error('Build config phone format mismatch')
if (config.contact?.telegramUrl && !config.contact.telegramUrl.startsWith('https://')) throw new Error('Build config Telegram URL must be HTTPS')
if (config.contact?.telegramQrPath !== '/Acupuncture/telegram-qr.svg') throw new Error('Build config QR path mismatch')

const home = fs.readFileSync('dist/index.html', 'utf8')
if (!home.includes('/assets/')) throw new Error('Home build missing compiled asset reference')
const assetDir = 'dist/assets'
const bundles = fs.readdirSync(assetDir).filter(name => /\\.(?:js|mjs)$/.test(name)).map(name => fs.readFileSync(assetDir + '/' + name, 'utf8')).join('\n')
if (!bundles.includes('contact_opened') || !bundles.includes('Telegram')) throw new Error('Compiled frontend contact bundle is missing')
if (!bundles.includes('contact_opened')) throw new Error('Compiled frontend contact tracking is missing')

for (const name of ['acupuncture','hospital','pricing','doctors','faq','prepare-for-visit','evidence','patient-guide','how-to-choose','privacy','terms']) {
  const file = 'dist/ru/' + name + '/index.html'
  const page = fs.readFileSync(file, 'utf8')
  if (!page.includes('class="seoFooter"')) throw new Error('SEO footer missing: ' + name)
  if (servicePhoneDigits && !page.includes(servicePhoneDigits)) throw new Error('SEO footer phone missing: ' + name)
  if (!page.includes('telegram-qr.svg')) throw new Error('SEO footer QR missing: ' + name)
  if (page.includes('https://cymswj.github.io/Acupuncture/ru/' + name + '/index.html')) {
    throw new Error('JSON-LD/canonical path still uses index.html: ' + name)
  }
}

console.log('dist smoke checks passed')
