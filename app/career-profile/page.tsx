'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { ResumeEditor, type SavedResumeData } from '@/components/resume/resume-editor'
import { PageTooltip } from '@/components/onboarding/page-tooltip'

// ── Types ──────────────────────────────────────────────────────────────────────

// Extended for WYSIWYG editor — all new fields are optional for backward compat
interface Education {
  school: string; degree: string; major: string; year: string
  startDate?: string; endDate?: string
}
interface Experience {
  company: string; title: string; description: string
  startDate?: string; endDate?: string; current?: boolean
}
interface ParsedResume {
  name: string; email: string; phone: string
  jobTitle?: string; location?: string; linkedin?: string; website?: string; summary?: string
  skills: string[]
  experiences: Experience[]
  education: Education[]
  languages?: { name: string; level: string }[]
  rawText: string
}
interface ResumeEntry {
  id: string
  name: string
  language: 'zh' | 'en'
  score: number | null
  atsScore: number | null
  scoredAt: string | null
  isPrimary: boolean
  source: 'upload' | 'template' | 'linkedin' | 'manual'
  createdAt: string
  updatedAt: string
  data: ParsedResume
}
interface JournalImage { url: string; aiDescription?: string; uploadedAt: string }
interface JournalEntry {
  id: string; title: string; company: string; jobTitle?: string; date: string
  template: 'star' | 'free' | 'ai'
  situation?: string; task?: string; action?: string; result?: string
  content?: string
  tags: string[]; images: JournalImage[]; createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ['resume', 'journal'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { resume: '◈ Resume Lab', journal: '✍ Work Journal' }

const RESUME_TEMPLATES = [
  { id: 'freshman',     emoji: '🎓', label: '新鮮人', desc: '剛畢業，強調學習能力',    data: { name: '王小明', email: 'example@gmail.com',    phone: '0912-345-678', skills: ['Python', 'Microsoft Office', '數據分析', '快速學習', '英文溝通'],              experiences: [{ company: '某科技公司', title: '暑期實習生',     description: '協助開發內部工具，參與敏捷開發流程' }],                                                                        education: [{ school: '國立台灣大學', degree: '學士', major: '資訊管理學系', year: '2024' }], rawText: '' } },
  { id: 'engineer',     emoji: '⚙️', label: '工程師', desc: '3–5 年，強調技術深度',    data: { name: '李工程', email: 'engineer@gmail.com',   phone: '0923-456-789', skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],                         experiences: [{ company: '某新創公司', title: '資深前端工程師', description: '主導前端架構重構，導入 React + TypeScript，開發效率提升 40%' }, { company: '某傳產公司', title: '軟體工程師', description: '維護 ERP 系統，開發客製化報表模組' }], education: [{ school: '國立成功大學', degree: '學士', major: '資訊工程學系', year: '2021' }], rawText: '' } },
  { id: 'marketing',    emoji: '📢', label: '行銷',   desc: '數位行銷，數據驅動',      data: { name: '陳行銷', email: 'marketing@gmail.com',  phone: '0934-567-890', skills: ['Google Analytics', 'SEO/SEM', 'Meta Ads', '內容行銷', 'KOL 合作'],               experiences: [{ company: '某電商平台', title: '數位行銷專員',   description: '管理月預算 200 萬廣告投放，ROI 提升 35%' }],                                                                   education: [{ school: '輔仁大學',     degree: '學士', major: '廣告傳播學系',   year: '2022' }], rawText: '' } },
  { id: 'management',   emoji: '👔', label: '管理職', desc: '帶領 5 人以上團隊',        data: { name: '張主管', email: 'manager@gmail.com',    phone: '0945-678-901', skills: ['團隊管理', '跨部門協作', 'OKR', '敏捷開發', '人才培育'],                           experiences: [{ company: '某科技集團', title: '產品開發主管',   description: '帶領 8 人團隊，管理 3 個產品線，年營收 2,000 萬' }],                                                              education: [{ school: '政治大學',     degree: '碩士', major: 'MBA',           year: '2019' }], rawText: '' } },
  { id: 'career_change',emoji: '🔄', label: '轉職用', desc: '強調可轉移技能',          data: { name: '林轉職', email: 'change@gmail.com',     phone: '0956-789-012', skills: ['溝通協調', '問題分析', 'Excel 進階', '客戶服務', '自學能力'],                       experiences: [{ company: '某金融機構', title: '業務專員',       description: '管理 200+ 客戶，業績達成率 120%' }],                                                                            education: [{ school: '淡江大學',     degree: '學士', major: '財務金融學系', year: '2020' }],  rawText: '' } },
]

const EMPTY_RESUME: ParsedResume = { name: '', email: '', phone: '', skills: [], experiences: [], education: [], rawText: '' }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d: string) { try { return new Date(d).toLocaleDateString('zh-TW') } catch { return d } }
function detectLang(text: string): 'zh' | 'en' { return /[一-鿿]/.test(text) ? 'zh' : 'en' }
function emptyEntry(): JournalEntry {
  return { id: '', title: '', company: '', jobTitle: '', date: todayStr(), template: 'free', content: '', tags: [], images: [], createdAt: '' }
}

const AI_TOPICS = [
  { id: 'achievement', icon: '🏆', label: '工作成就', desc: '記錄一件最近完成的成果' },
  { id: 'problem',     icon: '💡', label: '問題解決', desc: '記錄一個你解決的難題' },
  { id: 'teamwork',    icon: '🤝', label: '團隊協作', desc: '記錄一次與他人合作的經歷' },
  { id: 'growth',      icon: '📈', label: '技能成長', desc: '記錄你學到的新技能或知識' },
]

