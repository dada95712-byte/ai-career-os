'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface SalaryData {
  role: string
  industry: string
  experience: string
  median: number
  p25: number
  p75: number
  source: string
  notes: string
}

interface IndustryTrend {
  industry: string
  trend: 'up' | 'stable' | 'down'
  hotJobs: string[]
  notes: string
}

export default function CareerIntelligencePage() {
  const [tab, setTab] = useState<'salary' | 'trends' | 'analytics'>('salary')

  const [salaryRole, setSalaryRole] = useState('')
  const [experience, setExperience] = useState('')
  const [salaryData, setSalaryData] = useState<SalaryData | null>(null)
  const [loadingSalary, setLoadingSalary] = useState(false)

  const [trends, setTrends] = useState<IndustryTrend[]>([])
  const [loadingTrends, setLoadingTrends] = useState(false)

  const activityStats = [
    { label: '總投遞數', value: 0, unit: '筆' },
    { label: '面試邀請', value: 0, unit: '次' },
    { label: '回覆率', value: '0', unit: '%' },
    { label: '平均回覆天數', value: '—', unit: '' },
  ]

  async function querySalary() {
    if (!salaryRole.trim()) return
    setLoadingSalary(true)
    setSalaryData(null)
    try {
      const params = new URLSearchParams({ role: salaryRole, experience })
      const res = await fetch(`/api/salary?${params}`)
      const data = await res.json()
      setSalaryData(data)
    } catch {
      setSalaryData(null)
    } finally {
      setLoadingSalary(false)
    }
  }

  async function loadTrends() {
    setLoadingTrends(true)
    setTrends([])
    try {
      const res = await fetch('/api/trends')
      const data = await res.json()
      setTrends(data.trends ?? [])
    } catch {
      setTrends([])
    } finally {
      setLoadingTrends(false)
    }
  }

  const trendIcon = { up: '📈', stable: '➡️', down: '📉' }
  const trendLabel = { up: '需求上升', stable: '穩定', down: '需求下降' }
  const trendColor = { up: 'success', stable: 'default', down: 'danger' } as const

  const formatNTD = (n: number) =>
    new Intl.NumberFormat('zh-TW', { minimumFractionDigits: 0 }).format(n)

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">📈 職涯情報</h1>
        <p className="mt-1 text-sm text-gray-600">台灣薪資行情查詢、產業趨勢分析與個人求職儀表板</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['salary', 'trends', 'analytics'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'salary' ? '薪資查詢' : t === 'trends' ? '產業趨勢' : '我的儀表板'}
          </button>
        ))}
      </div>

      {tab === 'salary' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>薪資行情查詢</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Input
                  label="職位"
                  placeholder="例如：軟體工程師、產品經理"
                  value={salaryRole}
                  onChange={(e) => setSalaryRole(e.target.value)}
                  className="flex-1"
                />
                <Input
                  label="年資"
                  placeholder="例如：3 年、應屆"
                  value={experience}
                  onChange={(e) => setExperience(e.target.value)}
                  className="w-40"
                />
              </div>
              <Button onClick={querySalary} loading={loadingSalary} disabled={!salaryRole.trim()}>
                🔍 查詢薪資
              </Button>
            </CardContent>
          </Card>

          {salaryData && (
            <Card>
              <CardHeader>
                <CardTitle>{salaryData.role} — 台灣薪資行情</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500 mb-1">P25 低標</div>
                    <div className="text-xl font-bold text-gray-700">
                      {formatNTD(salaryData.p25)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">NTD / 月</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-4 ring-2 ring-blue-200">
                    <div className="text-xs text-blue-600 mb-1 font-medium">中位數</div>
                    <div className="text-2xl font-bold text-blue-700">
                      {formatNTD(salaryData.median)}
                    </div>
                    <div className="text-xs text-blue-400 mt-1">NTD / 月</div>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-4">
                    <div className="text-xs text-gray-500 mb-1">P75 高標</div>
                    <div className="text-xl font-bold text-gray-700">
                      {formatNTD(salaryData.p75)}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">NTD / 月</div>
                  </div>
                </div>

                {/* Salary bar visual */}
                <div>
                  <div className="relative h-4 rounded-full bg-gray-200">
                    <div
                      className="absolute h-4 rounded-full bg-gradient-to-r from-blue-300 to-blue-600"
                      style={{ left: '15%', right: '15%' }}
                    />
                    <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-blue-700 border-2 border-white shadow"
                      style={{ left: '45%' }} />
                  </div>
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>低</span>
                    <span>市場行情區間</span>
                    <span>高</span>
                  </div>
                </div>

                <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-4">
                  <p className="text-sm font-medium text-yellow-800 mb-1">AI 說明</p>
                  <p className="text-sm text-yellow-700">{salaryData.notes}</p>
                </div>
                <p className="text-xs text-gray-400">資料來源：{salaryData.source}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'trends' && (
        <div className="space-y-4">
          <Button onClick={loadTrends} loading={loadingTrends} variant="outline">
            🔄 載入最新產業趨勢
          </Button>

          {trends.length > 0 && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {trends.map((t, i) => (
                <Card key={i}>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-900">{t.industry}</h3>
                      <div className="flex items-center gap-1">
                        <span>{trendIcon[t.trend]}</span>
                        <Badge variant={trendColor[t.trend]}>{trendLabel[t.trend]}</Badge>
                      </div>
                    </div>
                    <div className="mb-3">
                      <p className="text-xs font-medium text-gray-500 mb-1">熱門職缺</p>
                      <div className="flex flex-wrap gap-1">
                        {t.hotJobs.map((j) => (
                          <Badge key={j} variant="info">{j}</Badge>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-600">{t.notes}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {trends.length === 0 && !loadingTrends && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center">
              <div className="text-3xl mb-3">📊</div>
              <p className="text-sm text-gray-600">點擊上方按鈕載入最新台灣產業趨勢分析</p>
            </div>
          )}
        </div>
      )}

      {tab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {activityStats.map((s) => (
              <Card key={s.label}>
                <CardContent className="py-5 text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {s.value}
                    <span className="text-sm text-gray-500">{s.unit}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>求職進度追蹤</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { label: '已儲存', count: 0, color: 'bg-gray-200' },
                  { label: '已投遞', count: 0, color: 'bg-blue-400' },
                  { label: '面試邀請', count: 0, color: 'bg-yellow-400' },
                  { label: '收到 Offer', count: 0, color: 'bg-green-500' },
                ].map((row) => (
                  <div key={row.label} className="flex items-center gap-3">
                    <div className="w-20 text-sm text-gray-600 text-right">{row.label}</div>
                    <div className="flex-1 h-6 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${row.color} transition-all`}
                        style={{ width: `${Math.min(row.count * 10, 100)}%` }}
                      />
                    </div>
                    <div className="w-6 text-sm font-medium text-gray-700">{row.count}</div>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-gray-400">
                使用「職缺配對」模組追蹤你的應徵進度後，數據將顯示於此。
              </p>
            </CardContent>
          </Card>

          <div className="rounded-xl border border-blue-100 bg-blue-50 p-5">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">💡 職涯建議</h3>
            <p className="text-sm text-blue-700">
              根據台灣求職平均統計，積極求職者一週需投遞 5–10 份履歷，並追蹤每一個應徵狀態，才能維持良好的面試轉換率。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
