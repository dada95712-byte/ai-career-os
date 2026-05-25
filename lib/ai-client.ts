import OpenAI from 'openai'

const FREE_MODEL     = 'openrouter/free'
const FALLBACK_MODEL = 'meta-llama/llama-3.3-70b-instruct:free'

export const VISION_MODEL = 'meta-llama/llama-3.2-11b-vision-instruct:free'

const DEFAULT_SYSTEM = '你是一個專業的台灣職涯顧問，請用繁體中文回答。'

// ── Lazy singleton ────────────────────────────────────────────────────────────

let _client: OpenAI | null = null
function getClient(): OpenAI {
  const key = process.env.OPENROUTER_API_KEY
  if (!key) throw new Error('OPENROUTER_API_KEY is not set')
  if (!_client) {
    _client = new OpenAI({ apiKey: key, baseURL: 'https://openrouter.ai/api/v1' })
  }
  return _client
}

// ── Internal helper: single completion with defensive check ───────────────────

async function complete(
  model: string,
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  const res = await getClient().chat.completions.create({ model, messages })
  const content = res?.choices?.[0]?.message?.content
  if (!content) {
    console.warn(`[AI] ${model} returned unexpected format:`, JSON.stringify(res))
    throw new Error('AI 回應格式異常')
  }
  return content
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-turn AI call. Tries openrouter/free first, falls back to llama-3.3-70b.
 */
export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt ?? DEFAULT_SYSTEM },
    { role: 'user',   content: prompt },
  ]
  try {
    return await complete(FREE_MODEL, messages)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.warn(`[AI] ${FREE_MODEL} failed: ${e.status ?? ''} ${e.message ?? ''}`)
  }
  try {
    return await complete(FALLBACK_MODEL, messages)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.error(`[AI] ${FALLBACK_MODEL} also failed: ${e.status ?? ''} ${e.message ?? ''}`)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}

/**
 * Multi-turn chat call. Tries openrouter/free first, falls back to llama-3.3-70b.
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
    return await complete(FREE_MODEL, openaiMessages)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.warn(`[AI] ${FREE_MODEL} failed: ${e.status ?? ''} ${e.message ?? ''}`)
  }
  try {
    return await complete(FALLBACK_MODEL, openaiMessages)
  } catch (err) {
    const e = err as { status?: number; message?: string }
    console.error(`[AI] ${FALLBACK_MODEL} also failed: ${e.status ?? ''} ${e.message ?? ''}`)
    throw new Error('所有 AI 服務目前無法使用，請稍後再試')
  }
}
