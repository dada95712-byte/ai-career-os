import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  try {
    const { resumeText } = await req.json()
    if (!resumeText) return NextResponse.json({ error: '缺少履歷內容' }, { status: 400 })

    const prompt = `你是一位資深的台灣人資顧問，請評估以下履歷並以 JSON 格式回傳：
{
  "score": <整體評分 0-100>,
  "atsScore": <ATS 友善度評分 0-100>,
  "suggestions": ["改善建議1", "改善建議2", "改善建議3"],
  "keywords": ["重要關鍵字1", "重要關鍵字2", ...]
}

評分標準：
- 內容豐富度（有無量化成就）
- ATS 友善度（關鍵字、格式）
- 台灣職場適切性
- 清晰度與可讀性

履歷內容：
${resumeText.slice(0, 3000)}

請只回傳 JSON。`

    const response = await callAI(prompt)
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('AI 回傳格式錯誤')

    const result = JSON.parse(jsonMatch[0])
    return NextResponse.json(result)
  } catch (err) {
    console.error('Resume score error:', err)
    return NextResponse.json({ error: '評分失敗' }, { status: 500 })
  }
}
