import pLimit from 'p-limit'
import { listAssignments } from './assignments'
import { listActiveJudges } from './judges'
import { callLLM } from './llm'
import { listSubmissionsByQueue } from './submissions'
import { supabase } from './supabase'
import { isRecord } from './utils'
import type { JsonValue, Judge, Submission, Verdict } from '../types'

type QueueQuestion = {
  id: string
  questionText: string
  questionType: string
}

type QueueTask = {
  submission: Submission
  question: QueueQuestion
  judge: Judge
  answer: unknown
}

export type RunSummary = {
  planned: number
  completed: number
  failed: number
}

type RunOptions = {
  onProgress?: (summary: RunSummary) => void
}

function extractQuestions(value: JsonValue): QueueQuestion[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((question): QueueQuestion[] => {
    if (!isRecord(question)) return []
    const data = question.data
    if (!isRecord(data)) return []

    const id = data.id
    const questionText = data.questionText
    const questionType = data.questionType
    if (
      typeof id !== 'string' ||
      typeof questionText !== 'string' ||
      typeof questionType !== 'string'
    )
      return []

    return [{ id, questionText, questionType }]
  })
}

function extractAnswer(answers: JsonValue, questionId: string): unknown {
  if (!isRecord(answers)) return null
  return answers[questionId] ?? null
}

async function upsertEvaluation(input: {
  submission_id: string
  question_id: string
  judge_id: string
  verdict: Verdict
  reasoning: string
  error: string | null
}): Promise<void> {
  const { error } = await supabase.from('evaluations').upsert(input, {
    onConflict: 'submission_id,question_id,judge_id',
  })

  if (error) throw new Error(error.message)
}

export async function runQueue(queueId: string, options: RunOptions = {}): Promise<RunSummary> {
  const [submissions, judges, assignments] = await Promise.all([
    listSubmissionsByQueue(queueId),
    listActiveJudges(),
    listAssignments(queueId),
  ])

  const assignmentsByQuestion = assignments.reduce<Record<string, Set<string>>>((acc, assignment) => {
    if (!acc[assignment.question_id]) acc[assignment.question_id] = new Set<string>()
    acc[assignment.question_id].add(assignment.judge_id)
    return acc
  }, {})

  const judgesById = new Map<string, Judge>(judges.map((judge) => [judge.id, judge]))

  const tasks: QueueTask[] = submissions.flatMap((submission) => {
    const questions = extractQuestions(submission.questions)

    return questions.flatMap((question): QueueTask[] => {
      const judgeIds = assignmentsByQuestion[question.id]
      if (!judgeIds || judgeIds.size === 0) return []

      return [...judgeIds]
        .map((judgeId) => {
          const judge = judgesById.get(judgeId)
          if (!judge) return null

          return {
            submission,
            question,
            judge,
            answer: extractAnswer(submission.answers, question.id),
          }
        })
        .filter((task): task is QueueTask => task !== null)
    })
  })

  const planned = tasks.length
  let runningCompleted = 0
  let runningFailed = 0
  options.onProgress?.({ planned, completed: 0, failed: 0 })

  const limit = pLimit(3)
  const results = await Promise.all(
    tasks.map((task) =>
      limit(async (): Promise<'completed' | 'failed'> => {
        let outcome: 'completed' | 'failed'
        try {
          const result = await callLLM(
            task.judge,
            task.question.questionText,
            task.question.questionType,
            task.answer,
          )
          await upsertEvaluation({
            submission_id: task.submission.id,
            question_id: task.question.id,
            judge_id: task.judge.id,
            verdict: result.verdict,
            reasoning: result.reasoning,
            error: null,
          })
          runningCompleted += 1
          outcome = 'completed'
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error'
          await upsertEvaluation({
            submission_id: task.submission.id,
            question_id: task.question.id,
            judge_id: task.judge.id,
            verdict: 'inconclusive',
            reasoning: '',
            error: message,
          })
          runningFailed += 1
          outcome = 'failed'
        }
        options.onProgress?.({ planned, completed: runningCompleted, failed: runningFailed })
        return outcome
      }),
    ),
  )

  const completed = results.filter((r) => r === 'completed').length
  const failed = results.filter((r) => r === 'failed').length
  return { planned, completed, failed }
}
