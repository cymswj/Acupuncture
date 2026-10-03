import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LEAD_STAGES, listLeads, saveLead, updateLead, deleteLead, exportLeadsCsv } from '../src/crm.js'
import { trackEvent, readEvents } from '../src/analytics.js'
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
  const stats = useMemo(() => {
    const sources = {}
    leads.forEach(x => { sources[x.source || 'direct'] = (sources[x.source || 'direct'] || 0) + 1 })
    const topSource = Object.entries(sources).sort((x,y) => y[1] - x[1])[0]
    return {
      total: leads.length,
      confirmed: leads.filter(x => x.stage === 'confirmed').length,
      visited: leads.filter(x => x.stage === 'visited').length,
      followup: leads.filter(x => x.stage === 'followup').length,
      topSource: topSource ? topSource[0] + ' (' + topSource[1] + ')' : '—',
      events: readEvents().length,
    }
  }, [leads])
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
      <div className="metricGrid">
        <div className="metric"><span>Всего Lead</span><strong>{stats.total}</strong></div>
        <div className="metric"><span>Подтверждено</span><strong>{stats.confirmed}</strong></div>
        <div className="metric"><span>Были на приёме</span><strong>{stats.visited}</strong></div>
        <div className="metric"><span>Повторный визит</span><strong>{stats.followup}</strong></div>
        <div className="metric"><span>Главный источник</span><strong>{stats.topSource}</strong></div>
        <div className="metric"><span>事件</span><strong>{stats.events}</strong></div>
      </div>
      <div className="stageBar"><button className={!stage?'active':''} onClick={()=>setStage('')}>Все ({leads.length})</button>{LEAD_STAGES.map(s=><button key={s} className={stage===s?'active':''} onClick={()=>setStage(s)}>{stageLabels[s]} ({leads.filter(x=>x.stage===s).length})</button>)}</div>
      <div className="crmGrid">{filtered.length ? filtered.map(lead=><article className="leadCard" key={lead.id}><div className="leadTop"><strong>{lead.name || 'Без имени'}</strong><span>{stageLabels[lead.stage] || lead.stage}</span></div><div className="leadMeta"><span>{lead.id}</span><span>{lead.source || 'direct'}</span><span>{lead.preferredDate || '—'}</span><span>{lead.service || '—'}</span><span>到院: {lead.visitDate || '—'}</span><span>复诊: {lead.followupDate || '—'}</span></div><p>{lead.contact || '—'}</p><p className="leadNote">{lead.note || ''}</p><div className="leadActions"><select value={lead.stage} onChange={e=>move(lead.id,e.target.value)}>{LEAD_STAGES.map(s=><option value={s} key={s}>{stageLabels[s]}</option>)}</select><button onClick={()=>{ updateLead(lead.id,{visitDate:new Date().toISOString().slice(0,10),stage:'visited'}); trackEvent('visit_completed',{leadStage:'visited'}); refresh() }}>已到院</button><button onClick={()=>{ updateLead(lead.id,{followupDate:new Date().toISOString().slice(0,10),stage:'followup'}); trackEvent('followup_completed',{leadStage:'followup'}); refresh() }}>复诊</button><button onClick={()=>remove(lead.id)}>删除</button></div></article>) : <div className="emptyCard">暂无 Lead。可以先添加测试客户验证流程。</div>}</div>
    </div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
