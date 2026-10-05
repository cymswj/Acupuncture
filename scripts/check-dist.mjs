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
if (config.contact?.phone !== '+86 13876636537') throw new Error('Build config phone mismatch')
if (config.contact?.telegramUrl !== 'https://t.me/Acupuncture_Sanya') throw new Error('Build config Telegram URL mismatch')
if (config.contact?.telegramQrPath !== '/Acupuncture/telegram-qr.svg') throw new Error('Build config QR path mismatch')

const home = fs.readFileSync('dist/index.html', 'utf8')
if (!home.includes('/Acupuncture/telegram-qr.svg')) throw new Error('Home build missing Telegram QR')
if (!home.includes('+86 13876636537')) throw new Error('Home build missing service phone')

for (const name of ['acupuncture','hospital','pricing','doctors','faq','prepare-for-visit','evidence','patient-guide','how-to-choose','privacy','terms']) {
  const file = 'dist/ru/' + name + '/index.html'
  const page = fs.readFileSync(file, 'utf8')
  if (!page.includes('class="seoFooter"')) throw new Error('SEO footer missing: ' + name)
  if (!page.includes('+8613876636537')) throw new Error('SEO footer phone missing: ' + name)
  if (!page.includes('telegram-qr.svg')) throw new Error('SEO footer QR missing: ' + name)
  if (page.includes('https://cymswj.github.io/Acupuncture/ru/' + name + '/index.html')) {
    throw new Error('JSON-LD/canonical path still uses index.html: ' + name)
  }
}

console.log('dist smoke checks passed')
