import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { QueueListSkeleton } from '../components/queues/QueueListSkeleton'
import { ResultsTable } from '../components/results/ResultsTable'
import { ResultsTableSkeleton } from '../components/results/ResultsTableSkeleton'
import {
  fetchEvaluationsForQueue,
  fetchJudges,
  fetchQuestionsByQueueId,
  fetchQueueSummaries,
} from '../lib/queries'

function Results() {
  const [selectedQueueId, setSelectedQueueId] = useState('')

  const summariesQuery = useQuery({
    queryKey: ['queues', 'summaries'],
    queryFn: fetchQueueSummaries,
    retry: 1,
  })

  useEffect(() => {
    const rows = summariesQuery.data
    if (!rows?.length) return
    setSelectedQueueId((prev) => {
      if (prev && rows.some((r) => r.id === prev)) return prev
      return rows[0].id
    })
  }, [summariesQuery.data])

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations', selectedQueueId],
    queryFn: () => fetchEvaluationsForQueue(selectedQueueId),
    enabled: selectedQueueId.length > 0,
    retry: 1,
  })

  const questionsQuery = useQuery({
    queryKey: ['questions', selectedQueueId],
    queryFn: () => fetchQuestionsByQueueId(selectedQueueId),
    enabled: selectedQueueId.length > 0,
    retry: 1,
  })

  const judgesQuery = useQuery({
    queryKey: ['judges'],
    queryFn: fetchJudges,
    retry: 1,
  })

  const summariesLoading = summariesQuery.isLoading
  const summariesError = summariesQuery.isError

  const detailLoading =
    selectedQueueId.length > 0 &&
    (evaluationsQuery.isLoading || questionsQuery.isLoading || judgesQuery.isLoading)

  const detailError =
    evaluationsQuery.isError || questionsQuery.isError || judgesQuery.isError
      ? [
          evaluationsQuery.error instanceof Error ? evaluationsQuery.error.message : null,
          questionsQuery.error instanceof Error ? questionsQuery.error.message : null,
          judgesQuery.error instanceof Error ? judgesQuery.error.message : null,
        ]
          .filter(Boolean)
          .join(' ')
      : null

  const queues = summariesQuery.data ?? []
  const showQueueEmpty = !summariesLoading && !summariesError && queues.length === 0

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-b from-slate-50/70 via-white to-indigo-50/15">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-6 py-8">
        <header className="animate-queues-panel-in max-w-3xl space-y-1 pr-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Results</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Evaluation history from AI judges, grouped by queue. Newest rows appear first.
          </p>
        </header>

        <div className="mt-8 flex-1 space-y-6 pb-16">
          {summariesLoading ? (
            <div className="max-w-3xl">
              <QueueListSkeleton rows={3} />
            </div>
          ) : null}

          {summariesError ? (
            <div className="max-w-3xl rounded-xl border border-red-200/70 bg-red-50/90 px-3.5 py-2.5 text-sm text-red-800">
              {summariesQuery.error instanceof Error ? summariesQuery.error.message : 'Failed to load queues.'}
            </div>
          ) : null}

          {showQueueEmpty ? (
            <div className="max-w-xl rounded-xl border border-dashed border-slate-300/60 bg-white/60 px-6 py-12 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-800">No queues yet</p>
              <p className="mt-1.5 text-sm text-slate-600">
                Upload data and run judges from a queue to see results here.
              </p>
            </div>
          ) : null}

          {!summariesLoading && !summariesError && queues.length > 0 ? (
            <>
              <div className="animate-queues-panel-in flex max-w-3xl flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div className="min-w-0 flex-1">
                  <label htmlFor="results-queue" className="block text-xs font-medium uppercase tracking-wide text-slate-500">
                    Queue
                  </label>
                  <select
                    id="results-queue"
                    value={selectedQueueId}
                    onChange={(e) => setSelectedQueueId(e.target.value)}
                    className="mt-1.5 w-full max-w-xl rounded-lg border border-slate-200 bg-white px-3 py-2.5 font-mono text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.id}
                      </option>
                    ))}
                  </select>
                </div>
                {selectedQueueId ? (
                  <Link
                    to={`/queues/${encodeURIComponent(selectedQueueId)}`}
                    className="shrink-0 text-sm font-medium text-indigo-600 hover:text-indigo-700"
                  >
                    Open queue →
                  </Link>
                ) : null}
              </div>

              {detailError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {detailError}
                </div>
              ) : null}

              {detailLoading ? <ResultsTableSkeleton rows={7} /> : null}

              {!detailLoading && !detailError && selectedQueueId ? (
                <ResultsTable
                  key={selectedQueueId}
                  evaluations={evaluationsQuery.data ?? []}
                  questions={questionsQuery.data ?? []}
                  judges={judgesQuery.data ?? []}
                />
              ) : null}
            </>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Results
