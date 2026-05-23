import { cn } from '@/lib/utils'
import { TextareaHTMLAttributes, forwardRef } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, id, ...props }, ref) => (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-xs font-medium text-ink-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <textarea
        ref={ref}
        id={id}
        className={cn(
          'min-h-24 rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-ink-900',
          'placeholder:text-ink-200 resize-y leading-relaxed',
          'focus:border-terra-400 focus:outline-none focus:ring-2 focus:ring-terra-100',
          'disabled:opacity-40 disabled:bg-cream-200 transition-all duration-150',
          error && 'border-red-300',
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
)
Textarea.displayName = 'Textarea'
