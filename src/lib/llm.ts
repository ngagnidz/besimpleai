/** Browser-side judge LLM calls. Used only from `runEvaluations` in `runner.ts`. Keys come from `VITE_OPENAI_API_KEY` and `VITE_ANTHROPIC_API_KEY`. */
import { createAnthropic } from '@ai-sdk/anthropic'
import { createOpenAI } from '@ai-sdk/openai'
import { generateText, Output } from 'ai'
import { z } from 'zod'
import type { Judge } from '../types'

const verdictSchema = z.object({
  verdict: z.enum(['pass', 'fail', 'inconclusive']),
  reasoning: z.string().describe('One concise sentence explaining the verdict.'),
})

/** Parsed model output before writing to `evaluations`. */
export type LLMResult = z.infer<typeof verdictSchema>

/** One-line guidance for the user message so judges interpret `answer_json` shape correctly (ingest may use other strings—those get no extra line). */
const QUESTION_TYPE_USER_HINTS: Record<string, string> = {
  multiple_choice:
    'Note: Multiple-choice question; the answer is usually an array of selected options—judge whether those selections meet the rubric.',
  free_form:
    'Note: Free-form answer; evaluate content quality and correctness against the question, not a fixed option list.',
  single_choice_with_reasoning:
    'Note: Single-choice with reasoning; evaluate both the chosen option and the reasoning text.',
  single_choice:
    'Note: Single-choice question; the answer should reflect one selected option—judge correctness against the rubric.',
}

function questionTypeUserHint(questionType: string): string {
  const key = questionType.trim()
  return QUESTION_TYPE_USER_HINTS[key] ?? ''
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

function languageModel(judge: Judge) {
  switch (judge.provider) {
    case 'openai':
      return createOpenAI({
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
      })(judge.model)
    case 'anthropic':
      return createAnthropic({
        apiKey: import.meta.env.VITE_ANTHROPIC_API_KEY,
      })(judge.model)
    default:
      throw new Error(`Unsupported provider: ${judge.provider}`)
  }
}

/**
 * Sends the judge’s `system_prompt`, question type (with optional format hint), question text, and answer text
 * to the configured provider and returns a parsed verdict via the AI SDK (`generateText` + structured `output`).
 * Rate-limited responses are retried with backoff before surfacing as errors to the caller.
 *
 * @throws Error if `judge.provider` is not supported
 * @throws Errors from the AI SDK or providers (network, auth, API) propagate after retries are exhausted
 */
export async function callLLM(
  judge: Judge,
  questionText: string,
  questionType: string,
  answerText: string,
): Promise<LLMResult> {
  const systemPrompt = judge.system_prompt

  const typeHint = questionTypeUserHint(questionType)
  const userMessage =
    `Question type: ${questionType}\n\n` +
    (typeHint ? `${typeHint}\n\n` : '') +
    `Question: ${questionText}\n\nAnswer: ${answerText}`

  return callWithRetry(() => generateVerdict(judge, systemPrompt, userMessage))
}

async function generateVerdict(judge: Judge, systemPrompt: string, userMessage: string): Promise<LLMResult> {
  const model = languageModel(judge)

  const result = await generateText({
    model,
    system: systemPrompt,
    prompt: userMessage,
    maxRetries: 0,
    maxOutputTokens: judge.provider === 'anthropic' ? 256 : undefined,
    output: Output.object({
      schema: verdictSchema,
      name: 'judge_verdict',
      description: 'Rubric evaluation result for the given question and answer.',
    }),
  })

  if (result.output == null) {
    throw new Error('No structured output from model')
  }

  return result.output
}
