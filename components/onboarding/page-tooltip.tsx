'use client'

import { useEffect, useState } from 'react'

type PageKey = 'resume_lab' | 'skills' | 'application_tracker' | 'skill_map' | 'interviews' | 'analytics'

const TOOLTIP_CONTENT: Record<PageKey, { title: string; body: string }> = {
  resume_lab: {
    title: '📄 履歷管理中心',
    body: '這裡管理你所有的履歷。上傳後 AI 自動評分，找出 ATS 盲點，讓你的履歷通過篩選關卡。',
  },
  skills: {
    title: '⚡ 你的技能資料庫',
    body: '自動用於職缺匹配與技能落差分析。定期更新技能，讓 AI 推薦更精準的學習路徑。',
  },
  application_tracker: {
    title: '📋 求職進度看板',
    body: '管理你的求職進度，貼上 JD 讓 AI 解析關鍵資訊，追蹤每間公司的面試狀態。',
  },
  skill_map: {
    title: '📊 技能落差分析',
    body: '找出你的技能缺口。貼上 JD 比對技能庫，AI 列出需要補強的項目與學習建議。',
  },
  interviews: {
    title: '🎤 AI 模擬面試',
    body: '模擬真實面試場景，支援語音回答。練習後 AI 給出評分與改善建議，幫你找到最佳答案。',
  },
  analytics: {
    title: '📈 職涯數據中心',
    body: '你的求職統計一目了然。追蹤投遞數、面試率、回覆率，找出求職策略的優化方向。',
  },
}

interface PageTooltipProps {
  pageKey: PageKey
}

export function PageTooltip({ pageKey }: PageTooltipProps) {
  const [show, setShow] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const key = `tooltip_seen_${pageKey}`
    if (!localStorage.getItem(key)) {
      setShow(true)
      setTimeout(() => setMounted(true), 10)
    }
  }, [pageKey])

  function dismiss() {
    setMounted(false)
    setTimeout(() => {
      setShow(false)
      localStorage.setItem(`tooltip_seen_${pageKey}`, 'true')
    }, 300)
  }

  if (!show) return null

  const content = TOOLTIP_CONTENT[pageKey]

  return (
    <div
      style={{
        background: '#F0F5F1',
        border: '1px solid #C8DDD0',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        opacity: mounted ? 1 : 0,
        transform: mounted ? 'translateY(0)' : 'translateY(-8px)',
        transition: 'opacity 0.3s, transform 0.3s',
      }}
    >
      <span style={{ fontSize: 20, lineHeight: 1.4, flexShrink: 0 }}>🌿</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#3A5444', margin: 0 }}>{content.title}</p>
        <p style={{ fontSize: 12, color: '#5C7A68', margin: '4px 0 0', lineHeight: 1.6 }}>{content.body}</p>
      </div>
      <button
        onClick={dismiss}
        style={{
          flexShrink: 0,
          fontSize: 12,
          color: '#5C7A68',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '2px 0',
          whiteSpace: 'nowrap',
        }}
      >
        ✕ 了解了
      </button>
    </div>
  )
}
