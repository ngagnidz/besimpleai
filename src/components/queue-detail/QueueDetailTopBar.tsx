import { Link } from 'react-router-dom'
import type { RunProgress } from '../../lib/runner'

type QueueDetailTopBarProps = {
  canRunAiJudges: boolean
  onRun: () => void
  isRunning: boolean
  progress: RunProgress | null
}

export function QueueDetailTopBar({
  canRunAiJudges,
  onRun,
  isRunning,
  progress,
}: QueueDetailTopBarProps) {
  const runFinished =
    progress != null &&
    !isRunning &&
    progress.completed + progress.failed === progress.planned

  const doneSoFar = progress != null ? progress.completed + progress.failed : 0

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-4">
      <Link to="/queues" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
        ← Queues
      </Link>
      <div className="flex flex-wrap items-center gap-3">
        {isRunning ? (
          <span className="text-sm text-slate-600">
            Running… {progress != null ? `${doneSoFar}/${progress.planned}` : '—'}
          </span>
        ) : null}
        {runFinished ? (
          <span className="text-sm text-slate-600">
            Done — {progress.completed} completed, {progress.failed} failed
          </span>
        ) : null}
        <button
          type="button"
          disabled={isRunning || !canRunAiJudges}
          onClick={onRun}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run AI Judges
        </button>
      </div>
    </div>
  )
}
