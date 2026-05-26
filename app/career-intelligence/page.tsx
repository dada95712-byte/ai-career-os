'use client'

import { useState, useRef } from 'react'
import { PageTooltip } from '@/components/onboarding/page-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-ring'
import Link from 'next/link'
import { useReactToPrint } from 'react-to-print'

interface SalaryData { role: string; industry: string; experience: string; median: number; p25: number; p75: number; source: string; notes: string }
interface Trend { industry: string; trend: 'up' | 'stable' | 'down'; hotJobs: string[]; notes: string }
interface CompanyReport {
  background: { founded: string; size: string; location: string; business: string }
  businessModel: { revenue: string; targetCustomers: string; valueProposition: string }
  swot: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
  marketAnalysis: string
  industryTrends: string
  companyUpdates: string
  dataSources: string[]
  analyzedAt: string
}
interface SavedReport { company: string; report: CompanyReport; hasWebData: boolean; savedAt: string }

const TREND_CFG = {
  up:     { icon: '↑', label: '需求上升', color: 'text-sage-600', badge: 'success' as const },
  stable: { icon: '→', label: '穩定',     color: 'text-ink-400',  badge: 'default' as const },
  down:   { icon: '↓', label: '需求下降', color: 'text-red-400',  badge: 'danger'  as const },
}

const STATS = [
  { label: '總投遞數', value: 4, icon: '📤', color: 'text-sky-400' },
  { label: '面試邀請', value: 1, icon: '📅', color: 'text-violet-400' },
  { label: '練習題數', value: 0, icon: '✍️', color: 'text-sage-600' },
  { label: '活躍天數', value: 3, icon: '🔥', color: 'text-honey-500' },
]

const PIPELINE_ROWS = [
  { label: '已投遞', count: 4, max: 10, color: 'bg-sky-500' },
  { label: '面試邀請', count: 1, max: 10, color: 'bg-violet-500' },
  { label: '技術面試', count: 0, max: 10, color: 'bg-honey-500' },
  { label: '收到 Offer', count: 0, max: 10, color: 'bg-sage-500' },
]

