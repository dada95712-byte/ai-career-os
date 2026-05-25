'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import jsPDF from 'jspdf'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ResumePreview, type PreviewData, type SectionId, type TemplateId } from './resume-preview'

// ── Internal types ─────────────────────────────────────────────────────────────

export interface ResExp {
  id: string; company: string; title: string
  startDate: string; endDate: string; current: boolean; description: string
}
export interface ResEdu {
  id: string; school: string; major: string; degree: string
  startDate: string; endDate: string
}
export interface ResLang { id: string; name: string; level: string; customName?: string }
export interface ResConference {
  id: string; name: string; organizer: string; date: string; role: string; description: string
}
export interface ResActivity {
  id: string; name: string; organization: string; date: string; role: string; description: string
}

export interface ResData {
  name: string; jobTitle: string; email: string; phone: string
  location: string; linkedin: string; website: string
  summary: string; summaryType: string
  lang: 'zh' | 'en'
  skills: string[]
  experiences: ResExp[]
  education: ResEdu[]
  languages: ResLang[]
  conferences: ResConference[]
  activities: ResActivity[]
  sectionOrder: SectionId[]
  rawText: string
}

export interface SavedResumeData {
  name: string; email: string; phone: string
  jobTitle?: string; location?: string; linkedin?: string; website?: string
  summary?: string; summaryType?: string; lang?: 'zh' | 'en'
  skills: string[]
  experiences: { company: string; title: string; description: string; startDate?: string; endDate?: string; current?: boolean }[]
  education: { school: string; degree: string; major: string; year: string; startDate?: string; endDate?: string }[]
  languages?: { name: string; level: string }[]
  conferences?: { name: string; organizer: string; date: string; role: string; description: string }[]
  activities?: { name: string; organization: string; date: string; role: string; description: string }[]
  sectionOrder?: SectionId[]
  rawText: string
}

interface ResumeEditorProps {
  initialData: SavedResumeData
  initialName: string
  onSave: (data: SavedResumeData, name: string) => void
  onBack: () => void
  onScoreUpdate?: (score: number, atsScore: number, scoredAt: string) => void
}

interface ScoreSuggestion {
  priority: 'high' | 'medium' | 'low'
  issue: string
  fix: string
  section: SectionId | null
}

interface ScoreReport {
  score: number
  atsScore: number
  dimensions: { content: number; keywords: number; format: number; impact: number }
  suggestions: ScoreSuggestion[]
  keywords: string[]
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_SECTION_ORDER: SectionId[] = [
  'personal', 'summary', 'experience', 'education', 'skills', 'languages', 'conferences', 'activities',
]

const SECTION_LABELS: Record<'zh' | 'en', Record<SectionId, string>> = {
  zh: { personal: '個人資訊', summary: '摘要', experience: '工作經歷', education: '學歷', skills: '技能', languages: '語言', conferences: '會議', activities: '活動' },
  en: { personal: 'Personal Info', summary: 'Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', languages: 'Languages', conferences: 'Conferences', activities: 'Activities' },
}

const SUMMARY_TYPES: Record<'zh' | 'en', string[]> = {
  zh: ['個人摘要', '求職目標', '自傳'],
  en: ['Professional Summary', 'Objective'],
}

const LANG_LEVELS: Record<'zh' | 'en', string[]> = {
  zh: ['母語', '精通', '流利', '中等', '基礎'],
  en: ['Native', 'Fluent', 'Advanced', 'Intermediate', 'Basic'],
}

const TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: 'classic',      label: 'Classic' },
  { id: 'modern',       label: 'Modern' },
  { id: 'minimal',      label: 'Minimal' },
  { id: 'professional', label: 'Professional' },
  { id: 'creative',     label: 'Creative' },
]

const CONF_ROLES: Record<'zh' | 'en', string[]> = {
  zh: ['出席者', '講者', '主持人'],
  en: ['Attendee', 'Speaker', 'Moderator'],
}

const LANGUAGE_OPTIONS = [
  { key: 'zh_trad', zh: '中文（繁體）', en: 'Mandarin (Traditional Chinese)' },
  { key: 'zh_simp', zh: '中文（簡體）', en: 'Mandarin (Simplified Chinese)' },
  { key: 'en',      zh: '英文',         en: 'English' },
  { key: 'ja',      zh: '日文',         en: 'Japanese' },
  { key: 'ko',      zh: '韓文',         en: 'Korean' },
  { key: 'de',      zh: '德文',         en: 'German' },
  { key: 'fr',      zh: '法文',         en: 'French' },
  { key: 'es',      zh: '西班牙文',     en: 'Spanish' },
  { key: 'yue',     zh: '粵語',         en: 'Cantonese' },
  { key: 'tw',      zh: '台語',         en: 'Taiwanese' },
  { key: 'vi',      zh: '越南文',       en: 'Vietnamese' },
  { key: 'th',      zh: '泰文',         en: 'Thai' },
  { key: 'id',      zh: '印尼文',       en: 'Indonesian' },
] as const

const OTHER_LANG = '__other__'

// ── Utilities ─────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }

function getLangDropValue(l: ResLang, rl: 'zh' | 'en'): string {
  if (l.customName !== undefined) return OTHER_LANG
  if (!l.name) return ''
  const opt = LANGUAGE_OPTIONS.find(o => o.zh === l.name || o.en === l.name)
  return opt ? opt[rl] : OTHER_LANG
}

function convertLangNames(langs: ResLang[], to: 'zh' | 'en'): ResLang[] {
  return langs.map(l => {
    if (l.customName !== undefined || !l.name) return l
    const opt = LANGUAGE_OPTIONS.find(o => o.zh === l.name || o.en === l.name)
    return opt ? { ...l, name: opt[to] } : l
  })
}

function detectLang(text: string): 'zh' | 'en' {
  const cjk = (text.match(/[一-鿿]/g) ?? []).length
  return cjk / Math.max(text.length, 1) > 0.08 ? 'zh' : 'en'
}

