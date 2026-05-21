'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

interface Job {
  id: string
  title: string
  company: string
  location: string
  salaryMin?: number
  salaryMax?: number
  description: string
  url?: string
  platform: string
  matchScore?: number
  matchedSkills?: string[]
  missingSkills?: string[]
}

type ApplicationStatus = 'saved' | 'applied' | 'phone_screen' | 'interview' | 'offer' | 'rejected'

interface Application {
  id: string
  jobTitle: string
  company: string
  status: ApplicationStatus
  platform?: string
  appliedAt?: string
}

const statusLabels: Record<ApplicationStatus, string> = {
  saved: '已儲存',
  applied: '已投遞',
  phone_screen: '電話面試',
  interview: '面試中',
  offer: '收到 Offer',
  rejected: '未錄取',
}

const statusColors: Record<ApplicationStatus, 'default' | 'info' | 'warning' | 'success' | 'danger'> = {
  saved: 'default',
  applied: 'info',
  phone_screen: 'info',
  interview: 'warning',
  offer: 'success',
  rejected: 'danger',
}

export default function CareerMatchPage() {
  const [tab, setTab] = useState<'search' | 'track'>('search')
  const [query, setQuery] = useState('')
  const [location, setLocation] = useState('台北市')
  const [jobs, setJobs] = useState<Job[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [applications, setApplications] = useState<Application[]>([])
  const [error, setError] = useState('')

  async function searchJobs() {
    if (!query.trim()) return
    setSearching(true)
    setError('')
    setJobs([])
    setSelectedJob(null)
    try {
      const params = new URLSearchParams({ query, location })
      const res = await fetch(`/api/jobs/search?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? '搜尋失敗')
      setJobs(data.jobs ?? [])
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSearching(false)
    }
  }

  async function analyzeMatch(job: Job) {
    setSelectedJob(job)
    if (job.matchScore !== undefined) return
    setAnalyzing(true)
    try {
      const res = await fetch('/api/jobs/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jdText: job.description }),
      })
      const data = await res.json()
      setJobs((prev) =>
        prev.map((j) =>
          j.id === job.id
            ? { ...j, matchScore: data.matchScore, matchedSkills: data.matchedSkills, missingSkills: data.missingSkills }
            : j
        )
      )
      setSelectedJob((prev) => prev && { ...prev, matchScore: data.matchScore, matchedSkills: data.matchedSkills, missingSkills: data.missingSkills })
    } catch {
      // keep selected job, just no score
    } finally {
      setAnalyzing(false)
    }
  }

  function saveJob(job: Job) {
    const app: Application = {
      id: job.id,
      jobTitle: job.title,
      company: job.company,
      status: 'saved',
      platform: job.platform,
      appliedAt: new Date().toISOString(),
    }
    setApplications((prev) => [...prev.filter((a) => a.id !== app.id), app])
  }

  function updateStatus(id: string, status: ApplicationStatus) {
    setApplications((prev) => prev.map((a) => (a.id === id ? { ...a, status } : a)))
  }

  const scoreColor = (s: number) =>
    s >= 80 ? 'text-green-600' : s >= 60 ? 'text-yellow-600' : 'text-red-600'

  const columns: ApplicationStatus[] = ['saved', 'applied', 'phone_screen', 'interview', 'offer', 'rejected']

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🎯 職缺配對</h1>
        <p className="mt-1 text-sm text-gray-600">搜尋台灣職缺、查看 AI 匹配分析、追蹤應徵進度</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-lg bg-gray-100 p-1 w-fit">
        {(['search', 'track'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {t === 'search' ? `職缺搜尋 ${jobs.length > 0 ? `(${jobs.length})` : ''}` : `求職追蹤 (${applications.length})`}
          </button>
        ))}
      </div>

      {tab === 'search' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-5">
              <div className="flex gap-3">
                <Input
                  placeholder="職位名稱，例如：前端工程師"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && searchJobs()}
                  className="flex-1"
                />
                <Input
                  placeholder="地點"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-32"
                />
                <Button onClick={searchJobs} loading={searching}>
                  搜尋
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
            </CardContent>
          </Card>

          {jobs.length > 0 && (
            <div className="flex gap-4">
              {/* Job list */}
              <div className="w-80 shrink-0 space-y-3">
                {jobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => analyzeMatch(job)}
                    className={`w-full text-left rounded-xl border p-4 transition-all hover:shadow-sm ${
                      selectedJob?.id === job.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-sm font-semibold text-gray-900">{job.title}</p>
                        <p className="text-xs text-gray-500">{job.company}</p>
                      </div>
                      {job.matchScore !== undefined && (
                        <span className={`text-sm font-bold ${scoreColor(job.matchScore)}`}>
                          {job.matchScore}%
                        </span>
                      )}
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline">{job.location}</Badge>
                      <Badge variant="default">{job.platform}</Badge>
                    </div>
                    {job.salaryMin && (
                      <p className="mt-1 text-xs text-green-600">
                        NTD {job.salaryMin.toLocaleString()}~{job.salaryMax?.toLocaleString()} / 月
                      </p>
                    )}
                  </button>
                ))}
              </div>

              {/* Job detail */}
              {selectedJob && (
                <div className="flex-1">
                  <Card>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{selectedJob.title}</CardTitle>
                          <p className="mt-1 text-sm text-gray-600">{selectedJob.company} · {selectedJob.location}</p>
                        </div>
                        <Button size="sm" variant="secondary" onClick={() => saveJob(selectedJob)}>
                          儲存職缺
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {analyzing && (
                        <div className="flex items-center gap-2 text-sm text-blue-600">
                          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          AI 分析匹配度中...
                        </div>
                      )}
                      {selectedJob.matchScore !== undefined && (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="rounded-xl bg-gray-50 p-4 text-center">
                            <div className={`text-4xl font-bold ${scoreColor(selectedJob.matchScore)}`}>
                              {selectedJob.matchScore}%
                            </div>
                            <div className="text-xs text-gray-500 mt-1">匹配度</div>
                          </div>
                          <div className="space-y-2">
                            {selectedJob.matchedSkills && selectedJob.matchedSkills.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-green-600 mb-1">✓ 符合技能</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedJob.matchedSkills.map((s) => (
                                    <Badge key={s} variant="success">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                            {selectedJob.missingSkills && selectedJob.missingSkills.length > 0 && (
                              <div>
                                <p className="text-xs font-medium text-red-600 mb-1">✗ 待補強</p>
                                <div className="flex flex-wrap gap-1">
                                  {selectedJob.missingSkills.map((s) => (
                                    <Badge key={s} variant="danger">{s}</Badge>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-medium text-gray-500 mb-2">職缺描述</p>
                        <p className="whitespace-pre-line text-sm text-gray-700 leading-relaxed">
                          {selectedJob.description}
                        </p>
                      </div>
                      {selectedJob.url && (
                        <a
                          href={selectedJob.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-block text-sm text-blue-600 hover:text-blue-800"
                        >
                          查看原始職缺 →
                        </a>
                      )}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {tab === 'track' && (
        <div className="overflow-x-auto">
          <div className="flex gap-4 min-w-max pb-4">
            {columns.map((status) => (
              <div key={status} className="w-60 shrink-0">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">{statusLabels[status]}</span>
                  <Badge variant={statusColors[status]}>
                    {applications.filter((a) => a.status === status).length}
                  </Badge>
                </div>
                <div className="space-y-2">
                  {applications
                    .filter((a) => a.status === status)
                    .map((app) => (
                      <div key={app.id} className="rounded-xl border border-gray-200 bg-white p-3">
                        <p className="text-sm font-medium text-gray-900">{app.jobTitle}</p>
                        <p className="text-xs text-gray-500">{app.company}</p>
                        {app.platform && <Badge variant="outline" className="mt-2">{app.platform}</Badge>}
                        <div className="mt-2 flex flex-wrap gap-1">
                          {columns
                            .filter((s) => s !== status)
                            .slice(0, 3)
                            .map((s) => (
                              <button
                                key={s}
                                onClick={() => updateStatus(app.id, s)}
                                className="text-xs text-blue-600 hover:text-blue-800"
                              >
                                → {statusLabels[s]}
                              </button>
                            ))}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
          </div>
          {applications.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-sm text-gray-600">尚未儲存任何職缺</p>
              <button onClick={() => setTab('search')} className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                去搜尋職缺 →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
