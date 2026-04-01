import { Link } from 'react-router-dom'

type QueueDetailTopBarProps = {
  canRunAiJudges: boolean
}

export function QueueDetailTopBar({ canRunAiJudges }: QueueDetailTopBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <Link to="/queues" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Queues
      </Link>
      <button
        type="button"
        disabled={!canRunAiJudges}
        className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Run AI Judges
      </button>
    </div>
  )
}