function fromSaved(p: SavedResumeData): ResData {
  const lang = p.lang ?? detectLang(p.rawText ?? '')
  const summaryTypes = SUMMARY_TYPES[lang]
  return {
    name: p.name || '', jobTitle: p.jobTitle || '',
    email: p.email || '', phone: p.phone || '',
    location: p.location || '', linkedin: p.linkedin || '', website: p.website || '',
    summary: p.summary || '',
    summaryType: p.summaryType || summaryTypes[0],
    lang,
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
    languages: (p.languages || []).map(l => {
      const name = l.name || ''
      const isCustom = name !== '' && !LANGUAGE_OPTIONS.some(o => o.zh === name || o.en === name)
      return { id: genId(), name, level: l.level || '', customName: isCustom ? name : undefined }
    }),
    conferences: (p.conferences || []).map(c => ({ id: genId(), ...c })),
    activities: (p.activities || []).map(a => ({ id: genId(), ...a })),
    sectionOrder: p.sectionOrder ?? DEFAULT_SECTION_ORDER,
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
    ...d.conferences.map(c => `${c.name} ${c.organizer}`),
    ...d.activities.map(a => `${a.name} ${a.organization}`),
  ].filter(Boolean).join('\n')
  return {
    name: d.name, email: d.email, phone: d.phone,
    jobTitle: d.jobTitle, location: d.location, linkedin: d.linkedin, website: d.website,
    summary: d.summary, summaryType: d.summaryType, lang: d.lang,
    skills: d.skills,
    experiences: d.experiences.map(e => ({ company: e.company, title: e.title, description: e.description, startDate: e.startDate, endDate: e.endDate, current: e.current })),
    education: d.education.map(e => ({ school: e.school, degree: e.degree, major: e.major, year: e.endDate, startDate: e.startDate, endDate: e.endDate })),
    languages: d.languages.map(l => ({ name: l.name, level: l.level })),
    conferences: d.conferences.map(c => ({ name: c.name, organizer: c.organizer, date: c.date, role: c.role, description: c.description })),
    activities: d.activities.map(a => ({ name: a.name, organization: a.organization, date: a.date, role: a.role, description: a.description })),
    sectionOrder: d.sectionOrder,
    rawText,
  }
}

function toPreview(d: ResData): PreviewData {
  return {
    name: d.name, jobTitle: d.jobTitle,
    email: d.email, phone: d.phone, location: d.location,
    linkedin: d.linkedin, website: d.website,
    summary: d.summary, summaryType: d.summaryType,
    lang: d.lang,
    skills: d.skills,
    experiences: d.experiences,
    education: d.education,
    languages: d.languages,
    conferences: d.conferences,
    activities: d.activities,
    sectionOrder: d.sectionOrder,
  }
}

// ── Shared input styles ───────────────────────────────────────────────────────

const INP = 'w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none'
const LBL = 'block text-xs font-medium text-ink-500 mb-1'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className={LBL}>{label}</label>{children}</div>
}

// ── Sortable tab item ─────────────────────────────────────────────────────────

function SortableTab({ id, label, active, onClick }: { id: SectionId; label: string; active: boolean; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="flex items-center mb-0.5">
      <span {...attributes} {...listeners}
        className="cursor-grab px-1 text-ink-300 hover:text-ink-400 text-sm select-none shrink-0" title="拖曳排序">
        ⠿
      </span>
      <button onClick={onClick}
        className={`flex-1 py-2 px-2 text-left text-xs font-medium rounded-md transition-colors truncate ${active ? 'bg-terra-50 text-terra-600' : 'text-ink-500 hover:bg-cream-200 hover:text-ink-700'}`}>
        {label}
      </button>
    </div>
  )
}

// ── Sortable conference/activity row ──────────────────────────────────────────

