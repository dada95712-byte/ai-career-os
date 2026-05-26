'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy,
  useSortable, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// ── Types ──────────────────────────────────────────────────────────────────────

interface BasicInfo {
  nameZh: string; nameEn: string
  email: string; phone: string; address: string
  linkedinUrl: string; portfolioUrl: string; websiteUrl: string
}
interface EduEntry    { id: string; schoolName: string; degree: string; major: string; gpa: string; startDate: string; endDate: string; isCurrent: boolean; description: string }
interface ExpEntry    { id: string; company: string; title: string; location: string; startDate: string; endDate: string; isCurrent: boolean; description: string }
interface ProjEntry   { id: string; projectName: string; role: string; url: string; startDate: string; endDate: string; description: string }
interface LangEntry   { id: string; language: string; proficiency: string }
interface CertEntry   { id: string; name: string; issuer: string; issueDate: string; expiryDate: string; credentialUrl: string }
interface ActvEntry   { id: string; organization: string; role: string; startDate: string; endDate: string; description: string }
interface ConfEntry   { id: string; name: string; role: string; date: string; description: string }
interface CustomBlock { id: string; sectionTitle: string; content: string }
interface AttachEntry { id: string; fileName: string; fileUrl: string; fileType: string; description: string }

type ModalSection = 'education' | 'experience' | 'internship' | 'project' | 'certificate' | 'activity' | 'conference'
type ModalData = Record<string, string | boolean>

// ── Constants ──────────────────────────────────────────────────────────────────

const SKILL_CATS = ['專業技能', '工具與軟體', '核心職能', '軟實力', '語言能力', '證照與認證', '學習中'] as const

const PROFICIENCY = [
  { value: 'native', label: '母語' },
  { value: 'fluent', label: '流利' },
  { value: 'intermediate', label: '中等' },
  { value: 'basic', label: '基礎' },
]

const CONF_ROLES = [
  { value: 'attendee', label: '聽眾' },
  { value: 'speaker', label: '講者' },
  { value: 'organizer', label: '主辦' },
]

const NAV_SECTIONS = [
  { id: 'basic',       label: '基本資訊' },
  { id: 'education',   label: '學歷' },
  { id: 'experience',  label: '工作經歷' },
  { id: 'internship',  label: '實習經驗' },
  { id: 'project',     label: '專案經驗' },
  { id: 'skill',       label: '技能' },
  { id: 'language',    label: '語言能力' },
  { id: 'certificate', label: '證照' },
  { id: 'activity',    label: '社團活動' },
  { id: 'conference',  label: '會議' },
  { id: 'summary',     label: '自傳' },
  { id: 'attachment',  label: '作品附件' },
  { id: 'custom',      label: '自訂區塊' },
]

interface FieldDef { key: string; label: string; type: 'text' | 'textarea' | 'checkbox' | 'select'; options?: { value: string; label: string }[]; span?: 'full' | 'half' }

