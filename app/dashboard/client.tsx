'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing, ProgressBar } from '@/components/ui/progress-ring'

// ── Constants ─────────────────────────────────────────────────────────────────

const MOODS = [
  { key: 'energetic',  emoji: '😊', label: '充滿幹勁', score: 5 },
  { key: 'neutral',    emoji: '😐', label: '普通',     score: 3 },
  { key: 'sad',        emoji: '😔', label: '有點沮喪', score: 2 },
  { key: 'frustrated', emoji: '😤', label: '很挫折',   score: 2 },
  { key: 'tired',      emoji: '😴', label: '疲憊',     score: 1 },
]
const MOOD_SCORE: Record<string, number> = Object.fromEntries(MOODS.map(m => [m.key, m.score]))
const NEGATIVE_MOODS = new Set(['sad', 'frustrated', 'tired'])

const PIPELINE_ITEMS = [
  { company: 'LINE Taiwan', role: '前端工程師',    status: 'interview',   daysAgo: 0 },
  { company: '台積電',       role: '軟體工程師',    status: 'applied',     daysAgo: 3 },
  { company: 'Shopee',      role: 'Frontend Lead', status: 'saved',       daysAgo: 1 },
  { company: 'Garena',      role: 'React Dev',     status: 'phone_screen',daysAgo: 5 },
]