function SortableConfRow({ conf, lang, onUpdate, onRemove }: { conf: ResConference; lang: 'zh' | 'en'; onUpdate: (id: string, f: keyof ResConference, v: string) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: conf.id })
  const roles = CONF_ROLES[lang]
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span {...attributes} {...listeners} className="cursor-grab text-ink-300 hover:text-ink-400 text-sm select-none">⠿</span>
        <p className="flex-1 text-xs font-semibold text-ink-600">{lang === 'zh' ? '會議' : 'Conference'}</p>
        <button onClick={() => onRemove(conf.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕</button>
      </div>
      <Field label={lang === 'zh' ? '會議名稱' : 'Conference Name'}>
        <input className={INP} value={conf.name} onChange={e => onUpdate(conf.id, 'name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={lang === 'zh' ? '主辦單位' : 'Organizer'}>
          <input className={INP} value={conf.organizer} onChange={e => onUpdate(conf.id, 'organizer', e.target.value)} />
        </Field>
        <Field label={lang === 'zh' ? '日期' : 'Date'}>
          <input className={INP} type="month" value={conf.date} onChange={e => onUpdate(conf.id, 'date', e.target.value)} />
        </Field>
      </div>
      <Field label={lang === 'zh' ? '角色' : 'Role'}>
        <select className={INP} value={conf.role} onChange={e => onUpdate(conf.id, 'role', e.target.value)}>
          <option value="">{lang === 'zh' ? '請選擇' : 'Select'}</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>
      <Field label={lang === 'zh' ? '說明' : 'Description'}>
        <textarea className={INP + ' resize-none'} rows={2} value={conf.description} onChange={e => onUpdate(conf.id, 'description', e.target.value)} />
      </Field>
    </div>
  )
}

function SortableActRow({ act, lang, onUpdate, onRemove }: { act: ResActivity; lang: 'zh' | 'en'; onUpdate: (id: string, f: keyof ResActivity, v: string) => void; onRemove: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: act.id })
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span {...attributes} {...listeners} className="cursor-grab text-ink-300 hover:text-ink-400 text-sm select-none">⠿</span>
        <p className="flex-1 text-xs font-semibold text-ink-600">{lang === 'zh' ? '活動' : 'Activity'}</p>
        <button onClick={() => onRemove(act.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕</button>
      </div>
      <Field label={lang === 'zh' ? '活動名稱' : 'Activity Name'}>
        <input className={INP} value={act.name} onChange={e => onUpdate(act.id, 'name', e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label={lang === 'zh' ? '組織' : 'Organization'}>
          <input className={INP} value={act.organization} onChange={e => onUpdate(act.id, 'organization', e.target.value)} />
        </Field>
        <Field label={lang === 'zh' ? '日期' : 'Date'}>
          <input className={INP} type="month" value={act.date} onChange={e => onUpdate(act.id, 'date', e.target.value)} />
        </Field>
      </div>
      <Field label={lang === 'zh' ? '角色' : 'Role'}>
        <input className={INP} value={act.role} onChange={e => onUpdate(act.id, 'role', e.target.value)} placeholder={lang === 'zh' ? '例如：志工、幹部' : 'e.g. Volunteer, Leader'} />
      </Field>
      <Field label={lang === 'zh' ? '說明' : 'Description'}>
        <textarea className={INP + ' resize-none'} rows={2} value={act.description} onChange={e => onUpdate(act.id, 'description', e.target.value)} />
      </Field>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const A4_WIDTH = 794

export function ResumeEditor({ initialData, initialName, onSave, onBack, onScoreUpdate }: ResumeEditorProps) {
  const [resume, setResume]           = useState<ResData>(() => fromSaved(initialData))
  const [resumeName, setResumeName]   = useState(initialName)
  const [editingName, setEditingName] = useState(false)
  const [section, setSection]         = useState<SectionId>('personal')
  const [template, setTemplate]       = useState<TemplateId>('classic')
  const [mobileView, setMobileView]   = useState<'edit' | 'preview'>('edit')
  const [fullPreview, setFullPreview] = useState(false)
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [scoring, setScoring]         = useState(false)
  const [scoreResult, setScoreResult] = useState<ScoreReport | null>(null)
  const [showScoreDrawer, setShowScoreDrawer] = useState(false)
  const [generatingSummary, setGeneratingSummary] = useState(false)
  const [optimizingId, setOptimizingId]           = useState<string | null>(null)
  const [newSkill, setNewSkill]       = useState('')
  const [previewScale, setPreviewScale] = useState(0.7)

  const previewRef          = useRef<HTMLDivElement>(null)
  const previewContainerRef = useRef<HTMLDivElement>(null)
  const nameInputRef        = useRef<HTMLInputElement>(null)

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor))

  useEffect(() => {
    const update = () => {
      if (!previewContainerRef.current) return
      setPreviewScale(Math.min(1, (previewContainerRef.current.clientWidth - 32) / A4_WIDTH))
    }
    update()
    const ro = new ResizeObserver(update)
    if (previewContainerRef.current) ro.observe(previewContainerRef.current)
    return () => ro.disconnect()
  }, [fullPreview])

  useEffect(() => { if (editingName) nameInputRef.current?.focus() }, [editingName])

  // ── Updaters ────────────────────────────────────────────────────────────────

  const upd = useCallback(<K extends keyof ResData>(field: K, value: ResData[K]) => {
    setResume(p => ({ ...p, [field]: value })); setSaved(false)
  }, [])

  function updExp(id: string, f: keyof ResExp, v: string | boolean) {
    upd('experiences', resume.experiences.map(e => e.id === id ? { ...e, [f]: v } : e))
  }
  function addExp() { upd('experiences', [...resume.experiences, { id: genId(), company: '', title: '', startDate: '', endDate: '', current: false, description: '' }]) }
  function removeExp(id: string) { upd('experiences', resume.experiences.filter(e => e.id !== id)) }

  function updEdu(id: string, f: keyof ResEdu, v: string) {
    upd('education', resume.education.map(e => e.id === id ? { ...e, [f]: v } : e))
  }
  function addEdu() { upd('education', [...resume.education, { id: genId(), school: '', major: '', degree: '', startDate: '', endDate: '' }]) }
  function removeEdu(id: string) { upd('education', resume.education.filter(e => e.id !== id)) }

  function updLang(id: string, f: keyof ResLang, v: string) {
    upd('languages', resume.languages.map(l => l.id === id ? { ...l, [f]: v } : l))
  }
  function addLang() {
    const defaultName = resume.lang === 'zh' ? LANGUAGE_OPTIONS[0].zh : LANGUAGE_OPTIONS[0].en
    upd('languages', [...resume.languages, { id: genId(), name: defaultName, level: LANG_LEVELS[resume.lang][2], customName: undefined }])
  }
  function removeLang(id: string) { upd('languages', resume.languages.filter(l => l.id !== id)) }

  function handleLangDropdown(id: string, value: string) {
    if (value === OTHER_LANG) {
      const existing = resume.languages.find(l => l.id === id)
      const prev = existing?.customName ?? ''
      upd('languages', resume.languages.map(l => l.id === id ? { ...l, name: prev, customName: prev } : l))
    } else {
      upd('languages', resume.languages.map(l => l.id === id ? { ...l, name: value, customName: undefined } : l))
    }
  }
  function handleCustomLangName(id: string, value: string) {
    upd('languages', resume.languages.map(l => l.id === id ? { ...l, name: value, customName: value } : l))
  }

  function updConf(id: string, f: keyof ResConference, v: string) {
    upd('conferences', resume.conferences.map(c => c.id === id ? { ...c, [f]: v } : c))
  }
  function addConf() { upd('conferences', [...resume.conferences, { id: genId(), name: '', organizer: '', date: '', role: '', description: '' }]) }
  function removeConf(id: string) { upd('conferences', resume.conferences.filter(c => c.id !== id)) }

  function updAct(id: string, f: keyof ResActivity, v: string) {
    upd('activities', resume.activities.map(a => a.id === id ? { ...a, [f]: v } : a))
  }
  function addAct() { upd('activities', [...resume.activities, { id: genId(), name: '', organization: '', date: '', role: '', description: '' }]) }
  function removeAct(id: string) { upd('activities', resume.activities.filter(a => a.id !== id)) }

  function addSkill() {
    const s = newSkill.trim(); if (!s || resume.skills.includes(s)) return
    upd('skills', [...resume.skills, s]); setNewSkill('')
  }
  function removeSkill(s: string) { upd('skills', resume.skills.filter(k => k !== s)) }

  // Section drag end (tab reorder)
  function handleSectionDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      upd('sectionOrder', arrayMove(resume.sectionOrder, resume.sectionOrder.indexOf(active.id as SectionId), resume.sectionOrder.indexOf(over.id as SectionId)))
    }
  }

  // Conference drag end
  function handleConfDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      upd('conferences', arrayMove(resume.conferences, resume.conferences.findIndex(c => c.id === active.id), resume.conferences.findIndex(c => c.id === over.id)))
    }
  }

  // Activity drag end
  function handleActDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (over && active.id !== over.id) {
      upd('activities', arrayMove(resume.activities, resume.activities.findIndex(a => a.id === active.id), resume.activities.findIndex(a => a.id === over.id)))
    }
  }

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
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff', width: A4_WIDTH, height: el.scrollHeight, logging: false })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = 210; const pdfH = (canvas.height / canvas.width) * pdfW; const pageH = 297
      const imgData = canvas.toDataURL('image/png')
      if (pdfH <= pageH) {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH)
      } else {
        let y = 0; let rem = pdfH
        while (rem > 0) { if (y > 0) pdf.addPage(); pdf.addImage(imgData, 'PNG', 0, -y, pdfW, pdfH); y += pageH; rem -= pageH }
      }
      pdf.save(`${resume.name || '履歷'}-${new Date().toISOString().slice(0, 10)}.pdf`)
    } catch (e) { console.error(e) }
    finally { setDownloading(false) }
  }

  async function handleScore() {
    setScoring(true)
    try {
      const res = await fetch('/api/resume/score', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: toSaved(resume).rawText, lang: resume.lang }),
      })
      const data = await res.json()
      if (!data.error) {
        setScoreResult(data as ScoreReport)
        setShowScoreDrawer(true)
        const scoredAt = new Date().toISOString()
        onScoreUpdate?.(data.score, data.atsScore, scoredAt)
      }
    } catch { /* silent */ }
    finally { setScoring(false) }
  }

  async function handleGenerateSummary() {
    setGeneratingSummary(true)
    try {
      const res = await fetch('/api/resume/summary', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: resume.name, jobTitle: resume.jobTitle, skills: resume.skills, experiences: resume.experiences, lang: resume.lang, summaryType: resume.summaryType }),
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
        body: JSON.stringify({ title: exp.title, company: exp.company, description: exp.description, lang: resume.lang }),
      })
      const data = await res.json()
      if (data.description) updExp(id, 'description', data.description)
    } catch { /* silent */ }
    finally { setOptimizingId(null) }
  }

  // ── Edit panel ────────────────────────────────────────────────────────────────

  const labels = SECTION_LABELS[resume.lang]
  const summaryTypes = SUMMARY_TYPES[resume.lang]
  const langLevels = LANG_LEVELS[resume.lang]

  const editPanel = (
    <div className="h-full flex overflow-hidden">
      {/* Sortable vertical section list */}
      <div className="w-[108px] shrink-0 bg-cream-100 border-r border-warm-200 overflow-y-auto py-3 px-1.5">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleSectionDragEnd}>
          <SortableContext items={resume.sectionOrder} strategy={verticalListSortingStrategy}>
            {resume.sectionOrder.map(id => (
              <SortableTab key={id} id={id} label={labels[id]} active={section === id} onClick={() => setSection(id)} />
            ))}
          </SortableContext>
        </DndContext>
      </div>

      {/* Section content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">

        {/* ── Personal Info ── */}
        {section === 'personal' && (
          <>
            <Field label={resume.lang === 'zh' ? '姓名' : 'Full Name'}><input className={INP} value={resume.name} onChange={e => upd('name', e.target.value)} /></Field>
            <Field label={resume.lang === 'zh' ? '職稱' : 'Job Title'}><input className={INP} value={resume.jobTitle} onChange={e => upd('jobTitle', e.target.value)} /></Field>
            <Field label={resume.lang === 'zh' ? '電子郵件' : 'Email'}><input className={INP} type="email" value={resume.email} onChange={e => upd('email', e.target.value)} /></Field>
            <Field label={resume.lang === 'zh' ? '電話' : 'Phone'}><input className={INP} value={resume.phone} onChange={e => upd('phone', e.target.value)} /></Field>
            <Field label={resume.lang === 'zh' ? '地點' : 'Location'}><input className={INP} value={resume.location} onChange={e => upd('location', e.target.value)} /></Field>
            <Field label="LinkedIn"><input className={INP} value={resume.linkedin} onChange={e => upd('linkedin', e.target.value)} /></Field>
            <Field label={resume.lang === 'zh' ? '個人網站' : 'Website'}><input className={INP} value={resume.website} onChange={e => upd('website', e.target.value)} /></Field>
          </>
        )}

        {/* ── Summary ── */}
        {section === 'summary' && (
          <>
            {/* Subtype selector */}
            <div className="flex flex-wrap gap-1.5">
              {summaryTypes.map(t => (
                <button key={t} onClick={() => upd('summaryType', t)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-all ${resume.summaryType === t ? 'border-terra-400 bg-terra-50 text-terra-700 font-medium' : 'border-warm-200 text-ink-400 hover:border-warm-400'}`}>
                  {t}
                </button>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <label className={LBL + ' mb-0'}>{resume.summaryType}</label>
              <button onClick={handleGenerateSummary} disabled={generatingSummary}
                className="flex items-center gap-1.5 rounded-lg border border-terra-200 bg-terra-50 px-3 py-1.5 text-xs text-terra-600 hover:bg-terra-100 transition-all disabled:opacity-60">
                {generatingSummary ? <><SpinSm />{resume.lang === 'zh' ? 'AI 生成中...' : 'Generating...'}</> : `🤖 ${resume.lang === 'zh' ? 'AI 生成' : 'AI Generate'}`}
              </button>
            </div>
            <textarea className={INP + ' resize-none'} rows={8}
              value={resume.summary} onChange={e => upd('summary', e.target.value)} />
            <p className="text-[10px] text-ink-400">{resume.lang === 'zh' ? '建議 2-3 句話，約 60-100 字' : '2-3 sentences recommended'}</p>
          </>
        )}

        {/* ── Experience ── */}
        {section === 'experience' && (
          <div className="space-y-4">
            {resume.experiences.map((exp, idx) => (
              <div key={exp.id} className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-600">{labels.experience} {idx + 1}</p>
                  <button onClick={() => removeExp(exp.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕</button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={resume.lang === 'zh' ? '公司' : 'Company'}><input className={INP} value={exp.company} onChange={e => updExp(exp.id, 'company', e.target.value)} /></Field>
                  <Field label={resume.lang === 'zh' ? '職位' : 'Title'}><input className={INP} value={exp.title} onChange={e => updExp(exp.id, 'title', e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={resume.lang === 'zh' ? '開始日期' : 'Start'}>
                    <input className={INP} type="month" value={exp.startDate} onChange={e => updExp(exp.id, 'startDate', e.target.value)} />
                  </Field>
                  <Field label={resume.lang === 'zh' ? '結束日期' : 'End'}>
                    <input className={INP} type="month" value={exp.endDate} disabled={exp.current} onChange={e => updExp(exp.id, 'endDate', e.target.value)} />
                  </Field>
                </div>
                <label className="flex items-center gap-2 text-xs text-ink-500 cursor-pointer">
                  <input type="checkbox" checked={exp.current} onChange={e => { updExp(exp.id, 'current', e.target.checked); if (e.target.checked) updExp(exp.id, 'endDate', '') }} className="rounded border-warm-300" />
                  {resume.lang === 'zh' ? '目前在職中' : 'Currently working here'}
                </label>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className={LBL + ' mb-0'}>{resume.lang === 'zh' ? '工作描述' : 'Description'}</label>
                    <button onClick={() => handleOptimizeExp(exp.id)} disabled={optimizingId === exp.id}
                      className="flex items-center gap-1 rounded-md border border-terra-200 bg-terra-50 px-2 py-1 text-[10px] text-terra-600 hover:bg-terra-100 transition-all disabled:opacity-60">
                      {optimizingId === exp.id ? <><SpinSm />{resume.lang === 'zh' ? '優化中...' : 'Optimizing...'}</> : `🤖 ${resume.lang === 'zh' ? 'AI 優化' : 'AI Optimize'}`}
                    </button>
                  </div>
                  <textarea className={INP + ' resize-none'} rows={5} value={exp.description} onChange={e => updExp(exp.id, 'description', e.target.value)} />
                </div>
              </div>
            ))}
            <button onClick={addExp} className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ {resume.lang === 'zh' ? '新增工作經歷' : 'Add Experience'}
            </button>
          </div>
        )}

        {/* ── Education ── */}
        {section === 'education' && (
          <div className="space-y-4">
            {resume.education.map((edu, idx) => (
              <div key={edu.id} className="rounded-xl border border-warm-200 bg-white p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-600">{labels.education} {idx + 1}</p>
                  <button onClick={() => removeEdu(edu.id)} className="text-xs text-ink-300 hover:text-red-400 transition-colors">✕</button>
                </div>
                <Field label={resume.lang === 'zh' ? '學校名稱' : 'School'}><input className={INP} value={edu.school} onChange={e => updEdu(edu.id, 'school', e.target.value)} /></Field>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={resume.lang === 'zh' ? '科系' : 'Major'}><input className={INP} value={edu.major} onChange={e => updEdu(edu.id, 'major', e.target.value)} /></Field>
                  <Field label={resume.lang === 'zh' ? '學位' : 'Degree'}><input className={INP} value={edu.degree} onChange={e => updEdu(edu.id, 'degree', e.target.value)} /></Field>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Field label={resume.lang === 'zh' ? '入學' : 'Start'}><input className={INP} type="month" value={edu.startDate} onChange={e => updEdu(edu.id, 'startDate', e.target.value)} /></Field>
                  <Field label={resume.lang === 'zh' ? '畢業' : 'End'}><input className={INP} type="month" value={edu.endDate} onChange={e => updEdu(edu.id, 'endDate', e.target.value)} /></Field>
                </div>
              </div>
            ))}
            <button onClick={addEdu} className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ {resume.lang === 'zh' ? '新增學歷' : 'Add Education'}
            </button>
          </div>
        )}

        {/* ── Skills ── */}
        {section === 'skills' && (
          <>
            <div className="flex gap-2">
              <input className={INP} placeholder={resume.lang === 'zh' ? '輸入技能後按 Enter' : 'Type a skill then Enter'}
                value={newSkill} onChange={e => setNewSkill(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill() } }} />
              <button onClick={addSkill} className="shrink-0 rounded-lg bg-terra-500 px-4 py-2 text-sm font-medium text-white hover:bg-terra-700 transition-colors">
                {resume.lang === 'zh' ? '新增' : 'Add'}
              </button>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {resume.skills.map(s => (
                <div key={s} className="flex items-center gap-1 rounded-full border border-terra-200 bg-terra-50 pl-3 pr-2 py-1">
                  <span className="text-xs text-terra-700">{s}</span>
                  <button onClick={() => removeSkill(s)} className="text-terra-400 hover:text-red-400 text-xs ml-0.5 transition-colors">×</button>
                </div>
              ))}
              {resume.skills.length === 0 && <p className="text-sm text-ink-300">{resume.lang === 'zh' ? '尚未新增技能' : 'No skills added yet'}</p>}
            </div>
            {/* ── Skills library link ── */}
            <div className="mt-4 rounded-xl border border-warm-200 bg-cream-50 px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-ink-700">⚡ 管理我的技能庫</p>
                <p className="text-[11px] text-ink-400 mt-0.5">你的技能清單會同步用於：職缺匹配 · 技能落差分析 · 面試題目生成</p>
              </div>
              <Link href="/dashboard/skills"
                className="shrink-0 rounded-lg border border-warm-300 bg-white px-3 py-1.5 text-xs font-medium text-terra-600 hover:border-terra-300 hover:bg-terra-50 transition-all whitespace-nowrap">
                前往技能管理 →
              </Link>
            </div>
          </>
        )}

        {/* ── Languages ── */}
        {section === 'languages' && (
          <div className="space-y-3">
            {resume.languages.map((lang, idx) => {
              const dropValue = getLangDropValue(lang, resume.lang)
              const isCustom = lang.customName !== undefined
              return (
                <div key={lang.id} className="space-y-2">
                  <div className="flex items-end gap-2">
                    <div className="flex-1">
                      {idx === 0 && <label className={LBL}>{resume.lang === 'zh' ? '語言' : 'Language'}</label>}
                      <select
                        className={INP}
                        value={dropValue}
                        onChange={e => handleLangDropdown(lang.id, e.target.value)}
                      >
                        <option value="">{resume.lang === 'zh' ? '-- 請選擇 --' : '-- Select --'}</option>
                        {LANGUAGE_OPTIONS.map(opt => (
                          <option key={opt.key} value={resume.lang === 'zh' ? opt.zh : opt.en}>
                            {resume.lang === 'zh' ? `${opt.zh} / ${opt.en}` : opt.en}
                          </option>
                        ))}
                        <option value={OTHER_LANG}>{resume.lang === 'zh' ? '其他 / Other' : 'Other'}</option>
                      </select>
                    </div>
                    <div className="w-32">
                      {idx === 0 && <label className={LBL}>{resume.lang === 'zh' ? '熟練度' : 'Proficiency'}</label>}
                      <select className={INP} value={lang.level} onChange={e => updLang(lang.id, 'level', e.target.value)}>
                        {langLevels.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <button onClick={() => removeLang(lang.id)} className="mb-0.5 pb-2 text-ink-300 hover:text-red-400 transition-colors">✕</button>
                  </div>
                  {isCustom && (
                    <input
                      className={INP}
                      placeholder={resume.lang === 'zh' ? '請輸入語言名稱...' : 'Enter language name...'}
                      value={lang.name}
                      onChange={e => handleCustomLangName(lang.id, e.target.value)}
                    />
                  )}
                </div>
              )
            })}
            <button onClick={addLang} className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ {resume.lang === 'zh' ? '新增語言' : 'Add Language'}
            </button>
          </div>
        )}

        {/* ── Conferences ── */}
        {section === 'conferences' && (
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleConfDragEnd}>
              <SortableContext items={resume.conferences.map(c => c.id)} strategy={verticalListSortingStrategy}>
                {resume.conferences.map(conf => (
                  <SortableConfRow key={conf.id} conf={conf} lang={resume.lang} onUpdate={updConf} onRemove={removeConf} />
                ))}
              </SortableContext>
            </DndContext>
            <button onClick={addConf} className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ {resume.lang === 'zh' ? '新增會議' : 'Add Conference'}
            </button>
          </div>
        )}

        {/* ── Activities ── */}
        {section === 'activities' && (
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleActDragEnd}>
              <SortableContext items={resume.activities.map(a => a.id)} strategy={verticalListSortingStrategy}>
                {resume.activities.map(act => (
                  <SortableActRow key={act.id} act={act} lang={resume.lang} onUpdate={updAct} onRemove={removeAct} />
                ))}
              </SortableContext>
            </DndContext>
            <button onClick={addAct} className="w-full rounded-xl border-2 border-dashed border-warm-300 py-3 text-sm text-ink-400 hover:border-terra-300 hover:text-terra-500 transition-all">
              ＋ {resume.lang === 'zh' ? '新增活動' : 'Add Activity'}
            </button>
          </div>
        )}
      </div>
    </div>
  )

  const previewPanel = (
    <div className="h-full flex flex-col">
      {/* Preview controls */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-warm-200 bg-warm-100 shrink-0 gap-2 flex-wrap">
        <div className="flex gap-1 rounded-lg border border-warm-300 bg-white p-0.5 overflow-x-auto">
          {TEMPLATES.map(t => (
            <button key={t.id} onClick={() => setTemplate(t.id)}
              className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium transition-all ${template === t.id ? 'bg-cream-200 text-ink-800 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <button onClick={handleDownload} disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700 transition-colors disabled:opacity-60 shrink-0">
          {downloading ? <><SpinSm />匯出中</> : '↓ PDF'}
        </button>
      </div>
      {/* A4 area */}
      <div ref={previewContainerRef} className="flex-1 overflow-auto bg-warm-100 p-4 flex justify-center">
        <div style={{ width: `${A4_WIDTH * previewScale}px`, height: `${A4_WIDTH * 1.414 * previewScale}px`, flexShrink: 0 }}>
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
      <div className="flex items-center gap-2 px-4 py-3 border-b border-warm-200 bg-white shrink-0 flex-wrap">
        {!fullPreview && (
          <button onClick={onBack} className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-700 transition-colors whitespace-nowrap shrink-0">
            ← {resume.lang === 'zh' ? '返回' : 'Back'}
          </button>
        )}

        {/* Resume name */}
        <div className="flex-1 min-w-0">
          {editingName ? (
            <input ref={nameInputRef} className="w-full max-w-xs rounded-lg border border-terra-400 bg-cream-100 px-3 py-1.5 text-sm font-medium text-ink-800 focus:outline-none"
              value={resumeName} onChange={e => setResumeName(e.target.value)}
              onBlur={() => setEditingName(false)} onKeyDown={e => { if (e.key === 'Enter') setEditingName(false) }} />
          ) : (
            <button onClick={() => !fullPreview && setEditingName(true)}
              className="max-w-xs truncate rounded-lg px-3 py-1.5 text-sm font-medium text-ink-700 hover:bg-cream-200 transition-colors text-left">
              {resumeName || (resume.lang === 'zh' ? '點擊設定名稱' : 'Click to name')}
              {!fullPreview && <span className="ml-1.5 text-[10px] text-ink-300">✎</span>}
            </button>
          )}
        </div>

        {/* Language toggle */}
        {!fullPreview && (
          <div className="flex gap-0.5 rounded-lg border border-warm-200 bg-white p-0.5 shrink-0">
            {(['zh', 'en'] as const).map(l => (
              <button key={l} onClick={() => {
                setResume(prev => {
                  const updates: Partial<ResData> = {
                    lang: l,
                    languages: convertLangNames(prev.languages, l),
                  }
                  if (!SUMMARY_TYPES[l].includes(prev.summaryType)) updates.summaryType = SUMMARY_TYPES[l][0]
                  return { ...prev, ...updates }
                })
                setSaved(false)
              }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-all ${resume.lang === l ? 'bg-terra-50 text-terra-700' : 'text-ink-400 hover:text-ink-600'}`}>
                {l === 'zh' ? '中' : 'EN'}
              </button>
            ))}
          </div>
        )}

        {/* Preview mode toggle — all screen sizes */}
        <button onClick={() => setFullPreview(p => !p)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all shrink-0 ${fullPreview ? 'border-terra-400 bg-terra-50 text-terra-700' : 'border-warm-200 text-ink-500 hover:border-terra-300 hover:text-terra-600'}`}>
          {fullPreview ? '✕ 關閉預覽' : '👁 預覽'}
        </button>

        {/* Mobile edit/preview toggle */}
        {!fullPreview && (
          <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5 md:hidden shrink-0">
            {(['edit', 'preview'] as const).map(v => (
              <button key={v} onClick={() => setMobileView(v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${mobileView === v ? 'bg-cream-200 text-ink-800' : 'text-ink-400'}`}>
                {v === 'edit' ? (resume.lang === 'zh' ? '編輯' : 'Edit') : (resume.lang === 'zh' ? '預覽' : 'Preview')}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {scoreResult && !fullPreview && (
            <button onClick={() => setShowScoreDrawer(true)}
              className="hidden sm:flex items-center gap-2 rounded-lg border border-warm-200 bg-cream-100 px-3 py-1.5 hover:border-terra-300 transition-all">
              <span className="text-sm font-bold text-terra-500">{scoreResult.score}</span>
              <span className="text-xs text-ink-400">/ 100</span>
              <span className="text-xs text-terra-400 underline underline-offset-2">{resume.lang === 'zh' ? '查看報告' : 'View Report'}</span>
            </button>
          )}
          {!fullPreview && (
            <button onClick={handleScore} disabled={scoring}
              className="hidden sm:flex items-center gap-1.5 rounded-lg border border-warm-200 px-3 py-1.5 text-xs text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all disabled:opacity-60">
              {scoring ? <><SpinSm />{resume.lang === 'zh' ? '評分中' : 'Scoring'}</> : `🤖 ${resume.lang === 'zh' ? 'AI 評分' : 'AI Score'}`}
            </button>
          )}
          <button onClick={handleDownload} disabled={downloading}
            className="hidden sm:flex items-center gap-1.5 rounded-lg bg-sage-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sage-700 transition-colors disabled:opacity-60">
            {downloading ? <SpinSm /> : '↓'} PDF
          </button>
          {!fullPreview && (
            <Button variant={saved ? 'sage' : 'primary'} size="sm" onClick={handleSave} loading={saving}>
              {saved ? '✓ 已儲存' : (resume.lang === 'zh' ? '儲存' : 'Save')}
            </Button>
          )}
        </div>
      </div>

      {/* Main panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: edit (hidden in full preview mode) */}
        {!fullPreview && (
          <div className={`${mobileView === 'preview' ? 'hidden' : 'flex'} md:flex flex-col w-full md:w-[40%] bg-cream-100 border-r border-warm-200 overflow-hidden`}>
            {editPanel}
          </div>
        )}
        {/* Right: preview */}
        <div className={`${!fullPreview && mobileView === 'edit' ? 'hidden' : 'flex'} md:flex flex-col flex-1 overflow-hidden relative`}>
          {previewPanel}
        </div>
      </div>

      {/* Score report drawer */}
      {showScoreDrawer && scoreResult && (
        <ScoreDrawer
          report={scoreResult}
          lang={resume.lang}
          scoring={scoring}
          resumeText={toSaved(resume).rawText}
          onClose={() => setShowScoreDrawer(false)}
          onNavigate={(s) => { setShowScoreDrawer(false); setSection(s); if (fullPreview) setFullPreview(false) }}
          onRescore={() => { setShowScoreDrawer(false); handleScore() }}
        />
      )}
    </div>
  )
}

