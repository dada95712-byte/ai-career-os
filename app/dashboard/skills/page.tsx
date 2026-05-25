'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

// ── Types ──────────────────────────────────────────────────────────────────────

const SKILL_CATEGORIES = ['專業技能', '工具與軟體', '核心職能', '軟實力', '語言能力', '證照與認證', '學習中'] as const
type SkillCategory = typeof SKILL_CATEGORIES[number]
interface TaggedSkill { name: string; category: SkillCategory }

const CATEGORY_COLORS: Record<SkillCategory, string> = {
  '專業技能':   'bg-terra-50 border-terra-200 text-terra-600',
  '工具與軟體': 'bg-sky-50 border-sky-200 text-sky-600',
  '核心職能':   'bg-violet-50 border-violet-200 text-violet-600',
  '軟實力':     'bg-sage-50 border-sage-200 text-sage-600',
  '語言能力':   'bg-honey-50 border-amber-200 text-honey-500',
  '證照與認證': 'bg-cream-200 border-warm-300 text-ink-600',
  '學習中':     'bg-orange-50 border-orange-200 text-orange-500',
}

function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
    </svg>
  )
}

// ── Usage cards ────────────────────────────────────────────────────────────────

const USAGE_CARDS = [
  {
    icon: '🎯',
    title: '職缺匹配',
    desc: '比對職缺要求，計算匹配分數',
    href: '/career-match',
    label: '前往 Job Pipeline',
    bg: 'bg-terra-50',
    iconBg: 'bg-terra-100',
    border: 'border-terra-200',
    hoverBorder: 'hover:border-terra-300',
    textColor: 'text-terra-600',
  },
  {
    icon: '📊',
    title: '技能落差',
    desc: '找出與目標職位的技能差距',
    href: '/career-growth',
    label: '前往 Skill Map',
    bg: 'bg-violet-50',
    iconBg: 'bg-violet-100',
    border: 'border-violet-200',
    hoverBorder: 'hover:border-violet-300',
    textColor: 'text-violet-600',
  },
  {
    icon: '🎤',
    title: '面試準備',
    desc: '根據你的技能生成針對性題目',
    href: '/interview-prep',
    label: '前往 Interviews',
    bg: 'bg-sky-50',
    iconBg: 'bg-sky-100',
    border: 'border-sky-200',
    hoverBorder: 'hover:border-sky-300',
    textColor: 'text-sky-600',
  },
]

// ── Component ──────────────────────────────────────────────────────────────────

