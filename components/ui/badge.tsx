import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'outline' | 'terra' | 'sage' | 'honey'
}

const variants = {
  default: 'bg-cream-300 text-ink-500 border border-warm-200',
  terra:   'bg-terra-50 text-terra-700 border border-terra-100',
  sage:    'bg-sage-100 text-sage-700 border border-sage-100',
  honey:   'bg-honey-100 text-clay-700 border border-honey-100',
  success: 'bg-sage-100 text-sage-700 border border-sage-100',
  warning: 'bg-honey-100 text-clay-500 border border-honey-100',
  danger:  'bg-red-50 text-red-600 border border-red-100',
  info:    'bg-sky-50 text-sky-700 border border-sky-100',
  outline: 'border border-warm-300 text-ink-400 bg-transparent',
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
