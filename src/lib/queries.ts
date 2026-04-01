/**
 * Read-only Supabase data access for the application layer.
 *
 * Primary consumers: React components (TanStack Query `queryFn` callbacks) and `runEvaluations` in `runner.ts`.
 * On request failure, functions throw `Error` using the message returned by PostgREST.
 */
import type { Answer, Evaluation, Judge, JudgeAssignment, Question, Submission } from '../types'
import { supabase } from './supabase'

/** Summary row for queue list cards: identifier and row counts for submissions and questions. */
export type QueueSummary = {
  id: string
  submissionsCount: number
  questionsCount: number
}

/**
 * Lists every queue and aggregates submission and question counts per queue.
 * Uses `count` with `head: true` so full rows are not transferred.
 *
 * Consumers: `QueuesPage`, `Results` (queue selection metadata).
 *
 * @throws Error if any Supabase request fails (message from the API).
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
 * Loads all questions for a single queue, ordered by question text.
 *
 * Consumers: `QueueDetailPage`, `runEvaluations`.
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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

/**
 * Loads all judge configurations, including inactive records, ordered by creation time (newest first).
 *
 * Consumers: `Judges`, `Results` (display names and metadata in the results grid).
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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

/**
 * Loads judges where `active` is true, ordered by name.
 *
 * Consumers: `QueueDetailPage` (assignment UI), `runEvaluations` (only active judges are invoked).
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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

/**
 * Loads judge-to-question assignments for one queue.
 *
 * Consumers: `QueueDetailPage` (assignment matrix), `runEvaluations` (pairing logic).
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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

/**
 * Loads all submissions belonging to a queue.
 *
 * Consumers: `runEvaluations` (enumerate work and resolve answers).
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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

/**
 * Loads answers for one or more submissions in a single query.
 * When `submissionIds` is empty, returns an empty array without calling the API.
 *
 * Consumers: `runEvaluations`.
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
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
 * Loads evaluation records for a queue, filtered by `queue_id`, newest first.
 *
 * Consumers: `QueueDetailPage` (aggregate statistics and recent activity).
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
export async function fetchEvaluationsForQueue(queueId: string): Promise<Evaluation[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('id, queue_id, submission_id, question_id, judge_id, verdict, reasoning, created_at')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Evaluation[]
}

/**
 * Loads evaluations for any of the given queue identifiers, ordered by `created_at` descending.
 *
 * Consumers: `Results` when multiple queues are selected.
 *
 * @throws Error if the Supabase request fails (message from the API).
 */
export async function fetchEvaluationsForQueues(queueIds: string[]): Promise<Evaluation[]> {
  if (queueIds.length === 0) {
    return []
  }
  const { data, error } = await supabase
    .from('evaluations')
    .select('id, queue_id, submission_id, question_id, judge_id, verdict, reasoning, created_at')
    .in('queue_id', queueIds)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Evaluation[]
}

/**
 * Loads questions for several queues by issuing one fetch per queue and concatenating results.
 * Global ordering is not defined; the UI should sort or group as needed.
 *
 * Consumers: `Results` (question labels and column metadata).
 *
 * @throws Error if any per-queue fetch fails (message from the API).
 */
export async function fetchQuestionsByQueueIds(queueIds: string[]): Promise<Question[]> {
  if (queueIds.length === 0) {
    return []
  }
  const chunks = await Promise.all(queueIds.map((id) => fetchQuestionsByQueueId(id)))
  return chunks.flat()
}
