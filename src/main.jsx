import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const copy = {
  ru: {
    nav: ['О проекте', 'Больница', 'Как проходит приём', 'Стоимость', 'FAQ'],
    heroEyebrow: 'Санья · Хайнань · Китай',
    heroTitle: 'Иглоукалывание в Санье',
    heroText: 'Приём в больнице традиционной китайской медицины с русскоязычным сопровождением.',
    primary: 'Записаться на приём',
    secondary: 'Написать в Telegram',
    trust: ['Больничный формат', 'Русскоязычное сопровождение', 'Запись заранее'],
    introTitle: 'Не просто найти иглоукалывание — понять, куда вы идёте',
    introText: 'Мы помогаем русскоязычным гостям Санья пройти путь от первого вопроса до визита в больницу: объясняем процесс, согласовываем запись и помогаем с коммуникацией.',
    cards: [
      ['01', 'Понятная запись', 'Вы оставляете запрос на русском языке. Мы уточняем цель визита и удобное время.'],
      ['02', 'Больничный приём', 'После записи вы приходите в медицинское учреждение и проходите приём по установленному порядку.'],
      ['03', 'Русский язык', 'Помогаем понять организационные вопросы и сопровождаем коммуникацию с пациентом.'],
    ],
    hospitalTitle: 'Почему больница традиционной китайской медицины?',
    hospitalText: 'Для иностранного пациента важны не только сама процедура, но и понятный медицинский маршрут: где находится учреждение, как записаться, кому задать вопрос и что происходит на первом приёме.',
    hospitalPoints: ['Официальное медицинское учреждение', 'Понятный маршрут пациента', 'Предварительная запись', 'Русскоязычная помощь в организационных вопросах'],
    processTitle: 'Как проходит визит',
    process: [
      ['Запрос', 'Расскажите, что вас беспокоит и когда вы хотите прийти.'],
      ['Подтверждение', 'Мы уточняем доступность, время и организационные детали.'],
      ['Визит', 'Вы приходите в больницу на назначенное время.'],
      ['Сопровождение', 'При необходимости помогаем с русско-китайской коммуникацией.'],
    ],
    priceTitle: 'Стоимость и бюджет',
    priceText: 'Стоимость медицинского приёма определяется официальными тарифами учреждения и врачом после оценки состояния. Отдельно может рассчитываться организационное сопровождение, если оно требуется.',
    priceNote: 'Мы не обещаем заранее конкретное количество процедур или результат лечения. Состав и продолжительность курса определяются после медицинской оценки.',
    faqTitle: 'Частые вопросы',
    faqs: [
      ['Нужно ли знать китайский?', 'Нет. Мы ориентируемся на русскоязычных пациентов и помогаем с организационной коммуникацией.'],
      ['Можно ли записаться заранее?', 'Да. Оставьте запрос, желаемую дату и удобный способ связи.'],
      ['Сколько стоит лечение?', 'Медицинские услуги оплачиваются по установленным тарифам учреждения. Перед визитом мы стараемся объяснить структуру расходов.'],
      ['Можно ли прийти один раз?', 'Да, но необходимость повторных визитов определяет врач после оценки состояния.'],
    ],
    ctaTitle: 'Хотите узнать, как записаться?',
    ctaText: 'Напишите нам на русском языке. Расскажите, что вас беспокоит, где вы находитесь в Санья и когда вам удобно прийти.',
    footer: 'Информационный сервис для русскоязычных пациентов. Не является официальным сайтом больницы.',
  },
  zh: {
    nav: ['项目介绍', '医院', '就诊流程', '费用', '常见问题'],
    heroEyebrow: '三亚 · 海南 · 中国',
    heroTitle: '三亚针灸就诊服务',
    heroText: '面向俄语患者，提供三亚市中医医院针灸就诊前的信息与语言协助。',
    primary: '预约咨询', secondary: 'Telegram 联系',
    trust: ['医院就诊', '俄语协助', '提前预约'],
    introTitle: '不仅是找到针灸，更重要的是知道如何就诊',
    introText: '帮助俄语患者从咨询、预约到医院就诊，减少语言和流程上的不确定性。',
    cards: [['01','预约清晰','用俄语提交需求，我们确认就诊目的和时间。'],['02','医院就诊','预约后按照医院正常流程完成就诊。'],['03','语言协助','协助处理患者与医院之间的基本沟通。']],
    hospitalTitle: '为什么选择医院就诊？', hospitalText: '对于外国患者，医疗地点、预约流程、费用结构和语言沟通都很重要。', hospitalPoints: ['正规医疗机构','清晰的就诊流程','提前预约','俄语语言协助'],
    processTitle: '就诊流程', process: [['咨询','告诉我们需求和希望的时间。'],['确认','确认预约时间及相关事项。'],['就诊','按照预约时间到医院。'],['协助','需要时提供俄中沟通协助。']],
    priceTitle: '费用说明', priceText: '医疗费用按照医院正式收费标准执行，具体项目由医生评估后确定。若需要额外的协调服务，会单独说明。', priceNote: '不提前承诺具体疗程数量或治疗结果。',
    faqTitle: '常见问题', faqs: [['需要会中文吗？','不需要，我们面向俄语患者提供基本语言与流程协助。'],['可以提前预约吗？','可以，请提交希望的日期和联系方式。'],['费用是多少？','医疗费用按照医院标准执行，我们会尽量提前说明费用结构。'],['可以只做一次吗？','可以，但是否需要继续治疗由医生根据实际情况判断。']],
    ctaTitle: '想了解如何预约？', ctaText: '可以通过 Telegram 联系我们，告诉我们您的需求和方便的时间。', footer: '面向俄语患者的信息与协调服务，并非医院官方网站。'
  },
  en: {
    nav: ['About', 'Hospital', 'Visit', 'Pricing', 'FAQ'], heroEyebrow: 'Sanya · Hainan · China', heroTitle: 'Acupuncture in Sanya', heroText: 'Hospital-based acupuncture with Russian-language patient support.', primary: 'Request an appointment', secondary: 'Message on Telegram', trust: ['Hospital visit', 'Russian support', 'Advance booking'], introTitle: 'More than finding acupuncture — know how your visit works', introText: 'We help Russian-speaking visitors understand the process, request an appointment and communicate around their hospital visit.', cards: [['01','Simple request','Tell us what you need and when you would like to visit.'],['02','Hospital visit','After confirmation, you attend the medical institution through its normal process.'],['03','Russian support','We help with basic Russian-Chinese administrative communication.']], hospitalTitle: 'Why a hospital setting?', hospitalText: 'For an international patient, location, booking, payment and communication are all part of the experience.', hospitalPoints: ['Medical institution setting','Clear patient journey','Advance booking','Russian-language support'], processTitle: 'How it works', process: [['Request','Tell us your needs and preferred date.'],['Confirm','We confirm availability and practical details.'],['Visit','Attend the hospital at the agreed time.'],['Support','Russian-Chinese communication support when needed.']], priceTitle: 'Pricing & budget', priceText: 'Medical fees follow the institution’s applicable tariffs and the doctor’s assessment. Any separate coordination service is explained separately.', priceNote: 'We do not promise a fixed number of sessions or a treatment outcome in advance.', faqTitle: 'FAQ', faqs: [['Do I need Chinese?','No. We focus on Russian-speaking visitors and help with basic communication.'],['Can I book in advance?','Yes. Send your preferred date and contact details.'],['How much does it cost?','Medical fees follow the institution’s applicable pricing. We aim to explain the cost structure before the visit.'],['Can I come once?','Yes, while any follow-up is determined after medical assessment.']], ctaTitle: 'Want to know how to book?', ctaText: 'Message us in Russian and tell us what you need, where you are in Sanya and when you are available.', footer: 'Information and coordination service for Russian-speaking patients. Not the hospital’s official website.'
  }
}

