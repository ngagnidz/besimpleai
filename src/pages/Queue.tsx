import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { addAssignment, listAssignments, removeAssignment } from '../lib/assignments'
import { listActiveJudges } from '../lib/judges'
import { runQueue } from '../lib/runner'
import { listSubmissionsByQueue } from '../lib/submissions'
import type { Judge, JsonValue, QuestionJudgeAssignment, Submission } from '../types'
import type { RunSummary } from '../lib/runner'

type SubmissionQuestion = {
  id: string
  questionText: string
  questionType: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function extractSubmissionQuestions(questions: JsonValue): SubmissionQuestion[] {
  if (!Array.isArray(questions)) return []

  return questions.flatMap((item): SubmissionQuestion[] => {
    if (!isRecord(item)) return []
    const data = item.data
    if (!isRecord(data)) return []

    const id = data.id
    const questionText = data.questionText
    const questionType = data.questionType

    if (
      typeof id !== 'string' ||
      typeof questionText !== 'string' ||
      typeof questionType !== 'string'
    ) {
      return []
    }

    return [{ id, questionText, questionType }]
  })
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString()
}

function Queue() {
  const { queueId } = useParams<{ queueId: string }>()
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [judges, setJudges] = useState<Judge[]>([])
  const [assignments, setAssignments] = useState<QuestionJudgeAssignment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<RunSummary | null>(null)
  const [summary, setSummary] = useState<RunSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  const assignmentSet = useMemo(() => {
    return new Set(assignments.map((item) => `${item.question_id}::${item.judge_id}`))
  }, [assignments])

  const loadData = useCallback(async () => {
    if (!queueId) return

    setIsLoading(true)
    setError(null)

    try {
      const [submissionRows, activeJudges, assignmentRows] = await Promise.all([
        listSubmissionsByQueue(queueId),
        listActiveJudges(),
        listAssignments(queueId),
      ])

      setSubmissions(submissionRows)
      setJudges(activeJudges)
      setAssignments(assignmentRows)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to load queue data.')
    } finally {
      setIsLoading(false)
    }
  }, [queueId])

  useEffect(() => {
    void loadData()
  }, [loadData])

  const toggleAssignment = useCallback(
    async (questionId: string, judgeId: string, shouldAssign: boolean) => {
      if (!queueId) return
      setIsSavingAssignment(true)
      setError(null)

      try {
        if (shouldAssign) {
          const created = await addAssignment(queueId, questionId, judgeId)
          setAssignments((previous) => {
            const exists = previous.some(
              (item) => item.question_id === questionId && item.judge_id === judgeId,
            )
            return exists ? previous : [...previous, created]
          })
        } else {
          await removeAssignment(queueId, questionId, judgeId)
          setAssignments((previous) =>
            previous.filter(
              (item) => !(item.question_id === questionId && item.judge_id === judgeId),
            ),
          )
        }
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Failed to save assignment.')
      } finally {
        setIsSavingAssignment(false)
      }
    },
    [queueId],
  )

  const onRun = useCallback(async () => {
    if (!queueId) return

    setIsRunning(true)
    setSummary(null)
    setError(null)
    setProgress({ planned: 0, completed: 0, failed: 0 })

    try {
      const finalSummary = await runQueue(queueId, {
        onProgress: (value) => {
          setProgress(value)
        },
      })
      setSummary(finalSummary)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Failed to run AI judges.')
    } finally {
      setIsRunning(false)
    }
  }, [queueId])

  if (!queueId) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          Missing queue ID.
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Queue: {queueId}</h1>
        <button
          type="button"
          disabled={isRunning || assignmentSet.size === 0}
          onClick={() => void onRun()}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isRunning ? 'Running...' : 'Run AI Judges'}
        </button>
      </div>

      {progress ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Planned: {progress.planned} | Completed: {progress.completed} | Failed: {progress.failed}
        </div>
      ) : null}

      {summary ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Run complete: {summary.completed} completed, {summary.failed} failed
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Loading queue...
        </div>
      ) : null}

      {!isLoading && submissions.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No submissions in this queue yet.
        </div>
      ) : null}

      {!isLoading && submissions.length > 0 ? (
        <div className="space-y-4">
          {submissions.map((submission) => {
            const questions = extractSubmissionQuestions(submission.questions)

            return (
              <section key={submission.id} className="rounded-lg border border-slate-200 bg-white p-5">
                <div className="mb-4 border-b border-slate-100 pb-3">
                  <p className="text-sm font-semibold text-slate-900">{submission.id}</p>
                  <p className="text-xs text-slate-500">{formatDate(submission.created_at)}</p>
                </div>

                <div className="space-y-4">
                  {questions.map((question) => (
                    <article key={`${submission.id}-${question.id}`} className="rounded-md border border-slate-200 p-4">
                      <p className="text-sm font-medium text-slate-900">{question.questionText}</p>
                      <p className="mt-1 text-xs text-slate-500">Type: {question.questionType}</p>

                      <div className="mt-3 flex flex-wrap gap-3">
                        {judges.map((judge) => {
                          const key = `${question.id}::${judge.id}`
                          const checked = assignmentSet.has(key)

                          return (
                            <label
                              key={judge.id}
                              className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-700"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                disabled={isSavingAssignment || isRunning}
                                onChange={(event) => {
                                  void toggleAssignment(question.id, judge.id, event.target.checked)
                                }}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span>{judge.name}</span>
                            </label>
                          )
                        })}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

export default Queue
