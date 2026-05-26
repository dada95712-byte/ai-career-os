import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'
import { extractJSON } from '@/lib/extract-json'

const BREAKDOWN: Record<number, { behavioral: number; situational: number; technical: number; general: number }> = {
  10: { behavioral: 3, situational: 3, technical: 2, general: 2 },
  15: { behavioral: 5, situational: 5, technical: 3, general: 2 },
  20: { behavioral: 7, situational: 6, technical: 4, general: 3 },
}

export async function POST(req: NextRequest) {
  try {
    const { role, company, questionCount = 15 } = await req.json()
    if (!role) return NextResponse.json({ error: '請輸入目標職位' }, { status: 400 })

    const count = [10, 15, 20].includes(questionCount) ? questionCount : 15
    const b = BREAKDOWN[count]

    const prompt = `你是台灣資深人資顧問，請根據職位「${role}」${company ? `和公司「${company}」` : ''}，生成 ${count} 道面試題目。

題目分配：
- ${b.behavioral} 道行為面試題（Behavioral）：請描述過去經驗，以 STAR 方法回答最佳
- ${b.situational} 道情境題（Situational）：假設性情境，考察判斷與應變能力
- ${b.technical} 道職位專業題（Technical）：考察與「${role}」相關的核心知識與技能
- ${b.general} 道通用題（General）：自我介紹、職涯規劃、優缺點等

每道題目同時提供繁體中文和英文版本。${company ? `\n請結合「${company}」的企業背景與文化出題。` : ''}

只回傳如下 JSON，不要其他文字：
{
  "questions": [
    {
      "id": "q1",
      "question": "面試題目（繁體中文）",
      "questionEn": "Interview question (English)",
      "type": "behavioral"
    }
  ]
}

type 只能是：behavioral | situational | technical | general`

    const response = await callAI(prompt)
    const result = extractJSON(response)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Interview questions error:', err)
    return NextResponse.json({ error: '生成題目失敗，請再試一次' }, { status: 500 })
  }
}
