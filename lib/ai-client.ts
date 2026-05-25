import OpenAI from 'openai'

const FREE_MODEL = 'openrouter/free'

export const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free'

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

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-turn AI call using openrouter/free auto-routing.
 */
export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt ?? DEFAULT_SYSTEM },
    { role: 'user',   content: prompt },
  ]
  try {
    const res = await getClient().chat.completions.create({ model: FREE_MODEL, messages })
    return res.choices[0]?.message?.content ?? ''
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.warn(`[AI] ${FREE_MODEL} failed: ${e.status ?? ''} ${e.message ?? ''}`)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}

/**
 * Multi-turn chat call using openrouter/free auto-routing.
 */
export async function callAIChat(
  messages: { role: 'user' | 'assistant'; content: string }[],
  systemPrompt?: string
): Promise<string> {
  if (messages.length === 0) throw new Error('messages 不得為空')
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt ?? DEFAULT_SYSTEM },
    ...messages,
  ]
  try {
    const res = await getClient().chat.completions.create({ model: FREE_MODEL, messages: openaiMessages })
    return res.choices[0]?.message?.content ?? ''
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.warn(`[AI] ${FREE_MODEL} failed: ${e.status ?? ''} ${e.message ?? ''}`)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}
