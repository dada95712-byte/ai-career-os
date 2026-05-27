'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import Link from 'next/link'
import { PageTooltip } from '@/components/onboarding/page-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ProgressRing } from '@/components/ui/progress-ring'
import { RateLimitToast } from '@/components/ui/rate-limit-toast'

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

interface MatchImprovement {
  skill: string
  priority: 'high' | 'medium' | 'low'
  suggestion: string
  resources: string[]
}

interface MatchAnalysis {
  matchScore: number
  jdRequiredSkills: string[]
  matchedSkills: { skill: string; userSkill: string }[]
  partialSkills: { skill: string; userSkill: string; gap: string }[]
  missingSkills: string[]
  fullReport: {
    summary: string
    strengths: string[]
    improvements: MatchImprovement[]
  }
  analyzedAt: string
}

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
  matchAnalysis?: MatchAnalysis
  jdFullText?: string
  deadline?: string
  appliedAt?: string
  hrScreenAt?: string
  writtenTestAt?: string
  managerInterviewAt?: string
  gmInterviewAt?: string
  offerAt?: string
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

const DATE_STAGES = [
  { key: 'createdAt',          label: '建立',        readonly: true,  warn: false },
  { key: 'appliedAt',          label: '投遞日期',    readonly: false, warn: false },
  { key: 'deadline',           label: '截止日期',    readonly: false, warn: true  },
  { key: 'hrScreenAt',         label: '人資初篩',    readonly: false, warn: false },
  { key: 'writtenTestAt',      label: '筆試/測驗',   readonly: false, warn: false },
  { key: 'managerInterviewAt', label: '主管面試',    readonly: false, warn: false },
  { key: 'gmInterviewAt',      label: '總經理面試',  readonly: false, warn: false },
  { key: 'offerAt',            label: 'Offer 收到',  readonly: false, warn: false },
] as const

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

function relativeTime(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 60) return `${Math.max(0, mins)} 分鐘前`
  if (mins < 1440) return `${Math.floor(mins / 60)} 小時前`
  return `${Math.floor(mins / 1440)} 天前`
}

function getMatchLabel(score: number): { text: string; color: string } {
  if (score >= 90) return { text: '高度匹配，強烈建議投遞', color: 'text-sage-600' }
  if (score >= 70) return { text: '良好匹配，值得投遞', color: 'text-sage-500' }
  if (score >= 50) return { text: '部分匹配，可投遞但需補強', color: 'text-honey-600' }
  return { text: '匹配度偏低，建議先補強技能', color: 'text-terra-500' }
}

function deadlineDays(deadline?: string): number | null {
  if (!deadline) return null
  return Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000)
}

