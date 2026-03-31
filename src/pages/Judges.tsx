import { useCallback, useEffect, useMemo, useState } from 'react'
import JudgeForm, { toJudgeInput } from '../components/JudgeForm'
import JudgeRow from '../components/JudgeRow'
import {
  createJudge,
  deleteJudge,
  listJudges,
  setJudgeActive,
  updateJudge,
} from '../lib/judges'
import type { Judge } from '../types'
import type { JudgeInput } from '../lib/judges'

type FormMode =
  | { type: 'create' }
  | {
      type: 'edit'
      judge: Judge
    }
  | null

function Judges() {
  const [judges, setJudges] = useState<Judge[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<FormMode>(null)

  const fetchJudges = useCallback(async () => {
    setIsLoading(true)
    setLoadError(null)

    try {
      const rows = await listJudges()
      setJudges(rows)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to load judges.')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchJudges()
  }, [fetchJudges])

  const initialFormValues = useMemo<JudgeInput | undefined>(() => {
    if (!formMode || formMode.type === 'create') return undefined
    return toJudgeInput(formMode.judge)
  }, [formMode])

  const formKey = useMemo(() => {
    if (!formMode) return 'none'
    return formMode.type === 'create' ? 'create' : `edit-${formMode.judge.id}`
  }, [formMode])

  const handleSave = useCallback(
    async (values: JudgeInput) => {
      setIsMutating(true)
      setSubmitError(null)

      try {
        if (formMode?.type === 'edit') {
          const updated = await updateJudge(formMode.judge.id, values)
          setJudges((previous) =>
            previous.map((judge) => (judge.id === updated.id ? updated : judge)),
          )
        } else {
          const created = await createJudge(values)
          setJudges((previous) => [created, ...previous])
        }

        setFormMode(null)
      } catch (error) {
        setSubmitError(error instanceof Error ? error.message : 'Failed to save judge.')
      } finally {
        setIsMutating(false)
      }
    },
    [formMode],
  )

  const handleToggleActive = useCallback(async (judge: Judge) => {
    setIsMutating(true)

    try {
      const updated = await setJudgeActive(judge.id, !judge.active)
      setJudges((previous) => previous.map((row) => (row.id === updated.id ? updated : row)))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to update judge status.')
    } finally {
      setIsMutating(false)
    }
  }, [])

  const handleDelete = useCallback(async (judge: Judge) => {
    const confirmed = window.confirm(`Delete judge "${judge.name}"? This action cannot be undone.`)
    if (!confirmed) return

    setIsMutating(true)

    try {
      await deleteJudge(judge.id)
      setJudges((previous) => previous.filter((row) => row.id !== judge.id))
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Failed to delete judge.')
    } finally {
      setIsMutating(false)
    }
  }, [])

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Judges</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create, update, activate, or deactivate AI judges.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setSubmitError(null)
            setFormMode({ type: 'create' })
          }}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          New Judge
        </button>
      </div>

      {formMode ? (
        <JudgeForm
          key={formKey}
          initialValues={initialFormValues}
          onSubmit={handleSave}
          onCancel={() => {
            setSubmitError(null)
            setFormMode(null)
          }}
          isSubmitting={isMutating}
          submitError={submitError}
        />
      ) : null}

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Loading judges...
        </div>
      ) : null}

      {!isLoading && loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {loadError}
        </div>
      ) : null}

      {!isLoading && !loadError && judges.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No judges yet. Create one to get started.
        </div>
      ) : null}

      {!isLoading && !loadError && judges.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Name
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Model
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Status
                </th>
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {judges.map((judge) => (
                <JudgeRow
                  key={judge.id}
                  judge={judge}
                  isBusy={isMutating}
                  onEdit={(selected) => {
                    setSubmitError(null)
                    setFormMode({ type: 'edit', judge: selected })
                  }}
                  onToggleActive={handleToggleActive}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

export default Judges
