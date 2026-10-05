import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { LEAD_STAGES, listLeads, saveLead, updateLead, deleteLead, exportLeadsCsv } from '../src/crm.js'
import { trackEvent, readEvents } from '../src/analytics.js'
import '../src/styles.css'

const stageLabels = {
  new: '新线索',
  qualified: '已筛选',
  appointment_requested: '已提交预约',
  confirmed: '已确认',
  visited: '已到院',
  followup: '复诊',
  closed: '已关闭',
}

const stageLabelsZh = stageLabels


function normalizeLead(row) {
  return {
    id: row.id,
    createdAt: row.created_at || row.createdAt || '',
    updatedAt: row.updated_at || row.updatedAt || '',
    stage: row.stage || 'new',
    source: row.source || 'direct',
    medium: row.medium || '',
    campaign: row.campaign || '',
    language: row.language || 'ru',
    name: row.name || '',
    contact: row.contact || '',
    preferredDate: row.preferred_date || row.preferredDate || '',
    service: row.service || '',
    appointmentDate: row.appointment_date || row.appointmentDate || '',
    visitDate: row.visit_date || row.visitDate || '',
    followupDate: row.followup_date || row.followupDate || '',
    valueCny: row.value_cny ?? row.valueCny ?? '',
    owner: row.owner || '',
    note: '',
  }
}

function extractSettings(config = {}, overrides = {}) {
  const source = overrides || {}
  return {
    brand: {
      name: source.brand?.name ?? config.brand?.name ?? '',
      legalLine: source.brand?.legalLine ?? config.brand?.legalLine ?? '',
    },
    contact: {
      phone: source.contact?.phone ?? config.contact?.phone ?? '',
      telegramUrl: source.contact?.telegramUrl ?? config.contact?.telegramUrl ?? '',
      telegramHandle: source.contact?.telegramHandle ?? config.contact?.telegramHandle ?? '',
      vkUrl: source.contact?.vkUrl ?? config.contact?.vkUrl ?? '',
      whatsappUrl: source.contact?.whatsappUrl ?? config.contact?.whatsappUrl ?? '',
      email: source.contact?.email ?? config.contact?.email ?? '',
      telegramShareUrl: source.contact?.telegramShareUrl ?? config.contact?.telegramShareUrl ?? '',
    },
    seo: {
      defaultTitle: source.seo?.defaultTitle ?? config.seo?.defaultTitle ?? '',
      defaultDescription: source.seo?.defaultDescription ?? config.seo?.defaultDescription ?? '',
      keywords: source.seo?.keywords ?? config.seo?.keywords ?? '',
      ru: {
        title: source.seo?.ru?.title ?? config.seo?.ru?.title ?? '',
        description: source.seo?.ru?.description ?? config.seo?.ru?.description ?? '',
        keywords: source.seo?.ru?.keywords ?? config.seo?.ru?.keywords ?? '',
      },
      zh: {
        title: source.seo?.zh?.title ?? config.seo?.zh?.title ?? '',
        description: source.seo?.zh?.description ?? config.seo?.zh?.description ?? '',
        keywords: source.seo?.zh?.keywords ?? config.seo?.zh?.keywords ?? '',
      },
      en: {
        title: source.seo?.en?.title ?? config.seo?.en?.title ?? '',
        description: source.seo?.en?.description ?? config.seo?.en?.description ?? '',
        keywords: source.seo?.en?.keywords ?? config.seo?.en?.keywords ?? '',
      },
    },
  }
}

