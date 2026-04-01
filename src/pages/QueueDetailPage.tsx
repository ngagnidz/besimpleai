import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { QueueDetailSkeleton } from '../components/queue-detail/QueueDetailSkeleton'
import { QueueDetailTopBar } from '../components/queue-detail/QueueDetailTopBar'
import { QueueQuestionsTable } from '../components/queue-detail/QueueQuestionsTable'
import { fetchQuestionsByQueueId } from '../lib/queries'

function QueueDetailPage() {
  const { queueId: queueIdParam } = useParams<{ queueId: string }>()
  const queueId = queueIdParam ? decodeURIComponent(queueIdParam) : ''

  const questionsQuery = useQuery({
    queryKey: ['questions', queueId],
    queryFn: () => fetchQuestionsByQueueId(queueId),
    enabled: queueId.length > 0,
    retry: 1,
  })

  const detailDataReady = questionsQuery.isFetched
  const showDetailSkeleton = queueId.length > 0 && !detailDataReady

  const questions = questionsQuery.data ?? []

  const canRunAiJudges = useMemo(() => questions.length > 0, [questions.length])

  const fetchError = questionsQuery.isError
    ? questionsQuery.error instanceof Error
      ? questionsQuery.error.message
      : null
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
      <QueueDetailTopBar canRunAiJudges={canRunAiJudges} />

      <header>
        <h1 className="font-mono text-2xl font-semibold tracking-tight text-slate-900">{queueId}</h1>
      </header>

      {fetchError ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {fetchError}
        </div>
      ) : null}

      {showDetailSkeleton ? <QueueDetailSkeleton rows={5} /> : <QueueQuestionsTable questions={questions} />}
    </div>
  )
}

export default QueueDetailPage
