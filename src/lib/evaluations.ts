import { supabase } from './supabase'
import { isRecord, normalizeVerdict } from './utils'
import type { Evaluation, Submission, Verdict } from '../types'

export type EvaluationRow = {
  id: string
  submission_id: string
  question_id: string
  judge_id: string
  judge_name: string
  question_text: string
  verdict: Verdict
  reasoning: string
  error: string | null
  created_at: string
}

type RawEvaluationWithJudge = {
  id: string
  submission_id: string
  question_id: string
  judge_id: string
  verdict: string
  reasoning: string
  error: string | null
  created_at: string
  judges: { id: string; name: string } | null
}

/**
 * Build map: submissionId -> questionId -> questionText from submission.questions JSONB.
 */
export function buildQuestionTextLookup(submissions: Submission[]): Map<string, Map<string, string>> {
  const out = new Map<string, Map<string, string>>()

  for (const submission of submissions) {
    const byQuestion = new Map<string, string>()
    const questions = submission.questions

    if (Array.isArray(questions)) {
      for (const item of questions) {
        if (!isRecord(item)) continue
        const data = item.data
        if (!isRecord(data)) continue
        const qId = data.id
        const questionText = data.questionText
        if (typeof qId === 'string' && typeof questionText === 'string') {
          byQuestion.set(qId, questionText)
        }
      }
    }

    out.set(submission.id, byQuestion)
  }

  return out
}

export async function listEvaluations(): Promise<
  Pick<
    Evaluation,
    | 'id'
    | 'submission_id'
    | 'question_id'
    | 'judge_id'
    | 'verdict'
    | 'reasoning'
    | 'error'
    | 'created_at'
  >[]
> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('id, submission_id, question_id, judge_id, verdict, reasoning, error, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as Record<string, unknown>[]
  return rows.map((row) => ({
    id: String(row.id),
    submission_id: String(row.submission_id),
    question_id: String(row.question_id),
    judge_id: String(row.judge_id),
    verdict: normalizeVerdict(typeof row.verdict === 'string' ? row.verdict : ''),
    reasoning: typeof row.reasoning === 'string' ? row.reasoning : '',
    error: row.error === null || typeof row.error === 'string' ? row.error : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : String(row.created_at ?? ''),
  }))
}

async function fetchSubmissionsByIds(submissionIds: string[]): Promise<Submission[]> {
  if (submissionIds.length === 0) return []

  const { data, error } = await supabase
    .from('submissions')
    .select('id, queue_id, labeling_task_id, created_at, questions, answers')
    .in('id', submissionIds)

  if (error) throw new Error(error.message)
  return (data ?? []) as Submission[]
}

/**
 * Loads evaluations with judge names (via join) and question text resolved from submissions JSONB.
 */
export async function fetchEvaluationsWithContext(): Promise<EvaluationRow[]> {
  const { data, error } = await supabase
    .from('evaluations')
    .select('*, judges(id, name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)

  const rows = (data ?? []) as RawEvaluationWithJudge[]

  const submissionIds = [...new Set(rows.map((r) => r.submission_id))]
  const submissions = await fetchSubmissionsByIds(submissionIds)
  const questionLookup = buildQuestionTextLookup(submissions)

  return rows.map((row) => {
    const questionText =
      questionLookup.get(row.submission_id)?.get(row.question_id) ?? `Question ${row.question_id}`

    return {
      id: row.id,
      submission_id: row.submission_id,
      question_id: row.question_id,
      judge_id: row.judge_id,
      judge_name: row.judges?.name ?? 'Unknown judge',
      question_text: questionText,
      verdict: normalizeVerdict(row.verdict),
      reasoning: typeof row.reasoning === 'string' ? row.reasoning : '',
      error: row.error,
      created_at: row.created_at,
    }
  })
}
