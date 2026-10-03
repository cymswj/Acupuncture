import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const fallbackConfig = {
  brand: { name: 'SANYA TCM', legalLine: 'International Patient Service' },
  contact: {
    telegramUrl: '',
    telegramHandle: '',
    vkUrl: '',
    whatsappUrl: '',
    email: ''
  },
  hospital: {
    officialName: '三亚市中医院',
    ruName: 'Саньяский городской госпиталь традиционной китайской медицины',
    address: '海南省三亚市凤凰路106号',
    phone: '0898-88275345',
    website: 'https://www.syszhy.cn/',
    department: '针灸科'
  },
  doctors: [],
  seo: {
    defaultTitle: 'Иглоукалывание в Санье | Русскоязычное сопровождение',
    defaultDescription: 'Русскоязычный сервис записи и сопровождения при посещении больницы традиционной китайской медицины в Санье.',
    keywords: 'иглоукалывание в Санье, акупунктура в Санье, китайская медицина Санья, иглоукалывание для русских, лечение в Санье',
    siteUrl: 'https://cymswj.github.io/Acupuncture/'
  }
}

const copy = {
  ru: {
    nav: ['О сервисе', 'Больница', 'Врач', 'Как проходит визит', 'Стоимость', 'FAQ'],
    heroEyebrow: 'САНЬЯ · ХАЙНАНЬ · КИТАЙ',
    heroTitle: 'Иглоукалывание в Санье — понятно на русском',
    heroText: 'Информационное и организационное сопровождение русскоязычных пациентов, которые хотят пройти иглоукалывание и другие услуги традиционной китайской медицины в больнице Санья.',
    primary: 'Оставить запрос',
    secondary: 'Telegram',
    trust: ['Больничный формат', 'Русский язык', 'Запись заранее', 'Понятный бюджет'],
    introTitle: 'Главная задача — убрать неопределённость перед визитом',
    introText: 'Для туриста медицинская процедура — это не только сам приём. Важно понимать, куда ехать, как записаться, сколько времени заложить, как оплачиваются услуги и кто поможет с языком. Поэтому сервис строится вокруг всего пациентского маршрута.',
    cards: [
      ['01', 'Понятная запись', 'Вы оставляете запрос на русском языке. Мы уточняем желаемую дату, формат визита и организационные детали.'],
      ['02', 'Больница и официальный маршрут', 'Медицинская помощь оказывается в учреждении по его правилам. Информация о больнице и официальные контакты доступны отдельно.'],
      ['03', 'Русскоязычная коммуникация', 'Мы помогаем с организационными вопросами на русском языке. Медицинские решения принимает врач.'],
    ],
    hospitalTitle: 'Почему мы показываем именно больничный маршрут?',
    hospitalText: 'Три ключевых вещи для иностранного пациента — понятное место, понятный процесс и возможность проверить информацию из первоисточника. Поэтому мы не маскируем сервис под официальный сайт больницы: мы даём отдельный русскоязычный вход и ведём пациента к официальному медицинскому учреждению.',
    hospitalPoints: ['三亚市中医院 — официальное название учреждения', 'Адрес и телефон можно проверить на сайте больницы', 'Для записи используются официальные процедуры учреждения', 'Сервис помогает русскоязычному пациенту пройти организационную часть маршрута'],
    doctorTitle: 'Врач',
    doctorEmpty: 'Информация о конкретном враче появится после подтверждения специалиста, расписания и квалификационных данных. Мы не будем публиковать неподтверждённые сведения.',
    processTitle: 'Как проходит визит',
    process: [
      ['Запрос', 'Напишите желаемую дату, язык общения и кратко укажите, какая услуга вам нужна. Не отправляйте медицинские документы через форму.'],
      ['Подтверждение', 'Мы уточняем возможность записи, место приёма и организационные детали.'],
      ['Визит', 'Вы приходите в больницу в согласованное время и проходите медицинскую оценку по установленному порядку.'],
      ['Сопровождение', 'При необходимости помогаем с русско-китайской коммуникацией по организационным вопросам.'],
    ],
    priceTitle: 'Стоимость: сначала понятная структура, потом цифры',
    priceText: 'Медицинская часть оплачивается по применимым тарифам учреждения и зависит от назначения врача. Если есть отдельная организационная услуга, она должна быть обозначена отдельно. Сайт не должен смешивать медицинский платёж и сервисную комиссию.',
    priceNote: 'Не обещаем фиксированное количество процедур или результат лечения заранее. Итоговый план определяет медицинский специалист после оценки состояния.',
    faqTitle: 'Частые вопросы русскоязычных пациентов',
    faqs: [
      ['Нужно ли знать китайский?', 'Нет. Сервис ориентирован на русскоязычных пациентов и помогает с организационной коммуникацией.'],
      ['Можно ли записаться до приезда в Санью?', 'Да. Чем раньше известна желаемая дата, тем проще проверить организационные детали.'],
      ['Где находится больница?', 'Адрес и официальные контакты указаны в разделе «Больница». Перед визитом лучше сверить данные с официальным сайтом учреждения.'],
      ['Сколько будет стоить иглоукалывание?', 'Стоимость зависит от применимых тарифов и конкретного медицинского приёма. Поэтому мы показываем принцип расчёта, а не придумываем фиксированную сумму.'],
      ['Можно ли прийти только один раз?', 'Можно обратиться на один визит. Нужны ли повторные процедуры, решается после медицинской оценки.'],
      ['Можно ли отправить МРТ или медицинские документы?', 'На первом этапе лучше не передавать чувствительные медицинские документы через обычный сайт или Telegram. При необходимости способ передачи уточняется отдельно.'],
    ],
    ctaTitle: 'Хотите записаться или сначала задать вопрос?',
    ctaText: 'Оставьте удобный способ связи и желаемую дату. После подключения Telegram или другого канала данные будут передаваться только по выбранному вами контакту.',
    formTitle: 'Запрос на визит',
    formName: 'Имя',
    formContact: 'Telegram / телефон',
    formDate: 'Желаемая дата',
    formService: 'Что вас интересует?',
    formServiceOptions: ['Иглоукалывание / акупунктура', 'Консультация по маршруту', 'Другая услуга традиционной китайской медицины'],
    formNote: 'Краткая организационная заметка',
    formConsent: 'Я понимаю, что форма предназначена для организационного запроса, а не для постановки диагноза.',
    formSubmit: 'Создать сообщение',
    formNoTelegram: 'Telegram пока не настроен. Контактный канал можно заполнить в конфигурации сайта.',
    formSuccess: 'Сообщение подготовлено. Проверьте текст перед отправкой.',
    official: 'Официальный сайт больницы',
    contact: 'Контакты',
    footer: 'Информационный и организационный сервис для русскоязычных пациентов. Не является официальным сайтом больницы.',
  },
  zh: {
    nav: ['项目', '医院', '医生', '就诊流程', '费用', 'FAQ'],
    heroEyebrow: '三亚 · 海南 · 中国',
    heroTitle: '三亚针灸就诊服务',
    heroText: '面向俄语患者，提供针灸及中医相关就诊的信息与组织协助。医疗服务按照医院实际流程进行。',
    primary: '提交咨询',
    secondary: 'Telegram',
    trust: ['医院就诊', '俄语协助', '提前预约', '费用结构清楚'],
    introTitle: '先解决“不知道怎么就医”的问题',
    introText: '外国患者关注的不只是治疗项目，还包括地点、预约、语言、时间和费用结构。我们把这些信息提前讲清楚，再进入预约和就诊。',
    cards: [['01','预约清晰','提交俄语需求、日期和联系方式，我们确认组织事项。'],['02','医院路线','医疗服务按照医院实际规则进行，医院信息与官方联系方式单独展示。'],['03','语言协助','协助俄语患者处理基本组织沟通，医疗决定由医生完成。']],
    hospitalTitle: '为什么强调医院就诊路线？',
    hospitalText: '我们不是医院官方网站，也不会把独立服务包装成医院本身。我们提供一个俄语入口，帮助患者理解并进入正式医疗服务流程。',
    hospitalPoints: ['三亚市中医院为医院官方名称','地址与电话可通过医院官网核实','预约按照医院正式流程执行','服务主要解决俄语患者的组织沟通问题'],
    doctorTitle: '医生',
    doctorEmpty: '具体医生信息将在确认出诊安排和资质资料后显示。未核实的信息不会发布。',
    processTitle: '就诊流程',
    process: [['提交需求','填写日期、语言和服务需求，不建议在表单里上传病历文件。'],['确认','确认时间、地点与组织事项。'],['就诊','按照医院流程完成实际医疗就诊。'],['协助','需要时提供俄中基础组织沟通协助。']],
    priceTitle: '费用说明',
    priceText: '医疗费用按照医院适用收费标准及医生实际评估执行。若有独立组织服务费用，应单独说明。',
    priceNote: '不提前承诺固定疗程或治疗结果。',
    faqTitle: '常见问题',
    faqs: [['需要会中文吗？','不需要，服务面向俄语患者提供基本语言与流程协助。'],['可以提前预约吗？','可以，建议提前提交日期和联系方式。'],['费用是多少？','费用根据医院适用标准与具体医疗服务确定。'],['可以只做一次吗？','可以，后续是否需要再次就诊由医生评估。'],['可以发送病历吗？','第一阶段不建议通过公开表单或普通聊天工具发送敏感医疗资料。']],
    ctaTitle: '想预约或先咨询？',
    ctaText: '留下联系方式和希望的日期。Telegram 等联系渠道可在后台配置。',
    formTitle: '预约咨询',
    formName: '姓名',
    formContact: 'Telegram / 电话',
    formDate: '希望日期',
    formService: '服务',
    formServiceOptions: ['针灸 / 传统针刺', '就诊路线咨询', '其他中医服务'],
    formNote: '组织方面的简短说明',
    formConsent: '我理解此表单用于预约与组织沟通，不用于诊断。',
    formSubmit: '生成联系消息',
    formNoTelegram: 'Telegram 尚未配置，可在网站配置中填写。',
    formSuccess: '消息已经生成，请在发送前检查。',
    official: '医院官方网站',
    contact: '联系方式',
    footer: '面向俄语患者的信息与组织服务，并非医院官方网站。'
  },
  en: {
    nav: ['About', 'Hospital', 'Doctor', 'Visit', 'Pricing', 'FAQ'],
    heroEyebrow: 'SANYA · HAINAN · CHINA',
    heroTitle: 'Acupuncture in Sanya',
    heroText: 'A Russian-language information and coordination service for patients who want acupuncture or traditional Chinese medicine care in Sanya.',
    primary: 'Request a visit',
    secondary: 'Telegram',
    trust: ['Hospital setting', 'Russian support', 'Advance request', 'Clear cost structure'],
    introTitle: 'The first problem is often uncertainty, not the treatment itself',
    introText: 'International patients need to understand location, booking, language, timing and costs before a medical visit. This service is designed around that entire patient journey.',
    cards: [['01','Clear request','Send your preferred date, language and service request.'],['02','Hospital route','Medical care follows the institution’s own procedures and information is linked to the official hospital source.'],['03','Language support','We help with administrative communication. Clinical decisions remain with the medical team.']],
    hospitalTitle: 'Why keep the hospital route explicit?',
    hospitalText: 'This is not the hospital’s official website. It is an independent Russian-language entry point that helps patients understand and navigate the official medical route.',
    hospitalPoints: ['Official hospital name is shown separately','Address and contact details can be checked against the hospital website','Booking follows the institution’s process','The service focuses on administrative and language support'],
    doctorTitle: 'Doctor',
    doctorEmpty: 'Doctor information will appear after the specialist, schedule and credential data have been verified.',
    processTitle: 'How the visit works',
    process: [['Request','Send your preferred date and service. Do not upload medical records through the public form.'],['Confirm','We confirm practical details and availability.'],['Visit','Attend the hospital through its normal patient process.'],['Support','Russian-Chinese administrative communication support when needed.']],
    priceTitle: 'Pricing: structure first, numbers second',
    priceText: 'Medical fees follow the applicable institutional tariffs and the actual medical assessment. Any separate coordination fee should be shown separately.',
    priceNote: 'No fixed number of sessions or treatment outcome is promised in advance.',
    faqTitle: 'FAQ',
    faqs: [['Do I need Chinese?','No. The service is designed for Russian-speaking patients and basic administrative communication.'],['Can I request a visit before arriving in Sanya?','Yes. Advance notice makes it easier to confirm practical details.'],['Where is the hospital?','The official address and contacts are shown in the hospital section.'],['How much does acupuncture cost?','The applicable fee depends on the institutional pricing and the actual medical visit.'],['Can I come once?','Yes. Any follow-up is determined after medical assessment.'],['Can I send MRI or medical records?','For the first version, do not send sensitive medical records through a public form or ordinary chat.']],
    ctaTitle: 'Want to request a visit or ask a question?',
    ctaText: 'Leave your preferred contact method and date. The actual contact channel can be configured from the site content layer.',
    formTitle: 'Visit request',
    formName: 'Name',
    formContact: 'Telegram / phone',
    formDate: 'Preferred date',
    formService: 'Service',
    formServiceOptions: ['Acupuncture', 'Patient-route consultation', 'Other TCM service'],
    formNote: 'Short administrative note',
    formConsent: 'I understand this form is for coordination, not diagnosis.',
    formSubmit: 'Prepare message',
    formNoTelegram: 'Telegram is not configured yet. Add it in the site configuration.',
    formSuccess: 'Message prepared. Review it before sending.',
    official: 'Official hospital website',
    contact: 'Contact',
    footer: 'Information and coordination service for Russian-speaking patients. Not the hospital’s official website.'
  }
}

