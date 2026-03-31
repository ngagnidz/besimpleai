import type { Verdict } from '../types'

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeVerdict(text: string): Verdict {
  const lower = text.toLowerCase()
  if (lower.includes('pass')) return 'pass'
  if (lower.includes('fail')) return 'fail'
  if (lower.includes('inconclusive')) return 'inconclusive'
  return 'inconclusive'
}
