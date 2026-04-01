import { Link } from 'react-router-dom'
import type { Judge } from '../../types'

type QuestionJudgeMultiSelectProps = {
  judges: Judge[]
  selectedJudgeIds: string[]
  onChange: (nextJudgeIds: string[]) => void | Promise<void>
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
}: QuestionJudgeMultiSelectProps) {
  if (judges.length === 0) {
    return (
      <p className="text-left text-sm text-amber-800">
        No judges yet — create one on the{' '}
        <Link to="/judges" className="font-medium text-indigo-600 underline hover:text-indigo-700">
          Judges
        </Link>{' '}
        page
      </p>
    )
  }

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
              className={`inline-flex max-w-full items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
                selected
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-950 shadow-sm ring-1 ring-indigo-200/80'
                  : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded border ${
                  selected
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-300 bg-white'
                }`}
              >
                {selected ? <CheckIcon className="size-2.5 text-white" /> : null}
              </span>
              <span className="min-w-0 truncate">{j.name}</span>
            </button>
          )
        })}
      </div>
    </fieldset>
  )
}
