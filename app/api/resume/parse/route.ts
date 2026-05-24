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

    const prompt = `Parse the following resume content. Auto-detect the language (Traditional Chinese or English) and reply in the SAME language as the resume.

Return ONLY a JSON object with these fields:
- name: full name (string)
- email: email address (string)
- phone: phone number (string)
- skills: array of skill strings (keep in original language)
- experiences: array of objects, each with { company, title, description } (strings)
- education: array of objects, each with { school, degree, major, year } (strings)

Resume content:
${rawText.slice(0, 4000)}

Return ONLY valid JSON, no other text.`

    const aiResponse = await callAI(prompt)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/)
    let parsed: Record<string, unknown> = {}

    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]) } catch { parsed = {} }
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
