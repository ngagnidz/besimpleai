import type { Evaluation } from '../../types'

export type QueueEvalStats = {
  passRatePct: number | null
  /** Newest evaluation row timestamp; fallback for “Last run” if `last_judge_run_at` is null. */
  lastEvalIso: string | null
}

export function computeQueueEvalStats(evaluations: Evaluation[]): QueueEvalStats {
  const n = evaluations.length
  if (n === 0) {
    return { passRatePct: null, lastEvalIso: null }
  }
  const passCount = evaluations.filter((e) => e.verdict === 'pass').length
  const newest = evaluations.reduce(
    (best, e) => (e.created_at > best ? e.created_at : best),
    evaluations[0]!.created_at,
  )
  return {
    passRatePct: Math.round((passCount / n) * 100),
    lastEvalIso: newest,
  }
}
