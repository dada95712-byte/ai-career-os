'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ProgressRing, ProgressBar } from '@/components/ui/progress-ring'

/* ── Types ──────────────────────────────────────────────────── */
interface ScoreBreakdown {
  label: string
  value: number
  max: number
  color: string
  href: string
}

/* ── Static data (replace with DB later) ─────────────────────── */
const AI_INSIGHTS = [
  { id: 1, type: 'warning', text: '你的履歷缺少「數據指標」，加入量化成就可提升 ATS 分數約 30 分。', cta: '立即優化', href: '/career-profile' },
  { id: 2, type: 'info',    text: '本週「前端工程師」職缺需求上升 18%，建議更新目標職位設定。',    cta: '查看趨勢', href: '/career-intelligence' },
  { id: 3, type: 'tip',     text: '連續 3 天未練習面試題目，保持每日練習能提升錄取率 2.5 倍。',    cta: '開始練習', href: '/interview-prep' },
]

const PIPELINE_ITEMS = [
  { company: 'LINE Taiwan', role: '前端工程師',    status: 'interview', daysAgo: 0 },
  { company: 'TSMC',        role: '軟體工程師',    status: 'applied',   daysAgo: 3 },
  { company: 'Shopee',      role: 'Frontend Lead', status: 'saved',     daysAgo: 1 },
  { company: 'Garena',      role: 'React Dev',     status: 'phone_screen', daysAgo: 5 },
]

const STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  saved:        { label: '已儲存',   color: 'text-zinc-400', dot: 'bg-zinc-600' },
  applied:      { label: '已投遞',   color: 'text-sky-400',  dot: 'bg-sky-500' },
  phone_screen: { label: '電話面試', color: 'text-amber-400',dot: 'bg-amber-500' },
  interview:    { label: '面試中',   color: 'text-violet-400',dot: 'bg-violet-500' },
  offer:        { label: 'Offer',    color: 'text-emerald-400',dot: 'bg-emerald-500' },
}

const MODULES = [
  { href: '/career-profile',       label: 'Resume Lab',       sub: '履歷分析 + ATS 評分',       score: 0,  color: 'from-indigo-500/20 to-indigo-600/5',  icon: '◈' },
  { href: '/career-match',         label: 'Job Pipeline',     sub: '職缺搜尋 + 應徵追蹤',       score: 4,  color: 'from-sky-500/20 to-sky-600/5',        icon: '◎' },
  { href: '/career-growth',        label: 'Skill Map',        sub: '技能落差 + AI 教練',         score: 2,  color: 'from-emerald-500/20 to-emerald-600/5', icon: '◈' },
  { href: '/interview-prep',       label: 'Interview Arena',  sub: '模擬面試 + 答案評分',       score: 0,  color: 'from-violet-500/20 to-violet-600/5',  icon: '⬟' },
  { href: '/career-intelligence',  label: 'Analytics',        sub: '薪資行情 + 產業趨勢',       score: 0,  color: 'from-amber-500/20 to-amber-600/5',    icon: '◉' },
]

const STREAK_DAYS = [0, 1, 1, 0, 1, 1, 0, 0, 1, 0, 1, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 1, 0, 1, 0]

