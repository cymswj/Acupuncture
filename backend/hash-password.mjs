import crypto from 'node:crypto'

const chunks = []
process.stdin.on('data', chunk => chunks.push(chunk))
process.stdin.on('end', () => {
  const password = Buffer.concat(chunks).toString('utf8').replace(/\r?\n$/, '')
  if (!password || password.length < 12) {
    console.error('Password must be at least 12 characters.')
    process.exit(1)
  }

  const N = 16384
  const r = 8
  const p = 1
  const salt = crypto.randomBytes(16)
  const derived = crypto.scryptSync(password, salt, 64, {
    N, r, p,
    maxmem: 64 * 1024 * 1024,
  })

  process.stdout.write([
    'scrypt',
    N,
    r,
    p,
    salt.toString('base64'),
    derived.toString('base64'),
  ].join('$') + '\n')
})
