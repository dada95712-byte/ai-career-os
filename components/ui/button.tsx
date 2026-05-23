'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'sage'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:   'bg-terra-500 text-white hover:bg-terra-700 active:scale-[0.98] shadow-[var(--shadow-warm-xs)] focus:ring-terra-300',
  secondary: 'bg-cream-200 text-ink-700 hover:bg-cream-300 border border-warm-200 hover:border-warm-300 focus:ring-warm-300',
  outline:   'border border-warm-200 text-ink-500 hover:bg-cream-200 hover:text-ink-700 hover:border-warm-300 focus:ring-warm-300',
  ghost:     'text-ink-400 hover:bg-cream-200 hover:text-ink-700 focus:ring-warm-300',
  danger:    'bg-red-600 text-white hover:bg-red-700 focus:ring-red-300',
  sage:      'bg-sage-500 text-white hover:bg-sage-700 focus:ring-sage-300 shadow-[var(--shadow-warm-xs)]',
}

const sizes = {
  xs: 'px-2.5 py-1 text-xs rounded-md',
  sm: 'px-3 py-1.5 text-sm rounded-lg',
  md: 'px-4 py-2 text-sm rounded-lg',
  lg: 'px-5 py-2.5 text-base rounded-xl',
}

const Spinner = () => (
  <svg className="h-3.5 w-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
)

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-cream-100',
        'disabled:cursor-not-allowed disabled:opacity-40',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
)
Button.displayName = 'Button'
