import fs from 'node:fs'
import path from 'node:path'

const source = path.resolve('config/site.json')
const targetDir = path.resolve('public/config')
const target = path.join(targetDir, 'site.json')

fs.mkdirSync(targetDir, { recursive: true })
const parsed = JSON.parse(fs.readFileSync(source, 'utf8'))
fs.writeFileSync(target, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
console.log('Runtime config synced to public/config/site.json')