// ── Score Report Drawer ───────────────────────────────────────────────────────

const PRIORITY_META = {
  high:   { dot: '🔴', label: { zh: '高優先', en: 'High Priority' } },
  medium: { dot: '🟡', label: { zh: '中優先', en: 'Medium Priority' } },
  low:    { dot: '🟢', label: { zh: '低優先', en: 'Low Priority' } },
} as const

function gradeOf(score: number, lang: 'zh' | 'en') {
  if (score >= 90) return { icon: '🟢', text: lang === 'zh' ? '優秀，競爭力強'           : 'Excellent',                   color: 'text-sage-700 bg-sage-50 border-sage-200' }
  if (score >= 75) return { icon: '🟡', text: lang === 'zh' ? '良好，小幅優化可提升'     : 'Good — minor tweaks will help', color: 'text-honey-700 bg-honey-50 border-honey-200' }
  if (score >= 60) return { icon: '🟠', text: lang === 'zh' ? '待改善，建議優化後再投遞' : 'Needs Improvement',            color: 'text-terra-700 bg-terra-50 border-terra-200' }
  return           { icon: '🔴', text: lang === 'zh' ? '需大幅改善，建議重新整理'       : 'Needs Major Revision',          color: 'text-red-700 bg-red-50 border-red-200' }
}

