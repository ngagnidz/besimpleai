import { Link } from 'react-router-dom'
import type { RunProgress } from '../../lib/runner'

type QueueDetailTopBarProps = {
  queueId: string
  canRunAiJudges: boolean
  onRun: () => void
  isRunning: boolean
  progress: RunProgress | null
}

function PlayIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path d="M6.3 2.84A1.5 1.5 0 0 0 4 4.11v11.77a1.5 1.5 0 0 0 2.3 1.27l9.2-5.89a1.5 1.5 0 0 0 0-2.54L6.3 2.84Z" />
    </svg>
  )
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
    <div className="flex w-full min-w-0 flex-col items-stretch gap-3 sm:w-auto sm:min-w-[16rem] sm:items-end">
      <div className="flex flex-wrap items-center justify-end gap-2 sm:justify-end">
        {isRunning ? (
          <span className="text-sm text-stone-600">
            Running… {progress != null ? `${doneSoFar}/${progress.planned}` : '—'}
          </span>
        ) : null}
        {runFinished && progress ? (
          <span className="text-sm text-stone-600">
            Done — {progress.completed} ok, {progress.failed} failed
          </span>
        ) : null}
        {runFinished ? (
          <Link
            to={resultsHref}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700"
          >
            View results
          </Link>
        ) : (
          <button
            type="button"
            disabled={isRunning || !canRunAiJudges}
            onClick={onRun}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PlayIcon className="size-4 shrink-0 opacity-95" />
            Run AI Judges
          </button>
        )}
      </div>

      {isRunning ? (
        <div className="w-full max-w-md space-y-2 sm:ml-auto">
          <div
            className="h-2 overflow-hidden rounded-full bg-stone-200/80"
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
