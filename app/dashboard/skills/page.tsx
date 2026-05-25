'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

// ── Types ──────────────────────────────────────────────────────────────────────

const SKILL_CATEGORIES = ['專業技能', '工具與軟體', '核心職能', '軟實力', '語言能力', '證照與認證', '學習中'] as const
type SkillCategory = typeof SKILL_CATEGORIES[number]
interface TaggedSkill { name: string; category: SkillCategory }

const CAT_DOT: Record<SkillCategory, string> = {
  '專業技能':   'bg-terra-400',
  '工具與軟體': 'bg-sky-400',
  '核心職能':   'bg-violet-400',
  '軟實力':     'bg-sage-400',
  '語言能力':   'bg-honey-400',
  '證照與認證': 'bg-warm-400',
  '學習中':     'bg-orange-400',
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── SkillChip ─────────────────────────────────────────────────────────────────

function SkillChip({
  skill, isEditingCat, onStartEditCat, onCancelEditCat, onChangeCat, onDelete, onLongPress,
}: {
  skill: TaggedSkill
  isEditingCat: boolean
  onStartEditCat: () => void
  onCancelEditCat: () => void
  onChangeCat: (cat: SkillCategory) => void
  onDelete: () => void
  onLongPress: () => void
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleTouchStart() {
    timerRef.current = setTimeout(() => { onLongPress(); timerRef.current = null }, 600)
  }
  function clearLongPress() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
  }

  return (
    <div
      className={`group relative inline-flex items-center gap-0.5 rounded-full border text-sm select-none transition-all duration-150
        ${isEditingCat
          ? 'border-terra-400 bg-terra-50 text-terra-700 pl-3 pr-2 py-1'
          : 'bg-white border-warm-200 text-ink-700 hover:border-terra-300 hover:bg-terra-50 px-3 py-1 cursor-default'
        }`}
      onTouchStart={handleTouchStart}
      onTouchEnd={clearLongPress}
      onTouchMove={clearLongPress}
    >
      <span>{skill.name}</span>
      {isEditingCat ? (
        <select
          autoFocus
          value={skill.category}
          onChange={(e) => onChangeCat(e.target.value as SkillCategory)}
          onBlur={onCancelEditCat}
          onClick={(e) => e.stopPropagation()}
          className="ml-1 rounded-md border border-warm-200 bg-white text-[11px] text-ink-700 focus:outline-none focus:border-terra-400 shadow-[var(--shadow-warm-sm)] py-0.5 pr-1 cursor-pointer"
        >
          {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      ) : (
        <span className="inline-flex items-center gap-0 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ml-0.5">
          <button
            title="編輯分類"
            onMouseDown={(e) => { e.preventDefault(); onStartEditCat() }}
            className="text-[11px] text-ink-400 hover:text-terra-600 transition-colors px-0.5 leading-none"
          >✏️</button>
          <button
            title="刪除"
            onMouseDown={(e) => { e.preventDefault(); onDelete() }}
            className="text-[12px] text-ink-400 hover:text-red-400 transition-colors px-0.5 leading-none"
          >✕</button>
        </span>
      )}
    </div>
  )
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills]           = useState<TaggedSkill[]>([])
  const [newSkill, setNewSkill]       = useState('')
  const [newSkillCat, setNewSkillCat] = useState<SkillCategory>('核心職能')
  const [skillView, setSkillView]     = useState<'category' | 'all'>('category')
  const [collapsedCats, setCollapsedCats] = useState<Set<SkillCategory>>(new Set())
  const [dupAlert, setDupAlert]       = useState('')
  const [editingCatFor, setEditingCatFor] = useState<string | null>(null)
  const [toast, setToast]             = useState<{ msg: string; skill: TaggedSkill } | null>(null)
  const [mobileMenuSkill, setMobileMenuSkill] = useState<string | null>(null)
  const [recommendedSkills, setRecommendedSkills] = useState<TaggedSkill[]>([])
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set())
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const raw = localStorage.getItem('career-skills')
    if (!raw) return
    try {
      const p = JSON.parse(raw)
      if (!Array.isArray(p)) return
      if (typeof p[0] === 'string') setSkills(p.map((s: string) => ({ name: s, category: '核心職能' as SkillCategory })))
      else setSkills(p)
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    return () => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current) }
  }, [])

  function persist(next: TaggedSkill[]) {
    setSkills(next)
    try { localStorage.setItem('career-skills', JSON.stringify(next)) } catch { /* quota */ }
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  function norm(s: string) { return s.toLowerCase().replace(/\s+/g, '') }

  function addSkill() {
    const t = newSkill.trim(); if (!t) return
    if (skills.some((s) => norm(s.name) === norm(t))) {
      setDupAlert('此技能已存在'); setTimeout(() => setDupAlert(''), 2500); return
    }
    persist([...skills, { name: t, category: newSkillCat }]); setNewSkill('')
  }

  function changeCat(skillName: string, newCat: SkillCategory) {
    persist(skills.map((s) => s.name === skillName ? { ...s, category: newCat } : s))
    setEditingCatFor(null)
  }

  function deleteWithToast(skillName: string) {
    const skill = skills.find((s) => s.name === skillName)
    if (!skill) return
    persist(skills.filter((s) => s.name !== skillName))
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ msg: `已刪除「${skillName}」`, skill })
    toastTimerRef.current = setTimeout(() => { setToast(null); toastTimerRef.current = null }, 5000)
  }

  function undoDelete() {
    if (!toast) return
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    persist([toast.skill, ...skills])
    setToast(null)
  }

  function dedupSkills() {
    const seen = new Set<string>()
    const deduped = skills.filter((s) => {
      const k = norm(s.name); if (seen.has(k)) return false; seen.add(k); return true
    })
    const removed = skills.length - deduped.length
    persist(deduped)
    setDupAlert(removed > 0 ? `已移除 ${removed} 個重複技能` : '沒有發現重複技能')
    setTimeout(() => setDupAlert(''), 2500)
  }

  function toggleCat(cat: SkillCategory) {
    setCollapsedCats((p) => { const n = new Set(p); n.has(cat) ? n.delete(cat) : n.add(cat); return n })
  }

  function guessCategory(skill: string): SkillCategory {
    const l = skill.toLowerCase().replace(/\s+/g, '')
    if (/溝通|協調|協作|跨部門|團隊合作|領導|表達|人際|問題解決|服務|軟實力|soft/.test(l)) return '軟實力'
    if (/英文|英語|english|日文|日語|korean|韓文|french|德文|語言|toeic|ielts|雅思|托福/.test(l)) return '語言能力'
    if (/pmp|cfa|cpa|cpe|cissp|certified|certificate|認證|證照|技術士|乙級|甲級/.test(l)) return '證照與認證'
    if (/學習中|進修中|studying|自學/.test(l)) return '學習中'
    if (/python|react|node|sql|docker|git|aws|gcp|azure|figma|excel|powerpoint|office|javascript|typescript|java|c\+\+|ruby|php|swift|kotlin|golang|rust|vue|angular|tailwind|webpack|linux|photoshop|illustrator|premiere|notion|slack|jira|trello|confluence|hubspot|salesforce|googleanalytics|googleads|metaads|facebookads|sap|erp|crm|tableau|powerbi|looker|matlab|spss|stata|hadoop|spark|kubernetes|terraform|ansible/.test(l)) return '工具與軟體'
    if (/管理|規劃|策略|行銷|業務|財務|設計|架構|分析|簡報|研究|開發|運營|專案|品管|採購|供應鏈|數據|報告|預算|成本/.test(l)) return '核心職能'
    return '專業技能'
  }

  async function handleRecommendSkills() {
    const raw = localStorage.getItem('career-journal')
    let text = ''
    if (raw) {
      try {
        const entries = JSON.parse(raw)
        text = entries.map((e: Record<string, string>) => [e.title, e.content, e.situation, e.task, e.action, e.result].filter(Boolean).join(' ')).join('\n')
      } catch { /* ignore */ }
    }
    if (!text.trim()) { alert('請先在 Work Journal 新增一些日誌再進行分析'); return }
    setLoadingRecommend(true); setRecommendedSkills([]); setCheckedSkills(new Set()); setShowRecommend(true)
    try {
      const res = await fetch('/api/skills/recommend-from-journal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journalText: text }),
      })
      const data = await res.json()
      setRecommendedSkills((data.skills ?? []).map((s: string) => ({ name: s, category: guessCategory(s) })))
    } catch { setRecommendedSkills([]) }
    finally { setLoadingRecommend(false) }
  }

  function addCheckedSkills() {
    const existingNorm = new Set(skills.map((s) => norm(s.name)))
    const toAdd = recommendedSkills.filter((s) => checkedSkills.has(s.name) && !existingNorm.has(norm(s.name)))
    if (toAdd.length) persist([...skills, ...toAdd])
    setShowRecommend(false); setCheckedSkills(new Set())
  }

  const groupedSkills = SKILL_CATEGORIES.reduce((acc, cat) => {
    acc[cat] = skills.filter((s) => s.category === cat); return acc
  }, {} as Record<SkillCategory, TaggedSkill[]>)

  // ── Shared chip renderer ─────────────────────────────────────────────────────

  function renderChip(s: TaggedSkill) {
    return (
      <SkillChip
        key={s.name}
        skill={s}
        isEditingCat={editingCatFor === s.name}
        onStartEditCat={() => setEditingCatFor(s.name)}
        onCancelEditCat={() => setEditingCatFor(null)}
        onChangeCat={(cat) => changeCat(s.name, cat)}
        onDelete={() => deleteWithToast(s.name)}
        onLongPress={() => setMobileMenuSkill(s.name)}
      />
    )
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-5">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">⚡ 我的技能庫</h1>
        <p className="mt-1 text-sm text-ink-500">統一管理技能，自動用於 AI 分析與匹配</p>
      </div>

      {/* ── Usage bar ── */}
      <div className="flex items-center gap-2 flex-wrap bg-cream-50 border border-warm-200 rounded-lg px-4 py-3">
        <span className="text-sm text-ink-500 shrink-0">你的技能將用於：</span>
        <Link href="/career-match" className="text-sm font-medium text-terra-600 hover:text-terra-800 transition-colors whitespace-nowrap">🎯 職缺匹配 →</Link>
        <span className="text-ink-300">·</span>
        <Link href="/career-growth" className="text-sm font-medium text-terra-600 hover:text-terra-800 transition-colors whitespace-nowrap">📊 技能落差 →</Link>
        <span className="text-ink-300">·</span>
        <Link href="/interview-prep" className="text-sm font-medium text-terra-600 hover:text-terra-800 transition-colors whitespace-nowrap">🎤 面試準備 →</Link>
      </div>

      {/* ── Controls bar ── */}
      <div className="border-b border-warm-200 pb-3 space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Input */}
          <input
            placeholder="新增技能..."
            value={newSkill}
            onChange={(e) => setNewSkill(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSkill()}
            className="h-9 w-40 rounded-xl border border-warm-300 bg-white px-3 text-sm text-ink-800 placeholder:text-ink-400 focus:border-terra-400 focus:outline-none"
          />
          {/* Category select */}
          <select
            value={newSkillCat}
            onChange={(e) => setNewSkillCat(e.target.value as SkillCategory)}
            className="h-9 w-[120px] rounded-xl border border-warm-300 bg-white px-2 text-sm text-ink-700 focus:border-terra-400 focus:outline-none"
          >
            {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Add button */}
          <button
            onClick={addSkill}
            className="h-9 rounded-xl bg-terra-500 px-4 text-sm font-semibold text-white hover:bg-terra-700 transition-colors shadow-[var(--shadow-warm-sm)]"
          >
            新增
          </button>

          {/* Separator */}
          <div className="h-5 w-px bg-warm-200 mx-1" />

          {/* AI recommend */}
          <button
            onClick={handleRecommendSkills}
            disabled={loadingRecommend}
            className="h-9 flex items-center gap-1.5 rounded-xl border border-warm-200 bg-white px-3 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors disabled:opacity-50"
          >
            {loadingRecommend ? <Spinner /> : '🤖'} AI 推薦
          </button>
          {/* Dedup */}
          <button
            onClick={dedupSkills}
            className="h-9 rounded-xl border border-warm-200 bg-white px-3 text-sm text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors"
          >
            清除重複
          </button>

          {/* View toggle — pushed to right */}
          <div className="ml-auto flex gap-0.5 rounded-lg border border-warm-200 bg-white p-0.5 h-9 items-center">
            {(['category', 'all'] as const).map((v) => (
              <button key={v} onClick={() => setSkillView(v)}
                className={`rounded-md px-3 h-7 text-xs font-medium transition-all ${skillView === v ? 'bg-cream-200 text-ink-700' : 'text-ink-400 hover:text-ink-600'}`}>
                {v === 'category' ? '分類視圖' : '全部顯示'}
              </button>
            ))}
          </div>
        </div>

        {/* Dup alert */}
        {dupAlert && (
          <p className="text-xs text-terra-600 bg-terra-50 border border-terra-100 rounded-lg px-3 py-1.5">{dupAlert}</p>
        )}
      </div>

      {/* ── Mobile long-press menu ── */}
      {mobileMenuSkill && (
        <div className="fixed inset-0 z-[100] flex items-end" onClick={() => setMobileMenuSkill(null)}>
          <div className="w-full bg-white rounded-t-2xl border-t border-warm-200 p-4 space-y-1 shadow-[var(--shadow-warm-lg)]" onClick={(e) => e.stopPropagation()}>
            <p className="text-center text-xs font-semibold text-ink-400 pb-2 border-b border-warm-100">{mobileMenuSkill}</p>
            <button
              className="w-full text-left py-3 px-1 text-sm text-ink-700 hover:text-terra-600 transition-colors"
              onClick={() => { setEditingCatFor(mobileMenuSkill); setMobileMenuSkill(null) }}>
              ✏️ 編輯分類
            </button>
            <button
              className="w-full text-left py-3 px-1 text-sm text-red-500 hover:text-red-600 transition-colors"
              onClick={() => { deleteWithToast(mobileMenuSkill); setMobileMenuSkill(null) }}>
              ✕ 刪除
            </button>
            <button
              className="w-full text-center py-2 text-sm text-ink-400 mt-1"
              onClick={() => setMobileMenuSkill(null)}>
              取消
            </button>
          </div>
        </div>
      )}

      {/* ── Toast ── */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 rounded-2xl border border-warm-200 bg-white px-5 py-3 shadow-[var(--shadow-warm-md)] text-sm whitespace-nowrap">
          <span className="text-ink-600">{toast.msg}</span>
          <button onClick={undoDelete} className="text-terra-500 font-semibold hover:text-terra-700 transition-colors">復原</button>
        </div>
      )}

      {/* ── AI Recommend panel ── */}
      {showRecommend && (
        <Card className="border-terra-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI 推薦技能</CardTitle>
              <button onClick={() => setShowRecommend(false)} className="text-ink-400 hover:text-ink-600 text-lg leading-none">×</button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingRecommend ? (
              <div className="flex items-center gap-2 text-sm text-terra-500 py-4 justify-center"><Spinner />AI 分析日誌中...</div>
            ) : recommendedSkills.length === 0 ? (
              <p className="text-sm text-ink-400 py-2">無法取得推薦，請確認日誌有足夠內容。</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  {recommendedSkills.map((s) => (
                    <label key={s.name} className={`flex items-center gap-1.5 cursor-pointer rounded-full border px-3 py-1 text-sm transition-all ${checkedSkills.has(s.name) ? 'border-terra-400 bg-terra-50 text-terra-600' : 'border-warm-200 text-ink-500 hover:border-warm-300'}`}>
                      <input type="checkbox" className="hidden" checked={checkedSkills.has(s.name)}
                        onChange={(e) => setCheckedSkills((p) => { const n = new Set(p); e.target.checked ? n.add(s.name) : n.delete(s.name); return n })} />
                      {checkedSkills.has(s.name) ? '✓ ' : ''}{s.name}
                      <span className="text-[10px] text-ink-400">· {s.category}</span>
                    </label>
                  ))}
                </div>
                <Button variant="primary" size="sm" disabled={checkedSkills.size === 0} onClick={addCheckedSkills}>
                  一鍵新增 {checkedSkills.size > 0 ? `(${checkedSkills.size})` : ''}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Skill list ── */}
      {skillView === 'all' ? (
        <div className="rounded-2xl border border-warm-200 bg-white p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-ink-700">所有技能 <span className="text-ink-400 font-normal">({skills.length})</span></p>
          </div>
          {skills.length === 0 ? (
            <div className="py-8 text-center"><p className="text-2xl mb-2">⚡</p><p className="text-sm text-ink-500">尚未新增技能</p></div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((s) => renderChip(s))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {SKILL_CATEGORIES.map((cat) => {
            const catSkills = groupedSkills[cat]
            if (!catSkills.length) return null
            const collapsed = collapsedCats.has(cat)
            return (
              <div key={cat} className="rounded-2xl border border-warm-200 bg-white overflow-hidden">
                <button className="w-full flex items-center justify-between px-5 py-3 hover:bg-cream-50 transition-colors" onClick={() => toggleCat(cat)}>
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full shrink-0 ${CAT_DOT[cat]}`} />
                    <span className="text-sm font-semibold text-ink-700">{cat}</span>
                    <span className="text-xs text-ink-400 font-normal">({catSkills.length})</span>
                  </div>
                  <span className="text-ink-300 text-xs">{collapsed ? '▶' : '▼'}</span>
                </button>
                {!collapsed && (
                  <div className="px-5 pb-4 pt-1 flex flex-wrap gap-2">
                    {catSkills.map((s) => renderChip(s))}
                  </div>
                )}
              </div>
            )
          })}
          {skills.length === 0 && (
            <div className="py-10 text-center"><p className="text-2xl mb-2">⚡</p><p className="text-sm text-ink-500">尚未新增技能</p></div>
          )}
        </div>
      )}
    </div>
  )
}
