import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'
import { extractJSON } from '@/lib/extract-json'

export async function POST(req: NextRequest) {
  try {
    const { targetRole, currentSkills } = await req.json()
    if (!targetRole) return NextResponse.json({ error: '請輸入目標職位' }, { status: 400 })

    const prompt = `你是台灣職涯顧問，請分析「${targetRole}」這個職位需要的核心技能，並評估${currentSkills ? `求職者目前的技能（${currentSkills}）` : '一般求職者'}與該職位的差距。

請以 JSON 格式回傳（分析 5-8 個核心技能面向）：
{
  "gaps": [
    {
      "skill": "技能名稱",
      "status": "has" | "partial" | "missing",
      "importance": "high" | "medium" | "low",
      "resources": [
        {
          "name": "推薦資源名稱",
          "url": "連結（選填）",
          "time": "預估時間，例如：2週",
          "difficulty": "難度：入門/中等/進階"
        }
      ]
    }
  ]
}

注意：
- status "has" 表示已具備，"partial" 表示部分具備，"missing" 表示完全缺乏
- 推薦台灣在地資源（Hahow、ALPHA Camp、PressPlay），或國際平台（Coursera、YouTube）
- has 狀態的技能不需要 resources

只回傳 JSON。`

    const response = await callAI(prompt)
    const result = extractJSON(response)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Skill gap error:', err)
    return NextResponse.json({ error: '分析失敗，請再試一次' }, { status: 500 })
  }
}
