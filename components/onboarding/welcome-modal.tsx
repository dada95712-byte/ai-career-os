'use client'

import { useState } from 'react'

type Status = 'active_search' | 'passive' | 'just_started' | 'fresh_grad'
type Goal = 'resume' | 'jobs' | 'interview' | 'skills'

const STATUS_OPTIONS: { value: Status; icon: string; label: string; desc: string }[] = [
  { value: 'active_search', icon: '🔥', label: '積極求職中', desc: '正在投遞履歷，積極找工作' },
  { value: 'passive', icon: '👀', label: '被動觀望中', desc: '目前有工作，看看有沒有更好機會' },
  { value: 'just_started', icon: '🌱', label: '剛入職不久', desc: '最近換工作，想在新環境站穩腳步' },
  { value: 'fresh_grad', icon: '🎓', label: '應屆畢業生', desc: '剛畢業或即將畢業，準備踏入職場' },
]

const GOAL_OPTIONS: { value: Goal; icon: string; label: string }[] = [
  { value: 'resume',    icon: '📄', label: '優化履歷' },
  { value: 'jobs',      icon: '🔍', label: '找職缺' },
  { value: 'interview', icon: '🎤', label: '準備面試' },
  { value: 'skills',    icon: '⚡', label: '提升技能' },
]

const TOTAL = 3

interface WelcomeModalProps {
  userName: string
  onComplete: (status: Status, goal: Goal, nameZh: string, targetRole: string) => void
  onSkip: () => void
}

function optionCardCls(selected: boolean) {
  return [
    'w-full text-left rounded-xl p-4 border transition-all cursor-pointer',
    selected
      ? 'border-[#C97941] bg-[#FDF6F0]'
      : 'border-[#E6DDD2] bg-[#FDFAF7] hover:border-[#C97941]/50',
  ].join(' ')
}

