import pLimit from 'p-limit'
import { listAssignments } from './assignments'
import { listActiveJudges } from './judges'
import { callLLM } from './llm'
import { listSubmissionsByQueue } from './submissions'
import { supabase } from './supabase'
import type { Judge, JsonValue, Submission, Verdict } from '../types'

type QueueQuestion = {
  id: string
  questionText: string
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractQuestions(value: JsonValue): QueueQuestion[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((question): QueueQuestion[] => {
    if (!isRecord(question)) return []
    const data = question.data
    if (!isRecord(data)) return []

    const id = data.id
    const questionText = data.questionText
    if (typeof id !== 'string' || typeof questionText !== 'string') return []

    return [{ id, questionText }]
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

  const summary: RunSummary = { planned: tasks.length, completed: 0, failed: 0 }
  options.onProgress?.(summary)

  const limit = pLimit(3)
  await Promise.all(
    tasks.map((task) =>
      limit(async () => {
        try {
          const result = await callLLM(task.judge, task.question.questionText, task.answer)
          await upsertEvaluation({
            submission_id: task.submission.id,
            question_id: task.question.id,
            judge_id: task.judge.id,
            verdict: result.verdict,
            reasoning: result.reasoning,
            error: null,
          })
          summary.completed += 1
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
          summary.failed += 1
        } finally {
          options.onProgress?.({ ...summary })
        }
      }),
    ),
  )

  return summary
}
