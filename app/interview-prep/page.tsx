'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { useReactToPrint } from 'react-to-print'

// ── Types ──────────────────────────────────────────────────────────────────────

interface Question {
  id: string; question: string; questionEn?: string
  type: 'behavioral' | 'technical' | 'situational' | 'general'
  userAnswer?: string; aiFeedback?: string; aiScore?: number
  strengths?: string[]; suggestions?: string[]; optimizedAnswer?: string
}
interface RealRecord {
  id: string; question: string; answer: string; score?: number; feedback?: string; date: string
}
interface PracticeResult {
  answer: string; score: number
  strengths: string[]; suggestions: string[]; optimizedAnswer: string
}

const TYPE: Record<string, { label: string; labelEn: string; color: 'info' | 'warning' | 'success' | 'default' }> = {
  behavioral:  { label: '行為面試', labelEn: 'Behavioral',  color: 'info' },
  technical:   { label: '技術面試', labelEn: 'Technical',   color: 'warning' },
  situational: { label: '情境題',   labelEn: 'Situational', color: 'success' },
  general:     { label: '一般題',   labelEn: 'General',     color: 'default' },
}

const QA_BANK = [
  { category: '工程師', questions: [
    { zh: '請描述一個你解決過的技術難題，你是如何找到解決方案的？', en: 'Describe a technical challenge you solved. How did you find the solution?' },
    { zh: '你如何確保程式碼品質？', en: 'How do you ensure code quality?' },
    { zh: '描述一次你在 deadline 壓力下完成專案的經驗。', en: 'Describe a time you completed a project under deadline pressure.' },
    { zh: '說說你最熟悉的系統架構設計原則。', en: 'Describe the system architecture principles you are most familiar with.' },
  ]},
  { category: '產品經理', questions: [
    { zh: '你如何決定產品功能的優先順序？', en: 'How do you prioritize product features?' },
    { zh: '描述一個你主導的功能從想法到上線的過程。', en: 'Describe a feature you led from idea to launch.' },
    { zh: '當工程師認為功能無法如期完成，你如何處理？', en: "What do you do when engineers say a feature can't be delivered on time?" },
    { zh: '指標下滑時你的排查流程是什麼？', en: 'What is your process when key metrics decline?' },
  ]},
  { category: '通用', questions: [
    { zh: '請簡單介紹你自己，以及你為什麼想應徵這個職位。', en: 'Please introduce yourself and explain why you are applying for this position.' },
    { zh: '你最大的優點和缺點各是什麼？', en: 'What are your greatest strengths and weaknesses?' },
    { zh: '五年後你希望在職業上達到什麼目標？', en: 'Where do you see yourself professionally in 5 years?' },
    { zh: '描述一次你與同事意見不合的處理方式。', en: 'Describe a time you disagreed with a colleague and how you handled it.' },
  ]},
]

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 5) }
const scoreCol   = (s: number) => s >= 8 ? 'text-sage-600' : s >= 6 ? 'text-honey-500' : 'text-red-400'
const scoreLabel = (s: number) => s >= 8 ? '表現優異' : s >= 6 ? '表現良好' : s >= 4 ? '尚可改善' : '需要加強'
function scoreStars(score: number) {
  const filled = Math.round(score / 2)
  return '★'.repeat(filled) + '☆'.repeat(5 - filled)
}

