import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { fetchSubmissionCountForQueue } from '../lib/queries'

function QueueDetailPage() {
  const { queueId } = useParams<{ queueId: string }>()
  const safeQueueId = queueId ?? ''

  const submissionCountQuery = useQuery({
    queryKey: ['submissions', safeQueueId, 'count'],
    queryFn: () => fetchSubmissionCountForQueue(safeQueueId),
    enabled: safeQueueId.length > 0,
  })

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10">
      <div className="space-y-2">
        <Link to="/queues" className="inline-block text-sm font-medium text-indigo-600 hover:text-indigo-700">
          ← Back to Queues
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900">Queue {safeQueueId || '—'}</h1>
        <p className="max-w-2xl text-sm text-slate-600">
          Workspace for this queue — configuration and tools will live here.
        </p>
        <p className="text-sm text-slate-700">
          {submissionCountQuery.isLoading ? (
            <span className="inline-block h-4 w-24 animate-pulse rounded bg-slate-200" />
          ) : submissionCountQuery.isError ? (
            <span className="text-red-700">Could not load submission count.</span>
          ) : (
            <span>
              <span className="font-medium text-slate-900">{submissionCountQuery.data ?? 0}</span> submission
              {(submissionCountQuery.data ?? 0) === 1 ? '' : 's'} imported for this queue.
            </span>
          )}
        </p>
      </div>
    </div>
  )
}

export default QueueDetailPage
