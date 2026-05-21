import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  try {
    const { question, answer } = await req.json()
    if (!question || !answer) {
      return NextResponse.json({ error: '缺少題目或答案' }, { status: 400 })
    }

    const prompt = `你是台灣人資面試官，請評估以下面試題目與回答，並以 JSON 格式回傳：
{
  "score": <評分 1-10>,
  "feedback": "詳細回饋（繁體中文，包含：優點、需改善處、具體建議）"
}

面試題目：${question}

求職者回答：${answer}

評分標準：
- 10分：完整的 STAR 結構、具體量化成果、印象深刻
- 7-9分：結構清晰、有具體例子、略缺量化
- 4-6分：有基本內容但缺乏組織或細節
- 1-3分：過於模糊、無具體例子或明顯偏題

請提供至少 2 條具體改善建議。只回傳 JSON。`

    const response = await callAI(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('解析失敗')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('Interview evaluate error:', err)
    return NextResponse.json({ error: '評分失敗，請再試一次' }, { status: 500 })
  }
}
