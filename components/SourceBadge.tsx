type SourceType = 'search_result' | 'jd_inference' | 'general_inference' | null

export function SourceBadge({ source, sourceUrl }: { source: SourceType; sourceUrl?: string | null }) {
  const url = sourceUrl && sourceUrl !== 'null' ? sourceUrl : null
  let host = ''
  if (url) {
    try { host = new URL(url).hostname.replace(/^www\./, '') } catch { /* ignore */ }
  }
  if (source === 'search_result') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-sage-200 bg-sage-50 px-2 py-0.5 text-xs text-sage-700 shrink-0">
        <span>✓ 已查證</span>
        {url && host && (
          <a href={url} target="_blank" rel="noopener noreferrer"
            className="underline hover:text-sage-800 max-w-[100px] truncate">{host}</a>
        )}
      </span>
    )
  }
  if (source === 'jd_inference') {
    return (
      <span className="inline-flex items-center rounded-full border border-honey-200 bg-honey-50 px-2 py-0.5 text-xs text-honey-600 shrink-0">
        ⚠ 根據 JD 推測
      </span>
    )
  }
  if (source === 'general_inference') {
    return (
      <span className="inline-flex items-center rounded-full border border-warm-200 bg-cream-100 px-2 py-0.5 text-xs text-ink-400 shrink-0">
        ℹ 一般推測，建議自行確認
      </span>
    )
  }
  return null
}
