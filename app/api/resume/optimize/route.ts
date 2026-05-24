import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: Request) {
  try {
    const { title, company, description } = await req.json()

    const prompt = `請優化以下工作描述，使其更有影響力且 ATS 友善。要求：
1. 使用強力動詞開頭（負責、主導、設計、推動等）
2. 盡量量化成果（如：提升 XX%、管理 XX 人）
3. 突出核心貢獻和技術棧
4. 分 3-4 個要點，每點以 • 開頭
5. 保持繁體中文

職稱：${title || '（未填）'}
公司：${company || '（未填）'}
原描述：${description || '（未填）'}

只回傳優化後的條列文字，不要其他說明。`

    const optimized = await callAI(prompt, '你是一位專業的履歷撰寫顧問，請用繁體中文回答。')
    return NextResponse.json({ description: optimized.trim() })
  } catch {
    return NextResponse.json({ error: '優化失敗' }, { status: 500 })
  }
}