const SECTION_FIELDS: Record<ModalSection, FieldDef[]> = {
  education: [
    { key: 'schoolName', label: '學校名稱 *', type: 'text', span: 'full' },
    { key: 'degree',     label: '學位',       type: 'text', span: 'half' },
    { key: 'major',      label: '科系/主修',   type: 'text', span: 'half' },
    { key: 'gpa',        label: 'GPA',        type: 'text', span: 'half' },
    { key: 'startDate',  label: '開始 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'endDate',    label: '結束 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'isCurrent',  label: '目前就讀中', type: 'checkbox', span: 'half' },
    { key: 'description',label: '描述',       type: 'textarea', span: 'full' },
  ],
  experience: [
    { key: 'company',    label: '公司名稱 *', type: 'text', span: 'full' },
    { key: 'title',      label: '職稱',       type: 'text', span: 'half' },
    { key: 'location',   label: '地點',       type: 'text', span: 'half' },
    { key: 'startDate',  label: '開始 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'endDate',    label: '結束 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'isCurrent',  label: '目前在職',   type: 'checkbox', span: 'full' },
    { key: 'description',label: '工作描述',   type: 'textarea', span: 'full' },
  ],
  internship: [
    { key: 'company',    label: '公司名稱 *', type: 'text', span: 'full' },
    { key: 'title',      label: '職稱',       type: 'text', span: 'half' },
    { key: 'location',   label: '地點',       type: 'text', span: 'half' },
    { key: 'startDate',  label: '開始 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'endDate',    label: '結束 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'isCurrent',  label: '實習中',     type: 'checkbox', span: 'full' },
    { key: 'description',label: '工作描述',   type: 'textarea', span: 'full' },
  ],
  project: [
    { key: 'projectName',label: '專案名稱 *', type: 'text', span: 'full' },
    { key: 'role',       label: '角色/職責',  type: 'text', span: 'half' },
    { key: 'url',        label: '專案連結',   type: 'text', span: 'half' },
    { key: 'startDate',  label: '開始 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'endDate',    label: '結束 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'description',label: '描述',       type: 'textarea', span: 'full' },
  ],
  certificate: [
    { key: 'name',          label: '證照名稱 *', type: 'text', span: 'full' },
    { key: 'issuer',        label: '發行機構',   type: 'text', span: 'full' },
    { key: 'issueDate',     label: '取得日期',   type: 'text', span: 'half' },
    { key: 'expiryDate',    label: '到期日期',   type: 'text', span: 'half' },
    { key: 'credentialUrl', label: '認證連結',   type: 'text', span: 'full' },
  ],
  activity: [
    { key: 'organization', label: '社團/組織 *', type: 'text', span: 'full' },
    { key: 'role',         label: '職位/角色',   type: 'text', span: 'half' },
    { key: 'startDate',    label: '開始 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'endDate',      label: '結束 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'description',  label: '描述',         type: 'textarea', span: 'full' },
  ],
  conference: [
    { key: 'name',        label: '會議名稱 *', type: 'text', span: 'full' },
    { key: 'role',        label: '參與角色',   type: 'select', options: CONF_ROLES, span: 'half' },
    { key: 'date',        label: '日期 (YYYY-MM)', type: 'text', span: 'half' },
    { key: 'description', label: '描述',       type: 'textarea', span: 'full' },
  ],
}

const MODAL_DEFAULTS: Record<ModalSection, ModalData> = {
  education:   { schoolName: '', degree: '', major: '', gpa: '', startDate: '', endDate: '', isCurrent: false, description: '' },
  experience:  { company: '', title: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' },
  internship:  { company: '', title: '', location: '', startDate: '', endDate: '', isCurrent: false, description: '' },
  project:     { projectName: '', role: '', url: '', startDate: '', endDate: '', description: '' },
  certificate: { name: '', issuer: '', issueDate: '', expiryDate: '', credentialUrl: '' },
  activity:    { organization: '', role: '', startDate: '', endDate: '', description: '' },
  conference:  { name: '', role: 'attendee', date: '', description: '' },
}

const MODAL_TITLES: Record<ModalSection, string> = {
  education: '學歷', experience: '工作經歷', internship: '實習經驗',
  project: '專案經驗', certificate: '證照', activity: '社團活動', conference: '會議',
}

const EMPTY_BASIC: BasicInfo = { nameZh: '', nameEn: '', email: '', phone: '', address: '', linkedinUrl: '', portfolioUrl: '', websiteUrl: '' }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }

// ── Helper components ──────────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

function GripIcon() {
  return (
    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
      <circle cx="9" cy="5" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="9" cy="19" r="1.2"/>
      <circle cx="15" cy="5" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="15" cy="19" r="1.2"/>
    </svg>
  )
}

function SortableRow({ id, children }: { id: string; children: React.ReactNode }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id })
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}
      className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-3 py-2.5 group"
    >
      <button {...attributes} {...listeners} type="button"
        className="touch-none cursor-grab text-ink-200 hover:text-ink-400 shrink-0">
        <GripIcon />
      </button>
      {children}
    </div>
  )
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="py-6 text-center text-sm text-ink-300">{text}</p>
  )
}

function SectionCard({ title, id, children, onAdd, addLabel = '＋ 新增' }: {
  title: string; id: string; children: React.ReactNode
  onAdd?: () => void; addLabel?: string
}) {
  return (
    <div id={id} className="rounded-2xl border border-warm-200 bg-white p-5 md:p-6 scroll-mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-ink-800">{title}</h2>
        {onAdd && (
          <button type="button" onClick={onAdd}
            className="rounded-lg border border-warm-200 bg-cream-50 px-3 py-1 text-xs font-medium text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all">
            {addLabel}
          </button>
        )}
      </div>
      {children}
    </div>
  )
}

