'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ResumePreview, type PreviewData } from './resume-preview'

// ── Internal types ─────────────────────────────────────────────────────────────

export interface ResExp {
  id: string; company: string; title: string
  startDate: string; endDate: string; current: boolean; description: string
}
export interface ResEdu {
  id: string; school: string; major: string; degree: string
  startDate: string; endDate: string
}
export interface ResLang { id: string; name: string; level: string }
export interface ResData {
  name: string; jobTitle: string
  email: string; phone: string; location: string
  linkedin: string; website: string; summary: string
  skills: string[]
  experiences: ResExp[]
  education: ResEdu[]
  languages: ResLang[]
  rawText: string
}

// What the parent persists (superset of the old ParsedResume)
export interface SavedResumeData {
  name: string; email: string; phone: string
  jobTitle?: string; location?: string; linkedin?: string; website?: string; summary?: string
  skills: string[]
  experiences: { company: string; title: string; description: string; startDate?: string; endDate?: string; current?: boolean }[]
  education: { school: string; degree: string; major: string; year: string; startDate?: string; endDate?: string }[]
  languages?: { name: string; level: string }[]
  rawText: string
}

interface ResumeEditorProps {
  initialData: SavedResumeData
  initialName: string
  onSave: (data: SavedResumeData, name: string) => void
  onBack: () => void
}

// ── Section tabs ──────────────────────────────────────────────────────────────

type Section = 'personal' | 'summary' | 'experience' | 'education' | 'skills' | 'languages'
const SECTIONS: { id: Section; label: string }[] = [
  { id: 'personal',   label: '個人資訊' },
  { id: 'summary',    label: '摘要' },
  { id: 'experience', label: '工作經歷' },
  { id: 'education',  label: '學歷' },
  { id: 'skills',     label: '技能' },
  { id: 'languages',  label: '語言' },
]

const LANG_LEVELS = ['母語', '流利', '進階', '中等', '基礎']

// ── Utilities ─────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }

function fromSaved(p: SavedResumeData): ResData {
  return {
    name: p.name || '',
    jobTitle: p.jobTitle || '',
    email: p.email || '',
    phone: p.phone || '',
    location: p.location || '',
    linkedin: p.linkedin || '',
    website: p.website || '',
    summary: p.summary || '',
    skills: p.skills || [],
    experiences: (p.experiences || []).map(e => ({
      id: genId(), company: e.company || '', title: e.title || '',
      startDate: e.startDate || '', endDate: e.endDate || '',
      current: e.current || false, description: e.description || '',
    })),
    education: (p.education || []).map(e => ({
      id: genId(), school: e.school || '', major: e.major || '',
      degree: e.degree || '', startDate: e.startDate || '',
      endDate: e.endDate || e.year || '',
    })),
    languages: (p.languages || []).map(l => ({ id: genId(), name: l.name || '', level: l.level || '' })),
    rawText: p.rawText || '',
  }
}

function toSaved(d: ResData): SavedResumeData {
  const rawText = [
    d.name, d.jobTitle, d.email, d.phone, d.location, d.summary,
    ...d.experiences.flatMap(e => [e.company, e.title, e.description]),
    ...d.education.flatMap(e => [e.school, e.degree, e.major]),
    d.skills.join(' '),
    ...d.languages.map(l => `${l.name} ${l.level}`),
  ].filter(Boolean).join('\n')

  return {
    name: d.name, email: d.email, phone: d.phone,
    jobTitle: d.jobTitle, location: d.location, linkedin: d.linkedin,
    website: d.website, summary: d.summary,
    skills: d.skills,
    experiences: d.experiences.map(e => ({
      company: e.company, title: e.title, description: e.description,
      startDate: e.startDate, endDate: e.endDate, current: e.current,
    })),
    education: d.education.map(e => ({
      school: e.school, degree: e.degree, major: e.major,
      year: e.endDate, startDate: e.startDate, endDate: e.endDate,
    })),
    languages: d.languages.map(l => ({ name: l.name, level: l.level })),
    rawText,
  }
}

function toPreview(d: ResData): PreviewData {
  return {
    name: d.name, jobTitle: d.jobTitle,
    email: d.email, phone: d.phone, location: d.location,
    linkedin: d.linkedin, website: d.website, summary: d.summary,
    skills: d.skills,
    experiences: d.experiences,
    education: d.education,
    languages: d.languages,
  }
}