function loadProfileSkills(): string[] {
  try {
    const skills = new Set<string>()
    const rr = localStorage.getItem('career-resumes')
    if (rr) {
      const resumes = JSON.parse(rr)
      if (Array.isArray(resumes)) resumes.forEach((r: Record<string, unknown>) => {
        if (Array.isArray(r.skills)) (r.skills as string[]).forEach(s => skills.add(s))
      })
    }
    const pr = localStorage.getItem('profile-skills')
    if (pr) {
      const ps = JSON.parse(pr)
      if (Array.isArray(ps)) ps.forEach((s: string | { name?: string }) => {
        if (typeof s === 'string') skills.add(s)
        else if (s?.name) skills.add(s.name)
      })
    }
    return [...skills].filter(Boolean)
  } catch { return [] }
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
  const [bgAnalyzing, setBgAnalyzing] = useState(false)
  const [profileSkills, setProfileSkills] = useState<string[]>([])
  const [rateLimitToast, setRateLimitToast] = useState(false)
  const autoAnalyzed = useRef<Set<string>>(new Set())

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      const raw = localStorage.getItem(APPS_KEY)
      if (raw) setApps(JSON.parse(raw))
    } catch { /* ignore */ }
    setProfileSkills(loadProfileSkills())
  }, [])

  // Background auto-analyze when entering detail view
  useEffect(() => {
    if (mainView !== 'detail' || !selectedApp?.jdFullText) return
    if (selectedApp.matchAnalysis) return
    if (autoAnalyzed.current.has(selectedApp.id)) return
    if (profileSkills.length === 0) return
    autoAnalyzed.current.add(selectedApp.id)
    setBgAnalyzing(true)
    doAnalyzeMatch(selectedApp, false).finally(() => setBgAnalyzing(false))
  }, [mainView, selectedApp?.id, profileSkills.length]) // eslint-disable-line

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

  async function doAnalyzeMatch(app: Application, force: boolean) {
    if (!app.jdFullText) return
    if (app.matchAnalysis && !force) return
    if (profileSkills.length === 0) return
    try {
      const res = await fetch(`/api/jobs/${app.id}/analyze-match`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdContent: app.jdFullText, userSkills: profileSkills }),
      })
      const data = await res.json()
      if (data.error === 'rate_limit') { setRateLimitToast(true); return }
      if (data.error) return
      const analysis: MatchAnalysis = {
        matchScore: data.matchScore,
        jdRequiredSkills: data.jdRequiredSkills ?? [],
        matchedSkills: data.matchedSkills ?? [],
        partialSkills: data.partialSkills ?? [],
        missingSkills: data.missingSkills ?? [],
        fullReport: data.fullReport ?? { summary: '', strengths: [], improvements: [] },
        analyzedAt: data.analyzedAt,
      }
      const updated: Application = {
        ...app,
        matchAnalysis: analysis,
        matchScore: analysis.matchScore,
        matchedSkills: analysis.matchedSkills.map(m => m.skill),
        missingSkills: analysis.missingSkills,
      }
      persist(apps.map(a => a.id === updated.id ? updated : a))
      setSelectedApp(updated)
    } catch { /* silent */ }
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

            {/* AI Match Analysis */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI 匹配分析</CardTitle>
                  {app.matchAnalysis && (
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-ink-300">分析時間：{relativeTime(app.matchAnalysis.analyzedAt)}</span>
                      <button type="button"
                        onClick={() => { setBgAnalyzing(true); doAnalyzeMatch(app, true).finally(() => setBgAnalyzing(false)) }}
                        disabled={bgAnalyzing}
                        className="text-[10px] text-ink-300 hover:text-terra-500 transition-colors disabled:opacity-40">
                        🔄 重新分析
                      </button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!app.jdFullText ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-ink-400 mb-2">請先在 JD 分析 Tab 填寫職務說明，才能進行匹配分析</p>
                    <button type="button" onClick={() => setDetailTab('jd')}
                      className="text-sm text-terra-500 hover:text-terra-700 transition-colors">前往填寫 JD →</button>
                  </div>
                ) : app.matchAnalysis ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col items-center justify-center rounded-2xl bg-cream-100 p-5">
                        <ProgressRing score={app.matchAnalysis.matchScore} size={90} strokeWidth={7} animate />
                        <p className="text-xs text-ink-500 mt-1">匹配度</p>
                        <p className={`text-xs mt-1 font-medium text-center leading-tight ${getMatchLabel(app.matchAnalysis.matchScore).color}`}>
                          {getMatchLabel(app.matchAnalysis.matchScore).text}
                        </p>
                      </div>
                      <div className="space-y-2.5 overflow-y-auto max-h-52">
                        {app.matchAnalysis.matchedSkills.length > 0 && (
                          <div>
                            <p className="text-xs text-sage-600 mb-1">✓ 已具備</p>
                            <div className="flex flex-wrap gap-1">
                              {app.matchAnalysis.matchedSkills.map(m => (
                                <span key={m.skill} className="rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-xs text-sage-700">{m.skill}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {app.matchAnalysis.partialSkills.length > 0 && (
                          <div>
                            <p className="text-xs text-honey-600 mb-1">🔶 部分具備</p>
                            <div className="flex flex-wrap gap-1">
                              {app.matchAnalysis.partialSkills.map(m => (
                                <span key={m.skill} title={`差距：${m.gap}`}
                                  className="cursor-help rounded-full border border-honey-200 bg-honey-50 px-2 py-0.5 text-xs text-honey-700">{m.skill}</span>
                              ))}
                            </div>
                          </div>
                        )}
                        {app.matchAnalysis.missingSkills.length > 0 && (
                          <div>
                            <p className="text-xs text-red-400 mb-1">✗ 待補強</p>
                            <div className="flex flex-wrap gap-1">
                              {app.matchAnalysis.missingSkills.map(s => {
                                const imp = app.matchAnalysis!.fullReport.improvements.find(i => i.skill === s)
                                return (
                                  <span key={s} title={imp ? `建議：${imp.suggestion}` : undefined}
                                    className="cursor-help rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs text-red-600">{s}</span>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    <button type="button" onClick={() => setDetailTab('jd')}
                      className="mt-4 flex items-center gap-1 text-sm text-terra-500 hover:text-terra-700 transition-colors">
                      📋 查看完整技能落差報告 →
                    </button>
                  </>
                ) : bgAnalyzing ? (
                  <div className="grid grid-cols-2 gap-4 animate-pulse">
                    <div className="flex flex-col items-center justify-center rounded-2xl bg-cream-100 p-5 gap-2">
                      <div className="w-[90px] h-[90px] rounded-full bg-warm-200" />
                      <div className="h-3 w-16 bg-warm-200 rounded" />
                    </div>
                    <div className="space-y-3 pt-3">
                      {[70, 90, 55].map(w => <div key={w} className="h-3 bg-warm-200 rounded" style={{ width: `${w}%` }} />)}
                    </div>
                  </div>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-xs text-ink-400 mb-3">
                      {profileSkills.length === 0
                        ? '前往個人資料庫設定技能後，即可自動分析匹配度'
                        : '點擊開始 AI 匹配分析'}
                    </p>
                    {profileSkills.length > 0 && (
                      <button type="button"
                        onClick={() => { setBgAnalyzing(true); doAnalyzeMatch(app, false).finally(() => setBgAnalyzing(false)) }}
                        disabled={bgAnalyzing}
                        className="rounded-xl border-2 border-dashed border-terra-300 px-6 py-3 text-sm text-terra-500 hover:bg-terra-50 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mx-auto">
                        <Spinner /> 🤖 分析 AI 匹配分數
                      </button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Important Dates */}
            <Card>
              <CardHeader><CardTitle>重要日期</CardTitle></CardHeader>
              <CardContent className="space-y-0 px-4 pb-4">
                {DATE_STAGES.map(({ key, label, readonly: ro, warn }) => {
                  const val = (app as unknown as Record<string, string | undefined>)[key]
                  const days = warn ? deadlineDays(val) : null
                  return (
                    <div key={key} className="flex items-center gap-2 py-2 border-b border-warm-100 last:border-0">
                      <span className="text-xs text-ink-400 w-20 shrink-0">{label}</span>
                      {ro ? (
                        <span className="flex-1 text-sm text-ink-700">{fmtDate(val)}</span>
                      ) : (
                        <input
                          type="date"
                          value={val ? val.slice(0, 10) : ''}
                          onChange={e => updateSelectedApp({ [key]: e.target.value || undefined })}
                          className="flex-1 rounded-lg border border-warm-200 bg-white px-2 py-1 text-sm text-ink-700 focus:border-terra-400 focus:outline-none"
                        />
                      )}
                      {warn && days !== null && (
                        <span className={`shrink-0 text-xs rounded-full px-2 py-0.5 ${
                          days < 0 ? 'text-ink-400 bg-warm-100' :
                          days <= 7 ? 'text-red-600 bg-red-50 border border-red-200' :
                          days <= 14 ? 'text-honey-700 bg-honey-50 border border-honey-200' : ''
                        }`}>
                          {days < 0 ? '已截止' : days <= 7 ? `⚠️ 還有 ${days} 天` : days <= 14 ? `還有 ${days} 天` : ''}
                        </span>
                      )}
                    </div>
                  )
                })}
                {/* Timeline visualization */}
                <div className="mt-4 pt-3 border-t border-warm-100">
                  <p className="text-[10px] text-ink-300 mb-3 uppercase tracking-wide">求職時間軸</p>
                  <div className="flex items-center gap-0 overflow-x-auto pb-1">
                    {DATE_STAGES.filter(s => s.key !== 'createdAt').map(({ key, label }, i, arr) => {
                      const val = (app as unknown as Record<string, string | undefined>)[key]
                      const filled = !!val
                      return (
                        <div key={key} className="flex items-center shrink-0">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full border-2 transition-all ${
                              filled ? 'bg-terra-400 border-terra-400' : 'bg-white border-warm-300'
                            }`} />
                            <p className={`text-[9px] mt-1 text-center whitespace-nowrap max-w-[36px] leading-tight ${
                              filled ? 'text-ink-500' : 'text-ink-300'
                            }`}>{label.slice(0, 4)}</p>
                          </div>
                          {i < arr.length - 1 && (
                            <div className={`h-0.5 w-5 ${filled ? 'bg-terra-200' : 'bg-warm-200'}`} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ② JD Analysis */}
        {detailTab === 'jd' && (
          <div className="space-y-4">
            {app.jdFullText ? (
              <Card>
                <CardHeader><CardTitle>JD 全文</CardTitle></CardHeader>
                <CardContent>
                  <textarea
                    className="w-full rounded-xl border border-warm-100 bg-cream-50 px-3 py-2.5 text-sm text-ink-600 leading-relaxed resize-none focus:border-terra-400 focus:outline-none"
                    rows={8}
                    value={app.jdFullText}
                    onChange={e => updateSelectedApp({ jdFullText: e.target.value })}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <p className="text-3xl mb-3">📄</p>
                <p className="text-sm text-ink-500">尚未儲存 JD 全文</p>
                <button type="button" onClick={() => { setMainView('add'); setAddTab('paste') }}
                  className="mt-3 text-sm text-terra-500 hover:text-terra-600">新增 JD →</button>
              </div>
            )}

            {/* Skill gap full report */}
            {app.jdFullText && (
              <div id="skill-gap-report" className="space-y-4">
                {app.matchAnalysis ? (
                  <>
                    <p className="text-xs text-ink-300">以下報告與概覽匹配分析共用同一份數據</p>

                    {/* A: Summary stats */}
                    <Card>
                      <CardHeader><CardTitle>技能比對總覽</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="rounded-xl border border-sage-200 bg-sage-50 p-3 text-center">
                            <p className="text-2xl font-bold text-sage-600">{app.matchAnalysis.matchedSkills.length}</p>
                            <p className="text-xs text-sage-600 mt-1">✅ 已具備</p>
                          </div>
                          <div className="rounded-xl border border-honey-200 bg-honey-50 p-3 text-center">
                            <p className="text-2xl font-bold text-honey-600">{app.matchAnalysis.partialSkills.length}</p>
                            <p className="text-xs text-honey-600 mt-1">🔶 部分具備</p>
                          </div>
                          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-center">
                            <p className="text-2xl font-bold text-red-500">{app.matchAnalysis.missingSkills.length}</p>
                            <p className="text-xs text-red-500 mt-1">❌ 待補強</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* B: JD skill list */}
                    {app.matchAnalysis.jdRequiredSkills.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle>JD 要求技能完整清單</CardTitle></CardHeader>
                        <CardContent>
                          <div className="space-y-0">
                            {app.matchAnalysis.jdRequiredSkills.map(skill => {
                              const isMatched = app.matchAnalysis!.matchedSkills.some(m => m.skill === skill)
                              const isPartial = app.matchAnalysis!.partialSkills.some(m => m.skill === skill)
                              return (
                                <div key={skill} className="flex items-center gap-2.5 py-2 border-b border-warm-100 last:border-0">
                                  <span>{isMatched ? '✅' : isPartial ? '🔶' : '❌'}</span>
                                  <span className="flex-1 text-sm text-ink-700">{skill}</span>
                                  {isPartial && (
                                    <span className="text-xs text-honey-600 bg-honey-50 border border-honey-200 rounded-full px-2 py-0.5">部分具備</span>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* C: Improvement cards */}
                    {app.matchAnalysis.fullReport.improvements.length > 0 && (
                      <Card>
                        <CardHeader><CardTitle>待補強技能詳細建議</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {app.matchAnalysis.fullReport.improvements.map(imp => (
                            <div key={imp.skill} className="rounded-xl border border-warm-200 bg-white p-4">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-sm font-semibold text-ink-800">{imp.skill}</span>
                                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                                  imp.priority === 'high' ? 'text-red-600 bg-red-50 border-red-200' :
                                  imp.priority === 'medium' ? 'text-honey-700 bg-honey-50 border-honey-200' :
                                  'text-sage-600 bg-sage-50 border-sage-200'
                                }`}>
                                  {imp.priority === 'high' ? '高優先' : imp.priority === 'medium' ? '中優先' : '低優先'}
                                </span>
                              </div>
                              <p className="text-xs text-ink-600 mb-2.5">{imp.suggestion}</p>
                              {imp.resources.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                  {imp.resources.map((r, ri) => (
                                    <span key={ri} className="text-[11px] text-terra-600 border border-terra-200 bg-terra-50 rounded-full px-2 py-0.5">{r}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </CardContent>
                      </Card>
                    )}

                    {/* D: Overall recommendations */}
                    {(app.matchAnalysis.fullReport.strengths.length > 0 || app.matchAnalysis.fullReport.summary) && (
                      <Card>
                        <CardHeader><CardTitle>整體建議</CardTitle></CardHeader>
                        <CardContent className="space-y-3">
                          {app.matchAnalysis.fullReport.summary && (
                            <p className="text-sm text-ink-600 leading-relaxed">{app.matchAnalysis.fullReport.summary}</p>
                          )}
                          {app.matchAnalysis.fullReport.strengths.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-ink-500 mb-2">✨ 優勢</p>
                              <ul className="space-y-1">
                                {app.matchAnalysis.fullReport.strengths.map((s, i) => (
                                  <li key={i} className="flex items-start gap-2 text-sm text-ink-600">
                                    <span className="text-sage-500 shrink-0 mt-0.5">•</span>{s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="rounded-xl border border-terra-200 bg-terra-50 p-3">
                            <p className="text-xs font-semibold text-terra-700 mb-1">投遞建議</p>
                            <p className={`text-sm ${getMatchLabel(app.matchAnalysis.matchScore).color}`}>
                              {getMatchLabel(app.matchAnalysis.matchScore).text}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </>
                ) : bgAnalyzing ? (
                  <Card>
                    <CardHeader><CardTitle>技能落差報告</CardTitle></CardHeader>
                    <CardContent className="space-y-3 animate-pulse">
                      <div className="grid grid-cols-3 gap-3">
                        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-xl bg-warm-200" />)}
                      </div>
                      {[75, 50, 65].map(w => <div key={w} className="h-3 bg-warm-200 rounded" style={{ width: `${w}%` }} />)}
                      <p className="text-xs text-ink-400 text-center pt-2">正在分析中…</p>
                    </CardContent>
                  </Card>
                ) : null}
              </div>
            )}
          </div>
        )}

        {/* ③ Interview Prep */}
        {detailTab === 'interview' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Link
                href={`/interview-prep?jobId=${encodeURIComponent(app.id)}&title=${encodeURIComponent(app.jobTitle)}&company=${encodeURIComponent(app.company)}`}
                className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-3 text-sm font-medium text-ink-700 hover:border-terra-300 hover:bg-terra-50 transition-all">
                🎤 針對此職缺生成面試題目 →
              </Link>
              <Link
                href={`/career-intelligence?jobId=${encodeURIComponent(app.id)}&company=${encodeURIComponent(app.company)}&title=${encodeURIComponent(app.jobTitle)}&industry=`}
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
      <PageTooltip pageKey="application_tracker" />
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
      <RateLimitToast visible={rateLimitToast} onDismiss={() => setRateLimitToast(false)} />
    </div>
  )
}
