(() => {
  const script = document.currentScript
  const base = script?.src ? script.src.replace(/\/seo-runtime\.js(?:\?.*)?$/, '/') : '/Acupuncture/'
  const merge = (baseConfig, next) => ({
    ...baseConfig,
    brand: { ...baseConfig.brand, ...(next.brand || {}) },
    contact: { ...baseConfig.contact, ...(next.contact || {}) },
    hospital: { ...baseConfig.hospital, ...(next.hospital || {}) },
    legal: { ...baseConfig.legal, ...(next.legal || {}) },
    seo: {
      ...baseConfig.seo,
      ...(next.seo || {}),
      ru: { ...baseConfig.seo?.ru, ...(next.seo?.ru || {}) },
      zh: { ...baseConfig.seo?.zh, ...(next.seo?.zh || {}) },
      en: { ...baseConfig.seo?.en, ...(next.seo?.en || {}) },
    },
  })

  function setMeta(name, content) {
    if (!content) return
    let node = document.querySelector('meta[name="' + name + '"]')
    if (!node) {
      node = document.createElement('meta')
      node.setAttribute('name', name)
      document.head.appendChild(node)
    }
    node.setAttribute('content', content)
  }
  function setProperty(property, content) {
    if (!content) return
    let node = document.querySelector('meta[property="' + property + '"]')
    if (!node) {
      node = document.createElement('meta')
      node.setAttribute('property', property)
      document.head.appendChild(node)
    }
    node.setAttribute('content', content)
  }

  function sendRemoteEvent(name, config, properties = {}) {
    const baseApi = config.adminApi?.enabled && config.adminApi.baseUrl ? config.adminApi.baseUrl.replace(/\/$/, '') : ''
    const analyticsUrl = config.analyticsApi?.enabled && config.analyticsApi.url
      ? config.analyticsApi.url
      : (baseApi ? baseApi + '/api/events' : '')
    if (!analyticsUrl) return
    const payload = {
      eventName: name,
      path: window.location.pathname,
      language: document.documentElement.lang || 'ru',
      source: new URLSearchParams(window.location.search).get('utm_source') || 'seo',
      medium: new URLSearchParams(window.location.search).get('utm_medium') || 'organic',
      campaign: new URLSearchParams(window.location.search).get('utm_campaign') || '',
      ...properties,
    }
    fetch(analyticsUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {})
  }

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

      const lang = String(document.documentElement.lang || 'ru').toLowerCase().startsWith('zh') ? 'zh' : String(document.documentElement.lang || 'ru').toLowerCase().startsWith('en') ? 'en' : 'ru'
      const seo = config.seo || {}
      const localizedSeo = seo[lang] || {}
      const title = localizedSeo.title || seo.defaultTitle || document.title
      const description = localizedSeo.description || seo.defaultDescription || ''
      const keywords = localizedSeo.keywords || seo.keywords || ''
      if (title) document.title = title
      setMeta('description', description)
      setMeta('keywords', keywords)
      setProperty('og:title', title)
      setProperty('og:description', description)

      const contact = config.contact || {}
      const hospital = config.hospital || {}
      const legal = config.legal || {}
      const phone = String(contact.phone || '').trim()
      const phoneUrl = contact.phoneUrl || (phone ? 'tel:' + phone.replace(/[^\d+]/g, '') : '')
      const telegramUrl = String(contact.telegramUrl || '').trim()
      const telegramHandle = String(contact.telegramHandle || 'Telegram').trim()
      const qrPath = contact.telegramQrPath || base + 'telegram-qr.svg'

      sendRemoteEvent('page_view', config)
      document.querySelectorAll('[data-service-phone]').forEach(node => {
        if (!phone) return
        node.textContent = phone
        if (node.tagName === 'A') {
          node.href = phoneUrl
          node.addEventListener('click', () => sendRemoteEvent('contact_opened', config, { channel: 'phone', placement: 'seo_footer' }), { once: true })
        }
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
          node.addEventListener('click', () => sendRemoteEvent('contact_opened', config, { channel: 'telegram', placement: 'seo_footer' }), { once: true })
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
          node.addEventListener('click', () => sendRemoteEvent('contact_opened', config, { channel: 'telegram_qr', placement: 'seo_footer' }), { once: true })
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
      document.querySelectorAll('[data-service-owner]').forEach(node => {
        if (legal.serviceOwner) node.textContent = legal.serviceOwner
      })
      document.querySelectorAll('[data-service-email]').forEach(node => {
        if (legal.contactEmail) {
          node.textContent = legal.contactEmail
          if (node.tagName === 'A') node.href = 'mailto:' + legal.contactEmail
        }
      })
    } catch {}
  }

  load()
})()
