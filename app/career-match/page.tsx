'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'

// ── Types ─────────────────────────────────────────────────────────────────────

type AppStatus =
  | 'saved'
  | 'applied'
  | 'hr_screen'
  | 'written_test'
  | 'manager_interview'
  | 'gm_interview'
  | 'bg_check'
  | 'offer'
  | 'rejected'

interface InterviewNote { id: string; date: string; interviewer: string; notes: string }
interface Attachment { name: string; url: string }

interface Application {
  id: string
  jobTitle: string
  company: string
  location?: string
  status: AppStatus
  sourcePlatform?: string
  sourceUrl?: string
  salaryMin?: number
  salaryMax?: number
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
  jdFullText?: string
  deadline?: string
  appliedAt?: string
  interviewNotes?: InterviewNote[]
  attachments?: Attachment[]
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  notes?: string
  createdAt: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const KANBAN_COLS: { status: AppStatus; label: string; colBg: string; dot: string }[] = [
  { status: 'saved',             label: '已儲存',     colBg: 'bg-warm-100',  dot: 'bg-zinc-400' },
  { status: 'applied',           label: '已投遞',     colBg: 'bg-honey-50',  dot: 'bg-honey-500' },
  { status: 'hr_screen',         label: '人資初篩',   colBg: 'bg-terra-50',  dot: 'bg-terra-300' },
  { status: 'written_test',      label: '筆試/測驗',  colBg: 'bg-terra-50',  dot: 'bg-terra-400' },
  { status: 'manager_interview', label: '主管面試',   colBg: 'bg-terra-50',  dot: 'bg-terra-500' },
  { status: 'gm_interview',      label: '總經理面試', colBg: 'bg-terra-50',  dot: 'bg-terra-600' },
  { status: 'bg_check',          label: '背景調查',   colBg: 'bg-terra-50',  dot: 'bg-ink-400' },
  { status: 'offer',             label: 'Offer',      colBg: 'bg-sage-50',   dot: 'bg-sage-500' },
  { status: 'rejected',          label: '未錄取',     colBg: 'bg-cream-200', dot: 'bg-red-400' },
]

const STATUS_MAP = Object.fromEntries(
  KANBAN_COLS.map((c) => [c.status, c])
) as Record<AppStatus, typeof KANBAN_COLS[0]>

const LOCATIONS = ['台北市', '新北市', '桃園市', '台中市', '台南市', '高雄市', '遠端', '海外']
const PLATFORMS = ['104', 'LinkedIn', 'Cake.me', 'Yourator', '公司官網', '獵頭介紹', '其他']
const APPS_KEY = 'job-tracker-apps'

// ── Helpers ───────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }

function fmtDate(iso?: string) {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`
}

function fmtSalary(min?: number, max?: number) {
  if (!min) return ''
  const fmt = (n: number) => n >= 10000 ? `${(n / 10000).toFixed(0)}萬` : n.toLocaleString()
  return max ? `${fmt(min)}~${fmt(max)}` : `${fmt(min)}+`
}

function scoreColor(s?: number) {
  if (s === undefined) return ''
  return s >= 70 ? 'text-sage-600' : s >= 50 ? 'text-honey-500' : 'text-red-400'
}

function emptyDraft(): Omit<Application, 'id' | 'createdAt'> {
  return {
    jobTitle: '', company: '', location: '', status: 'saved',
    sourcePlatform: '', sourceUrl: '',
    salaryMin: undefined, salaryMax: undefined,
    deadline: '', notes: '', jdFullText: '',
    interviewNotes: [], attachments: [],
    contactName: '', contactEmail: '', contactPhone: '',
  }
}

type SortKey = 'company' | 'jobTitle' | 'status' | 'matchScore' | 'appliedAt' | 'salaryMin' | 'createdAt'

// ── Spinner ───────────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function ApplicationTrackerPage() {
  const [apps, setApps] = useState<Application[]>([])
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban')
  const [mainView, setMainView] = useState<'main' | 'add' | 'detail'>('main')
  const [selectedApp, setSelectedApp] = useState<Application | null>(null)
  const [detailTab, setDetailTab] = useState<'overview' | 'jd' | 'interview' | 'notes'>('overview')
  const [addTab, setAddTab] = useState<'paste' | 'manual'>('paste')
  const [showFilter, setShowFilter] = useState(false)

  // Filter
  const [filterStatus, setFilterStatus] = useState<AppStatus[]>([])
  const [filterCompany, setFilterCompany] = useState('')
  const [filterScoreMin, setFilterScoreMin] = useState(0)

  // Drag
  const dragAppId = useRef<string | null>(null)

  // Add form
  const [draft, setDraft] = useState(emptyDraft())
  const [jdPasteText, setJdPasteText] = useState('')
  const [jdParsing, setJdParsing] = useState(false)
  const [jdParsed, setJdParsed] = useState(false)

  // List sort
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortAsc, setSortAsc] = useState(false)

  // Detail - interview note
  const [newNote, setNewNote] = useState({ date: '', interviewer: '', notes: '' })
  const [addingNote, setAddingNote] = useState(false)

  // Match score analysis
  const [analyzingMatch, setAnalyzingMatch] = useState(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(APPS_KEY)
      if (raw) setApps(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function persist(next: Application[]) {
    setApps(next)
    try { localStorage.setItem(APPS_KEY, JSON.stringify(next)) } catch { /* quota */ }
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  const interviewingCount = apps.filter((a) =>
    ['hr_screen', 'written_test', 'manager_interview', 'gm_interview'].includes(a.status)
  ).length
  const offerCount = apps.filter((a) => a.status === 'offer').length
  const thisMonthCount = useMemo(() => {
    const now = new Date()
    return apps.filter((a) => {
      const d = new Date(a.createdAt)
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).length
  }, [apps])

  // ── Filtered & sorted ─────────────────────────────────────────────────────
  const filteredApps = useMemo(() => {
    let result = [...apps]
    if (filterStatus.length > 0) result = result.filter((a) => filterStatus.includes(a.status))
    if (filterCompany.trim()) {
      const q = filterCompany.toLowerCase()
      result = result.filter((a) =>
        a.company.toLowerCase().includes(q) || a.jobTitle.toLowerCase().includes(q)
      )
    }
    if (filterScoreMin > 0) result = result.filter((a) => (a.matchScore ?? 0) >= filterScoreMin)
    result.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey]
      const bv = (b as unknown as Record<string, unknown>)[sortKey]
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
    return result
  }, [apps, filterStatus, filterCompany, filterScoreMin, sortKey, sortAsc])

  const activeFiltersCount = filterStatus.length + (filterCompany ? 1 : 0) + (filterScoreMin > 0 ? 1 : 0)

  // ── Handlers ──────────────────────────────────────────────────────────────

  function updateStatus(id: string, status: AppStatus) {
    persist(apps.map((a) => a.id === id ? { ...a, status } : a))
    setSelectedApp((p) => p?.id === id ? { ...p, status } : p)
  }

  function deleteApp(id: string) {
    if (!confirm('確定刪除此職缺記錄？')) return
    persist(apps.filter((a) => a.id !== id))
    if (selectedApp?.id === id) { setMainView('main'); setSelectedApp(null) }
  }

  function onDragStart(appId: string) { dragAppId.current = appId }
  function onDragOver(e: React.DragEvent) { e.preventDefault() }
  function onDrop(e: React.DragEvent, status: AppStatus) {
    e.preventDefault()
    if (dragAppId.current) { updateStatus(dragAppId.current, status); dragAppId.current = null }
  }

  async function parseJD(text: string) {
    if (!text.trim() || jdParsing) return
    setJdParsing(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `請從以下 JD 中擷取資訊，以 JSON 格式回傳，僅包含這些欄位：jobTitle, company, location, salaryMin（月薪數字）, salaryMax（月薪數字）。找不到的欄位省略不填。\n\n${text}`,
          }],
          context: 'jd_parse',
        }),
      })
      const data = await res.json()
      const match = data.reply?.match(/\{[\s\S]*?\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        setDraft((prev) => ({
          ...prev,
          jobTitle: parsed.jobTitle ?? prev.jobTitle,
          company: parsed.company ?? prev.company,
          location: parsed.location ?? prev.location,
          salaryMin: parsed.salaryMin ?? prev.salaryMin,
          salaryMax: parsed.salaryMax ?? prev.salaryMax,
          jdFullText: text,
        }))
        setJdParsed(true)
        setAddTab('manual')
      }
    } catch { /* ignore */ }
    finally { setJdParsing(false) }
  }

  async function analyzeMatch(app: Application) {
    if (!app.jdFullText || analyzingMatch) return
    setAnalyzingMatch(true)
    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: app.jdFullText }),
      })
      const d = await res.json()
      const updated = { ...app, matchScore: d.matchScore, matchedSkills: d.matchedSkills, missingSkills: d.missingSkills }
      persist(apps.map((a) => a.id === app.id ? updated : a))
      setSelectedApp(updated)
    } catch { /* ignore */ }
    finally { setAnalyzingMatch(false) }
  }

  function saveApp() {
    if (!draft.company.trim() || !draft.jobTitle.trim()) return
    const newApp: Application = {
      ...draft,
      id: genId(),
      createdAt: new Date().toISOString(),
      interviewNotes: [],
      attachments: [],
    }
    persist([newApp, ...apps])
    setDraft(emptyDraft()); setJdPasteText(''); setJdParsed(false)
    setSelectedApp(newApp); setDetailTab('overview'); setMainView('detail')
  }

  function resetAdd() { setDraft(emptyDraft()); setJdPasteText(''); setJdParsed(false); setAddTab('paste') }

  function addInterviewNote() {
    if (!selectedApp || !newNote.date || !newNote.notes) return
    const note: InterviewNote = { id: genId(), ...newNote }
    const updated = { ...selectedApp, interviewNotes: [...(selectedApp.interviewNotes ?? []), note] }
    persist(apps.map((a) => a.id === updated.id ? updated : a))
    setSelectedApp(updated)
    setNewNote({ date: '', interviewer: '', notes: '' }); setAddingNote(false)
  }

  function updateSelectedApp(patch: Partial<Application>) {
    if (!selectedApp) return
    const updated = { ...selectedApp, ...patch }
    persist(apps.map((a) => a.id === updated.id ? updated : a))
    setSelectedApp(updated)
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc((p) => !p)
    else { setSortKey(key); setSortAsc(true) }
  }
  const si = (key: SortKey) => sortKey === key ? (sortAsc ? ' ↑' : ' ↓') : ''

  // ─────────────────────────────────────────────────────────────────────────
  // ADD VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mainView === 'add') {
    return (
      <div className="p-4 md:p-8 space-y-5 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => { setMainView('main'); resetAdd() }}
            className="text-sm text-ink-500 hover:text-ink-700 transition-colors">← 返回</button>
          <h1 className="text-lg font-bold text-ink-900">新增職缺</h1>
        </div>

        <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
          {(['paste', 'manual'] as const).map((t) => (
            <button key={t} type="button" onClick={() => setAddTab(t)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${addTab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
              {t === 'paste' ? '📋 貼上 JD（推薦）' : '✏️ 手動填寫'}
            </button>
          ))}
        </div>

        {/* Paste JD tab */}
        {addTab === 'paste' && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1.5">貼上職務說明（JD）</label>
                <textarea
                  className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-none"
                  style={{ minHeight: '300px' }}
                  placeholder="將 104、LinkedIn 或公司官網的職務說明全文貼於此處，AI 將自動擷取所有資訊..."
                  value={jdPasteText}
                  onChange={(e) => setJdPasteText(e.target.value)}
                  disabled={jdParsing}
                />
              </div>
              {jdParsed && (
                <div className="flex items-center gap-2 rounded-xl border border-sage-500/20 bg-sage-500/8 px-3 py-2">
                  <span className="text-sage-600">✓</span>
                  <p className="text-xs text-sage-700">AI 已擷取完成，請確認並修改資訊</p>
                  <button type="button" onClick={() => setAddTab('manual')}
                    className="ml-auto text-xs font-medium text-terra-500 hover:text-terra-600">查看預覽 →</button>
                </div>
              )}
              <button type="button" onClick={() => parseJD(jdPasteText)}
                disabled={!jdPasteText.trim() || jdParsing}
                className="w-full rounded-xl bg-terra-500 py-2.5 text-sm font-semibold text-white hover:bg-terra-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2">
                {jdParsing ? <><Spinner /> 🤖 AI 解析中...</> : '🤖 AI 自動解析'}
              </button>
            </CardContent>
          </Card>
        )}

        {/* Manual tab */}
        {addTab === 'manual' && (
          <Card>
            <CardContent className="pt-5 space-y-4">
              {jdParsed && (
                <div className="flex items-center gap-2 rounded-xl border border-sage-500/20 bg-sage-500/8 px-3 py-2">
                  <p className="text-xs text-sage-700">🤖 AI 已自動填入，請確認並修改以下資訊</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-ink-500 mb-1">公司名稱 <span className="text-terra-500">*</span></label>
                  <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="例：台積電" value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-ink-500 mb-1">職位名稱 <span className="text-terra-500">*</span></label>
                  <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="例：資深前端工程師" value={draft.jobTitle} onChange={(e) => setDraft({ ...draft, jobTitle: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">工作地點</label>
                  <select className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    value={draft.location ?? ''} onChange={(e) => setDraft({ ...draft, location: e.target.value })}>
                    <option value="">請選擇</option>
                    {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">職缺來源</label>
                  <select className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    value={draft.sourcePlatform ?? ''} onChange={(e) => setDraft({ ...draft, sourcePlatform: e.target.value })}>
                    <option value="">請選擇</option>
                    {PLATFORMS.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">月薪下限（NTD）</label>
                  <input type="number" className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="40000" value={draft.salaryMin ?? ''} onChange={(e) => setDraft({ ...draft, salaryMin: Number(e.target.value) || undefined })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">月薪上限（NTD）</label>
                  <input type="number" className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="60000" value={draft.salaryMax ?? ''} onChange={(e) => setDraft({ ...draft, salaryMax: Number(e.target.value) || undefined })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink-500 mb-1">職缺連結（選填）</label>
                  <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="https://..." value={draft.sourceUrl ?? ''} onChange={(e) => setDraft({ ...draft, sourceUrl: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-ink-500 mb-1">JD 全文（選填）</label>
                  <textarea className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none resize-none"
                    rows={4} placeholder="貼上備存..." value={draft.jdFullText ?? ''}
                    onChange={(e) => setDraft({ ...draft, jdFullText: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">截止日期（選填）</label>
                  <input type="date" className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    value={draft.deadline ?? ''} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-ink-500 mb-1">備注（選填）</label>
                  <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                    placeholder="其他備注..." value={draft.notes ?? ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-3">
          <button type="button" onClick={() => { setMainView('main'); resetAdd() }}
            className="flex-1 rounded-xl border border-warm-300 py-2.5 text-sm text-ink-500 hover:border-terra-300 hover:text-terra-500 transition-all">
            ← 取消
          </button>
          <button type="button" onClick={saveApp} disabled={!draft.company.trim() || !draft.jobTitle.trim()}
            className="flex-1 rounded-xl bg-terra-500 py-2.5 text-sm font-semibold text-white hover:bg-terra-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
            儲存並分析匹配度
          </button>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // DETAIL VIEW
  // ─────────────────────────────────────────────────────────────────────────
  if (mainView === 'detail' && selectedApp) {
    const app = selectedApp
    return (
      <div className="p-4 md:p-8 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button type="button" onClick={() => { setMainView('main'); setSelectedApp(null) }}
              className="shrink-0 text-sm text-ink-500 hover:text-ink-700 transition-colors">← 返回</button>
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-ink-900 truncate">{app.company}</h1>
              <p className="text-sm text-ink-500 truncate">{app.jobTitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={app.status} onChange={(e) => updateStatus(app.id, e.target.value as AppStatus)}
              className="rounded-xl border border-warm-300 bg-white px-3 py-1.5 text-sm text-ink-700 focus:border-terra-400 focus:outline-none">
              {KANBAN_COLS.map((c) => <option key={c.status} value={c.status}>{c.label}</option>)}
            </select>
            <button type="button" onClick={() => deleteApp(app.id)}
              className="rounded-xl border border-red-200 px-3 py-1.5 text-xs text-red-400 hover:bg-red-50 transition-colors">
              刪除
            </button>
          </div>
        </div>

        {/* Detail tabs */}
        <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
          {([
            { key: 'overview',   label: '① 概覽' },
            { key: 'jd',        label: '② JD 分析' },
            { key: 'interview', label: '③ 面試準備' },
            { key: 'notes',     label: '④ 備注' },
          ] as const).map(({ key, label }) => (
            <button key={key} type="button" onClick={() => setDetailTab(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150 ${detailTab === key ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* ① Overview */}
        {detailTab === 'overview' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>基本資訊</CardTitle></CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {([
                    { label: '公司', value: app.company },
                    { label: '職位', value: app.jobTitle },
                    { label: '地點', value: app.location || '—' },
                    { label: '薪資', value: fmtSalary(app.salaryMin, app.salaryMax) || '—' },
                    { label: '來源', value: app.sourcePlatform || '—' },
                    { label: '截止日', value: fmtDate(app.deadline) },
                  ]).map(({ label, value }) => (
                    <div key={label}>
                      <dt className="text-xs text-ink-400">{label}</dt>
                      <dd className="font-medium text-ink-700 mt-0.5">{value}</dd>
                    </div>
                  ))}
                </dl>
                {app.sourceUrl && (
                  <a href={app.sourceUrl} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-flex text-xs text-terra-500 hover:text-terra-600">
                    查看原始職缺 →
                  </a>
                )}
              </CardContent>
            </Card>

            {/* Match score */}
            {app.matchScore !== undefined ? (
              <Card>
                <CardHeader><CardTitle>AI 匹配分析</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-cream-100 p-5">
                      <ProgressRing score={app.matchScore} size={90} strokeWidth={7} animate />
                      <p className="text-xs text-ink-500 mt-2">匹配度</p>
                    </div>
                    <div className="space-y-3">
                      {(app.matchedSkills ?? []).length > 0 && (
                        <div>
                          <p className="text-xs text-sage-600 mb-1.5">✓ 已具備技能</p>
                          <div className="flex flex-wrap gap-1">
                            {app.matchedSkills!.map((s) => <Badge key={s} variant="success">{s}</Badge>)}
                          </div>
                        </div>
                      )}
                      {(app.missingSkills ?? []).length > 0 && (
                        <div>
                          <p className="text-xs text-red-400 mb-1.5">✗ 待補強技能</p>
                          <div className="flex flex-wrap gap-1">
                            {app.missingSkills!.map((s) => <Badge key={s} variant="danger">{s}</Badge>)}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : app.jdFullText ? (
              <button type="button" onClick={() => analyzeMatch(app)} disabled={analyzingMatch}
                className="w-full rounded-xl border-2 border-dashed border-terra-300 py-4 text-sm text-terra-500 hover:bg-terra-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                {analyzingMatch ? <><Spinner /> 分析中...</> : '🤖 分析 AI 匹配分數'}
              </button>
            ) : null}

            {/* Timeline */}
            <Card>
              <CardHeader><CardTitle>重要日期</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-terra-400 shrink-0" />
                  <span className="text-xs text-ink-400">建立</span>
                  <span className="text-sm text-ink-700 ml-auto">{fmtDate(app.createdAt)}</span>
                </div>
                {app.appliedAt && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-honey-400 shrink-0" />
                    <span className="text-xs text-ink-400">投遞</span>
                    <span className="text-sm text-ink-700 ml-auto">{fmtDate(app.appliedAt)}</span>
                  </div>
                )}
                {(app.interviewNotes ?? []).map((note, i) => (
                  <div key={note.id} className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-sage-400 shrink-0" />
                    <span className="text-xs text-ink-400">
                      面試 {i + 1}{note.interviewer ? ` · ${note.interviewer}` : ''}
                    </span>
                    <span className="text-sm text-ink-700 ml-auto">{fmtDate(note.date)}</span>
                  </div>
                ))}
                {app.deadline && (
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-red-300 shrink-0" />
                    <span className="text-xs text-ink-400">截止</span>
                    <span className="text-sm text-ink-700 ml-auto">{fmtDate(app.deadline)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ② JD Analysis */}
        {detailTab === 'jd' && (
          <div className="space-y-4">
            {app.jdFullText ? (
              <>
                <Card>
                  <CardHeader><CardTitle>JD 全文</CardTitle></CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-line text-sm text-ink-600 leading-relaxed">{app.jdFullText}</p>
                  </CardContent>
                </Card>
                <Link
                  href={`/career-growth?jd=${encodeURIComponent(app.jdFullText.slice(0, 500))}`}
                  className="flex items-center justify-center gap-2 rounded-xl border border-terra-300 bg-terra-50 py-3 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors">
                  🔍 深入分析技能落差 →
                </Link>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-3xl mb-3">📄</p>
                <p className="text-sm text-ink-500">尚未儲存 JD 全文</p>
                <button type="button"
                  onClick={() => { setMainView('add'); setAddTab('paste') }}
                  className="mt-3 text-sm text-terra-500 hover:text-terra-600">
                  新增 JD →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ③ Interview Prep */}
        {detailTab === 'interview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href={`/interview-prep?company=${encodeURIComponent(app.company)}&title=${encodeURIComponent(app.jobTitle)}`}
                className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 hover:border-terra-300 hover:bg-terra-50 transition-all">
                🎤 針對此職缺生成面試題目 →
              </Link>
              <Link
                href={`/career-intelligence?company=${encodeURIComponent(app.company)}`}
                className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 hover:border-terra-300 hover:bg-terra-50 transition-all">
                🏢 分析此公司 →
              </Link>
            </div>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>面試記錄</CardTitle>
                  <button type="button" onClick={() => setAddingNote(true)}
                    className="rounded-lg bg-terra-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-terra-600 transition-colors">
                    + 新增記錄
                  </button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {addingNote && (
                  <div className="rounded-xl border border-terra-200 bg-terra-50/30 p-3 space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-ink-400 mb-1">日期</label>
                        <input type="date" className="w-full rounded-lg border border-warm-300 bg-white px-2 py-1.5 text-sm focus:border-terra-400 focus:outline-none"
                          value={newNote.date} onChange={(e) => setNewNote({ ...newNote, date: e.target.value })} />
                      </div>
                      <div>
                        <label className="block text-xs text-ink-400 mb-1">面試官（選填）</label>
                        <input className="w-full rounded-lg border border-warm-300 bg-white px-2 py-1.5 text-sm focus:border-terra-400 focus:outline-none"
                          placeholder="姓名或職稱" value={newNote.interviewer}
                          onChange={(e) => setNewNote({ ...newNote, interviewer: e.target.value })} />
                      </div>
                    </div>
                    <textarea className="w-full rounded-lg border border-warm-300 bg-white px-2 py-1.5 text-sm focus:border-terra-400 focus:outline-none resize-none"
                      rows={3} placeholder="題目、觀察、心得..."
                      value={newNote.notes} onChange={(e) => setNewNote({ ...newNote, notes: e.target.value })} />
                    <div className="flex gap-2 justify-end">
                      <button type="button" onClick={() => setAddingNote(false)}
                        className="px-3 py-1.5 text-xs text-ink-400 hover:text-ink-600">取消</button>
                      <button type="button" onClick={addInterviewNote}
                        disabled={!newNote.date || !newNote.notes}
                        className="rounded-lg bg-terra-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-terra-600 disabled:opacity-40 transition-colors">
                        儲存
                      </button>
                    </div>
                  </div>
                )}
                {(app.interviewNotes ?? []).length === 0 && !addingNote && (
                  <p className="py-6 text-center text-sm text-ink-400">尚無面試記錄</p>
                )}
                {(app.interviewNotes ?? []).map((note, i) => (
                  <div key={note.id} className="rounded-xl border border-warm-200 bg-cream-50 px-3 py-2.5">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-ink-600">
                        面試 {i + 1}{note.interviewer ? ` · ${note.interviewer}` : ''}
                      </span>
                      <span className="text-xs text-ink-400">{fmtDate(note.date)}</span>
                    </div>
                    <p className="text-sm text-ink-700 whitespace-pre-line">{note.notes}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ④ Notes */}
        {detailTab === 'notes' && (
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle>備注</CardTitle></CardHeader>
              <CardContent>
                <textarea
                  className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2.5 text-sm text-ink-900 focus:border-terra-400 focus:outline-none resize-none"
                  rows={6} placeholder="自由填寫備注、觀察、感想..."
                  value={app.notes ?? ''}
                  onChange={(e) => updateSelectedApp({ notes: e.target.value })}
                />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>聯絡窗口</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {([
                  { label: '姓名', key: 'contactName', type: 'text', placeholder: '聯絡人姓名' },
                  { label: 'Email', key: 'contactEmail', type: 'email', placeholder: 'hr@company.com' },
                  { label: '電話', key: 'contactPhone', type: 'tel', placeholder: '0912-345-678' },
                ] as const).map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs text-ink-400 mb-1">{label}</label>
                    <input type={type}
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                      placeholder={placeholder}
                      value={(app as unknown as Record<string, string | undefined>)[key] ?? ''}
                      onChange={(e) => updateSelectedApp({ [key]: e.target.value })}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN VIEW
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">◎ Application Tracker</h1>
        <p className="mt-1 text-sm text-ink-500">管理你的求職進度，AI 分析職缺匹配度</p>
      </div>

      {/* Top action bar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <button type="button"
          onClick={() => { resetAdd(); setMainView('add') }}
          className="flex items-center gap-2 rounded-xl bg-terra-500 px-4 py-2 text-sm font-semibold text-white hover:bg-terra-600 transition-colors shadow-[var(--shadow-warm-xs)]">
          <span className="text-base leading-none">＋</span> 新增職缺
        </button>
        <div className="flex items-center gap-2">
          <div className="flex gap-0.5 rounded-lg border border-warm-200 bg-white p-0.5">
            {(['kanban', 'list'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setViewMode(v)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${viewMode === v ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
                {v === 'kanban' ? '⊞ 看板' : '≡ 列表'}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => setShowFilter((p) => !p)}
            className={`rounded-xl border px-3 py-2 text-xs font-medium transition-all ${showFilter || activeFiltersCount > 0 ? 'border-terra-400 bg-terra-50 text-terra-600' : 'border-warm-200 bg-white text-ink-500 hover:border-terra-300 hover:text-terra-500'}`}>
            ⚙ 篩選{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '總投遞數',  value: apps.length,       color: 'text-ink-700 bg-white border-warm-200' },
          { label: '面試中',    value: interviewingCount,  color: 'text-terra-600 bg-terra-50 border-terra-200' },
          { label: '收到 Offer', value: offerCount,        color: 'text-sage-600 bg-sage-50 border-sage-200' },
          { label: '本月新增',  value: thisMonthCount,     color: 'text-honey-600 bg-honey-50 border-honey-200' },
        ].map((s) => (
          <div key={s.label} className={`rounded-2xl border px-4 py-3 shadow-[var(--shadow-warm-xs)] ${s.color}`}>
            <p className="text-2xl font-bold">{s.value}</p>
            <p className="text-xs mt-0.5 opacity-70">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter panel */}
      {showFilter && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-2">公司 / 職位搜尋</label>
                <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-1.5 text-sm focus:border-terra-400 focus:outline-none"
                  placeholder="搜尋..." value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-2">
                  最低匹配分數：{filterScoreMin > 0 ? `${filterScoreMin}+` : '不限'}
                </label>
                <input type="range" min={0} max={90} step={10} value={filterScoreMin}
                  onChange={(e) => setFilterScoreMin(Number(e.target.value))}
                  className="w-full accent-terra-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-2">狀態篩選</label>
                <div className="flex flex-wrap gap-1">
                  {KANBAN_COLS.map((c) => (
                    <button key={c.status} type="button"
                      onClick={() => setFilterStatus((prev) =>
                        prev.includes(c.status) ? prev.filter((s) => s !== c.status) : [...prev, c.status]
                      )}
                      className={`rounded-full border px-2 py-0.5 text-xs transition-all ${filterStatus.includes(c.status) ? 'border-terra-400 bg-terra-50 text-terra-600' : 'border-warm-300 text-ink-400 hover:border-terra-300'}`}>
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {activeFiltersCount > 0 && (
              <button type="button"
                onClick={() => { setFilterStatus([]); setFilterCompany(''); setFilterScoreMin(0) }}
                className="mt-3 text-xs text-red-400 hover:text-red-500">清除所有篩選</button>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── KANBAN VIEW ── */}
      {viewMode === 'kanban' && (
        <div className="overflow-x-auto pb-4 -mx-4 px-4">
          <div className="flex gap-3" style={{ minWidth: `${KANBAN_COLS.length * 216}px` }}>
            {KANBAN_COLS.map((col) => {
              const colApps = filteredApps.filter((a) => a.status === col.status)
              return (
                <div key={col.status}
                  className={`w-52 shrink-0 rounded-2xl p-3 ${col.colBg}`}
                  onDragOver={onDragOver}
                  onDrop={(e) => onDrop(e, col.status)}>
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${col.dot}`} />
                    <span className="text-xs font-semibold text-ink-600 truncate">{col.label}</span>
                    <span className="ml-auto text-xs font-medium text-ink-400">{colApps.length}</span>
                  </div>
                  <div className="space-y-2">
                    {colApps.map((app) => (
                      <div key={app.id}
                        draggable
                        onDragStart={() => onDragStart(app.id)}
                        onClick={() => { setSelectedApp(app); setDetailTab('overview'); setMainView('detail') }}
                        className="cursor-pointer rounded-xl border border-warm-200 bg-white p-3 shadow-[var(--shadow-warm-xs)] hover:shadow-[var(--shadow-warm-sm)] hover:border-terra-200 transition-all">
                        <p className="text-xs font-semibold text-ink-800 truncate">{app.company}</p>
                        <p className="text-xs text-ink-500 truncate mt-0.5">{app.jobTitle}</p>
                        {app.matchScore !== undefined && (
                          <p className={`mt-2 text-xs font-bold ${scoreColor(app.matchScore)}`}>
                            {app.matchScore}% 匹配
                          </p>
                        )}
                        <div className="mt-2 flex items-center justify-between">
                          {fmtSalary(app.salaryMin, app.salaryMax)
                            ? <span className="text-[10px] text-sage-600">{fmtSalary(app.salaryMin, app.salaryMax)}</span>
                            : <span />}
                          <span className="text-[10px] text-ink-300">{fmtDate(app.createdAt)}</span>
                        </div>
                      </div>
                    ))}
                    {colApps.length === 0 && (
                      <div className="rounded-xl border border-dashed border-warm-300 py-6 text-center">
                        <p className="text-xs text-ink-300">拖曳至此</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── LIST VIEW ── */}
      {viewMode === 'list' && (
        <div className="overflow-x-auto rounded-2xl border border-warm-200 bg-white shadow-[var(--shadow-warm-xs)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-warm-200 bg-cream-100">
                {([
                  { key: 'company',    label: '公司' },
                  { key: 'jobTitle',   label: '職位' },
                  { key: 'status',     label: '狀態' },
                  { key: 'matchScore', label: '匹配分' },
                  { key: 'appliedAt',  label: '投遞日' },
                  { key: 'salaryMin',  label: '薪資' },
                ] as { key: SortKey; label: string }[]).map(({ key, label }) => (
                  <th key={key}
                    className="px-4 py-3 text-left text-xs font-semibold text-ink-400 cursor-pointer hover:text-ink-600 whitespace-nowrap"
                    onClick={() => toggleSort(key)}>
                    {label}{si(key)}
                  </th>
                ))}
                <th className="px-4 py-3 text-left text-xs font-semibold text-ink-400">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredApps.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-ink-400">
                    尚無職缺，點擊「＋ 新增職缺」開始追蹤
                  </td>
                </tr>
              )}
              {filteredApps.map((app) => {
                const col = STATUS_MAP[app.status]
                return (
                  <tr key={app.id} className="border-b border-warm-100 hover:bg-cream-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-800">{app.company}</td>
                    <td className="px-4 py-3 text-ink-600">{app.jobTitle}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${col.dot}`} />
                        <span className="text-xs text-ink-600">{col.label}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {app.matchScore !== undefined
                        ? <span className={`text-sm font-bold ${scoreColor(app.matchScore)}`}>{app.matchScore}%</span>
                        : <span className="text-ink-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-ink-500 whitespace-nowrap">
                      {fmtDate(app.appliedAt !== '—' ? app.appliedAt : undefined) !== '—'
                        ? fmtDate(app.appliedAt)
                        : fmtDate(app.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-xs text-sage-600">{fmtSalary(app.salaryMin, app.salaryMax) || '—'}</td>
                    <td className="px-4 py-3">
                      <button type="button"
                        onClick={() => { setSelectedApp(app); setDetailTab('overview'); setMainView('detail') }}
                        className="text-xs font-medium text-terra-500 hover:text-terra-600">
                        查看
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty state (kanban only) */}
      {apps.length === 0 && viewMode === 'kanban' && (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="mb-4 text-5xl">◎</div>
          <p className="text-sm font-medium text-ink-600">還沒有追蹤任何職缺</p>
          <p className="mt-1 text-xs text-ink-400">點擊「＋ 新增職缺」開始管理你的求職進度</p>
        </div>
      )}
    </div>
  )
}
