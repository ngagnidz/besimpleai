import type { Judge } from '../../types'

type JudgeCardProps = {
  judge: Judge
  onEdit: (judge: Judge) => void
  onToggleActive: (judge: Judge) => void
  togglePending: boolean
}

export function JudgeCard({
  judge,
  onEdit,
  onToggleActive,
  togglePending,
}: JudgeCardProps) {
  const providerModel = `${judge.provider} / ${judge.model}`

  return (
    <article className="flex h-full min-h-[1px] flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-slate-900">{judge.name}</h2>
          <p className="mt-1 break-words font-mono text-sm leading-snug text-slate-600">{providerModel}</p>
        </div>
        <span
          className={
            judge.active
              ? 'shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800'
              : 'shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600'
          }
        >
          {judge.active ? 'Active' : 'Inactive'}
        </span>
      </div>

      <div className="mt-auto flex flex-wrap gap-2 pt-5">
        <button
          type="button"
          onClick={() => onEdit(judge)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          Edit
        </button>
        <button
          type="button"
          disabled={togglePending}
          onClick={() => onToggleActive(judge)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {judge.active ? 'Deactivate' : 'Activate'}
        </button>
      </div>
    </article>
  )
}