export function WelcomeModal({ userName, onComplete, onSkip }: WelcomeModalProps) {
  const [step, setStep] = useState(1)
  const [visible, setVisible] = useState(true)
  const [nameZh, setNameZh] = useState(userName !== '求職者' ? userName : '')
  const [status, setStatus] = useState<Status | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)
  const [targetRole, setTargetRole] = useState('')

  function goTo(next: number) {
    setVisible(false)
    setTimeout(() => { setStep(next); setVisible(true) }, 150)
  }

  function handleComplete() {
    if (status && goal) {
      const savedName = nameZh.trim() || userName
      if (savedName) {
        try {
          const existing = JSON.parse(localStorage.getItem('profile-basic') ?? '{}')
          localStorage.setItem('profile-basic', JSON.stringify({ ...existing, nameZh: savedName }))
        } catch { /* ignore */ }
      }
      onComplete(status, goal, savedName, targetRole.trim())
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(75,64,56,0.4)' }}>
      <div
        className="relative w-full max-w-[520px] mx-4 rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(100,70,40,0.18)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {Array.from({ length: TOTAL }, (_, i) => i + 1).map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-block',
                height: 6,
                width: s === step ? 20 : 6,
                borderRadius: 9999,
                background: s <= step ? '#C97941' : '#E6DDD2',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Skip button */}
        {step < TOTAL && (
          <button
            onClick={onSkip}
            className="absolute top-4 right-4 text-xs text-[#9E8E82] hover:text-[#4B4038] transition-colors"
          >
            跳過
          </button>
        )}

        {/* Step content */}
        <div style={{ padding: '24px 32px 32px', transition: 'opacity 0.15s', opacity: visible ? 1 : 0 }}>

          {/* Step 1 — Profile: name + status */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#4B4038' }}>歡迎來到 WorkLog！</h2>
                <p className="text-xs mt-1" style={{ color: '#9E8E82' }}>花 30 秒設定，讓工具更了解你</p>
              </div>

              {/* Name input */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#6B5E56' }}>你的名字</label>
                <input
                  type="text"
                  value={nameZh}
                  onChange={(e) => setNameZh(e.target.value)}
                  placeholder="例如：小明、Dada"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                  style={{
                    border: '1px solid #E6DDD2',
                    color: '#4B4038',
                    background: '#FDFAF7',
                  }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#C97941')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E6DDD2')}
                />
              </div>

              {/* Status */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#6B5E56' }}>你目前的狀態</label>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button key={opt.value} className={optionCardCls(status === opt.value)} onClick={() => setStatus(opt.value)}>
                      <span className="flex items-center gap-3">
                        <span className="text-xl">{opt.icon}</span>
                        <span>
                          <span className="block text-sm font-medium" style={{ color: '#4B4038' }}>{opt.label}</span>
                          <span className="block text-xs mt-0.5" style={{ color: '#9E8E82' }}>{opt.desc}</span>
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => status && goTo(2)}
                disabled={!status}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                style={{ background: '#C97941', opacity: status ? 1 : 0.4, cursor: status ? 'pointer' : 'not-allowed' }}
              >
                下一步 →
              </button>
            </div>
          )}

          {/* Step 2 — Job: target role + goal */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#4B4038' }}>你的求職目標</h2>
                <p className="text-xs mt-1" style={{ color: '#9E8E82' }}>幫助我們推薦最合適的工具與任務</p>
              </div>

              {/* Target role */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#6B5E56' }}>目標職位（選填）</label>
                <input
                  type="text"
                  value={targetRole}
                  onChange={(e) => setTargetRole(e.target.value)}
                  placeholder="例如：前端工程師、產品經理"
                  className="w-full rounded-xl border px-4 py-3 text-sm outline-none transition-colors"
                  style={{ border: '1px solid #E6DDD2', color: '#4B4038', background: '#FDFAF7' }}
                  onFocus={e => (e.currentTarget.style.borderColor = '#C97941')}
                  onBlur={e => (e.currentTarget.style.borderColor = '#E6DDD2')}
                />
              </div>

              {/* Goal */}
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: '#6B5E56' }}>最想達成什麼目標？</label>
                <div className="grid grid-cols-2 gap-3">
                  {GOAL_OPTIONS.map((opt) => (
                    <button key={opt.value} className={optionCardCls(goal === opt.value)} onClick={() => setGoal(opt.value)}>
                      <span className="block text-2xl mb-1">{opt.icon}</span>
                      <span className="block text-sm font-medium" style={{ color: '#4B4038' }}>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => goTo(1)}
                  className="flex-1 py-3 rounded-xl text-sm font-medium transition-colors"
                  style={{ border: '1px solid #E6DDD2', color: '#9E8E82', background: '#FDFAF7' }}
                >
                  ← 上一步
                </button>
                <button
                  onClick={() => goal && goTo(3)}
                  disabled={!goal}
                  className="flex-1 py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                  style={{ background: '#C97941', opacity: goal ? 1 : 0.4, cursor: goal ? 'pointer' : 'not-allowed' }}
                >
                  下一步 →
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirmation */}
          {step === 3 && (
            <div className="text-center space-y-5">
              <div className="text-5xl">🎉</div>
              <div>
                <h2 className="text-xl font-semibold" style={{ color: '#4B4038' }}>
                  {nameZh.trim() ? `準備好了，${nameZh.trim()}！` : '一切就緒！'}
                </h2>
                <p className="text-sm mt-2 leading-relaxed" style={{ color: '#8A7A72' }}>
                  已根據你的目標準備好個人化任務清單。<br />
                  從今天的任務開始，逐步建立你的求職優勢。
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 text-left space-y-2" style={{ background: '#F8F4EF', border: '1px solid #E6DDD2' }}>
                {[
                  { icon: '👤', label: '狀態', value: STATUS_OPTIONS.find(o => o.value === status)?.label ?? '' },
                  { icon: '🎯', label: '目標', value: GOAL_OPTIONS.find(o => o.value === goal)?.label ?? '' },
                  ...(targetRole.trim() ? [{ icon: '💼', label: '目標職位', value: targetRole.trim() }] : []),
                ].map(row => (
                  <div key={row.label} className="flex items-center gap-2 text-sm">
                    <span>{row.icon}</span>
                    <span style={{ color: '#9E8E82' }}>{row.label}：</span>
                    <span style={{ color: '#4B4038', fontWeight: 500 }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleComplete}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: '#C97941' }}
              >
                進入 Dashboard 🚀
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
