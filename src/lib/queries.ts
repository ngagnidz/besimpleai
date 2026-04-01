import { supabase } from './supabase'

export type QueueSummary = {
  id: string
  submissionsCount: number
  questionsCount: number
}

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

/** Single count for the queue detail header — avoids N+1 answer queries per submission. */
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
