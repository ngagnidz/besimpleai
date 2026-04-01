import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QueueDetailSkeleton } from '../components/queue-detail/QueueDetailSkeleton'
import { QueueDetailTopBar } from '../components/queue-detail/QueueDetailTopBar'
import { QueueQuestionsTable } from '../components/queue-detail/QueueQuestionsTable'
import { assignJudge, unassignJudge } from '../lib/assignments'
import { runEvaluations, type RunProgress } from '../lib/runner'
import {
  fetchActiveJudges,
  fetchJudgeAssignmentsForQueue,
  fetchQuestionsByQueueId,
} from '../lib/queries'
import type { JudgeAssignment } from '../types'

function judgeIdsForQuestion(assignments: JudgeAssignment[], questionId: string): string[] {
  return assignments.filter((a) => a.question_id === questionId).map((a) => a.judge_id)
}

function QueueDetailPage() {
  const queryClient = useQueryClient()
  const { queueId: queueIdParam } = useParams<{ queueId: string }>()
  const queueId = queueIdParam ? decodeURIComponent(queueIdParam) : ''

  const [isRunning, setIsRunning] = useState(false)
  const [progress, setProgress] = useState<RunProgress | null>(null)

  const handleRun = useCallback(async () => {
    if (!queueId) return
    setProgress(null)
    setIsRunning(true)
    try {
      await runEvaluations(queueId, setProgress)
    } finally {
      setIsRunning(false)
      await queryClient.invalidateQueries({ queryKey: ['evaluations', queueId] })
    }
  }, [queueId, queryClient])

  const questionsQuery = useQuery({
    queryKey: ['questions', queueId],
    queryFn: () => fetchQuestionsByQueueId(queueId),
    enabled: queueId.length > 0,
    retry: 1,
  })

  const judgesQuery = useQuery({
    queryKey: ['judges', 'active'],
    queryFn: fetchActiveJudges,
    retry: 1,
  })

  const assignmentsQuery = useQuery({
    queryKey: ['judge_assignments', queueId],
    queryFn: () => fetchJudgeAssignmentsForQueue(queueId),
    enabled: queueId.length > 0,
    retry: 1,
  })

  const detailDataReady =
    questionsQuery.isFetched && judgesQuery.isFetched && assignmentsQuery.isFetched

  const showDetailSkeleton = queueId.length > 0 && !detailDataReady

  const questions = questionsQuery.data ?? []
  const judges = judgesQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  const canRunAiJudges = useMemo(
    () =>
      questions.length > 0 &&
      assignments.some((a) => questions.some((q) => q.id === a.question_id)),
    [questions, assignments],
  )

  const onJudgeSelectionChange = useCallback(
    async (questionId: string, nextJudgeIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ['judge_assignments', queueId] })
      const snapshot = queryClient.getQueryData<JudgeAssignment[]>(['judge_assignments', queueId]) ?? []
      const prev = judgeIdsForQuestion(snapshot, questionId)
      const added = nextJudgeIds.filter((id) => !prev.includes(id))
      const removed = prev.filter((id) => !nextJudgeIds.includes(id))

      const optimistic: JudgeAssignment[] = [
        ...snapshot.filter(
          (a) => !(a.question_id === questionId && removed.includes(a.judge_id)),
        ),
        ...added.map((judgeId) => ({
          id: `optimistic-${questionId}-${judgeId}-${Date.now()}`,
          queue_id: queueId,
          question_id: questionId,
          judge_id: judgeId,
        })),
      ]
      queryClient.setQueryData(['judge_assignments', queueId], optimistic)

      try {
        await Promise.all([
          ...added.map((judgeId) => assignJudge(queueId, questionId, judgeId)),
          ...removed.map((judgeId) => unassignJudge(queueId, questionId, judgeId)),
        ])
        await queryClient.invalidateQueries({ queryKey: ['judge_assignments', queueId] })
      } catch {
        queryClient.setQueryData(['judge_assignments', queueId], snapshot)
      }
    },
    [queueId, queryClient],
  )

  const fetchError =
    questionsQuery.isError || judgesQuery.isError || assignmentsQuery.isError
      ? [
          questionsQuery.error instanceof Error ? questionsQuery.error.message : null,
          judgesQuery.error instanceof Error ? judgesQuery.error.message : null,
          assignmentsQuery.error instanceof Error ? assignmentsQuery.error.message : null,
        ]
          .filter(Boolean)
          .join(' ')
      : null

  if (!queueId) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10">
        <p className="text-sm text-slate-600">Missing queue id.</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="animate-queues-panel-in">
        <QueueDetailTopBar
          canRunAiJudges={canRunAiJudges}
          onRun={handleRun}
          isRunning={isRunning}
          progress={progress}
        />
      </div>

      <header className="animate-queues-panel-in">
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-slate-900">{queueId}</h1>
      </header>

      {fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fetchError}
        </div>
      ) : null}

      {showDetailSkeleton ? (
        <QueueDetailSkeleton rows={5} />
      ) : (
        <QueueQuestionsTable
          key={queueId}
          questions={questions}
          judges={judges}
          assignments={assignments}
          onJudgeSelectionChange={onJudgeSelectionChange}
        />
      )}
    </div>
  )
}

export default QueueDetailPage
