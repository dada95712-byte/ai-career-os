'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProgressRing } from '@/components/ui/progress-ring'

// ── Types ──────────────────────────────────────────────────────────────────────

const SKILL_CATEGORIES = ['專業技能', '工具與軟體', '核心職能', '軟實力', '語言能力', '證照與認證', '學習中'] as const
type SkillCategory = typeof SKILL_CATEGORIES[number]

interface TaggedSkill { name: string; category: SkillCategory }
interface Education { school: string; degree: string; major: string; year: string }
interface Experience { company: string; title: string; description: string }
interface ParsedResume {
  name: string; email: string; phone: string
  skills: string[]; experiences: Experience[]; education: Education[]; rawText: string
}
interface ResumeScore { score: number; atsScore: number; suggestions: string[]; keywords: string[] }
interface JournalImage { url: string; aiDescription?: string; uploadedAt: string }
interface JournalEntry {
  id: string; title: string; company: string; date: string
  template: 'star' | 'free'
  situation?: string; task?: string; action?: string; result?: string
  content?: string
  tags: string[]; images: JournalImage[]; createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ['resume', 'skills', 'journal'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { resume: '◈ Resume Lab', skills: '⚡ Skill Tags', journal: '✍ Work Journal' }

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  '專業技能':   'bg-terra-50 border-terra-200 text-terra-600',
  '工具與軟體': 'bg-sky-50 border-sky-200 text-sky-600',
  '核心職能':   'bg-violet-50 border-violet-200 text-violet-600',
  '軟實力':     'bg-sage-50 border-sage-200 text-sage-600',
  '語言能力':   'bg-honey-50 border-amber-200 text-honey-500',
  '證照與認證': 'bg-cream-200 border-warm-300 text-ink-600',
  '學習中':     'bg-orange-50 border-orange-200 text-orange-500',
}

const RESUME_TEMPLATES = [
  {
    id: 'freshman', label: '🎓 新鮮人', desc: '剛畢業，強調學習能力',
    data: { name: '王小明', email: 'example@gmail.com', phone: '0912-345-678', skills: ['Python', 'Microsoft Office', '數據分析', '快速學習', '英文溝通'], experiences: [{ company: '某科技公司', title: '暑期實習生', description: '協助開發內部工具，參與敏捷開發流程' }], education: [{ school: '國立台灣大學', degree: '學士', major: '資訊管理學系', year: '2024' }], rawText: '' },
  },
  {
    id: 'engineer', label: '⚙️ 工程師', desc: '3–5 年，強調技術深度',
    data: { name: '李工程', email: 'engineer@gmail.com', phone: '0923-456-789', skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'], experiences: [{ company: '某新創公司', title: '資深前端工程師', description: '主導前端架構重構，導入 React + TypeScript，開發效率提升 40%' }, { company: '某傳產公司', title: '軟體工程師', description: '維護 ERP 系統，開發客製化報表模組' }], education: [{ school: '國立成功大學', degree: '學士', major: '資訊工程學系', year: '2021' }], rawText: '' },
  },
  {
    id: 'marketing', label: '📢 行銷', desc: '數位行銷，數據驅動',
    data: { name: '陳行銷', email: 'marketing@gmail.com', phone: '0934-567-890', skills: ['Google Analytics', 'SEO/SEM', 'Meta Ads', '內容行銷', 'KOL 合作'], experiences: [{ company: '某電商平台', title: '數位行銷專員', description: '管理月預算 200 萬廣告投放，ROI 提升 35%' }], education: [{ school: '輔仁大學', degree: '學士', major: '廣告傳播學系', year: '2022' }], rawText: '' },
  },
  {
    id: 'management', label: '👔 管理職', desc: '帶領 5 人以上團隊',
    data: { name: '張主管', email: 'manager@gmail.com', phone: '0945-678-901', skills: ['團隊管理', '跨部門協作', 'OKR', '敏捷開發', '人才培育'], experiences: [{ company: '某科技集團', title: '產品開發主管', description: '帶領 8 人團隊，管理 3 個產品線，年營收 2,000 萬' }], education: [{ school: '政治大學', degree: '碩士', major: 'MBA', year: '2019' }], rawText: '' },
  },
  {
    id: 'career_change', label: '🔄 轉職用', desc: '強調可轉移技能',
    data: { name: '林轉職', email: 'change@gmail.com', phone: '0956-789-012', skills: ['溝通協調', '問題分析', 'Excel 進階', '客戶服務', '自學能力'], experiences: [{ company: '某金融機構', title: '業務專員', description: '管理 200+ 客戶，業績達成率 120%' }], education: [{ school: '淡江大學', degree: '學士', major: '財務金融學系', year: '2020' }], rawText: '' },
  },
]

const EMPTY_RESUME: ParsedResume = { name: '', email: '', phone: '', skills: [], experiences: [], education: [], rawText: '' }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d: string) { try { return new Date(d).toLocaleDateString('zh-TW') } catch { return d } }
function emptyEntry(): JournalEntry {
  return { id: '', title: '', company: '', date: todayStr(), template: 'free', content: '', tags: [], images: [], createdAt: '' }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CareerProfilePage() {
  const [tab, setTab] = useState<Tab>('resume')

  // Auto-save
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

  // Resume state
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [editedResume, setEditedResume] = useState<ParsedResume>(EMPTY_RESUME)
  const [isEditing, setIsEditing] = useState(false)
  const [resumeSaved, setResumeSaved] = useState(false)
  const [score, setScore] = useState<ResumeScore | null>(null)
  const [parsing, setParsing] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [showUpload, setShowUpload] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // Skills state
  const [skills, setSkills] = useState<TaggedSkill[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [newSkillCat, setNewSkillCat] = useState<SkillCategory>('核心職能')
  const [skillView, setSkillView] = useState<'category' | 'all'>('category')
  const [collapsedCats, setCollapsedCats] = useState<Set<SkillCategory>>(new Set())
  const [recommendedSkills, setRecommendedSkills] = useState<Array<{name: string; category: SkillCategory}>>([])
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set())
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

  // Journal state
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [draft, setDraft] = useState<JournalEntry>(emptyEntry())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'company'>('date')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterCompany, setFilterCompany] = useState('')
  const [companyHistory, setCompanyHistory] = useState<string[]>([])
  const [showCompanyDD, setShowCompanyDD] = useState(false)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [analyzingImg, setAnalyzingImg] = useState(false)
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)

