'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ProgressRing } from '@/components/ui/progress-ring'

interface Job { id: string; title: string; company: string; location: string; salaryMin?: number; salaryMax?: number; description: string; url?: string; platform: string; matchScore?: number; matchedSkills?: string[]; missingSkills?: string[] }

type AppStatus = 'saved' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'
interface Application { id: string; jobTitle: string; company: string; status: AppStatus; platform?: string }

const STATUS: Record<AppStatus, { label: string; color: string; dot: string; badge: 'default' | 'info' | 'warning' | 'success' | 'danger' }> = {
  saved:        { label: '已儲存',   color: 'text-ink-400', dot: 'bg-zinc-600', badge: 'default' },
  applied:      { label: '已投遞',   color: 'text-sky-400',  dot: 'bg-sky-500',  badge: 'info' },
  phone_screen: { label: '電話面試', color: 'text-honey-500',dot: 'bg-honey-500',badge: 'warning' },
  interview:    { label: '面試中',   color: 'text-violet-400',dot: 'bg-violet-500',badge: 'info' },
  offer:        { label: 'Offer',    color: 'text-sage-600',dot: 'bg-sage-500',badge: 'success' },
  rejected:     { label: '未錄取',  color: 'text-red-400', dot: 'bg-red-500',   badge: 'danger' },
}
const COLS: AppStatus[] = ['saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected']

