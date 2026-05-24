'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProgressRing } from '@/components/ui/progress-ring'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Education { school: string; degree: string; major: string; year: string }
interface Experience { company: string; title: string; description: string }
interface ParsedResume {
  name: string; email: string; phone: string
  skills: string[]
  experiences: Experience[]
  education: Education[]
  rawText: string
}
interface ResumeScore { score: number; atsScore: number; suggestions: string[]; keywords: string[] }
interface JournalImage { url: string; aiDescription?: string; uploadedAt: string }
interface JournalEntry {
  id: string; title: string; company: string; date: string
  template: 'star' | 'free' | 'achievement'
  situation?: string; task?: string; action?: string; result?: string
  content?: string
  achievement?: string; metricCount?: string; metricAmount?: string; metricPct?: string
  tags: string[]; images: JournalImage[]; createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────────────────

const TABS = ['resume', 'skills', 'journal'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { resume: '◈ Resume Lab', skills: '⚡ Skill Tags', journal: '✍ Work Journal' }

const TAG_CATEGORIES = ['問題解決', '領導力', '跨部門協作', '技術實作', '客戶關係', '數據分析']

const JOURNAL_TMPL_LABELS: Record<JournalEntry['template'], string> = {
  star: '⭐ STAR 格式', free: '📝 自由記錄', achievement: '📊 成就數據型'
}

const EMPTY_RESUME: ParsedResume = {
  name: '', email: '', phone: '', skills: [], experiences: [], education: [], rawText: ''
}

const RESUME_TEMPLATES = [
  {
    id: 'freshman', label: '🎓 新鮮人', desc: '剛畢業，強調學習能力與專題經驗',
    data: {
      name: '王小明', email: 'example@gmail.com', phone: '0912-345-678',
      skills: ['Python', 'Microsoft Office', '數據分析', '快速學習', '英文溝通'],
      experiences: [{ company: '某科技公司', title: '暑期實習生', description: '協助開發內部工具，參與敏捷開發流程，學習版本控制與測試' }],
      education: [{ school: '國立台灣大學', degree: '學士', major: '資訊管理學系', year: '2024' }],
      rawText: '',
    },
  },
  {
    id: 'engineer', label: '⚙️ 工程師', desc: '3–5 年，強調技術深度與系統設計',
    data: {
      name: '李工程', email: 'engineer@gmail.com', phone: '0923-456-789',
      skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker', 'CI/CD'],
      experiences: [
        { company: '某新創公司', title: '資深前端工程師', description: '主導前端架構重構，導入 React + TypeScript，開發效率提升 40%' },
        { company: '某傳產公司', title: '軟體工程師', description: '維護 ERP 系統，開發客製化報表模組，縮短月結時間 30%' },
      ],
      education: [{ school: '國立成功大學', degree: '學士', major: '資訊工程學系', year: '2021' }],
      rawText: '',
    },
  },
  {
    id: 'marketing', label: '📢 行銷', desc: '數位行銷專才，數據驅動思維',
    data: {
      name: '陳行銷', email: 'marketing@gmail.com', phone: '0934-567-890',
      skills: ['Google Analytics', 'SEO/SEM', 'Meta Ads', '內容行銷', 'KOL 合作', 'A/B Testing'],
      experiences: [{ company: '某電商平台', title: '數位行銷專員', description: '管理月預算 200 萬廣告投放，ROI 提升 35%，自然流量年增 60%' }],
      education: [{ school: '輔仁大學', degree: '學士', major: '廣告傳播學系', year: '2022' }],
      rawText: '',
    },
  },
  {
    id: 'management', label: '👔 管理職', desc: '帶領 5 人以上團隊的主管',
    data: {
      name: '張主管', email: 'manager@gmail.com', phone: '0945-678-901',
      skills: ['團隊管理', '跨部門協作', 'OKR', '敏捷開發', '人才培育', 'P&L 管理'],
      experiences: [
        { company: '某科技集團', title: '產品開發主管', description: '帶領 8 人團隊，管理 3 個產品線，年營收貢獻 2,000 萬' },
        { company: '某軟體公司', title: '資深產品經理', description: '主導核心產品從 0 到 1 開發，DAU 達 50 萬' },
      ],
      education: [{ school: '政治大學', degree: '碩士', major: 'MBA', year: '2019' }],
      rawText: '',
    },
  },
  {
    id: 'career_change', label: '🔄 轉職用', desc: '強調可轉移技能與學習動力',
    data: {
      name: '林轉職', email: 'change@gmail.com', phone: '0956-789-012',
      skills: ['溝通協調', '問題分析', 'Excel 進階', '客戶服務', '自學能力', '流程改善'],
      experiences: [{ company: '某金融機構', title: '業務專員', description: '管理 200+ 個人客戶，年度業績達成率 120%，擅長需求分析與解決方案提案' }],
      education: [{ school: '淡江大學', degree: '學士', major: '財務金融學系', year: '2020' }],
      rawText: '',
    },
  },
]

// ── Helpers ────────────────────────────────────────────────────────────────────

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7) }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function fmtDate(d: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function emptyEntry(): JournalEntry {
  return { id: '', title: '', company: '', date: todayStr(), template: 'free', content: '', tags: [], images: [], createdAt: '' }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function CareerProfilePage() {
  // Tabs
  const [tab, setTab] = useState<Tab>('resume')

  // ── Auto-save ──
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const autoSave = useCallback((key: string, data: unknown) => {
    setSaveStatus('saving')
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      try { localStorage.setItem(key, JSON.stringify(data)) } catch { /* quota exceeded */ }
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }, 1000)
  }, [])

  // ── Resume state ──
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [editedResume, setEditedResume] = useState<ParsedResume>(EMPTY_RESUME)
  const [isEditing, setIsEditing] = useState(false)
  const [score, setScore] = useState<ResumeScore | null>(null)
  const [parsing, setParsing] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [resumeError, setResumeError] = useState('')
  const [showTemplates, setShowTemplates] = useState(false)
  const [dragging, setDragging] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // ── Skills state ──
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [recommendedSkills, setRecommendedSkills] = useState<string[]>([])
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set())
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

  // ── Journal state ──
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [draft, setDraft] = useState<JournalEntry>(emptyEntry())
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'date' | 'company'>('date')
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [uploadingImg, setUploadingImg] = useState(false)
  const [analyzingImg, setAnalyzingImg] = useState(false)
  const [taggingId, setTaggingId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const uploadRef = useRef<HTMLInputElement>(null)
  const cameraRef = useRef<HTMLInputElement>(null)

  // ── Init ──
  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
    const s = localStorage.getItem('career-skills')
    if (s) setSkills(JSON.parse(s))
    const j = localStorage.getItem('career-journal')
    if (j) setEntries(JSON.parse(j))
    const r = localStorage.getItem('career-resume')
    if (r) { const d = JSON.parse(r); setParsed(d); setEditedResume(d); setIsEditing(true) }
  }, [])

  // ── Resume handlers ──
  async function handleFile(f: File) {
    setFile(f); setResumeError(''); setParsing(true); setParsed(null); setScore(null)
    const form = new FormData(); form.append('file', f)
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      const r: ParsedResume = { ...EMPTY_RESUME, ...data }
      setParsed(r); setEditedResume(r); setIsEditing(true)
      setSkills((p) => [...new Set([...p, ...r.skills])])
      autoSave('career-resume', r)
    } catch (err) { setResumeError((err as Error).message) }
    finally { setParsing(false) }
  }

  function applyTemplate(t: typeof RESUME_TEMPLATES[number]) {
    const r: ParsedResume = { ...EMPTY_RESUME, ...t.data }
    setParsed(r); setEditedResume(r); setIsEditing(true); setShowTemplates(false)
    autoSave('career-resume', r)
  }

  function updateResume<K extends keyof ParsedResume>(field: K, value: ParsedResume[K]) {
    setEditedResume((p) => { const u = { ...p, [field]: value }; autoSave('career-resume', u); return u })
  }

  function updateExp(i: number, field: keyof Experience, value: string) {
    const exps = editedResume.experiences.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
    updateResume('experiences', exps)
  }

  function updateEdu(i: number, field: keyof Education, value: string) {
    const eds = editedResume.education.map((e, idx) => idx === i ? { ...e, [field]: value } : e)
    updateResume('education', eds)
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
  function addSkill(s: string) {
    const t = s.trim(); if (!t || skills.includes(t)) return
    const next = [...skills, t]; setSkills(next); autoSave('career-skills', next)
  }

  function removeSkill(i: number) {
    const next = skills.filter((_, j) => j !== i); setSkills(next); autoSave('career-skills', next)
  }

  async function handleRecommendSkills() {
    const text = entries.map((e) =>
      [e.title, e.content, e.situation, e.task, e.action, e.result, e.achievement].filter(Boolean).join(' ')
    ).join('\n')
    if (!text.trim()) { alert('請先新增一些工作日誌再進行分析'); return }
    setLoadingRecommend(true); setRecommendedSkills([]); setCheckedSkills(new Set()); setShowRecommend(true)
    try {
      const res = await fetch('/api/skills/recommend-from-journal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journalText: text }) })
      const data = await res.json(); setRecommendedSkills(data.skills ?? [])
    } catch { setRecommendedSkills([]) }
    finally { setLoadingRecommend(false) }
  }

  function addCheckedSkills() {
    const toAdd = [...checkedSkills].filter((s) => !skills.includes(s))
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
      if (f.size > 5 * 1024 * 1024) { alert(`「${f.name}」圖片太大，請上傳 5MB 以內的圖片`); continue }
      const form = new FormData(); form.append('file', f)
      try {
        const res = await fetch('/api/journal/upload', { method: 'POST', body: form })
        const data = await res.json()
        if (!res.ok) { alert(data.error ?? '上傳失敗'); continue }
        const img: JournalImage = { url: data.url, uploadedAt: new Date().toISOString() }
        setDraft((p) => ({ ...p, images: [...p.images, img] }))

        // Background AI analysis (skip data URLs)
        if (!data.local) {
          setAnalyzingImg(true)
          fetch('/api/journal/analyze-image', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageUrl: data.url }) })
            .then((r) => r.json())
            .then((d) => {
              if (d.description) {
                setDraft((p) => ({ ...p, images: p.images.map((im) => im.url === data.url ? { ...im, aiDescription: d.description } : im) }))
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
    if (!draft.title.trim()) return
    const id = editingId ?? genId()
    const entry: JournalEntry = { ...draft, id, createdAt: new Date().toISOString() }
    const next = editingId ? entries.map((e) => e.id === editingId ? entry : e) : [entry, ...entries]
    setEntries(next); autoSave('career-journal', next)
    setShowForm(false); setEditingId(null); setDraft(emptyEntry())

    // Background AI tagging
    const text = [entry.title, entry.content, entry.situation, entry.task, entry.action, entry.result, entry.achievement].filter(Boolean).join('\n')
    setTaggingId(id)
    fetch('/api/journal/tag', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) })
      .then((r) => r.json())
      .then((d) => {
        if (d.tags?.length) {
          setEntries((p) => { const u = p.map((e) => e.id === id ? { ...e, tags: d.tags } : e); autoSave('career-journal', u); return u })
        }
      })
      .catch(() => {})
      .finally(() => setTaggingId(null))
  }

  function deleteEntry(id: string) {
    const next = entries.filter((e) => e.id !== id); setEntries(next); autoSave('career-journal', next)
  }

  function editEntry(e: JournalEntry) {
    setDraft({ ...e }); setEditingId(e.id); setShowForm(true)
  }

  const sortedEntries = [...entries].sort((a, b) =>
    sortBy === 'date' ? b.date.localeCompare(a.date) : a.company.localeCompare(b.company)
  )

  const scoreCol = (s: number) => s >= 80 ? 'text-sage-600' : s >= 60 ? 'text-honey-500' : 'text-red-400'

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">◈ Resume Lab</h1>
          <p className="mt-1 text-sm text-ink-500">AI 驅動的履歷解析 · ATS 評分 · STAR 故事庫</p>
        </div>
        {saveStatus !== 'idle' && (
          <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${saveStatus === 'saved' ? 'bg-sage-500/10 text-sage-600' : 'bg-cream-200 text-ink-400'}`}>
            {saveStatus === 'saving' ? (
              <><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>儲存中...</>
            ) : (
              <>✓ 已儲存</>
            )}
          </div>
        )}
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Resume Tab ────────────────────────────────────────────── */}
      {tab === 'resume' && (
        <div className="space-y-5">
          {/* Template modal */}
          {showTemplates && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onClick={() => setShowTemplates(false)}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-[var(--shadow-warm-xl)]" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-ink-800 mb-4">選擇履歷範本</h2>
                <div className="space-y-2">
                  {RESUME_TEMPLATES.map((t) => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className="w-full text-left rounded-xl border border-warm-200 bg-cream-50 px-4 py-3 hover:border-terra-300 hover:bg-terra-50 transition-all">
                      <span className="font-medium text-ink-700">{t.label}</span>
                      <span className="ml-2 text-xs text-ink-400">{t.desc}</span>
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowTemplates(false)} className="mt-4 text-xs text-ink-400 hover:text-ink-600">取消</button>
              </div>
            </div>
          )}

          <Card>
            <CardContent className="pt-5 space-y-4">
              {/* Upload zone */}
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 cursor-pointer transition-all duration-200 ${dragging ? 'border-terra-400 bg-terra-50' : 'border-warm-300 hover:border-terra-300 hover:bg-terra-50'}`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-200 text-2xl">
                  {file ? '✓' : '↑'}
                </div>
                <p className="text-sm font-medium text-ink-600">{file ? file.name : '拖曳或點擊上傳 PDF / DOCX'}</p>
                <p className="mt-1 text-xs text-ink-400">最大 10MB · 支援繁體中文履歷</p>
                {parsing && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-terra-500">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    AI 解析中...
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {resumeError && <p className="text-sm text-red-400">{resumeError}</p>}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowTemplates(true)}>📄 選擇履歷範本</Button>
                {isEditing && <Button size="sm" onClick={handleScore} loading={scoring}>AI 評分</Button>}
              </div>
            </CardContent>
          </Card>

          {/* Resume editor */}
          {isEditing && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader><CardTitle>履歷編輯</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Basic info */}
                  <div className="grid grid-cols-2 gap-3">
                    <Input label="姓名" value={editedResume.name} onChange={(e) => updateResume('name', e.target.value)} />
                    <Input label="電話" value={editedResume.phone} onChange={(e) => updateResume('phone', e.target.value)} />
                  </div>
                  <Input label="Email" value={editedResume.email} onChange={(e) => updateResume('email', e.target.value)} />

                  {/* Skills */}
                  <div>
                    <p className="text-xs text-ink-400 mb-2">技能</p>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {editedResume.skills.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 rounded-full border border-terra-400/30 bg-terra-50 pl-3 pr-1.5 py-0.5">
                          <span className="text-xs text-terra-600">{s}</span>
                          <button onClick={() => updateResume('skills', editedResume.skills.filter((_, j) => j !== i))}
                            className="text-terra-400 hover:text-red-400 text-xs ml-0.5">×</button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        className="flex-1 rounded-lg border border-warm-300 bg-cream-100 px-3 py-1.5 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                        placeholder="新增技能..."
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const t = (e.target as HTMLInputElement).value.trim()
                            if (t && !editedResume.skills.includes(t)) { updateResume('skills', [...editedResume.skills, t]); (e.target as HTMLInputElement).value = '' }
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Experiences */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink-400">工作經歷</p>
                      <button onClick={() => updateResume('experiences', [...editedResume.experiences, { company: '', title: '', description: '' }])}
                        className="text-xs text-terra-500 hover:text-terra-600">+ 新增</button>
                    </div>
                    {editedResume.experiences.map((exp, i) => (
                      <div key={i} className="mb-3 rounded-xl bg-cream-100 p-3 space-y-2">
                        <div className="flex gap-2">
                          <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="公司" value={exp.company} onChange={(e) => updateExp(i, 'company', e.target.value)} />
                          <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="職稱" value={exp.title} onChange={(e) => updateExp(i, 'title', e.target.value)} />
                          <button onClick={() => updateResume('experiences', editedResume.experiences.filter((_, j) => j !== i))}
                            className="text-ink-400 hover:text-red-400 text-xs shrink-0">×</button>
                        </div>
                        <textarea className="w-full rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-600 focus:border-terra-400 focus:outline-none resize-none"
                          rows={2} placeholder="工作描述" value={exp.description} onChange={(e) => updateExp(i, 'description', e.target.value)} />
                      </div>
                    ))}
                  </div>

                  {/* Education */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-ink-400">學歷</p>
                      <button onClick={() => updateResume('education', [...editedResume.education, { school: '', degree: '', major: '', year: '' }])}
                        className="text-xs text-terra-500 hover:text-terra-600">+ 新增</button>
                    </div>
                    {editedResume.education.map((edu, i) => (
                      <div key={i} className="mb-2 rounded-xl bg-cream-100 p-3 space-y-2">
                        <div className="flex gap-2">
                          <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="學校" value={edu.school} onChange={(e) => updateEdu(i, 'school', e.target.value)} />
                          <input className="w-20 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="畢業年" value={edu.year} onChange={(e) => updateEdu(i, 'year', e.target.value)} />
                          <button onClick={() => updateResume('education', editedResume.education.filter((_, j) => j !== i))}
                            className="text-ink-400 hover:text-red-400 text-xs shrink-0">×</button>
                        </div>
                        <div className="flex gap-2">
                          <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="學位（如：學士）" value={edu.degree} onChange={(e) => updateEdu(i, 'degree', e.target.value)} />
                          <input className="flex-1 rounded-lg border border-warm-300 bg-white px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none"
                            placeholder="科系" value={edu.major} onChange={(e) => updateEdu(i, 'major', e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Score */}
              {score && (
                <Card className="border-terra-100">
                  <CardHeader><CardTitle>AI 評分報告</CardTitle></CardHeader>
                  <CardContent className="space-y-5">
                    <div className="flex gap-8 justify-center">
                      <div className="text-center">
                        <ProgressRing score={score.score} size={100} strokeWidth={8} animate />
                        <p className="text-xs text-ink-500 mt-2">整體評分</p>
                      </div>
                      <div className="text-center">
                        <ProgressRing score={score.atsScore} size={100} strokeWidth={8} animate />
                        <p className="text-xs text-ink-500 mt-2">ATS 友善度</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {score.suggestions.map((s, i) => (
                        <div key={i} className="flex items-start gap-2 rounded-lg bg-honey-500/5 border border-amber-500/15 px-3 py-2">
                          <span className="text-honey-500 text-sm mt-0.5">⚠</span>
                          <p className="text-xs text-ink-600">{s}</p>
                        </div>
                      ))}
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 mb-2">重要關鍵字</p>
                      <div className="flex flex-wrap gap-1.5">
                        {score.keywords.map((k) => <Badge key={k} variant="success">{k}</Badge>)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Skills Tab ───────────────────────────────────────────── */}
      {tab === 'skills' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex gap-2">
                <Input placeholder="例如：React、Python、專案管理" value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newSkill.trim()) { addSkill(newSkill); setNewSkill('') } }}
                  className="flex-1" />
                <Button onClick={() => { addSkill(newSkill); setNewSkill('') }}>新增</Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleRecommendSkills} loading={loadingRecommend}>
                🤖 AI 分析日誌推薦技能
              </Button>
            </CardContent>
          </Card>

          {/* Recommend panel */}
          {showRecommend && (
            <Card className="border-terra-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>AI 推薦技能</CardTitle>
                  <button onClick={() => setShowRecommend(false)} className="text-ink-400 hover:text-ink-600 text-sm">×</button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingRecommend ? (
                  <div className="flex items-center gap-2 text-sm text-terra-500 py-4 justify-center">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                    AI 分析日誌中...
                  </div>
                ) : recommendedSkills.length === 0 ? (
                  <p className="text-sm text-ink-400 py-2">無法取得推薦，請確認日誌有足夠內容。</p>
                ) : (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {recommendedSkills.map((s) => (
                        <label key={s} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-sm transition-all ${checkedSkills.has(s) ? 'border-terra-400 bg-terra-50 text-terra-600' : 'border-warm-200 text-ink-500 hover:border-warm-300'}`}>
                          <input type="checkbox" className="hidden" checked={checkedSkills.has(s)}
                            onChange={(e) => setCheckedSkills((p) => { const n = new Set(p); e.target.checked ? n.add(s) : n.delete(s); return n })} />
                          {checkedSkills.has(s) ? '✓ ' : ''}{s}
                        </label>
                      ))}
                    </div>
                    <Button variant="primary" size="sm" disabled={checkedSkills.size === 0} onClick={addCheckedSkills}>
                      一鍵新增 {checkedSkills.size > 0 ? `(${checkedSkills.size})` : ''}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>我的技能 <span className="text-ink-500 font-normal">({skills.length})</span></CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-3">⚡</p>
                  <p className="text-sm text-ink-500">尚未新增技能</p>
                  <p className="text-xs text-ink-400 mt-1">上傳履歷可自動擷取技能</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-full border border-terra-400/30 bg-terra-50 pl-3 pr-2 py-1">
                      <span className="text-sm text-terra-600">{s}</span>
                      <button onClick={() => removeSkill(i)} className="text-terra-500 hover:text-red-400 transition-colors ml-1 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Journal Tab ──────────────────────────────────────────── */}
      {tab === 'journal' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button variant="primary" size="sm" onClick={() => { setDraft(emptyEntry()); setEditingId(null); setShowForm(true) }}>
              + 新增日誌
            </Button>
            <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5">
              {(['date', 'company'] as const).map((s) => (
                <button key={s} onClick={() => setSortBy(s)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${sortBy === s ? 'bg-cream-200 text-ink-700' : 'text-ink-400 hover:text-ink-600'}`}>
                  {s === 'date' ? '依日期' : '依公司'}
                </button>
              ))}
            </div>
          </div>

          {/* New/Edit entry form */}
          {showForm && (
            <Card className="border-terra-100">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{editingId ? '編輯日誌' : '新增日誌'}</CardTitle>
                  <button onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyEntry()) }} className="text-ink-400 hover:text-ink-600">×</button>
                </div>
                {/* Template selector */}
                <div className="flex gap-1 mt-2">
                  {(Object.keys(JOURNAL_TMPL_LABELS) as JournalEntry['template'][]).map((t) => (
                    <button key={t} onClick={() => updateDraft('template', t)}
                      className={`rounded-lg px-3 py-1 text-xs font-medium transition-all ${draft.template === t ? 'bg-terra-50 text-terra-600 border border-terra-300' : 'text-ink-400 hover:text-ink-600 border border-transparent'}`}>
                      {JOURNAL_TMPL_LABELS[t]}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Common fields */}
                <div className="grid grid-cols-2 gap-3">
                  <Input label="標題" placeholder="這次的工作成就..." value={draft.title} onChange={(e) => updateDraft('title', e.target.value)} />
                  <Input label="公司" placeholder="任職公司" value={draft.company} onChange={(e) => updateDraft('company', e.target.value)} />
                </div>
                <Input label="日期" type="date" value={draft.date} onChange={(e) => updateDraft('date', e.target.value)} className="w-44" />

                {/* STAR template */}
                {draft.template === 'star' && (
                  <div className="space-y-3">
                    {([['situation', '🔲 Situation — 情境'], ['task', '🎯 Task — 任務'], ['action', '⚡ Action — 行動'], ['result', '✅ Result — 結果']] as [keyof JournalEntry, string][]).map(([f, label]) => (
                      <Textarea key={f} label={label} rows={2} placeholder={`描述${label.split('—')[1].trim()}...`}
                        value={(draft[f] as string) ?? ''} onChange={(e) => updateDraft(f, e.target.value)} />
                    ))}
                  </div>
                )}

                {/* Free template */}
                {draft.template === 'free' && (
                  <Textarea label="內容" rows={6} placeholder="記錄這次的工作故事、心得或成就..." value={draft.content ?? ''} onChange={(e) => updateDraft('content', e.target.value)} />
                )}

                {/* Achievement template */}
                {draft.template === 'achievement' && (
                  <div className="space-y-3">
                    <Textarea label="成就描述" rows={3} placeholder="描述你完成了什麼..." value={draft.achievement ?? ''} onChange={(e) => updateDraft('achievement', e.target.value)} />
                    <div>
                      <p className="text-xs text-ink-400 mb-2">量化指標（選填）</p>
                      <div className="grid grid-cols-3 gap-2">
                        <Input placeholder="人數 / 次數" value={draft.metricCount ?? ''} onChange={(e) => updateDraft('metricCount', e.target.value)} />
                        <Input placeholder="金額（萬）" value={draft.metricAmount ?? ''} onChange={(e) => updateDraft('metricAmount', e.target.value)} />
                        <Input placeholder="百分比（%）" value={draft.metricPct ?? ''} onChange={(e) => updateDraft('metricPct', e.target.value)} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Image upload */}
                <div>
                  <p className="text-xs text-ink-400 mb-2">圖片（最多 3 張）</p>
                  <div className="flex gap-2 flex-wrap">
                    {draft.images.length < 3 && (
                      <>
                        <button onClick={() => uploadRef.current?.click()}
                          disabled={uploadingImg}
                          className="flex items-center gap-1.5 rounded-lg border border-warm-300 bg-cream-100 px-3 py-2 text-xs text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                          {uploadingImg ? <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg> : '📎'} 上傳圖片
                        </button>
                        {isMobile && (
                          <button onClick={() => cameraRef.current?.click()}
                            disabled={uploadingImg}
                            className="flex items-center gap-1.5 rounded-lg border border-warm-300 bg-cream-100 px-3 py-2 text-xs text-ink-500 hover:border-terra-300 hover:bg-terra-50 transition-all disabled:opacity-50">
                            📷 拍照
                          </button>
                        )}
                        <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
                        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageFiles(e.target.files)} />
                      </>
                    )}
                    {analyzingImg && <span className="text-xs text-terra-500 flex items-center gap-1"><svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 正在分析圖片...</span>}
                  </div>

                  {draft.images.length > 0 && (
                    <div className="mt-3 space-y-3">
                      {draft.images.map((img, i) => (
                        <div key={i} className="flex gap-3">
                          <img src={img.url} alt="" className="h-20 w-20 rounded-xl object-cover cursor-pointer border border-warm-200" onClick={() => setLightboxUrl(img.url)} />
                          <div className="flex-1 min-w-0">
                            {img.aiDescription ? (
                              <div className="rounded-lg bg-cream-200 px-3 py-2 text-xs text-ink-600">
                                <p className="font-medium text-terra-500 mb-1">📷 AI 圖片分析</p>
                                <p>{img.aiDescription}</p>
                              </div>
                            ) : analyzingImg ? (
                              <p className="text-xs text-ink-400 italic">AI 分析暫時無法使用</p>
                            ) : null}
                            <button onClick={() => setDraft((p) => ({ ...p, images: p.images.filter((_, j) => j !== i) }))}
                              className="mt-1.5 text-[10px] text-ink-400 hover:text-red-400 transition-colors">移除</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-1">
                  <Button variant="primary" onClick={saveEntry} disabled={!draft.title.trim()}>
                    {editingId ? '更新' : '儲存日誌'}
                  </Button>
                  <Button variant="outline" onClick={() => { setShowForm(false); setEditingId(null); setDraft(emptyEntry()) }}>取消</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Entry list */}
          {sortedEntries.length === 0 && !showForm ? (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-3xl mb-3">✍</p>
              <p className="text-sm text-ink-500">尚未新增日誌</p>
              <p className="text-xs text-ink-400 mt-1">記錄每一個工作成就，AI 自動轉換為 STAR 格式</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedEntries.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-ink-700">{entry.title}</p>
                          <Badge variant="outline">{JOURNAL_TMPL_LABELS[entry.template]}</Badge>
                          {taggingId === entry.id && <span className="text-[10px] text-terra-500 flex items-center gap-1"><svg className="h-2.5 w-2.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>AI 標記中</span>}
                        </div>
                        <p className="text-xs text-ink-400 mt-0.5">{entry.company && `${entry.company} · `}{fmtDate(entry.date)}</p>

                        {/* Tags */}
                        {entry.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {entry.tags.map((t) => <Badge key={t} variant="terra">{t}</Badge>)}
                          </div>
                        )}

                        {/* Image thumbnails */}
                        {entry.images.length > 0 && (
                          <div className="flex gap-2 mt-2">
                            {entry.images.slice(0, 3).map((img, i) => (
                              <img key={i} src={img.url} alt="" className="h-14 w-14 rounded-lg object-cover border border-warm-200 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxUrl(img.url)} />
                            ))}
                          </div>
                        )}

                        {/* Content preview */}
                        <p className="mt-2 text-xs text-ink-500 line-clamp-2 leading-relaxed">
                          {entry.content || entry.achievement || entry.situation || ''}
                        </p>
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
          <img src={lightboxUrl} alt="" className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-[var(--shadow-warm-xl)]" onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setLightboxUrl(null)} className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white hover:bg-white/30 transition-all">×</button>
        </div>
      )}
    </div>
  )
}
