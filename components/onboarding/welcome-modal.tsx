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
  { value: 'resume', icon: '📄', label: '優化履歷' },
  { value: 'jobs', icon: '🔍', label: '找職缺' },
  { value: 'interview', icon: '🎤', label: '準備面試' },
  { value: 'skills', icon: '⚡', label: '提升技能' },
]

interface WelcomeModalProps {
  userName: string
  onComplete: (status: Status, goal: Goal) => void
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
  const [status, setStatus] = useState<Status | null>(null)
  const [goal, setGoal] = useState<Goal | null>(null)

  function goTo(next: number) {
    setVisible(false)
    setTimeout(() => {
      setStep(next)
      setVisible(true)
    }, 150)
  }

  function handleSkip() {
    onSkip()
  }

  function handleComplete() {
    if (status && goal) onComplete(status, goal)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(75,64,56,0.4)' }}>
      <div
        className="relative w-full max-w-[520px] mx-4 rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: '0 8px 40px rgba(100,70,40,0.18)' }}
      >
        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 pt-6 pb-2">
          {[1, 2, 3, 4].map((s) => (
            <span
              key={s}
              style={{
                display: 'inline-block',
                height: 6,
                width: s === step ? 20 : 6,
                borderRadius: 9999,
                background: s === step ? '#C97941' : '#E6DDD2',
                transition: 'all 0.2s',
              }}
            />
          ))}
        </div>

        {/* Skip button */}
        {step < 4 && (
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-xs text-[#9E8E82] hover:text-[#4B4038] transition-colors"
          >
            跳過
          </button>
        )}

        {/* Step content */}
        <div
          style={{
            padding: '24px 32px 32px',
            transition: 'opacity 0.15s',
            opacity: visible ? 1 : 0,
          }}
        >
          {step === 1 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🌿</div>
              <h2 className="text-xl font-semibold" style={{ color: '#4B4038' }}>
                歡迎回來，{userName}！
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: '#8A7A72' }}>
                AI Career OS 是你的個人職涯助理。<br />
                讓我們花 30 秒設定你的目標，讓 AI 更了解你。
              </p>
              <button
                onClick={() => goTo(2)}
                className="mt-2 w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
                style={{ background: '#C97941' }}
              >
                開始設定 →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#4B4038' }}>你目前的狀態是？</h2>
                <p className="text-xs mt-1" style={{ color: '#9E8E82' }}>這幫助我們為你推薦最合適的功能</p>
              </div>
              <div className="space-y-2">
                {STATUS_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={optionCardCls(status === opt.value)}
                    onClick={() => setStatus(opt.value)}
                  >
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
              <button
                onClick={() => status && goTo(3)}
                disabled={!status}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                style={{ background: '#C97941', opacity: status ? 1 : 0.4, cursor: status ? 'pointer' : 'not-allowed' }}
              >
                下一步 →
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: '#4B4038' }}>你最想達成什麼目標？</h2>
                <p className="text-xs mt-1" style={{ color: '#9E8E82' }}>選一個最重要的，之後可以隨時調整</p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {GOAL_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    className={optionCardCls(goal === opt.value)}
                    onClick={() => setGoal(opt.value)}
                  >
                    <span className="block text-2xl mb-1">{opt.icon}</span>
                    <span className="block text-sm font-medium" style={{ color: '#4B4038' }}>{opt.label}</span>
                  </button>
                ))}
              </div>
              <button
                onClick={() => goal && goTo(4)}
                disabled={!goal}
                className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity"
                style={{ background: '#C97941', opacity: goal ? 1 : 0.4, cursor: goal ? 'pointer' : 'not-allowed' }}
              >
                下一步 →
              </button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center space-y-4">
              <div className="text-5xl">🎉</div>
              <h2 className="text-xl font-semibold" style={{ color: '#4B4038' }}>設定完成！</h2>
              <p className="text-sm leading-relaxed" style={{ color: '#8A7A72' }}>
                我們已根據你的目標準備好個人化任務清單。<br />
                從今天的任務開始，逐步建立你的職涯優勢。
              </p>
              <button
                onClick={handleComplete}
                className="mt-2 w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90"
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
