import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useState } from 'react'
import { JudgeCard } from '../components/judges/JudgeCard'
import { JudgeFormPanel, type JudgeFormSubmitValues } from '../components/judges/JudgeFormPanel'
import { JudgesListSkeleton } from '../components/judges/JudgesListSkeleton'
import type { Judge } from '../types'
import { deleteJudge, saveJudge, setJudgeActive } from '../lib/judges'
import { fetchJudges } from '../lib/queries'

const JUDGES_QUERY_KEY = ['judges'] as const

function Judges() {
  const queryClient = useQueryClient()
  const [panelOpen, setPanelOpen] = useState(false)
  const [editingJudge, setEditingJudge] = useState<Judge | null>(null)

  const judgesQuery = useQuery({
    queryKey: JUDGES_QUERY_KEY,
    queryFn: fetchJudges,
    retry: 1,
  })

  const saveMutation = useMutation({
    mutationFn: (input: JudgeFormSubmitValues) => saveJudge(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: JUDGES_QUERY_KEY }),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteJudge(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: JUDGES_QUERY_KEY })
      queryClient.invalidateQueries({ queryKey: ['judges', 'active'] })
      queryClient.invalidateQueries({ queryKey: ['judge_assignments'] })
    },
    onError: (err) => {
      window.alert(err instanceof Error ? err.message : 'Failed to remove judge.')
    },
  })

  const removeJudge = useCallback(
    (judge: Judge) => {
      const ok = window.confirm(
        `Remove judge “${judge.name}”? This deletes the judge and all queue assignments for them. Past evaluations stay in results but may show without a judge name.`,
      )
      if (!ok) return
      if (editingJudge?.id === judge.id) {
        setPanelOpen(false)
        setEditingJudge(null)
      }
      deleteMutation.mutate(judge.id)
    },
    [editingJudge, deleteMutation],
  )

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setJudgeActive(id, active),
    onMutate: async ({ id, active }) => {
      await queryClient.cancelQueries({ queryKey: JUDGES_QUERY_KEY })
      const previous = queryClient.getQueryData<Judge[]>(JUDGES_QUERY_KEY)
      queryClient.setQueryData<Judge[]>(JUDGES_QUERY_KEY, (old) =>
        old?.map((j) => (j.id === id ? { ...j, active } : j)) ?? [],
      )
      return { previous }
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(JUDGES_QUERY_KEY, context.previous)
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: JUDGES_QUERY_KEY }),
  })

  const openCreate = useCallback(() => {
    setEditingJudge(null)
    setPanelOpen(true)
  }, [])

  const openEdit = useCallback((judge: Judge) => {
    setEditingJudge(judge)
    setPanelOpen(true)
  }, [])

  const closePanel = useCallback(() => {
    if (saveMutation.isPending) return
    setPanelOpen(false)
    setEditingJudge(null)
  }, [saveMutation.isPending])

  const data = judgesQuery.data ?? []
  const isLoading = judgesQuery.isLoading
  const isError = judgesQuery.isError
  const showEmpty = !isLoading && !isError && data.length === 0

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col bg-gradient-to-b from-slate-50/70 via-white to-indigo-50/15">
      <div className="mx-auto w-full max-w-6xl flex-1 px-6 py-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">Judges</h1>
          <button
            type="button"
            onClick={openCreate}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            + New Judge
          </button>
        </header>

        <div className="mt-8 pb-16">
          {isLoading ? <JudgesListSkeleton /> : null}

          {isError ? (
            <div className="max-w-xl rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {judgesQuery.error instanceof Error ? judgesQuery.error.message : 'Failed to load judges.'}
            </div>
          ) : null}

          {showEmpty ? (
            <div className="max-w-xl rounded-xl border border-dashed border-slate-300/60 bg-white/70 px-6 py-12 text-center">
              <p className="text-sm font-medium text-slate-800">No judges yet — create your first judge to get started</p>
            </div>
          ) : null}

          {!isLoading && !isError && data.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.map((judge) => (
                <JudgeCard
                  key={judge.id}
                  judge={judge}
                  onEdit={openEdit}
                  onToggleActive={(j) => toggleMutation.mutate({ id: j.id, active: !j.active })}
                  onRemove={removeJudge}
                  togglePending={toggleMutation.isPending && toggleMutation.variables?.id === judge.id}
                  removePending={deleteMutation.isPending && deleteMutation.variables === judge.id}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <JudgeFormPanel
        open={panelOpen}
        initialJudge={editingJudge}
        onClose={closePanel}
        isSaving={saveMutation.isPending}
        onSave={async (values) => {
          await saveMutation.mutateAsync(values)
        }}
      />
    </div>
  )
}

export default Judges
