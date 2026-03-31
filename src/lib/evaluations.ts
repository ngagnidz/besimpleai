import { supabase } from './supabase'
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

type JudgeNameRow = {
  id: string
  name: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeVerdict(value: unknown): Verdict {
  return value === 'pass' || value === 'fail' || value === 'inconclusive' ? value : 'inconclusive'
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
    verdict: normalizeVerdict(row.verdict),
    reasoning: typeof row.reasoning === 'string' ? row.reasoning : '',
    error: row.error === null || typeof row.error === 'string' ? row.error : null,
    created_at: typeof row.created_at === 'string' ? row.created_at : String(row.created_at ?? ''),
  }))
}

async function fetchJudgesByIds(judgeIds: string[]): Promise<Map<string, string>> {
  if (judgeIds.length === 0) return new Map()

  const { data, error } = await supabase.from('judges').select('id, name').in('id', judgeIds)

  if (error) throw new Error(error.message)

  const map = new Map<string, string>()
  for (const row of (data ?? []) as JudgeNameRow[]) {
    map.set(row.id, row.name)
  }
  return map
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
 * Loads evaluations with judge names and question text resolved from submissions JSONB.
 */
export async function fetchEvaluationsWithContext(): Promise<EvaluationRow[]> {
  const evaluations = await listEvaluations()

  const judgeIds = [...new Set(evaluations.map((e) => e.judge_id))]
  const submissionIds = [...new Set(evaluations.map((e) => e.submission_id))]

  const [judgeNames, submissions] = await Promise.all([
    fetchJudgesByIds(judgeIds),
    fetchSubmissionsByIds(submissionIds),
  ])

  const questionLookup = buildQuestionTextLookup(submissions)

  return evaluations.map((ev) => {
    const judgeName = judgeNames.get(ev.judge_id) ?? 'Unknown judge'
    const perSubmission = questionLookup.get(ev.submission_id)
    const questionText =
      perSubmission?.get(ev.question_id) ?? `Question ${ev.question_id}`

    return {
      id: ev.id,
      submission_id: ev.submission_id,
      question_id: ev.question_id,
      judge_id: ev.judge_id,
      judge_name: judgeName,
      question_text: questionText,
      verdict: ev.verdict,
      reasoning: ev.reasoning,
      error: ev.error,
      created_at: ev.created_at,
    }
  })
}
