/**
 * Robustly extract and parse JSON from AI responses that may contain
 * markdown code fences (```json ... ```) or surrounding explanation text.
 *
 * Uses brace-depth counting so the closing delimiter is always the one that
 * closes the outermost object/array, never a stray `}` in trailing text.
 */
export function extractJSON<T = unknown>(text: string): T {
  // Strip markdown code fences
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim()

  // Find the first opening delimiter
  const firstBrace  = cleaned.indexOf('{')
  const firstBracket = cleaned.indexOf('[')

  let openChar: string
  let closeChar: string
  let start: number

  if (firstBrace === -1 && firstBracket === -1) {
    throw new SyntaxError('extractJSON: no JSON object or array found in AI response')
  }

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace; openChar = '{'; closeChar = '}'
  } else {
    start = firstBracket; openChar = '['; closeChar = ']'
  }

  // Walk forward counting depth to find the matching closing delimiter
  let depth = 0
  let inString = false
  let escape = false
  let end = -1

  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i]
    if (escape)          { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"')      { inString = !inString; continue }
    if (inString)        continue
    if (ch === openChar) { depth++; continue }
    if (ch === closeChar) {
      depth--
      if (depth === 0) { end = i; break }
    }
  }

  if (end === -1) {
    throw new SyntaxError('extractJSON: unterminated JSON in AI response')
  }

  return JSON.parse(cleaned.substring(start, end + 1)) as T
}