const STATUS_CFG: Record<string, { label: string; textColor: string; dot: string; bgColor: string }> = {
  saved:        { label: '已儲存',   textColor: 'text-ink-400',  dot: 'bg-warm-300',  bgColor: 'bg-cream-100' },
  applied:      { label: '已投遞',   textColor: 'text-sage-600', dot: 'bg-sage-400',  bgColor: 'bg-sage-50' },
  phone_screen: { label: '電話面試', textColor: 'text-honey-500',dot: 'bg-honey-400', bgColor: 'bg-honey-50' },
  interview:    { label: '面試中',   textColor: 'text-terra-600',dot: 'bg-terra-400', bgColor: 'bg-terra-50' },
  offer:        { label: 'Offer ✓', textColor: 'text-sage-700', dot: 'bg-sage-500',  bgColor: 'bg-sage-100' },
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface MoodEntry { date: string; mood: string }
interface DayPoint  { mood: string | null; dayLabel: string }

// ── Mood Trend Chart ──────────────────────────────────────────────────────────

function MoodChart({ days }: { days: DayPoint[] }) {
  const COL = 36
  const H   = 48
  const PAD = 6

  const pts = days.map((d, i) => {
    const score = d.mood ? (MOOD_SCORE[d.mood] ?? 3) : null
    return {
      x: i * COL + COL / 2,
      y: score !== null ? PAD + ((5 - score) / 4) * (H - PAD * 2) : null,
      mood: d.mood,
      label: d.dayLabel,
    }
  })

  const valid = pts.filter(p => p.y !== null)
  const line  = valid.map(p => `${p.x},${p.y}`).join(' ')

  return (
    <svg width={days.length * COL} height={H + 18} className="overflow-visible">
      {valid.length > 1 && (
        <polyline points={line} fill="none" stroke="#7FA887" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          {p.y !== null ? (
            <circle cx={p.x} cy={p.y} r="4.5"
              fill={NEGATIVE_MOODS.has(p.mood!) ? '#E07055' : '#7FA887'} />
          ) : (
            <circle cx={p.x} cy={H / 2} r="3" fill="#E4DBD0" />
          )}
          <text x={p.x} y={H + 14} textAnchor="middle" fontSize="9" fill="#C4B8B2">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardClient({ name }: { name: string }) {
  const [moodLogs, setMoodLogs] = useState<MoodEntry[]>([])
  const [todayMood, setTodayMood] = useState<string | null>(null)

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    try {
      const raw = localStorage.getItem('career-mood-logs')
      if (raw) {
        const logs: MoodEntry[] = JSON.parse(raw)
        setMoodLogs(logs)
        const t = logs.find(l => l.date === today)
        if (t) setTodayMood(t.mood)
      }
    } catch { /* ignore */ }
  }, [])

  function recordMood(mood: string) {
    const today = new Date().toISOString().split('T')[0]
    const updated = [...moodLogs.filter(l => l.date !== today), { date: today, mood }]
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-30)
    setMoodLogs(updated)
    setTodayMood(mood)
    localStorage.setItem('career-mood-logs', JSON.stringify(updated))
  }

  const last7Days: DayPoint[] = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const dateStr  = d.toISOString().split('T')[0]
    const entry    = moodLogs.find(l => l.date === dateStr)
    const dayLabel = d.toLocaleDateString('zh-TW', { weekday: 'short' }).replace('週', '')
    return { mood: entry?.mood ?? null, dayLabel }
  }), [moodLogs])

  // Trigger encouragement after 3 consecutive negative moods
  const last3Moods = last7Days.slice(-3).map(d => d.mood)
  const showEncouragement = last3Moods.every(m => m !== null && NEGATIVE_MOODS.has(m))

  const coachText = showEncouragement
    ? '求職是需要時間的旅程，放慢腳步休息一下也沒關係。你已經很努力了，繼續相信自己。🤗'
    : '你的履歷目前缺少量化成就數據，加入 2–3 個具體數字可讓 ATS 分數提升約 30 分。'
  const coachHref = showEncouragement ? '/career-growth' : '/career-profile'
  const coachCta  = showEncouragement ? '看看自我調適建議 →' : '優化履歷 →'
  const coachBg   = showEncouragement ? 'bg-terra-50 border-l-terra-400' : 'bg-sage-50 border-l-sage-400'
  const coachIcon = showEncouragement ? 'bg-terra-100' : 'bg-sage-100'

  const breakdown = [
    { label: 'Resume',   value: 0,  max: 30, color: 'bg-terra-400', href: '/career-profile' },
    { label: 'Skills',   value: 10, max: 20, color: 'bg-sage-400',  href: '/career-growth' },
    { label: 'Jobs',     value: 15, max: 25, color: 'bg-honey-500', href: '/career-match' },
    { label: 'Practice', value: 0,  max: 25, color: 'bg-clay-300',  href: '/interview-prep' },
  ]
  const totalScore = breakdown.reduce((s, b) => s + b.value, 0)

  const hour = new Date().getHours()
  const greeting = hour < 5 ? '深夜好' : hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'

  return (
    <div className="min-h-screen bg-cream-100 p-6 lg:p-8 space-y-6">

      {/* ── Row 1: Greeting + Score | Today's Task ────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

        {/* Left: greeting + health score */}
        <Card>
          <CardContent className="pt-6 pb-5 space-y-5">
            <div>
              <p className="text-xs text-ink-300 mb-1">
                {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
              <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
                {greeting}，{name} 🌿
              </h1>
              <p className="mt-0.5 text-sm text-ink-400">今天想在職涯上做什麼？</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              <ProgressRing score={totalScore} size={148} strokeWidth={10} />
              <div className="w-full space-y-2.5">
                {breakdown.map((b) => (
                  <Link key={b.label} href={b.href} className="block group">
                    <ProgressBar label={b.label} value={Math.round((b.value / b.max) * 100)}
                      color={b.color} showValue
                      className="group-hover:opacity-75 transition-opacity" />
                  </Link>
                ))}
              </div>
              <p className="text-center text-xs text-ink-300">完成各模組任務即可提升分數</p>
            </div>
          </CardContent>
        </Card>

        {/* Right: today's task */}
        <Card className="border-l-4 border-l-terra-400">
          <CardHeader>
            <div className="flex items-center gap-2">
              <span className="text-base">☀️</span>
              <CardTitle className="text-terra-600">今日首要任務</CardTitle>
              <Badge variant="terra" className="ml-auto">優先</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="text-base font-semibold text-ink-900">上傳你的第一份履歷</h3>
              <p className="mt-1.5 text-sm text-ink-400 leading-relaxed">
                AI 將自動解析並給出 ATS 評分，附帶 3 條具體可執行的改善建議。大約只需要 2 分鐘。
              </p>
            </div>
            <ProgressBar value={0} color="bg-terra-400" label="進度" showValue />
            <Link href="/career-profile">
              <Button variant="primary" size="sm">開始上傳 →</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* ── Career Coach (full width, dynamic) ───────────────── */}
      <div className={`rounded-2xl border-l-4 px-5 py-4 flex items-center gap-4 ${coachBg}`}
        style={{ boxShadow: 'var(--shadow-warm-sm)' }}>
        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-base ${coachIcon}`}>
          🌿
        </div>
        <p className="flex-1 text-sm text-ink-600 leading-relaxed">{coachText}</p>
        <Link href={coachHref} className="shrink-0">
          <Button variant="outline" size="xs">{coachCta}</Button>
        </Link>
      </div>

      {/* ── Today's Mood + 7-day trend ───────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">今日心情</CardTitle>
            {todayMood && (
              <span className="text-xs text-ink-300">
                {MOODS.find(m => m.key === todayMood)?.emoji} 已記錄
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Mood picker */}
          <div className="flex flex-wrap gap-2">
            {MOODS.map((m) => (
              <button key={m.key}
                onClick={() => recordMood(m.key)}
                className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-all ${
                  todayMood === m.key
                    ? 'border-terra-400 bg-terra-50 text-terra-700 font-medium shadow-[var(--shadow-warm-xs)]'
                    : 'border-warm-200 bg-white text-ink-500 hover:border-warm-400 hover:bg-cream-100'
                }`}>
                <span>{m.emoji}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            ))}
          </div>

          {/* 7-day sparkline */}
          <div>
            <p className="text-xs text-ink-300 mb-3 font-medium">近 7 天情緒趨勢</p>
            <div className="overflow-x-auto pb-1">
              <MoodChart days={last7Days} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bottom: Pipeline (2/3) + Stats (1/3) ─────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">

        {/* Job pipeline — latest 3 */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>求職追蹤</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {PIPELINE_ITEMS.slice(0, 3).map((item, i) => {
              const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.saved
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl ${cfg.bgColor} px-4 py-3`}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{item.company}</p>
                    <p className="text-xs text-ink-400 truncate">{item.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</p>
                    <p className="text-[10px] text-ink-300 mt-0.5">
                      {item.daysAgo === 0 ? '今天' : `${item.daysAgo} 天前`}
                    </p>
                  </div>
                </div>
              )
            })}
            <div className="pt-2 text-right">
              <Link href="/career-match"
                className="text-xs text-terra-500 hover:text-terra-700 transition-colors font-medium">
                查看全部 →
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="flex flex-col gap-3">
          {[
            { label: '本月投遞', value: '4', icon: '📤', color: 'text-terra-500' },
            { label: '面試邀請', value: '1', icon: '📅', color: 'text-sage-600' },
            { label: '練習題數', value: '0', icon: '✏️', color: 'text-blue-500' },
          ].map((s) => (
            <Card key={s.label} className="flex-1">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="text-xl">{s.icon}</span>
                <div>
                  <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                  <p className="text-xs text-ink-400">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
