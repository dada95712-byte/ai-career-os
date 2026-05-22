'use client'

import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'gradient'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  loading?: boolean
}

const variants = {
  primary:  'bg-indigo-600 text-white hover:bg-indigo-500 focus:ring-indigo-500',
  secondary:'bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 focus:ring-zinc-600',
  outline:  'border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus:ring-zinc-600',
  ghost:    'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 focus:ring-zinc-700',
  danger:   'bg-red-600 text-white hover:bg-red-500 focus:ring-red-500',
  gradient: 'gradient-brand text-white hover:opacity-90 focus:ring-indigo-500',
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
        'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-950',
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