export default function CareerMatchPage() {
  const [tab, setTab] = useState<'search' | 'track'>('search')
  const [query, setQuery] = useState(''); const [location, setLocation] = useState('台北市')
  const [jobs, setJobs] = useState<Job[]>([]); const [searching, setSearching] = useState(false)
  const [selected, setSelected] = useState<Job | null>(null); const [analyzing, setAnalyzing] = useState(false)
  const [apps, setApps] = useState<Application[]>([]); const [error, setError] = useState('')

  async function search() {
    if (!query.trim()) return
    setSearching(true); setError(''); setJobs([]); setSelected(null)
    try {
      const res = await fetch(`/api/jobs/search?${new URLSearchParams({ query, location })}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '搜尋失敗')
      setJobs(data.jobs ?? [])
    } catch (e) { setError((e as Error).message) }
    finally { setSearching(false) }
  }

  async function analyze(job: Job) {
    setSelected(job)
    if (job.matchScore !== undefined) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/jobs/match', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jdText: job.description }) })
      const d = await res.json()
      setJobs((p) => p.map((j) => j.id === job.id ? { ...j, ...d } : j))
      setSelected((p) => p && { ...p, ...d })
    } catch { /* silent */ }
    finally { setAnalyzing(false) }
  }

  function saveJob(job: Job) {
    setApps((p) => [...p.filter((a) => a.id !== job.id), { id: job.id, jobTitle: job.title, company: job.company, status: 'saved', platform: job.platform }])
  }

  function updateStatus(id: string, status: AppStatus) {
    setApps((p) => p.map((a) => a.id === id ? { ...a, status } : a))
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-ink-900">◎ Job Pipeline</h1>
        <p className="mt-1 text-sm text-ink-500">AI 職缺匹配 · 台灣職缺整合 · 應徵狀態追蹤</p>
      </div>

      <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit shadow-[var(--shadow-warm-xs)]">
        {(['search', 'track'] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium transition-all duration-150 ${tab === t ? 'bg-cream-200 text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-600'}`}>
            {t === 'search' ? `◎ 搜尋職缺${jobs.length ? ` (${jobs.length})` : ''}` : `⬡ 應徵看板 (${apps.length})`}
          </button>
        ))}
      </div>

      {/* ── Search Tab ──────────────────────────────────────── */}
      {tab === 'search' && (
        <div className="space-y-5">
          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <Input placeholder="職位名稱，例如：前端工程師" value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && search()} className="flex-1" />
                <Input placeholder="地點" value={location} onChange={(e) => setLocation(e.target.value)} className="w-28" />
                <Button onClick={search} loading={searching}>搜尋</Button>
              </div>
              {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
            </CardContent>
          </Card>

          {jobs.length > 0 && (
            <div className="flex gap-5">
              {/* Job list */}
              <div className="w-72 shrink-0 space-y-2 overflow-y-auto max-h-[70vh]">
                {jobs.map((job) => (
                  <button key={job.id} onClick={() => analyze(job)}
                    className={`w-full text-left rounded-2xl border p-4 transition-all duration-150 hover:border-warm-300 ${
                      selected?.id === job.id ? 'border-terra-400 bg-terra-50' : 'border-warm-200 bg-white hover:bg-cream-100'
                    }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink-700 truncate">{job.title}</p>
                        <p className="text-xs text-ink-500 truncate">{job.company}</p>
                      </div>
                      {job.matchScore !== undefined && (
                        <span className={`shrink-0 text-sm font-bold ${job.matchScore >= 70 ? 'text-sage-600' : job.matchScore >= 50 ? 'text-honey-500' : 'text-red-400'}`}>
                          {job.matchScore}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{job.location}</Badge>
                      <Badge variant="default">{job.platform}</Badge>
                    </div>
                    {job.salaryMin && (
                      <p className="mt-1.5 text-xs text-sage-600">
                        NTD {job.salaryMin.toLocaleString()}~{job.salaryMax?.toLocaleString()}
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Job detail */}
              {selected && (
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">{selected.title}</CardTitle>
                          <p className="text-sm text-ink-500 mt-1">{selected.company} · {selected.location}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => saveJob(selected)}>+ 儲存</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {analyzing && (
                        <div className="flex items-center gap-2 text-sm text-terra-500">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                          </svg>
                          AI 分析匹配度中...
                        </div>
                      )}
                      {selected.matchScore !== undefined && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col items-center justify-center rounded-2xl bg-cream-100 p-5">
                            <ProgressRing score={selected.matchScore} size={90} strokeWidth={7} animate />
                            <p className="text-xs text-ink-500 mt-2">匹配度</p>
                          </div>
                          <div className="space-y-3">
                            {selected.matchedSkills && selected.matchedSkills.length > 0 && (
                              <div>
                                <p className="text-xs text-sage-600 mb-1.5">✓ 符合技能</p>
                                <div className="flex flex-wrap gap-1">{selected.matchedSkills.map((s) => <Badge key={s} variant="success">{s}</Badge>)}</div>
                              </div>
                            )}
                            {selected.missingSkills && selected.missingSkills.length > 0 && (
                              <div>
                                <p className="text-xs text-red-400 mb-1.5">✗ 待補強</p>
                                <div className="flex flex-wrap gap-1">{selected.missingSkills.map((s) => <Badge key={s} variant="danger">{s}</Badge>)}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs text-ink-400 mb-2">職缺描述</p>
                        <p className="whitespace-pre-line text-sm text-ink-400 leading-relaxed">{selected.description}</p>
                      </div>
                      {selected.url && (
                        <a href={selected.url} target="_blank" rel="noopener noreferrer" className="text-sm text-terra-500 hover:text-terra-600 transition-colors">
                          查看原始職缺 →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}

          {jobs.length === 0 && !searching && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="mb-3 text-4xl">◎</div>
              <p className="text-sm text-ink-500">輸入職位關鍵字開始搜尋台灣職缺</p>
            </div>
          )}
        </div>
      )}

      {/* ── Track Tab (Kanban) ───────────────────────────────── */}
      {tab === 'track' && (
        <div>
          {apps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24">
              <div className="mb-3 text-4xl">⬡</div>
              <p className="text-sm text-ink-500">尚未儲存任何職缺</p>
              <button onClick={() => setTab('search')} className="mt-2 text-sm text-terra-500 hover:text-terra-600">
                搜尋職缺 →
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto pb-4">
              <div className="flex gap-3 min-w-max">
                {COLS.map((col) => {
                  const cfg = STATUS[col]; const colApps = apps.filter((a) => a.status === col)
                  return (
                    <div key={col} className="w-56 shrink-0">
                      <div className="mb-3 flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
                        <span className="text-xs font-semibold text-ink-400">{cfg.label}</span>
                        <span className="ml-auto text-xs text-ink-400">{colApps.length}</span>
                      </div>
                      <div className="space-y-2">
                        {colApps.map((app) => (
                          <div key={app.id} className="rounded-xl border border-warm-200 bg-white p-3">
                            <p className="text-sm font-medium text-ink-700">{app.jobTitle}</p>
                            <p className="text-xs text-ink-500">{app.company}</p>
                            {app.platform && <Badge variant="outline" className="mt-2 text-[10px]">{app.platform}</Badge>}
                            <div className="mt-3 flex flex-wrap gap-1">
                              {COLS.filter((s) => s !== col).slice(0, 2).map((s) => (
                                <button key={s} onClick={() => updateStatus(app.id, s)}
                                  className="text-[10px] text-ink-400 hover:text-terra-500 transition-colors">
                                  → {STATUS[s].label}
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                        {colApps.length === 0 && (
                          <div className="rounded-xl border border-dashed border-warm-200 py-6 text-center">
                            <p className="text-xs text-ink-700">空</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
