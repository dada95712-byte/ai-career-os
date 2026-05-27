import { callAI } from '@/lib/ai-client'
import { NextResponse } from 'next/server'
import { extractJSON } from '@/lib/extract-json'

const RESUME_JSON_SCHEMA = `{"jobTitle":"","name":"","email":"","phone":"","location":"","linkedin":"","website":"","summary":"","skills":[],"experiences":[{"company":"","title":"","description":"","startDate":"","endDate":"","current":false}],"education":[{"school":"","degree":"","major":"","year":"","startDate":"","endDate":""}],"languages":[{"name":"","level":""}],"certifications":[{"name":"","issuer":"","issueDate":"","expiryDate":"","neverExpires":false,"credentialId":"","credentialUrl":""}],"conferences":[{"name":"","organizer":"","date":"","role":"","description":""}],"activities":[{"name":"","organization":"","date":"","role":"","description":""}],"rawText":""}`

export async function POST(req: Request) {
  try {
    const { profile, jd, language } = await req.json() as {
      profile: Record<string, unknown>
      jd: string
      language: 'zh' | 'en'
    }
    if (!jd?.trim()) return NextResponse.json({ error: '請提供 JD 內容' }, { status: 400 })

    const langLabel = language === 'en' ? 'English' : '繁體中文'
    const systemPrompt = `你是專業履歷客製化助手。
規則：
- 只能使用提供的個人檔案庫資料，嚴禁推論、補充或創造任何未提供的資訊
- 根據 JD 選擇最相關的技能、經歷，調整措辭以符合 JD 語言風格（不得更改實際內容）
- summary 針對 JD 撰寫，不超過 150 字，語言使用${langLabel}
- 所有文字內容使用${langLabel}
- 從 JD 擷取 jobTitle（職位名稱），放入 JSON 的 jobTitle 欄位
- 回傳純 JSON，不要包含任何說明文字`

    const prompt = `根據以下職位描述（JD）和個人檔案庫資料，生成一份客製化履歷。

職位描述（JD）：
${jd.slice(0, 3000)}

個人檔案庫資料：
${JSON.stringify(profile, null, 2).slice(0, 6000)}

請回傳以下格式的純 JSON：
${RESUME_JSON_SCHEMA}`

    const raw = await callAI(prompt, systemPrompt)
    const resume = extractJSON<Record<string, unknown>>(raw)
    const jobTitle = (resume.jobTitle as string) || ''
    return NextResponse.json({ resume: { ...resume, lang: language }, jobTitle })
  } catch (err) {
    console.error('[resume/customize-for-jd]', err)
    return NextResponse.json({ error: '生成失敗，請稍後再試' }, { status: 500 })
  }
}
