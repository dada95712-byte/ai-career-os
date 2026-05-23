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
        <label htmlFor={id} className="text-xs font-medium text-ink-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={cn(
          'rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900',
          'placeholder:text-ink-200',
          'focus:border-terra-400 focus:outline-none focus:ring-2 focus:ring-terra-100',
          'disabled:opacity-40 disabled:cursor-not-allowed disabled:bg-cream-200',
          'transition-all duration-150',
          error && 'border-red-300 focus:border-red-400 focus:ring-red-100',
          className
        )}
        {...props}
      />
      {hint && !error && <p className="text-xs text-ink-300">{hint}</p>}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Input.displayName = 'Input'