  // Init from localStorage
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const rawSkills = localStorage.getItem('career-skills')
    if (rawSkills) {
      const parsed = JSON.parse(rawSkills)
      if (Array.isArray(parsed)) {
        // Migrate old string[] format
        if (typeof parsed[0] === 'string') {
          setSkills(parsed.map((s: string) => ({ name: s, category: '核心職能' as SkillCategory })))
        } else {
          setSkills(parsed)
        }
      }
    }
    const rawEntries = localStorage.getItem('career-journal')
    if (rawEntries) {
      const es: JournalEntry[] = JSON.parse(rawEntries)
      setEntries(es)
      const companies = [...new Set(es.map((e) => e.company).filter(Boolean))]
      setCompanyHistory(companies)
    }
    const rawResume = localStorage.getItem('career-resume')
    if (rawResume) {
      const r = JSON.parse(rawResume); setParsed(r); setEditedResume(r); setIsEditing(true)
    }
  }, [])

  // ── Resume handlers ──
  async function handleFile(f: File) {
    setResumeError(''); setParsing(true); setParsed(null); setScore(null); setResumeSaved(false)
    const form = new FormData(); form.append('file', f)
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      const r: ParsedResume = { ...EMPTY_RESUME, ...data }
      setParsed(r); setEditedResume(r); setIsEditing(true); setShowUpload(false)
      // Auto-add skills with AI category detection
      const newTagged = r.skills.map((s) => ({ name: s, category: '專業技能' as SkillCategory }))
      setSkills((p) => {
        const existing = new Set(p.map((t) => t.name))
        const toAdd = newTagged.filter((t) => !existing.has(t.name))
        const next = [...p, ...toAdd]; autoSave('career-skills', next); return next
      })
    } catch (err) { setResumeError((err as Error).message) }
    finally { setParsing(false) }
  }

  function applyTemplate(t: typeof RESUME_TEMPLATES[number]) {
    const r: ParsedResume = { ...EMPTY_RESUME, ...t.data }
    setParsed(r); setEditedResume(r); setIsEditing(true); setShowTemplates(false); setResumeSaved(false)
  }

  function updateResume<K extends keyof ParsedResume>(field: K, value: ParsedResume[K]) {
    setEditedResume((p) => ({ ...p, [field]: value }))
    setResumeSaved(false)
  }

  function saveResume() {
    autoSave('career-resume', editedResume)
    setResumeSaved(true)
    setTimeout(() => setResumeSaved(false), 3000)
  }

  function updateExp(i: number, field: keyof Experience, value: string) {
    updateResume('experiences', editedResume.experiences.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }
  function updateEdu(i: number, field: keyof Education, value: string) {
    updateResume('education', editedResume.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e))
  }

  async function handleScore() {
    const text = editedResume.rawText || parsed?.rawText || ''
    if (!text) return
    setScoring(true)
    try {
      const res = await fetch('/api/resume/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeText: text }) })
      setScore(await res.json())
    } catch { setResumeError('評分失敗') }
    finally { setScoring(false) }
  }

  // ── Skills handlers ──
  function addSkill() {
    const t = newSkill.trim(); if (!t || skills.some((s) => s.name === t)) return
    const next = [...skills, { name: t, category: newSkillCat }]
    setSkills(next); autoSave('career-skills', next); setNewSkill('')
  }
  function removeSkill(name: string) {
    const next = skills.filter((s) => s.name !== name); setSkills(next); autoSave('career-skills', next)
  }
  function toggleCat(cat: SkillCategory) {
    setCollapsedCats((p) => { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  async function handleRecommendSkills() {
    const text = entries.map((e) =>
      [e.title, e.content, e.situation, e.task, e.action, e.result].filter(Boolean).join(' ')
    ).join('\n')
    if (!text.trim()) { alert('請先新增一些工作日誌再進行分析'); return }
    setLoadingRecommend(true); setRecommendedSkills([]); setCheckedSkills(new Set()); setShowRecommend(true)
    try {
      const result = await fetch('/api/skills/recommend-from-journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText: text })
      })
      const data = await result.json()
      // Return with category guessing
      const withCats = (data.skills ?? []).map((s: string) => ({
        name: s,
        category: guessCategory(s),
      }))
      setRecommendedSkills(withCats)
    } catch { setRecommendedSkills([]) }
    finally { setLoadingRecommend(false) }
  }

  function guessCategory(skill: string): SkillCategory {
    const lower = skill.toLowerCase()
    if (/python|react|node|sql|docker|git|aws|figma|excel|office|javascript|typescript|java|c\+\+/.test(lower)) return '工具與軟體'
    if (/english|日文|日語|韓文|french|德文|語言|toeic|ielts/.test(lower)) return '語言能力'
    if (/pmp|aws certified|google analytics|certificate|認證|證照/.test(lower)) return '證照與認證'
    if (/learning|學習|進修|studying/.test(lower)) return '學習中'
    if (/溝通|協作|領導|表達|服務|人際|軟|soft/.test(lower)) return '軟實力'
    if (/管理|規劃|分析|策略|行銷|業務|財務|設計|架構/.test(lower)) return '核心職能'
    return '專業技能'
  }

  function addCheckedSkills() {
    const existing = new Set(skills.map((s) => s.name))
    const toAdd = recommendedSkills.filter((s) => checkedSkills.has(s.name) && !existing.has(s.name))
    if (toAdd.length) { const next = [...skills, ...toAdd]; setSkills(next); autoSave('career-skills', next) }
    setShowRecommend(false); setCheckedSkills(new Set())
  }

  // ── Journal handlers ──
  function updateDraft<K extends keyof JournalEntry>(field: K, value: JournalEntry[K]) {
    setDraft((p) => ({ ...p, [field]: value }))
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const available = 3 - draft.images.length
    if (available <= 0) { alert('每篇日誌最多 3 張圖片'); return }
    setUploadingImg(true)
    for (const f of Array.from(files).slice(0, available)) {
      if (f.size > 5 * 1024 * 1024) { alert(`「${f.name}」超過 5MB 限制`); continue }
      const form = new FormData(); form.append('file', f)
      try {
        const res = await fetch('/api/journal/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) { alert(data.error ?? '上傳失敗'); continue }
        const img: JournalImage = { url: data.url, uploadedAt: new Date().toISOString() }
        setDraft((p) => ({ ...p, images: [...p.images, img] }))
        // AI analysis — only for persistent URLs, not base64
        if (!data.local && data.url) {
          setAnalyzingImg(true)
          fetch('/api/journal/analyze-image', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageUrl: data.url }),
          })
            .then((r) => r.json())
            .then((d) => {
              if (d.description) {
                setDraft((p) => ({
                  ...p,
                  images: p.images.map((im) =>
                    im.url === data.url ? { ...im, aiDescription: d.description } : im
                  ),
                }))
              }
            })
            .catch(() => {})
            .finally(() => setAnalyzingImg(false))
        }
      } catch { alert('上傳失敗，請稍後再試') }
    }
    setUploadingImg(false)
  }

  async function saveEntry() {
    const id = editingId ?? genId()
    const entry: JournalEntry = { ...draft, id, createdAt: new Date().toISOString() }
    const next = editingId ? entries.map((e) => e.id === editingId ? entry : e) : [entry, ...entries]
    setEntries(next); autoSave('career-journal', next)
    // Update company history
    if (entry.company && !companyHistory.includes(entry.company)) {
      setCompanyHistory((p) => [...p, entry.company])
    }
    setShowForm(false); setEditingId(null); setDraft(emptyEntry())

    // Background: AI tag + auto-title
    const text = [entry.content, entry.situation, entry.task, entry.action, entry.result].filter(Boolean).join('\n')
    setTaggingId(id)
    fetch('/api/journal/tag', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
      .then((r) => r.json())
      .then((d) => {
        setEntries((p) => {
          const u = p.map((e) => e.id === id ? {
            ...e,
            ...(d.tags?.length ? { tags: d.tags } : {}),
            ...(d.title && !e.title ? { title: d.title } : {}),
          } : e)
          autoSave('career-journal', u); return u
        })
      })
      .catch(() => {})
      .finally(() => setTaggingId(null))
  }

  function deleteEntry(id: string) {
    const next = entries.filter((e) => e.id !== id); setEntries(next); autoSave('career-journal', next)
  }

  function editEntry(e: JournalEntry) { setDraft({ ...e }); setEditingId(e.id); setShowForm(true) }

  const sortedEntries = [...entries].sort((a, b) =>
    sortBy === 'date' ? b.date.localeCompare(a.date) : a.company.localeCompare(b.company)
  )
  const filteredEntries = sortedEntries.filter((e) => {
    if (filterDateFrom && e.date < filterDateFrom) return false
    if (filterDateTo && e.date > filterDateTo) return false
    if (filterCompany && !e.company.toLowerCase().includes(filterCompany.toLowerCase())) return false
    return true
  })

  const groupedSkills = SKILL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = skills.filter((s) => s.category === cat)
    return acc
  }, {} as Record<SkillCategory, TaggedSkill[]>)

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink-900">◈ Resume Lab</h1>
          <p className="mt-1 text-xs md:text-sm text-ink-500">履歷管理 · 技能標籤 · 工作日誌</p>
        </div>
        {saveStatus !== 'idle' && (
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${saveStatus === 'saved' ? 'bg-sage-500/10 text-sage-600' : 'bg-cream-200 text-ink-400'}`}>
            {saveStatus === 'saving' ? <><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>儲存中</> : '✓ 已儲存'}
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

      {/* ── Resume Tab ─────────────────────────────────────── */}
      {tab === 'resume' && (
        <div className="space-y-5">
          {/* Two entry points */}
          {!isEditing && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
              <button onClick={() => setShowUpload(true)}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-warm-300 bg-white p-8 hover:border-terra-300 hover:bg-terra-50 transition-all">
                <span className="text-3xl">↑</span>
                <div className="text-center">
                  <p className="font-semibold text-ink-700">上傳履歷</p>
                  <p className="text-xs text-ink-400 mt-0.5">PDF / DOCX · AI 自動解析</p>
                </div>
              </button>
              <button onClick={() => setShowTemplates(true)}
                className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-warm-300 bg-white p-8 hover:border-terra-300 hover:bg-terra-50 transition-all">
                <span className="text-3xl">📄</span>
                <div className="text-center">
                  <p className="font-semibold text-ink-700">從範本建立</p>
                  <p className="text-xs text-ink-400 mt-0.5">5 種職位範本</p>
                </div>
              </button>
            </div>
          )}

          {/* Upload modal */}
          {showUpload && (
            <Card className="max-w-lg">
              <CardContent className="pt-5 space-y-4">
                <div className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all ${dragging ? 'border-terra-400 bg-terra-50' : 'border-warm-300 hover:border-terra-300 hover:bg-terra-50'}`}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}>
                  <span className="text-3xl mb-2">↑</span>
                  <p className="text-sm font-medium text-ink-600">拖曳或點擊上傳 PDF / DOCX</p>
                  <p className="text-xs text-ink-400 mt-1">最大 10MB · 支援中英文履歷</p>
                  {parsing && <div className="mt-3 flex items-center gap-2 text-sm text-terra-500"><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 解析中...</div>}
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
                {resumeError && <p className="text-sm text-red-400">{resumeError}</p>}
                <Button variant="outline" size="sm" onClick={() => setShowUpload(false)}>取消</Button>
              </CardContent>
            </Card>
          )}

          {/* Template modal */}
          {showTemplates && (
            <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 p-4" onClick={() => setShowTemplates(false)}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-[var(--shadow-warm-xl)]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-ink-800 mb-3">選擇履歷範本</h2>
                <div className="space-y-2">
                  {RESUME_TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="w-full text-left rounded-xl border border-warm-200 bg-cream-50 px-4 py-3 hover:border-terra-300 hover:bg-terra-50 transition-all">
                      <span className="font-medium text-ink-700">{t.label}</span>
                      <span className="ml-2 text-xs text-ink-400">{t.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowTemplates(false)} className="mt-3 text-xs text-ink-400 hover:text-ink-600">取消</button>
              </div>
            </div>
          )}

          {/* Resume editor */}
          {isEditing && (
            <div className="space-y-5">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant={resumeSaved ? 'sage' : 'primary'} onClick={saveResume}>
                  {resumeSaved ? '✓ 已儲存' : '儲存履歷'}
                </Button>
                <Button size="sm" onClick={handleScore} loading={scoring}>AI 評分</Button>
                <Button size="sm" variant="outline" onClick={() => setShowTemplates(true)}>換範本</Button>
                <Button size="sm" variant="outline" onClick={() => setShowUpload(true)}>重新上傳</Button>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Card>
                  <CardHeader><CardTitle>履歷編輯</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="姓名" value={editedResume.name} onChange={(e) => updateResume('name', e.target.value)} />
                      <Input label="電話" value={editedResume.phone} onChange={(e) => updateResume('phone', e.target.value)} />
                    </div>
                    <Input label="Email" value={editedResume.email} onChange={(e) => updateResume('email', e.target.value)} />

                    {/* Skills editor */}
                    <div>
                      <p className="text-xs text-ink-400 mb-2">技能</p>
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {editedResume.skills.map((s, i) => (
                          <div key={i} className="flex items-center gap-1 rounded-full border border-terra-200 bg-terra-50 pl-3 pr-1.5 py-0.5">
                            <span className="text-xs text-terra-600">{s}</span>
                            <button onClick={() => updateResume('skills', editedResume.skills.filter((_, j) => j !== i))} className="text-terra-400 hover:text-red-400 text-xs ml-0.5">×</button>
                          </div>
                        ))}
                      </div>
                      <input className="w-full rounded-lg border border-warm-300 bg-cream-100 px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                        placeholder="輸入技能後按 Enter..."
                        onKeyDown={(e) => { if (e.key === 'Enter') { const t = (e.target as HTMLInputElement).value.trim(); if (t && !editedResume.skills.includes(t)) { updateResume('skills', [...editedResume.skills, t]); (e.target as HTMLInputElement).value = '' } } }} />
                    </div>

                    {/* Experiences */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-ink-400">工作經歷</p>
                        <button onClick={() => updateResume('experiences', [...editedResume.experiences, { company: '', title: '', description: '' }])} className="text-xs text-terra-500 hover:text-terra-600">+ 新增</button>
                      </div>
                      {editedResume.experiences.map((exp, i) => (
                        <div key={i} className="mb-3 rounded-xl bg-cream-100 p-3 space-y-2">
                          <div className="flex gap-2">
                            <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="公司" value={exp.company} onChange={(e) => updateExp(i, 'company', e.target.value)} />
                            <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="職稱" value={exp.title} onChange={(e) => updateExp(i, 'title', e.target.value)} />
                            <button onClick={() => updateResume('experiences', editedResume.experiences.filter((_, j) => j !== i))} className="text-ink-400 hover:text-red-400 text-xs">×</button>
                          </div>
                          <textarea className="w-full rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-600 focus:border-terra-400 focus:outline-none resize-none" rows={2} placeholder="工作描述" value={exp.description} onChange={(e) => updateExp(i, 'description', e.target.value)} />
                        </div>
                      ))}
                    </div>

                    {/* Education */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-ink-400">學歷</p>
                        <button onClick={() => updateResume('education', [...editedResume.education, { school: '', degree: '', major: '', year: '' }])} className="text-xs text-terra-500 hover:text-terra-600">+ 新增</button>
                      </div>
                      {editedResume.education.map((edu, i) => (
                        <div key={i} className="mb-2 rounded-xl bg-cream-100 p-3 space-y-2">
                          <div className="flex gap-2">
                            <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="學校" value={edu.school} onChange={(e) => updateEdu(i, 'school', e.target.value)} />
                            <input className="w-20 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="畢業年" value={edu.year} onChange={(e) => updateEdu(i, 'year', e.target.value)} />
                            <button onClick={() => updateResume('education', editedResume.education.filter((_, j) => j !== i))} className="text-ink-400 hover:text-red-400 text-xs">×</button>
                          </div>
                          <div className="flex gap-2">
                            <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="學位" value={edu.degree} onChange={(e) => updateEdu(i, 'degree', e.target.value)} />
                            <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="科系" value={edu.major} onChange={(e) => updateEdu(i, 'major', e.target.value)} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {score && (
                  <Card className="border-terra-100">
                    <CardHeader><CardTitle>AI 評分報告</CardTitle></CardHeader>
                    <CardContent className="space-y-5">
                      <div className="flex gap-8 justify-center">
                        <div className="text-center"><ProgressRing score={score.score} size={90} strokeWidth={8} animate /><p className="text-xs text-ink-500 mt-2">整體評分</p></div>
                        <div className="text-center"><ProgressRing score={score.atsScore} size={90} strokeWidth={8} animate /><p className="text-xs text-ink-500 mt-2">ATS 友善度</p></div>
                      </div>
                      <div className="space-y-2">
                        {score.suggestions.map((s, i) => (
                          <div key={i} className="flex items-start gap-2 rounded-lg bg-honey-500/5 border border-amber-500/15 px-3 py-2">
                            <span className="text-honey-500 text-sm mt-0.5">⚠</span><p className="text-xs text-ink-600">{s}</p>
                          </div>
                        ))}
                      </div>
                      <div><p className="text-xs text-ink-400 mb-2">重要關鍵字</p><div className="flex flex-wrap gap-1.5">{score.keywords.map((k) => <Badge key={k} variant="success">{k}</Badge>)}</div></div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Skills Tab ──────────────────────────────────────── */}
      {tab === 'skills' && (
        <div className="space-y-4">
          {/* Add skill */}
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input placeholder="例如：React、Python、專案管理" value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') addSkill() }}
                  className="flex-1" />
                <select value={newSkillCat} onChange={(e) => setNewSkillCat(e.target.value as SkillCategory)}
                  className="rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-700 focus:border-terra-400 focus:outline-none">
                  {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <Button onClick={addSkill}>新增</Button>
              </div>
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={handleRecommendSkills} loading={loadingRecommend}>🤖 AI 分析日誌推薦技能</Button>
                <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5">
                  {(['category', 'all'] as const).map((v) => (
                    <button key={v} onClick={() => setSkillView(v)}
                      className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${skillView === v ? 'bg-cream-200 text-ink-700' : 'text-ink-400'}`}>
                      {v === 'category' ? '分類視圖' : '全部顯示'}
                    </button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommend panel */}
          {showRecommend && (
            <Card className="border-terra-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI 推薦技能</CardTitle>
                  <button onClick={() => setShowRecommend(false)} className="text-ink-400 hover:text-ink-600">×</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingRecommend ? (
                  <div className="flex items-center gap-2 text-sm text-terra-500 py-4 justify-center"><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 分析日誌中...</div>
                ) : recommendedSkills.length === 0 ? (
                  <p className="text-sm text-ink-400 py-2">無法取得推薦，請確認日誌有足夠內容。</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSkills.map((s) => (
                        <label key={s.name} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-sm transition-all ${checkedSkills.has(s.name) ? 'border-terra-400 bg-terra-50 text-terra-600' : 'border-warm-200 text-ink-500 hover:border-warm-300'}`}>
                          <input type="checkbox" className="hidden" checked={checkedSkills.has(s.name)}
                            onChange={(e) => setCheckedSkills((p) => { const n = new Set(p); e.target.checked ? n.add(s.name) : n.delete(s.name); return n })} />
                          {checkedSkills.has(s.name) ? '✓ ' : ''}{s.name}
                          <span className="text-[10px] text-ink-400">· {s.category}</span>
                        </label>
                      ))}
                    </div>
                    <Button variant="primary" size="sm" disabled={checkedSkills.size === 0} onClick={addCheckedSkills}>一鍵新增 {checkedSkills.size > 0 ? `(${checkedSkills.size})` : ''}</Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          {/* Skills display */}
          {skillView === 'all' ? (
            <Card>
              <CardHeader><CardTitle>所有技能 <span className="text-ink-400 font-normal">({skills.length})</span></CardTitle></CardHeader>
              <CardContent>
                {skills.length === 0 ? (
                  <div className="py-8 text-center"><p className="text-2xl mb-2">⚡</p><p className="text-sm text-ink-500">尚未新增技能</p></div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((s) => (
                      <div key={s.name} className={`flex items-center gap-1 rounded-full border pl-3 pr-2 py-1 ${CATEGORY_COLORS[s.category]}`}>
                        <span className="text-sm">{s.name}</span>
                        <span className="text-[10px] opacity-60">· {s.category}</span>
                        <button onClick={() => removeSkill(s.name)} className="ml-1 opacity-60 hover:opacity-100 hover:text-red-500 text-xs">×</button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {SKILL_CATEGORIES.map((cat) => {
                const catSkills = groupedSkills[cat]
                if (catSkills.length === 0) return null
                const collapsed = collapsedCats.has(cat)
                return (
                  <Card key={cat}>
                    <button className="w-full" onClick={() => toggleCat(cat)}>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{cat} <span className="text-ink-400 font-normal">({catSkills.length})</span></CardTitle>
                          <span className="text-ink-300 text-xs">{collapsed ? '▶' : '▼'}</span>
                        </div>
                      </CardHeader>
                    </button>
                    {!collapsed && (
                      <CardContent className="pt-0">
                        <div className="flex flex-wrap gap-2">
                          {catSkills.map((s) => (
                            <div key={s.name} className={`flex items-center gap-1 rounded-full border pl-3 pr-2 py-1 ${CATEGORY_COLORS[cat]}`}>
                              <span className="text-sm">{s.name}</span>
                              <button onClick={(e) => { e.stopPropagation(); removeSkill(s.name) }} className="ml-1 opacity-60 hover:opacity-100 hover:text-red-500 text-xs">×</button>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                )
              })}
              {skills.length === 0 && (
                <div className="py-10 text-center"><p className="text-2xl mb-2">⚡</p><p className="text-sm text-ink-500">尚未新增技能</p></div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Journal Tab ─────────────────────────────────────── */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={() => { setDraft(emptyEntry()); setEditingId(null); setShowForm(true) }}>+ 新增日誌</Button>
            <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5">
              {(['date', 'company'] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)} className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${sortBy === s ? 'bg-cream-200 text-ink-700' : 'text-ink-400'}`}>
                  {s === 'date' ? '依日期' : '依公司'}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <input type="date" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)}
              className="rounded-lg border border-warm-300 bg-white px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="開始日期" />
            <input type="date" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)}
              className="rounded-lg border border-warm-300 bg-white px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" placeholder="結束日期" />
            <input placeholder="篩選公司..." value={filterCompany} onChange={(e) => setFilterCompany(e.target.value)}
              className="rounded-lg border border-warm-300 bg-white px-3 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none" />
            {(filterDateFrom || filterDateTo || filterCompany) && (
              <button onClick={() => { setFilterDateFrom(''); setFilterDateTo(''); setFilterCompany('') }} className="text-xs text-ink-400 hover:text-ink-600 px-2">清除篩選</button>
            )}
          </div>

          {/* New / edit form */}
          {showForm && (
            <Card className="border-terra-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? '編輯日誌' : '新增日誌'}</CardTitle>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyEntry()) }} className="text-ink-400 hover:text-ink-600">×</button>
                </div>
                <div className="flex gap-1 mt-2">
                  {(['star', 'free'] as const).map((t) => (
                    <button key={t} onClick={() => updateDraft('template', t)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium border transition-all ${draft.template === t ? 'bg-terra-50 text-terra-600 border-terra-300' : 'text-ink-400 border-transparent hover:text-ink-600'}`}>
                      {t === 'star' ? '⭐ STAR 格式' : '📝 自由記錄'}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Company with dropdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="relative">
                    <label className="block text-xs text-ink-400 mb-1">公司</label>
                    <input
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                      placeholder="任職公司"
                      value={draft.company}
                      onChange={(e) => updateDraft('company', e.target.value)}
                      onFocus={() => setShowCompanyDD(true)}
                      onBlur={() => setTimeout(() => setShowCompanyDD(false), 150)}
                    />
                    {showCompanyDD && companyHistory.length > 0 && (
                      <div className="absolute top-full mt-1 w-full rounded-xl border border-warm-200 bg-white shadow-[var(--shadow-warm-md)] z-10">
                        {companyHistory.filter((c) => c.toLowerCase().includes(draft.company.toLowerCase())).map((c) => (
                          <button key={c} className="w-full text-left px-3 py-2 text-sm text-ink-600 hover:bg-cream-100 first:rounded-t-xl last:rounded-b-xl" onClick={() => { updateDraft('company', c); setShowCompanyDD(false) }}>{c}</button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs text-ink-400 mb-1">日期</label>
                    <input type="date" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)}
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 focus:border-terra-400 focus:outline-none" />
                  </div>
                </div>

                {/* Title (optional — AI will generate if empty) */}
                <div>
                  <label className="block text-xs text-ink-400 mb-1">標題（選填，留空由 AI 自動生成）</label>
                  <input className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                    placeholder="AI 將根據內容自動生成標題..." value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} />
                </div>

                {draft.template === 'star' ? (
                  <div className="space-y-3">
                    {([['situation', '🔲 Situation — 情境'], ['task', '🎯 Task — 任務'], ['action', '⚡ Action — 行動'], ['result', '✅ Result — 結果']] as [keyof JournalEntry, string][]).map(([f, label]) => (
                      <Textarea key={f} label={label} rows={2} placeholder={`描述${label.split('—')[1].trim()}...`}
                        value={(draft[f] as string) ?? ''} onChange={(e) => updateDraft(f, e.target.value)} />
                    ))}
                  </div>
                ) : (
                  <Textarea label="內容" rows={6} placeholder="記錄這次的工作故事、心得或成就..." value={draft.content ?? ''} onChange={(e) => updateDraft('content', e.target.value)} />
                )}

                {/* Image upload */}
                <div>
                  <p className="text-xs text-ink-400 mb-2">圖片（最多 3 張）</p>
                  <div className="flex gap-2 flex-wrap">
                    {draft.images.length < 3 && (
                      <>
                        <button onClick={() => uploadRef.current?.click()} disabled={uploadingImg}
                          className="flex items-center gap-1.5 rounded-lg border border-warm-300 bg-cream-100 px-3 py-2 text-xs text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                          {uploadingImg ? <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : '📎'} 上傳圖片
                        </button>
                        {isMobile && (
                          <button onClick={() => { const i = document.createElement('input'); i.type='file'; i.accept='image/*'; i.onchange=(e)=>handleImageFiles((e.target as HTMLInputElement).files); i.click() }} disabled={uploadingImg}
                            className="flex items-center gap-1.5 rounded-lg border border-warm-300 bg-cream-100 px-3 py-2 text-xs text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                            📷 拍照
                          </button>
                        )}
                        <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
                      </>
                    )}
                    {analyzingImg && <span className="text-xs text-terra-500 flex items-center gap-1 self-center"><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 正在分析圖片...</span>}
                  </div>
                  {draft.images.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {draft.images.map((img, i) => (
                        <div key={i} className="flex gap-3">
                          <img src={img.url} alt="" className="h-20 w-20 rounded-xl object-cover cursor-pointer border border-warm-200 shrink-0" onClick={() => setLightboxUrl(img.url)} />
                          <div className="flex-1 min-w-0">
                            {img.aiDescription ? (
                              <div className="rounded-lg bg-cream-200 px-3 py-2 text-xs text-ink-600">
                                <p className="font-medium text-terra-500 mb-1">📷 AI 圖片分析</p>
                                <p>{img.aiDescription}</p>
                              </div>
                            ) : null}
                            <button onClick={() => setDraft((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))} className="mt-1 text-[10px] text-ink-400 hover:text-red-400">移除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="primary" onClick={saveEntry}>
                    {editingId ? '更新日誌' : '儲存日誌'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyEntry()) }}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entry list */}
          {filteredEntries.length === 0 && !showForm ? (
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
                          <Badge variant="outline">{entry.template === 'star' ? '⭐ STAR' : '📝 自由'}</Badge>
                          {taggingId === entry.id && <span className="text-[10px] text-terra-500 flex items-center gap-1"><svg className="h-2.5 w-2.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 標記中</span>}
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{entry.company && `${entry.company} · `}{fmtDate(entry.date)}</p>
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
