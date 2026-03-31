import type { Judge } from '../types'

type JudgeRowProps = {
  judge: Judge
  isBusy: boolean
  onEdit: (judge: Judge) => void
  onToggleActive: (judge: Judge) => Promise<void>
  onDelete: (judge: Judge) => Promise<void>
}

function JudgeRow({ judge, isBusy, onEdit, onToggleActive, onDelete }: JudgeRowProps) {
  return (
    <tr className="border-t border-slate-200">
      <td className="px-4 py-3 text-sm font-medium text-slate-900">{judge.name}</td>
      <td className="px-4 py-3 text-sm text-slate-700">{judge.model_name}</td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
            judge.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
          }`}
        >
          {judge.active ? 'Active' : 'Inactive'}
        </span>
      </td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onEdit(judge)}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Edit
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onToggleActive(judge)}
            className="rounded-md border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {judge.active ? 'Deactivate' : 'Activate'}
          </button>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => void onDelete(judge)}
            className="rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

export default JudgeRow
