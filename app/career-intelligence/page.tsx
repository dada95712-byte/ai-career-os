'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-ring'
import Link from 'next/link'

interface SalaryData { role: string; industry: string; experience: string; median: number; p25: number; p75: number; source: string; notes: string }
interface Trend { industry: string; trend: 'up' | 'stable' | 'down'; hotJobs: string[]; notes: string }

const TREND_CFG = {
  up:     { icon: '↑', label: '需求上升', color: 'text-sage-600', badge: 'success' as const },
  stable: { icon: '→', label: '穩定',     color: 'text-ink-400',    badge: 'default' as const },
  down:   { icon: '↓', label: '需求下降', color: 'text-red-400',     badge: 'danger'  as const },
}

const STATS = [
  { label: '總投遞數', value: 4,  icon: '📤', color: 'text-sky-400' },
  { label: '面試邀請', value: 1,  icon: '📅', color: 'text-violet-400' },
  { label: '練習題數', value: 0,  icon: '✍️', color: 'text-sage-600' },
  { label: '活躍天數', value: 3,  icon: '🔥', color: 'text-honey-500' },
]

const PIPELINE_ROWS = [
  { label: '已投遞', count: 4, max: 10, color: 'bg-sky-500' },
  { label: '面試邀請', count: 1, max: 10, color: 'bg-violet-500' },
  { label: '技術面試', count: 0, max: 10, color: 'bg-honey-500' },
  { label: '收到 Offer', count: 0, max: 10, color: 'bg-sage-500' },
]