/* ── Main component ──────────────────────────────────────────── */
export function DashboardClient({ name }: { name: string }) {
  const [insightIdx, setInsightIdx] = useState(0)
  const insight = AI_INSIGHTS[insightIdx % AI_INSIGHTS.length]

  const scoreBreakdown: ScoreBreakdown[] = [
    { label: 'Resume',     value: 0,  max: 30, color: 'bg-indigo-500', href: '/career-profile' },
    { label: 'Skills',     value: 10, max: 20, color: 'bg-sky-500',    href: '/career-growth' },
    { label: 'Jobs',       value: 15, max: 25, color: 'bg-emerald-500',href: '/career-match' },
    { label: 'Practice',   value: 0,  max: 25, color: 'bg-violet-500', href: '/interview-prep' },
  ]
  const totalScore = scoreBreakdown.reduce((s, b) => s + b.value, 0)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'

  return (
    <div className="min-h-screen p-6 lg:p-8 space-y-6">

      {/* ── Header ───────────────────────────────────────── */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-500 mb-1">
            {new Date().toLocaleDateString('zh-TW', { weekday: 'long', month: 'long', day: 'numeric' })}
          </p>
          <h1 className="text-2xl font-bold text-zinc-50">
            {greeting}，{name} 👋
          </h1>
          <p className="mt-1 text-sm text-zinc-400">你的職涯指揮中心已就緒</p>
        </div>
        <Link href="/onboarding">
          <Button variant="outline" size="sm">完善資料</Button>
        </Link>
      </div>

      {/* ── Row 1: Health Score + Mission ────────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Career Health Score */}
        <Card className="glow-sm lg:col-span-1">
          <CardHeader>
            <CardTitle>Career Health Score</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-5 py-5">
            <ProgressRing score={totalScore} size={150} strokeWidth={10} />
            <div className="w-full space-y-2.5">
              {scoreBreakdown.map((b) => (
                <Link key={b.label} href={b.href} className="block group">
                  <ProgressBar
                    label={b.label}
                    value={Math.round((b.value / b.max) * 100)}
                    color={b.color}
                    showValue
                    className="group-hover:opacity-80 transition-opacity"
                  />
                </Link>
              ))}
            </div>
            <p className="text-center text-xs text-zinc-600">
              完成各模組任務來提升分數
            </p>
          </CardContent>
        </Card>

        {/* Today's Mission + Weekly Streak */}
        <div className="flex flex-col gap-4 lg:col-span-2">

          {/* Today's Mission */}
          <Card className="flex-1 border-indigo-500/20 bg-gradient-to-br from-indigo-500/5 to-zinc-900">
            <CardHeader>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-sm">🎯</span>
                <CardTitle className="text-indigo-300">Today&apos;s Mission</CardTitle>
                <Badge variant="indigo" className="ml-auto">優先</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-base font-semibold text-zinc-100">上傳你的第一份履歷</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  AI 將自動解析並給出 ATS 評分 + 3 條具體改善建議，讓你的履歷脫穎而出。
                </p>
              </div>
              <ProgressBar value={0} color="bg-indigo-500" label="進度" showValue />
              <Link href="/career-profile">
                <Button variant="gradient" className="w-full sm:w-auto">
                  立即開始 →
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Weekly Streak */}
          <Card>
            <CardContent className="py-4 flex items-center gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-amber-400">3</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">連續天數</div>
              </div>
              <div className="h-8 w-px bg-zinc-800" />
              <div className="flex-1">
                <p className="text-xs font-medium text-zinc-400 mb-2">過去 28 天活躍紀錄</p>
                <div className="flex gap-1 flex-wrap">
                  {STREAK_DAYS.map((active, i) => (
                    <div
                      key={i}
                      className={`h-4 w-4 rounded-sm transition-colors ${
                        active ? 'bg-indigo-500' : 'bg-zinc-800'
                      }`}
                      title={`第 ${i + 1} 天`}
                    />
                  ))}
                </div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-400">🔥</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">熱度</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ── AI Insight Bar ────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-3.5 flex items-center gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/15 text-sm">🤖</div>
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">AI Insight</span>
        </div>
        <p className="flex-1 text-sm text-zinc-300 truncate">{insight.text}</p>
        <Link href={insight.href}>
          <Button variant="outline" size="xs">{insight.cta} →</Button>
        </Link>
        <div className="flex gap-1 ml-2">
          {AI_INSIGHTS.map((_, i) => (
            <button
              key={i}
              onClick={() => setInsightIdx(i)}
              className={`h-1.5 w-1.5 rounded-full transition-colors ${i === insightIdx % AI_INSIGHTS.length ? 'bg-indigo-500' : 'bg-zinc-700'}`}
            />
          ))}
        </div>
      </div>

      {/* ── Row 3: Modules Grid ───────────────────────────── */}
      <div>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-600">功能模組</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {MODULES.map((m) => (
            <Link key={m.href} href={m.href} className="group">
              <div className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${m.color} p-4 transition-all duration-200 hover:border-zinc-700 hover:shadow-lg hover:shadow-black/30 hover:-translate-y-0.5`}>
                <div className="mb-3 text-2xl text-zinc-500 group-hover:text-zinc-300 transition-colors">{m.icon}</div>
                <p className="text-sm font-semibold text-zinc-200 group-hover:text-white">{m.label}</p>
                <p className="mt-0.5 text-xs text-zinc-500">{m.sub}</p>
                {m.score > 0 && (
                  <Badge variant="indigo" className="mt-2">{m.score} 任務</Badge>
                )}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Row 4: Job Pipeline + Quick Stats ─────────────── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Job Pipeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Job Pipeline</CardTitle>
              <Link href="/career-match">
                <Button variant="ghost" size="xs">查看全部 →</Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 pt-0">
            {PIPELINE_ITEMS.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-zinc-500">尚未追蹤任何職缺</p>
                <Link href="/career-match" className="mt-2 inline-block text-xs text-indigo-400 hover:text-indigo-300">
                  開始搜尋職缺 →
                </Link>
              </div>
            ) : (
              PIPELINE_ITEMS.map((item, i) => {
                const cfg = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.saved
                return (
                  <div key={i} className="flex items-center gap-3 rounded-xl bg-zinc-800/40 px-4 py-3 hover:bg-zinc-800/70 transition-colors">
                    <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-200 truncate">{item.company}</p>
                      <p className="text-xs text-zinc-500 truncate">{item.role}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</p>
                      <p className="text-[10px] text-zinc-600 mt-0.5">
                        {item.daysAgo === 0 ? '今天' : `${item.daysAgo} 天前`}
                      </p>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <div className="flex flex-col gap-3">
          {[
            { label: '職缺投遞', value: '4', sub: '本月',      color: 'text-sky-400',     icon: '📤' },
            { label: '面試邀請', value: '1', sub: '本月',      color: 'text-violet-400',  icon: '📅' },
            { label: '練習題目', value: '0', sub: '題完成',    color: 'text-emerald-400', icon: '✍️' },
          ].map((stat) => (
            <Card key={stat.label} className="flex-1">
              <CardContent className="flex items-center gap-3 py-4">
                <span className="text-xl">{stat.icon}</span>
                <div>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-zinc-500">{stat.label} · {stat.sub}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

    </div>
  )
}
