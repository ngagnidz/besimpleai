import { Link } from 'react-router-dom'
import type { Judge } from '../../types'

type QuestionJudgeMultiSelectProps = {
  judges: Judge[]
  selectedJudgeIds: string[]
  onChange: (nextJudgeIds: string[]) => void | Promise<void>
  /** `compact` = dashboard mock: small gray pills with dot. */
  variant?: 'default' | 'compact'
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none" aria-hidden>
      <path
        d="M10 3 4.5 8.5 2 6"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function QuestionJudgeMultiSelect({
  judges,
  selectedJudgeIds,
  onChange,
  variant = 'default',
}: QuestionJudgeMultiSelectProps) {
  if (judges.length === 0) {
    return (
      <p className="text-left text-sm text-violet-900">
        No active judges yet — create one on the{' '}
        <Link to="/judges" className="font-medium text-indigo-600 underline hover:text-indigo-700">
          Judges
        </Link>{' '}
        page
      </p>
    )
  }

  const compact = variant === 'compact'

  return (
    <fieldset className="min-w-0 border-0 p-0 text-left">
      <legend className="sr-only">Assigned judges — toggle each judge</legend>
      <div className="flex flex-wrap items-start justify-start gap-2">
        {judges.map((j) => {
          const selected = selectedJudgeIds.includes(j.id)
          return (
            <button
              key={j.id}
              type="button"
              role="checkbox"
              aria-checked={selected}
              onClick={() => {
                const next = selected
                  ? selectedJudgeIds.filter((id) => id !== j.id)
                  : [...selectedJudgeIds, j.id]
                void onChange(next)
              }}
              className={
                compact
                  ? `inline-flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 text-left text-xs font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                      selected
                        ? 'border-stone-400 bg-stone-200/90 text-stone-900 shadow-sm'
                        : 'border-stone-200 bg-white text-stone-600 shadow-sm hover:border-stone-300 hover:bg-stone-50'
                    }`
                  : `inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                      selected
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm ring-1 ring-indigo-200/80'
                        : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
                    }`
              }
            >
              {compact ? (
                <span
                  className={`size-1.5 shrink-0 rounded-full ${selected ? 'bg-stone-600' : 'bg-stone-300'}`}
                  aria-hidden
                />
              ) : (
                <span
                  className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                    selected
                      ? 'border-indigo-600 bg-indigo-600 text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {selected ? <CheckIcon className="size-2.5 text-white" /> : null}
                </span>
              )}
              <span className="min-w-0 truncate">{j.name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