export default function CareerIntelligencePage() {
  const [tab, setTab] = useState<'salary' | 'trends' | 'analytics' | 'company'>('salary')

  // Salary
  const [salaryRole, setSalaryRole] = useState('')
  const [experience, setExperience] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [loadingSalary, setLoadingSalary] = useState(false)

  // Trends
  const [trends, setTrends] = useState<Trend[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)

  // Company analysis
  const [companyName, setCompanyName] = useState('')
  const [analyzing, setAnalyzing] = useState(false)
  const [currentReport, setCurrentReport] = useState<SavedReport | null>(null)
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('company-reports') ?? '[]') } catch { return [] }
  })
  const [companyError, setCompanyError] = useState('')
  const reportRef = useRef<HTMLDivElement>(null)

  const handlePrintReport = useReactToPrint({ contentRef: reportRef })

  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n)

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

  async function analyzeCompany() {
    if (!companyName.trim()) return
    setAnalyzing(true); setCompanyError(''); setCurrentReport(null)
    try {
      const res = await fetch('/api/company/analyze', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: companyName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '分析失敗')
      const saved: SavedReport = { ...data, savedAt: new Date().toISOString() }
      setCurrentReport(saved)
      setSavedReports((p) => {
        const filtered = p.filter((r) => r.company !== companyName)
        const next = [saved, ...filtered].slice(0, 10)
        localStorage.setItem('company-reports', JSON.stringify(next))
        return next
      })
    } catch (e) { setCompanyError((e as Error).message) }
    finally { setAnalyzing(false) }
  }

  function loadSavedReport(r: SavedReport) {
    setCurrentReport(r); setCompanyName(r.company)
  }

  const SWOT_CFG = [
    { key: 'strengths' as const,    label: '優勢 Strengths',    color: 'bg-sage-500/10 text-sage-700 border-sage-200' },
    { key: 'weaknesses' as const,   label: '劣勢 Weaknesses',   color: 'bg-red-500/10 text-red-700 border-red-200' },
    { key: 'opportunities' as const, label: '機會 Opportunities', color: 'bg-sky-500/10 text-sky-700 border-sky-200' },
    { key: 'threats' as const,      label: '威脅 Threats',      color: 'bg-honey-500/10 text-honey-600 border-amber-200' },
  ]

  return (
    <div className="p-4 md:p-8 space-y-5">
      <PageTooltip pageKey="analytics" />
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">◉ Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">薪資行情 · 產業趨勢 · 公司分析 · 求職儀表板</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-full sm:w-fit shadow-[var(--shadow-warm-xs)] overflow-x-auto">
        {([
          ['salary',    '💰 薪資查詢'],
          ['trends',    '📊 產業趨勢'],
          ['company',   '🏢 公司分析'],
          ['analytics', '⬡ 儀表板'],
        ] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Salary ─────────────────────────────────────────── */}
      {tab === 'salary' && (
        <div className="space-y-5 max-w-2xl">
          <Card>
            <CardHeader><CardTitle>薪資行情查詢</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <Input label="職位" placeholder="例如：軟體工程師" value={salaryRole} onChange={(e) => setSalaryRole(e.target.value)} className="flex-1" />
                <Input label="年資" placeholder="例如：3年、應屆" value={experience} onChange={(e) => setExperience(e.target.value)} className="sm:w-32" />
              </div>
              <Button variant="primary" onClick={querySalary} loading={loadingSalary} disabled={!salaryRole.trim()}>🔍 查詢薪資</Button>
            </CardContent>
          </Card>

          {salaryData && (
            <Card className="border-terra-100">
              <CardHeader><CardTitle>{salaryData.role} · {salaryData.experience}</CardTitle></CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'P25 低標', val: salaryData.p25, dim: true },
                    { label: '中位數',   val: salaryData.median, dim: false },
                    { label: 'P75 高標', val: salaryData.p75, dim: true },
                  ].map((tier) => (
                    <div key={tier.label} className={`rounded-2xl p-4 text-center ${tier.dim ? 'bg-cream-100' : 'bg-terra-50 border border-terra-400/30'}`}>
                      <p className={`text-xs mb-1 ${tier.dim ? 'text-ink-500' : 'text-terra-500 font-medium'}`}>{tier.label}</p>
                      <p className={`text-lg font-bold ${tier.dim ? 'text-ink-600' : 'text-terra-600'}`}>{fmt(tier.val)}</p>
                      <p className="text-xs text-ink-400 mt-0.5">NTD / 月</p>
                    </div>
                  ))}
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

      {/* ── Trends ─────────────────────────────────────────── */}
      {tab === 'trends' && (
        <div className="space-y-5">
          <Button variant="outline" onClick={loadTrends} loading={loadingTrends}>🔄 載入最新產業趨勢</Button>
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
                        <div className="flex flex-wrap gap-1">{t.hotJobs.map((j) => <Badge key={j} variant="terra">{j}</Badge>)}</div>
                      </div>
                      <p className="text-xs text-ink-500 leading-relaxed">{t.notes}</p>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          ) : !loadingTrends && (
            <div className="flex flex-col items-center justify-center py-20">
              <p className="text-4xl mb-3">📊</p>
              <p className="text-sm text-ink-500">點擊上方按鈕載入最新台灣產業趨勢</p>
            </div>
          )}
        </div>
      )}

      {/* ── Company Analysis ──────────────────────────────── */}
      {tab === 'company' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {/* Left: input + history */}
            <div className="space-y-4">
              <Card>
                <CardHeader><CardTitle>目標公司分析</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input placeholder="輸入公司名稱，例如：台積電、LINE" value={companyName} onChange={(e) => setCompanyName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && analyzeCompany()} />
                  <Button variant="primary" onClick={analyzeCompany} loading={analyzing} disabled={!companyName.trim()}>
                    🔍 開始分析
                  </Button>
                  {companyError && <p className="text-sm text-red-400">{companyError}</p>}
                </CardContent>
              </Card>

              {savedReports.length > 0 && (
                <Card>
                  <CardHeader><CardTitle>歷史分析</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {savedReports.map((r) => (
                      <button key={r.company + r.savedAt} onClick={() => loadSavedReport(r)}
                        className={`w-full text-left rounded-xl border p-3 transition-all text-sm ${currentReport?.company === r.company ? 'border-terra-300 bg-terra-50' : 'border-warm-200 hover:border-warm-300'}`}>
                        <p className="font-medium text-ink-700">{r.company}</p>
                        <p className="text-xs text-ink-400 mt-0.5">{new Date(r.savedAt).toLocaleDateString('zh-TW')}</p>
                      </button>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: report */}
            <div className="lg:col-span-2">
              {analyzing && (
                <Card>
                  <CardContent className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <svg className="h-8 w-8 animate-spin text-terra-500" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                      <p className="text-sm text-ink-500">AI 正在分析 {companyName} 的公開資料...</p>
                      <p className="text-xs text-ink-400">通常需要 10–30 秒</p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {currentReport && !analyzing && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-ink-800">{currentReport.company}</h2>
                      <p className="text-xs text-ink-400 mt-0.5">
                        {currentReport.hasWebData ? '✓ 含網路搜尋資料' : '基於 AI 知識庫'} · 分析於 {new Date(currentReport.report.analyzedAt).toLocaleDateString('zh-TW')}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={analyzeCompany} loading={analyzing}>重新分析</Button>
                      <Button size="sm" variant="outline" onClick={() => handlePrintReport()}>匯出 PDF</Button>
                    </div>
                  </div>

                  <div ref={reportRef} className="space-y-4 print:p-6">
                    {/* Background */}
                    <Card>
                      <CardHeader><CardTitle>🏢 公司背景</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          {[
                            { label: '成立年份', val: currentReport.report.background.founded },
                            { label: '員工規模', val: currentReport.report.background.size },
                            { label: '總部地點', val: currentReport.report.background.location },
                          ].map((f) => (
                            <div key={f.label} className="rounded-xl bg-cream-100 px-3 py-2">
                              <p className="text-xs text-ink-400">{f.label}</p>
                              <p className="text-sm font-medium text-ink-700 mt-0.5">{f.val || '—'}</p>
                            </div>
                          ))}
                        </div>
                        <p className="text-sm text-ink-600 leading-relaxed">{currentReport.report.background.business}</p>
                      </CardContent>
                    </Card>

                    {/* Business model */}
                    <Card>
                      <CardHeader><CardTitle>💡 商業模式</CardTitle></CardHeader>
                      <CardContent className="space-y-3">
                        {[
                          { label: '收入來源', val: currentReport.report.businessModel.revenue },
                          { label: '目標客群', val: currentReport.report.businessModel.targetCustomers },
                          { label: '核心價值主張', val: currentReport.report.businessModel.valueProposition },
                        ].map((f) => (
                          <div key={f.label}>
                            <p className="text-xs font-medium text-ink-400 mb-0.5">{f.label}</p>
                            <p className="text-sm text-ink-600">{f.val || '—'}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>

                    {/* SWOT */}
                    <Card>
                      <CardHeader><CardTitle>⬡ SWOT 分析</CardTitle></CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {SWOT_CFG.map(({ key, label, color }) => (
                            <div key={key} className={`rounded-xl border p-3 ${color}`}>
                              <p className="text-xs font-semibold mb-2">{label}</p>
                              <ul className="space-y-1">
                                {(currentReport.report.swot[key] ?? []).map((item, i) => (
                                  <li key={i} className="text-xs flex items-start gap-1.5">
                                    <span className="mt-0.5 shrink-0">·</span>{item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Market, Industry, Updates */}
                    {[
                      { icon: '📈', title: '市場 / 產品 / 服務分析', content: currentReport.report.marketAnalysis },
                      { icon: '📰', title: '產業近期趨勢', content: currentReport.report.industryTrends },
                      { icon: '🔔', title: '公司近期動態', content: currentReport.report.companyUpdates },
                    ].map(({ icon, title, content }) => (
                      <Card key={title}>
                        <CardHeader><CardTitle>{icon} {title}</CardTitle></CardHeader>
                        <CardContent><p className="text-sm text-ink-600 leading-relaxed">{content || '—'}</p></CardContent>
                      </Card>
                    ))}

                    {currentReport.report.dataSources?.length > 0 && (
                      <p className="text-xs text-ink-400">資料來源：{currentReport.report.dataSources.join('、')}</p>
                    )}
                  </div>
                </div>
              )}

              {!currentReport && !analyzing && (
                <div className="flex flex-col items-center justify-center py-24">
                  <p className="text-4xl mb-3">🏢</p>
                  <p className="text-sm text-ink-500">輸入公司名稱，AI 產出六大區塊分析報告</p>
                  <p className="text-xs text-ink-400 mt-1">結合 Serper 網路搜尋 + AI 分析</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Analytics ──────────────────────────────────────── */}
      {tab === 'analytics' && (
        <div className="space-y-5">
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
          <Card>
            <CardHeader><CardTitle>應徵漏斗</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {PIPELINE_ROWS.map((row) => (
                <ProgressBar key={row.label} label={row.label} value={(row.count / row.max) * 100} color={row.color} showValue={false} />
              ))}
              <p className="text-xs text-ink-400">數據來自「Job Pipeline」模組的應徵追蹤紀錄</p>
            </CardContent>
          </Card>
          <div className="rounded-2xl border border-terra-100 bg-terra-50 p-5">
            <p className="text-xs font-semibold text-terra-500 mb-2">💡 AI 職涯建議</p>
            <p className="text-sm text-ink-600">根據台灣求職統計，積極求職者每週需投遞 5–10 份履歷，追蹤每個應徵狀態，才能維持良好的面試轉換率。你目前的投遞數略低，建議每日使用 Job Pipeline 搜尋並追蹤新職缺。</p>
            <Link href="/career-match" className="mt-3 inline-block text-sm text-terra-500 hover:text-terra-600 transition-colors">前往 Job Pipeline →</Link>
          </div>
        </div>
      )}
    </div>
  )
}