type SpeechRecognitionCtor = new () => {
  continuous: boolean; interimResults: boolean; lang: string
  start(): void; stop(): void
  onresult: ((event: Event & { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null
  onerror: ((event: Event) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window { SpeechRecognition: SpeechRecognitionCtor; webkitSpeechRecognition: SpeechRecognitionCtor }
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function InterviewPrepPage() {
  const [tab, setTab] = useState<'mock' | 'qa' | 'record'>('mock')

  // Mock interview — 3-step flow
  const [mockStep, setMockStep] = useState<'setup' | 'list' | 'practice'>('setup')
  const [role, setRole]         = useState('')
  const [company, setCompany]   = useState('')
  const [questions, setQuestions]     = useState<Question[]>([])
  const [generating, setGenerating]   = useState(false)
  const [selectedQ, setSelectedQ]     = useState<Question | null>(null)
  const [mockPracticeIdx, setMockPracticeIdx] = useState(0)
  const [answer, setAnswer]           = useState('')
  const [answerLang, setAnswerLang]   = useState<'zh' | 'en'>('zh')
  const [evaluating, setEvaluating]   = useState(false)
  const [showEn, setShowEn]           = useState(false)
  const [showMockOptimized, setShowMockOptimized] = useState(false)

  // QA bank
  const [selectedCat, setSelectedCat]   = useState('通用')
  const [practiceIdx, setPracticeIdx]   = useState(0)
  const [practiceAnswer, setPracticeAnswer] = useState('')
  const [practiceResults, setPracticeResults] = useState<Record<string, PracticeResult>>({})
  const [practiceEval, setPracticeEval] = useState(false)
  const [showOptimized, setShowOptimized] = useState(false)

  // Real interview record
  const [records, setRecords]         = useState<RealRecord[]>([])
  const [recQuestion, setRecQuestion] = useState('')
  const [recAnswer, setRecAnswer]     = useState('')
  const [recEvaluating, setRecEvaluating] = useState(false)

  const printRef     = useRef<HTMLDivElement>(null)
  const mockListRef  = useRef<HTMLDivElement>(null)
  const handlePrint      = useReactToPrint({ contentRef: printRef })
  const handleMockPrint  = useReactToPrint({ contentRef: mockListRef })

  // Voice / speech
  const [voiceActive, setVoiceActive] = useState(false)
  const [voiceTarget, setVoiceTarget] = useState<'mock' | 'practice' | 'record'>('mock')
  const recognitionRef = useRef<InstanceType<SpeechRecognitionCtor> | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('interview-records')
    if (saved) setRecords(JSON.parse(saved))
  }, [])

  const saveRecords = useCallback((next: RealRecord[]) => {
    setRecords(next)
    localStorage.setItem('interview-records', JSON.stringify(next))
  }, [])

  // ── Computed (QA bank) ────────────────────────────────────────────────────
  const catQuestions   = QA_BANK.find((c) => c.category === selectedCat)?.questions ?? []
  const practiceQ      = catQuestions[practiceIdx] ?? null
  const practiceResult = practiceQ ? practiceResults[practiceQ.zh] : undefined

  function goToQuestion(idx: number) {
    const q = catQuestions[idx]
    setPracticeIdx(idx)
    setPracticeAnswer(q ? (practiceResults[q.zh]?.answer ?? '') : '')
    setShowOptimized(false)
  }

  // ── Computed (Mock) ───────────────────────────────────────────────────────
  function goToMockQuestion(idx: number) {
    const q = questions[idx]
    if (!q) return
    setMockPracticeIdx(idx)
    setSelectedQ(q)
    setAnswer(q.userAnswer ?? '')
    setShowEn(false)
    setShowMockOptimized(false)
  }

  function saveMockAnswer() {
    if (!selectedQ || !answer.trim()) return
    const rec: RealRecord = {
      id: genId(), question: selectedQ.question, answer,
      score: selectedQ.aiScore, feedback: selectedQ.aiFeedback,
      date: new Date().toISOString(),
    }
    saveRecords([rec, ...records])
  }

  // ── Voice ──────────────────────────────────────────────────────────────────
  function startVoice(target: typeof voiceTarget) {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('你的瀏覽器不支援語音輸入，請使用 Chrome 或 Safari'); return }
    if (voiceActive) { recognitionRef.current?.stop(); setVoiceActive(false); return }
    const r = new SR()
    r.lang = answerLang === 'en' ? 'en-US' : 'zh-TW'
    r.continuous = true; r.interimResults = false
    r.onresult = (e) => {
      const t = Array.from(e.results).map((x) => x[0].transcript).join('')
      if (target === 'mock') setAnswer((p) => p + t)
      else if (target === 'practice') setPracticeAnswer((p) => p + t)
      else setRecAnswer((p) => p + t)
    }
    r.onerror = () => setVoiceActive(false)
    r.onend   = () => setVoiceActive(false)
    recognitionRef.current = r; r.start()
    setVoiceActive(true); setVoiceTarget(target)
  }

  // ── Mock interview ─────────────────────────────────────────────────────────
  async function generateQuestions() {
    if (!role.trim()) return
    setGenerating(true); setQuestions([]); setSelectedQ(null); setAnswer('')
    setMockStep('list')
    try {
      const res  = await fetch('/api/interview/questions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role, company }) })
      const data = await res.json()
      setQuestions(data.questions ?? [])
    } catch { /* silent */ }
    finally { setGenerating(false) }
  }

  async function evaluate(forPractice = false) {
    const q = forPractice ? practiceQ?.zh : selectedQ?.question
    const a = forPractice ? practiceAnswer : answer
    if (!q || !a?.trim()) return
    if (forPractice) setPracticeEval(true); else setEvaluating(true)
    try {
      const res  = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: q, answer: a }) })
      const data = await res.json()
      if (forPractice && practiceQ) {
        setPracticeResults((prev) => ({
          ...prev,
          [practiceQ.zh]: {
            answer: a, score: data.score ?? 0,
            strengths: Array.isArray(data.strengths) ? data.strengths : [],
            suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
            optimizedAnswer: data.optimizedAnswer ?? data.feedback ?? '',
          },
        }))
      } else {
        const updates = {
          userAnswer: a, aiFeedback: data.feedback ?? '', aiScore: data.score ?? 0,
          strengths: Array.isArray(data.strengths) ? data.strengths : [],
          suggestions: Array.isArray(data.suggestions) ? data.suggestions : [],
          optimizedAnswer: data.optimizedAnswer ?? data.feedback ?? '',
        }
        setQuestions((p) => p.map((qu) => qu.id === selectedQ?.id ? { ...qu, ...updates } : qu))
        setSelectedQ((p) => p && { ...p, ...updates })
      }
    } catch { /* silent */ }
    finally { if (forPractice) setPracticeEval(false); else setEvaluating(false) }
  }

  // ── Real record ────────────────────────────────────────────────────────────
  async function evaluateRecord() {
    if (!recQuestion.trim() || !recAnswer.trim()) return
    setRecEvaluating(true)
    try {
      const res  = await fetch('/api/interview/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ question: recQuestion, answer: recAnswer }) })
      const data = await res.json()
      const rec: RealRecord = { id: genId(), question: recQuestion, answer: recAnswer, score: data.score, feedback: data.feedback, date: new Date().toISOString() }
      saveRecords([rec, ...records]); setRecQuestion(''); setRecAnswer('')
    } catch { /* silent */ }
    finally { setRecEvaluating(false) }
  }

  function deleteRecord(id: string) { saveRecords(records.filter((r) => r.id !== id)) }

  // ── Shared UI pieces ──────────────────────────────────────────────────────
  const voiceBtn = (target: typeof voiceTarget) => (
    <button onClick={() => startVoice(target)}
      className={`flex items-center gap-2 rounded-xl border px-4 py-2 text-sm transition-all ${voiceActive && voiceTarget === target ? 'border-red-300 bg-red-50 text-red-500' : 'border-warm-200 bg-cream-200 text-ink-500 hover:border-warm-300'}`}>
      {voiceActive && voiceTarget === target ? '⏹ 停止錄音' : '🎤 語音輸入'}
    </button>
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">⬟ Interview Arena</h1>
        <p className="mt-1 text-sm text-ink-500">AI 模擬面試 · 常見題庫 · 實際面試記錄 · PDF 匯出</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-full sm:w-fit shadow-[var(--shadow-warm-xs)] overflow-x-auto">
        {([
          ['mock',   '⬟ 模擬面試'],
          ['qa',     '📋 常見題庫'],
          ['record', '🎙 實際記錄'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => { setTab(t); setSelectedQ(null); setAnswer('') }}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          MOCK INTERVIEW — 3-step flow
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'mock' && (
        <>
          {/* ── Step 1: Setup ── */}
          {mockStep === 'setup' && (
            <div className="flex justify-center pt-4">
              <div className="w-full max-w-[600px] space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold text-ink-900">設定你的面試情境</h2>
                  <p className="text-sm text-ink-400">AI 將根據職位生成 5–8 道針對性題目</p>
                </div>
                <Card>
                  <CardContent className="pt-6 space-y-4">
                    <Input label="目標職位（必填）" placeholder="例如：資深前端工程師、產品經理" value={role}
                      onChange={(e) => setRole(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && generateQuestions()} />
                    <Input label="公司名稱（選填）" placeholder="例如：LINE、台積電、Shopee" value={company}
                      onChange={(e) => setCompany(e.target.value)} />
                    <div className="space-y-1.5">
                      <label className="block text-xs font-medium text-ink-500">回答語言</label>
                      <div className="flex gap-1 rounded-lg border border-warm-200 bg-cream-50 p-0.5 w-fit">
                        {(['zh', 'en'] as const).map((l) => (
                          <button key={l} onClick={() => setAnswerLang(l)}
                            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-all ${answerLang === l ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-400 hover:text-ink-600'}`}>
                            {l === 'zh' ? '中文' : 'English'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <Button variant="primary" onClick={generateQuestions} loading={generating} disabled={!role.trim()} className="w-full">
                      🤖 AI 生成面試題目
                    </Button>
                    <p className="text-center text-xs text-ink-300">AI 將根據職位與公司背景生成客製化題目</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Step 2: Question list ── */}
          {mockStep === 'list' && (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h2 className="text-base font-semibold text-ink-800">
                    {role} 的面試題目{questions.length > 0 ? `（${questions.length} 題）` : ''}
                  </h2>
                  {company && <p className="text-xs text-ink-400 mt-0.5">{company}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setMockStep('setup')}
                    className="text-sm text-ink-400 hover:text-ink-700 transition-colors">
                    ← 重新設定
                  </button>
                  <Button variant="outline" size="sm" onClick={generateQuestions} loading={generating}>
                    重新生成
                  </Button>
                </div>
              </div>

              {/* Loading */}
              {generating && (
                <div className="flex flex-col items-center justify-center py-20 gap-3">
                  <svg className="h-6 w-6 animate-spin text-terra-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <p className="text-sm text-ink-400">AI 正在生成面試題目…</p>
                </div>
              )}

              {/* Question cards */}
              {!generating && (
                <div ref={mockListRef} className="space-y-3 print:p-6">
                  {questions.length > 0 && (
                    <p className="text-xs text-ink-400 print:mb-4 hidden print:block">{role}{company ? ` · ${company}` : ''} — 模擬面試題目</p>
                  )}
                  {questions.map((q, i) => (
                    <Card key={q.id} className={q.aiScore !== undefined ? 'border-sage-200' : ''}>
                      <CardContent className="pt-4 pb-4">
                        <div className="flex items-start gap-4">
                          {/* Number circle */}
                          <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-sm font-bold ${q.aiScore !== undefined ? 'border-sage-300 bg-sage-50 text-sage-600' : 'border-terra-200 bg-terra-50 text-terra-600'}`}>
                            {String(i + 1).padStart(2, '0')}
                          </div>
                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-ink-800 leading-relaxed">{q.question}</p>
                            {q.questionEn && (
                              <p className="text-sm text-ink-400 mt-0.5 italic leading-snug">{q.questionEn}</p>
                            )}
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant={TYPE[q.type]?.color ?? 'default'}>{TYPE[q.type]?.label}</Badge>
                              {q.aiScore !== undefined && (
                                <span className={`text-xs font-semibold ${scoreCol(q.aiScore)}`}>
                                  已練習 {q.aiScore}/10
                                </span>
                              )}
                            </div>
                          </div>
                          {/* Action button */}
                          <button
                            onClick={() => { setSelectedQ(q); setAnswer(q.userAnswer ?? ''); setMockPracticeIdx(i); setMockStep('practice'); setShowEn(false); setShowMockOptimized(false) }}
                            className="print:hidden shrink-0 rounded-xl border border-terra-300 bg-terra-50 px-4 py-2 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors whitespace-nowrap">
                            {q.userAnswer ? '重新練習' : '開始練習'}
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* PDF export */}
              {!generating && questions.length > 0 && (
                <button onClick={() => handleMockPrint()}
                  className="flex items-center gap-2 rounded-xl border border-warm-200 bg-white px-4 py-2.5 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors">
                  📥 匯出所有題目 PDF
                </button>
              )}
            </div>
          )}

          {/* ── Step 3: Practice ── */}
          {mockStep === 'practice' && selectedQ && (
            <div className="space-y-5 max-w-[800px]">
              {/* Top nav */}
              <div className="flex items-center gap-3 flex-wrap">
                <button onClick={() => setMockStep('list')}
                  className="flex items-center gap-1.5 text-sm text-ink-400 hover:text-ink-700 transition-colors">
                  ← 返回題目列表
                </button>
                <span className="ml-auto text-sm text-ink-400">
                  第 {mockPracticeIdx + 1} 題 / 共 {questions.length} 題
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={() => goToMockQuestion(Math.max(0, mockPracticeIdx - 1))}
                    disabled={mockPracticeIdx === 0}
                    className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    上一題
                  </button>
                  <button
                    onClick={() => goToMockQuestion(Math.min(questions.length - 1, mockPracticeIdx + 1))}
                    disabled={mockPracticeIdx === questions.length - 1}
                    className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    下一題
                  </button>
                </div>
              </div>

              {/* Question block */}
              <div className="bg-terra-50 border-l-4 border-terra-400 p-5 rounded-r-xl">
                <Badge variant={TYPE[selectedQ.type]?.color ?? 'default'} className="mb-3">
                  {TYPE[selectedQ.type]?.label} · {TYPE[selectedQ.type]?.labelEn}
                </Badge>
                <p className="text-xl font-semibold text-ink-900 leading-relaxed">{selectedQ.question}</p>
                {selectedQ.questionEn && (
                  <div className="mt-2">
                    <button onClick={() => setShowEn((p) => !p)} className="text-xs text-terra-500 hover:text-terra-700">
                      {showEn ? '▲ 收起英文題目' : '▼ 顯示英文題目'}
                    </button>
                    {showEn && <p className="text-sm text-ink-400 mt-1 italic leading-relaxed">{selectedQ.questionEn}</p>}
                  </div>
                )}
              </div>

              {/* Answer area */}
              <div className="space-y-3">
                <label className="block text-sm font-medium text-ink-600">你的回答</label>
                <textarea
                  rows={8}
                  placeholder={answerLang === 'en' ? 'Use STAR method: Situation → Task → Action → Result' : '建議用 STAR 方法：情境 → 任務 → 行動 → 結果'}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  className="w-full min-h-[200px] rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-y leading-relaxed" />
                <div className="flex items-center gap-3">
                  {voiceBtn('mock')}
                  <button
                    onClick={() => evaluate(false)}
                    disabled={!answer.trim() || evaluating}
                    className="flex items-center gap-2 rounded-xl bg-terra-500 px-5 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-warm-sm)]">
                    {evaluating ? (
                      <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>評分中...</>
                    ) : '✨ AI 評分與建議'}
                  </button>
                </div>
              </div>

              {/* AI feedback */}
              {selectedQ.aiScore !== undefined && (
                <div className="rounded-2xl border border-warm-200 bg-white p-5 space-y-4 shadow-[var(--shadow-warm-xs)]">
                  {/* Score row */}
                  <div className="flex items-center gap-4">
                    <span className={`text-5xl font-bold tabular-nums ${scoreCol(selectedQ.aiScore)}`}>
                      {selectedQ.aiScore}
                    </span>
                    <div>
                      <p className="text-xs text-ink-400 mb-0.5">/ 10 分</p>
                      <p className="text-honey-500 text-lg tracking-wider">{scoreStars(selectedQ.aiScore)}</p>
                    </div>
                    <span className={`ml-auto text-sm font-semibold ${scoreCol(selectedQ.aiScore)}`}>
                      {scoreLabel(selectedQ.aiScore)}
                    </span>
                  </div>

                  {/* Strengths */}
                  {selectedQ.strengths && selectedQ.strengths.length > 0 && (
                    <div className="rounded-xl bg-sage-50 border border-sage-200 p-3">
                      <p className="text-xs font-semibold text-sage-600 mb-2">✓ 優點</p>
                      <ul className="space-y-1.5">
                        {selectedQ.strengths.map((s, i) => (
                          <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                            <span className="text-sage-500 shrink-0 mt-0.5">✓</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggestions */}
                  {selectedQ.suggestions && selectedQ.suggestions.length > 0 && (
                    <div className="rounded-xl bg-terra-50 border border-terra-200 p-3">
                      <p className="text-xs font-semibold text-terra-500 mb-2">→ 改善建議</p>
                      <ul className="space-y-1.5">
                        {selectedQ.suggestions.map((s, i) => (
                          <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                            <span className="text-terra-500 shrink-0 mt-0.5">→</span>{s}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Optimized answer toggle */}
                  {selectedQ.optimizedAnswer && (
                    <>
                      <button
                        onClick={() => setShowMockOptimized((p) => !p)}
                        className="flex items-center justify-center gap-2 w-full rounded-xl border border-terra-200 bg-terra-50 px-4 py-2.5 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors">
                        {showMockOptimized ? '▲ 收起 AI 優化版回答' : '查看 AI 優化版回答'}
                      </button>
                      {showMockOptimized && (
                        <div className="rounded-xl border border-terra-200 bg-terra-50 p-4">
                          <p className="text-xs font-semibold text-terra-500 mb-2">AI 建議回答</p>
                          <p className="text-sm text-ink-600 whitespace-pre-line leading-relaxed">{selectedQ.optimizedAnswer}</p>
                        </div>
                      )}
                    </>
                  )}

                  {/* Save */}
                  <button onClick={saveMockAnswer}
                    className="flex items-center gap-2 rounded-xl border border-warm-200 bg-cream-50 px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors">
                    💾 儲存此題回答到個人題庫
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          QA BANK
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'qa' && (
        <div className="flex gap-5">
          {/* Left: category + question list (35%) */}
          <div className="w-[35%] shrink-0 space-y-3">
            <div className="flex gap-1.5 flex-wrap">
              {QA_BANK.map((cat) => (
                <button key={cat.category}
                  onClick={() => { setSelectedCat(cat.category); setPracticeIdx(0); setPracticeAnswer(''); setShowOptimized(false) }}
                  className={`rounded-full border px-3 py-1 text-sm transition-colors ${selectedCat === cat.category ? 'bg-terra-50 border-terra-400 text-terra-600 font-medium' : 'border-warm-200 text-ink-500 hover:border-warm-300'}`}>
                  {cat.category}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {catQuestions.map((q, i) => {
                const result   = practiceResults[q.zh]
                const isActive = i === practiceIdx
                const isDone   = !!result
                return (
                  <button key={i} onClick={() => goToQuestion(i)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all ${
                      isActive ? 'border-terra-400 bg-terra-50'
                        : isDone ? 'border-sage-200 bg-sage-50 hover:border-sage-300'
                          : 'border-warm-200 bg-white hover:border-warm-300 hover:shadow-[var(--shadow-warm-xs)]'
                    }`}>
                    <div className="flex items-start gap-3">
                      <span className={`text-lg font-bold leading-none shrink-0 mt-0.5 ${isDone ? 'text-sage-400' : isActive ? 'text-terra-400' : 'text-ink-200'}`}>
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-ink-800 leading-snug">{q.zh}</p>
                        <p className="text-sm text-ink-400 mt-1 leading-snug">{q.en}</p>
                        <div className="flex items-center justify-between mt-2">
                          {isDone ? (
                            <><span className="text-xs text-sage-600 font-medium">✓ 已完成 · {result.score}/10</span>
                              <span className="text-xs text-terra-500">重新練習</span></>
                          ) : (
                            <span className="text-xs text-terra-500">開始練習 →</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Right: practice panel (65%) */}
          <div className="flex-1 min-w-0">
            {practiceQ ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-ink-300">#{String(practiceIdx + 1).padStart(2, '0')}</span>
                  <Badge variant="default">{selectedCat}</Badge>
                  <span className="ml-auto text-xs text-ink-400">
                    進度 {catQuestions.filter((q) => practiceResults[q.zh]).length}/{catQuestions.length} 題已完成
                  </span>
                </div>

                <div className="bg-terra-50 border-l-4 border-l-terra-400 p-4 rounded-r-lg">
                  <p className="text-xl font-semibold text-ink-900 leading-relaxed">{practiceQ.zh}</p>
                  <p className="text-sm text-ink-400 mt-1 italic">{practiceQ.en}</p>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-ink-600">你的回答</label>
                  <textarea rows={8} value={practiceAnswer} onChange={(e) => setPracticeAnswer(e.target.value)}
                    placeholder="用 STAR 格式回答效果最好：情境 → 任務 → 行動 → 結果"
                    className="w-full min-h-[200px] rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-y leading-relaxed" />
                  <div className="flex items-center gap-3">
                    {voiceBtn('practice')}
                    <button onClick={() => evaluate(true)} disabled={!practiceAnswer.trim() || practiceEval}
                      className="flex items-center gap-2 rounded-xl bg-terra-500 px-5 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[var(--shadow-warm-sm)]">
                      {practiceEval ? (
                        <><svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>評分中...</>
                      ) : '✨ AI 評分'}
                    </button>
                  </div>
                </div>

                {practiceResult && (
                  <div className="rounded-2xl border border-warm-200 bg-white p-5 space-y-4 shadow-[var(--shadow-warm-xs)]">
                    <div className="flex items-center gap-4">
                      <span className={`text-5xl font-bold tabular-nums ${scoreCol(practiceResult.score)}`}>{practiceResult.score}</span>
                      <div>
                        <p className="text-xs text-ink-400 mb-0.5">/ 10 分</p>
                        <p className="text-honey-500 text-lg tracking-wider">{scoreStars(practiceResult.score)}</p>
                      </div>
                    </div>
                    {(practiceResult.strengths.length > 0 || practiceResult.suggestions.length > 0) && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {practiceResult.strengths.length > 0 && (
                          <div className="rounded-xl bg-sage-50 border border-sage-200 p-3">
                            <p className="text-xs font-semibold text-sage-600 mb-2">✓ 優點</p>
                            <ul className="space-y-1.5">
                              {practiceResult.strengths.map((s, i) => (
                                <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                                  <span className="text-sage-500 shrink-0 mt-0.5">✓</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {practiceResult.suggestions.length > 0 && (
                          <div className="rounded-xl bg-honey-50 border border-amber-200 p-3">
                            <p className="text-xs font-semibold text-honey-600 mb-2">→ 改善建議</p>
                            <ul className="space-y-1.5">
                              {practiceResult.suggestions.map((s, i) => (
                                <li key={i} className="text-xs text-ink-600 flex gap-1.5 leading-relaxed">
                                  <span className="text-honey-500 shrink-0 mt-0.5">→</span>{s}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                    {practiceResult.optimizedAnswer && (
                      <>
                        <button onClick={() => setShowOptimized((p) => !p)}
                          className="flex items-center justify-center gap-2 w-full rounded-xl border border-terra-200 bg-terra-50 px-4 py-2.5 text-sm font-medium text-terra-600 hover:bg-terra-100 transition-colors">
                          {showOptimized ? '▲ 收起優化版回答' : '✨ 查看優化版回答'}
                        </button>
                        {showOptimized && (
                          <div className="rounded-xl border border-terra-200 bg-terra-50 p-4">
                            <p className="text-xs font-semibold text-terra-500 mb-2">AI 建議回答</p>
                            <p className="text-sm text-ink-600 whitespace-pre-line leading-relaxed">{practiceResult.optimizedAnswer}</p>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button onClick={() => goToQuestion(Math.max(0, practiceIdx - 1))} disabled={practiceIdx === 0}
                    className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    ← 上一題
                  </button>
                  <span className="text-xs text-ink-300">{practiceIdx + 1} / {catQuestions.length}</span>
                  <button onClick={() => goToQuestion(Math.min(catQuestions.length - 1, practiceIdx + 1))} disabled={practiceIdx === catQuestions.length - 1}
                    className="flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-4 py-2 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed">
                    下一題 →
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 text-center">
                <p className="text-4xl mb-3">📋</p>
                <p className="text-sm text-ink-500">從左側選擇一道題目開始練習</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          REAL RECORD
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 'record' && (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>記錄實際面試題目</CardTitle>
                {records.length > 0 && <Button size="sm" variant="outline" onClick={() => handlePrint()}>匯出 PDF</Button>}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="面試題目" placeholder="輸入實際被問到的問題..." value={recQuestion} onChange={(e) => setRecQuestion(e.target.value)} />
              <div className="space-y-2">
                <Textarea label="你的回答" placeholder="記錄你當時的回答..." rows={5} value={recAnswer} onChange={(e) => setRecAnswer(e.target.value)} />
                {voiceBtn('record')}
              </div>
              <Button variant="primary" onClick={evaluateRecord} loading={recEvaluating} disabled={!recQuestion.trim() || !recAnswer.trim()}>
                🤖 AI 評分 + 儲存到個人題庫
              </Button>
            </CardContent>
          </Card>

          {records.length > 0 && (
            <div ref={printRef} className="space-y-3 print:p-6">
              <h2 className="text-sm font-semibold text-ink-600 print:text-base print:mb-4">我的面試題庫 ({records.length} 題)</h2>
              {records.map((r) => (
                <Card key={r.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink-700">{r.question}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(r.date).toLocaleDateString('zh-TW')}</p>
                        {r.score !== undefined && (
                          <div className="flex items-center gap-2 mt-2">
                            <span className={`text-lg font-bold ${scoreCol(r.score)}`}>{r.score}</span>
                            <span className="text-xs text-ink-400">/ 10</span>
                          </div>
                        )}
                        <p className="mt-2 text-sm text-ink-600 leading-relaxed">{r.answer}</p>
                        {r.feedback && (
                          <div className="mt-3 rounded-xl border border-terra-100 bg-terra-50 p-3">
                            <p className="text-xs font-semibold text-terra-500 mb-1">AI 回饋與優化建議</p>
                            <p className="text-xs text-ink-600 whitespace-pre-line leading-relaxed">{r.feedback}</p>
                          </div>
                        )}
                      </div>
                      <button onClick={() => deleteRecord(r.id)} className="print:hidden rounded-lg border border-warm-200 px-2.5 py-1 text-xs text-ink-400 hover:border-red-200 hover:text-red-400 transition-all shrink-0">刪除</button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {records.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-3">🎙</p>
              <p className="text-sm text-ink-500">記錄你在真實面試中被問到的問題</p>
              <p className="text-xs text-ink-400 mt-1">AI 評分後自動存入個人題庫，可匯出 PDF</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
