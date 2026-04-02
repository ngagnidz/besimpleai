/** Persist LLM judge outputs to `evaluations`. Written from `runEvaluations` only; read via `fetchEvaluationsForQueue` / `fetchEvaluationsForQueues` in `queries.ts`. */
import type { Verdict } from '../types'
import { supabase } from './supabase'

/** One row identifies (queue, submission, question, judge); verdict + reasoning come from the model (or an error string on failure). */
export type InsertEvaluationInput = {
  queue_id: string
  submission_id: string
  question_id: string
  judge_id: string
  verdict: Verdict
  reasoning: string
}

/**
 * Upserts by `(submission_id, question_id, judge_id)` so re-running judges overwrites the latest verdict instead of duplicating rows.
 *
 * @throws Error with the PostgREST message if the request fails
 */
export async function insertEvaluation(row: InsertEvaluationInput): Promise<void> {
  /** Refresh on upsert so re-runs update Results “When”; omitted created_at would keep the first-run timestamp. */
  const payload = { ...row, created_at: new Date().toISOString() }
  const { error } = await supabase
    .from('evaluations')
    .upsert(payload, { onConflict: 'submission_id,question_id,judge_id' })
  if (error) {
    throw new Error(error.message)
  }
}
