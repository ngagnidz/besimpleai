import { useQuery } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QueueListSkeleton } from '../components/queues/QueueListSkeleton'
import { ResultsTable } from '../components/results/ResultsTable'
import {
  fetchEvaluationsForQueues,
  fetchJudges,
  fetchQuestionsByQueueIds,
  fetchQueueSummaries,
} from '../lib/queries'

function sameIdSetUnordered(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sb = new Set(b)
  return a.every((id) => sb.has(id))
}

function Results() {
  const [searchParams, setSearchParams] = useSearchParams()

  const [selectedQueueIds, setSelectedQueueIds] = useState<string[]>([])

  const summariesQuery = useQuery({
    queryKey: ['queues', 'summaries'],
    queryFn: fetchQueueSummaries,
    retry: 1,
  })

  useEffect(() => {
    const rows = summariesQuery.data
    if (!rows?.length) return
    const valid = new Set(rows.map((r) => r.id))
    const fromUrl = [
      ...new Set(searchParams.getAll('queue').filter((id) => valid.has(id))),
    ]

    setSelectedQueueIds((prev) => {
      if (fromUrl.length > 0) {
        return sameIdSetUnordered(prev, fromUrl) ? prev : [...fromUrl]
      }
      const kept = prev.filter((id) => valid.has(id))
      if (kept.length > 0) return kept
      return [rows[0].id]
    })
  }, [summariesQuery.data, searchParams])

  const setQueuesInUrl = useCallback(
    (ids: string[]) => {
      const params = new URLSearchParams()
      ids.forEach((id) => params.append('queue', id))
      setSearchParams(params, { replace: true })
    },
    [setSearchParams],
  )

  const setSelectedQueues = useCallback(
    (ids: string[]) => {
      if (ids.length === 0) return
      setSelectedQueueIds(ids)
      setQueuesInUrl(ids)
    },
    [setQueuesInUrl],
  )

  const queuesKey = useMemo(() => [...selectedQueueIds].sort().join('|'), [selectedQueueIds])

  const evaluationsQuery = useQuery({
    queryKey: ['evaluations', 'multi', queuesKey],
    queryFn: () => fetchEvaluationsForQueues(selectedQueueIds),
    enabled: selectedQueueIds.length > 0,
    retry: 1,
  })

  const questionsQuery = useQuery({
    queryKey: ['questions', 'multi', queuesKey],
    queryFn: () => fetchQuestionsByQueueIds(selectedQueueIds),
    enabled: selectedQueueIds.length > 0,
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
    selectedQueueIds.length > 0 &&
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
      <div className="mx-auto flex w-full max-w-[1360px] flex-1 flex-col px-4 py-8 sm:px-6">
        <header className="animate-queues-panel-in max-w-2xl space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Results</h1>
          <p className="text-sm leading-relaxed text-slate-600">
            Select one or more queues, then narrow by judge, question, or verdict. Newest evaluations first.
          </p>
        </header>

        <div className="mt-8 flex-1 space-y-4 pb-16">
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
            <div className="max-w-xl rounded-xl border border-dashed border-slate-300/60 bg-white/70 px-6 py-12 text-center backdrop-blur-sm">
              <p className="text-sm font-medium text-slate-800">No queues yet</p>
              <p className="mt-1.5 text-sm text-slate-600">
                Upload data and run judges from a queue to see results here.
              </p>
            </div>
          ) : null}

          {!summariesLoading && !summariesError && queues.length > 0 ? (
            <>
              {detailError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {detailError}
                </div>
              ) : null}

              {!detailError && selectedQueueIds.length > 0 ? (
                <ResultsTable
                  queues={queues}
                  selectedQueueIds={selectedQueueIds}
                  onQueueSelectionChange={setSelectedQueues}
                  evaluations={evaluationsQuery.data ?? []}
                  questions={questionsQuery.data ?? []}
                  judges={judgesQuery.data ?? []}
                  detailLoading={detailLoading}
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
