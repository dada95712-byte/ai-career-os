'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'

// ── Types ──────────────────────────────────────────────────────────────────────

interface MoodEntry { date: string; mood: string }
interface DayPoint  { mood: string | null; dayLabel: string }

// ── Constants ──────────────────────────────────────────────────────────────────

const MOODS = [
  { key: 'energetic',  emoji: '😊', label: '充滿幹勁', score: 5 },
  { key: 'neutral',    emoji: '😐', label: '普通',     score: 3 },
  { key: 'sad',        emoji: '😔', label: '有點沮喪', score: 2 },
  { key: 'frustrated', emoji: '😤', label: '很挫折',   score: 2 },
  { key: 'tired',      emoji: '😴', label: '疲憊',     score: 1 },
]
const MOOD_SCORE: Record<string, number> = Object.fromEntries(MOODS.map(m => [m.key, m.score]))
const NEGATIVE_MOODS = new Set(['sad', 'frustrated', 'tired'])

const STATUS_CFG: Record<string, { label: string; dot: string; textColor: string }> = {
  saved:        { label: '已儲存',   dot: 'bg-warm-300',  textColor: 'text-ink-400' },
  applied:      { label: '已投遞',   dot: 'bg-sage-400',  textColor: 'text-sage-600' },
  hr_screen:    { label: '人資初篩', dot: 'bg-honey-400', textColor: 'text-honey-500' },
  phone_screen: { label: '電話面試', dot: 'bg-honey-400', textColor: 'text-honey-500' },
  interview:    { label: '面試中',   dot: 'bg-terra-400', textColor: 'text-terra-600' },
  offer:        { label: 'Offer ✓', dot: 'bg-sage-500',  textColor: 'text-sage-700' },
}

const PIPELINE_ITEMS = [
  { company: 'LINE Taiwan', role: '前端工程師',    status: 'interview',   daysAgo: 0 },
  { company: '台積電',       role: '軟體工程師',    status: 'applied',     daysAgo: 3 },
  { company: 'Shopee',      role: 'Frontend Lead', status: 'saved',       daysAgo: 1 },
]

const TODAY_TASKS = [
  { id: 'resume',   label: '上傳或完善履歷',  time: '5 分鐘',  desc: 'AI 評分，找出改善方向', href: '/career-profile' },
  { id: 'skills',   label: '更新技能庫',      time: '3 分鐘',  desc: '比對職缺，找出技能落差', href: '/dashboard/skills' },
  { id: 'practice', label: '練習一道面試題',  time: '10 分鐘', desc: 'AI 即時回饋，提升表達力', href: '/interview-prep' },
]

const SCORE_BREAKDOWN = [
  { label: '履歷',     value: 0,  max: 30, color: '#C97941', note: '尚未上傳',   href: '/career-profile' },
  { label: '技能庫',   value: 10, max: 20, color: '#7FA887', note: '10 項技能',  href: '/dashboard/skills' },
  { label: '職缺追蹤', value: 15, max: 25, color: '#D4A25A', note: '4 筆記錄',   href: '/career-match' },
  { label: '面試練習', value: 0,  max: 25, color: '#B8A090', note: '0 道練習',   href: '/interview-prep' },
]

const QUICK_LINKS = [
  { label: '上傳履歷', href: '/career-profile',  symbol: '↑',  bg: '#FBF2EA', border: '#EDD9C8', color: '#C97941' },
  { label: '技能落差', href: '/career-growth',   symbol: '⚡', bg: '#FBF7ED', border: '#EDE3C8', color: '#B8922A' },
  { label: '面試練習', href: '/interview-prep',  symbol: '🎤', bg: '#F2F7F3', border: '#D0E3D2', color: '#5E8F68' },
  { label: '新增職缺', href: '/career-match',    symbol: '＋', bg: '#F3ECE4', border: '#E6DDD2', color: '#8B7B70' },
]

