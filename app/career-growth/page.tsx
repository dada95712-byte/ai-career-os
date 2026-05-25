'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface SkillGap {
  skill: string
  status: 'has' | 'partial' | 'missing'
  importance: 'high' | 'medium' | 'low'
  suggestion?: string
  resources: { name: string; url?: string; time: string; difficulty: string }[]
}
interface LearningPriority { skill: string; reason: string; timeEstimate: string }
interface GapAnalysis {
  id: string
  role: string
  industry: string
  analyzedAt: string
  gaps: SkillGap[]
  priorities: LearningPriority[]
}
interface ChatMessage { role: 'user' | 'assistant'; content: string }

const INDUSTRIES = [
  '科技 / 軟體', '金融 / 保險', '製造 / 供應鏈', '醫療 / 生技',
  '電商 / 零售', '行銷 / 廣告', '顧問 / 法律', '教育 / 培訓',
  '媒體 / 娛樂', '政府 / 非營利', '其他',
]
const QUICK_ROLES = [
  '產品經理', '前端工程師', '後端工程師', '數據分析師',
  '行銷經理', 'UI/UX 設計師', '業務開發', '人力資源',
]
const LOADING_STEPS = [
  '🔍 解析目標職位需求...',
  '📊 對比你的現有技能...',
  '🧠 AI 分析技能落差...',
  '📝 生成學習優先建議...',
]
const QUICK_Q = [
  '我想從傳統產業轉往科技業',
  '我想在現有公司升職',
  '我剛被裁員，下一步怎麼辦？',
  '我是應屆生，不知道從哪裡找工作',
]
const IMP_COLOR: Record<string, 'danger' | 'warning' | 'default'> = {
  high: 'danger', medium: 'warning', low: 'default',
}
const IMP_LABEL: Record<string, string> = { high: '高優先', medium: '中等', low: '次要' }

function genId() { return Math.random().toString(36).slice(2, 10) }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
}

