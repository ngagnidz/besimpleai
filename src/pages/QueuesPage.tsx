import { useQuery } from '@tanstack/react-query'
import QueueList from '../components/queues/QueueList'
import { QueueListSkeleton } from '../components/queues/QueueListSkeleton'
import { fetchQueueSummaries } from '../lib/queries'

function QueuesPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['queues', 'summaries'],
    queryFn: fetchQueueSummaries,
  })

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-b from-slate-50/70 via-white to-indigo-50/15">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        <header className="animate-queues-panel-in max-w-3xl space-y-1 pr-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Queues</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Each queue is its own workspace — open one to view questions and set up judges.
          </p>
        </header>

        <div className="mt-8 flex-1 pb-16">

          {isLoading ? (
            <div className="max-w-3xl">
              <QueueListSkeleton rows={3} />
            </div>
          ) : null}

          {isError ? (
            <div className="max-w-3xl rounded-xl border border-red-200/70 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800">
              {error instanceof Error ? error.message : 'Failed to load queues.'}
            </div>
          ) : null}

          {!isLoading && !isError && (data?.length ?? 0) === 0 ? (
            <div className="animate-queues-panel-in max-w-xl rounded-xl border border-dashed border-slate-300/60 bg-white/60 px-6 py-12 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-800">No queues yet</p>
              <p className="mt-1.5 text-sm text-slate-600">Upload a JSON file — we&apos;ll drop you here after import.</p>
            </div>
          ) : null}

          {!isLoading && !isError && data && data.length > 0 ? (
            <div className="max-w-3xl">
              <QueueList rows={data} />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default QueuesPage