const inputCls = 'w-full rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-300 focus:border-terra-400 focus:outline-none transition-colors'
const labelCls = 'block text-xs font-medium text-ink-500 mb-1'

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProfileLibraryPage() {
  // ── Save status ──
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const save = useCallback((key: string, data: unknown) => {
    setSaveStatus('saving')
    clearTimeout(timers.current[key])
    timers.current[key] = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1000)
  }, [])

  // ── State ──
  const [basic,       setBasic]       = useState<BasicInfo>(EMPTY_BASIC)
  const [educations,  setEducations]  = useState<EduEntry[]>([])
  const [experiences, setExperiences] = useState<ExpEntry[]>([])
  const [internships, setInternships] = useState<ExpEntry[]>([])
  const [projects,    setProjects]    = useState<ProjEntry[]>([])
  const [languages,   setLanguages]   = useState<LangEntry[]>([])
  const [skillMap,    setSkillMap]    = useState<Record<string, string[]>>(() =>
    Object.fromEntries(SKILL_CATS.map((c) => [c, []]))
  )
  const [certificates, setCertificates] = useState<CertEntry[]>([])
  const [activities,   setActivities]   = useState<ActvEntry[]>([])
  const [conferences,  setConferences]  = useState<ConfEntry[]>([])
  const [summaryZh,    setSummaryZh]    = useState('')
  const [summaryEn,    setSummaryEn]    = useState('')
  const [attachments,  setAttachments]  = useState<AttachEntry[]>([])
  const [customBlocks, setCustomBlocks] = useState<CustomBlock[]>([])

  // ── Modal state ──
  const [modalSection, setModalSection] = useState<ModalSection | null>(null)
  const [modalData,    setModalData]    = useState<ModalData>({})
  const [editingId,    setEditingId]    = useState<string | null>(null)

  // ── Skill input state ──
  const [skillInputs, setSkillInputs] = useState<Record<string, string>>({})

  // ── Attachment upload ──
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Section refs for scroll ──
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({})
  function scrollTo(id: string) {
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  // ── Load from localStorage ──
  useEffect(() => {
    const load = <T,>(key: string, fallback: T): T => {
      try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : fallback } catch { return fallback }
    }
    setBasic(load('profile-basic', EMPTY_BASIC))
    setEducations(load('profile-education', []))
    setExperiences(load('profile-experience', []))
    setInternships(load('profile-internship', []))
    setProjects(load('profile-project', []))
    setLanguages(load('profile-language', []))
    setSkillMap(load('profile-skillmap', Object.fromEntries(SKILL_CATS.map((c) => [c, []]))))
    setCertificates(load('profile-certificate', []))
    setActivities(load('profile-activity', []))
    setConferences(load('profile-conference', []))
    setSummaryZh(load('profile-summary-zh', ''))
    setSummaryEn(load('profile-summary-en', ''))
    setAttachments(load('profile-attachment', []))
    setCustomBlocks(load('profile-custom', []))
  }, [])

  // ── Completeness ──
  const completeness = useMemo(() => {
    let f = 0, t = 0
    const basicKeys = ['nameZh','nameEn','email','phone','address','linkedinUrl','portfolioUrl','websiteUrl'] as const
    basicKeys.forEach((k) => { t++; if (basic[k]) f++ })
    const lists = [educations, experiences, internships, projects, certificates, activities, conferences]
    lists.forEach((l) => { t++; if (l.length > 0) f++ })
    t++; if (Object.values(skillMap).some((a) => a.length > 0)) f++
    t++; if (languages.length > 0) f++
    t++; if (summaryZh) f++
    t++; if (summaryEn) f++
    t++; if (attachments.length > 0) f++
    return Math.round((f / t) * 100)
  }, [basic, educations, experiences, internships, projects, certificates, activities, conferences, skillMap, languages, summaryZh, summaryEn, attachments])

  // ── DnD sensors ──
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  function makeDragEnd<T extends { id: string }>(
    items: T[], setter: (v: T[]) => void, key: string
  ) {
    return (e: DragEndEvent) => {
      const { active, over } = e
      if (!over || active.id === over.id) return
      const old = items.findIndex((i) => i.id === active.id)
      const next = arrayMove(items, old, items.findIndex((i) => i.id === over.id))
      setter(next); save(key, next)
    }
  }

  // ── Modal handlers ──
  function openAdd(section: ModalSection) {
    setModalSection(section); setEditingId(null); setModalData({ ...MODAL_DEFAULTS[section] })
  }
  function openEdit(section: ModalSection, item: Record<string, unknown>) {
    setModalSection(section); setEditingId(item.id as string); setModalData(item as ModalData)
  }

  function saveModal() {
    if (!modalSection) return
    const id = editingId ?? genId()
    const item = { ...modalData, id }

    function upsert<T extends { id: string }>(list: T[], setter: (v: T[]) => void, key: string) {
      const next = editingId
        ? list.map((e) => e.id === editingId ? item as T : e)
        : [...list, item as T]
      setter(next); save(key, next)
    }

    switch (modalSection) {
      case 'education':   upsert(educations,  setEducations,  'profile-education');  break
      case 'experience':  upsert(experiences, setExperiences, 'profile-experience'); break
      case 'internship':  upsert(internships, setInternships, 'profile-internship'); break
      case 'project':     upsert(projects,    setProjects,    'profile-project');    break
      case 'certificate': upsert(certificates,setCertificates,'profile-certificate');break
      case 'activity':    upsert(activities,  setActivities,  'profile-activity');   break
      case 'conference':  upsert(conferences, setConferences, 'profile-conference'); break
    }
    setModalSection(null)
  }

  function deleteItem<T extends { id: string }>(id: string, list: T[], setter: (v: T[]) => void, key: string) {
    const next = list.filter((e) => e.id !== id); setter(next); save(key, next)
  }

  // ── Basic field helpers ──
  function setBasicField(field: keyof BasicInfo, value: string) {
    const next = { ...basic, [field]: value }; setBasic(next); save('profile-basic', next)
  }

  // ── Skills ──
  function addSkill(cat: string) {
    const val = (skillInputs[cat] ?? '').trim()
    if (!val) return
    const next = { ...skillMap, [cat]: [...(skillMap[cat] ?? []), val] }
    setSkillMap(next); save('profile-skillmap', next)
    setSkillInputs((p) => ({ ...p, [cat]: '' }))
  }
  function removeSkill(cat: string, idx: number) {
    const next = { ...skillMap, [cat]: (skillMap[cat] ?? []).filter((_, i) => i !== idx) }
    setSkillMap(next); save('profile-skillmap', next)
  }

  // ── Language ──
  function addLanguage() {
    const next: LangEntry = { id: genId(), language: '', proficiency: 'intermediate' }
    const list = [...languages, next]; setLanguages(list); save('profile-language', list)
  }
  function setLangField(id: string, field: keyof LangEntry, value: string) {
    const next = languages.map((l) => l.id === id ? { ...l, [field]: value } : l)
    setLanguages(next); save('profile-language', next)
  }

  // ── Custom blocks ──
  function addCustomBlock() {
    const next: CustomBlock = { id: genId(), sectionTitle: '', content: '' }
    const list = [...customBlocks, next]; setCustomBlocks(list); save('profile-custom', list)
  }
  function setCustomField(id: string, field: keyof CustomBlock, value: string) {
    const next = customBlocks.map((b) => b.id === id ? { ...b, [field]: value } : b)
    setCustomBlocks(next); save('profile-custom', next)
  }

  // ── Attachment upload ──
  async function handleAttachmentUpload(file: File) {
    setUploading(true)
    const form = new FormData(); form.append('file', file)
    try {
      const res = await fetch('/api/profile/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) { alert(data.error ?? '上傳失敗'); return }
      const entry: AttachEntry = { id: genId(), fileName: data.fileName ?? file.name, fileUrl: data.url, fileType: data.fileType ?? file.type, description: '' }
      const next = [...attachments, entry]; setAttachments(next); save('profile-attachment', next)
    } catch { alert('上傳失敗') }
    finally { setUploading(false) }
  }

  // ── Save all (manual button) ──
  function saveAll() {
    setSaveStatus('saving')
    try {
      localStorage.setItem('profile-basic',       JSON.stringify(basic))
      localStorage.setItem('profile-education',   JSON.stringify(educations))
      localStorage.setItem('profile-experience',  JSON.stringify(experiences))
      localStorage.setItem('profile-internship',  JSON.stringify(internships))
      localStorage.setItem('profile-project',     JSON.stringify(projects))
      localStorage.setItem('profile-language',    JSON.stringify(languages))
      localStorage.setItem('profile-skillmap',    JSON.stringify(skillMap))
      localStorage.setItem('profile-certificate', JSON.stringify(certificates))
      localStorage.setItem('profile-activity',    JSON.stringify(activities))
      localStorage.setItem('profile-conference',  JSON.stringify(conferences))
      localStorage.setItem('profile-summary-zh',  JSON.stringify(summaryZh))
      localStorage.setItem('profile-summary-en',  JSON.stringify(summaryEn))
      localStorage.setItem('profile-attachment',  JSON.stringify(attachments))
      localStorage.setItem('profile-custom',      JSON.stringify(customBlocks))
    } catch { /* quota */ }
    setSaveStatus('saved')
    setTimeout(() => setSaveStatus('idle'), 2000)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-full">

      {/* ── Left sticky nav (desktop) ── */}
      <aside className="hidden md:block w-48 shrink-0">
        <div className="sticky top-0 h-screen overflow-y-auto pt-6 pb-8 pl-3 pr-2">
          <p className="px-2 pb-3 text-[10px] font-semibold uppercase tracking-widest text-ink-300">區塊導覽</p>
          <ul className="space-y-0.5">
            {NAV_SECTIONS.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => scrollTo(s.id)}
                  className="w-full text-left rounded-lg px-3 py-1.5 text-xs text-ink-500 hover:text-terra-600 hover:bg-terra-50/60 transition-all">
                  {s.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0 px-4 md:px-8 py-6 space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-ink-900">個人檔案庫</h1>
            <p className="mt-1 text-xs md:text-sm text-ink-400">你的職涯原始資料，建立履歷時自動引用</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {saveStatus !== 'idle' && (
              <span className={`flex items-center gap-1.5 text-xs font-medium ${saveStatus === 'saved' ? 'text-sage-600' : 'text-ink-400'}`}>
                {saveStatus === 'saving' ? <><Spinner className="h-3 w-3" />儲存中</> : '✓ 已儲存'}
              </span>
            )}
            <button onClick={saveAll}
              className="rounded-xl bg-terra-500 px-4 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]">
              儲存所有變更
            </button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="rounded-2xl border border-warm-200 bg-white p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-ink-600">資料完整度</span>
            <span className="text-sm font-bold text-terra-600">{completeness}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-warm-100 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness}%`, background: completeness >= 80 ? '#7FA887' : '#C97941' }} />
          </div>
        </div>

        {/* Mobile section tabs */}
        <div className="md:hidden flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {NAV_SECTIONS.map((s) => (
            <button key={s.id} onClick={() => scrollTo(s.id)}
              className="shrink-0 rounded-full border border-warm-200 bg-white px-3 py-1 text-xs text-ink-500 whitespace-nowrap hover:border-terra-300 hover:text-terra-600 transition-all">
              {s.label}
            </button>
          ))}
        </div>

        {/* ════ BASIC INFO ════ */}
        <div ref={(el) => { sectionRefs.current['basic'] = el }}>
          <SectionCard id="basic" title="基本資訊">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {([
                ['nameZh', '中文姓名'], ['nameEn', '英文姓名'],
                ['email',  'Email'],    ['phone',  '電話'],
              ] as [keyof BasicInfo, string][]).map(([k, l]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <input className={inputCls} value={basic[k]} placeholder={l}
                    onChange={(e) => setBasicField(k, e.target.value)} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className={labelCls}>地址</label>
                <input className={inputCls} value={basic.address} placeholder="居住地址（選填）"
                  onChange={(e) => setBasicField('address', e.target.value)} />
              </div>
              {([
                ['linkedinUrl',  'LinkedIn URL'],
                ['portfolioUrl', '作品集 URL'],
                ['websiteUrl',   '個人網站'],
              ] as [keyof BasicInfo, string][]).map(([k, l]) => (
                <div key={k}>
                  <label className={labelCls}>{l}</label>
                  <input className={inputCls} value={basic[k]} placeholder="https://..."
                    onChange={(e) => setBasicField(k, e.target.value)} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ════ LIST SECTIONS ════ */}
        {(
          [
            { key: 'education',   label: '學歷',    section: 'education'   as ModalSection, items: educations,  setter: setEducations,  lsKey: 'profile-education' },
            { key: 'experience',  label: '工作經歷', section: 'experience'  as ModalSection, items: experiences, setter: setExperiences, lsKey: 'profile-experience' },
            { key: 'internship',  label: '實習經驗', section: 'internship'  as ModalSection, items: internships, setter: setInternships, lsKey: 'profile-internship' },
            { key: 'project',     label: '專案經驗', section: 'project'     as ModalSection, items: projects,    setter: setProjects,    lsKey: 'profile-project' },
          ] as const
        ).map(({ key, label, section, items, setter, lsKey }) => (
          <div key={key} ref={(el) => { sectionRefs.current[key] = el }}>
            <SectionCard id={key} title={label} onAdd={() => openAdd(section)}>
              <DndContext sensors={sensors} collisionDetection={closestCenter}
                onDragEnd={makeDragEnd(items as { id: string }[], setter as (v: { id: string }[]) => void, lsKey)}>
                <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {items.length === 0 && <EmptyHint text={`尚未新增${label}`} />}
                    {items.map((item) => {
                      const edu = item as EduEntry
                      const exp = item as ExpEntry
                      const proj = item as ProjEntry
                      const primary = edu.schoolName ?? exp.company ?? proj.projectName ?? ''
                      const secondary = [edu.degree ?? exp.title ?? proj.role, edu.major ?? exp.location ?? ''].filter(Boolean).join(' · ')
                      const dates = [item.startDate ?? '', (item as EduEntry).isCurrent ? '至今' : (item.endDate ?? '')].filter(Boolean).join(' ~ ')
                      return (
                        <SortableRow key={item.id} id={item.id}>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-ink-700 truncate">{primary}</p>
                            <p className="text-xs text-ink-400 truncate">{[secondary, dates].filter(Boolean).join('  ·  ')}</p>
                          </div>
                          <button type="button" onClick={() => openEdit(section, item as unknown as Record<string, unknown>)}
                            className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-terra-300 hover:text-terra-600 transition-all">編輯</button>
                          <button type="button" onClick={() => deleteItem(item.id, items as {id:string}[], setter as (v:{id:string}[])=>void, lsKey)}
                            className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                        </SortableRow>
                      )
                    })}
                  </div>
                </SortableContext>
              </DndContext>
            </SectionCard>
          </div>
        ))}

        {/* ════ SKILL ════ */}
        <div ref={(el) => { sectionRefs.current['skill'] = el }}>
          <SectionCard id="skill" title="技能">
            <div className="space-y-4">
              {SKILL_CATS.map((cat) => (
                <div key={cat}>
                  <p className="text-xs font-semibold text-ink-500 mb-2">{cat}</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {(skillMap[cat] ?? []).map((skill, idx) => (
                      <span key={idx} className="flex items-center gap-1 rounded-full border border-terra-200 bg-terra-50 px-2.5 py-0.5 text-xs text-terra-700">
                        {skill}
                        <button type="button" onClick={() => removeSkill(cat, idx)}
                          className="text-terra-400 hover:text-red-400 leading-none">×</button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input
                      className="flex-1 rounded-xl border border-warm-200 bg-cream-50 px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-300 focus:border-terra-400 focus:outline-none"
                      placeholder={`新增${cat}...`}
                      value={skillInputs[cat] ?? ''}
                      onChange={(e) => setSkillInputs((p) => ({ ...p, [cat]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(cat) } }}
                    />
                    <button type="button" onClick={() => addSkill(cat)}
                      className="rounded-xl border border-warm-200 bg-cream-50 px-3 py-1.5 text-xs text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all">新增</button>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ════ LANGUAGE ════ */}
        <div ref={(el) => { sectionRefs.current['language'] = el }}>
          <SectionCard id="language" title="語言能力" onAdd={addLanguage} addLabel="＋ 新增語言">
            <div className="space-y-2">
              {languages.length === 0 && <EmptyHint text="尚未新增語言能力" />}
              {languages.map((lang) => (
                <div key={lang.id} className="flex items-center gap-3 rounded-xl border border-warm-200 bg-cream-50 px-3 py-2.5">
                  <input className="flex-1 bg-transparent text-sm text-ink-800 placeholder:text-ink-300 outline-none"
                    placeholder="語言名稱（如：中文、英文、日文）"
                    value={lang.language}
                    onChange={(e) => setLangField(lang.id, 'language', e.target.value)} />
                  <select
                    value={lang.proficiency}
                    onChange={(e) => setLangField(lang.id, 'proficiency', e.target.value)}
                    className="rounded-lg border border-warm-200 bg-white px-2 py-1 text-xs text-ink-600 focus:border-terra-400 focus:outline-none">
                    {PROFICIENCY.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                  <button type="button"
                    onClick={() => { const next = languages.filter((l) => l.id !== lang.id); setLanguages(next); save('profile-language', next) }}
                    className="text-ink-200 hover:text-red-400 transition-colors text-lg leading-none">×</button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ════ CERTIFICATE ════ */}
        <div ref={(el) => { sectionRefs.current['certificate'] = el }}>
          <SectionCard id="certificate" title="證照" onAdd={() => openAdd('certificate')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragEnd={makeDragEnd(certificates, setCertificates, 'profile-certificate')}>
              <SortableContext items={certificates.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {certificates.length === 0 && <EmptyHint text="尚未新增證照" />}
                  {certificates.map((cert) => (
                    <SortableRow key={cert.id} id={cert.id}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-700 truncate">{cert.name}</p>
                        <p className="text-xs text-ink-400 truncate">{[cert.issuer, cert.issueDate].filter(Boolean).join('  ·  ')}</p>
                      </div>
                      <button type="button" onClick={() => openEdit('certificate', cert as unknown as Record<string, unknown>)}
                        className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-terra-300 hover:text-terra-600 transition-all">編輯</button>
                      <button type="button" onClick={() => deleteItem(cert.id, certificates, setCertificates, 'profile-certificate')}
                        className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </SectionCard>
        </div>

        {/* ════ ACTIVITY ════ */}
        <div ref={(el) => { sectionRefs.current['activity'] = el }}>
          <SectionCard id="activity" title="社團活動" onAdd={() => openAdd('activity')}>
            <DndContext sensors={sensors} collisionDetection={closestCenter}
              onDragEnd={makeDragEnd(activities, setActivities, 'profile-activity')}>
              <SortableContext items={activities.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {activities.length === 0 && <EmptyHint text="尚未新增社團活動" />}
                  {activities.map((act) => (
                    <SortableRow key={act.id} id={act.id}>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-700 truncate">{act.organization}</p>
                        <p className="text-xs text-ink-400 truncate">{[act.role, act.startDate && act.endDate ? `${act.startDate} ~ ${act.endDate}` : ''].filter(Boolean).join('  ·  ')}</p>
                      </div>
                      <button type="button" onClick={() => openEdit('activity', act as unknown as Record<string, unknown>)}
                        className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-terra-300 hover:text-terra-600 transition-all">編輯</button>
                      <button type="button" onClick={() => deleteItem(act.id, activities, setActivities, 'profile-activity')}
                        className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                    </SortableRow>
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </SectionCard>
        </div>

        {/* ════ CONFERENCE ════ */}
        <div ref={(el) => { sectionRefs.current['conference'] = el }}>
          <SectionCard id="conference" title="會議" onAdd={() => openAdd('conference')}>
            <div className="space-y-2">
              {conferences.length === 0 && <EmptyHint text="尚未新增會議記錄" />}
              {conferences.map((conf) => (
                <div key={conf.id} className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-3 py-2.5">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-700 truncate">{conf.name}</p>
                    <p className="text-xs text-ink-400">{[CONF_ROLES.find((r) => r.value === conf.role)?.label, conf.date].filter(Boolean).join('  ·  ')}</p>
                  </div>
                  <button type="button" onClick={() => openEdit('conference', conf as unknown as Record<string, unknown>)}
                    className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-terra-300 hover:text-terra-600 transition-all">編輯</button>
                  <button type="button" onClick={() => deleteItem(conf.id, conferences, setConferences, 'profile-conference')}
                    className="shrink-0 rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        {/* ════ SUMMARY ════ */}
        <div ref={(el) => { sectionRefs.current['summary'] = el }}>
          <SectionCard id="summary" title="自傳">
            <div className="space-y-4">
              <div>
                <label className={labelCls}>中文自傳</label>
                <textarea rows={5} className={`${inputCls} resize-y`} placeholder="請輸入中文自傳內容..."
                  value={summaryZh}
                  onChange={(e) => { setSummaryZh(e.target.value); save('profile-summary-zh', e.target.value) }} />
              </div>
              <div>
                <label className={labelCls}>英文自傳 (English Summary)</label>
                <textarea rows={5} className={`${inputCls} resize-y`} placeholder="Write your English summary here..."
                  value={summaryEn}
                  onChange={(e) => { setSummaryEn(e.target.value); save('profile-summary-en', e.target.value) }} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ════ ATTACHMENT ════ */}
        <div ref={(el) => { sectionRefs.current['attachment'] = el }}>
          <SectionCard id="attachment" title="作品附件">
            <div className="space-y-3">
              <button type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 rounded-xl border-2 border-dashed border-warm-300 px-4 py-3 text-sm text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all disabled:opacity-50">
                {uploading ? <><Spinner className="h-4 w-4" />上傳中...</> : '📎 上傳附件 (PDF / JPG / PNG · 最大 10MB)'}
              </button>
              <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAttachmentUpload(f) }} />
              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((att) => (
                    <div key={att.id} className="flex items-center gap-3 rounded-xl border border-warm-200 bg-cream-50 px-3 py-2.5">
                      <span className="text-lg shrink-0">{att.fileType === 'application/pdf' ? '📄' : '🖼'}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-ink-700 truncate">{att.fileName}</p>
                        <input
                          className="mt-0.5 w-full bg-transparent text-xs text-ink-400 placeholder:text-ink-300 outline-none"
                          placeholder="描述（選填）"
                          value={att.description}
                          onChange={(e) => {
                            const next = attachments.map((a) => a.id === att.id ? { ...a, description: e.target.value } : a)
                            setAttachments(next); save('profile-attachment', next)
                          }}
                        />
                      </div>
                      {att.fileUrl && !att.fileUrl.startsWith('data:application/pdf') && (
                        <a href={att.fileUrl} target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-xs text-terra-500 hover:text-terra-700 underline">查看</a>
                      )}
                      <button type="button"
                        onClick={() => { const next = attachments.filter((a) => a.id !== att.id); setAttachments(next); save('profile-attachment', next) }}
                        className="shrink-0 text-ink-200 hover:text-red-400 text-lg leading-none transition-colors">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ════ CUSTOM BLOCKS ════ */}
        <div ref={(el) => { sectionRefs.current['custom'] = el }}>
          <SectionCard id="custom" title="自訂區塊" onAdd={addCustomBlock} addLabel="＋ 新增區塊">
            <div className="space-y-4">
              {customBlocks.length === 0 && <EmptyHint text="可新增自訂區塊，例如：獲獎記錄、志工經驗" />}
              {customBlocks.map((block) => (
                <div key={block.id} className="rounded-xl border border-warm-200 bg-cream-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 rounded-xl border border-warm-200 bg-white px-3 py-2 text-sm font-medium text-ink-800 placeholder:text-ink-300 focus:border-terra-400 focus:outline-none"
                      placeholder="區塊標題（如：志工經歷、獲獎記錄）"
                      value={block.sectionTitle}
                      onChange={(e) => setCustomField(block.id, 'sectionTitle', e.target.value)} />
                    <button type="button"
                      onClick={() => { const next = customBlocks.filter((b) => b.id !== block.id); setCustomBlocks(next); save('profile-custom', next) }}
                      className="shrink-0 rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                  </div>
                  <textarea rows={3} className={`${inputCls} resize-y`} placeholder="內容..."
                    value={block.content}
                    onChange={(e) => setCustomField(block.id, 'content', e.target.value)} />
                </div>
              ))}
            </div>
          </SectionCard>
        </div>

        <div className="h-8" />
      </div>

      {/* ════ MODAL ════ */}
      {modalSection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(75,64,56,0.4)' }}
          onClick={() => setModalSection(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-ink-800">
                {editingId ? '編輯' : '新增'}{MODAL_TITLES[modalSection]}
              </h3>
              <button type="button" onClick={() => setModalSection(null)}
                className="rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1 text-sm text-ink-400 hover:text-ink-600 transition-colors">✕</button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
              {SECTION_FIELDS[modalSection].map((field) => (
                <div key={field.key} className={field.span === 'full' ? 'col-span-2' : 'col-span-1'}>
                  {field.type === 'checkbox' ? (
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox"
                        checked={!!(modalData[field.key])}
                        onChange={(e) => setModalData((p) => ({ ...p, [field.key]: e.target.checked }))}
                        className="rounded border-warm-300 text-terra-500" />
                      <span className="text-sm text-ink-700">{field.label}</span>
                    </label>
                  ) : field.type === 'select' ? (
                    <>
                      <label className={labelCls}>{field.label}</label>
                      <select
                        value={(modalData[field.key] as string) ?? ''}
                        onChange={(e) => setModalData((p) => ({ ...p, [field.key]: e.target.value }))}
                        className={inputCls}>
                        {field.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </>
                  ) : field.type === 'textarea' ? (
                    <>
                      <label className={labelCls}>{field.label}</label>
                      <textarea rows={3}
                        className={`${inputCls} resize-none`}
                        value={(modalData[field.key] as string) ?? ''}
                        onChange={(e) => setModalData((p) => ({ ...p, [field.key]: e.target.value }))} />
                    </>
                  ) : (
                    <>
                      <label className={labelCls}>{field.label}</label>
                      <input type="text" className={inputCls}
                        value={(modalData[field.key] as string) ?? ''}
                        onChange={(e) => setModalData((p) => ({ ...p, [field.key]: e.target.value }))} />
                    </>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-warm-100">
              <button type="button" onClick={() => setModalSection(null)}
                className="rounded-xl border border-warm-200 bg-cream-100 px-4 py-2 text-sm text-ink-600 hover:bg-cream-200 transition-colors">取消</button>
              <button type="button" onClick={saveModal}
                className="rounded-xl bg-terra-500 px-5 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]">
                {editingId ? '更新' : '新增'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
