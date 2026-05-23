'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { ProgressRing, ProgressBar } from '@/components/ui/progress-ring'

interface ParsedResume {
  name?: string; email?: string
  skills: string[]
  experiences: { company: string; title: string; description: string }[]
  rawText: string
}
interface ResumeScore { score: number; atsScore: number; suggestions: string[]; keywords: string[] }

const TABS = ['resume', 'skills', 'journal'] as const
type Tab = typeof TABS[number]
const TAB_LABELS: Record<Tab, string> = { resume: '◈ Resume Lab', skills: '⚡ Skill Tags', journal: '✍ Work Journal' }

export default function CareerProfilePage() {
  const [tab, setTab] = useState<Tab>('resume')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [score, setScore] = useState<ResumeScore | null>(null)
  const [parsing, setParsing] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [skills, setSkills] = useState<string[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [journalText, setJournalText] = useState('')
  const [starResult, setStarResult] = useState('')
  const [convertingJournal, setConvertingJournal] = useState(false)
  const [dragging, setDragging] = useState(false)

  async function handleFile(f: File) {
    setFile(f); setError(''); setParsing(true); setParsed(null); setScore(null)
    const form = new FormData(); form.append('file', f)
    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      setParsed(data)
    } catch (err) { setError((err as Error).message) }
    finally { setParsing(false) }
  }

  async function handleScore() {
    if (!parsed?.rawText) return
    setScoring(true)
    try {
      const res = await fetch('/api/resume/score', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ resumeText: parsed.rawText }) })
      setScore(await res.json())
    } catch { setError('評分失敗') }
    finally { setScoring(false) }
  }

  async function convertToStar() {
    if (!journalText.trim()) return
    setConvertingJournal(true); setStarResult('')
    try {
      const res = await fetch('/api/resume/star', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ journalText }) })
      const data = await res.json(); setStarResult(data.star ?? '')
    } catch { setStarResult('轉換失敗') }
    finally { setConvertingJournal(false) }
  }

  const scoreCol = (s: number) => s >= 80 ? 'text-sage-600' : s >= 60 ? 'text-honey-500' : 'text-red-400'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-ink-900">◈ Resume Lab</h1>
        <p className="mt-1 text-sm text-ink-500">AI 驅動的履歷解析 · ATS 評分 · STAR 故事庫</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${
              tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'
            }`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {/* ── Resume Tab ─────────────────────────────────────── */}
      {tab === 'resume' && (
        <div className="space-y-5">
          <Card>
            <CardContent className="pt-5">
              <div
                className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 cursor-pointer transition-all duration-200 ${
                  dragging ? 'border-terra-400 bg-terra-50' : 'border-warm-300 hover:border-terra-300 hover:bg-terra-50'
                }`}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
              >
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-cream-200 text-2xl">
                  {file ? '✓' : '↑'}
                </div>
                <p className="text-sm font-medium text-ink-600">
                  {file ? file.name : '拖曳或點擊上傳 PDF / DOCX'}
                </p>
                <p className="mt-1 text-xs text-ink-400">最大 10MB · 支援繁體中文履歷</p>
                {parsing && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-terra-500">
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    AI 解析中...
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </CardContent>
          </Card>

          {parsed && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>解析結果</CardTitle>
                    <Button size="sm" onClick={handleScore} loading={scoring}>AI 評分</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsed.name && (
                    <div>
                      <p className="text-xs text-ink-400 mb-1">姓名</p>
                      <p className="text-sm font-medium text-ink-700">{parsed.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-ink-400 mb-2">技能</p>
                    <div className="flex flex-wrap gap-1.5">
                      {parsed.skills.map((s) => <Badge key={s} variant="terra">{s}</Badge>)}
                    </div>
                  </div>
                  {parsed.experiences.map((exp, i) => (
                    <div key={i} className="rounded-xl bg-cream-100 p-3">
                      <p className="text-sm font-medium text-ink-700">{exp.title} @ {exp.company}</p>
                      <p className="mt-1 text-xs text-ink-500 line-clamp-2">{exp.description}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>

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

      {/* ── Skills Tab ─────────────────────────────────────── */}
      {tab === 'skills' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-2">
                <Input placeholder="例如：React、Python、專案管理" value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && newSkill.trim()) { setSkills((p) => [...p, newSkill.trim()]); setNewSkill('') } }}
                  className="flex-1" />
                <Button onClick={() => { if (newSkill.trim()) { setSkills((p) => [...p, newSkill.trim()]); setNewSkill('') } }}>新增</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>我的技能 <span className="text-ink-500 font-normal">({skills.length})</span></CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-3xl mb-3">⚡</p>
                  <p className="text-sm text-ink-500">尚未新增技能</p>
                  <p className="text-xs text-ink-400 mt-1">也可上傳履歷自動擷取技能</p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-full border border-terra-400/30 bg-terra-50 pl-3 pr-2 py-1">
                      <span className="text-sm text-terra-600">{s}</span>
                      <button onClick={() => setSkills((p) => p.filter((_, j) => j !== i))}
                        className="text-terra-500 hover:text-red-400 transition-colors ml-1 text-xs">×</button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Journal Tab ────────────────────────────────────── */}
      {tab === 'journal' && (
        <div className="space-y-4 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>工作成就 → STAR 格式</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Textarea label="輸入工作成就或故事"
                placeholder="例如：我帶領團隊重構電商系統，將載入時間從 5 秒縮短到 1.5 秒，轉換率提升 23%..."
                rows={6} value={journalText} onChange={(e) => setJournalText(e.target.value)} />
              <Button variant="primary" onClick={convertToStar} loading={convertingJournal} disabled={!journalText.trim()}>
                🤖 AI 轉換 STAR 格式
              </Button>
            </CardContent>
          </Card>

          {starResult && (
            <Card className="border-terra-100">
              <CardHeader><CardTitle>STAR 結果</CardTitle></CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap rounded-xl bg-cream-200 p-4 text-sm text-ink-600 leading-relaxed font-mono">
                  {starResult}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
