'use client'

import { useState, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface ParsedResume {
  name?: string
  email?: string
  skills: string[]
  experiences: { company: string; title: string; description: string }[]
  education: string[]
  rawText: string
}

interface ResumeScore {
  score: number
  suggestions: string[]
  keywords: string[]
  atsScore: number
}

export default function CareerProfilePage() {
  const [tab, setTab] = useState<'resume' | 'skills' | 'journal'>('resume')
  const [file, setFile] = useState<File | null>(null)
  const [parsed, setParsed] = useState<ParsedResume | null>(null)
  const [score, setScore] = useState<ResumeScore | null>(null)
  const [parsing, setParsing] = useState(false)
  const [scoring, setScoring] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const [skills, setSkills] = useState<{ name: string; level: string }[]>([])
  const [newSkill, setNewSkill] = useState('')
  const [journalText, setJournalText] = useState('')
  const [starResult, setStarResult] = useState('')
  const [convertingJournal, setConvertingJournal] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setError('')
    setParsing(true)
    setParsed(null)
    setScore(null)

    const form = new FormData()
    form.append('file', f)

    try {
      const res = await fetch('/api/resume/parse', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '解析失敗')
      setParsed(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setParsing(false)
    }
  }

  async function handleScore() {
    if (!parsed?.rawText) return
    setScoring(true)
    try {
      const res = await fetch('/api/resume/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: parsed.rawText }),
      })
      const data = await res.json()
      setScore(data)
    } catch {
      setError('評分失敗，請再試一次')
    } finally {
      setScoring(false)
    }
  }

  function addSkill() {
    if (!newSkill.trim()) return
    setSkills((prev) => [...prev, { name: newSkill.trim(), level: 'intermediate' }])
    setNewSkill('')
  }

  async function convertToStar() {
    if (!journalText.trim()) return
    setConvertingJournal(true)
    setStarResult('')
    try {
      const res = await fetch('/api/resume/star', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText }),
      })
      const data = await res.json()
      setStarResult(data.star ?? '')
    } catch {
      setStarResult('轉換失敗，請再試一次')
    } finally {
      setConvertingJournal(false)
    }
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📄 職涯資料庫</h1>
        <p className="mt-1 text-sm text-gray-600">管理你的履歷、技能標籤與工作成就日誌</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['resume', 'skills', 'journal'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'resume' ? '履歷管理' : t === 'skills' ? '技能標籤' : '工作日誌'}
          </button>
        ))}
      </div>

      {/* Resume Tab */}
      {tab === 'resume' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>上傳履歷</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                <div className="mb-3 text-4xl">📎</div>
                <p className="text-sm font-medium text-gray-700">點擊上傳或拖曳 PDF / DOCX</p>
                <p className="text-xs text-gray-500 mt-1">最大 10MB</p>
                {file && <p className="mt-3 text-sm text-blue-600">✓ {file.name}</p>}
              </div>
              <input ref={fileRef} type="file" accept=".pdf,.docx" className="hidden" onChange={handleUpload} />
              {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
              {parsing && (
                <div className="mt-4 flex items-center gap-2 text-sm text-blue-600">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  AI 正在解析履歷...
                </div>
              )}
            </CardContent>
          </Card>

          {parsed && (
            <>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>解析結果</CardTitle>
                    <Button size="sm" onClick={handleScore} loading={scoring}>
                      AI 評分
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {parsed.name && (
                    <div>
                      <p className="text-xs font-medium text-gray-500">姓名</p>
                      <p className="text-sm text-gray-900">{parsed.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-medium text-gray-500 mb-2">技能</p>
                    <div className="flex flex-wrap gap-2">
                      {parsed.skills.map((s) => (
                        <Badge key={s} variant="info">{s}</Badge>
                      ))}
                    </div>
                  </div>
                  {parsed.experiences.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">工作經歷</p>
                      {parsed.experiences.map((exp, i) => (
                        <div key={i} className="mb-2 rounded-lg bg-gray-50 p-3">
                          <p className="text-sm font-medium text-gray-900">{exp.title} @ {exp.company}</p>
                          <p className="mt-1 text-xs text-gray-600">{exp.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {score && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI 評分報告</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-8">
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${scoreColor(score.score)}`}>{score.score}</div>
                        <div className="text-xs text-gray-500 mt-1">整體評分</div>
                      </div>
                      <div className="text-center">
                        <div className={`text-5xl font-bold ${scoreColor(score.atsScore)}`}>{score.atsScore}</div>
                        <div className="text-xs text-gray-500 mt-1">ATS 友善度</div>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">改善建議</p>
                      <ul className="space-y-2">
                        {score.suggestions.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-0.5 text-yellow-500">⚠</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">重要關鍵字</p>
                      <div className="flex flex-wrap gap-2">
                        {score.keywords.map((k) => (
                          <Badge key={k} variant="success">{k}</Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      )}

      {/* Skills Tab */}
      {tab === 'skills' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>新增技能</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="例如：React、Python、專案管理"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSkill()}
                  className="flex-1"
                />
                <Button onClick={addSkill}>新增</Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>我的技能 ({skills.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <p className="text-sm text-gray-500">尚未新增任何技能</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {skills.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 rounded-full bg-blue-50 pl-3 pr-2 py-1">
                      <span className="text-sm text-blue-700">{s.name}</span>
                      <button
                        onClick={() => setSkills((prev) => prev.filter((_, j) => j !== i))}
                        className="text-blue-400 hover:text-blue-700 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Journal Tab */}
      {tab === 'journal' && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>工作日誌 → STAR 格式轉換</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                label="輸入你的工作成就或故事"
                placeholder="例如：我在上一份工作帶領團隊完成了一個電商系統重構，將頁面載入時間從 5 秒縮短到 1.5 秒，帶動轉換率提升 23%..."
                rows={6}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
              />
              <Button onClick={convertToStar} loading={convertingJournal} disabled={!journalText.trim()}>
                🤖 AI 轉換為 STAR 格式
              </Button>
            </CardContent>
          </Card>

          {starResult && (
            <Card>
              <CardHeader>
                <CardTitle>STAR 格式結果</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 text-sm text-gray-800 leading-relaxed">
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
