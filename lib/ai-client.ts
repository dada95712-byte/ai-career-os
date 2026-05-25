import OpenAI from 'openai'

const FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
]

export const VISION_MODELS = [
  'nvidia/nemotron-nano-12b-v2-vl:free',
  'google/gemma-4-26b-a4b-it:free',
]

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

async function tryModels(
  models: string[],
  messages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<string> {
  for (const model of models) {
    try {
      const res = await getClient().chat.completions.create({ model, messages })
      return res.choices[0]?.message?.content ?? ''
    } catch (err) {
      const e = err as { status?: number; message?: string }
      console.warn(`[AI] Model ${model} failed: ${e.status ?? ''} ${e.message ?? ''}`)
    }
  }
  throw new Error('所有 AI 服務目前無法使用，請稍後再試')
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Single-turn AI call. Rotates through FREE_MODELS until one succeeds.
 */
export async function callAI(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt ?? DEFAULT_SYSTEM },
    { role: 'user',   content: prompt },
  ]
  return tryModels(FREE_MODELS, messages)
}

/**
 * Multi-turn chat call. Rotates through FREE_MODELS until one succeeds.
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
  return tryModels(FREE_MODELS, openaiMessages)
}