const AI_QUESTIONS: Record<string, string[]> = {
  achievement: [
    '這件事情發生在什麼時候？在哪家公司？',
    '你負責的是什麼任務或目標？',
    '你具體做了哪些行動或決策？',
    '最後的結果是什麼？有沒有具體的數字或成效？',
    '這件事對你來說有什麼意義或學習？',
  ],
  problem: [
    '遇到的是什麼問題？當時的工作背景是什麼？',
    '這個問題對工作造成了哪些影響？',
    '你是如何分析問題的？有哪些可能的解決方向？',
    '你最後採取了什麼行動？過程中遇到哪些挑戰？',
    '問題解決後，結果如何？你從中學到了什麼？',
  ],
  teamwork: [
    '這次合作的背景是什麼？有哪些人一起參與？',
    '你在這個團隊中扮演什麼角色？',
    '合作過程中遇到了哪些困難或意見分歧？',
    '你如何促進團隊溝通或化解衝突？',
    '最後的成果是什麼？這次合作對你有什麼啟發？',
  ],
  growth: [
    '你學到的是什麼技能或知識？是什麼契機讓你開始學習？',
    '學習的過程是怎樣的？有遇到哪些挑戰或困難？',
    '你使用了哪些方法或資源來學習？',
    '學會之後，你在工作中如何實際應用這個技能？',
    '這項技能對你的職涯發展有什麼幫助或影響？',
  ],
}

