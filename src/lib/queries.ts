/**
 * Read-only Supabase fetch helpers for the UI (TanStack Query `queryFn`s).
 * Throws `Error` with the PostgREST message on failure.
 */
import type { Judge, JudgeAssignment, Question } from '../types'
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

export async function fetchQuestionsByQueueId(queueId: string): Promise<Question[]> {
  const { data, error } = await supabase
    .from('questions')
    .select('id, queue_id, question_type, question_text, rev')
    .eq('queue_id', queueId)
    .order('question_text', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function fetchJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, name, system_prompt, model, provider, active, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Judge[]
}

export async function fetchActiveJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, name, system_prompt, model, provider, active, created_at')
    .eq('active', true)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Judge[]
}

export async function fetchJudgeAssignmentsForQueue(queueId: string): Promise<JudgeAssignment[]> {
  const { data, error } = await supabase
    .from('judge_assignments')
    .select('id, queue_id, question_id, judge_id')
    .eq('queue_id', queueId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as JudgeAssignment[]
}

