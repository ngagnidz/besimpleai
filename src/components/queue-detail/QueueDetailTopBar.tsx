import { Link } from 'react-router-dom'
import type { RunProgress } from '../../lib/runner'

type QueueDetailTopBarProps = {
  queueId: string
  canRunAiJudges: boolean
  onRun: () => void
  isRunning: boolean
  progress: RunProgress | null
}

export function QueueDetailTopBar({
  queueId,
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

  const barPct =
    progress != null && progress.planned > 0
      ? Math.min(100, (doneSoFar / progress.planned) * 100)
      : 0

  const resultsHref = `/results?queue=${encodeURIComponent(queueId)}`

  return (
    <div className="border-b border-slate-200 pb-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
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
          {runFinished ? (
            <Link
              to={resultsHref}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700"
            >
              View results
            </Link>
          ) : (
            <button
              type="button"
              disabled={isRunning || !canRunAiJudges}
              onClick={onRun}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Run AI Judges
            </button>
          )}
        </div>
      </div>

      {isRunning ? (
        <div className="mt-4 space-y-2">
          <div
            className="h-2 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-valuenow={progress != null && progress.planned > 0 ? Math.round(barPct) : undefined}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Evaluation progress"
          >
            <div
              className="h-full rounded-full bg-indigo-600 transition-[width] duration-300 ease-out"
              style={{ width: `${barPct}%` }}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}
