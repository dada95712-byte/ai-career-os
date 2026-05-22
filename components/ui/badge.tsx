import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'indigo'
}

const variants = {
  default: 'bg-zinc-800 text-zinc-300 border border-zinc-700',
  indigo:  'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
  success: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  danger:  'bg-red-500/10 text-red-400 border border-red-500/20',
  info:    'bg-sky-500/10 text-sky-400 border border-sky-500/20',
  outline: 'border border-zinc-700 text-zinc-400',
}

export function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
      {...props}
    />
  )
}