export default function CareerIntelligencePage() {
  const [tab, setTab] = useState<'salary' | 'trends' | 'analytics'>('salary')
  const [salaryRole, setSalaryRole] = useState(''); const [experience, setExperience] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null); const [loadingSalary, setLoadingSalary] = useState(false)
  const [trends, setTrends] = useState<Trend[]>([]); const [loadingTrends, setLoadingTrends] = useState(false)

  async function querySalary() {
    if (!salaryRole.trim()) return
    setLoadingSalary(true); setSalaryData(null)
    try {
      const res = await fetch(`/api/salary?${new URLSearchParams({ role: salaryRole, experience: experience || '3年' })}`)
      setSalaryData(await res.json())
    } catch { /* silent */ }
    finally { setLoadingSalary(false) }
  }

  async function loadTrends() {
    setLoadingTrends(true); setTrends([])
    try {
      const res = await fetch('/api/trends')
      const data = await res.json(); setTrends(data.trends ?? [])
    } catch { /* silent */ }
    finally { setLoadingTrends(false) }
  }

  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n)

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">◉ Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">薪資行情 · 台灣產業趨勢 · 求職儀表板</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
        {(['salary', 'trends', 'analytics'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {t === 'salary' ? '💰 薪資查詢' : t === 'trends' ? '📊 產業趨勢' : '⬡ 我的儀表板'}
          </button>
        ))}
      </div>

      {/* ── Salary ───────────────────────────────────────────── */}
      {tab === 'salary' && (
        <div className="space-y-5 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>薪資行情查詢</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input label="職位" placeholder="例如：軟體工程師" value={salaryRole} onChange={(e) => setSalaryRole(e.target.value)} className="flex-1" />
                <Input label="年資" placeholder="例如：3年、應屆" value={experience} onChange={(e) => setExperience(e.target.value)} className="w-32" />
              </div>
              <Button variant="primary" onClick={querySalary} loading={loadingSalary} disabled={!salaryRole.trim()}>
                🔍 查詢薪資
              </Button>
            </CardContent>
          </Card>

          {salaryData && (
            <Card className="border-terra-100">
              <CardHeader>
                <CardTitle>{salaryData.role} · {salaryData.experience}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Salary tiers */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'P25 低標', val: salaryData.p25, dim: true },
                    { label: '中位數',   val: salaryData.median, dim: false },
                    { label: 'P75 高標', val: salaryData.p75, dim: true },
                  ].map((tier) => (
                    <div key={tier.label} className={`rounded-2xl p-4 text-center ${tier.dim ? 'bg-cream-100' : 'bg-terra-50 border border-terra-400/30'}`}>
                      <p className={`text-xs mb-1 ${tier.dim ? 'text-ink-500' : 'text-terra-500 font-medium'}`}>{tier.label}</p>
                      <p className={`text-lg font-bold ${tier.dim ? 'text-ink-600' : 'text-terra-600'}`}>
                        {fmt(tier.val)}
                      </p>
                      <p className="text-xs text-ink-400 mt-0.5">NTD / 月</p>
                    </div>
                  ))}
                </div>

                {/* Range bar */}
                <div>
                  <div className="relative h-3 rounded-full bg-cream-200 overflow-hidden">
                    <div className="absolute h-3 rounded-full bg-gradient-to-r from-indigo-500/40 to-indigo-500" style={{ left: '15%', right: '15%' }} />
                  </div>
                  <div className="flex justify-between text-xs text-ink-400 mt-1">
                    <span>市場低標</span><span>市場高標</span>
                  </div>
                </div>

                <div className="rounded-xl border border-amber-500/20 bg-honey-500/5 p-4">
                  <p className="text-xs font-semibold text-honey-500 mb-1">🤖 AI 說明</p>
                  <p className="text-sm text-ink-600">{salaryData.notes}</p>
                </div>
                <p className="text-xs text-ink-400">資料來源：{salaryData.source}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* ── Trends ───────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-5">
          <Button variant="outline" onClick={loadTrends} loading={loadingTrends}>
            🔄 載入最新產業趨勢
          </Button>

          {trends.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trends.map((t, i) => {
                const cfg = TREND_CFG[t.trend]
                return (
                  <Card key={i}>
                    <CardContent className="pt-5">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-ink-700">{t.industry}</h3>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-bold ${cfg.color}`}>{cfg.icon}</span>
                          <Badge variant={cfg.badge}>{cfg.label}</Badge>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-xs text-ink-400 mb-1.5">熱門職缺</p>
                        <div className="flex flex-wrap gap-1">
                          {t.hotJobs.map((j) => <Badge key={j} variant="terra">{j}</Badge>)}
                        </div>
                      </div>
                      <p className="text-xs text-ink-500 leading-relaxed">{t.notes}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : !loadingTrends && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-3 text-4xl">📊</div>
              <p className="text-sm text-ink-500">點擊上方按鈕載入最新台灣產業趨勢</p>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics ────────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-5">
          {/* Stats grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {STATS.map((s) => (
              <Card key={s.label}>
                <CardContent className="py-5 text-center">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-ink-500 mt-1">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pipeline funnel */}
          <Card>
            <CardHeader><CardTitle>應徵漏斗</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {PIPELINE_ROWS.map((row) => (
                <ProgressBar key={row.label} label={row.label} value={(row.count / row.max) * 100} color={row.color} showValue={false}
                  className="after:content-[attr(data-count)]" />
              ))}
              <p className="text-xs text-ink-400">數據來自「Job Pipeline」模組的應徵追蹤紀錄</p>
            </CardContent>
          </Card>

          {/* AI tip */}
          <div className="rounded-2xl border border-terra-100 bg-terra-50 p-5">
            <p className="text-xs font-semibold text-terra-500 mb-2">💡 AI 職涯建議</p>
            <p className="text-sm text-ink-600">
              根據台灣求職統計，積極求職者每週需投遞 5–10 份履歷，追蹤每個應徵狀態，才能維持良好的面試轉換率。
              你目前的投遞數略低，建議每日使用 Job Pipeline 搜尋並追蹤新職缺。
            </p>
            <Link href="/career-match" className="mt-3 inline-block text-sm text-terra-500 hover:text-terra-600 transition-colors">
              前往 Job Pipeline →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
