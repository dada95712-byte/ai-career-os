import { NextRequest, NextResponse } from 'next/server'
import { extractJSON } from '@/lib/extract-json'

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceType = 'search_result' | 'jd_inference' | 'general_inference' | null

interface SourcedText {
  content: string | null
  source: SourceType
  sourceUrl?: string | null
}

// ── Raw fetch wrapper with OpenRouter web-search plugin ───────────────────────

async function callWithSearch(
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY not set')

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user',   content: userPrompt },
  ]

  const tryFetch = async (usePlugin: boolean) => {
    const body: Record<string, unknown> = {
      model: 'meta-llama/llama-3.3-70b-instruct:free',
      messages,
    }
    if (usePlugin) body.plugins = [{ id: 'web' }]

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const content = data?.choices?.[0]?.message?.content
    if (!content) throw new Error('Empty response')
    return content as string
  }

  // Try with web search plugin; fall back to standard call
  try {
    return await tryFetch(true)
  } catch {
    return await tryFetch(false)
  }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { company, title, jd_content } = await req.json()
    if (!company) return NextResponse.json({ error: '請輸入公司名稱' }, { status: 400 })

    const titlePart = title ? `和職位「${title}」` : ''
    const jdSection = jd_content
      ? `\n以下是職缺 JD（僅用於推斷企業文化）：\n${String(jd_content).slice(0, 1500)}`
      : ''

    // Step 1 & 2 — salary + trend search queries (included in single prompt)
    const salarySearchNote = title
      ? `請搜尋「${title} 薪資 台灣 2026」和「${title} 月薪 台灣」，只使用搜尋結果中的數字。`
      : '無職位名稱，薪資區塊回傳 null。'
    const trendSearchNote = `請搜尋「${title || company} 招募趨勢 2026 台灣」和「${title || company} 職缺 台灣 2026」，根據結果摘要趨勢。`
    const companySearchNote = `請搜尋「${company} 官網 台灣」和「${company} 競爭對手 台灣」取得公司資訊。`

    const system = '你是台灣資深職涯顧問兼資料驗證專家，對資料來源極度謹慎，絕不捏造數字或無法驗證的資訊。請用繁體中文回答。'

    // Step 3 — enhanced source-labelling rules in prompt
    const prompt = `請分析公司「${company}」${titlePart}。${jdSection}

**搜尋指示**：
- ${companySearchNote}
- ${salarySearchNote}
- ${trendSearchNote}

**嚴格規則 — 違反即為失敗**：
1. 每條資訊必須附 source 欄位：
   - "search_result"：有搜尋到的真實資料，附 sourceUrl（完整網址）
   - "jd_inference"：僅根據提供 JD 原文推測，無 JD 時不得使用
   - "general_inference"：同產業一般推測，需在 content 中加「建議自行確認」
   - null：完全不確定，content 也必須為 null
2. **絕對禁止**：員工確切人數、確切年營收、無法搜尋到的內部薪資數字
3. 薪資一律用「NTD XX~YY 萬 / 月」區間，且必須說明資料來源
4. 企業文化：僅根據 JD 推測（source="jd_inference"），無 JD 則用 general_inference
5. 面試流程：source 必須為 "general_inference"，content 結尾必須加上「⚠ 以上為常見情況，請以公司官方說明為準」
6. 競爭對手：搜尋到則填 search_result，否則根據產業知識填 general_inference

只回傳如下 JSON，不要其他文字：
{
  "basicInfo": {
    "content": "公司基本資訊（產業別、規模、主要業務），或 null",
    "source": "search_result | general_inference | null",
    "sourceUrl": "搜尋到的網址或 null"
  },
  "culture": {
    "content": "企業文化（工作節奏、加班、年終），或 null",
    "source": "jd_inference | general_inference | null"
  },
  "rolePosition": {
    "content": "職位定位（組織重要性、彙報層級、跨部門合作），或 null",
    "source": "general_inference | null"
  },
  "interviewProcess": {
    "content": "面試流程情報（⚠ 以上為常見情況，請以公司官方說明為準），或 null",
    "source": "general_inference | null"
  },
  "salaryNegotiation": {
    "content": "談薪建議與市場行情區間，或 null",
    "source": "search_result | general_inference | null",
    "sourceUrl": "薪資來源網址或 null"
  },
  "competitors": {
    "names": ["競爭對手1", "競爭對手2", "競爭對手3"],
    "source": "search_result | general_inference | null",
    "sourceUrl": "搜尋來源網址或 null"
  },
  "roleTrend": {
    "recruitmentHeat": "高 | 中 | 低 | null",
    "topSkills": ["技能1", "技能2", "技能3", "技能4", "技能5"],
    "threeMonthTrend": "近3個月趨勢說明（附搜尋依據），或 null",
    "source": "search_result | general_inference | null",
    "sourceUrl": "趨勢來源網址或 null"
  }
}`

    const raw = await callWithSearch(system, prompt)
    const result = extractJSON(raw)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Company analysis error:', err)
    return NextResponse.json({ error: '分析失敗，請再試一次' }, { status: 500 })
  }
}
