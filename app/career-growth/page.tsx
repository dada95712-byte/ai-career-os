'use client'

import { useState, useRef, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface SkillGap {
  skill: string
  status: 'has' | 'partial' | 'missing'
  importance: 'high' | 'medium' | 'low'
  resources: { name: string; url?: string; time: string; difficulty: string }[]
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const quickScenarios = [
  '我想從傳統產業轉往科技業',
  '我想在現有公司升職',
  '我剛被裁員，下一步怎麼辦？',
  '我是應屆生，不知道從哪裡找工作',
]

export default function CareerGrowthPage() {
  const [tab, setTab] = useState<'gap' | 'coach'>('gap')
  const [targetRole, setTargetRole] = useState('')
  const [currentSkills, setCurrentSkills] = useState('')
  const [gapResult, setGapResult] = useState<SkillGap[]>([])
  const [analyzing, setAnalyzing] = useState(false)

  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '你好！我是你的 AI 職涯教練。你今天想聊什麼職涯話題？你可以問我關於轉職、升職、求職策略，或任何職涯困惑。' },
  ])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function analyzeGap() {
    if (!targetRole.trim()) return
    setAnalyzing(true)
    setGapResult([])
    try {
      const res = await fetch('/api/skills/gap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetRole, currentSkills }),
      })
      const data = await res.json()
      setGapResult(data.gaps ?? [])
    } catch {
      setGapResult([])
    } finally {
      setAnalyzing(false)
    }
  }

  async function sendMessage(text?: string) {
    const content = text ?? input.trim()
    if (!content || chatLoading) return
    setInput('')
    const newMessages: ChatMessage[] = [...messages, { role: 'user', content }]
    setMessages(newMessages)
    setChatLoading(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context: 'career_coach' }),
      })
      const data = await res.json()
      setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', content: '抱歉，我目前無法回應，請稍後再試。' }])
    } finally {
      setChatLoading(false)
    }
  }

  const statusIcon = { has: '✅', partial: '🟡', missing: '❌' }
  const statusLabel = { has: '已具備', partial: '部分具備', missing: '完全缺乏' }
  const importanceColor = { high: 'danger', medium: 'warning', low: 'default' } as const

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🌱 職涯成長</h1>
        <p className="mt-1 text-sm text-gray-600">技能落差分析、學習路徑規劃與 AI 職涯教練</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['gap', 'coach'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'gap' ? '技能落差分析' : 'AI 職涯教練'}
          </button>
        ))}
      </div>

      {tab === 'gap' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>分析技能落差</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="目標職位"
                placeholder="例如：資深前端工程師、產品經理、數據分析師"
                value={targetRole}
                onChange={(e) => setTargetRole(e.target.value)}
              />
              <Textarea
                label="目前技能（選填）"
                placeholder="例如：React、TypeScript、基本 SQL、3 年前端開發經驗"
                value={currentSkills}
                onChange={(e) => setCurrentSkills(e.target.value)}
                rows={3}
              />
              <Button onClick={analyzeGap} loading={analyzing} disabled={!targetRole.trim()}>
                🔍 分析技能落差
              </Button>
            </CardContent>
          </Card>

          {gapResult.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-gray-900">
                分析結果 — {targetRole}
              </h2>
              {gapResult.map((gap, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{statusIcon[gap.status]}</span>
                        <div>
                          <p className="font-semibold text-gray-900">{gap.skill}</p>
                          <p className="text-xs text-gray-500">{statusLabel[gap.status]}</p>
                        </div>
                      </div>
                      <Badge variant={importanceColor[gap.importance]}>
                        {gap.importance === 'high' ? '重要' : gap.importance === 'medium' ? '中等' : '次要'}
                      </Badge>
                    </div>

                    {gap.status !== 'has' && gap.resources.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">推薦學習資源</p>
                        <div className="space-y-2">
                          {gap.resources.map((r, j) => (
                            <div key={j} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                              <div>
                                {r.url ? (
                                  <a href={r.url} target="_blank" rel="noopener noreferrer"
                                    className="text-sm font-medium text-blue-600 hover:text-blue-800">
                                    {r.name}
                                  </a>
                                ) : (
                                  <span className="text-sm font-medium text-gray-800">{r.name}</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
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

      {tab === 'coach' && (
        <div className="flex h-[calc(100vh-220px)] flex-col">
          <div className="mb-4 flex flex-wrap gap-2">
            {quickScenarios.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="rounded-full border border-gray-300 px-3 py-1 text-xs text-gray-700 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>

          <Card className="flex flex-1 flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {m.role === 'assistant' && (
                    <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="mr-2 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm">🤖</div>
                  <div className="rounded-2xl bg-gray-100 px-4 py-3">
                    <div className="flex gap-1">
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '0ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '150ms' }} />
                      <div className="h-2 w-2 animate-bounce rounded-full bg-gray-400" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div className="border-t border-gray-100 p-3">
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="輸入你的職涯問題..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  disabled={chatLoading}
                />
                <Button onClick={() => sendMessage()} loading={chatLoading} size="sm">
                  送出
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
