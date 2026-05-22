'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Question { id: string; question: string; type: 'behavioral' | 'technical' | 'situational' | 'general'; userAnswer?: string; aiFeedback?: string; aiScore?: number }

const TYPE: Record<string, { label: string; color: 'info' | 'warning' | 'success' | 'default' }> = {
  behavioral:  { label: '行為面試', color: 'info' },
  technical:   { label: '技術面試', color: 'warning' },
  situational: { label: '情境題',   color: 'success' },
  general:     { label: '一般題',   color: 'default' },
}

const QA_BANK = [
  { category: '工程師', questions: ['請描述一個你解決過的技術難題，你是如何找到解決方案的？','你如何確保程式碼品質？','描述一次你在 deadline 壓力下完成專案的經驗。','說說你最熟悉的系統架構設計原則。'] },
  { category: '產品經理', questions: ['你如何決定產品功能的優先順序？','描述一個你主導的功能從想法到上線的過程。','當工程師認為功能無法如期完成，你如何處理？','指標下滑時你的排查流程是什麼？'] },
  { category: '行銷', questions: ['請描述一個效果最好的行銷活動。','你如何設定和追蹤行銷 KPI？','預算縮減 50% 你如何調整策略？','說說你用數據改變行銷方向的經驗。'] },
  { category: '通用', questions: ['請簡單介紹你自己，以及你為什麼想應徵這個職位。','你最大的優點和缺點各是什麼？','五年後你希望在職業上達到什麼目標？','描述一次你與同事意見不合的處理方式。'] },
]

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<'mock' | 'qa'>('mock')
  const [role, setRole] = useState(''); const [company, setCompany] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedQ, setSelectedQ] = useState<Question | null>(null)
  const [answer, setAnswer] = useState(''); const [evaluating, setEvaluating] = useState(false)
  const [selectedCat, setSelectedCat] = useState('通用')
  const [practiceQ, setPracticeQ] = useState<string | null>(null)
  const [practiceAnswer, setPracticeAnswer] = useState(''); const [practiceFeedback, setPracticeFeedback] = useState(''); const [practiceEval, setPracticeEval] = useState(false)

  async function generateQuestions() {
    if (!role.trim()) return
    setGenerating(true); setQuestions([]); setSelectedQ(null)
    try {
      const res = await fetch('/api/interview/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, company }) })
      const data = await res.json(); setQuestions(data.questions ?? [])
    } catch { /* silent */ }
    finally { setGenerating(false) }
  }

  async function evaluate(forPractice = false) {
    const q = forPractice ? practiceQ : selectedQ?.question
    const a = forPractice ? practiceAnswer : answer
    if (!q || !a?.trim()) return
    if (forPractice) setPracticeEval(true); else setEvaluating(true)
    try {
      const res = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, answer: a }) })
      const data = await res.json()
      if (forPractice) {
        setPracticeFeedback(`評分：${data.score}/10\n\n${data.feedback}`)
      } else {
        setQuestions((p) => p.map((qu) => qu.id === selectedQ?.id ? { ...qu, userAnswer: a, aiFeedback: data.feedback, aiScore: data.score } : qu))
        setSelectedQ((p) => p && { ...p, userAnswer: a, aiFeedback: data.feedback, aiScore: data.score })
      }
    } catch { if (forPractice) setPracticeFeedback('評分失敗') }
    finally { if (forPractice) setPracticeEval(false); else setEvaluating(false) }
  }

  const scoreCol = (s: number) => s >= 8 ? 'text-emerald-400' : s >= 6 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-50">⬟ Interview Arena</h1>
        <p className="mt-1 text-sm text-zinc-500">AI 模擬面試 · 即時評分 · 台灣職場題庫</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-zinc-800 bg-zinc-900/60 p-1 w-fit">
        {(['mock', 'qa'] as const).map((t) => (
          <button key={t} onClick={() => { setTab(t); setSelectedQ(null); setAnswer('') }}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'}`}>
            {t === 'mock' ? '⬟ 模擬面試' : '📋 常見題庫'}
          </button>
        ))}
      </div>

      {/* ── Mock Interview ───────────────────────────────────── */}
      {tab === 'mock' && (
        <div className="space-y-5">
          <Card>
            <CardHeader><CardTitle>設定面試情境</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input label="目標職位" placeholder="例如：資深前端工程師" value={role} onChange={(e) => setRole(e.target.value)} className="flex-1" />
                <Input label="公司（選填）" placeholder="例如：LINE、台積電" value={company} onChange={(e) => setCompany(e.target.value)} className="w-44" />
              </div>
              <Button variant="gradient" onClick={generateQuestions} loading={generating} disabled={!role.trim()}>
                🎲 AI 生成面試題目
              </Button>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <div className="flex gap-5">
              <div className="w-72 shrink-0 space-y-2 overflow-y-auto max-h-[65vh]">
                {questions.map((q) => (
                  <button key={q.id} onClick={() => { setSelectedQ(q); setAnswer(q.userAnswer ?? '') }}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 ${selectedQ?.id === q.id ? 'border-indigo-500 bg-indigo-500/10' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/50'}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-sm text-zinc-300 line-clamp-2 leading-snug">{q.question}</p>
                      {q.aiScore !== undefined && (
                        <span className={`shrink-0 text-sm font-bold ${scoreCol(q.aiScore)}`}>{q.aiScore}/10</span>
                      )}
                    </div>
                    <Badge variant={TYPE[q.type]?.color ?? 'default'}>{TYPE[q.type]?.label}</Badge>
                  </button>
                ))}
              </div>

              {selectedQ && (
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <Badge variant={TYPE[selectedQ.type]?.color ?? 'default'} className="w-fit mb-2">
                        {TYPE[selectedQ.type]?.label}
                      </Badge>
                      <p className="text-sm font-medium text-zinc-100 leading-relaxed">{selectedQ.question}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea label="你的回答" placeholder="請用 STAR 方法（情境、任務、行動、結果）回答..." rows={8} value={answer} onChange={(e) => setAnswer(e.target.value)} />
                      <Button variant="gradient" onClick={() => evaluate(false)} loading={evaluating} disabled={!answer.trim()}>
                        🤖 AI 評分與建議
                      </Button>
                      {selectedQ.aiFeedback && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-3xl font-bold ${scoreCol(selectedQ.aiScore ?? 0)}`}>{selectedQ.aiScore}</span>
                            <span className="text-sm text-zinc-500">/ 10</span>
                          </div>
                          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                            <p className="text-xs font-semibold text-indigo-400 mb-2">AI 回饋</p>
                            <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{selectedQ.aiFeedback}</p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {questions.length === 0 && !generating && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-3 text-4xl">⬟</div>
              <p className="text-sm text-zinc-500">輸入目標職位，AI 將生成 8 道客製化面試題</p>
            </div>
          )}
        </div>
      )}

      {/* ── QA Bank ──────────────────────────────────────────── */}
      {tab === 'qa' && (
        <div className="flex gap-5">
          <div className="w-40 shrink-0 space-y-1">
            {QA_BANK.map((cat) => (
              <button key={cat.category} onClick={() => { setSelectedCat(cat.category); setPracticeQ(null); setPracticeAnswer(''); setPracticeFeedback('') }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${selectedCat === cat.category ? 'bg-indigo-500/10 text-indigo-300 font-medium' : 'text-zinc-500 hover:bg-zinc-800 hover:text-zinc-300'}`}>
                {cat.category}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3">
            {QA_BANK.find((c) => c.category === selectedCat)?.questions.map((q, i) => (
              <button key={i} onClick={() => { setPracticeQ(q); setPracticeAnswer(''); setPracticeFeedback('') }}
                className={`w-full text-left rounded-2xl border p-4 transition-all ${practiceQ === q ? 'border-indigo-500 bg-indigo-500/5' : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'}`}>
                <p className="text-sm text-zinc-300">{q}</p>
              </button>
            ))}

            {practiceQ && (
              <Card className="border-indigo-500/20">
                <CardHeader>
                  <CardTitle>練習回答</CardTitle>
                  <p className="text-sm text-zinc-400 mt-1">{practiceQ}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea placeholder="請輸入你的回答..." rows={6} value={practiceAnswer} onChange={(e) => setPracticeAnswer(e.target.value)} />
                  <Button variant="gradient" onClick={() => evaluate(true)} loading={practiceEval} disabled={!practiceAnswer.trim()}>
                    🤖 AI 評分
                  </Button>
                  {practiceFeedback && (
                    <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4">
                      <p className="text-sm text-zinc-300 whitespace-pre-line leading-relaxed">{practiceFeedback}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
