import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? 'placeholder')

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY ?? 'placeholder' })
  }
  return _openai
}

export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  try {
    return await callGemini(prompt, systemPrompt)
  } catch (err) {
    console.warn('Gemini failed, falling back to OpenAI:', (err as Error).message)
    return await callOpenAI(prompt, systemPrompt)
  }
}

async function callGemini(prompt: string, systemPrompt?: string): Promise<string> {
  const model = gemini.getGenerativeModel({
    model: 'gemini-2.0-flash-exp',
    systemInstruction: systemPrompt ?? '你是一個專業的台灣職涯顧問，請用繁體中文回答。',
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callOpenAI(prompt: string, systemPrompt?: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: systemPrompt ?? '你是一個專業的台灣職涯顧問，請用繁體中文回答。',
      },
      { role: 'user', content: prompt },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

export async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string
): Promise<string> {
  try {
    const model = gemini.getGenerativeModel({
      model: 'gemini-2.0-flash-exp',
      systemInstruction: systemPrompt ?? '你是一個專業的台灣職涯顧問，請用繁體中文回答。',
    })
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }))
    const chat = model.startChat({ history })
    const lastMessage = messages[messages.length - 1]
    const result = await chat.sendMessage(lastMessage.content)
    return result.response.text()
  } catch (err) {
    console.warn('Gemini chat failed, falling back to OpenAI:', (err as Error).message)
    const res = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt ?? '你是一個專業的台灣職涯顧問，請用繁體中文回答。',
        },
        ...messages,
      ],
    })
    return res.choices[0]?.message?.content ?? ''
  }
}