export default function CareerGrowthPage() {
  const [tab, setTab] = useState<'gap' | 'coach'>('gap')

  // Gap analysis state
  const [gapView, setGapView] = useState<'input' | 'loading' | 'result'>('input')
  const [targetRole, setTargetRole] = useState('')
  const [targetIndustry, setTargetIndustry] = useState('')
  const [jdText, setJdText] = useState('')
  const [currentSkills, setCurrentSkills] = useState('')
  const [skillsAutoLoaded, setSkillsAutoLoaded] = useState(false)
  const [skillCount, setSkillCount] = useState(0)
  const [gaps, setGaps] = useState<SkillGap[]>([])
  const [priorities, setPriorities] = useState<LearningPriority[]>([])
  const [loadingStep, setLoadingStep] = useState(0)
  const [currentAnalysis, setCurrentAnalysis] = useState<GapAnalysis | null>(null)
  const [analysisHistory, setAnalysisHistory] = useState<GapAnalysis[]>([])
  const [addedGoals, setAddedGoals] = useState<Set<string>>(new Set())

  // Coach state
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是你的 AI 職涯教練。\n\n今天想聊什麼職涯話題？無論是轉職、升職、求職策略，或任何職場困惑，我都在。' }
  ])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const rawSkills = localStorage.getItem('career-skills')
    if (!rawSkills) return
    try {
      const parsed = JSON.parse(rawSkills)
      if (!Array.isArray(parsed) || parsed.length === 0) return
      const names: string[] = typeof parsed[0] === 'string'
        ? parsed
        : parsed.map((s: { name: string }) => s.name)
      setCurrentSkills(names.join('、'))
      setSkillsAutoLoaded(true)
      setSkillCount(names.length)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('skill-gap-history')
      if (raw) setAnalysisHistory(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  async function analyzeGap() {
    if (!targetRole.trim()) return
    setGapView('loading')
    setLoadingStep(0)
    setGaps([])
    setPriorities([])

    const stepTimer = (step: number) => {
      if (step >= LOADING_STEPS.length) return
      setLoadingStep(step)
      setTimeout(() => stepTimer(step + 1), 1500)
    }
    stepTimer(0)

    try {
      const res = await fetch('/api/skills/gap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, targetIndustry, jdText, currentSkills }),
      })
      const data = await res.json()
      const fetchedGaps: SkillGap[] = data.gaps ?? []
      const fetchedPriorities: LearningPriority[] = data.priorities ?? []

      const analysis: GapAnalysis = {
        id: genId(),
        role: targetRole,
        industry: targetIndustry || '未指定',
        analyzedAt: new Date().toISOString(),
        gaps: fetchedGaps,
        priorities: fetchedPriorities,
      }

      setGaps(fetchedGaps)
      setPriorities(fetchedPriorities)
      setCurrentAnalysis(analysis)

      const newHistory = [analysis, ...analysisHistory].slice(0, 5)
      setAnalysisHistory(newHistory)
      try { localStorage.setItem('skill-gap-history', JSON.stringify(newHistory)) } catch { /* ignore */ }

      await new Promise((r) => setTimeout(r, 600))
      setGapView('result')
    } catch {
      setGapView('input')
    }
  }

  function addToLearningGoal(skill: string) {
    setAddedGoals((prev) => new Set([...prev, skill]))
    try {
      const raw = localStorage.getItem('career-learning-goals') ?? '[]'
      const goals = JSON.parse(raw)
      if (!goals.find((g: { skill: string }) => g.skill === skill)) {
        goals.push({ skill, addedAt: new Date().toISOString() })
        localStorage.setItem('career-learning-goals', JSON.stringify(goals))
      }
    } catch { /* ignore */ }
  }

  function loadHistoryRecord(record: GapAnalysis) {
    setGaps(record.gaps)
    setPriorities(record.priorities)
    setCurrentAnalysis(record)
    setTargetRole(record.role)
    setTargetIndustry(record.industry === '未指定' ? '' : record.industry)
    setGapView('result')
  }

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || chatLoading) return
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next); setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, context: 'career_coach' }),
      })
      const data = await res.json()
      setMessages((p) => [...p, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((p) => [...p, { role: 'assistant', content: '抱歉，目前無法回應，請稍後再試。' }])
    } finally { setChatLoading(false) }
  }

  const hasCnt = gaps.filter((g) => g.status === 'has').length
  const partCnt = gaps.filter((g) => g.status === 'partial').length
  const missCnt = gaps.filter((g) => g.status === 'missing').length

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">◈ Skill Map</h1>
        <p className="mt-1 text-sm text-ink-500">技能落差分析 · 個人化學習路徑 · AI 職涯教練</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
        {(['gap', 'coach'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {t === 'gap' ? '⚡ 技能落差分析' : '🤖 AI 職涯教練'}
          </button>
        ))}
      </div>

      {/* ── Gap Analysis ───────────────────────────────────────── */}
      {tab === 'gap' && (
        <>
          {/* INPUT VIEW */}
          {gapView === 'input' && (
            <div className="space-y-5">
              <Card>
                <CardHeader><CardTitle>⚡ 技能落差分析</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  {/* Industry dropdown */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">目標產業</label>
                    <select
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                      value={targetIndustry}
                      onChange={(e) => setTargetIndustry(e.target.value)}
                    >
                      <option value="">請選擇產業（選填）</option>
                      {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>

                  {/* Role input + chips */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">
                      目標職位 <span className="text-terra-500">*</span>
                    </label>
                    <input
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
                      placeholder="例如：資深前端工程師、產品經理"
                      value={targetRole}
                      onChange={(e) => setTargetRole(e.target.value)}
                    />
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {QUICK_ROLES.map((r) => (
                        <button key={r} type="button"
                          onClick={() => setTargetRole(r)}
                          className={`rounded-full border px-3 py-1 text-xs transition-all ${targetRole === r
                            ? 'border-terra-400 bg-terra-50 text-terra-600'
                            : 'border-warm-300 text-ink-400 hover:border-terra-300 hover:text-terra-500'}`}>
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* JD textarea */}
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">
                      職缺描述 JD（選填，貼上更精準）
                    </label>
                    <textarea
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-none"
                      style={{ minHeight: '120px' }}
                      placeholder="貼上職缺描述，AI 將根據實際需求分析技能落差..."
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                    />
                  </div>

                  {/* Auto-loaded skills note */}
                  {skillsAutoLoaded && (
                    <div className="flex items-center gap-2 rounded-xl border border-sage-500/20 bg-sage-500/8 px-3 py-2">
                      <span className="text-sage-600 text-sm">📊</span>
                      <p className="text-xs text-sage-700">
                        已自動載入技能庫（共 <strong>{skillCount}</strong> 項技能）·{' '}
                        <Link href="/dashboard/skills" className="underline hover:text-terra-500 transition-colors">前往更新 →</Link>
                      </p>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={analyzeGap}
                    disabled={!targetRole.trim()}
                    className="w-full rounded-xl bg-terra-500 py-3 text-sm font-semibold text-white transition-all hover:bg-terra-600 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    🔍 開始分析
                  </button>
                </CardContent>
              </Card>

              {/* History */}
              {analysisHistory.length > 0 && (
                <div>
                  <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-400">歷史分析記錄</h2>
                  <div className="space-y-2">
                    {analysisHistory.map((h) => (
                      <button key={h.id} type="button"
                        onClick={() => loadHistoryRecord(h)}
                        className="w-full rounded-xl border border-warm-200 bg-white px-4 py-3 text-left transition-all hover:border-terra-300 hover:bg-terra-50/30">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-ink-800">{h.role}</p>
                            <p className="text-xs text-ink-400 mt-0.5">{h.industry} · {fmtDate(h.analyzedAt)}</p>
                          </div>
                          <div className="flex gap-1.5 text-xs">
                            <span className="rounded-full bg-sage-500/10 px-2 py-0.5 text-sage-600">
                              {h.gaps.filter((g) => g.status === 'has').length} 已具備
                            </span>
                            <span className="rounded-full bg-honey-500/10 px-2 py-0.5 text-honey-500">
                              {h.gaps.filter((g) => g.status === 'partial').length} 部分
                            </span>
                            <span className="rounded-full bg-red-500/10 px-2 py-0.5 text-red-400">
                              {h.gaps.filter((g) => g.status === 'missing').length} 待補
                            </span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* LOADING VIEW */}
          {gapView === 'loading' && (
            <div className="flex flex-col items-center justify-center py-24 space-y-6">
              <div className="relative h-16 w-16">
                <div className="absolute inset-0 rounded-full border-4 border-cream-300" />
                <div className="absolute inset-0 rounded-full border-4 border-t-terra-500 animate-spin" />
              </div>
              <div className="space-y-3 text-center">
                <p className="text-sm font-medium text-ink-700">{LOADING_STEPS[loadingStep]}</p>
                <div className="flex justify-center gap-1.5">
                  {LOADING_STEPS.map((_, i) => (
                    <div key={i}
                      className={`h-1.5 rounded-full transition-all duration-500 ${i <= loadingStep ? 'w-6 bg-terra-500' : 'w-1.5 bg-warm-300'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* RESULT VIEW */}
          {gapView === 'result' && gaps.length > 0 && (
            <div className="space-y-5">
              {/* Header */}
              <div className="flex items-center justify-between">
                <button type="button" onClick={() => setGapView('input')}
                  className="text-sm text-ink-500 hover:text-ink-700 transition-colors">
                  ← 返回
                </button>
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink-800">{currentAnalysis?.role}</p>
                  {currentAnalysis?.industry && currentAnalysis.industry !== '未指定' && (
                    <p className="text-xs text-ink-400">{currentAnalysis.industry}</p>
                  )}
                </div>
                <div className="w-10" />
              </div>

              {/* Summary counts */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '已具備', count: hasCnt, color: 'text-sage-600 bg-sage-500/10 border border-sage-500/20' },
                  { label: '部分具備', count: partCnt, color: 'text-honey-500 bg-honey-500/10 border border-honey-500/20' },
                  { label: '待補強', count: missCnt, color: 'text-red-400 bg-red-500/10 border border-red-500/20' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* 已具備 */}
              {hasCnt > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-sage-600">✓ 已具備</h2>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {gaps.filter((g) => g.status === 'has').map((g, i) => (
                      <div key={i} className="flex items-center justify-between rounded-xl border border-sage-500/20 bg-sage-500/5 px-3 py-2.5">
                        <p className="text-sm font-medium text-ink-700">{g.skill}</p>
                        <Badge variant={IMP_COLOR[g.importance]}>{IMP_LABEL[g.importance]}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 部分具備 */}
              {partCnt > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-honey-500">~ 部分具備</h2>
                  <div className="space-y-2">
                    {gaps.filter((g) => g.status === 'partial').map((g, i) => (
                      <div key={i} className="rounded-xl border border-honey-500/20 bg-honey-500/5 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-ink-700">{g.skill}</p>
                          <Badge variant={IMP_COLOR[g.importance]}>{IMP_LABEL[g.importance]}</Badge>
                        </div>
                        {g.suggestion && <p className="mt-1 text-xs text-ink-500">{g.suggestion}</p>}
                        {!addedGoals.has(g.skill) ? (
                          <button type="button" onClick={() => addToLearningGoal(g.skill)}
                            className="mt-2 text-xs font-medium text-terra-500 hover:text-terra-600">
                            + 加入學習目標
                          </button>
                        ) : (
                          <p className="mt-2 text-xs text-sage-600">✓ 已加入學習目標</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 待補強 */}
              {missCnt > 0 && (
                <div>
                  <h2 className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">✗ 待補強</h2>
                  <div className="space-y-2">
                    {gaps.filter((g) => g.status === 'missing').map((g, i) => (
                      <div key={i} className="rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2.5">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-ink-700">{g.skill}</p>
                          <Badge variant={IMP_COLOR[g.importance]}>{IMP_LABEL[g.importance]}</Badge>
                        </div>
                        {g.suggestion && <p className="mt-1 text-xs text-ink-500">{g.suggestion}</p>}
                        {g.resources.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {g.resources.map((r, j) => (
                              <div key={j} className="flex items-center justify-between rounded-lg bg-white/60 px-2.5 py-1.5">
                                {r.url ? (
                                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                                    className="text-xs font-medium text-terra-500 hover:text-terra-600">{r.name}</a>
                                ) : (
                                  <span className="text-xs text-ink-600">{r.name}</span>
                                )}
                                <div className="flex gap-1">
                                  <Badge variant="outline">{r.time}</Badge>
                                  <Badge variant="outline">{r.difficulty}</Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                        {!addedGoals.has(g.skill) ? (
                          <button type="button" onClick={() => addToLearningGoal(g.skill)}
                            className="mt-2 text-xs font-medium text-terra-500 hover:text-terra-600">
                            + 加入學習目標
                          </button>
                        ) : (
                          <p className="mt-2 text-xs text-sage-600">✓ 已加入學習目標</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* AI Learning Priorities */}
              {priorities.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>🎯 AI 學習優先建議</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {priorities.slice(0, 5).map((p, i) => (
                      <div key={i} className="flex gap-3">
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-terra-500/10 text-xs font-bold text-terra-500">
                          {i + 1}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-ink-700">{p.skill}</p>
                            <span className="text-xs text-ink-400">{p.timeEstimate}</span>
                          </div>
                          <p className="mt-0.5 text-xs text-ink-500">{p.reason}</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              <button type="button" onClick={() => setGapView('input')}
                className="w-full rounded-xl border border-warm-300 py-2.5 text-sm text-ink-500 transition-all hover:border-terra-300 hover:text-terra-500">
                重新分析
              </button>
            </div>
          )}
        </>
      )}

      {/* ── AI Coach ───────────────────────────────────────────── */}
      {tab === 'coach' && (
        <div className="flex h-[calc(100vh-240px)] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_Q.map((q) => (
              <button key={q} onClick={() => sendMessage(q)}
                className="rounded-full border border-warm-300 bg-white px-3 py-1.5 text-xs text-ink-400 transition-all hover:border-terra-400/50 hover:bg-terra-50 hover:text-terra-500">
                {q}
              </button>
            ))}
          </div>
          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && (
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">🤖</div>
                  )}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-terra-500 text-white' : 'bg-cream-200 text-ink-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">🤖</div>
                  <div className="rounded-2xl bg-cream-200 px-4 py-3">
                    <div className="flex gap-1">
                      {[0, 150, 300].map((d) => (
                        <div key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500"
                          style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-warm-200 p-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-warm-300 bg-cream-200 px-4 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-terra-400 focus:outline-none"
                  placeholder="輸入你的職涯問題..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={chatLoading}
                />
                <Button variant="primary" size="sm" onClick={() => sendMessage()} loading={chatLoading}>送出</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
