import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LEAD_STAGES, listLeads, saveLead, updateLead, deleteLead, exportLeadsCsv } from '../src/crm.js'
import { trackEvent } from '../src/analytics.js'
import '../src/styles.css'

const stageLabels = {
  new: 'Новый',
  qualified: 'Квалифицирован',
  appointment_requested: 'Запрошена запись',
  confirmed: 'Подтверждено',
  visited: 'Был на приёме',
  followup: 'Повторный визит',
  closed: 'Закрыт',
}

function App() {
  const [leads, setLeads] = useState(listLeads())
  const [stage, setStage] = useState('')
  const filtered = useMemo(() => stage ? leads.filter(x => x.stage === stage) : leads, [leads, stage])

  const refresh = () => setLeads(listLeads())

  function move(id, next) {
    updateLead(id, { stage: next })
    trackEvent('lead_stage_changed', { stage: next })
    refresh()
  }

  function remove(id) {
    deleteLead(id)
    refresh()
  }

  function addDemo() {
    const id = 'DEMO-' + Date.now().toString().slice(-8)
    saveLead({
      id,
      source: 'demo',
      language: 'ru',
      name: 'Тестовый клиент',
      contact: '@demo',
      preferredDate: new Date().toISOString().slice(0,10),
      service: 'Иглоукалывание',
      note: 'DEMO — удалить после тестирования',
    })
    refresh()
  }

  function download() {
    const blob = new Blob([exportLeadsCsv()], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sanya-tcm-leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return <div className="adminPage">
    <div className="adminShell">
      <div className="adminTop"><div><div className="kicker">SANYA TCM · CRM LITE</div><h1>Пациенты и записи</h1><p>Локальный тестовый CRM. Не используйте его для хранения медицинских документов или диагнозов.</p></div><div className="adminActions"><button onClick={addDemo}>Добавить тест</button><button onClick={download}>Экспорт CSV</button><a href="/Acupuncture/">Сайт ↗</a></div></div>
      <div className="stageBar"><button className={!stage?'active':''} onClick={()=>setStage('')}>Все ({leads.length})</button>{LEAD_STAGES.map(s=><button key={s} className={stage===s?'active':''} onClick={()=>setStage(s)}>{stageLabels[s]} ({leads.filter(x=>x.stage===s).length})</button>)}</div>
      <div className="crmGrid">{filtered.length ? filtered.map(lead=><article className="leadCard" key={lead.id}><div className="leadTop"><strong>{lead.name || 'Без имени'}</strong><span>{stageLabels[lead.stage] || lead.stage}</span></div><div className="leadMeta"><span>{lead.id}</span><span>{lead.source || 'direct'}</span><span>{lead.preferredDate || '—'}</span><span>{lead.service || '—'}</span></div><p>{lead.contact || '—'}</p><p className="leadNote">{lead.note || ''}</p><div className="leadActions"><select value={lead.stage} onChange={e=>move(lead.id,e.target.value)}>{LEAD_STAGES.map(s=><option value={s} key={s}>{stageLabels[s]}</option>)}</select><button onClick={()=>remove(lead.id)}>删除</button></div></article>) : <div className="emptyCard">暂无 Lead。可以先添加测试客户验证流程。</div>}</div>
    </div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