function getLang() {
  const path = window.location.pathname.toLowerCase()
  if (path.includes('/zh/')) return 'zh'
  if (path.includes('/en/')) return 'en'
  return 'ru'
}

function setMeta({ title, description, keywords, canonical, lang, schema }) {
  document.documentElement.lang = lang === 'zh' ? 'zh-CN' : lang
  document.title = title

  const set = (name, content) => {
    if (!content) return
    let el = document.querySelector(`meta[name="${name}"]`)
    if (!el) {
      el = document.createElement('meta')
      el.setAttribute('name', name)
      document.head.appendChild(el)
    }
    el.setAttribute('content', content)
  }
  set('description', description)
  set('keywords', keywords)

  let canonicalEl = document.querySelector('link[rel="canonical"]')
  if (!canonicalEl) {
    canonicalEl = document.createElement('link')
    canonicalEl.rel = 'canonical'
    document.head.appendChild(canonicalEl)
  }
  canonicalEl.href = canonical

  let ld = document.getElementById('site-schema')
  if (!ld) {
    ld = document.createElement('script')
    ld.id = 'site-schema'
    ld.type = 'application/ld+json'
    document.head.appendChild(ld)
  }
  ld.textContent = JSON.stringify(schema)
}

function App() {
  const lang = getLang()
  const t = copy[lang]
  const [config, setConfig] = useState(fallbackConfig)
  const [form, setForm] = useState({ name: '', contact: '', date: '', service: t.formServiceOptions[0], note: '' })
  const [formMessage, setFormMessage] = useState('')\n  const attribution = useMemo(() => {\n    const p = new URLSearchParams(window.location.search)\n    return {\n      utmSource: p.get('utm_source') || p.get('source') || '',\n      utmMedium: p.get('utm_medium') || '',\n      utmCampaign: p.get('utm_campaign') || '',\n      ref: p.get('ref') || ''\n    }\n  }, [])

  useEffect(() => {
    fetch('/Acupuncture/config/site.json', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('config unavailable')))
      .then(data => {
        setConfig(prev => ({ ...prev, ...data, contact: { ...prev.contact, ...(data.contact || {}) }, hospital: { ...prev.hospital, ...(data.hospital || {}) }, seo: { ...prev.seo, ...(data.seo || {}) } }))
        if (data.contentApi?.enabled && data.contentApi.url) {
          return fetch(data.contentApi.url, { cache: 'no-store' }).then(r => r.ok ? r.json() : Promise.reject(new Error('api unavailable')))
            .then(remote => setConfig(prev => ({ ...prev, ...remote, contact: { ...prev.contact, ...(remote.contact || {}) }, hospital: { ...prev.hospital, ...(remote.hospital || {}) }, seo: { ...prev.seo, ...(remote.seo || {}) } })))
        }
      })
      .catch(() => {})
  }, [])

  const meta = useMemo(() => {
    const slug = lang === 'ru' ? '' : lang + '/'
    const title = config.seo?.[lang]?.title || (lang === 'ru' ? config.seo.defaultTitle : `${config.brand.name} | ${t.heroTitle}`)
    const description = config.seo?.[lang]?.description || config.seo.defaultDescription
    const keywords = config.seo?.[lang]?.keywords || config.seo.keywords
    const canonical = `${config.seo.siteUrl}${slug}`
    const schema = {
      '@context': 'https://schema.org',
      '@graph': [
        { '@type': 'WebSite', name: config.brand.name, url: canonical, inLanguage: lang, description },
        { '@type': 'Organization', name: config.brand.name, url: config.seo.siteUrl },
        { '@type': 'Service', name: t.heroTitle, serviceType: 'International patient coordination', areaServed: 'Sanya, Hainan, China', availableLanguage: ['Russian', 'Chinese', 'English'], provider: { '@type': 'Organization', name: config.brand.name } },
        { '@type': 'FAQPage', mainEntity: t.faqs.map(([q,a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) }
      ]
    }
    return { title, description, keywords, canonical, schema }
  }, [config, lang, t.heroTitle])

  useEffect(() => setMeta({ ...meta, lang }), [meta, lang])

  useEffect(() => {
    setForm(v => ({ ...v, service: t.formServiceOptions[0] }))
  }, [lang, t.formServiceOptions])

  const hospital = config.hospital
  const activeDoctor = config.doctors?.find(d => d.enabled !== false)
  const telegramUrl = config.contact?.telegramUrl || ''
  const telegramHandle = config.contact?.telegramHandle || ''
  const scroll = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const seoLinks = [
    ['/Acupuncture/ru/acupuncture/', 'Иглоукалывание в Санье: как начать'],
    ['/Acupuncture/ru/hospital/', 'Больница традиционной китайской медицины в Санье'],
    ['/Acupuncture/ru/pricing/', 'Сколько стоит иглоукалывание в Санье'],
    ['/Acupuncture/ru/doctors/', 'Врачи отделения иглоукалывания'],
    ['/Acupuncture/ru/faq/', 'FAQ для русскоязычных пациентов'],
    ['/Acupuncture/ru/prepare-for-visit/', 'Как подготовиться к визиту']
  ]

  function switchLang(next) {
    const base = '/Acupuncture/'
    window.location.href = next === 'ru' ? base : `${base}${next}/`
  }

  function submitForm(e) {
    e.preventDefault()
    setFormMessage('')
    const text = [
      'Запрос на визит / Visit request',
      `Имя: ${form.name || '—'}`,
      `Контакт: ${form.contact || '—'}`,
      `Желаемая дата: ${form.date || '—'}`,
      `Услуга: ${form.service || '—'}`,
      `Организационная заметка: ${form.note || '—'}`,
      '',
      `Источник: ${attribution.utmSource || attribution.ref || 'direct'}`,
      attribution.utmMedium ? `Source medium: ${attribution.utmMedium}` : '',
      attribution.utmCampaign ? `Campaign: ${attribution.utmCampaign}` : '',
      '',
      'Не отправлены медицинские документы или диагнозы.'
    ].filter(Boolean).join('\n')
    setPreparedMessage(text)

    if (config.leadsApi?.enabled && config.leadsApi.url) {
      fetch(config.leadsApi.url, {
        method: config.leadsApi.method || 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, attribution })
      }).then(() => setFormMessage(t.formSuccess)).catch(() => setFormMessage(t.formSuccess))
    } else {
      setFormMessage(t.formSuccess)
    }

    if (telegramUrl) window.open(telegramUrl, '_blank', 'noopener,noreferrer')
  }

  return <div className="site">
    <header className="header"><div className="container nav">
      <a className="brand" href="/Acupuncture/">{config.brand.name}<span>TCM</span></a>
      <nav>{t.nav.map((x,i)=><button key={x} onClick={()=>scroll(['about','hospital','doctor','process','pricing','faq'][i])}>{x}</button>)}</nav>
      <div className="langs">{['ru','zh','en'].map(x=><button className={lang===x?'active':''} key={x} onClick={()=>switchLang(x)}>{x.toUpperCase()}</button>)}</div>
    </div></header>

    <main id="top">
      <section className="hero"><div className="container heroGrid">
        <div><div className="eyebrow">{t.heroEyebrow}</div><h1>{t.heroTitle}</h1><p className="heroText">{t.heroText}</p>
          <div className="actions"><button className="btn primary" onClick={()=>scroll('request')}>{t.primary}</button>{telegramUrl ? <a className="btn ghost" href={telegramUrl} target="_blank" rel="noreferrer">{t.secondary}</a> : <button className="btn ghost" onClick={()=>scroll('request')}>{t.secondary}</button>}</div>
          <div className="trust">{t.trust.map(x=><span key={x}>✓ {x}</span>)}</div>
        </div>
        <div className="heroCard"><div className="circle">针</div><strong>{hospital.officialName}</strong><p>{hospital.ruName}</p><small>{hospital.address}</small></div>
      </div></section>

      <section className="section" id="about"><div className="container"><div className="sectionHead"><span>01</span><h2>{t.introTitle}</h2><p>{t.introText}</p></div><div className="cards">{t.cards.map(c=><article key={c[0]}><span>{c[0]}</span><h3>{c[1]}</h3><p>{c[2]}</p></article>)}</div></div></section>

      <section className="section soft" id="hospital"><div className="container split">
        <div><div className="kicker">02 · HOSPITAL</div><h2>{t.hospitalTitle}</h2><p>{t.hospitalText}</p><div className="hospitalMeta"><strong>{hospital.officialName}</strong><span>{hospital.address}</span><span>{hospital.phone}</span><a href={hospital.website} target="_blank" rel="noreferrer">{t.official} ↗</a></div></div>
        <ul>{t.hospitalPoints.map(x=><li key={x}>✓ <span>{x}</span></li>)}</ul>
      </div></section>

      <section className="section" id="doctor"><div className="container doctorSection"><div><div className="kicker">03 · DOCTOR</div><h2>{t.doctorTitle}</h2></div>{activeDoctor ? <article className="doctorCard"><div className="doctorAvatar">{activeDoctor.name?.slice(0,1) || '医'}</div><div><h3>{activeDoctor.name}</h3><p className="doctorRole">{activeDoctor.title || ''}</p><p>{activeDoctor.specialty || ''}</p>{activeDoctor.languages?.length ? <div className="doctorTags">{activeDoctor.languages.map(x=><span key={x}>{x}</span>)}</div> : null}<small>{activeDoctor.credentials || ''}</small></div></article> : <div className="emptyCard">{t.doctorEmpty}</div>}</div></section>

      <section className="section" id="process"><div className="container"><div className="kicker">04 · PROCESS</div><h2>{t.processTitle}</h2><div className="steps">{t.process.map((p,i)=><article key={p[0]}><div className="stepNo">0{i+1}</div><h3>{p[0]}</h3><p>{p[1]}</p></article>)}</div></div></section>

      <section className="section soft" id="pricing"><div className="container price"><div><div className="kicker">05 · PRICING</div><h2>{t.priceTitle}</h2><p>{t.priceText}</p></div><div className="notice">{t.priceNote}</div></div></section>

      <section className="section" id="faq"><div className="container faq"><div><div className="kicker">06 · FAQ</div><h2>{t.faqTitle}</h2></div><div>{t.faqs.map(f=><details key={f[0]}><summary>{f[0]}<span>＋</span></summary><p>{f[1]}</p></details>)}</div></div></section>

      {lang === 'ru' ? <section className="section soft" id="resources"><div className="container"><div className="kicker">07 · РУССКИЕ РЕСУРСЫ</div><div className="resourceGrid">{seoLinks.map(([href,label])=><a className="resourceCard" key={href} href={href}><span>{label}</span><strong>→</strong></a>)}</div></div></section> : null}

      <section className="cta" id="request"><div className="container ctaInner"><div><div className="kicker">CONTACT</div><h2>{t.ctaTitle}</h2><p>{t.ctaText}</p></div><div className="ctaContact">{telegramUrl ? <a className="btn primary" href={telegramUrl} target="_blank" rel="noreferrer">{telegramHandle ? `Telegram ${telegramHandle}` : 'Telegram'} →</a> : <span className="configBadge">{t.formNoTelegram}</span>}</div></div>
        <div className="container requestBox"><form onSubmit={submitForm}><h3>{t.formTitle}</h3><div className="formGrid"><label><span>{t.formName}</span><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} autoComplete="name" /></label><label><span>{t.formContact}</span><input value={form.contact} onChange={e=>setForm({...form,contact:e.target.value})} autoComplete="tel" /></label><label><span>{t.formDate}</span><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} /></label><label><span>{t.formService}</span><select value={form.service} onChange={e=>setForm({...form,service:e.target.value})}>{t.formServiceOptions.map(x=><option key={x}>{x}</option>)}</select></label></div><label><span>{t.formNote}</span><textarea rows="3" value={form.note} onChange={e=>setForm({...form,note:e.target.value})} placeholder="Не указывайте диагнозы и не прикрепляйте медицинские документы." /></label><label className="check"><input type="checkbox" required /> <span>{t.formConsent}</span></label><button className="btn primary" type="submit">{t.formSubmit}</button>{formMessage ? <p className="formMessage">{formMessage}</p> : null}{preparedMessage ? <div className="preparedMessage"><pre>{preparedMessage}</pre><button type="button" className="btn ghost" onClick={()=>navigator.clipboard?.writeText(preparedMessage)}>{lang==='ru'?'Копировать сообщение':lang==='zh'?'复制消息':'Copy message'}</button></div> : null}</form></div>
      </section>
    </main>

    <footer><div className="container footer"><div className="brand">{config.brand.name}<span>TCM</span></div><div><p>{t.footer}</p><div className="footerLinks"><a href={hospital.website} target="_blank" rel="noreferrer">{hospital.officialName}</a>{config.contact?.vkUrl ? <a href={config.contact.vkUrl} target="_blank" rel="noreferrer">VK</a> : null}{config.contact?.whatsappUrl ? <a href={config.contact.whatsappUrl} target="_blank" rel="noreferrer">WhatsApp</a> : null}{config.contact?.email ? <a href={`mailto:${config.contact.email}`}>{config.contact.email}</a> : null}</div></div><small>© 2026 {config.brand.name} · <a href={config.legal?.privacyPolicyUrl || '#'}>Privacy</a> · <a href={config.legal?.termsUrl || '#'}>Terms</a></small></div></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
