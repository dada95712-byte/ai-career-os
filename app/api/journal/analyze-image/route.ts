import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const { imageUrl } = await req.json()
    if (!imageUrl) return NextResponse.json({ description: '' }, { status: 400 })

    // Data URLs can't be fetched by remote vision models — skip analysis
    if (imageUrl.startsWith('data:'))
      return NextResponse.json({ description: '' })

    const key = process.env.OPENROUTER_API_KEY
    if (!key) return NextResponse.json({ description: '' })

    const client = new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' })
    const res = await client.chat.completions.create({
      model: 'nvidia/nemotron-nano-12b-v2-vl:free',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageUrl, detail: 'auto' } },
            {
              type: 'text',
              text: '請分析這張圖片的內容，用繁體中文描述。如果圖片包含文字（白板、截圖、筆記、證書等），請直接擷取並回覆文字內容；否則描述圖片中的場景與重點。回答請簡潔，不超過 150 字。',
            },
          ],
        },
      ],
    })

    const description = res.choices[0]?.message?.content ?? ''
    return NextResponse.json({ description })
  } catch (err) {
    console.error('[analyze-image]', err)
    return NextResponse.json({ description: '' }, { status: 500 })
  }
}
