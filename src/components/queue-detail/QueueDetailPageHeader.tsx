import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { formatDbLabel } from '../../lib/utils'

type QueueDetailPageHeaderProps = {
  queueId: string
  questionsCount: number
  assignedJudgeCount: number
  lastRunText: string
  readyForRun: boolean
  runActions: ReactNode
}

export function QueueDetailPageHeader({
  queueId,
  questionsCount,
  assignedJudgeCount,
  lastRunText,
  readyForRun,
  runActions,
}: QueueDetailPageHeaderProps) {
  const qLabel = questionsCount === 1 ? 'question' : 'questions'
  const jLabel = assignedJudgeCount === 1 ? 'judge' : 'judges'
  const queueTitle = formatDbLabel(queueId, 'queue')

  return (
    <header className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <nav aria-label="Breadcrumb" className="text-sm text-stone-600">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <li>
              <Link to="/queues" className="font-medium text-indigo-700 hover:text-indigo-800">
                Queues
              </Link>
            </li>
            <li aria-hidden className="text-stone-400">
              /
            </li>
            <li className="font-medium text-stone-900" title={queueId}>
              {queueTitle}
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">{runActions}</div>
      </div>

      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-stone-900" title={queueId}>
          {queueTitle}
        </h1>
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-2 text-sm text-stone-600">
          <span>
            {questionsCount} {qLabel}
          </span>
          <span aria-hidden className="text-stone-300">
            •
          </span>
          <span>
            {assignedJudgeCount} {jLabel} assigned
          </span>
          <span aria-hidden className="text-stone-300">
            •
          </span>
          <span>Last run {lastRunText}</span>
          <span aria-hidden className="text-stone-300">
            •
          </span>
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
              readyForRun
                ? 'bg-emerald-50 text-emerald-800 ring-emerald-600/20'
                : 'bg-violet-50 text-violet-900 ring-violet-500/25'
            }`}
          >
            {readyForRun ? 'Ready' : 'Needs setup'}
          </span>
        </p>
      </div>
    </header>
  )
}
