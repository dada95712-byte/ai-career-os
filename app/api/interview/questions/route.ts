import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  try {
    const { role, company } = await req.json()
    if (!role) return NextResponse.json({ error: '請輸入目標職位' }, { status: 400 })

    const prompt = `你是台灣人資顧問，請為「${role}」${company ? `（應徵${company}）` : ''}生成 8 道面試題目。

每道題目同時提供中文版和英文版。

請以 JSON 格式回傳：
{
  "questions": [
    {
      "id": "q1",
      "question": "面試題目（繁體中文）",
      "questionEn": "Interview question (English)",
      "type": "behavioral" | "technical" | "situational" | "general"
    }
  ]
}

題目分配：
- 2 題行為面試（behavioral）
- 2 題技術面試（technical，與${role}相關技能）
- 2 題情境題（situational）
- 2 題一般題（general，動機、職涯規劃）

${company ? `請結合${company}的企業文化出題。` : ''}

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