function App() {
  const [lang, setLang] = useState('ru')
  const t = copy[lang]
  const telegram = 'https://t.me/'
  const scroll = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return <div className="site">
    <header className="header"><div className="container nav"><a className="brand" href="#top">SANYA<span>TCM</span></a><nav>{t.nav.map((x,i)=><button key={x} onClick={()=>scroll(['about','hospital','process','pricing','faq'][i])}>{x}</button>)}</nav><div className="langs">{['ru','zh','en'].map(x=><button className={lang===x?'active':''} key={x} onClick={()=>setLang(x)}>{x.toUpperCase()}</button>)}</div></div></header>
    <main id="top">
      <section className="hero"><div className="container heroGrid"><div><div className="eyebrow">{t.heroEyebrow}</div><h1>{t.heroTitle}</h1><p className="heroText">{t.heroText}</p><div className="actions"><button className="btn primary" onClick={()=>scroll('request')}>{t.primary}</button><a className="btn ghost" href={telegram} target="_blank" rel="noreferrer">{t.secondary}</a></div><div className="trust">{t.trust.map(x=><span key={x}>✓ {x}</span>)}</div></div><div className="heroCard"><div className="circle">针</div><div><strong>TCM · 三亚</strong><p>Traditional Chinese Medicine</p><small>Russian-speaking patient support</small></div></div></div></section>
      <section className="section" id="about"><div className="container"><div className="sectionHead"><span>01</span><h2>{t.introTitle}</h2><p>{t.introText}</p></div><div className="cards">{t.cards.map(c=><article key={c[0]}><span>{c[0]}</span><h3>{c[1]}</h3><p>{c[2]}</p></article>)}</div></div></section>
      <section className="section soft" id="hospital"><div className="container split"><div><div className="kicker">02 · HOSPITAL</div><h2>{t.hospitalTitle}</h2><p>{t.hospitalText}</p></div><ul>{t.hospitalPoints.map(x=><li key={x}>✓ <span>{x}</span></li>)}</ul></div></section>
      <section className="section" id="process"><div className="container"><div className="kicker">03 · PROCESS</div><h2>{t.processTitle}</h2><div className="steps">{t.process.map((p,i)=><article key={p[0]}><div className="stepNo">0{i+1}</div><h3>{p[0]}</h3><p>{p[1]}</p></article>)}</div></div></section>
      <section className="section soft" id="pricing"><div className="container price"><div><div className="kicker">04 · PRICING</div><h2>{t.priceTitle}</h2><p>{t.priceText}</p></div><div className="notice">{t.priceNote}</div></div></section>
      <section className="section" id="faq"><div className="container faq"><div><div className="kicker">05 · FAQ</div><h2>{t.faqTitle}</h2></div><div>{t.faqs.map(f=><details key={f[0]}><summary>{f[0]}<span>＋</span></summary><p>{f[1]}</p></details>)}</div></div></section>
      <section className="cta" id="request"><div className="container ctaInner"><div><div className="kicker">CONTACT</div><h2>{t.ctaTitle}</h2><p>{t.ctaText}</p></div><a className="btn primary" href={telegram} target="_blank" rel="noreferrer">Telegram →</a></div></section>
    </main>
    <footer><div className="container footer"><div className="brand">SANYA<span>TCM</span></div><p>{t.footer}</p><small>© 2026 Sanya Acupuncture International Patient Service</small></div></footer>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