function App() {
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  const [remoteMode, setRemoteMode] = useState(false)
  const [authenticated, setAuthenticated] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [authChecked, setAuthChecked] = useState(false)
  const [authMessage, setAuthMessage] = useState('')
  const [leads, setLeads] = useState([])
  const [stage, setStage] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [auditLogs, setAuditLogs] = useState([])
  const [settingsDraft, setSettingsDraft] = useState(extractSettings())
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState('')
  const [settingsMessage, setSettingsMessage] = useState('')
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}config/site.json`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('config unavailable')))
      .then(data => {
        setConfig(data)
        setSettingsDraft(extractSettings(data))
        const enabled = Boolean(data.adminApi?.enabled && data.adminApi?.baseUrl)
        setRemoteMode(enabled)
        setAuthChecked(!enabled)
      })
      .catch(() => {
        setConfigError('网站配置无法加载。')
        setAuthChecked(true)
      })
  }, [])

  const baseUrl = (config?.adminApi?.baseUrl || '').replace(/\/$/, '')

  async function api(path, options = {}) {
    const headers = { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(options.headers || {}) }
    const response = await fetch(baseUrl + path, { ...options, headers, credentials: 'include' })
    let body = null
    try { body = await response.json() } catch {}
    if (!response.ok) {
      const error = new Error(body?.error || 'request failed')
      error.status = response.status
      throw error
    }
    return body
  }

  async function verifySession() {
    if (!remoteMode) return
    try {
      const me = await api('/api/auth/me')
      setAuthenticated(true)
      setAuthMessage('')
      setUsername(me.username || '')
    } catch {
      setAuthenticated(false)
      setUsername('')
    } finally {
      setAuthChecked(true)
    }
  }

  async function login(e) {
    e.preventDefault()
    setAuthMessage('')
    setLoading(true)
    try {
      const response = await fetch(baseUrl + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      })
      const body = await response.json()
      if (!response.ok) throw new Error(body?.error || 'login failed')
      setAuthenticated(true)
      setPassword('')
      setUsername(body.username || username)
    } catch (error) {
      setAuthMessage(error.message === 'too many login attempts' ? '尝试次数过多，请稍后再试。' : '登录失败，请检查账号和密码。')
    } finally {
      setLoading(false)
    }
  }

  async function logout() {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
    setAuthenticated(false)
    setLeads([])
    setDashboard(null)
    setUsername('')
  }

  async function refreshRemote() {
    setLoading(true)
    try {
      const [leadData, dashboardData, auditData, settingsData] = await Promise.all([api('/api/leads'), api('/api/dashboard'), api('/api/audit?limit=20'), api('/api/settings')])
      setLeads((leadData.leads || []).map(normalizeLead))
      setDashboard(dashboardData)
      setAuditLogs(auditData.logs || [])
      setSettingsDraft(extractSettings(config, settingsData.settings || {}))
      setSettingsUpdatedAt(settingsData.updatedAt || '')
      setAuthMessage('')
    } catch (error) {
      if (error.status === 401) {
        setAuthenticated(false)
        setUsername('')
      } else {
        setAuthMessage('后台数据读取失败，请检查 API 和数据库。')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (remoteMode) verifySession()
  }, [remoteMode])

  useEffect(() => {
    if (remoteMode && authChecked && authenticated) refreshRemote()
  }, [remoteMode, authChecked, authenticated])

  const localStats = useMemo(() => {
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

  const remoteStats = dashboard?.totals || {}
  const stats = remoteMode ? {
    total: remoteStats.leads || 0,
    confirmed: remoteStats.confirmed || 0,
    visited: remoteStats.visited || 0,
    followup: remoteStats.followup || 0,
    topSource: dashboard?.sources?.[0] ? dashboard.sources[0].source + ' (' + dashboard.sources[0].count + ')' : '—',
    events: remoteStats.events || 0,
  } : localStats

  const filtered = useMemo(() => stage ? leads.filter(x => x.stage === stage) : leads, [leads, stage])
  const remoteStageCount = s => dashboard?.stageCounts?.[s] || 0

  function moveLocal(id, next) {
    updateLead(id, { stage: next })
    trackEvent('lead_stage_changed', { stage: next })
    setLeads(listLeads())
  }

  async function moveRemote(id, next, extra = {}) {
    try {
      await api('/api/leads/' + encodeURIComponent(id), {
        method: 'PATCH',
        body: JSON.stringify({ stage: next, ...extra }),
      })
      await refreshRemote()
    } catch {
      setAuthMessage('更新线索失败。')
    }
  }

  function removeLocal(id) {
    deleteLead(id)
    setLeads(listLeads())
  }

  async function addDemo() {
    const id = 'DEMO-' + Date.now().toString().slice(-8)
    const lead = {
      id,
      source: 'demo',
      language: 'ru',
      name: '测试客户',
      contact: '@demo',
      preferredDate: new Date().toISOString().slice(0,10),
      service: '针灸',
    }
    try {
      if (remoteMode) {
        await api('/api/leads', { method: 'POST', body: JSON.stringify(lead) })
        await refreshRemote()
      } else {
        saveLead({ ...lead, note: 'DEMO — 测试完成后删除' })
        setLeads(listLeads())
      }
    } catch {
      setAuthMessage('无法创建测试线索。')
    }
  }

  async function saveSettings() {
    setSettingsSaving(true)
    setSettingsMessage('')
    try {
      const body = await api('/api/settings', {
        method: 'PUT',
        body: JSON.stringify(settingsDraft),
      })
      setSettingsDraft(extractSettings(config, body.settings || {}))
      setSettingsMessage('网站设置已保存。新访客会读取最新配置；如前台尚未启用公共配置 API，则需要部署后端后才会生效。')
    } catch {
      setSettingsMessage('网站设置保存失败，请检查 API、登录状态和字段格式。')
    } finally {
      setSettingsSaving(false)
    }
  }

  function updateSettings(section, key, value) {
    setSettingsDraft(prev => ({
      ...prev,
      [section]: { ...prev[section], [key]: value },
    }))
  }

  function updateSeo(locale, key, value) {
    setSettingsDraft(prev => ({
      ...prev,
      seo: { ...prev.seo, [locale]: { ...prev.seo[locale], [key]: value } },
    }))
  }

  function download() {
    if (!remoteMode) {
      const blob = new Blob([exportLeadsCsv()], {type:'text/csv;charset=utf-8'})
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'sanya-tcm-leads.csv'
      a.click()
      URL.revokeObjectURL(url)
      return
    }

    const headers = ['id','createdAt','updatedAt','stage','source','medium','campaign','language','name','contact','preferredDate','service','appointmentDate','visitDate','followupDate','valueCny','owner']
    const esc = value => '"' + String(value ?? '').replace(/"/g, '""') + '"'
    const csv = [headers.join(','), ...leads.map(row => headers.map(header => esc(row[header])).join(','))].join('\\n')
    const blob = new Blob([csv], {type:'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'sanya-tcm-leads.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (configError) return <div className="adminPage"><div className="adminShell"><div className="emptyCard">{configError} 请刷新页面重试。</div></div></div>
  if (!config) return <div className="adminPage"><div className="adminShell"><div className="emptyCard">正在加载后台配置…</div></div></div>

  if (remoteMode && !authChecked) return <div className="adminPage"><div className="adminShell"><div className="emptyCard">正在验证登录状态…</div></div></div>

  if (remoteMode && !authenticated) {
    return <div className="adminPage"><div className="adminShell" style={{maxWidth:520}}>
      <div className="adminTop"><div><div className="kicker">SANYA TCM · 后台</div><h1>后台登录</h1><p>远程 CRM 模式。账号和密码只提交到配置的 HTTPS API，不保存在网站代码中。</p></div></div>
      <form className="requestBox" onSubmit={login} style={{marginTop:20}}>
        <label><span>账号</span><input required value={username} onChange={e=>setUsername(e.target.value)} autoComplete="username" /></label>
        <label><span>密码</span><input required type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" /></label>
        <button className="btn primary" type="submit" disabled={loading}>{loading ? '登录中…' : '登录后台'}</button>
        {authMessage ? <p className="formMessage">{authMessage}</p> : null}
      </form>
      <div className="emptyCard" style={{marginTop:16}}>未部署后端时会自动使用本机测试模式。正式环境请在配置中启用 adminApi。</div>
    </div></div>
  }

  return <div className="adminPage">
    <div className="adminShell">
      <div className="adminTop"><div><div className="kicker">SANYA TCM · {remoteMode ? '共享 CRM' : '本机 CRM'}</div><h1>线索与预约</h1><p>{remoteMode ? '共享后端模式：线索与漏斗统计来自 PostgreSQL。请勿在这里保存病历、MRI、CT、诊断等敏感医疗资料。' : '当前为本机测试模式。配置远程 API 后，团队可使用同一套共享数据。'}</p></div><div className="adminActions">{remoteMode ? <><span style={{alignSelf:'center'}}>👤 {username || 'admin'}</span><button onClick={refreshRemote}>刷新</button><button onClick={download}>导出 CSV</button><button onClick={logout}>退出</button></> : null}{!remoteMode ? <><button onClick={addDemo}>新增测试</button><button onClick={download}>导出 CSV</button></> : null}<a href="/Acupuncture/">返回网站 ↗</a></div></div>
      {authMessage ? <div className="formMessage" style={{marginBottom:16}}>{authMessage}</div> : null}
      <div className="metricGrid">
        <div className="metric"><span>全部线索</span><strong>{stats.total}</strong></div>
        <div className="metric"><span>已确认</span><strong>{stats.confirmed}</strong></div>
        <div className="metric"><span>已到院</span><strong>{stats.visited}</strong></div>
        <div className="metric"><span>复诊</span><strong>{stats.followup}</strong></div>
        <div className="metric"><span>主要来源</span><strong>{stats.topSource}</strong></div>
        <div className="metric"><span>事件</span><strong>{stats.events}</strong></div>
      </div>
      {remoteMode ? <details className="settingsPanel">
        <summary><strong>网站设置</strong><span>联系方式、品牌与基础 SEO</span></summary>
        <div className="settingsGrid">
          <section className="settingsGroup">
            <h3>联系方式</h3>
            <label><span>联系电话</span><input value={settingsDraft.contact.phone} onChange={e=>updateSettings('contact','phone',e.target.value)} placeholder="+86 13876636537" /></label>
            <label><span>Telegram 地址</span><input value={settingsDraft.contact.telegramUrl} onChange={e=>updateSettings('contact','telegramUrl',e.target.value)} placeholder="https://t.me/..." /></label>
            <label><span>Telegram 用户名</span><input value={settingsDraft.contact.telegramHandle} onChange={e=>updateSettings('contact','telegramHandle',e.target.value)} placeholder="@..." /></label>
            <label><span>VK 地址</span><input value={settingsDraft.contact.vkUrl} onChange={e=>updateSettings('contact','vkUrl',e.target.value)} placeholder="https://vk.com/..." /></label>
            <label><span>WhatsApp 地址</span><input value={settingsDraft.contact.whatsappUrl} onChange={e=>updateSettings('contact','whatsappUrl',e.target.value)} placeholder="https://wa.me/..." /></label>
            <label><span>邮箱</span><input type="email" value={settingsDraft.contact.email} onChange={e=>updateSettings('contact','email',e.target.value)} placeholder="name@example.com" /></label>
            <p className="settingsHint">Telegram 二维码目前固定使用网站资产；如果更换 Telegram 账号，需要同步更换二维码文件。</p>
          </section>
          <section className="settingsGroup">
            <h3>品牌</h3>
            <label><span>品牌名称</span><input value={settingsDraft.brand.name} onChange={e=>updateSettings('brand','name',e.target.value)} /></label>
            <label><span>品牌副标题</span><input value={settingsDraft.brand.legalLine} onChange={e=>updateSettings('brand','legalLine',e.target.value)} /></label>
            <h3>SEO 基础</h3>
            <label><span>默认标题</span><input value={settingsDraft.seo.defaultTitle} onChange={e=>updateSettings('seo','defaultTitle',e.target.value)} /></label>
            <label><span>默认描述</span><textarea rows="3" value={settingsDraft.seo.defaultDescription} onChange={e=>updateSettings('seo','defaultDescription',e.target.value)} /></label>
            <label><span>默认关键词</span><textarea rows="3" value={settingsDraft.seo.keywords} onChange={e=>updateSettings('seo','keywords',e.target.value)} /></label>
          </section>
          <section className="settingsGroup settingsWide">
            <h3>俄语 SEO</h3>
            <div className="settingsTwo"><label><span>标题</span><input value={settingsDraft.seo.ru.title} onChange={e=>updateSeo('ru','title',e.target.value)} /></label><label><span>描述</span><textarea rows="3" value={settingsDraft.seo.ru.description} onChange={e=>updateSeo('ru','description',e.target.value)} /></label></div>
            <p className="settingsHint">目前只让运营人员编辑安全的公开配置；管理员账号、API 地址、数据库、Cookie 和部署参数仍然由服务器环境管理。</p>
            <div className="settingsBar"><span>{settingsUpdatedAt ? '最后更新：' + new Date(settingsUpdatedAt).toLocaleString('zh-CN') : '尚未保存到共享后台'}</span><button className="btn primary" onClick={saveSettings} disabled={settingsSaving}>{settingsSaving ? '保存中…' : '保存网站设置'}</button></div>
            {settingsMessage ? <p className="formMessage">{settingsMessage}</p> : null}
          </section>
        </div>
      </details> : null}
      <div className="stageBar"><button className={!stage?'active':''} onClick={()=>setStage('')}>全部 ({leads.length})</button>{LEAD_STAGES.map(s=><button key={s} className={stage===s?'active':''} onClick={()=>setStage(s)}>{stageLabels[s]} ({remoteMode ? remoteStageCount(s) : leads.filter(x=>x.stage===s).length})</button>)}</div>
      {remoteMode ? <details className="emptyCard" style={{marginBottom:16}}><summary><strong>最近操作记录</strong>（审计）</summary><div style={{marginTop:12,overflowX:'auto'}}><table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}><thead><tr><th style={{textAlign:'left',padding:'8px 6px'}}>时间</th><th style={{textAlign:'left',padding:'8px 6px'}}>账号</th><th style={{textAlign:'left',padding:'8px 6px'}}>操作</th><th style={{textAlign:'left',padding:'8px 6px'}}>目标</th></tr></thead><tbody>{auditLogs.map(log=><tr key={log.id}><td style={{padding:'8px 6px'}}>{new Date(log.occurred_at).toLocaleString('zh-CN')}</td><td style={{padding:'8px 6px'}}>{log.username}</td><td style={{padding:'8px 6px'}}>{log.action}</td><td style={{padding:'8px 6px'}}>{log.target_id || '—'}</td></tr>)}</tbody></table>{!auditLogs.length ? <p>暂无操作记录。</p> : null}</div></details> : null}
      <div className="crmGrid">{filtered.length ? filtered.map(lead=><article className="leadCard" key={lead.id}><div className="leadTop"><strong>{lead.name || '未填写姓名'}</strong><span>{stageLabels[lead.stage] || lead.stage}</span></div><div className="leadMeta"><span>{lead.id}</span><span>{lead.source || 'direct'}</span><span>{lead.preferredDate || '—'}</span><span>{lead.service || '—'}</span><span>到院：{lead.visitDate || '—'}</span><span>复诊：{lead.followupDate || '—'}</span></div><p>{lead.contact || '—'}</p><p className="leadNote">{remoteMode ? '' : lead.note || ''}</p><div className="leadActions"><select value={lead.stage} onChange={e=>remoteMode ? moveRemote(lead.id,e.target.value) : moveLocal(lead.id,e.target.value)}>{LEAD_STAGES.map(s=><option value={s} key={s}>{stageLabels[s]}</option>)}</select><button onClick={()=>remoteMode ? moveRemote(lead.id,'visited',{visitDate:new Date().toISOString().slice(0,10)}) : (updateLead(lead.id,{visitDate:new Date().toISOString().slice(0,10),stage:'visited'}), trackEvent('visit_completed',{leadStage:'visited'}), setLeads(listLeads()))}>已到院</button><button onClick={()=>remoteMode ? moveRemote(lead.id,'followup',{followupDate:new Date().toISOString().slice(0,10)}) : (updateLead(lead.id,{followupDate:new Date().toISOString().slice(0,10),stage:'followup'}), trackEvent('followup_completed',{leadStage:'followup'}), setLeads(listLeads()))}>{stageLabelsZh.followup}</button>{!remoteMode ? <button onClick={()=>removeLocal(lead.id)}>删除</button> : null}</div></article>) : <div className="emptyCard">暂无线索。可以先添加测试线索验证流程。</div>}</div>
    </div>
  </div>
}

createRoot(document.getElementById('root')).render(<App />)
