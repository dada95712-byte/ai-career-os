import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  try {
    const { role, company } = await req.json()
    if (!role) return NextResponse.json({ error: '請輸入目標職位' }, { status: 400 })

    const prompt = `你是台灣人資顧問，請為「${role}」${company ? `（應徵${company}）` : ''}生成 8 道面試題目。

請以 JSON 格式回傳：
{
  "questions": [
    {
      "id": "q1",
      "question": "面試題目（繁體中文）",
      "type": "behavioral" | "technical" | "situational" | "general"
    }
  ]
}

題目分配建議：
- 2 題行為面試（過去的行為）
- 2 題技術面試（${role}相關技能）
- 2 題情境題（假設情境處理）
- 2 題一般題（動機、職涯規劃）

${company ? `請結合${company}的企業文化和業務性質出題。` : ''}

只回傳 JSON。`

    const response = await callAI(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('解析失敗')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('Interview questions error:', err)
    return NextResponse.json({ error: '生成題目失敗，請再試一次' }, { status: 500 })
  }
}