// ── Card Wrapper ───────────────────────────────────────────────────────────────
function Pane({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl p-5 ${className}`}
      style={{ background: '#FFFDFC', border: '1px solid #E6DDD2', boxShadow: '0 1px 4px rgba(100,70,40,0.06)' }}>
      {children}
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-4" style={{ color: '#C4B0A2' }}>
      {children}
    </p>
  )
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ score, size = 72 }: { score: number; size?: number }) {
  const r     = (size - 10) / 2
  const circ  = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(score, 100) / 100)
  const clr   = score >= 70 ? '#7FA887' : score >= 40 ? '#C97941' : '#D4905A'
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#EDE5DB" strokeWidth="5" />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={clr} strokeWidth="5"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.7s ease' }} />
    </svg>
  )
}

// ── Mood Sparkline ─────────────────────────────────────────────────────────────
function MoodSparkline({ days }: { days: DayPoint[] }) {
  const COL = 30
  const H   = 36
  const PAD = 5

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
    <svg width={days.length * COL} height={H + 16} style={{ overflow: 'visible' }}>
      {valid.length > 1 && (
        <polyline points={line} fill="none" stroke="#C97941" strokeWidth="1.5"
          strokeLinecap="round" strokeLinejoin="round" opacity="0.35" />
      )}
      {pts.map((p, i) => (
        <g key={i}>
          {p.y !== null ? (
            <circle cx={p.x} cy={p.y} r="3.5"
              fill={NEGATIVE_MOODS.has(p.mood!) ? '#D48070' : '#8FBA97'} />
          ) : (
            <circle cx={p.x} cy={H / 2} r="2" fill="#E6DDD2" />
          )}
          <text x={p.x} y={H + 13} textAnchor="middle" fontSize="8" fill="#C4B8B2">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ── Checkbox ───────────────────────────────────────────────────────────────────
function Checkbox({ done, onToggle }: { done: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="h-4 w-4 shrink-0 rounded-full flex items-center justify-center transition-all mt-0.5"
      style={{
        border: `1.5px solid ${done ? '#C97941' : '#D4C4B8'}`,
        background: done ? '#C97941' : 'transparent',
      }}>
      {done && (
        <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24"
          stroke="white" strokeWidth={3}>
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </button>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function DashboardClient({ name }: { name: string }) {
  const [moodLogs,   setMoodLogs]   = useState<MoodEntry[]>([])
  const [todayMood,  setTodayMood]  = useState<string | null>(null)
  const [doneTaskIds, setDoneTaskIds] = useState<Set<string>>(new Set())

  const todayKey = new Date().toISOString().split('T')[0]

  useEffect(() => {
    try {
      const raw = localStorage.getItem('career-mood-logs')
      if (raw) {
        const logs: MoodEntry[] = JSON.parse(raw)
        setMoodLogs(logs)
        const t = logs.find(l => l.date === todayKey)
        if (t) setTodayMood(t.mood)
      }
    } catch { /* ignore */ }
    try {
      const rawDone = localStorage.getItem(`dashboard-done-${todayKey}`)
      if (rawDone) setDoneTaskIds(new Set(JSON.parse(rawDone)))
    } catch { /* ignore */ }
  }, [todayKey])

  function recordMood(mood: string) {
    const updated = [...moodLogs.filter(l => l.date !== todayKey), { date: todayKey, mood }]
      .sort((a, b) => a.date.localeCompare(b.date)).slice(-30)
    setMoodLogs(updated); setTodayMood(mood)
    localStorage.setItem('career-mood-logs', JSON.stringify(updated))
  }

  function toggleTask(id: string) {
    setDoneTaskIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      localStorage.setItem(`dashboard-done-${todayKey}`, JSON.stringify([...next]))
      return next
    })
  }

  const last7Days: DayPoint[] = useMemo(() => Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dateStr  = d.toISOString().split('T')[0]
    const entry    = moodLogs.find(l => l.date === dateStr)
    const dayLabel = d.toLocaleDateString('zh-TW', { weekday: 'short' }).replace('週', '')
    return { mood: entry?.mood ?? null, dayLabel }
  }), [moodLogs])

  const showEncouragement = last7Days.slice(-3).map(d => d.mood)
    .every(m => m !== null && NEGATIVE_MOODS.has(m))

  const totalScore    = SCORE_BREAKDOWN.reduce((s, b) => s + b.value, 0)
  const completedCount = doneTaskIds.size
  const totalTasks    = TODAY_TASKS.length

  const hour     = new Date().getHours()
  const greeting = hour < 5 ? '深夜好' : hour < 12 ? '早安' : hour < 18 ? '午安' : '晚安'
  const dateLabel = new Date().toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'long' })

  const nextStepText = totalScore < 10
    ? '先上傳一份履歷，AI 會給你具體的改善建議'
    : totalScore < 40 ? '完善技能庫，比對目標職缺的需求'
    : '練習面試題目，提升表達自信'
  const nextStepHref = totalScore < 10 ? '/career-profile'
    : totalScore < 40 ? '/dashboard/skills' : '/interview-prep'

  return (
    <div className="min-h-screen space-y-5 p-5 lg:p-8" style={{ background: '#F7F3EE' }}>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <Pane className="!p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs font-medium" style={{ color: '#C4B0A2' }}>{dateLabel}</p>
            <h1 className="mt-1 text-[1.6rem] font-bold leading-tight tracking-tight" style={{ color: '#4B4038' }}>
              {greeting}，{name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: '#9E8E84' }}>
              {todayMood
                ? `今天心情：${MOODS.find(m => m.key === todayMood)?.emoji}  ${MOODS.find(m => m.key === todayMood)?.label}`
                : '今天想在職涯上做什麼？'}
            </p>
          </div>

          {/* Quick actions */}
          <div className="flex gap-2 flex-wrap">
            {QUICK_LINKS.map((q) => (
              <Link key={q.href} href={q.href}
                className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium transition-opacity hover:opacity-75"
                style={{ background: q.bg, border: `1px solid ${q.border}`, color: q.color }}>
                <span>{q.symbol}</span>{q.label}
              </Link>
            ))}
          </div>
        </div>

        {/* Progress hint */}
        {completedCount > 0 && (
          <div className="mt-5 flex items-center gap-3">
            <div className="flex-1 h-[3px] rounded-full" style={{ background: '#EDE5DB' }}>
              <div className="h-[3px] rounded-full" style={{
                background: '#C97941',
                width: `${(completedCount / totalTasks) * 100}%`,
                transition: 'width 0.4s ease',
              }} />
            </div>
            <span className="text-[11px] shrink-0" style={{ color: '#C4B0A2' }}>
              今日 {completedCount}/{totalTasks} 完成
            </span>
          </div>
        )}
      </Pane>

      {/* ── CAREER SNAPSHOT  +  TODAY PROGRESS ────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">

        {/* Career Snapshot — 3/5 */}
        <Pane className="lg:col-span-3">
          <SectionLabel>Career Score</SectionLabel>

          {/* Score header */}
          <div className="flex items-start justify-between mb-5">
            <div>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-bold leading-none" style={{ color: '#4B4038' }}>{totalScore}</span>
                <span className="text-lg mb-1 font-light" style={{ color: '#C4B8B2' }}>/100</span>
              </div>
              <p className="text-xs mt-2" style={{ color: '#9E8E84' }}>
                {totalScore < 20 ? '剛起步，每一步都算數'
                  : totalScore < 50 ? '穩定進行中，繼續保持'
                  : totalScore < 75 ? '表現不錯，快衝刺了！'
                  : '非常棒，接近完整狀態'}
              </p>
            </div>
            <ScoreRing score={totalScore} size={76} />
          </div>

          {/* Breakdown */}
          <div className="space-y-3.5">
            {SCORE_BREAKDOWN.map((b) => {
              const pct = Math.round((b.value / b.max) * 100)
              return (
                <Link key={b.label} href={b.href} className="block group">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: '#6B5E56' }}>{b.label}</span>
                    <span className="text-[11px]" style={{ color: '#C4B8B2' }}>{b.note}</span>
                  </div>
                  <div className="h-[5px] rounded-full" style={{ background: '#EDE5DB' }}>
                    <div className="h-[5px] rounded-full transition-all duration-500 group-hover:opacity-70"
                      style={{ width: `${pct || 2}%`, background: b.color }} />
                  </div>
                </Link>
              )
            })}
          </div>

          {/* Next step */}
          <div className="mt-5 pt-4" style={{ borderTop: '1px solid #EDE5DB' }}>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#C4B0A2' }}>本週建議</p>
            <p className="text-sm leading-relaxed" style={{ color: '#4B4038' }}>{nextStepText}</p>
            <Link href={nextStepHref}
              className="inline-flex items-center gap-1 text-xs font-medium mt-2 transition-opacity hover:opacity-70"
              style={{ color: '#C97941' }}>
              開始 →
            </Link>
          </div>
        </Pane>

        {/* Today Progress — 2/5 */}
        <Pane className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>今日進度</SectionLabel>
            <span className="text-[11px] px-2 py-0.5 rounded-full -mt-4"
              style={{ background: '#F3ECE4', color: '#9E8E84' }}>
              {completedCount}/{totalTasks}
            </span>
          </div>

          <div className="space-y-2">
            {TODAY_TASKS.map((task) => {
              const done = doneTaskIds.has(task.id)
              return (
                <div key={task.id} className="flex items-start gap-3 rounded-xl p-3 transition-colors"
                  style={{ background: done ? '#F5F0EB' : '#FAF7F4' }}>
                  <Checkbox done={done} onToggle={() => toggleTask(task.id)} />
                  <div className="flex-1 min-w-0">
                    <Link href={task.href} className="block transition-opacity hover:opacity-70">
                      <p className="text-sm font-medium"
                        style={{ color: done ? '#B8A890' : '#4B4038', textDecoration: done ? 'line-through' : 'none' }}>
                        {task.label}
                      </p>
                    </Link>
                    {!done && <p className="text-xs mt-0.5" style={{ color: '#B8A890' }}>{task.desc}</p>}
                  </div>
                  <span className="text-[10px] shrink-0 pt-0.5" style={{ color: '#D4C4B8' }}>{task.time}</span>
                </div>
              )
            })}
          </div>

          {/* Gentle note */}
          <div className="mt-4 rounded-xl px-3 py-3"
            style={{ background: showEncouragement ? '#FBF5F0' : '#F5F8F5', border: `1px solid ${showEncouragement ? '#EDD8CC' : '#D8EAD8'}` }}>
            <p className="text-xs leading-relaxed" style={{ color: showEncouragement ? '#A07060' : '#6A9470' }}>
              {showEncouragement
                ? '求職是需要時間的旅程，放慢腳步也沒關係。你已經很努力了 🤗'
                : '完成今日任務，Career Score 會自動更新，AI 建議也會更精準。'}
            </p>
          </div>
        </Pane>
      </div>

      {/* ── STATS ROW ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '本週投遞', value: '2',  sub: '較上週 +1',  color: '#C97941' },
          { label: 'ATS 平均', value: '—',  sub: '上傳後顯示', color: '#B8A090' },
          { label: '面試邀請', value: '1',  sub: '進行中',     color: '#7FA887' },
          { label: '今日完成', value: `${completedCount}`, sub: `共 ${totalTasks} 項`, color: '#D4A25A' },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl px-4 py-3.5"
            style={{ background: '#FFFDFC', border: '1px solid #E6DDD2', boxShadow: '0 1px 3px rgba(100,70,40,0.05)' }}>
            <p className="text-[1.6rem] font-bold leading-none" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs font-medium mt-1.5" style={{ color: '#6B5E56' }}>{s.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: '#C4B8B2' }}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* ── PIPELINE  +  MOOD ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">

        {/* Job Pipeline — 2/3 */}
        <Pane className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>求職追蹤</SectionLabel>
            <Link href="/career-match" className="text-[11px] font-medium -mt-4 transition-opacity hover:opacity-70"
              style={{ color: '#C97941' }}>
              全部 →
            </Link>
          </div>
          <div className="space-y-1.5">
            {PIPELINE_ITEMS.map((item, i) => {
              const cfg = STATUS_CFG[item.status] ?? STATUS_CFG.saved
              return (
                <Link key={i} href="/career-match"
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors"
                  style={{ background: '#FAF7F4' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#F3ECE4')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#FAF7F4')}>
                  <div className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: '#4B4038' }}>{item.company}</p>
                    <p className="text-xs truncate" style={{ color: '#9E8E84' }}>{item.role}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-medium ${cfg.textColor}`}>{cfg.label}</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#C4B8B2' }}>
                      {item.daysAgo === 0 ? '今天' : `${item.daysAgo} 天前`}
                    </p>
                  </div>
                </Link>
              )
            })}
            <Link href="/career-match"
              className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-colors mt-1"
              style={{ background: '#F3ECE4', color: '#9E8E84' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#EAE0D4')}
              onMouseLeave={e => (e.currentTarget.style.background = '#F3ECE4')}>
              ＋ 新增職缺
            </Link>
          </div>
        </Pane>

        {/* Mood — 1/3 */}
        <Pane>
          <div className="flex items-center justify-between mb-4">
            <SectionLabel>今日心情</SectionLabel>
            {todayMood && (
              <span className="text-[11px] -mt-4" style={{ color: '#C4B8B2' }}>
                {MOODS.find(m => m.key === todayMood)?.emoji} 已記錄
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-5">
            {MOODS.map((m) => {
              const active = todayMood === m.key
              return (
                <button key={m.key} type="button" onClick={() => recordMood(m.key)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-all"
                  style={{
                    border: `1px solid ${active ? '#C97941' : '#E6DDD2'}`,
                    background: active ? '#FBF2EA' : '#FAF7F4',
                    color: active ? '#C97941' : '#9E8E84',
                    fontWeight: active ? 500 : 400,
                  }}>
                  <span>{m.emoji}</span>
                  <span className="hidden sm:inline lg:hidden xl:inline">{m.label}</span>
                </button>
              )
            })}
          </div>
          <p className="text-[10px] mb-2" style={{ color: '#C4B8B2' }}>7 天情緒趨勢</p>
          <div className="overflow-x-auto">
            <MoodSparkline days={last7Days} />
          </div>
        </Pane>
      </div>
    </div>
  )
}
