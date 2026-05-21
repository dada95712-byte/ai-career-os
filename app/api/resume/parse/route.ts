import { NextRequest, NextResponse } from 'next/server'
import { callAI } from '@/lib/ai-client'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: '未收到檔案' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    let rawText = ''

    if (file.name.endsWith('.pdf')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse')
      const parsed = await (typeof pdfParse === 'function' ? pdfParse : pdfParse.default)(buffer)
      rawText = parsed.text
    } else if (file.name.endsWith('.docx')) {
      const mammoth = await import('mammoth')
      const result = await mammoth.extractRawText({ buffer })
      rawText = result.value
    } else {
      return NextResponse.json({ error: '僅支援 PDF 或 DOCX 格式' }, { status: 400 })
    }

    const prompt = `請解析以下履歷內容，並以 JSON 格式回傳以下欄位：
- name: 姓名
- email: 電子郵件
- phone: 電話
- skills: 技能陣列（字串）
- experiences: 工作經歷陣列，每筆包含 company, title, description
- education: 學歷陣列（字串）

履歷內容：
${rawText.slice(0, 4000)}

請只回傳 JSON，不要其他文字。`

    const aiResponse = await callAI(prompt)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    let parsed: Record<string, unknown> = {}

    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0])
      } catch {
        parsed = {}
      }
    }

    return NextResponse.json({
      name: parsed.name ?? '',
      email: parsed.email ?? '',
      phone: parsed.phone ?? '',
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experiences: Array.isArray(parsed.experiences) ? parsed.experiences : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      rawText,
    })
  } catch (err) {
    console.error('Resume parse error:', err)
    return NextResponse.json({ error: '解析失敗，請再試一次' }, { status: 500 })
  }
}
