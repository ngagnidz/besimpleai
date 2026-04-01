/**
 * Read-only Supabase fetch helpers for the UI (TanStack Query `queryFn`s).
 * Throws `Error` with the PostgREST message on failure.
 */
import type { Answer, Evaluation, Judge, JudgeAssignment, Question, Submission } from '../types'
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

export async function fetchSubmissionsForQueue(queueId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, queue_id, labeling_task_id, created_at')
    .eq('queue_id', queueId)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Submission[]
}

export async function fetchAnswersForSubmissions(submissionIds: string[]): Promise<Answer[]> {
  if (submissionIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('answers')
    .select('id, submission_id, question_id, answer_json')
    .in('submission_id', submissionIds)

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Answer[]
}

/**
 * Evaluations for a queue (via submissions belonging to that queue). Newest first.
 */
export async function fetchEvaluationsForQueue(queueId: string): Promise<Evaluation[]> {
  const submissions = await fetchSubmissionsForQueue(queueId)
  const submissionIds = submissions.map((s) => s.id)
  if (submissionIds.length === 0) {
    return []
  }

  const { data, error } = await supabase
    .from('evaluations')
    .select('id, submission_id, question_id, judge_id, verdict, reasoning, created_at')
    .in('submission_id', submissionIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Evaluation[]
}

/** Merged evaluations for several queues, newest first (by `created_at`). */
export async function fetchEvaluationsForQueues(queueIds: string[]): Promise<Evaluation[]> {
  if (queueIds.length === 0) {
    return []
  }
  const chunks = await Promise.all(queueIds.map((id) => fetchEvaluationsForQueue(id)))
  const merged = chunks.flat()
  merged.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )
  return merged
}

/** All questions for the given queues (order not guaranteed; sort in UI if needed). */
export async function fetchQuestionsByQueueIds(queueIds: string[]): Promise<Question[]> {
  if (queueIds.length === 0) {
    return []
  }
  const chunks = await Promise.all(queueIds.map((id) => fetchQuestionsByQueueId(id)))
  return chunks.flat()
}

