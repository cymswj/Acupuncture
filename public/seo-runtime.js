(() => {
  const script = document.currentScript
  const base = script?.src ? script.src.replace(/\/seo-runtime\.js(?:\?.*)?$/, '/') : '/Acupuncture/'
  const merge = (baseConfig, next) => ({
    ...baseConfig,
    brand: { ...baseConfig.brand, ...(next.brand || {}) },
    contact: { ...baseConfig.contact, ...(next.contact || {}) },
    hospital: { ...baseConfig.hospital, ...(next.hospital || {}) },
  })

  async function load() {
    try {
      const configResponse = await fetch(base + 'config/site.json', { cache: 'no-store' })
      if (!configResponse.ok) return
      let config = await configResponse.json()

      if (config.adminApi?.enabled && config.adminApi.baseUrl) {
        try {
          const response = await fetch(config.adminApi.baseUrl.replace(/\/$/, '') + '/api/public-settings', { cache: 'no-store' })
          if (response.ok) {
            const data = await response.json()
            config = merge(config, data.settings || {})
          }
        } catch {}
      }

      const contact = config.contact || {}
      const hospital = config.hospital || {}
      const phone = String(contact.phone || '').trim()
      const phoneUrl = contact.phoneUrl || (phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : '')
      const telegramUrl = String(contact.telegramUrl || '').trim()
      const telegramHandle = String(contact.telegramHandle || 'Telegram').trim()
      const qrPath = contact.telegramQrPath || base + 'telegram-qr.svg'

      document.querySelectorAll('[data-service-phone]').forEach(node => {
        if (!phone) return
        node.textContent = phone
        if (node.tagName === 'A') node.href = phoneUrl
      })
      document.querySelectorAll('[data-service-telegram]').forEach(node => {
        if (!telegramUrl) {
          node.hidden = true
          return
        }
        node.hidden = false
        node.textContent = telegramHandle + ' ↗'
        if (node.tagName === 'A') {
          node.href = telegramUrl
          node.target = '_blank'
          node.rel = 'noreferrer'
        }
      })
      document.querySelectorAll('[data-service-qr]').forEach(node => {
        if (!telegramUrl || !qrPath) {
          node.hidden = true
          return
        }
        node.hidden = false
        if (node.tagName === 'IMG') node.src = qrPath
      })
      document.querySelectorAll('[data-service-qr-link]').forEach(node => {
        if (!telegramUrl) {
          node.hidden = true
          return
        }
        node.hidden = false
        if (node.tagName === 'A') {
          node.href = telegramUrl
          node.target = '_blank'
          node.rel = 'noreferrer'
        }
      })
      document.querySelectorAll('[data-hospital-name]').forEach(node => {
        if (hospital.officialName) node.textContent = hospital.officialName + ' ↗'
        if (node.tagName === 'A' && hospital.website) {
          node.href = hospital.website
          node.target = '_blank'
          node.rel = 'noreferrer'
        }
      })
      document.querySelectorAll('[data-hospital-address]').forEach(node => {
        if (hospital.address) node.textContent = hospital.address
      })
      document.querySelectorAll('[data-hospital-phone]').forEach(node => {
        if (hospital.phone) node.textContent = hospital.phone
      })
    } catch {}
  }

  load()
})()
