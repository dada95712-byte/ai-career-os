'use client'

import { useState, useEffect, useRef } from 'react'

// ── Types ──────────────────────────────────────────────────────────────────────

interface JournalEntry {
  id: string
  title: string
  date: string
  content?: string
  situation?: string
  task?: string
  action?: string
  result?: string
  tags?: string[]
}

type EditorMode = 'star' | 'free'

function genId() { return Math.random().toString(36).slice(2, 10) }

function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getDate().toString().padStart(2, '0')}`
}

function emptyEntry(): Omit<JournalEntry, 'id'> {
  return {
    title: '',
    date: new Date().toISOString().slice(0, 10),
    content: '',
    situation: '',
    task: '',
    action: '',
    result: '',
    tags: [],
  }
}

// ── Spinner ───────────────────────────────────────────────────────────────────

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkJournalPage() {
  const [entries, setEntries] = useState<JournalEntry[]>([])
  const [view, setView] = useState<'list' | 'edit' | 'detail'>('list')
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [detailEntry, setDetailEntry] = useState<JournalEntry | null>(null)
  const [editorMode, setEditorMode] = useState<EditorMode>('star')
  const [search, setSearch] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [aiTagging, setAiTagging] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    try {
      const raw = localStorage.getItem('career-journal')
      if (raw) setEntries(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  function persist(next: JournalEntry[]) {
    setEntries(next)
    try { localStorage.setItem('career-journal', JSON.stringify(next)) } catch { /* quota */ }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function startNew() {
    setEditingEntry({ id: genId(), ...emptyEntry() })
    setEditorMode('star')
    setTagInput('')
    setView('edit')
    setTimeout(() => titleRef.current?.focus(), 50)
  }

  function startEdit(entry: JournalEntry) {
    setEditingEntry({ ...entry })
    setEditorMode(entry.situation || entry.task || entry.action || entry.result ? 'star' : 'free')
    setTagInput((entry.tags ?? []).join(', '))
    setView('edit')
  }

  function saveEntry() {
    if (!editingEntry) return
    const tags = tagInput.split(',').map((t) => t.trim()).filter(Boolean)
    const toSave = { ...editingEntry, tags }
    const exists = entries.some((e) => e.id === toSave.id)
    const next = exists
      ? entries.map((e) => e.id === toSave.id ? toSave : e)
      : [toSave, ...entries]
    persist(next)
    setView('list')
    setEditingEntry(null)
  }

  function deleteEntry(id: string) {
    persist(entries.filter((e) => e.id !== id))
    setDeleteConfirm(null)
    if (view === 'detail') setView('list')
  }

  function openDetail(entry: JournalEntry) {
    setDetailEntry(entry)
    setView('detail')
  }

  function updateField(field: keyof JournalEntry, value: string) {
    if (!editingEntry) return
    setEditingEntry({ ...editingEntry, [field]: value })
  }

  async function handleAiTag() {
    if (!editingEntry) return
    const text = [editingEntry.title, editingEntry.content, editingEntry.situation, editingEntry.task, editingEntry.action, editingEntry.result].filter(Boolean).join(' ')
    if (!text.trim()) return
    setAiTagging(true)
    try {
      const res = await fetch('/api/journal/tag', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.slice(0, 2000) }),
      })
      const data = await res.json()
      const tags: string[] = data.tags ?? []
      setTagInput(tags.join(', '))
    } catch { /* ignore */ }
    finally { setAiTagging(false) }
  }

  // ── Filter ─────────────────────────────────────────────────────────────────

  const q = search.toLowerCase()
  const filtered = entries.filter((e) => {
    if (!q) return true
    const text = [e.title, e.content, e.situation, e.task, e.action, e.result, ...(e.tags ?? [])].join(' ').toLowerCase()
    return text.includes(q)
  })

  // ── Render: edit view ──────────────────────────────────────────────────────

  if (view === 'edit' && editingEntry) {
    const isNew = !entries.some((e) => e.id === editingEntry.id)
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => { setView('list'); setEditingEntry(null) }}
            className="text-sm text-ink-400 hover:text-ink-600 transition-colors">
            ← 返回
          </button>
          <h1 className="text-lg font-bold text-ink-900">{isNew ? '新增日誌' : '編輯日誌'}</h1>
        </div>

        {/* Title + date */}
        <div className="space-y-3">
          <input
            ref={titleRef}
            placeholder="日誌標題（例如：成功完成跨部門簡報）"
            value={editingEntry.title}
            onChange={(e) => updateField('title', e.target.value)}
            className="w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm font-medium text-ink-900 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
          />
          <input
            type="date"
            value={editingEntry.date}
            onChange={(e) => updateField('date', e.target.value)}
            className="rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-700 focus:border-terra-400 focus:outline-none"
          />
        </div>

        {/* Mode toggle */}
        <div className="flex gap-1 rounded-xl border border-warm-200 bg-white p-1 w-fit">
          {(['star', 'free'] as const).map((m) => (
            <button key={m} onClick={() => setEditorMode(m)}
              className={`rounded-lg px-4 py-1.5 text-xs font-medium transition-all ${editorMode === m ? 'bg-cream-200 text-ink-900' : 'text-ink-400 hover:text-ink-600'}`}>
              {m === 'star' ? '⭐ STAR 格式' : '📝 自由撰寫'}
            </button>
          ))}
        </div>

        {/* Content fields */}
        {editorMode === 'star' ? (
          <div className="space-y-3">
            {([
              { key: 'situation', label: 'S — Situation', placeholder: '描述當時的情境、背景、時間點...', hint: '例：Q3 末，公司決定在 2 週內完成系統遷移' },
              { key: 'task',      label: 'T — Task',      placeholder: '你負責的任務或挑戰是什麼？',    hint: '例：我負責協調 3 個部門，確保資料不中斷' },
              { key: 'action',    label: 'A — Action',    placeholder: '你具體採取了哪些行動？',        hint: '例：我建立了日報機制、設立緊急聯絡 SOP' },
              { key: 'result',    label: 'R — Result',    placeholder: '結果與成效（最好附上數字）',     hint: '例：如期完成，服務中斷時間 < 30 分鐘' },
            ] as const).map(({ key, label, placeholder, hint }) => (
              <div key={key} className="rounded-xl border border-warm-200 bg-white overflow-hidden">
                <div className="px-4 py-2 bg-cream-50 border-b border-warm-100">
                  <p className="text-xs font-semibold text-ink-700">{label}</p>
                  <p className="text-[10px] text-ink-400">{hint}</p>
                </div>
                <textarea
                  placeholder={placeholder}
                  value={(editingEntry as unknown as Record<string, string>)[key] ?? ''}
                  onChange={(e) => updateField(key as keyof JournalEntry, e.target.value)}
                  className="w-full px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:outline-none resize-none bg-white"
                  style={{ minHeight: '80px' }}
                />
              </div>
            ))}
          </div>
        ) : (
          <textarea
            placeholder="自由撰寫日誌內容..."
            value={editingEntry.content ?? ''}
            onChange={(e) => updateField('content', e.target.value)}
            className="w-full rounded-xl border border-warm-300 bg-white px-4 py-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none resize-none"
            style={{ minHeight: '200px' }}
          />
        )}

        {/* Tags */}
        <div className="rounded-xl border border-warm-200 bg-white p-4 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-700">🏷 標籤</p>
            <button
              onClick={handleAiTag}
              disabled={aiTagging}
              className="flex items-center gap-1 text-xs text-terra-500 hover:text-terra-700 transition-colors disabled:opacity-50"
            >
              {aiTagging ? <Spinner /> : '🤖'} AI 建議標籤
            </button>
          </div>
          <input
            placeholder="用逗號分隔標籤，例如：溝通、跨部門、專案管理"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            className="w-full rounded-lg border border-warm-200 px-3 py-2 text-xs text-ink-700 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
          />
          {tagInput && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {tagInput.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                <span key={t} className="rounded-full border border-terra-200 bg-terra-50 px-2.5 py-0.5 text-[11px] text-terra-600">{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Save */}
        <div className="flex gap-3">
          <button
            onClick={saveEntry}
            disabled={!editingEntry.title.trim()}
            className="flex-1 rounded-xl bg-terra-500 py-3 text-sm font-semibold text-white hover:bg-terra-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-[var(--shadow-warm-sm)]"
          >
            {isNew ? '儲存日誌' : '更新日誌'}
          </button>
          <button
            onClick={() => { setView('list'); setEditingEntry(null) }}
            className="rounded-xl border border-warm-200 bg-cream-100 px-5 text-sm text-ink-500 hover:bg-cream-200 transition-colors"
          >
            取消
          </button>
        </div>
      </div>
    )
  }

  // ── Render: detail view ────────────────────────────────────────────────────

  if (view === 'detail' && detailEntry) {
    const e = detailEntry
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => setView('list')} className="text-sm text-ink-400 hover:text-ink-600 transition-colors">← 返回</button>
          <div className="flex gap-2">
            <button
              onClick={() => startEdit(e)}
              className="rounded-xl border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-terra-300 hover:text-terra-600 transition-colors"
            >
              ✏️ 編輯
            </button>
            <button
              onClick={() => setDeleteConfirm(e.id)}
              className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs text-red-500 hover:bg-red-100 transition-colors"
            >
              刪除
            </button>
          </div>
        </div>

        <div>
          <h1 className="text-xl font-bold text-ink-900">{e.title}</h1>
          <p className="text-xs text-ink-400 mt-1">{fmtDate(e.date)}</p>
        </div>

        {(e.tags?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {e.tags!.map((t) => (
              <span key={t} className="rounded-full border border-terra-200 bg-terra-50 px-2.5 py-0.5 text-[11px] text-terra-600">{t}</span>
            ))}
          </div>
        )}

        {(e.situation || e.task || e.action || e.result) ? (
          <div className="space-y-3">
            {([
              { key: 'situation', label: 'S — Situation' },
              { key: 'task',      label: 'T — Task' },
              { key: 'action',    label: 'A — Action' },
              { key: 'result',    label: 'R — Result' },
            ] as const).map(({ key, label }) => {
              const val = (e as unknown as Record<string, string | undefined>)[key]
              if (!val) return null
              return (
                <div key={key} className="rounded-xl border border-warm-200 bg-white overflow-hidden">
                  <div className="px-4 py-2 bg-cream-50 border-b border-warm-100">
                    <p className="text-xs font-semibold text-ink-600">{label}</p>
                  </div>
                  <p className="px-4 py-3 text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{val}</p>
                </div>
              )
            })}
          </div>
        ) : e.content ? (
          <div className="rounded-xl border border-warm-200 bg-white p-4">
            <p className="text-sm text-ink-700 leading-relaxed whitespace-pre-wrap">{e.content}</p>
          </div>
        ) : (
          <p className="text-sm text-ink-400 py-4 text-center">（無內容）</p>
        )}
      </div>
    )
  }

  // ── Render: list view ──────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-ink-900">📓 Work Journal</h1>
          <p className="mt-1 text-sm text-ink-500">記錄工作亮點，供 AI 分析技能與準備面試</p>
        </div>
        <button
          onClick={startNew}
          className="shrink-0 rounded-xl bg-terra-500 px-4 py-2 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]"
        >
          + 新增日誌
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-ink-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
        </svg>
        <input
          placeholder="搜尋日誌..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-warm-200 bg-white pl-9 pr-4 py-2.5 text-sm text-ink-700 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
        />
      </div>

      {/* Tip banner */}
      <div className="flex items-start gap-3 rounded-xl bg-cream-50 border border-warm-200 px-4 py-3 text-xs text-ink-500">
        <span className="shrink-0 mt-0.5">💡</span>
        <span>
          使用 <strong>STAR 格式</strong>（Situation / Task / Action / Result）記錄，AI 能更精準地萃取技能、生成面試範例答案。
          記錄後可前往{' '}
          <a href="/dashboard/skills" className="text-terra-500 hover:text-terra-700 transition-colors">Skill Map</a>{' '}
          分析日誌技能。
        </span>
      </div>

      {/* Entry list */}
      {entries.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-4xl">📓</p>
          <p className="text-base font-medium text-ink-700">還沒有任何日誌</p>
          <p className="text-sm text-ink-400">記錄每週的工作亮點，讓 AI 幫你分析成長軌跡</p>
          <button
            onClick={startNew}
            className="inline-block mt-2 rounded-xl bg-terra-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]"
          >
            新增第一篇日誌
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-sm text-ink-400">沒有符合「{search}」的日誌</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((e) => {
            const preview = e.situation || e.content || e.task || ''
            return (
              <div
                key={e.id}
                className="group rounded-2xl border border-warm-200 bg-white px-5 py-4 hover:border-terra-300 hover:shadow-[var(--shadow-warm-sm)] transition-all cursor-pointer"
                onClick={() => openDetail(e)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink-800 truncate">{e.title || '（無標題）'}</p>
                    {preview && (
                      <p className="text-xs text-ink-400 mt-1 line-clamp-2 leading-relaxed">{preview}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      <span className="text-[10px] text-ink-300">{fmtDate(e.date)}</span>
                      {(e.tags?.length ?? 0) > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {e.tags!.slice(0, 3).map((t) => (
                            <span key={t} className="rounded-full border border-terra-100 bg-terra-50 px-2 py-0.5 text-[10px] text-terra-500">{t}</span>
                          ))}
                          {(e.tags!.length > 3) && <span className="text-[10px] text-ink-400">+{e.tags!.length - 3}</span>}
                        </div>
                      )}
                      {(e.situation || e.task || e.action || e.result) && (
                        <span className="text-[10px] text-sage-500 border border-sage-200 bg-sage-50 rounded-full px-2 py-0.5">STAR</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={(ev) => { ev.stopPropagation(); startEdit(e) }}
                      className="rounded-lg p-1.5 text-ink-300 hover:text-terra-500 hover:bg-terra-50 transition-colors"
                      title="編輯"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      onClick={(ev) => { ev.stopPropagation(); setDeleteConfirm(e.id) }}
                      className="rounded-lg p-1.5 text-ink-300 hover:text-red-400 hover:bg-red-50 transition-colors"
                      title="刪除"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" />
                        <path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-[var(--shadow-warm-lg)] p-6 max-w-sm w-full space-y-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-sm font-semibold text-ink-800">確定要刪除這篇日誌？</p>
            <p className="text-xs text-ink-400">刪除後無法復原。</p>
            <div className="flex gap-3">
              <button
                onClick={() => deleteEntry(deleteConfirm)}
                className="flex-1 rounded-xl bg-red-500 py-2.5 text-sm font-semibold text-white hover:bg-red-600 transition-colors"
              >
                確定刪除
              </button>
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-xl border border-warm-200 bg-cream-100 py-2.5 text-sm text-ink-500 hover:bg-cream-200 transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
