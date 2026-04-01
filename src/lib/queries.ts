/**
 * Read-only Supabase fetch helpers for the UI (TanStack Query `queryFn`s).
 * Throws `Error` with the PostgREST message on failure.
 */
import { supabase } from './supabase'

/** One row in the queue list: id plus denormalized counts for the cards. */
export type QueueSummary = {
  id: string
  submissionsCount: number
  questionsCount: number
}

/**
 * Loads all queues (ordered by id) and, per queue, exact counts from `submissions` and `questions`.
 * Uses `count` + `head` requests — no full row payloads.
 */
export async function fetchQueueSummaries(): Promise<QueueSummary[]> {
  const { data: queues, error } = await supabase.from('queues').select('id').order('id', { ascending: true })
  if (error) {
    throw new Error(error.message)
  }

  const queueRows = queues ?? []
  const queueSummaries = await Promise.all(
    queueRows.map(async (queue) => {
      const [{ count: submissionsCount, error: submissionsError }, { count: questionsCount, error: questionsError }] =
        await Promise.all([
          supabase.from('submissions').select('*', { count: 'exact', head: true }).eq('queue_id', queue.id),
          supabase.from('questions').select('*', { count: 'exact', head: true }).eq('queue_id', queue.id),
        ])

      if (submissionsError) {
        throw new Error(submissionsError.message)
      }
      if (questionsError) {
        throw new Error(questionsError.message)
      }

      return {
        id: queue.id,
        submissionsCount: submissionsCount ?? 0,
        questionsCount: questionsCount ?? 0,
      }
    }),
  )

  return queueSummaries
}

/**
 * Submission count for one queue (e.g. queue detail header). Single aggregate query, not per-row.
 */
export async function fetchSubmissionCountForQueue(queueId: string): Promise<number> {
  const { count, error } = await supabase
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('queue_id', queueId)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}
