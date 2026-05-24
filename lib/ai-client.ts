import OpenAI from 'openai'

const PRIMARY_MODEL  = 'google/gemini-2.0-flash-lite:free'
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'
const DEFAULT_SYSTEM = '你是一個專業的台灣職涯顧問，請用繁體中文回答。'

// ── Lazy singleton ────────────────────────────────────────────────────────────
// Created on first use so the module can be imported at build time without a
// valid API key — avoids "Missing credentials" crash during next build.

let _client: OpenAI | null = null
function getClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')
  if (!_client) {
    _client = new OpenAI({
      apiKey: key,
      baseURL: 'https://openrouter.ai/api/v1',
    })
  }
  return _client
}

// ── Internal helper ───────────────────────────────────────────────────────────

async function complete(
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const res = await getClient().chat.completions.create({ model, messages })
  return res.choices[0]?.message?.content ?? ''
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-turn AI call.
 * Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on error.
 */
export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const sys = systemPrompt ?? DEFAULT_SYSTEM
  const msgs: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: sys },
    { role: 'user',   content: prompt },
  ]

  try {
    return await complete(PRIMARY_MODEL, msgs)
  } catch (err) {
    console.warn('[AI] Primary model failed:', (err as Error).message)
  }

  try {
    const result = await complete(FALLBACK_MODEL, msgs)
    console.info('[AI] Using fallback model')
    return result
  } catch (err) {
    console.error('[AI] Fallback model also failed:', (err as Error).message)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}

/**
 * Multi-turn chat call.
 * Tries PRIMARY_MODEL first; falls back to FALLBACK_MODEL on error.
 */
export async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string
): Promise<string> {
  const sys = systemPrompt ?? DEFAULT_SYSTEM
  if (messages.length === 0) throw new Error('messages 不得為空')

  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: sys },
    ...messages,
  ]

  try {
    return await complete(PRIMARY_MODEL, openaiMessages)
  } catch (err) {
    console.warn('[AI] Primary model chat failed:', (err as Error).message)
  }

  try {
    const result = await complete(FALLBACK_MODEL, openaiMessages)
    console.info('[AI] Using fallback model for chat')
    return result
  } catch (err) {
    console.error('[AI] Fallback model chat also failed:', (err as Error).message)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}
