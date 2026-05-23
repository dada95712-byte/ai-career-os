'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

/* ── Step data ───────────────────────────────────────────────── */
const GOALS = [
  { id: 'new_job',     icon: '🎯', title: '找到新工作',   sub: '正在積極求職' },
  { id: 'switch',      icon: '🔀', title: '轉換職涯跑道', sub: '從別的領域跳過來' },
  { id: 'upskill',     icon: '📈', title: '提升職場競爭力',sub: '在職精進技能' },
  { id: 'interview',   icon: '💬', title: '準備面試',     sub: '已有面試機會' },
]

const STAGES = [
  { id: 'student',     icon: '🎓', title: '在學學生',     sub: '大學 / 研究所' },
  { id: 'fresh',       icon: '🌱', title: '應屆畢業',     sub: '畢業不到 1 年' },
  { id: 'employed',    icon: '💼', title: '在職尋職',     sub: '目前有工作' },
  { id: 'unemployed',  icon: '🔍', title: '離職尋職',     sub: '目前無工作' },
]

const TOTAL_STEPS = 4

/* ── Component ───────────────────────────────────────────────── */
export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [goal, setGoal] = useState('')
  const [stage, setStage] = useState('')
  const [targetRole, setTargetRole] = useState('')
  const [loading, setLoading] = useState(false)

  function next() { if (step < TOTAL_STEPS) setStep(step + 1) }
  function back() { if (step > 1) setStep(step - 1) }

  async function finish() {
    setLoading(true)
    // Store preferences
    if (typeof window !== 'undefined') {
      localStorage.setItem('onboarding', JSON.stringify({ goal, stage, targetRole, completedAt: Date.now() }))
    }
    await new Promise((r) => setTimeout(r, 600)) // brief delay for feel
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-cream-100 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-ink-400">第 {step} 步，共 {TOTAL_STEPS} 步</span>
            <button onClick={() => router.push('/dashboard')} className="text-xs text-ink-300 hover:text-ink-500">
              跳過
            </button>
          </div>
          <div className="h-1 w-full rounded-full bg-warm-200 overflow-hidden">
            <div
              className="h-full rounded-full bg-terra-400 transition-all duration-500"
              style={{ width: `${(step / TOTAL_STEPS) * 100}%` }}
            />
          </div>
        </div>

        {/* Step 1 — Goal */}
        {step === 1 && (
          <StepFrame
            title="你最主要的職涯目標是？"
            sub="讓 AI 為你建立個人化的職涯路徑"
          >
            <OptionGrid options={GOALS} selected={goal} onSelect={setGoal} />
            <Button className="w-full mt-6" disabled={!goal} onClick={next}>
              繼續 →
            </Button>
          </StepFrame>
        )}

        {/* Step 2 — Stage */}
        {step === 2 && (
          <StepFrame
            title="你目前的狀態是？"
            sub="幫助 AI 理解你的起點"
          >
            <OptionGrid options={STAGES} selected={stage} onSelect={setStage} />
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={back}>← 上一步</Button>
              <Button className="flex-1" disabled={!stage} onClick={next}>繼續 →</Button>
            </div>
          </StepFrame>
        )}

        {/* Step 3 — Target role */}
        {step === 3 && (
          <StepFrame
            title="你的目標職位是？"
            sub="AI 將根據職位分析技能需求與面試題目"
          >
            <Input
              placeholder="例如：前端工程師、產品經理、數據分析師"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="text-base py-3"
              onKeyDown={(e) => e.key === 'Enter' && targetRole.trim() && next()}
              autoFocus
            />
            <p className="mt-2 text-xs text-ink-300">或輸入你感興趣的產業，例如：科技業、金融業</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {['前端工程師', '產品經理', '數據分析師', '軟體工程師', 'UI/UX 設計師'].map((r) => (
                <button
                  key={r}
                  onClick={() => setTargetRole(r)}
                  className={cn(
                    'rounded-full border px-3 py-1 text-xs transition-colors',
                    targetRole === r
                      ? 'border-terra-300 bg-terra-50 text-terra-600'
                      : 'border-warm-300 text-ink-400 hover:border-warm-400 hover:text-ink-600'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={back}>← 上一步</Button>
              <Button className="flex-1" disabled={!targetRole.trim()} onClick={next}>繼續 →</Button>
            </div>
          </StepFrame>
        )}

        {/* Step 4 — Ready */}
        {step === 4 && (
          <StepFrame
            title="一切就緒！"
            sub="你的 AI 職涯指揮中心已準備好"
          >
            <div className="rounded-2xl border border-warm-200 bg-cream-50 p-5 space-y-4 border-l-4 border-l-terra-400">
              {[
                { icon: '🎯', label: '職涯目標', value: GOALS.find((g) => g.id === goal)?.title ?? goal },
                { icon: '👤', label: '目前狀態', value: STAGES.find((s) => s.id === stage)?.title ?? stage },
                { icon: '💼', label: '目標職位', value: targetRole || '未設定' },
              ].map((row) => (
                <div key={row.label} className="flex items-center gap-3">
                  <span className="text-lg">{row.icon}</span>
                  <div>
                    <p className="text-[10px] text-ink-300 uppercase tracking-wide">{row.label}</p>
                    <p className="text-sm font-medium text-ink-800">{row.value}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-xl border border-sage-100 bg-sage-50 p-4">
              <p className="text-xs text-sage-700 leading-relaxed">
                🌿 AI 已根據你的資料準備了個人化任務清單。第一步建議上傳履歷，讓系統給出完整分析。
              </p>
            </div>

            <div className="flex gap-3 mt-6">
              <Button variant="outline" className="flex-1" onClick={back}>← 修改</Button>
              <Button variant="primary" className="flex-1" loading={loading} onClick={finish}>
                進入 Dashboard 🚀
              </Button>
            </div>
          </StepFrame>
        )}
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────────────────── */
function StepFrame({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="animate-fade-in-up">
      <h1 className="text-2xl font-bold text-ink-900 mb-1.5 tracking-tight">{title}</h1>
      <p className="text-sm text-ink-400 mb-8 leading-relaxed">{sub}</p>
      {children}
    </div>
  )
}

function OptionGrid({
  options,
  selected,
  onSelect,
}: {
  options: { id: string; icon: string; title: string; sub: string }[]
  selected: string
  onSelect: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onSelect(o.id)}
          className={cn(
            'rounded-2xl border p-4 text-left transition-all duration-150',
            selected === o.id
              ? 'border-terra-300 bg-terra-50 shadow-[var(--shadow-warm-md)]'
              : 'border-warm-200 bg-white hover:border-warm-300 hover:bg-cream-50 shadow-[var(--shadow-warm-xs)]'
          )}
        >
          <div className="text-2xl mb-2">{o.icon}</div>
          <p className={cn('text-sm font-semibold', selected === o.id ? 'text-terra-700' : 'text-ink-800')}>
            {o.title}
          </p>
          <p className="text-xs text-ink-400 mt-0.5">{o.sub}</p>
          {selected === o.id && (
            <div className="mt-2 flex items-center gap-1">
              <div className="h-1.5 w-1.5 rounded-full bg-terra-400" />
              <span className="text-[10px] text-terra-500">已選擇</span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}
