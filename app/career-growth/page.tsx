'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface SkillGap { skill: string; status: 'has' | 'partial' | 'missing'; importance: 'high' | 'medium' | 'low'; resources: { name: string; url?: string; time: string; difficulty: string }[] }
interface ChatMessage { role: 'user' | 'assistant'; content: string }

const QUICK_Q = ['我想從傳統產業轉往科技業', '我想在現有公司升職', '我剛被裁員，下一步怎麼辦？', '我是應屆生，不知道從哪裡找工作']
const STATUS_ICON = { has: '✓', partial: '~', missing: '✗' }
const STATUS_COLOR = { has: 'text-sage-600 bg-sage-500/10 border-emerald-500/20', partial: 'text-honey-500 bg-honey-500/10 border-amber-500/20', missing: 'text-red-400 bg-red-500/10 border-red-500/20' }
const STATUS_BAR = { has: 'bg-sage-500', partial: 'bg-honey-400', missing: 'bg-red-400' }
const STATUS_PCT = { has: 100, partial: 50, missing: 5 }
const IMP_COLOR: Record<string, 'danger' | 'warning' | 'default'> = { high: 'danger', medium: 'warning', low: 'default' }

export default function CareerGrowthPage() {
  const [tab, setTab] = useState<'gap' | 'coach'>('gap')
  const [targetRole, setTargetRole] = useState('')
  const [currentSkills, setCurrentSkills] = useState('')
  const [gaps, setGaps] = useState<SkillGap[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [skillsAutoLoaded, setSkillsAutoLoaded] = useState(false)
  const [skillCount, setSkillCount] = useState(0)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是你的 AI 職涯教練。\n\n今天想聊什麼職涯話題？無論是轉職、升職、求職策略，或任何職場困惑，我都在。' }
  ])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Auto-load skills from localStorage
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

  async function analyzeGap() {
    if (!targetRole.trim()) return
    setAnalyzing(true); setGaps([])
    try {
      const res = await fetch('/api/skills/gap', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, currentSkills }),
      })
      const data = await res.json(); setGaps(data.gaps ?? [])
    } catch { setGaps([]) }
    finally { setAnalyzing(false) }
  }

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || chatLoading) return
    setInput('')
    const next: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(next); setChatLoading(true)
    try {
      const res = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next, context: 'career_coach' }) })
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

      {/* ── Gap Analysis ─────────────────────────────────── */}
      {tab === 'gap' && (
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>分析技能落差</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input label="目標職位" placeholder="例如：資深前端工程師、產品經理" value={targetRole} onChange={(e) => setTargetRole(e.target.value)} />
              <div>
                <Textarea label="目前技能（選填）" placeholder="例如：React、3 年前端經驗、基本 SQL" rows={2} value={currentSkills} onChange={(e) => setCurrentSkills(e.target.value)} />
                {skillsAutoLoaded && (
                  <p className="text-[11px] text-sage-600 mt-1">
                    📊 已自動載入你的技能庫（共 {skillCount} 項技能）·{' '}
                    <Link href="/dashboard/skills" className="underline hover:text-terra-500 transition-colors">前往更新 →</Link>
                  </p>
                )}
              </div>
              <Button variant="primary" onClick={analyzeGap} loading={analyzing} disabled={!targetRole.trim()}>
                🔍 分析技能落差
              </Button>
            </CardContent>
          </Card>

          {gaps.length > 0 && (
            <div className="space-y-4">
              {/* Summary bar */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: '已具備', count: hasCnt, color: 'text-sage-600 bg-sage-500/10' },
                  { label: '部分具備', count: partCnt, color: 'text-honey-500 bg-honey-500/10' },
                  { label: '待補強', count: missCnt, color: 'text-red-400 bg-red-500/10' },
                ].map((s) => (
                  <div key={s.label} className={`rounded-2xl p-3 text-center ${s.color}`}>
                    <p className="text-2xl font-bold">{s.count}</p>
                    <p className="text-xs mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Visual progress bars */}
              <Card>
                <CardHeader><CardTitle>技能雷達概覽</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  {gaps.map((gap, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-ink-700">{gap.skill}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={IMP_COLOR[gap.importance]}>
                            {gap.importance === 'high' ? '高優先' : gap.importance === 'medium' ? '中等' : '次要'}
                          </Badge>
                          <span className={`font-semibold ${STATUS_COLOR[gap.status].split(' ')[0]}`}>
                            {STATUS_ICON[gap.status]} {gap.status === 'has' ? '已具備' : gap.status === 'partial' ? '部分' : '待補強'}
                          </span>
                        </div>
                      </div>
                      <div className="relative h-2 rounded-full bg-cream-200 overflow-hidden">
                        <div
                          className={`absolute left-0 top-0 h-2 rounded-full transition-all duration-700 ${STATUS_BAR[gap.status]}`}
                          style={{ width: `${STATUS_PCT[gap.status]}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Detail cards */}
              <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-400">詳細分析 — {targetRole}</h2>
              {gaps.map((gap, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-xl border text-sm font-bold ${STATUS_COLOR[gap.status]}`}>
                          {STATUS_ICON[gap.status]}
                        </div>
                        <div>
                          <p className="font-semibold text-ink-700">{gap.skill}</p>
                          <p className="text-xs text-ink-500">{gap.status === 'has' ? '已具備' : gap.status === 'partial' ? '部分具備' : '完全缺乏'}</p>
                        </div>
                      </div>
                      <Badge variant={IMP_COLOR[gap.importance]}>
                        {gap.importance === 'high' ? '高優先' : gap.importance === 'medium' ? '中等' : '次要'}
                      </Badge>
                    </div>
                    {gap.status !== 'has' && gap.resources.length > 0 && (
                      <div>
                        <p className="text-xs text-ink-400 mb-2">推薦學習資源</p>
                        <div className="space-y-2">
                          {gap.resources.map((r, j) => (
                            <div key={j} className="flex items-center justify-between rounded-lg bg-cream-200 px-3 py-2.5">
                              {r.url ? (
                                <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-sm text-terra-500 hover:text-terra-600 font-medium">{r.name}</a>
                              ) : (
                                <span className="text-sm text-ink-600 font-medium">{r.name}</span>
                              )}
                              <div className="flex gap-1.5">
                                <Badge variant="outline">{r.time}</Badge>
                                <Badge variant="outline">{r.difficulty}</Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── AI Coach ─────────────────────────────────────── */}
      {tab === 'coach' && (
        <div className="flex h-[calc(100vh-240px)] flex-col gap-3">
          <div className="flex flex-wrap gap-2">
            {QUICK_Q.map((q) => (
              <button key={q} onClick={() => sendMessage(q)}
                className="rounded-full border border-warm-300 bg-white px-3 py-1.5 text-xs text-ink-400 hover:border-terra-400/50 hover:bg-terra-50 hover:text-terra-500 transition-all">
                {q}
              </button>
            ))}
          </div>
          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  {m.role === 'assistant' && <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">🤖</div>}
                  <div className={`max-w-[75%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${m.role === 'user' ? 'bg-terra-500 text-white' : 'bg-cream-200 text-ink-700'}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm">🤖</div>
                  <div className="rounded-2xl bg-cream-200 px-4 py-3"><div className="flex gap-1">{[0,150,300].map((d) => <div key={d} className="h-1.5 w-1.5 animate-bounce rounded-full bg-zinc-500" style={{ animationDelay: `${d}ms` }} />)}</div></div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            <div className="border-t border-warm-200 p-3">
              <div className="flex gap-2">
                <input className="flex-1 rounded-xl border border-warm-300 bg-cream-200 px-4 py-2 text-sm text-ink-900 placeholder:text-ink-500 focus:border-terra-400 focus:outline-none"
                  placeholder="輸入你的職涯問題..."
                  value={input} onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={chatLoading} />
                <Button variant="primary" size="sm" onClick={() => sendMessage()} loading={chatLoading}>送出</Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
