import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'
import { extractJSON } from '@/lib/extract-json'

export async function POST(req: NextRequest) {
  try {
    const { company, title, jd_content } = await req.json()
    if (!company) return NextResponse.json({ error: '請輸入公司名稱' }, { status: 400 })

    const titleSection = title ? `和職位「${title}」` : ''
    const jdSection = jd_content
      ? `\n職務說明（JD）參考：\n${String(jd_content).slice(0, 2000)}\n`
      : ''

    const prompt = `你是台灣資深職涯顧問，請根據公司「${company}」${titleSection}提供求職者面試前必知的深度分析。${jdSection}

以繁體中文回答，只回傳如下 JSON，不要其他文字：

{
  "basicInfo": "公司基本資訊（產業別、規模、成立背景、主要業務、近期重要動態）",
  "culture": "企業文化（工作節奏快慢、加班文化、年終慣例、三節福利、WFH政策等，不確定請標注「需自行確認」）",
  "rolePosition": "職位定位（此職位在組織的重要性、預計彙報層級、主要跨部門合作對象）",
  "interviewProcess": "面試流程情報（輪數、形式、測驗類型。請加註：以上為常見情況，以公司官方說明為準）",
  "salaryNegotiation": "談薪建議（台灣市場薪資區間 NTD、開口策略與話術，不確定請標注「需自行確認」）",
  "competitors": ["競爭對手1", "競爭對手2", "競爭對手3"],
  "roleTrend": {
    "recruitmentHeat": "高 或 中 或 低",
    "topSkills": ["技能1", "技能2", "技能3", "技能4", "技能5"],
    "threeMonthTrend": "近3個月台灣此類職位的招募趨勢分析（2-3句話）"
  }
}

重要原則：
- 不確定的資訊請標注「需自行確認」
- 薪資範圍用區間表示，不要捏造具體數字
- competitors 只填公司名稱，3-5個`

    const response = await callAI(prompt)
    const result = extractJSON(response)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Company analysis error:', err)
    return NextResponse.json({ error: '分析失敗，請再試一次' }, { status: 500 })
  }
}