// ── Shared input class ────────────────────────────────────────────────────────

const INP = 'w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none'
const LBL = 'block text-xs font-medium text-ink-500 mb-1'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={LBL}>{label}</label>{children}</div>
}

// ── Component ─────────────────────────────────────────────────────────────────

const A4_WIDTH = 794

export function ResumeEditor({ initialData, initialName, onSave, onBack }: ResumeEditorProps) {
  const [resume, setResume] = useState<ResData>(() => fromSaved(initialData))
  const [resumeName, setResumeName] = useState(initialName)
  const [editingName, setEditingName] = useState(false)
  const [section, setSection] = useState<Section>('personal')
  const [template, setTemplate] = useState<'classic' | 'modern'>('classic')
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [scoreResult, setScoreResult] = useState<{ score: number; atsScore: number } | null>(null)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [optimizingId, setOptimizingId] = useState<string | null>(null)
  const [newSkill, setNewSkill] = useState('')
  const previewRef = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [previewScale, setPreviewScale] = useState(0.7)

  // Scale preview to fit container
  useEffect(() => {
    const update = () => {
      if (!previewContainerRef.current) return
      const w = previewContainerRef.current.clientWidth - 32
      setPreviewScale(Math.min(1, w / A4_WIDTH))
    }
    update()
    const ro = new ResizeObserver(update)
    if (previewContainerRef.current) ro.observe(previewContainerRef.current)
    return () => ro.disconnect()
  }, [])

  useEffect(() => { if (editingName) nameInputRef.current?.focus() }, [editingName])

  // ── Updaters ────────────────────────────────────────────────────────────────

  const upd = useCallback(<K extends keyof ResData>(field: K, value: ResData[K]) => {
    setResume(p => ({ ...p, [field]: value }))
    setSaved(false)
  }, [])

  function updExp(id: string, field: keyof ResExp, value: string | boolean) {
    upd('experiences', resume.experiences.map(e => e.id === id ? { ...e, [field]: value } : e))
  }
  function addExp() {
    upd('experiences', [...resume.experiences, { id: genId(), company: '', title: '', startDate: '', endDate: '', current: false, description: '' }])
  }
  function removeExp(id: string) { upd('experiences', resume.experiences.filter(e => e.id !== id)) }

  function updEdu(id: string, field: keyof ResEdu, value: string) {
    upd('education', resume.education.map(e => e.id === id ? { ...e, [field]: value } : e))
  }
  function addEdu() {
    upd('education', [...resume.education, { id: genId(), school: '', major: '', degree: '', startDate: '', endDate: '' }])
  }
  function removeEdu(id: string) { upd('education', resume.education.filter(e => e.id !== id)) }

  function updLang(id: string, field: keyof ResLang, value: string) {
    upd('languages', resume.languages.map(l => l.id === id ? { ...l, [field]: value } : l))
  }
  function addLang() { upd('languages', [...resume.languages, { id: genId(), name: '', level: '中等' }]) }
  function removeLang(id: string) { upd('languages', resume.languages.filter(l => l.id !== id)) }

  function addSkill() {
    const s = newSkill.trim(); if (!s || resume.skills.includes(s)) return
    upd('skills', [...resume.skills, s]); setNewSkill('')
  }
  function removeSkill(s: string) { upd('skills', resume.skills.filter(k => k !== s)) }

  // ── Actions ──────────────────────────────────────────────────────────────────

  function handleSave() {
    setSaving(true)
    onSave(toSaved(resume), resumeName || resume.name || '我的履歷')
    setSaved(true); setSaving(false)
    setTimeout(() => setSaved(false), 3000)
  }

  async function handleDownload() {
    if (!previewRef.current) return
    setDownloading(true)
    try {
      const html2canvas = (await import('html2canvas')).default
      const { jsPDF } = await import('jspdf')
      const el = previewRef.current
      const canvas = await html2canvas(el, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        width: A4_WIDTH, height: el.scrollHeight,
        logging: false,
      })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = 210
      const pdfH = (canvas.height / canvas.width) * pdfW
      const pageH = 297
      const imgData = canvas.toDataURL('image/png')
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      } else {
        let remaining = pdfH; let y = 0
        while (remaining > 0) {
          if (y > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH)
          y += pageH; remaining -= pageH
        }
      }
      const date = new Date().toISOString().slice(0, 10)
      pdf.save(`${resume.name || '履歷'}-${date}.pdf`)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  async function handleScore() {
    setScoring(true)
    const rawText = toSaved(resume).rawText
    try {
      const res = await fetch('/api/resume/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: rawText }),
      })
      const data = await res.json()
      setScoreResult({ score: data.score, atsScore: data.atsScore })
    } catch { /* silent */ }
    finally { setScoring(false) }
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/resume/summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: resume.name, jobTitle: resume.jobTitle, skills: resume.skills, experiences: resume.experiences }),
      })
      const data = await res.json()
      if (data.summary) upd('summary', data.summary)
    } catch { /* silent */ }
    finally { setGeneratingSummary(false) }
  }

  async function handleOptimizeExp(id: string) {
    const exp = resume.experiences.find(e => e.id === id); if (!exp) return
    setOptimizingId(id)
    try {
      const res = await fetch('/api/resume/optimize', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: exp.title, company: exp.company, description: exp.description }),
      })
      const data = await res.json()
      if (data.description) updExp(id, 'description', data.description)
    } catch { /* silent */ }
    finally { setOptimizingId(null) }
  }

  // ── Form sections ──────────────────────────────────────────────────────────

  const editPanel = (
    <div className="h-full flex flex-col">
      {/* Section tabs */}
      <div className="flex overflow-x-auto border-b border-warm-200 bg-cream-100 shrink-0 px-1">
        {SECTIONS.map(s => (
          <button key={s.id} onClick={() => setSection(s.id)}
            className={`whitespace-nowrap px-3 py-3 text-xs font-medium border-b-2 transition-colors ${section === s.id ? 'border-terra-500 text-terra-600' : 'border-transparent text-ink-400 hover:text-ink-600'}`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Personal Info ── */}
        {section === 'personal' && (
          <>
            <Field label="姓名"><input className={INP} placeholder="王小明" value={resume.name} onChange={e => upd('name', e.target.value)} /></Field>
            <Field label="職稱 / 標題"><input className={INP} placeholder="例如：資深前端工程師" value={resume.jobTitle} onChange={e => upd('jobTitle', e.target.value)} /></Field>
            <Field label="電子郵件"><input className={INP} type="email" placeholder="email@example.com" value={resume.email} onChange={e => upd('email', e.target.value)} /></Field>
            <Field label="電話"><input className={INP} placeholder="0912-345-678" value={resume.phone} onChange={e => upd('phone', e.target.value)} /></Field>
            <Field label="地點"><input className={INP} placeholder="台北市，台灣" value={resume.location} onChange={e => upd('location', e.target.value)} /></Field>
            <Field label="LinkedIn"><input className={INP} placeholder="linkedin.com/in/username" value={resume.linkedin} onChange={e => upd('linkedin', e.target.value)} /></Field>
            <Field label="個人網站"><input className={INP} placeholder="yourwebsite.com" value={resume.website} onChange={e => upd('website', e.target.value)} /></Field>
          </>
        )}

        {/* ── Summary ── */}
        {section === 'summary' && (
          <>
            <div className="flex items-center justify-between">
              <label className={LBL + ' mb-0'}>個人摘要</label>
              <button onClick={handleGenerateSummary} disabled={generatingSummary}
                className="flex items-center gap-1.5 rounded-lg border border-terra-200 bg-terra-50 px-3 py-1.5 text-xs text-terra-600 hover:bg-terra-100 transition-all disabled:opacity-60">
                {generatingSummary ? <><SpinSm />AI 生成中...</> : '🤖 AI 生成摘要'}
              </button>
            </div>
            <textarea className={INP + ' resize-none'} rows={8}
              placeholder="簡短介紹你的核心優勢、職涯目標與專業亮點..."
              value={resume.summary} onChange={e => upd('summary', e.target.value)} />
            <p className="text-[10px] text-ink-400">建議 2-3 句話，約 60-100 字</p>
          </>
        )}

        {/* ── Experience ── */}
        {section === 'experience' && (
          <div className="space-y-4">
            {resume.experiences.map((exp, idx) => (
              <div key={exp.id} className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-600">工作經歷 {idx + 1}</p>
                  <button onClick={() => removeExp(exp.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕ 移除</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="公司"><input className={INP} placeholder="Google Taiwan" value={exp.company} onChange={e => updExp(exp.id, 'company', e.target.value)} /></Field>
                  <Field label="職位"><input className={INP} placeholder="軟體工程師" value={exp.title} onChange={e => updExp(exp.id, 'title', e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="開始日期"><input className={INP} type="month" value={exp.startDate} onChange={e => updExp(exp.id, 'startDate', e.target.value)} /></Field>
                  <Field label="結束日期">
                    <input className={INP} type="month" value={exp.endDate} disabled={exp.current} onChange={e => updExp(exp.id, 'endDate', e.target.value)} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-500 cursor-pointer">
                  <input type="checkbox" checked={exp.current} onChange={e => { updExp(exp.id, 'current', e.target.checked); if (e.target.checked) updExp(exp.id, 'endDate', '') }}
                    className="rounded border-warm-300" />
                  目前在職中
                </label>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={LBL + ' mb-0'}>工作描述</label>
                    <button onClick={() => handleOptimizeExp(exp.id)} disabled={optimizingId === exp.id}
                      className="flex items-center gap-1 rounded-md border border-terra-200 bg-terra-50 px-2 py-1 text-[10px] text-terra-600 hover:bg-terra-100 transition-all disabled:opacity-60">
                      {optimizingId === exp.id ? <><SpinSm />優化中...</> : '🤖 AI 優化描述'}
                    </button>
                  </div>
                  <textarea className={INP + ' resize-none'} rows={5}
                    placeholder={'• 主導xxx功能開發，提升用戶留存率 20%\n• 負責xxx模組重構，減少 Bug 率 30%'}
                    value={exp.description} onChange={e => updExp(exp.id, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            <button onClick={addExp}
              className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ 新增工作經歷
            </button>
          </div>
        )}

        {/* ── Education ── */}
        {section === 'education' && (
          <div className="space-y-4">
            {resume.education.map((edu, idx) => (
              <div key={edu.id} className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-600">學歷 {idx + 1}</p>
                  <button onClick={() => removeEdu(edu.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕ 移除</button>
                </div>
                <Field label="學校名稱"><input className={INP} placeholder="國立台灣大學" value={edu.school} onChange={e => updEdu(edu.id, 'school', e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="科系"><input className={INP} placeholder="資訊工程學系" value={edu.major} onChange={e => updEdu(edu.id, 'major', e.target.value)} /></Field>
                  <Field label="學位"><input className={INP} placeholder="學士" value={edu.degree} onChange={e => updEdu(edu.id, 'degree', e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label="入學日期"><input className={INP} type="month" value={edu.startDate} onChange={e => updEdu(edu.id, 'startDate', e.target.value)} /></Field>
                  <Field label="畢業日期"><input className={INP} type="month" value={edu.endDate} onChange={e => updEdu(edu.id, 'endDate', e.target.value)} /></Field>
                </div>
              </div>
            ))}
            <button onClick={addEdu}
              className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ 新增學歷
            </button>
          </div>
        )}

        {/* ── Skills ── */}
        {section === 'skills' && (
          <>
            <p className="text-xs text-ink-400">輸入技能後按 Enter 新增</p>
            <div className="flex gap-2">
              <input className={INP} placeholder="例如：React、Python、專案管理"
                value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
              <button onClick={addSkill} className="shrink-0 rounded-lg bg-terra-500 px-4 py-2 text-sm font-medium text-white hover:bg-terra-700 transition-colors">新增</button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {resume.skills.map(s => (
                <div key={s} className="flex items-center gap-1 rounded-full border border-terra-200 bg-terra-50 pl-3 pr-2 py-1">
                  <span className="text-xs text-terra-700">{s}</span>
                  <button onClick={() => removeSkill(s)} className="text-terra-400 hover:text-red-400 text-xs ml-0.5 transition-colors">×</button>
                </div>
              ))}
              {resume.skills.length === 0 && <p className="text-sm text-ink-300">尚未新增技能</p>}
            </div>
          </>
        )}

        {/* ── Languages ── */}
        {section === 'languages' && (
          <div className="space-y-3">
            {resume.languages.map((lang, idx) => (
              <div key={lang.id} className="flex items-end gap-2">
                <div className="flex-1">
                  {idx === 0 && <label className={LBL}>語言</label>}
                  <input className={INP} placeholder="例如：中文、英文、日文" value={lang.name} onChange={e => updLang(lang.id, 'name', e.target.value)} />
                </div>
                <div className="w-28">
                  {idx === 0 && <label className={LBL}>熟練度</label>}
                  <select className={INP} value={lang.level} onChange={e => updLang(lang.id, 'level', e.target.value)}>
                    {LANG_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <button onClick={() => removeLang(lang.id)} className="mb-0.5 text-ink-300 hover:text-red-400 transition-colors pb-2">✕</button>
              </div>
            ))}
            <button onClick={addLang}
              className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ 新增語言
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const previewPanel = (
    <div className="h-full flex flex-col">
      {/* Preview toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-200 bg-warm-100 shrink-0">
        <div className="flex gap-1 rounded-lg border border-warm-300 bg-white p-0.5">
          {(['classic', 'modern'] as const).map(t => (
            <button key={t} onClick={() => setTemplate(t)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all capitalize ${template === t ? 'bg-cream-200 text-ink-800 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
              {t === 'classic' ? 'Classic' : 'Modern'}
            </button>
          ))}
        </div>
        <button onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700 transition-colors disabled:opacity-60">
          {downloading ? <><SpinSm />匯出中</> : '↓ 下載 PDF'}
        </button>
      </div>

      {/* A4 preview area */}
      <div ref={previewContainerRef} className="flex-1 overflow-auto bg-warm-100 p-4 flex justify-center">
        <div style={{
          width: `${A4_WIDTH * previewScale}px`,
          height: `${A4_WIDTH * 1.414 * previewScale}px`,
          flexShrink: 0,
        }}>
          <div style={{ transform: `scale(${previewScale})`, transformOrigin: 'top left' }}>
            <div style={{ boxShadow: '0 4px 32px rgba(0,0,0,0.12)' }}>
              <ResumePreview ref={previewRef} data={toPreview(resume)} template={template} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white overflow-hidden">
      {/* Top toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-warm-200 bg-white shrink-0">
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-700 transition-colors whitespace-nowrap">
          ← 返回
        </button>

        {/* Editable resume name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input ref={nameInputRef} className="w-full max-w-xs rounded-lg border border-terra-400 bg-cream-100 px-3 py-1.5 text-sm font-medium text-ink-800 focus:outline-none"
              value={resumeName} onChange={e => setResumeName(e.target.value)}
              onBlur={() => setEditingName(false)}
              onKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }} />
          ) : (
            <button onClick={() => setEditingName(true)}
              className="max-w-xs truncate rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-cream-200 transition-colors text-left">
              {resumeName || '點擊設定履歷名稱'}
              <span className="ml-1.5 text-[10px] text-ink-300">✎</span>
            </button>
          )}
        </div>

        {/* Mobile edit/preview toggle */}
        <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5 md:hidden">
          {(['edit', 'preview'] as const).map(v => (
            <button key={v} onClick={() => setMobileView(v)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${mobileView === v ? 'bg-cream-200 text-ink-800' : 'text-ink-400'}`}>
              {v === 'edit' ? '編輯' : '預覽'}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {scoreResult && (
            <div className="hidden sm:flex items-center gap-2 rounded-lg border border-warm-200 bg-cream-100 px-3 py-1.5">
              <span className="text-xs text-ink-500">評分</span>
              <span className="text-sm font-bold text-terra-500">{scoreResult.score}</span>
              <span className="text-xs text-ink-400">· ATS {scoreResult.atsScore}</span>
            </div>
          )}
          <button onClick={handleScore} disabled={scoring}
            className="hidden sm:flex items-center gap-1.5 rounded-lg border border-warm-200 px-3 py-1.5 text-xs text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all disabled:opacity-60">
            {scoring ? <><SpinSm />評分中</> : '🤖 AI 評分'}
          </button>
          <button onClick={handleDownload} disabled={downloading}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700 transition-colors disabled:opacity-60">
            {downloading ? <SpinSm /> : '↓'} PDF
          </button>
          <Button variant={saved ? 'sage' : 'primary'} size="sm" onClick={handleSave} loading={saving}>
            {saved ? '✓ 已儲存' : '儲存'}
          </Button>
        </div>
      </div>

      {/* Main panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: edit */}
        <div className={`${mobileView === 'preview' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[40%] bg-cream-100 border-r border-warm-200 overflow-hidden`}>
          {editPanel}
        </div>
        {/* Right: preview */}
        <div className={`${mobileView === 'edit' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden`}>
          {previewPanel}
        </div>
      </div>
    </div>
  )
}

// ── Tiny spinner ──────────────────────────────────────────────────────────────

function SpinSm() {
  return (
    <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