// ── Spinner ────────────────────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CareerProfilePage() {
  const [tab, setTab] = useState<Tab>('resume')

  // Auto-save indicator
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const autoSave = useCallback((key: string, data: unknown) => {
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota */ }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1000)
  }, [])

  // ── Resume state ──────────────────────────────────────────────────────────────
  const [resumeView, setResumeView] = useState<'list' | 'create' | 'edit'>('list')
  const [resumes, setResumes] = useState<ResumeEntry[]>([])
  const [editingResumeId, setEditingResumeId] = useState<string | null>(null)
  const [resumeName, setResumeName] = useState('')
  const [editedResume, setEditedResume] = useState<ParsedResume>(EMPTY_RESUME)
  const [resumeError, setResumeError] = useState('')
  const [parsing, setParsing] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Create-flow state
  const [createMode, setCreateMode] = useState<'none' | 'upload' | 'linkedin' | 'template'>('none')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [linkedinUrl, setLinkedinUrl] = useState('')
  const [linkedinText, setLinkedinText] = useState('')
  const [linkedinStep, setLinkedinStep] = useState<1 | 2>(1)
  const [linkedinParsing, setLinkedinParsing] = useState(false)

  // Skills are managed in /dashboard/skills — only needed here for localStorage merge on resume import

  // ── Journal state ─────────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [draft, setDraft] = useState<JournalEntry>(emptyEntry())
  const [journalView, setJournalView] = useState<'list' | 'form'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'company-asc' | 'company-desc'>('date-desc')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [showFilterPanel, setShowFilterPanel] = useState(false)
  const [companyHistory, setCompanyHistory] = useState<string[]>([])
  const [showCompanyDD, setShowCompanyDD] = useState(false)
  const [showJobTitleDD, setShowJobTitleDD] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [analyzingImg, setAnalyzingImg] = useState(false)
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // AI guided journal state
  const [aiStep, setAiStep] = useState<1 | 2 | 3>(1)
  const [aiTopic, setAiTopic] = useState('')
  const [aiQaIdx, setAiQaIdx] = useState(0)
  const [aiAnswers, setAiAnswers] = useState<string[]>([])
  const [aiCurrentAnswer, setAiCurrentAnswer] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [isListening, setIsListening] = useState(false)

  const jobTitleHistory = useMemo(() => {
    const map: Record<string, string[]> = {}
    entries.forEach((e) => {
      if (e.company && e.jobTitle) {
        if (!map[e.company]) map[e.company] = []
        if (!map[e.company].includes(e.jobTitle)) map[e.company].push(e.jobTitle)
      }
    })
    return map
  }, [entries])

  // Init from localStorage
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)

    const rawEntries = localStorage.getItem('career-journal')
    if (rawEntries) {
      const es: JournalEntry[] = JSON.parse(rawEntries)
      setEntries(es)
      setCompanyHistory([...new Set(es.map((e) => e.company).filter(Boolean))])
    }

    // Multi-resume format (new)
    const rawResumes = localStorage.getItem('career-resumes')
    if (rawResumes) {
      setResumes(JSON.parse(rawResumes))
    } else {
      // Migrate from old single-resume key
      const rawResume = localStorage.getItem('career-resume')
      if (rawResume) {
        const r: ParsedResume = JSON.parse(rawResume)
        const migrated: ResumeEntry = {
          id: genId(), name: r.name || '我的履歷',
          language: detectLang(r.rawText), score: null, atsScore: null, scoredAt: null,
          isPrimary: true, source: 'manual',
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
          data: r,
        }
        setResumes([migrated])
        localStorage.setItem('career-resumes', JSON.stringify([migrated]))
      }
    }
  }, [])

  // ── Resume handlers ──────────────────────────────────────────────────────────

  function persistResumes(next: ResumeEntry[]) {
    setResumes(next)
    localStorage.setItem('career-resumes', JSON.stringify(next))
  }

  function goToEditor(data: ParsedResume, name: string, source: ResumeEntry['source']) {
    setEditedResume(data); setEditingResumeId(null); setResumeName(name)
    setResumeError('')
    setResumeView('edit'); setCreateMode('none')
    // Merge parsed resume skills into the shared skill library in localStorage
    try {
      const raw = localStorage.getItem('career-skills')
      const existing: { name: string; category: string }[] = raw ? JSON.parse(raw) : []
      const existingNames = new Set(existing.map((t) => (typeof t === 'string' ? t : t.name)))
      const toAdd = data.skills
        .filter((s) => !existingNames.has(s))
        .map((s) => ({ name: s, category: '專業技能' }))
      if (toAdd.length) localStorage.setItem('career-skills', JSON.stringify([...existing, ...toAdd]))
    } catch { /* quota or parse error */ }
    void source
  }

  function startEdit(entry: ResumeEntry) {
    setEditedResume(entry.data); setEditingResumeId(entry.id); setResumeName(entry.name)
    setResumeView('edit')
  }

  function deleteResume(id: string) {
    if (!confirm('確定要刪除這份履歷？')) return
    let next = resumes.filter((r) => r.id !== id)
    if (next.length > 0 && !next.some((r) => r.isPrimary)) next = [{ ...next[0], isPrimary: true }, ...next.slice(1)]
    persistResumes(next)
  }

  function setPrimaryResume(id: string) {
    persistResumes(resumes.map((r) => ({ ...r, isPrimary: r.id === id })))
  }

  async function handleFile(f: File) {
    setResumeError(''); setParsing(true)
    const form = new FormData(); form.append('file', f)
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      goToEditor({ ...EMPTY_RESUME, ...data }, data.name || '上傳履歷', 'upload')
    } catch (err) { setResumeError((err as Error).message) }
    finally { setParsing(false) }
  }

  async function handleLinkedinImport() {
    const text = linkedinText.trim(); if (!text) return
    setLinkedinParsing(true); setResumeError('')
    const form = new FormData()
    form.append('file', new Blob([text], { type: 'text/plain' }), 'linkedin.txt')
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      goToEditor({ ...EMPTY_RESUME, ...data }, data.name || 'LinkedIn 履歷', 'linkedin')
      setLinkedinUrl(''); setLinkedinText(''); setLinkedinStep(1)
    } catch (err) { setResumeError((err as Error).message) }
    finally { setLinkedinParsing(false) }
  }

  function applyTemplate() {
    const t = RESUME_TEMPLATES.find((x) => x.id === selectedTemplateId)
    if (!t) return
    goToEditor({ ...EMPTY_RESUME, ...t.data }, `${t.emoji} ${t.label}`, 'template')
    setSelectedTemplateId('')
  }

  // ── Journal handlers ──────────────────────────────────────────────────────────

  function updateDraft<K extends keyof JournalEntry>(field: K, value: JournalEntry[K]) {
    setDraft((p) => ({ ...p, [field]: value }))
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || !files.length) return
    const available = 3 - draft.images.length; if (available <= 0) { alert('每篇日誌最多 3 張圖片'); return }
    setUploadingImg(true)
    for (const f of Array.from(files).slice(0, available)) {
      if (f.size > 5 * 1024 * 1024) { alert(`「${f.name}」超過 5MB`); continue }
      const form = new FormData(); form.append('file', f)
      try {
        const res = await fetch('/api/journal/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) { alert(data.error ?? '上傳失敗'); continue }
        const img: JournalImage = { url: data.url, uploadedAt: new Date().toISOString() }
        setDraft((p) => ({ ...p, images: [...p.images, img] }))
        if (!data.local && data.url) {
          setAnalyzingImg(true)
          fetch('/api/journal/analyze-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: data.url }) })
            .then((r) => r.json())
            .then((d) => { if (d.description) setDraft((p) => ({ ...p, images: p.images.map((im) => im.url === data.url ? { ...im, aiDescription: d.description } : im) })) })
            .catch(() => {}).finally(() => setAnalyzingImg(false))
        }
      } catch { alert('上傳失敗') }
    }
    setUploadingImg(false)
  }

  async function saveEntry() {
    const id = editingId ?? genId()
    const entry: JournalEntry = { ...draft, id, createdAt: new Date().toISOString() }
    const next = editingId ? entries.map((e) => e.id === editingId ? entry : e) : [entry, ...entries]
    setEntries(next); autoSave('career-journal', next)
    if (entry.company && !companyHistory.includes(entry.company)) setCompanyHistory((p) => [...p, entry.company])
    setJournalView('list'); setEditingId(null); setDraft(emptyEntry())
    const text = [entry.content, entry.situation, entry.task, entry.action, entry.result].filter(Boolean).join('\n')
    setTaggingId(id)
    fetch('/api/journal/tag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then((r) => r.json())
      .then((d) => {
        setEntries((p) => {
          const u = p.map((e) => e.id === id ? { ...e, ...(d.tags?.length ? { tags: d.tags } : {}), ...(d.title && !e.title ? { title: d.title } : {}) } : e)
          autoSave('career-journal', u); return u
        })
      })
      .catch(() => {}).finally(() => setTaggingId(null))
  }

  function closeJournalForm() {
    setJournalView('list'); setEditingId(null); setDraft(emptyEntry())
    setAiStep(1); setAiTopic(''); setAiQaIdx(0); setAiAnswers([]); setAiCurrentAnswer('')
  }
  function deleteEntry(id: string) { const next = entries.filter((e) => e.id !== id); setEntries(next); autoSave('career-journal', next) }
  function editEntry(e: JournalEntry) { setDraft({ ...e }); setEditingId(e.id); setJournalView('form') }

  async function generateAiDraft(answers: string[]) {
    const topic = AI_TOPICS.find(t => t.id === aiTopic)
    const questions = AI_QUESTIONS[aiTopic] || []
    const qaPairs = questions.map((q, i) => `問題 ${i + 1}：${q}\n回答 ${i + 1}：${answers[i] || '（未填寫）'}`).join('\n\n')
    const prompt = `你是一個職涯日誌撰寫助手。以下是使用者針對「${topic?.label}」主題的問答記錄：\n\n${qaPairs}\n\n請根據以上內容，撰寫一篇結構清晰的工作日誌，要求：\n- 標題：15字以內，吸引人\n- 內容：以第一人稱，約200-300字，語氣自然真實，條理清晰\n\n只回傳以下 JSON，不要其他文字：\n{\n  "title": "日誌標題",\n  "content": "日誌完整內容"\n}`
    setAiGenerating(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: prompt }], context: 'journal_writer' }),
      })
      const data = await res.json()
      const match = data.reply?.match(/\{[\s\S]*\}/)
      if (match) {
        const parsed = JSON.parse(match[0])
        updateDraft('title', parsed.title || '')
        updateDraft('content', parsed.content || '')
      }
      setAiStep(3)
    } catch { /* silent */ }
    finally { setAiGenerating(false) }
  }

  function startListening(append: (t: string) => void) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) { alert('您的瀏覽器不支援語音輸入，請手動輸入'); return }
    const recognition = new SR()
    recognition.lang = 'zh-TW'
    recognition.continuous = false
    recognition.interimResults = false
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => { append(e.results[0][0].transcript) }
    recognition.onend = () => setIsListening(false)
    recognition.onerror = () => setIsListening(false)
    setIsListening(true)
    recognition.start()
  }

  const sortedEntries = [...entries].sort((a, b) => {
    if (sortBy === 'date-desc') return b.date.localeCompare(a.date)
    if (sortBy === 'date-asc')  return a.date.localeCompare(b.date)
    if (sortBy === 'company-asc')  return a.company.localeCompare(b.company)
    return b.company.localeCompare(a.company)
  })
  const filteredEntries = sortedEntries.filter((e) => {
    if (filterDateFrom && e.date < filterDateFrom) return false
    if (filterDateTo   && e.date > filterDateTo)   return false
    if (filterCompany  && !e.company.toLowerCase().includes(filterCompany.toLowerCase())) return false
    if (filterTags.length > 0 && !filterTags.every((t) => e.tags.includes(t))) return false
    return true
  })
  const activeFilterCount = [filterDateFrom, filterDateTo, filterCompany].filter(Boolean).length + filterTags.length
  function clearFilters() { setFilterDateFrom(''); setFilterDateTo(''); setFilterCompany(''); setFilterTags([]) }

  // ── Card variant helper ───────────────────────────────────────────────────────
  const entryCardCls = (active: boolean) =>
    `flex flex-col items-center gap-3 rounded-2xl border-2 py-5 px-5 cursor-pointer transition-all text-center ${
      active ? 'border-terra-400 bg-terra-50' : 'border-warm-200 bg-white hover:border-terra-300 hover:bg-terra-50/50'
    }`

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      <PageTooltip pageKey="resume_lab" />
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink-900">◈ Resume Lab</h1>
          <p className="mt-1 text-xs md:text-sm text-ink-500">履歷管理 · 技能標籤 · 工作日誌</p>
        </div>
        {saveStatus !== 'idle' && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${saveStatus === 'saved' ? 'bg-sage-500/10 text-sage-600' : 'bg-cream-200 text-ink-400'}`}>
            {saveStatus === 'saving' ? <><Spinner className="h-3 w-3" />儲存中</> : '✓ 已儲存'}
          </span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-full sm:w-fit shadow-[var(--shadow-warm-xs)] overflow-x-auto">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-3 md:px-4 py-1.5 text-xs md:text-sm font-medium transition-all ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          RESUME TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'resume' && (
        <div className="space-y-5">

          {/* ── LEVEL 1: Resume List ──────────────────────────────────────────── */}
          {resumeView === 'list' && (
            <div className="space-y-5">
              {/* Level-1 header */}
              <div className="flex items-center justify-between">
                <h2 className="text-base font-semibold text-ink-800">我的履歷</h2>
                <Button variant="primary" size="sm" onClick={() => { setCreateMode('none'); setResumeView('create') }}>
                  ＋ 新增履歷
                </Button>
              </div>

              {/* Empty state */}
              {resumes.length === 0 && (
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-warm-200 bg-white py-20 space-y-4">
                  <span className="text-5xl">📄</span>
                  <p className="font-medium text-ink-600">尚未建立任何履歷</p>
                  <p className="text-sm text-ink-400">建立你的第一份履歷，開始職涯旅程</p>
                  <Button variant="primary" onClick={() => { setCreateMode('none'); setResumeView('create') }}>＋ 新增履歷</Button>
                </div>
              )}

              {/* Resume cards */}
              <div className="space-y-3">
                {resumes.map((r) => {
                  const scoreColor =
                    r.score === null ? '' :
                    r.score >= 90 ? 'text-sage-600' :
                    r.score >= 75 ? 'text-honey-500' :
                    r.score >= 60 ? 'text-terra-400' : 'text-red-500'
                  const scoreDot =
                    r.score === null ? '' :
                    r.score >= 90 ? '🟢' :
                    r.score >= 75 ? '🟡' :
                    r.score >= 60 ? '🟠' : '🔴'

                  return (
                    <Card key={r.id}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          {/* ── Left: name + badges ── */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center flex-wrap gap-2 mb-1.5">
                              <p className="font-semibold text-ink-700 text-sm">{r.name}</p>
                              {r.isPrimary && <Badge variant="success">主要履歷</Badge>}
                              <Badge variant="outline">{r.language === 'zh' ? '中文' : 'English'}</Badge>
                              <Badge variant="outline">{r.source === 'upload' ? '上傳' : r.source === 'template' ? '範本' : r.source === 'linkedin' ? 'LinkedIn' : '手動'}</Badge>
                            </div>
                            {/* ── Second row: date · score ── */}
                            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-ink-400">
                              <span>更新於 {fmtDate(r.updatedAt)}</span>
                              {r.score !== null ? (
                                <>
                                  <span className="text-warm-300">·</span>
                                  <span className={`font-medium ${scoreColor}`}>
                                    {scoreDot} AI 評分：{r.score} 分
                                  </span>
                                  {r.scoredAt && (
                                    <span className="text-ink-300">（{fmtDate(r.scoredAt)} 評分）</span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="text-warm-300">·</span>
                                  <span className="text-ink-300">尚未評分</span>
                                  <button
                                    onClick={() => startEdit(r)}
                                    className="rounded-md border border-warm-200 bg-cream-100 px-2 py-0.5 text-[11px] text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-all">
                                    立即評分
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {/* ── Right: action buttons ── */}
                          <div className="flex flex-col sm:flex-row gap-1.5 shrink-0">
                            {!r.isPrimary && (
                              <button onClick={() => setPrimaryResume(r.id)}
                                className="rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-sage-300 hover:text-sage-600 transition-all whitespace-nowrap">
                                設為主要
                              </button>
                            )}
                            <button onClick={() => startEdit(r)}
                              className="rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-terra-300 hover:text-terra-600 transition-all">
                              編輯
                            </button>
                            <button onClick={() => deleteResume(r.id)}
                              className="rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">
                              刪除
                            </button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── LEVEL 2: Create New Resume ────────────────────────────────────── */}
          {resumeView === 'create' && (
            <div className="space-y-6">
              {/* Back + title */}
              <button onClick={() => { setResumeView('list'); setCreateMode('none'); setResumeError('') }}
                className="flex items-center gap-1 text-sm text-ink-400 hover:text-ink-700 transition-colors">
                ← 返回
              </button>
              <div>
                <h2 className="text-xl font-bold text-ink-900">打造您的完美履歷</h2>
                <p className="text-sm text-ink-500 mt-1">選擇一種方式開始</p>
              </div>

              {/* Two entry cards */}
              <div className="flex justify-center">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full" style={{ maxWidth: '832px' }}>
                  {/* Card 1: Upload */}
                  <button className={entryCardCls(createMode === 'upload')} onClick={() => { setCreateMode('upload'); setResumeError('') }}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-terra-50 border border-terra-100 text-xl">↑</div>
                    <div>
                      <p className="font-semibold text-ink-800 text-sm">上傳履歷</p>
                      <p className="text-xs text-ink-400 mt-1 leading-relaxed">自動解析並最佳化<br/>支援 PDF、DOC、DOCX</p>
                    </div>
                  </button>

                  {/* Card 2: Manual build */}
                  <button className={entryCardCls(false)} onClick={() => goToEditor(EMPTY_RESUME, '新履歷', 'manual')}>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-honey-50 border border-amber-100 text-xl">📄</div>
                    <div>
                      <p className="font-semibold text-ink-800 text-sm">建立履歷</p>
                      <p className="text-xs text-ink-400 mt-1 leading-relaxed">從空白開始，自由填寫你的履歷</p>
                    </div>
                  </button>
                </div>
              </div>

              {/* ── Upload expanded ── */}
              {createMode === 'upload' && (
                <Card>
                  <CardContent className="pt-5 space-y-4">
                    <div
                      className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 cursor-pointer transition-all ${dragging ? 'border-terra-400 bg-terra-50' : 'border-warm-300 hover:border-terra-300 hover:bg-terra-50/50'}`}
                      onClick={() => fileRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
                      <span className="text-3xl mb-2">↑</span>
                      <p className="text-sm font-medium text-ink-600">拖曳或點擊上傳</p>
                      <p className="text-xs text-ink-400 mt-1">PDF · DOCX · DOC · 最大 10MB</p>
                      {parsing && <div className="mt-3 flex items-center gap-2 text-sm text-terra-500"><Spinner />AI 解析中...</div>}
                    </div>
                    <input ref={fileRef} type="file" accept=".pdf,.doc,.docx" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                    {resumeError && <p className="text-sm text-red-400">{resumeError}</p>}
                  </CardContent>
                </Card>
              )}

            </div>
          )}

          {/* ── LEVEL 3: WYSIWYG Editor ──────────────────────────────────────── */}
          {resumeView === 'edit' && (
            <ResumeEditor
              initialData={editedResume as SavedResumeData}
              initialName={resumeName}
              onSave={(data, name) => {
                const now = new Date().toISOString()
                const existing = resumes.find((r) => r.id === editingResumeId)
                const newId = editingResumeId ?? genId()
                const entry: ResumeEntry = {
                  id: newId,
                  name: name.trim() || data.name || '我的履歷',
                  language: detectLang(data.rawText),
                  score: existing?.score ?? null,
                  atsScore: existing?.atsScore ?? null,
                  scoredAt: existing?.scoredAt ?? null,
                  isPrimary: existing?.isPrimary ?? resumes.length === 0,
                  source: existing?.source ?? 'manual',
                  createdAt: existing?.createdAt ?? now,
                  updatedAt: now,
                  data: data as ParsedResume,
                }
                const next = editingResumeId
                  ? resumes.map((r) => r.id === editingResumeId ? entry : r)
                  : [...resumes, entry]
                persistResumes(next)
                if (!editingResumeId) setEditingResumeId(newId)
              }}
              onBack={() => { setResumeView('list'); setResumeError('') }}
              onScoreUpdate={(score, atsScore, scoredAt) => {
                const id = editingResumeId ?? resumes[resumes.length - 1]?.id
                if (!id) return
                const next = resumes.map((r) =>
                  r.id === id ? { ...r, score, atsScore, scoredAt } : r
                )
                persistResumes(next)
              }}
            />
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          JOURNAL TAB
      ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'journal' && journalView === 'list' && (
        <div className="space-y-4">
          {/* ── Operation bar ── */}
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => { setDraft(emptyEntry()); setEditingId(null); setJournalView('form') }}>＋ 新增日誌</Button>
            <div className="flex-1" />
            {/* Sort dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none rounded-lg border border-warm-200 bg-white pl-3 pr-7 py-1.5 text-xs text-ink-600 focus:border-terra-400 focus:outline-none cursor-pointer hover:border-warm-300 transition-colors">
                <option value="date-desc">最新日期優先</option>
                <option value="date-asc">最舊日期優先</option>
                <option value="company-asc">公司名稱 A→Z</option>
                <option value="company-desc">公司名稱 Z→A</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-ink-400 text-[10px]">↕</span>
            </div>
            {/* Filter button */}
            <button
              onClick={() => setShowFilterPanel((v) => !v)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all ${showFilterPanel || activeFilterCount > 0 ? 'border-terra-300 bg-terra-50 text-terra-600' : 'border-warm-200 bg-white text-ink-500 hover:border-warm-300'}`}>
              ⚙ 篩選
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-terra-500 text-[9px] font-bold text-white">{activeFilterCount}</span>
              )}
            </button>
          </div>

          {/* ── Filter panel ── */}
          {showFilterPanel && (
            <div className="rounded-xl border border-warm-200 bg-white p-4 space-y-4 shadow-[var(--shadow-warm-xs)]">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-ink-600">篩選條件</p>
                <div className="flex items-center gap-2">
                  {activeFilterCount > 0 && (
                    <span className="text-[10px] font-medium text-terra-600 bg-terra-50 border border-terra-200 rounded-full px-2 py-0.5">
                      已套用 {activeFilterCount} 個篩選
                    </span>
                  )}
                  {activeFilterCount > 0 && (
                    <button onClick={clearFilters} className="text-xs text-ink-400 hover:text-ink-700 transition-colors">清除篩選</button>
                  )}
                </div>
              </div>

              {/* Date range */}
              <div>
                <p className="text-[10px] font-medium text-ink-400 uppercase tracking-wide mb-2">日期範圍</p>
                <div className="flex items-center gap-2">
                  <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="flex-1 rounded-lg border border-warm-300 bg-cream-50 px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" />
                  <span className="text-xs text-ink-400 shrink-0">～</span>
                  <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
                    className="flex-1 rounded-lg border border-warm-300 bg-cream-50 px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" />
                </div>
              </div>

              {/* Company */}
              <div>
                <p className="text-[10px] font-medium text-ink-400 uppercase tracking-wide mb-2">公司</p>
                <select value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
                  className="w-full rounded-lg border border-warm-300 bg-cream-50 px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none">
                  <option value="">全部公司</option>
                  {companyHistory.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Tags */}
              <div>
                <p className="text-[10px] font-medium text-ink-400 uppercase tracking-wide mb-2">標籤類別（可多選）</p>
                <div className="flex flex-wrap gap-1.5">
                  {['問題解決', '領導力', '跨部門協作', '技術實作', '客戶關係', '數據分析'].map((tag) => {
                    const active = filterTags.includes(tag)
                    return (
                      <button key={tag} onClick={() => setFilterTags((prev) => active ? prev.filter((t) => t !== tag) : [...prev, tag])}
                        className={`rounded-full border px-2.5 py-1 text-xs transition-all ${active ? 'border-terra-400 bg-terra-50 text-terra-700 font-medium' : 'border-warm-200 text-ink-500 hover:border-warm-400'}`}>
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-3xl mb-2">✍</p>
              <p className="text-sm text-ink-500">{entries.length > 0 ? '沒有符合篩選條件的日誌' : '尚未新增日誌'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-ink-700">{entry.title || '(AI 生成標題中...)'}</p>
                          <Badge variant="outline">{entry.template === 'star' ? '⭐ STAR' : entry.template === 'ai' ? '🤖 AI引導' : '📝 自由'}</Badge>
                          {taggingId === entry.id && <span className="text-[10px] text-terra-500 flex items-center gap-1"><Spinner className="h-2.5 w-2.5" />AI 標記中</span>}
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{entry.company && `${entry.company}`}{entry.jobTitle && ` · ${entry.jobTitle}`}{` · ${fmtDate(entry.date)}`}</p>
                        {entry.tags.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{entry.tags.map((t) => <Badge key={t} variant="terra">{t}</Badge>)}</div>}
                        {entry.images.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {entry.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img.url} alt="" className="h-12 w-12 rounded-lg object-cover border border-warm-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxUrl(img.url)} />
                            ))}
                          </div>
                        )}
                        <p className="mt-2 text-xs text-ink-500 line-clamp-2 leading-relaxed">{entry.content || entry.situation || ''}</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <button onClick={() => editEntry(entry)} className="rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-warm-300 hover:text-ink-600 transition-all">編輯</button>
                        <button onClick={() => deleteEntry(entry.id)} className="rounded-lg border border-warm-200 bg-white px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all">刪除</button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          JOURNAL FORM VIEW (full-screen within content area)
      ══════════════════════════════════════════════════════════════════════════ */}
      {tab === 'journal' && journalView === 'form' && (
        <div>
          {/* ── Top bar: back + title ── */}
          <div className="flex items-center gap-3 mb-6">
            <button
              onClick={closeJournalForm}
              className="flex items-center gap-1.5 rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-800 transition-colors">
              ← 返回
            </button>
            <h2 className="text-base font-semibold text-ink-800">{editingId ? '編輯日誌' : '新增日誌'}</h2>
          </div>

          {/* ── Form body (max 800px, centered) ── */}
          <div className="max-w-[800px] mx-auto space-y-5 pb-24">

            {/* Template selector */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-ink-400 shrink-0">記錄格式：</span>
              {([
                { id: 'star', label: '⭐ STAR 格式' },
                { id: 'free', label: '📝 自由記錄' },
                { id: 'ai',   label: '🤖 AI 引導' },
              ] as { id: 'star' | 'free' | 'ai'; label: string }[]).map((t) => (
                <button key={t.id}
                  onClick={() => {
                    updateDraft('template', t.id)
                    if (t.id !== 'ai') { setAiStep(1); setAiTopic(''); setAiQaIdx(0); setAiAnswers([]); setAiCurrentAnswer('') }
                  }}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${draft.template === t.id ? 'bg-terra-50 border-terra-400 text-terra-600' : 'bg-white border-warm-200 text-ink-400 hover:border-warm-300 hover:text-ink-600'}`}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* Company + JobTitle + Date */}
            <div className="grid grid-cols-2 sm:grid-cols-10 gap-4">
              <div className="relative col-span-1 sm:col-span-4">
                <label className="block text-xs font-medium text-ink-500 mb-1.5">公司</label>
                <input
                  className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                  placeholder="任職公司" value={draft.company}
                  onChange={(e) => updateDraft('company', e.target.value)}
                  onFocus={() => setShowCompanyDD(true)}
                  onBlur={() => setTimeout(() => setShowCompanyDD(false), 150)} />
                {showCompanyDD && companyHistory.length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-xl border border-warm-200 bg-white shadow-[var(--shadow-warm-md)] z-10">
                    {companyHistory.filter((c) => c.toLowerCase().includes(draft.company.toLowerCase())).map((c) => (
                      <button key={c} className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-cream-100 first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => { updateDraft('company', c); setShowCompanyDD(false) }}>{c}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative col-span-1 sm:col-span-3">
                <label className="block text-xs font-medium text-ink-500 mb-1.5">職位</label>
                <input
                  className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                  placeholder="任職職位" value={draft.jobTitle ?? ''}
                  onChange={(e) => updateDraft('jobTitle', e.target.value)}
                  onFocus={() => setShowJobTitleDD(true)}
                  onBlur={() => setTimeout(() => setShowJobTitleDD(false), 150)} />
                {showJobTitleDD && draft.company && (jobTitleHistory[draft.company] ?? []).length > 0 && (
                  <div className="absolute top-full mt-1 w-full rounded-xl border border-warm-200 bg-white shadow-[var(--shadow-warm-md)] z-10">
                    {(jobTitleHistory[draft.company] ?? []).filter((t) => t.toLowerCase().includes((draft.jobTitle ?? '').toLowerCase())).map((t) => (
                      <button key={t} className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-cream-100 first:rounded-t-xl last:rounded-b-xl"
                        onClick={() => { updateDraft('jobTitle', t); setShowJobTitleDD(false) }}>{t}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="col-span-2 sm:col-span-3">
                <label className="block text-xs font-medium text-ink-500 mb-1.5">日期</label>
                <input type="date" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)}
                  className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 focus:border-terra-400 focus:outline-none" />
              </div>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-ink-500 mb-1.5">標題（選填，留空由 AI 自動生成）</label>
              <input
                className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                placeholder="AI 將根據內容自動生成標題..." value={draft.title}
                onChange={(e) => updateDraft('title', e.target.value)} />
            </div>

            {/* Content — STAR / free / AI guided */}
            {draft.template === 'star' ? (
              <div className="space-y-3">
                {([
                  ['situation', '🔲 Situation — 情境', '描述當時面臨的背景或情況...'],
                  ['task',      '🎯 Task — 任務',      '你被賦予的目標或職責是什麼...'],
                  ['action',    '⚡ Action — 行動',    '你具體採取了哪些行動或步驟...'],
                  ['result',    '✅ Result — 結果',    '帶來了什麼成果或影響...'],
                ] as [keyof JournalEntry, string, string][]).map(([f, label, ph]) => (
                  <div key={f}>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">{label}</label>
                    <textarea
                      rows={3}
                      placeholder={ph}
                      value={(draft[f] as string) ?? ''}
                      onChange={(e) => updateDraft(f, e.target.value)}
                      className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-none leading-relaxed" />
                  </div>
                ))}
              </div>
            ) : draft.template === 'ai' ? (
              <div className="space-y-5">
                {/* ── Step 1: Choose topic ── */}
                {aiStep === 1 && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3">
                      <p className="text-sm font-medium text-sage-700">選擇今天想記錄的主題</p>
                      <p className="text-xs text-sage-500 mt-0.5">AI 將根據主題引導你回答 5 個問題，幫你整理成完整日誌</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {AI_TOPICS.map((topic) => (
                        <button key={topic.id}
                          onClick={() => { setAiTopic(topic.id); setAiStep(2); setAiQaIdx(0); setAiAnswers([]); setAiCurrentAnswer('') }}
                          className="flex items-start gap-3 rounded-xl border-2 border-warm-200 bg-white p-4 text-left hover:border-terra-300 hover:bg-terra-50/50 transition-all">
                          <span className="text-2xl shrink-0">{topic.icon}</span>
                          <div>
                            <p className="text-sm font-semibold text-ink-700">{topic.label}</p>
                            <p className="text-xs text-ink-400 mt-0.5">{topic.desc}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Step 2: Q&A ── */}
                {aiStep === 2 && !aiGenerating && (
                  <div className="space-y-4">
                    {/* Progress */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-ink-500">問題 {aiQaIdx + 1} / 5</span>
                      <div className="flex gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={i} className={`h-1.5 w-7 rounded-full transition-colors ${i <= aiQaIdx ? 'bg-terra-400' : 'bg-warm-200'}`} />
                        ))}
                      </div>
                    </div>

                    {/* Previous Q&As */}
                    {aiQaIdx > 0 && (
                      <div className="space-y-2">
                        {Array.from({ length: aiQaIdx }).map((_, i) => (
                          <div key={i} className="opacity-60 space-y-1">
                            <div className="bg-sage-50 border-l-4 border-sage-400 p-3 rounded-r-lg">
                              <p className="text-xs text-sage-700">{AI_QUESTIONS[aiTopic]?.[i]}</p>
                            </div>
                            <div className="ml-4 bg-white border border-warm-200 rounded-lg px-3 py-2 text-xs text-ink-600 whitespace-pre-line">{aiAnswers[i]}</div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Current question */}
                    <div className="bg-sage-50 border-l-4 border-sage-400 p-3 rounded-r-lg">
                      <p className="text-[10px] text-sage-500 font-medium uppercase tracking-wide mb-1">AI 提問</p>
                      <p className="text-sm text-ink-700 font-medium leading-relaxed">{AI_QUESTIONS[aiTopic]?.[aiQaIdx]}</p>
                    </div>

                    {/* Answer textarea */}
                    <div className="relative">
                      <textarea
                        rows={4}
                        placeholder="請輸入你的回答..."
                        value={aiCurrentAnswer}
                        onChange={(e) => setAiCurrentAnswer(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && e.metaKey) e.currentTarget.blur() }}
                        className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 pr-12 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-none leading-relaxed"
                        style={{ minHeight: '100px' }} />
                      <button
                        type="button"
                        onClick={() => startListening((t) => setAiCurrentAnswer((p) => p ? p + ' ' + t : t))}
                        title="語音輸入"
                        className={`absolute bottom-3 right-3 flex items-center justify-center w-8 h-8 rounded-full border transition-colors ${isListening ? 'bg-red-50 border-red-300 text-red-400 animate-pulse' : 'bg-cream-100 border-warm-200 text-ink-400 hover:border-terra-300 hover:text-terra-500'}`}>
                        🎙
                      </button>
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                      <button
                        onClick={() => {
                          if (aiQaIdx > 0) {
                            setAiQaIdx(aiQaIdx - 1)
                            setAiCurrentAnswer(aiAnswers[aiQaIdx - 1] || '')
                          } else {
                            setAiStep(1)
                          }
                        }}
                        className="text-sm text-ink-400 hover:text-ink-600 transition-colors">
                        ← {aiQaIdx > 0 ? '上一題' : '重新選擇主題'}
                      </button>
                      <button
                        disabled={!aiCurrentAnswer.trim()}
                        onClick={() => {
                          const newAnswers = [...aiAnswers]
                          newAnswers[aiQaIdx] = aiCurrentAnswer
                          setAiAnswers(newAnswers)
                          if (aiQaIdx < 4) {
                            setAiQaIdx(aiQaIdx + 1)
                            setAiCurrentAnswer(newAnswers[aiQaIdx + 1] || '')
                          } else {
                            generateAiDraft(newAnswers)
                          }
                        }}
                        className="flex items-center gap-1.5 rounded-lg bg-terra-500 px-4 py-2 text-sm font-medium text-white hover:bg-terra-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
                        {aiQaIdx < 4 ? '下一題 →' : '生成日誌 →'}
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Generating state ── */}
                {aiGenerating && (
                  <div className="flex flex-col items-center py-16 gap-4">
                    <Spinner className="h-7 w-7 text-terra-500" />
                    <p className="text-sm text-ink-500">AI 正在整理你的回答，生成日誌草稿…</p>
                  </div>
                )}

                {/* ── Step 3: Edit draft ── */}
                {aiStep === 3 && !aiGenerating && (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-sage-200 bg-sage-50 px-4 py-3 flex items-center gap-2">
                      <span className="text-lg">✨</span>
                      <p className="text-sm text-sage-700">AI 已生成日誌草稿，可以直接修改後儲存</p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">標題</label>
                      <input
                        className="w-full rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 focus:border-terra-400 focus:outline-none"
                        value={draft.title}
                        onChange={(e) => updateDraft('title', e.target.value)} />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-ink-500 mb-1.5">內容</label>
                      <textarea
                        rows={10}
                        value={draft.content ?? ''}
                        onChange={(e) => updateDraft('content', e.target.value)}
                        className="w-full min-h-[280px] rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 focus:border-terra-400 focus:outline-none resize-y leading-relaxed" />
                    </div>
                    <button
                      onClick={() => { setAiStep(2); setAiQaIdx(4); setAiCurrentAnswer(aiAnswers[4] || '') }}
                      className="text-xs text-ink-400 hover:text-ink-600 transition-colors">
                      ← 返回修改回答
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-ink-500 mb-1.5">內容</label>
                <textarea
                  rows={10}
                  placeholder="記錄這次的工作故事、心得或成就..."
                  value={draft.content ?? ''}
                  onChange={(e) => updateDraft('content', e.target.value)}
                  className="w-full min-h-[300px] rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-y leading-relaxed" />
              </div>
            )}

            {/* Tags */}
            <div className="rounded-xl border border-warm-200 bg-white p-4">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">標籤類別（可多選，AI 儲存後會自動補充）</p>
              <div className="flex flex-wrap gap-2">
                {['問題解決', '領導力', '跨部門協作', '技術實作', '客戶關係', '數據分析', '創新', '流程優化', '溝通協調', '專案管理'].map((tag) => {
                  const active = draft.tags.includes(tag)
                  return (
                    <button key={tag}
                      onClick={() => updateDraft('tags', active ? draft.tags.filter((t) => t !== tag) : [...draft.tags, tag])}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${active ? 'border-terra-400 bg-terra-50 text-terra-700' : 'border-warm-200 bg-cream-50 text-ink-500 hover:border-warm-300 hover:text-ink-700'}`}>
                      {tag}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Images */}
            <div className="rounded-xl border border-warm-200 bg-white p-4">
              <p className="text-xs font-semibold text-ink-500 uppercase tracking-wide mb-3">圖片（最多 3 張）</p>
              <div className="flex gap-2 flex-wrap">
                {draft.images.length < 3 && (
                  <>
                    <button onClick={() => uploadRef.current?.click()} disabled={uploadingImg}
                      className="flex items-center gap-1.5 rounded-lg border border-warm-200 bg-cream-50 px-4 py-2 text-sm text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                      {uploadingImg ? <Spinner className="h-3.5 w-3.5" /> : '📎'} 上傳圖片
                    </button>
                    {isMobile && (
                      <button
                        onClick={() => {
                          const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'
                          i.onchange = (e) => handleImageFiles((e.target as HTMLInputElement).files); i.click()
                        }}
                        disabled={uploadingImg}
                        className="flex items-center gap-1.5 rounded-lg border border-warm-200 bg-cream-50 px-4 py-2 text-sm text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                        📷 拍照
                      </button>
                    )}
                    <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
                  </>
                )}
                {analyzingImg && (
                  <span className="text-xs text-terra-500 flex items-center gap-1 self-center">
                    <Spinner className="h-3 w-3" />AI 正在分析圖片...
                  </span>
                )}
              </div>
              {draft.images.length > 0 && (
                <div className="mt-4 space-y-3">
                  {draft.images.map((img, i) => (
                    <div key={i} className="flex gap-3">
                      <img src={img.url} alt="" className="h-20 w-20 rounded-xl object-cover cursor-pointer border border-warm-200 shrink-0" onClick={() => setLightboxUrl(img.url)} />
                      <div className="flex-1 min-w-0">
                        {img.aiDescription && (
                          <div className="rounded-lg bg-cream-100 border border-warm-200 px-3 py-2 text-xs text-ink-600">
                            <p className="font-medium text-terra-500 mb-1">📷 AI 圖片分析</p>
                            <p>{img.aiDescription}</p>
                          </div>
                        )}
                        <button onClick={() => setDraft((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                          className="mt-1 text-[10px] text-ink-400 hover:text-red-400 transition-colors">移除</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Sticky footer ── */}
          <div className="sticky bottom-0 -mx-4 md:-mx-8 bg-cream-100 border-t border-warm-200 px-4 md:px-8 py-4 flex items-center justify-between">
            <button
              onClick={closeJournalForm}
              className="rounded-xl border border-warm-200 bg-cream-200 px-5 py-2.5 text-sm font-medium text-ink-600 hover:bg-cream-300 transition-colors">
              取消
            </button>
            <button
              onClick={saveEntry}
              disabled={draft.template === 'ai' && aiStep !== 3}
              className="rounded-xl bg-terra-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)] disabled:opacity-40 disabled:cursor-not-allowed">
              {editingId ? '更新日誌' : '✓ 儲存日誌'}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setLightboxUrl(null)}>
          <img src={lightboxUrl} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30">×</button>
        </div>
      )}
    </div>
  )
}
