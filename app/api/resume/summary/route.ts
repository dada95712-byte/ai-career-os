import { NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: Request) {
  try {
    const { name, jobTitle, skills, experiences } = await req.json()

    const expText = (experiences ?? [])
      .filter((e: { company?: string; title?: string; description?: string }) => e.company || e.title)
      .map((e: { company?: string; title?: string; description?: string }) =>
        `${e.title ?? ''}${e.company ? ' @ ' + e.company : ''}：${e.description ?? ''}`)
      .join('\n')

    const prompt = `根據以下履歷資訊，生成一段專業的個人摘要（繁體中文，2-3句話，約80字）。要突出核心優勢和職涯目標。

姓名：${name || '（未填）'}
目標職位：${jobTitle || '（未填）'}
技能：${(skills ?? []).join('、') || '（未填）'}
工作經歷：
${expText || '（未填）'}

只回傳摘要文字，不要標題或說明。`

    const summary = await callAI(prompt, '你是一位專業的履歷撰寫顧問，請用繁體中文回答。')
    return NextResponse.json({ summary: summary.trim() })
  } catch {
    return NextResponse.json({ error: '生成失敗' }, { status: 500 })
  }
}
