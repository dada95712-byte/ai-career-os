'use client'

import { useEffect } from 'react'

export function RateLimitToast({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  useEffect(() => {
    if (!visible) return
    const t = setTimeout(onDismiss, 30000)
    return () => clearTimeout(t)
  }, [visible, onDismiss])

  if (!visible) return null

  return (
    <div className="fixed bottom-4 right-4 z-[100] flex items-start gap-3 rounded-xl border border-honey-400 bg-honey-50 px-4 py-3 shadow-warm-md max-w-sm">
      <span className="mt-0.5 text-base leading-none">⏳</span>
      <p className="flex-1 text-sm text-ink-700 leading-snug">AI 服務暫時忙碌，請等待 30 秒後再試</p>
      <button
        onClick={onDismiss}
        className="text-ink-300 hover:text-ink-600 text-xl leading-none transition-colors"
        aria-label="關閉"
      >
        ×
      </button>
    </div>
  )
}
