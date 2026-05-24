import { callAI } from '@/lib/ai-client'
import { NextResponse } from 'next/server'

const CATEGORIES = ['問題解決', '領導力', '跨部門協作', '技術實作', '客戶關係', '數據分析']

export async function POST(req: Request) {
  try {
    const { text } = await req.json()
    if (!text?.trim()) return NextResponse.json({ tags: [] })

    const result = await callAI(
      `根據以下工作日誌內容，從這些類別中選出最相關的 1–3 個標籤：

可選類別：${CATEGORIES.join('、')}

日誌內容：
${text.slice(0, 1000)}

請只回覆一個 JSON 陣列，例如：["問題解決", "技術實作"]
不要任何其他說明文字。`,
      '你是一個分析工作日誌的助手，請用繁體中文回答。'
    )

    const match = result.match(/\[[\s\S]*?\]/)
    const tags: string[] = match ? JSON.parse(match[0]) : []
    return NextResponse.json({ tags: tags.filter((t) => CATEGORIES.includes(t)) })
  } catch (err) {
    console.error('[journal/tag]', err)
    return NextResponse.json({ tags: [] })
  }
}