function dimColor(score: number) {
  if (score >= 75) return 'bg-sage-500'
  if (score >= 50) return 'bg-honey-400'
  return 'bg-terra-500'
}

function DimBar({ label, score }: { label: string; score: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-ink-600">{label}</span>
        <span className="text-xs font-semibold text-ink-700">{score}</span>
      </div>
      <div className="h-2 rounded-full bg-warm-200 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${dimColor(score)}`} style={{ width: `${score}%` }} />
      </div>
    </div>
  )
}

function ScoreDrawer({
  report, lang, scoring, resumeText, onClose, onNavigate, onRescore,
}: {
  report: ScoreReport
  lang: 'zh' | 'en'
  scoring: boolean
  resumeText: string
  onClose: () => void
  onNavigate: (s: SectionId) => void
  onRescore: () => void
}) {
  const [reportLang, setReportLang] = useState<'zh' | 'en'>(lang)
  const [visible, setVisible] = useState(true)
  const [suggestions, setSuggestions] = useState<ScoreSuggestion[]>(report.suggestions)
  const [keywords, setKeywords] = useState<string[]>(report.keywords)
  const [suggestionsLang, setSuggestionsLang] = useState<'zh' | 'en'>(lang)
  const [regenerating, setRegenerating] = useState(false)

  const isZh = reportLang === 'zh'
  const grade = gradeOf(report.score, reportLang)

  async function switchLang(newLang: 'zh' | 'en') {
    if (newLang === reportLang) return
    setVisible(false)
    await new Promise<void>(r => setTimeout(r, 150))
    setReportLang(newLang)
    setVisible(true)
    if (newLang !== suggestionsLang) {
      setRegenerating(true)
      try {
        const res = await fetch('/api/resume/score', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resumeText, lang: newLang }),
        })
        const data = await res.json()
        if (!data.error) {
          setSuggestions(data.suggestions ?? [])
          setKeywords(data.keywords ?? [])
          setSuggestionsLang(newLang)
        }
      } catch { /* silent */ }
      finally { setRegenerating(false) }
    }
  }

  function downloadReport() {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const lm = 20, rm = 190, lh = 7
    let y = 20

    const line = (text: string, size = 11, bold = false) => {
      doc.setFontSize(size)
      doc.setFont('helvetica', bold ? 'bold' : 'normal')
      const lines = doc.splitTextToSize(text, rm - lm) as string[]
      lines.forEach((l: string) => { doc.text(l, lm, y); y += lh })
    }

    doc.setFontSize(18); doc.setFont('helvetica', 'bold')
    doc.text(isZh ? '履歷評分報告' : 'Resume Score Report', lm, y); y += 12

    line(`${isZh ? '總分' : 'Overall Score'}: ${report.score} / 100`, 13, true); y += 2
    line(`ATS ${isZh ? '分數' : 'Score'}: ${report.atsScore}`, 11)
    line(`${grade.icon} ${grade.text}`, 11); y += 6

    line(isZh ? '── 分項評分 ──' : '── Dimension Scores ──', 12, true); y += 2
    const dims: [string, number][] = [
      [isZh ? '內容完整度' : 'Content Completeness',  report.dimensions.content],
      [isZh ? 'ATS 關鍵字密度' : 'ATS Keyword Density', report.dimensions.keywords],
      [isZh ? '格式與可讀性' : 'Format & Readability', report.dimensions.format],
      [isZh ? '成就量化程度' : 'Quantified Impact',    report.dimensions.impact],
    ]
    dims.forEach(([k, v]) => { line(`  ${k}: ${v}`, 11) })
    y += 6

    line(isZh ? '── 優化建議 ──' : '── Optimization Suggestions ──', 12, true); y += 2
    suggestions.forEach((s, i) => {
      const p = PRIORITY_META[s.priority as 'high' | 'medium' | 'low']
      if (y > 260) { doc.addPage(); y = 20 }
      line(`${i + 1}. [${p.label[reportLang]}] ${s.issue}`, 11, true)
      line(`   → ${s.fix}`, 10)
      y += 2
    })

    if (keywords.length) {
      if (y > 250) { doc.addPage(); y = 20 }
      y += 4
      line(isZh ? '── 建議關鍵字 ──' : '── Suggested Keywords ──', 12, true); y += 2
      line(keywords.join('  ·  '), 10)
    }

    doc.save(isZh ? '履歷評分報告.pdf' : 'resume-score-report.pdf')
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-[60] bg-black/30" onClick={onClose} />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 bottom-0 z-[61] w-full max-w-[480px] bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-warm-200 shrink-0">
          <h2 className="text-base font-bold text-ink-800 flex-1">
            {isZh ? '📊 AI 評分報告' : '📊 AI Score Report'}
          </h2>
          {/* Language toggle */}
          <div className="flex rounded-lg overflow-hidden border border-warm-200 shrink-0">
            {(['zh', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={`px-2.5 py-1 text-xs font-medium transition-colors ${reportLang === l ? 'bg-terra-500 text-white' : 'bg-cream-200 text-ink-400 hover:text-ink-600'}`}
              >
                {l === 'zh' ? '中文' : 'EN'}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="text-ink-400 hover:text-ink-700 transition-colors text-lg leading-none shrink-0">✕</button>
        </div>

        {/* Scrollable body — fades on lang switch */}
        <div
          className={`flex-1 overflow-y-auto px-6 py-5 space-y-6 transition-opacity duration-150 ${visible ? 'opacity-100' : 'opacity-0'}`}
        >
          {/* ── Total score ── */}
          <div className="flex items-end gap-5">
            <div className="text-center">
              <div className="text-6xl font-black text-terra-500 leading-none tabular-nums">{report.score}</div>
              <div className="text-xs text-ink-400 mt-1">{isZh ? '總分 / 100' : 'Score / 100'}</div>
            </div>
            <div className="flex-1 space-y-2">
              <div className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${grade.color}`}>
                {grade.icon} {grade.text}
              </div>
              <div className="flex items-center gap-2 text-sm text-ink-500">
                <span className="font-medium text-ink-700">{report.atsScore}</span>
                <span>/ 100  {isZh ? 'ATS 分數' : 'ATS Score'}</span>
              </div>
            </div>
          </div>

          {/* ── Dimensions ── */}
          <div>
            <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">
              {isZh ? '分項評分' : 'Dimension Scores'}
            </h3>
            <div className="space-y-3">
              <DimBar label={isZh ? '內容完整度'    : 'Content Completeness'} score={report.dimensions.content} />
              <DimBar label={isZh ? 'ATS 關鍵字密度' : 'ATS Keyword Density'}  score={report.dimensions.keywords} />
              <DimBar label={isZh ? '格式與可讀性'   : 'Format & Readability'} score={report.dimensions.format} />
              <DimBar label={isZh ? '成就量化程度'   : 'Quantified Impact'}    score={report.dimensions.impact} />
            </div>
          </div>

          {/* ── Suggestions ── */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide flex-1">
                {isZh ? '具體優化建議' : 'Optimization Suggestions'}
              </h3>
              {regenerating && (
                <span className="flex items-center gap-1 text-[10px] text-terra-500">
                  <SpinSm />{isZh ? 'AI 重新生成中...' : 'Regenerating...'}
                </span>
              )}
            </div>
            <div className="space-y-3">
              {suggestions.map((s, i) => {
                const meta = PRIORITY_META[s.priority as 'high' | 'medium' | 'low'] ?? PRIORITY_META.medium
                return (
                  <div key={i} className="rounded-xl border border-warm-200 bg-cream-50 p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="text-sm">{meta.dot}</span>
                        <span className="text-[10px] font-semibold text-ink-500 uppercase">{meta.label[reportLang]}</span>
                      </div>
                      {s.section && (
                        <button onClick={() => onNavigate(s.section as SectionId)}
                          className="shrink-0 text-[10px] font-medium text-terra-600 border border-terra-200 bg-terra-50 rounded-md px-2 py-0.5 hover:bg-terra-100 transition-colors whitespace-nowrap">
                          {isZh ? '前往修正 →' : 'Go to fix →'}
                        </button>
                      )}
                    </div>
                    <p className="text-xs font-medium text-ink-700 mb-1">{s.issue}</p>
                    <p className="text-xs text-ink-500">→ {s.fix}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── Suggested keywords ── */}
          {keywords.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-2">
                {isZh ? '建議加入的關鍵字' : 'Suggested Keywords'}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {keywords.map((kw, i) => (
                  <span key={i} className="rounded-full border border-warm-300 bg-cream-100 px-2.5 py-1 text-xs text-ink-600">{kw}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="shrink-0 border-t border-warm-200 px-6 py-4 flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded-lg bg-terra-500 py-2.5 text-sm font-medium text-white hover:bg-terra-600 transition-colors">
            {isZh ? '開始編輯' : 'Start Editing'}
          </button>
          <button onClick={downloadReport}
            className="flex-1 rounded-lg border border-warm-300 bg-white py-2.5 text-sm font-medium text-ink-600 hover:bg-cream-100 transition-colors">
            {isZh ? '下載報告' : 'Download PDF'}
          </button>
          <button onClick={onRescore} disabled={scoring}
            className="flex-1 rounded-lg border border-warm-300 bg-white py-2.5 text-sm font-medium text-ink-600 hover:bg-cream-100 transition-colors disabled:opacity-50">
            {scoring
              ? <span className="flex items-center justify-center gap-1"><SpinSm />{isZh ? '評分中' : 'Scoring'}</span>
              : (isZh ? '重新評分' : 'Re-score')}
          </button>
        </div>
      </div>
    </>
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
