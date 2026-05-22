import { cn } from '@/lib/utils'
import { InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100',
          'placeholder:text-zinc-500',
          'focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500/50',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          error && 'border-red-500/60 focus:border-red-500 focus:ring-red-500/30',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-zinc-500">{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
