import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { QueueDetailPageHeader } from '../components/queue-detail/QueueDetailPageHeader'
import { QueueDetailSkeleton } from '../components/queue-detail/QueueDetailSkeleton'
import { QueueDetailStatsCards } from '../components/queue-detail/QueueDetailStatsCards'
import { QueueDetailTopBar } from '../components/queue-detail/QueueDetailTopBar'
import { QueueQuestionsTable } from '../components/queue-detail/QueueQuestionsTable'
import { computeQueueEvalStats } from '../components/queue-detail/queueEvalStats'
import { formatRunAgo } from '../components/queue-detail/relativeTime'
import { assignJudge, unassignJudge } from '../lib/assignments'
import { runEvaluations, type RunProgress } from '../lib/runner'
import {
  fetchActiveJudges,
  fetchEvaluationsForQueue,
  fetchJudgeAssignmentsForQueue,
  fetchQuestionsByQueueId,
} from '../lib/queries'
import { fetchQueueRunsMeta } from '../lib/queueStats'
import type { JudgeAssignment } from '../types'

function judgeIdsForQuestion(assignments: JudgeAssignment[], questionId: string): string[] {
  return assignments.filter((a) => a.question_id === questionId).map((a) => a.judge_id)
}

function ScrollToQuestionsButton() {
  return (
    <div className="flex justify-center pt-10 pb-6">
      <button
        type="button"
        onClick={() => document.getElementById('queue-questions')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex size-11 items-center justify-center rounded-full border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-700"
        aria-label="Scroll to questions"
      >
        <svg className="size-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path
            fillRule="evenodd"
            d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>
    </div>
  )
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
      await queryClient.invalidateQueries({ queryKey: ['queue_judge_runs', queueId] })
      await queryClient.invalidateQueries({ queryKey: ['queues', 'summaries'] })
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

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations', queueId],
    queryFn: () => fetchEvaluationsForQueue(queueId),
    enabled: queueId.length > 0,
    retry: 1,
  })

  const queueRunsMetaQuery = useQuery({
    queryKey: ['queue_judge_runs', queueId],
    queryFn: () => fetchQueueRunsMeta(queueId),
    enabled: queueId.length > 0,
    retry: 1,
  })

  const detailDataReady =
    questionsQuery.isFetched && judgesQuery.isFetched && assignmentsQuery.isFetched

  const showDetailSkeleton = queueId.length > 0 && !detailDataReady

  const questions = questionsQuery.data ?? []
  const judges = judgesQuery.data ?? []
  const assignments = assignmentsQuery.data ?? []

  const evalStats = useMemo(
    () => computeQueueEvalStats(evaluationsQuery.data ?? []),
    [evaluationsQuery.data],
  )

  const assignedJudgeCount = useMemo(() => {
    const list = assignmentsQuery.data ?? []
    return new Set(list.map((a) => a.judge_id)).size
  }, [assignmentsQuery.data])

  const canRunAiJudges = useMemo(() => {
    const qs = questionsQuery.data ?? []
    const asn = assignmentsQuery.data ?? []
    const activeIds = new Set((judgesQuery.data ?? []).map((j) => j.id))
    if (qs.length === 0 || activeIds.size === 0) return false
    return asn.some((a) => activeIds.has(a.judge_id) && qs.some((q) => q.id === a.question_id))
  }, [questionsQuery.data, assignmentsQuery.data, judgesQuery.data])

  const runButtonDisabledTitle = useMemo(() => {
    if (canRunAiJudges) return undefined
    const qs = questionsQuery.data ?? []
    const activeCount = (judgesQuery.data ?? []).length
    if (qs.length === 0) return 'This queue has no questions yet.'
    if (activeCount === 0) return 'No active judges — create or activate one on the Judges page.'
    return 'Assign at least one active judge to a question in this queue.'
  }, [canRunAiJudges, questionsQuery.data, judgesQuery.data])

  const lastRunIso =
    queueRunsMetaQuery.data?.lastCreatedAt ?? evalStats.lastEvalIso ?? null
  const lastRunText = lastRunIso === null ? 'never' : formatRunAgo(lastRunIso)

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
        <p className="text-sm text-stone-600">Missing queue id.</p>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-3.5rem)] bg-gradient-to-b from-slate-50/90 via-white to-indigo-50/35">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        {fetchError ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {fetchError}
          </div>
        ) : null}

        {showDetailSkeleton ? (
          <QueueDetailSkeleton rows={5} />
        ) : (
          <>
            <div className="animate-queues-panel-in">
              <QueueDetailPageHeader
                queueId={queueId}
                questionsCount={questions.length}
                assignedJudgeCount={assignedJudgeCount}
                lastRunText={lastRunText}
                readyForRun={canRunAiJudges}
                runActions={
                  <QueueDetailTopBar
                    queueId={queueId}
                    canRunAiJudges={canRunAiJudges}
                    runDisabledTitle={runButtonDisabledTitle}
                    onRun={handleRun}
                    isRunning={isRunning}
                    progress={progress}
                  />
                }
              />
            </div>
            <div className="animate-queues-panel-in">
              <QueueDetailStatsCards
                questionsCount={questions.length}
                passRatePct={evalStats.passRatePct}
                queueRunCount={queueRunsMetaQuery.data?.count ?? 0}
              />
            </div>
            <QueueQuestionsTable
              key={queueId}
              questions={questions}
              judges={judges}
              assignments={assignments}
              onJudgeSelectionChange={onJudgeSelectionChange}
            />
            <ScrollToQuestionsButton />
          </>
        )}
      </div>
    </div>
  )
}

export default QueueDetailPage
