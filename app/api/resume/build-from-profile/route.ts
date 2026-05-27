import { callAI } from '@/lib/ai-client'
import { NextResponse } from 'next/server'
import { extractJSON } from '@/lib/extract-json'

const RESUME_JSON_SCHEMA = `{"name":"","email":"","phone":"","jobTitle":"","location":"","linkedin":"","website":"","summary":"","skills":[],"experiences":[{"company":"","title":"","description":"","startDate":"","endDate":"","current":false}],"education":[{"school":"","degree":"","major":"","year":"","startDate":"","endDate":""}],"languages":[{"name":"","level":""}],"certifications":[{"name":"","issuer":"","issueDate":"","expiryDate":"","neverExpires":false,"credentialId":"","credentialUrl":""}],"conferences":[{"name":"","organizer":"","date":"","role":"","description":""}],"activities":[{"name":"","organization":"","date":"","role":"","description":""}],"rawText":""}`

export async function POST(req: Request) {
  try {
    const { profile, language } = await req.json() as {
      profile: Record<string, unknown>
      language: 'zh' | 'en'
    }

    const langLabel = language === 'en' ? 'English' : '繁體中文'
    const systemPrompt = `你是專業履歷撰寫助手。
規則：
- 只能使用提供的個人檔案庫資料，嚴禁推論、補充或創造任何未提供的資訊
- 若某欄位在資料中為空，則在輸出中填空字串或空陣列，不要省略欄位
- summary 根據提供的資料撰寫，不超過 150 字，語言使用${langLabel}
- 所有文字內容使用${langLabel}
- 回傳純 JSON，不要包含任何說明文字`

    const prompt = `根據以下個人檔案庫資料，生成一份完整履歷。

個人檔案庫資料：
${JSON.stringify(profile, null, 2).slice(0, 8000)}

請回傳以下格式的純 JSON：
${RESUME_JSON_SCHEMA}`

    const raw = await callAI(prompt, systemPrompt)
    const resume = extractJSON<Record<string, unknown>>(raw)
    return NextResponse.json({ resume: { ...resume, lang: language } })
  } catch (err) {
    console.error('[resume/build-from-profile]', err)
    return NextResponse.json({ error: '生成失敗，請稍後再試' }, { status: 500 })
  }
}
