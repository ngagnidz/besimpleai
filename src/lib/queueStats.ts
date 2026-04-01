/**
 * Queue judge-run stats on `queues`: read `judge_run_count` / `last_judge_run_at`, update after a completed run via RPC.
 * Read: `QueueDetailPage`. Write: `runEvaluations` → `recordCompletedJudgeRun`.
 */
import { supabase } from './supabase'

export type QueueRunsMeta = {
  count: number
  lastCreatedAt: string | null
}

/**
 * Judge run counter and last-run timestamp for one queue. Used by `QueueDetailPage` header/stats.
 *
 * @throws Error with the PostgREST message if the request fails
 */
export async function fetchQueueRunsMeta(queueId: string): Promise<QueueRunsMeta> {
  const { data, error } = await supabase
    .from('queues')
    .select('judge_run_count, last_judge_run_at')
    .eq('id', queueId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  return {
    count: data?.judge_run_count ?? 0,
    lastCreatedAt: data?.last_judge_run_at ?? null,
  }
}

/**
 * Increment `queues.judge_run_count` and set `last_judge_run_at` (RPC in Supabase migration).
 * Returns false if RPC fails (e.g. migration not applied); does not throw.
 */
export async function recordCompletedJudgeRun(queueId: string): Promise<boolean> {
  const { error } = await supabase.rpc('increment_queue_judge_run', { p_queue_id: queueId })
  if (error) {
    console.warn(
      '[ai-judge] increment_queue_judge_run failed (apply queues column + RPC migration?):',
      error.message,
    )
    return false
  }
  return true
}
