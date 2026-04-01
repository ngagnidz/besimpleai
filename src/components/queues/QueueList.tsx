import { useNavigate } from 'react-router-dom'
import type { QueueSummary } from '../../lib/queries'

type QueueListProps = {
  rows: QueueSummary[]
}

function formatQueueMeta(submissionsCount: number, questionsCount: number): string {
  const submissions =
    submissionsCount === 1 ? '1 submission' : `${submissionsCount} submissions`
  const questions = questionsCount === 1 ? '1 question' : `${questionsCount} questions`
  return `${submissions} · ${questions}`
}

function ChevronIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

function QueueList({ rows }: QueueListProps) {
  const navigate = useNavigate()

  return (
    <ul className="flex flex-col gap-4">
      {rows.map((row, index) => (
        <li
          key={row.id}
          style={{ animationDelay: `${index * 50}ms` }}
          className="animate-queue-row-in"
        >
          <button
            type="button"
            aria-label={`Open queue ${row.id}`}
            onClick={() => void navigate(`/queues/${encodeURIComponent(row.id)}`)}
            className="group flex w-full min-w-0 items-center gap-6 rounded-xl border border-slate-200/70 bg-white px-8 py-6 text-left shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition duration-200 ease-out hover:border-slate-300 hover:bg-slate-50/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400/80 focus-visible:ring-offset-2"
          >
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Queue</p>
              <p className="mt-1.5 truncate font-mono text-xl font-bold leading-tight text-slate-900">{row.id}</p>
              <p className="mt-2 text-sm text-slate-500">{formatQueueMeta(row.submissionsCount, row.questionsCount)}</p>
            </div>

            <span
              className="shrink-0 text-slate-400 transition-colors duration-200 group-hover:text-indigo-600"
              aria-hidden
            >
              <ChevronIcon />
            </span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default QueueList