export default function SkillsPage() {
  const [skills, setSkills]           = useState<TaggedSkill[]>([])
  const [newSkill, setNewSkill]       = useState('')
  const [newSkillCat, setNewSkillCat] = useState<SkillCategory>('核心職能')
  const [skillView, setSkillView]     = useState<'category' | 'all'>('category')
  const [collapsedCats, setCollapsedCats] = useState<Set<SkillCategory>>(new Set())
  const [dupAlert, setDupAlert]       = useState('')
  const [editingSkill, setEditingSkill] = useState<{
    originalName: string; newName: string; newCat: SkillCategory; x: number; y: number
  } | null>(null)
  const [recommendedSkills, setRecommendedSkills] = useState<TaggedSkill[]>([])
  const [checkedSkills, setCheckedSkills] = useState<Set<string>>(new Set())
  const [loadingRecommend, setLoadingRecommend] = useState(false)
  const [showRecommend, setShowRecommend] = useState(false)

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

  function persist(next: TaggedSkill[]) {
    setSkills(next)
    try { localStorage.setItem('career-skills', JSON.stringify(next)) } catch { /* quota */ }
  }

  // ── Skill handlers ──────────────────────────────────────────────────────────

  function norm(s: string) { return s.toLowerCase().replace(/\s+/g, '') }

  function addSkill() {
    const t = newSkill.trim(); if (!t) return
    if (skills.some((s) => norm(s.name) === norm(t))) {
      setDupAlert('此技能已存在'); setTimeout(() => setDupAlert(''), 2500); return
    }
    persist([...skills, { name: t, category: newSkillCat }]); setNewSkill('')
  }

  function removeSkill(name: string) {
    persist(skills.filter((s) => s.name !== name))
    if (editingSkill?.originalName === name) setEditingSkill(null)
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

  function openSkillEdit(s: TaggedSkill, rect: DOMRect) {
    const x = Math.min(rect.left, window.innerWidth - 240)
    const y = rect.bottom + 6
    setEditingSkill({ originalName: s.name, newName: s.name, newCat: s.category, x, y })
  }

  function saveEditedSkill() {
    if (!editingSkill) return
    const trimmed = editingSkill.newName.trim(); if (!trimmed) return
    const conflict = skills.some((s) => norm(s.name) === norm(trimmed) && s.name !== editingSkill.originalName)
    if (conflict) { setDupAlert('此技能名稱已存在'); setTimeout(() => setDupAlert(''), 2500); return }
    persist(skills.map((s) => s.name === editingSkill.originalName ? { name: trimmed, category: editingSkill.newCat } : s))
    setEditingSkill(null)
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

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 space-y-6">

      {/* ── Header ── */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-ink-900">⚡ 我的技能庫</h1>
        <p className="mt-1 text-sm text-ink-500">管理你的技能，AI 將自動用於以下功能：</p>
      </div>

      {/* ── Usage cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {USAGE_CARDS.map((card) => (
          <Link key={card.href} href={card.href}
            className={`group flex items-start gap-4 rounded-2xl border ${card.border} ${card.hoverBorder} ${card.bg} p-4 transition-all duration-150 shadow-[var(--shadow-warm-xs)] hover:shadow-[var(--shadow-warm-sm)]`}>
            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.iconBg} text-xl`}>
              {card.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-semibold ${card.textColor}`}>{card.title}</p>
              <p className="text-xs text-ink-500 mt-0.5 leading-relaxed">{card.desc}</p>
              <p className={`text-[11px] font-medium ${card.textColor} mt-1.5 group-hover:underline`}>{card.label} →</p>
            </div>
          </Link>
        ))}
      </div>

      {/* ── Edit popover backdrop ── */}
      {editingSkill && (
        <div className="fixed inset-0 z-[90]" onClick={() => setEditingSkill(null)} />
      )}
      {editingSkill && (
        <div
          style={{ top: editingSkill.y, left: editingSkill.x }}
          className="fixed z-[91] w-56 rounded-2xl border border-warm-200 bg-white p-3 shadow-[var(--shadow-warm-md)] space-y-2">
          <div>
            <label className="block text-[10px] font-medium text-ink-400 mb-1">技能名稱</label>
            <input
              autoFocus
              value={editingSkill.newName}
              onChange={(e) => setEditingSkill((p) => p && { ...p, newName: e.target.value })}
              onKeyDown={(e) => { if (e.key === 'Enter') saveEditedSkill(); if (e.key === 'Escape') setEditingSkill(null) }}
              className="w-full rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1.5 text-sm text-ink-800 focus:border-terra-400 focus:outline-none" />
          </div>
          <div>
            <label className="block text-[10px] font-medium text-ink-400 mb-1">分類</label>
            <select
              value={editingSkill.newCat}
              onChange={(e) => setEditingSkill((p) => p && { ...p, newCat: e.target.value as SkillCategory })}
              className="w-full rounded-lg border border-warm-200 bg-cream-50 px-2.5 py-1.5 text-xs text-ink-700 focus:border-terra-400 focus:outline-none">
              {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex gap-1.5 pt-1">
            <button onClick={saveEditedSkill}
              className="flex-1 rounded-lg bg-terra-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-terra-700 transition-colors">
              儲存
            </button>
            <button onClick={() => removeSkill(editingSkill.originalName)}
              className="rounded-lg border border-warm-200 px-2.5 py-1.5 text-xs text-red-400 hover:border-red-200 hover:bg-red-50 transition-colors">
              刪除
            </button>
          </div>
        </div>
      )}

      {/* ── Add skill + controls ── */}
      <Card>
        <CardContent className="pt-5 space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input placeholder="例如：React、Python、專案管理" value={newSkill}
              onChange={(e) => setNewSkill(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') addSkill() }}
              className="flex-1" />
            <select value={newSkillCat} onChange={(e) => setNewSkillCat(e.target.value as SkillCategory)}
              className="rounded-xl border border-warm-300 bg-white px-3 py-2 text-sm text-ink-700 focus:border-terra-400 focus:outline-none">
              {SKILL_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <Button onClick={addSkill}>新增</Button>
          </div>
          {dupAlert && (
            <p className="text-xs text-terra-600 bg-terra-50 border border-terra-200 rounded-lg px-3 py-1.5">{dupAlert}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleRecommendSkills} loading={loadingRecommend}>🤖 AI 分析日誌推薦技能</Button>
            <button onClick={dedupSkills}
              className="rounded-lg border border-warm-200 bg-white px-3 py-1.5 text-xs text-ink-500 hover:border-warm-300 hover:text-ink-700 transition-colors">
              🔧 清除重複技能
            </button>
            <div className="flex gap-1 rounded-lg border border-warm-200 bg-white p-0.5 ml-auto">
              {(['category', 'all'] as const).map((v) => (
                <button key={v} onClick={() => setSkillView(v)}
                  className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${skillView === v ? 'bg-cream-200 text-ink-700' : 'text-ink-400'}`}>
                  {v === 'category' ? '分類視圖' : '全部顯示'}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── AI Recommend panel ── */}
      {showRecommend && (
        <Card className="border-terra-100">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>AI 推薦技能</CardTitle>
              <button onClick={() => setShowRecommend(false)} className="text-ink-400 hover:text-ink-600">×</button>
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
        <Card>
          <CardHeader><CardTitle>所有技能 <span className="text-ink-400 font-normal">({skills.length})</span></CardTitle></CardHeader>
          <CardContent>
            {skills.length === 0 ? (
              <div className="py-8 text-center"><p className="text-2xl mb-2">⚡</p><p className="text-sm text-ink-500">尚未新增技能</p></div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => (
                  <button key={s.name}
                    onClick={(e) => openSkillEdit(s, e.currentTarget.getBoundingClientRect())}
                    className={`flex items-center gap-1 rounded-full border pl-3 pr-2 py-1 transition-all hover:opacity-80 ${CATEGORY_COLORS[s.category]} ${editingSkill?.originalName === s.name ? 'ring-2 ring-terra-400 ring-offset-1' : ''}`}>
                    <span className="text-sm">{s.name}</span>
                    <span className="text-[10px] opacity-60">· {s.category}</span>
                    <span className="ml-1 opacity-40 text-xs">✎</span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {SKILL_CATEGORIES.map((cat) => {
            const catSkills = groupedSkills[cat]
            if (!catSkills.length) return null
            const collapsed = collapsedCats.has(cat)
            return (
              <Card key={cat}>
                <button className="w-full" onClick={() => toggleCat(cat)}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{cat} <span className="text-ink-400 font-normal">({catSkills.length})</span></CardTitle>
                      <span className="text-ink-300 text-xs">{collapsed ? '▶' : '▼'}</span>
                    </div>
                  </CardHeader>
                </button>
                {!collapsed && (
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-2">
                      {catSkills.map((s) => (
                        <button key={s.name}
                          onClick={(e) => { e.stopPropagation(); openSkillEdit(s, e.currentTarget.getBoundingClientRect()) }}
                          className={`flex items-center gap-1 rounded-full border pl-3 pr-2 py-1 transition-all hover:opacity-80 ${CATEGORY_COLORS[cat]} ${editingSkill?.originalName === s.name ? 'ring-2 ring-terra-400 ring-offset-1' : ''}`}>
                          <span className="text-sm">{s.name}</span>
                          <span className="ml-1 opacity-40 text-xs">✎</span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
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
