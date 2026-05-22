import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'

const GEMINI_MODEL = 'gemini-2.0-flash'
const OPENAI_MODEL = 'gpt-4o-mini'
const DEFAULT_SYSTEM = '你是一個專業的台灣職涯顧問，請用繁體中文回答。'

// ── Lazy singletons ──────────────────────────────────────────────────────────
// Both clients are created on first use so the module can be imported at build
// time without valid API keys (avoids "Missing credentials" crash during build).

let _gemini: GoogleGenerativeAI | null = null
function getGemini(): GoogleGenerativeAI {
  const key = process.env.GEMINI_API_KEY
  if (!key) throw new Error('GEMINI_API_KEY is not set')
  if (!_gemini) _gemini = new GoogleGenerativeAI(key)
  return _gemini
}

let _openai: OpenAI | null = null
function getOpenAI(): OpenAI {
  const key = process.env.OPENAI_API_KEY
  if (!key) throw new Error('OPENAI_API_KEY is not set')
  if (!_openai) _openai = new OpenAI({ apiKey: key })
  return _openai
}

// ── Internal helpers ─────────────────────────────────────────────────────────

async function callGemini(prompt: string, systemPrompt: string): Promise<string> {
  const model = getGemini().getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
  })
  const result = await model.generateContent(prompt)
  return result.response.text()
}

async function callOpenAI(prompt: string, systemPrompt: string): Promise<string> {
  const res = await getOpenAI().chat.completions.create({
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: prompt },
    ],
  })
  return res.choices[0]?.message?.content ?? ''
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-turn AI call.
 * Always tries Gemini first; falls back to OpenAI only on error.
 */
export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const sys = systemPrompt ?? DEFAULT_SYSTEM

  // 1. Try Gemini
  try {
    const result = await callGemini(prompt, sys)
    return result
  } catch (geminiErr) {
    console.warn('[AI] Gemini failed:', (geminiErr as Error).message)
  }

  // 2. Fallback to OpenAI
  try {
    const result = await callOpenAI(prompt, sys)
    console.info('[AI] Using OpenAI fallback')
    return result
  } catch (openaiErr) {
    console.error('[AI] OpenAI fallback also failed:', (openaiErr as Error).message)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}

/**
 * Multi-turn chat call.
 * Always tries Gemini first; falls back to OpenAI only on error.
 *
 * Gemini history rules:
 * - history = all turns EXCEPT the last user message
 * - history must alternate user/model and start with user
 * - the last message is sent via chat.sendMessage()
 */
export async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string
): Promise<string> {
  const sys = systemPrompt ?? DEFAULT_SYSTEM

  if (messages.length === 0) throw new Error('messages 不得為空')

  // 1. Try Gemini
  try {
    const model = getGemini().getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: sys,
    })

    // Build valid Gemini history (all turns before the final user message).
    // Gemini requires the history to end with a 'model' turn, so we include
    // everything up to (but not including) the last message.
    const historyMessages = messages.slice(0, -1)
    const lastMessage = messages[messages.length - 1]

    // Gemini history must start with 'user' and alternate user/model.
    // Filter out any leading assistant messages to be safe.
    const firstUserIdx = historyMessages.findIndex((m) => m.role === 'user')
    const safeHistory = firstUserIdx >= 0 ? historyMessages.slice(firstUserIdx) : []

    const history = safeHistory.map((m) => ({
      role: m.role === 'assistant' ? ('model' as const) : ('user' as const),
      parts: [{ text: m.content }],
    }))

    const chat = model.startChat({ history })
    const result = await chat.sendMessage(lastMessage.content)
    return result.response.text()
  } catch (geminiErr) {
    console.warn('[AI] Gemini chat failed:', (geminiErr as Error).message)
  }

  // 2. Fallback to OpenAI
  try {
    const res = await getOpenAI().chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: sys },
        ...messages,
      ],
    })
    console.info('[AI] Using OpenAI chat fallback')
    return res.choices[0]?.message?.content ?? ''
  } catch (openaiErr) {
    console.error('[AI] OpenAI chat fallback also failed:', (openaiErr as Error).message)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}
