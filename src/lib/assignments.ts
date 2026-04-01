/** Supabase helpers for `judge_assignments`: which judges evaluate which questions in a queue. Written from QueueDetailPage; read by `fetchJudgeAssignmentsForQueue` and `runEvaluations`. */
import { supabase } from './supabase'

/**
 * Creates or confirms a judge–question link for the queue. Idempotent: duplicate assigns are ignored.
 *
 * @throws Error with the PostgREST message if the request fails
 */
export async function assignJudge(queueId: string, questionId: string, judgeId: string): Promise<void> {
  const { error } = await supabase.from('judge_assignments').upsert(
    { queue_id: queueId, question_id: questionId, judge_id: judgeId },
    { onConflict: 'queue_id,question_id,judge_id', ignoreDuplicates: true },
  )
  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Deletes the judge–question assignment; that judge will no longer run on that question for this queue.
 *
 * @throws Error with the PostgREST message if the request fails
 */
export async function unassignJudge(queueId: string, questionId: string, judgeId: string): Promise<void> {
  const { error } = await supabase
    .from('judge_assignments')
    .delete()
    .eq('queue_id', queueId)
    .eq('question_id', questionId)
    .eq('judge_id', judgeId)

  if (error) {
    throw new Error(error.message)
  }
}
