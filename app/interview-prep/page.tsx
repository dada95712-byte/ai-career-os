'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface Question {
  id: string
  question: string
  type: 'behavioral' | 'technical' | 'situational' | 'general'
  userAnswer?: string
  aiFeedback?: string
  aiScore?: number
}

const typeLabels = {
  behavioral: '行為面試',
  technical: '技術面試',
  situational: '情境題',
  general: '一般題',
}

const typeColors = {
  behavioral: 'info',
  technical: 'warning',
  situational: 'success',
  general: 'default',
} as const

const builtInQA: { category: string; questions: string[] }[] = [
  {
    category: '工程師',
    questions: [
      '請描述一個你解決過的技術難題，你是如何找到解決方案的？',
      '請說明你最熟悉的系統架構設計原則，並舉例說明。',
      '你如何確保程式碼品質？有使用哪些工具或流程？',
      '描述一次你在 deadline 壓力下完成專案的經驗。',
    ],
  },
  {
    category: '產品經理',
    questions: [
      '你如何決定產品功能的優先順序？請舉一個實際例子。',
      '描述一個你主導過的功能從想法到上線的完整過程。',
      '當工程師認為功能無法如期完成，你如何處理？',
      '如果指標下滑，你的排查流程是什麼？',
    ],
  },
  {
    category: '行銷',
    questions: [
      '請描述一個你執行過效果最好的行銷活動。',
      '你如何設定和追蹤行銷 KPI？',
      '如果預算縮減 50%，你如何調整行銷策略？',
      '描述一次你用數據改變行銷方向的經驗。',
    ],
  },
  {
    category: '通用',
    questions: [
      '請簡單介紹你自己，以及你為什麼想應徵這個職位。',
      '你最大的優點和缺點各是什麼？',
      '五年後你希望在職業上達到什麼目標？',
      '描述一次你與同事意見不合的經驗，你是如何解決的？',
    ],
  },
]

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<'mock' | 'qa'>('mock')
  const [role, setRole] = useState('')
  const [company, setCompany] = useState('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [generating, setGenerating] = useState(false)
  const [selectedQ, setSelectedQ] = useState<Question | null>(null)
  const [answer, setAnswer] = useState('')
  const [evaluating, setEvaluating] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(builtInQA[3].category)
  const [practiceQ, setPracticeQ] = useState<string | null>(null)
  const [practiceAnswer, setPracticeAnswer] = useState('')
  const [practiceFeedback, setPracticeFeedback] = useState('')
  const [practicingEval, setPracticingEval] = useState(false)

  async function generateQuestions() {
    if (!role.trim()) return
    setGenerating(true)
    setQuestions([])
    setSelectedQ(null)
    try {
      const res = await fetch('/api/interview/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, company }),
      })
      const data = await res.json()
      setQuestions(data.questions ?? [])
    } catch {
      setQuestions([])
    } finally {
      setGenerating(false)
    }
  }

  async function evaluateAnswer() {
    if (!selectedQ || !answer.trim()) return
    setEvaluating(true)
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: selectedQ.question, answer }),
      })
      const data = await res.json()
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === selectedQ.id
            ? { ...q, userAnswer: answer, aiFeedback: data.feedback, aiScore: data.score }
            : q
        )
      )
      setSelectedQ((prev) => prev && { ...prev, userAnswer: answer, aiFeedback: data.feedback, aiScore: data.score })
    } catch {
      // silent fail
    } finally {
      setEvaluating(false)
    }
  }

  async function evaluatePractice() {
    if (!practiceQ || !practiceAnswer.trim()) return
    setPracticingEval(true)
    setPracticeFeedback('')
    try {
      const res = await fetch('/api/interview/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: practiceQ, answer: practiceAnswer }),
      })
      const data = await res.json()
      setPracticeFeedback(`評分：${data.score}/10\n\n${data.feedback}`)
    } catch {
      setPracticeFeedback('評分失敗，請再試一次')
    } finally {
      setPracticingEval(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 8 ? 'text-green-600' : s >= 6 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">💼 面試準備</h1>
        <p className="mt-1 text-sm text-gray-600">AI 模擬面試、答案評分與台灣職場常見題庫</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['mock', 'qa'] as const).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setSelectedQ(null); setAnswer('') }}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'mock' ? '模擬面試' : '常見題庫'}
          </button>
        ))}
      </div>

      {tab === 'mock' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>設定面試情境</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-3">
                <Input
                  label="目標職位"
                  placeholder="例如：資深前端工程師"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label="公司名稱（選填）"
                  placeholder="例如：台積電、LINE"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="flex-1"
                />
              </div>
              <Button onClick={generateQuestions} loading={generating} disabled={!role.trim()}>
                🎲 AI 生成面試題目
              </Button>
            </CardContent>
          </Card>

          {questions.length > 0 && (
            <div className="flex gap-4">
              <div className="w-72 shrink-0 space-y-2">
                {questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => { setSelectedQ(q); setAnswer(q.userAnswer ?? '') }}
                    className={`w-full text-left rounded-xl border p-3 transition-all text-sm ${
                      selectedQ?.id === q.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-gray-800 leading-snug line-clamp-2">{q.question}</p>
                      {q.aiScore !== undefined && (
                        <span className={`shrink-0 text-sm font-bold ${scoreColor(q.aiScore)}`}>
                          {q.aiScore}/10
                        </span>
                      )}
                    </div>
                    <Badge variant={typeColors[q.type]} className="mt-2">{typeLabels[q.type]}</Badge>
                  </button>
                ))}
              </div>

              {selectedQ && (
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <div className="flex items-center gap-2">
                        <Badge variant={typeColors[selectedQ.type]}>{typeLabels[selectedQ.type]}</Badge>
                      </div>
                      <p className="mt-2 text-base font-medium text-gray-900">{selectedQ.question}</p>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Textarea
                        label="你的回答"
                        placeholder="請用 STAR 方法（情境、任務、行動、結果）來回答..."
                        rows={8}
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                      />
                      <Button
                        onClick={evaluateAnswer}
                        loading={evaluating}
                        disabled={!answer.trim()}
                      >
                        🤖 AI 評分與建議
                      </Button>

                      {selectedQ.aiFeedback && (
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`text-3xl font-bold ${scoreColor(selectedQ.aiScore ?? 0)}`}>
                              {selectedQ.aiScore}/10
                            </div>
                            <div className="text-sm text-gray-500">AI 評分</div>
                          </div>
                          <div className="rounded-xl bg-blue-50 p-4">
                            <p className="text-xs font-medium text-blue-700 mb-2">AI 回饋</p>
                            <p className="text-sm text-blue-900 whitespace-pre-line leading-relaxed">
                              {selectedQ.aiFeedback}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'qa' && (
        <div className="flex gap-4">
          <div className="w-48 shrink-0 space-y-1">
            {builtInQA.map((cat) => (
              <button
                key={cat.category}
                onClick={() => { setSelectedCategory(cat.category); setPracticeQ(null); setPracticeAnswer(''); setPracticeFeedback('') }}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedCategory === cat.category
                    ? 'bg-blue-50 text-blue-700 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>

          <div className="flex-1 space-y-3">
            {builtInQA.find((c) => c.category === selectedCategory)?.questions.map((q, i) => (
              <Card
                key={i}
                className={`cursor-pointer transition-shadow hover:shadow-sm ${practiceQ === q ? 'border-blue-500' : ''}`}
                onClick={() => { setPracticeQ(q); setPracticeAnswer(''); setPracticeFeedback('') }}
              >
                <CardContent className="py-4">
                  <p className="text-sm text-gray-800">{q}</p>
                </CardContent>
              </Card>
            ))}

            {practiceQ && (
              <Card>
                <CardHeader>
                  <CardTitle>練習回答</CardTitle>
                  <p className="text-sm text-gray-700 mt-1">{practiceQ}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="請輸入你的回答..."
                    rows={6}
                    value={practiceAnswer}
                    onChange={(e) => setPracticeAnswer(e.target.value)}
                  />
                  <Button onClick={evaluatePractice} loading={practicingEval} disabled={!practiceAnswer.trim()}>
                    🤖 AI 評分
                  </Button>
                  {practiceFeedback && (
                    <div className="rounded-xl bg-blue-50 p-4">
                      <p className="text-sm text-blue-900 whitespace-pre-line leading-relaxed">{practiceFeedback}</p>
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
