'use client'

import { useState, useEffect } from 'react'
import { PageTooltip } from '@/components/onboarding/page-tooltip'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressBar } from '@/components/ui/progress-ring'
import Link from 'next/link'

interface SalaryData { role: string; industry: string; experience: string; median: number; p25: number; p75: number; source: string; notes: string }
interface Trend { industry: string; trend: 'up' | 'stable' | 'down'; hotJobs: string[]; notes: string }
interface DeepReport {
  basicInfo: string
  culture: string
  rolePosition: string
  interviewProcess: string
  salaryNegotiation: string
  competitors: string[]
  roleTrend?: { recruitmentHeat: string; topSkills: string[]; threeMonthTrend: string }
}

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
  { label: '已投遞',    count: 4, max: 10, color: 'bg-sky-500' },
  { label: '面試邀請',  count: 1, max: 10, color: 'bg-violet-500' },
  { label: '技術面試',  count: 0, max: 10, color: 'bg-honey-500' },
  { label: '收到 Offer', count: 0, max: 10, color: 'bg-sage-500' },
]

const INDUSTRIES = ['科技業', '金融業', '電商/零售業', '製造業', '醫療/生技', '媒體/廣告', '顧問/服務業', '教育', '政府/非營利', '其他']

function Skel({ lines = 3 }: { lines?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-3 bg-warm-200 rounded ${i === 0 ? 'w-full' : i % 2 === 0 ? 'w-4/5' : 'w-3/5'}`} />
      ))}
    </div>
  )
}

export default function CareerIntelligencePage() {
  const [tab, setTab] = useState<'salary' | 'trends' | 'analytics' | 'company'>('salary')

  // Salary tab
  const [salaryRole, setSalaryRole] = useState('')
  const [experience, setExperience] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [loadingSalary, setLoadingSalary] = useState(false)

  // Trends tab
  const [trends, setTrends] = useState<Trend[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)

  // Company tab — tracker origin
  const [trackerJobId, setTrackerJobId] = useState('')
  const [trackerCompany, setTrackerCompany] = useState('')
  const [trackerTitle, setTrackerTitle] = useState('')
  const [trackerIndustry, setTrackerIndustry] = useState('')

  // Company tab — Block A (salary)
  const [trackerSalary, setTrackerSalary] = useState<SalaryData | null>(null)
  const [trackerSalaryLoading, setTrackerSalaryLoading] = useState(false)

  // Company tab — Blocks B+C (deep analysis)
  const [deepReport, setDeepReport] = useState<DeepReport | null>(null)
  const [deepReportLoading, setDeepReportLoading] = useState(false)
  const [deepReportError, setDeepReportError] = useState('')

  // Company tab — manual entry form
  const [formCompany, setFormCompany] = useState('')
  const [formTitle, setFormTitle] = useState('')
  const [formIndustry, setFormIndustry] = useState('')

  const fmt = (n: number) => new Intl.NumberFormat('zh-TW').format(n)

  // ── Functions ──────────────────────────────────────────────────────────────

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

  async function loadTrackerSalary(role: string) {
    setTrackerSalaryLoading(true); setTrackerSalary(null)
    try {
      const res = await fetch(`/api/salary?${new URLSearchParams({ role, experience: '不限' })}`)
      setTrackerSalary(await res.json())
    } catch { /* silent */ }
    finally { setTrackerSalaryLoading(false) }
  }

  async function loadDeepReport(company: string, title: string, jdContent: string) {
    setDeepReportLoading(true); setDeepReport(null); setDeepReportError('')
    try {
      const res = await fetch('/api/analytics/company-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, title, jd_content: jdContent }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '分析失敗')
      setDeepReport(data)
    } catch (e) { setDeepReportError((e as Error).message) }
    finally { setDeepReportLoading(false) }
  }

  function clearTrackerLink() {
    setTrackerCompany(''); setTrackerJobId(''); setTrackerTitle(''); setTrackerIndustry('')
    setTrackerSalary(null); setDeepReport(null); setDeepReportError('')
    if (typeof window !== 'undefined') window.history.replaceState({}, '', '/career-intelligence')
  }

  function startManualAnalysis() {
    if (!formCompany.trim()) return
    setTrackerCompany(formCompany); setTrackerTitle(formTitle)
    setTrackerIndustry(formIndustry); setTrackerJobId('')
    if (formTitle) loadTrackerSalary(formTitle)
    loadDeepReport(formCompany, formTitle, '')
  }

  // URL params — auto-switch tab and trigger analysis
  useEffect(() => {
    if (typeof window === 'undefined') return
    const p = new URLSearchParams(window.location.search)
    const company = p.get('company') ?? ''
    if (!company) return
    const jobId   = p.get('jobId')   ?? ''
    const title   = p.get('title')   ?? ''
    const industry = p.get('industry') ?? ''
    setTrackerCompany(company); setTrackerJobId(jobId)
    setTrackerTitle(title); setTrackerIndustry(industry)
    setTab('company')
    if (title) loadTrackerSalary(title)
    loadDeepReport(company, title, '')
  }, [])

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      <PageTooltip pageKey="analytics" />
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">◉ Analytics</h1>
        <p className="mt-1 text-sm text-ink-500">薪資行情 · 產業趨勢 · 公司分析 · 求職儀表板</p>
      </div>

      {/* Tab bar */}
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

      {/* ── Salary ─────────────────────────────────────────────────────────── */}
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
                    { label: 'P25 低標', val: salaryData.p25,    dim: true  },
                    { label: '中位數',   val: salaryData.median, dim: false },
                    { label: 'P75 高標', val: salaryData.p75,    dim: true  },
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

      {/* ── Trends ─────────────────────────────────────────────────────────── */}
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

      {/* ── Company Analysis ────────────────────────────────────────────────── */}
      {tab === 'company' && (
        <div className="space-y-4">
          {trackerCompany ? (
            <>
              {/* Sage banner — only when navigated from tracker */}
              {trackerJobId && (
                <div className="flex items-center gap-3 rounded-xl border border-sage-200 bg-sage-50 px-4 py-3">
                  <span className="text-sm text-sage-700">
                    📋 來自 Application Tracker：<strong>{trackerCompany}</strong>
                    {trackerTitle && ` — ${trackerTitle}`}
                  </span>
                  <button onClick={clearTrackerLink}
                    className="ml-auto shrink-0 text-xs text-ink-400 hover:text-ink-600 transition-colors">
                    ✕ 清除
                  </button>
                </div>
              )}

              {/* Company header */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <div className="rounded-xl bg-terra-50 border border-terra-100 px-4 py-2">
                    <p className="text-xs text-ink-400">公司</p>
                    <p className="font-semibold text-ink-800">{trackerCompany}</p>
                  </div>
                  {trackerTitle && (
                    <div className="rounded-xl bg-cream-100 border border-warm-200 px-4 py-2">
                      <p className="text-xs text-ink-400">職位</p>
                      <p className="font-medium text-ink-700">{trackerTitle}</p>
                    </div>
                  )}
                  {trackerIndustry && (
                    <div className="rounded-xl bg-cream-100 border border-warm-200 px-4 py-2">
                      <p className="text-xs text-ink-400">產業</p>
                      <p className="font-medium text-ink-700">{trackerIndustry}</p>
                    </div>
                  )}
                </div>
                <button onClick={clearTrackerLink}
                  className="shrink-0 text-xs text-ink-400 hover:text-terra-500 transition-colors">
                  重新搜尋
                </button>
              </div>

              {/* Block A: 薪資行情 */}
              <Card>
                <CardHeader><CardTitle>💰 薪資行情</CardTitle></CardHeader>
                <CardContent>
                  {trackerSalaryLoading && <Skel lines={5} />}
                  {!trackerSalaryLoading && trackerSalary && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: 'P25 低標', val: trackerSalary.p25,    dim: true  },
                          { label: '中位數',   val: trackerSalary.median, dim: false },
                          { label: 'P75 高標', val: trackerSalary.p75,    dim: true  },
                        ].map((tier) => (
                          <div key={tier.label} className={`rounded-2xl p-4 text-center ${tier.dim ? 'bg-cream-100' : 'bg-terra-50 border border-terra-400/30'}`}>
                            <p className={`text-xs mb-1 ${tier.dim ? 'text-ink-500' : 'text-terra-500 font-medium'}`}>{tier.label}</p>
                            <p className={`text-lg font-bold ${tier.dim ? 'text-ink-600' : 'text-terra-600'}`}>{fmt(tier.val)}</p>
                            <p className="text-xs text-ink-400 mt-0.5">NTD / 月</p>
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="rounded-xl bg-cream-100 px-3 py-2">
                          <p className="text-xs text-ink-400">年薪估算（月薪×14）</p>
                          <p className="text-sm font-semibold text-ink-700">{fmt(trackerSalary.median * 14)} NTD</p>
                        </div>
                        <div className="rounded-xl bg-cream-100 px-3 py-2">
                          <p className="text-xs text-ink-400">產業別</p>
                          <p className="text-sm font-medium text-ink-700">{trackerSalary.industry || trackerIndustry || '—'}</p>
                        </div>
                      </div>
                      {trackerSalary.notes && (
                        <p className="text-xs text-ink-500 leading-relaxed">{trackerSalary.notes}</p>
                      )}
                    </div>
                  )}
                  {!trackerSalaryLoading && !trackerSalary && (
                    <p className="text-sm text-ink-400">
                      {trackerTitle ? '薪資查詢失敗，請稍後再試' : '未提供職位名稱，無法查詢薪資行情'}
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Block B: 產業趨勢 */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>📊 產業趨勢</CardTitle>
                    <span className="rounded-full border border-honey-200 bg-honey-50 px-2 py-0.5 text-xs text-honey-600">AI 分析，僅供參考</span>
                  </div>
                </CardHeader>
                <CardContent>
                  {deepReportLoading && <Skel lines={5} />}
                  {!deepReportLoading && deepReport?.roleTrend && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-ink-500">招募熱度：</span>
                        <Badge variant={
                          deepReport.roleTrend.recruitmentHeat === '高' ? 'success' :
                          deepReport.roleTrend.recruitmentHeat === '低' ? 'danger' : 'default'
                        }>
                          {deepReport.roleTrend.recruitmentHeat}
                        </Badge>
                      </div>
                      {(deepReport.roleTrend.topSkills?.length ?? 0) > 0 && (
                        <div>
                          <p className="text-xs text-ink-400 mb-1.5">熱門技能（Top 5）</p>
                          <div className="flex flex-wrap gap-1.5">
                            {deepReport.roleTrend.topSkills.map((s) => <Badge key={s} variant="terra">{s}</Badge>)}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-ink-400 mb-1">近 3 個月趨勢</p>
                        <p className="text-sm text-ink-600 leading-relaxed">{deepReport.roleTrend.threeMonthTrend}</p>
                      </div>
                    </div>
                  )}
                  {!deepReportLoading && deepReport && !deepReport.roleTrend && (
                    <p className="text-sm text-ink-400">無趨勢資料</p>
                  )}
                </CardContent>
              </Card>

              {/* Block C: 公司深度分析 */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-ink-800">🏢 公司深度分析</h3>
                  {!deepReportLoading && deepReport && (
                    <span className="text-xs text-ink-400">標注「需自行確認」之資訊請自行查證</span>
                  )}
                </div>

                {deepReportLoading && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i}><CardContent className="pt-5"><Skel lines={4} /></CardContent></Card>
                    ))}
                  </div>
                )}

                {deepReportError && (
                  <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
                    <p className="text-sm text-red-500">{deepReportError}</p>
                    <button onClick={() => loadDeepReport(trackerCompany, trackerTitle, '')}
                      className="ml-auto shrink-0 text-xs text-terra-500 hover:underline">重試</button>
                  </div>
                )}

                {deepReport && !deepReportLoading && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {([
                      { icon: '🏢', title: '基本資訊',  key: 'basicInfo'         },
                      { icon: '🎭', title: '企業文化',  key: 'culture'           },
                      { icon: '🎯', title: '職位定位',  key: 'rolePosition'      },
                      { icon: '📝', title: '面試情報',  key: 'interviewProcess'  },
                      { icon: '💰', title: '談薪建議',  key: 'salaryNegotiation' },
                    ] as { icon: string; title: string; key: keyof DeepReport }[]).map(({ icon, title, key }) => (
                      <Card key={key}>
                        <CardHeader><CardTitle>{icon} {title}</CardTitle></CardHeader>
                        <CardContent>
                          <p className="text-sm text-ink-600 leading-relaxed whitespace-pre-line">
                            {String(deepReport[key] ?? '—')}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                    {(deepReport.competitors?.length ?? 0) > 0 && (
                      <Card>
                        <CardHeader><CardTitle>🏆 主要競爭對手</CardTitle></CardHeader>
                        <CardContent>
                          <div className="flex flex-wrap gap-2">
                            {deepReport.competitors.map((c) => (
                              <button key={c}
                                onClick={() => {
                                  setTrackerSalary(null); setDeepReport(null); setDeepReportError('')
                                  setTrackerCompany(c); setTrackerTitle(''); setTrackerIndustry(''); setTrackerJobId('')
                                  loadDeepReport(c, '', '')
                                }}
                                className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-sm text-ink-700 hover:border-terra-300 hover:bg-terra-50 transition-all">
                                {c} →
                              </button>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Manual entry form */
            <div className="max-w-lg space-y-5">
              <Card>
                <CardHeader><CardTitle>開始分析目標公司</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <Input
                    label="公司名稱 *"
                    placeholder="例如：台積電、LINE Taiwan、Shopee"
                    value={formCompany}
                    onChange={(e) => setFormCompany(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && startManualAnalysis()}
                  />
                  <Input
                    label="應徵職位（選填）"
                    placeholder="例如：軟體工程師、產品經理"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                  />
                  <div>
                    <label className="block text-xs font-medium text-ink-500 mb-1.5">產業別（選填）</label>
                    <select
                      className="w-full rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900 focus:border-terra-400 focus:outline-none"
                      value={formIndustry}
                      onChange={(e) => setFormIndustry(e.target.value)}>
                      <option value="">請選擇（可略）</option>
                      {INDUSTRIES.map((ind) => <option key={ind} value={ind}>{ind}</option>)}
                    </select>
                  </div>
                  <Button variant="primary" onClick={startManualAnalysis} loading={deepReportLoading} disabled={!formCompany.trim()}>
                    🔍 開始分析
                  </Button>
                </CardContent>
              </Card>
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <p className="text-4xl mb-3">🏢</p>
                <p className="text-sm text-ink-500">AI 提供薪資行情、產業趨勢、企業文化、面試情報、談薪建議</p>
                <p className="text-xs text-ink-400 mt-1">也可從 Application Tracker「面試準備」Tab 直接連動</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Analytics (dashboard) ───────────────────────────────────────────── */}
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
