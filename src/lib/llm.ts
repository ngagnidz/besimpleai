import type { Judge, Verdict } from '../types'

export type LLMResult = {
  verdict: Verdict
  reasoning: string
}

export async function callLLM(
  judge: Judge,
  questionText: string,
  answerText: string,
): Promise<LLMResult> {
  const systemPrompt =
    judge.system_prompt +
    `\n\nRespond only with valid JSON, no other text:\n{"verdict": "pass" | "fail" | "inconclusive", "reasoning": "<one sentence>"}`

  const userMessage = `Question: ${questionText}\n\nAnswer: ${answerText}`

  switch (judge.provider) {
    case 'openai':
      return callOpenAI(judge.model, systemPrompt, userMessage)
    case 'anthropic':
      return callAnthropic(judge.model, systemPrompt, userMessage)
    default:
      throw new Error(`Unsupported provider: ${judge.provider}`)
  }
}

async function callOpenAI(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResult> {
  const OpenAI = (await import('openai')).default
  const client = new OpenAI({
    apiKey: import.meta.env.VITE_OPENAI_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
  })

  const text = response.choices[0]?.message?.content ?? ''
  return parseVerdict(text)
}

/** If the model wraps JSON in a markdown fence, extract the inner payload for JSON.parse. */
function unwrapMarkdownJsonFence(text: string): string {
  const t = text.trim()
  const full = t.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/i)
  if (full) return full[1].trim()
  const block = t.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/i)
  if (block) return block[1].trim()
  return t
}

function tryParseVerdictFromJson(text: string): LLMResult | null {
  const trimmed = text.trim()
  const unwrapped = unwrapMarkdownJsonFence(text)
  const candidates = unwrapped === trimmed ? [trimmed] : [trimmed, unwrapped]

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate)
      const verdict = parsed.verdict
      const reasoning =
        typeof parsed.reasoning === 'string' ? parsed.reasoning : candidate
      if (verdict === 'pass' || verdict === 'fail' || verdict === 'inconclusive') {
        return { verdict, reasoning }
      }
    } catch {
      /* try next candidate or fall through */
    }
  }
  return null
}

function parseVerdict(text: string): LLMResult {
  const fromJson = tryParseVerdictFromJson(text)
  if (fromJson) {
    return fromJson
  }

  const lower = text.toLowerCase()
  if (lower.includes('pass')) return { verdict: 'pass', reasoning: text }
  if (lower.includes('fail')) return { verdict: 'fail', reasoning: text }
  if (lower.includes('inconclusive')) return { verdict: 'inconclusive', reasoning: text }

  return { verdict: 'inconclusive', reasoning: 'Could not determine verdict from response.' }
}

async function callAnthropic(
  model: string,
  systemPrompt: string,
  userMessage: string,
): Promise<LLMResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({
    apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
    dangerouslyAllowBrowser: true,
  })

  const response = await client.messages.create({
    model,
    max_tokens: 256,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  })

  const block = response.content[0]
  const text = block.type === 'text' ? block.text : ''
  return parseVerdict(text)
}
