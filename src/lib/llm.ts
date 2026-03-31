import Anthropic from '@anthropic-ai/sdk'
import { GoogleGenerativeAI } from '@google/generative-ai'
import OpenAI from 'openai'
import type { Judge, Verdict } from '../types'
import { normalizeVerdict } from './utils'

type LLMResult = {
  verdict: Verdict
  reasoning: string
}

function buildUserPrompt(questionText: string, questionType: string, answer: unknown): string {
  return `Question: ${questionText}\nQuestion Type: ${questionType}\nAnswer: ${JSON.stringify(answer)}\n\nRespond with ONLY a JSON object: {"verdict": "pass"|"fail"|"inconclusive", "reasoning": "..."}`
}

function parseLlmJson(text: string): LLMResult {
  try {
    const direct = JSON.parse(text) as { verdict?: unknown; reasoning?: unknown }
    return {
      verdict: normalizeVerdict(typeof direct.verdict === 'string' ? direct.verdict : ''),
      reasoning: typeof direct.reasoning === 'string' ? direct.reasoning : 'Failed to parse reasoning.',
    }
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) {
      return { verdict: 'inconclusive', reasoning: 'Model output was not valid JSON.' }
    }

    try {
      const parsed = JSON.parse(match[0]) as { verdict?: unknown; reasoning?: unknown }
      return {
        verdict: normalizeVerdict(typeof parsed.verdict === 'string' ? parsed.verdict : ''),
        reasoning: typeof parsed.reasoning === 'string' ? parsed.reasoning : 'Model output missing reasoning.',
      }
    } catch {
      return { verdict: 'inconclusive', reasoning: 'Model output JSON parsing failed.' }
    }
  }
}

async function callOpenAI(judge: Judge, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!apiKey) throw new Error('Missing VITE_OPENAI_API_KEY.')

  const client = new OpenAI({ apiKey, dangerouslyAllowBrowser: true })
  const completion = await client.chat.completions.create({
    model: judge.model_name,
    temperature: 0,
    messages: [
      { role: 'system', content: judge.system_prompt },
      { role: 'user', content: userPrompt },
    ],
  })

  return completion.choices[0]?.message?.content ?? ''
}

async function callAnthropic(judge: Judge, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined
  if (!apiKey) throw new Error('Missing VITE_ANTHROPIC_API_KEY.')

  const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true })
  const message = await client.messages.create({
    model: judge.model_name,
    max_tokens: 300,
    system: judge.system_prompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  return message.content
    .filter((block) => block.type === 'text')
    .map((block) => block.text)
    .join('\n')
}

async function callGemini(judge: Judge, userPrompt: string): Promise<string> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined
  if (!apiKey) throw new Error('Missing VITE_GEMINI_API_KEY.')

  const client = new GoogleGenerativeAI(apiKey)
  const model = client.getGenerativeModel({
    model: judge.model_name,
    systemInstruction: judge.system_prompt,
  })

  const response = await model.generateContent(userPrompt)
  return response.response.text()
}

export async function callLLM(
  judge: Judge,
  questionText: string,
  questionType: string,
  answer: unknown,
): Promise<{ verdict: Verdict; reasoning: string }> {
  const prompt = buildUserPrompt(questionText, questionType, answer)

  let rawOutput = ''
  if (judge.model_name.startsWith('gpt-')) {
    rawOutput = await callOpenAI(judge, prompt)
  } else if (judge.model_name.startsWith('claude-')) {
    rawOutput = await callAnthropic(judge, prompt)
  } else if (judge.model_name.startsWith('gemini-')) {
    rawOutput = await callGemini(judge, prompt)
  } else {
    return { verdict: 'inconclusive', reasoning: `Unsupported model: ${judge.model_name}` }
  }

  return parseLlmJson(rawOutput)
}
