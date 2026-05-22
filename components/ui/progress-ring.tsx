'use client'

import { cn } from '@/lib/utils'
import { useEffect, useState } from 'react'

interface ProgressRingProps {
  score: number       // 0–100
  size?: number
  strokeWidth?: number
  className?: string
  animate?: boolean
}

function scoreLabel(s: number) {
  if (s >= 85) return { text: '優秀', color: '#10B981' }
  if (s >= 70) return { text: '良好', color: '#6366F1' }
  if (s >= 50) return { text: '進展中', color: '#F59E0B' }
  return { text: '待提升', color: '#EF4444' }
}

let ringId = 0

export function ProgressRing({
  score,
  size = 140,
  strokeWidth = 9,
  className,
  animate = true,
}: ProgressRingProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : score)
  const id = `ring-grad-${++ringId}`

  useEffect(() => {
    if (!animate) { setDisplayed(score); return }
    const timer = setTimeout(() => setDisplayed(score), 80)
    return () => clearTimeout(timer)
  }, [score, animate])

  const r = (size - strokeWidth) / 2
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(displayed, 100) / 100)
  const { text, color } = scoreLabel(score)

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        style={{ transform: 'rotate(-90deg)' }}
        aria-hidden="true"
      >
        {/* track */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke="#27272A"
          strokeWidth={strokeWidth}
        />
        {/* fill */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.34,1.56,0.64,1)' }}
        />
        <defs>
          <linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
        </defs>
      </svg>

      {/* center label */}
      <div className="absolute flex flex-col items-center">
        <span className="text-3xl font-bold text-zinc-50 tabular-nums">{displayed}</span>
        <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color }}>
          {text}
        </span>
      </div>
    </div>
  )
}

/* ── Thin bar variant ───────────────────────────────────────── */
interface ProgressBarProps {
  value: number   // 0–100
  color?: string
  className?: string
  label?: string
  showValue?: boolean
}

export function ProgressBar({ value, color = 'bg-indigo-500', className, label, showValue }: ProgressBarProps) {
  return (
    <div className={cn('w-full', className)}>
      {(label || showValue) && (
        <div className="mb-1 flex items-center justify-between">
          {label && <span className="text-xs text-zinc-400">{label}</span>}
          {showValue && <span className="text-xs font-medium text-zinc-300">{value}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all duration-700', color)}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  )
}
