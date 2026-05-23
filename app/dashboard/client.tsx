'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing, ProgressBar } from '@/components/ui/progress-ring'

const AI_INSIGHTS = [
  { text: '你的履歷目前缺少量化成就數據，加入 2–3 個具體數字可讓 ATS 分數提升約 30 分。', cta: '優化履歷', href: '/career-profile', icon: '📄' },
  { text: '本週「前端工程師」在台灣的需求上升了 18%，建議現在更新目標職位設定。',         cta: '查看趨勢', href: '/career-intelligence', icon: '📊' },
  { text: '已連續 3 天沒有練習面試題目了。每日 10 分鐘的練習能顯著提升面試表現。',       cta: '開始練習', href: '/interview-prep', icon: '💬' },
]

const PIPELINE_ITEMS = [
  { company: 'LINE Taiwan', role: '前端工程師',    status: 'interview',   daysAgo: 0 },
  { company: '台積電',       role: '軟體工程師',    status: 'applied',     daysAgo: 3 },
  { company: 'Shopee',      role: 'Frontend Lead', status: 'saved',       daysAgo: 1 },
  { company: 'Garena',      role: 'React Dev',     status: 'phone_screen',daysAgo: 5 },
]

const STATUS_CFG: Record<string, { label: string; textColor: string; dot: string; bgColor: string }> = {
  saved:        { label: '已儲存',   textColor: 'text-ink-400',  dot: 'bg-warm-300',     bgColor: 'bg-cream-100' },
  applied:      { label: '已投遞',   textColor: 'text-sage-600', dot: 'bg-sage-400',     bgColor: 'bg-sage-50' },
  phone_screen: { label: '電話面試', textColor: 'text-honey-500',dot: 'bg-honey-400',    bgColor: 'bg-honey-50' },
  interview:    { label: '面試中',   textColor: 'text-terra-600',dot: 'bg-terra-400',    bgColor: 'bg-terra-50' },
  offer:        { label: 'Offer ✓', textColor: 'text-sage-700', dot: 'bg-sage-500',     bgColor: 'bg-sage-100' },
}

const MODULES = [
  { href: '/career-profile',      emoji: '📄', label: 'Resume Lab',    sub: '履歷分析 · ATS 評分',  bg: 'bg-terra-50 border-terra-100',  badge: null },
  { href: '/career-match',        emoji: '🎯', label: 'Job Pipeline',  sub: '職缺搜尋 · 應徵追蹤',  bg: 'bg-sage-50 border-sage-100',    badge: 4 },
  { href: '/career-growth',       emoji: '🌱', label: 'Skill Map',     sub: '技能落差 · AI 教練',   bg: 'bg-honey-50 border-honey-100',  badge: 2 },
  { href: '/interview-prep',      emoji: '💬', label: 'Interviews',    sub: '模擬面試 · STAR 評分', bg: 'bg-cream-200 border-warm-200',  badge: null },
  { href: '/career-intelligence', emoji: '📊', label: 'Analytics',     sub: '薪資行情 · 產業趨勢', bg: 'bg-clay-100 border-warm-200',   badge: null },
]

const STREAK_DAYS = [0,1,1,0,1,1,0,0,1,0,1,1,1,0,0,0,1,1,0,1,0,0,1,1,1,0,1,0]

export function DashboardClient({ name }: { name: string }) {
  const [insightIdx, setInsightIdx] = useState(0)
  const insight = AI_INSIGHTS[insightIdx % AI_INSIGHTS.length]

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

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-ink-300 mb-1">
            {new Date().toLocaleDateString('zh-TW', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-ink-900 tracking-tight">
            {greeting}，{name} 🌿
          </h1>
          <p className="mt-0.5 text-sm text-ink-400">今天想在職涯上做什麼？</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline" size="sm">完善資料</Button>
        </Link>
      </div>

      {/* ── Row 1: Score + Mission ───────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Career Health Score */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Career Health Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 py-2 pb-5">
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
          </CardContent>
        </Card>

        {/* Today's Focus + Streak */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Today's Focus — notebook card */}
          <Card className="flex-1 border-l-4 border-l-terra-400">
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

          {/* Activity Streak — warm calendar */}
          <Card>
            <CardContent className="flex items-center gap-5 py-4">
              <div className="text-center shrink-0">
                <p className="text-2xl font-bold text-honey-500">3</p>
                <p className="text-[10px] text-ink-300 mt-0.5">連續天數</p>
              </div>
              <div className="h-8 w-px bg-warm-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-ink-300 mb-2 font-medium">過去 28 天的活躍紀錄</p>
                <div className="flex flex-wrap gap-1">
                  {STREAK_DAYS.map((active, i) => (
                    <div key={i}
                      className={`h-3.5 w-3.5 rounded-sm transition-colors ${active ? 'bg-terra-300' : 'bg-warm-200'}`}
                      title={`第 ${i + 1} 天`} />
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── AI Coach Insight — notebook-style ──────────────── */}
      <div className="rounded-2xl border border-warm-200 bg-white border-l-4 border-l-sage-400 px-5 py-4 flex items-start gap-4"
        style={{ boxShadow: 'var(--shadow-warm-sm)' }}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sage-100 text-base mt-0.5">
          🌿
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-sage-700 mb-1 uppercase tracking-wide">Career Coach 說</p>
          <p className="text-sm text-ink-600 leading-relaxed">{insight.text}</p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0">
          <Link href={insight.href}>
            <Button variant="outline" size="xs">{insight.cta} →</Button>
          </Link>
          <div className="flex gap-1">
            {AI_INSIGHTS.map((_, i) => (
              <button key={i} onClick={() => setInsightIdx(i)}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${i === insightIdx % AI_INSIGHTS.length ? 'bg-sage-400' : 'bg-warm-300'}`} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Module Cards ─────────────────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-ink-300">功能模組</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="group">
              <div className={`rounded-2xl border p-4 ${m.bg} transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[var(--shadow-warm-md)]`}>
                <div className="mb-3 text-2xl">{m.emoji}</div>
                <p className="text-sm font-semibold text-ink-800 group-hover:text-terra-600 transition-colors leading-tight">{m.label}</p>
                <p className="mt-0.5 text-xs text-ink-400">{m.sub}</p>
                {m.badge && <Badge variant="terra" className="mt-2">{m.badge} 項任務</Badge>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Job Pipeline + Stats ─────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>求職追蹤</CardTitle>
              <Link href="/career-match"><Button variant="ghost" size="xs">查看全部 →</Button></Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-1">
            {PIPELINE_ITEMS.map((item, i) => {
              const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.saved
              return (
                <div key={i} className={`flex items-center gap-3 rounded-xl ${cfg.bgColor} px-4 py-3 transition-colors`}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink-800 truncate">{item.company}</p>
                    <p className="text-xs text-ink-400 truncate">{item.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</p>
                    <p className="text-[10px] text-ink-300 mt-0.5">{item.daysAgo === 0 ? '今天' : `${item.daysAgo} 天前`}</p>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>

        {/* Quick stats */}
        <div className="flex flex-col gap-3">
          {[
            { label: '本月投遞', value: '4',    icon: '📤', color: 'text-sage-600' },
            { label: '面試邀請', value: '1',    icon: '📅', color: 'text-terra-500' },
            { label: '練習題數', value: '0',    icon: '✏️', color: 'text-ink-400' },
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
