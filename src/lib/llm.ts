/** Browser-side judge LLM calls. Used only from `runEvaluations` in `runner.ts`. Dynamic-imports OpenAI / Anthropic SDKs; keys come from `VITE_OPENAI_API_KEY` and `VITE_ANTHROPIC_API_KEY`. */
import type { Judge, Verdict } from '../types'

/** Parsed model output before writing to `evaluations`. */
export type LLMResult = {
  verdict: Verdict
  reasoning: string
}

/**
 * Runs `fn` up to `retries` times. On rate-limit-style errors (message contains `429` or “rate limit”),
 * waits with exponential backoff (1s, 2s, 4s, …) before retrying; other errors rethrow immediately.
 */
async function callWithRetry(fn: () => Promise<LLMResult>, retries = 3): Promise<LLMResult> {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await fn()
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      const isRateLimit = message.includes('429') || message.toLowerCase().includes('rate limit')
      if (!isRateLimit || attempt === retries - 1) throw err
      const waitMs = 1000 * Math.pow(2, attempt) // 1s, 2s, 4s
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }
  }
  throw new Error('unreachable')
}

/**
 * Sends the judge’s `system_prompt` (plus fixed JSON-instruction suffix), question type, question text, and answer text to the configured provider and returns a parsed verdict.
 * Rate-limited responses are retried with backoff before surfacing as errors to the caller.
 *
 * @throws Error if `judge.provider` is not supported
 * @throws Errors from the OpenAI or Anthropic SDK (network, auth, API) propagate after retries are exhausted
 */
export async function callLLM(
  judge: Judge,
  questionText: string,
  questionType: string,
  answerText: string,
): Promise<LLMResult> {
  const systemPrompt =
    judge.system_prompt +
    `\n\nRespond only with valid JSON, no other text:\n{"verdict": "pass" | "fail" | "inconclusive", "reasoning": "<one sentence>"}`

  const userMessage = `Question type: ${questionType}\n\nQuestion: ${questionText}\n\nAnswer: ${answerText}`

  return callWithRetry(() => {
    switch (judge.provider) {
      case 'openai':
        return callOpenAI(judge.model, systemPrompt, userMessage)
      case 'anthropic':
        return callAnthropic(judge.model, systemPrompt, userMessage)
      default:
        throw new Error(`Unsupported provider: ${judge.provider}`)
    }
  })
}

/** Chat Completions with `response_format: json_object`; parses assistant text via `parseVerdict`. */
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

/** Messages API with system + user; parses first text block via `parseVerdict`. */
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

/** If the model wraps JSON in a markdown fence, extract the inner payload for JSON.parse. */
function unwrapMarkdownJsonFence(text: string): string {
  const t = text.trim()
  const full = t.match(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```\s*$/i)
  if (full) return full[1].trim()
  const block = t.match(/```(?:json)?\s*\r?\n([\s\S]*?)\r?\n```/i)
  if (block) return block[1].trim()
  return t
}

/** Parses `verdict` + `reasoning` from JSON when valid; otherwise returns null. */
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

/**
 * Normalizes the model’s reply into an `LLMResult`: JSON first (including fenced), then whole-word
 * heuristics (`\bpass\b`, etc.) so substrings like “surpass” / “bypass” do not yield false passes.
 */
function parseVerdict(text: string): LLMResult {
  const fromJson = tryParseVerdictFromJson(text)
  if (fromJson) {
    return fromJson
  }

  const lower = text.toLowerCase()
  // Check `fail` before `pass` so phrases like “fails to pass” resolve to fail, not pass.
  if (/\bfail\b/.test(lower)) return { verdict: 'fail', reasoning: text }
  if (/\bpass\b/.test(lower)) return { verdict: 'pass', reasoning: text }
  if (/\binconclusive\b/.test(lower)) return { verdict: 'inconclusive', reasoning: text }

  return { verdict: 'inconclusive', reasoning: 'Could not determine verdict from response.' }
}

