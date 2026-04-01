import { useMemo, useState } from 'react'
import type { Evaluation, Judge, Question, Verdict } from '../../types'

type ResultsTableProps = {
  evaluations: Evaluation[]
  questions: Question[]
  judges: Judge[]
}

const VERDICT_OPTIONS: Verdict[] = ['pass', 'fail', 'inconclusive']

function verdictBadgeClasses(verdict: Verdict): string {
  switch (verdict) {
    case 'pass':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-600/15'
    case 'fail':
      return 'bg-red-100 text-red-800 ring-red-600/15'
    case 'inconclusive':
    default:
      return 'bg-amber-100 text-amber-900 ring-amber-600/12'
  }
}

function formatEvaluatedAt(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function toggleStringId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function toggleVerdict(list: Verdict[], v: Verdict): Verdict[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

export function ResultsTable({ evaluations, questions, judges }: ResultsTableProps) {
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([])

  const questionById = useMemo(() => new Map(questions.map((q) => [q.id, q])), [questions])
  const judgeById = useMemo(() => new Map(judges.map((j) => [j.id, j])), [judges])

  const sortedJudges = useMemo(
    () => [...judges].sort((a, b) => a.name.localeCompare(b.name)),
    [judges],
  )
  const sortedQuestions = useMemo(
    () => [...questions].sort((a, b) => a.question_text.localeCompare(b.question_text)),
    [questions],
  )

  const filtered = evaluations.filter((e) => {
    if (selectedJudgeIds.length > 0 && !selectedJudgeIds.includes(e.judge_id)) return false
    if (selectedQuestionIds.length > 0 && !selectedQuestionIds.includes(e.question_id)) return false
    if (selectedVerdicts.length > 0 && !selectedVerdicts.includes(e.verdict)) return false
    return true
  })

  const passRate =
    filtered.length === 0
      ? null
      : Math.round((filtered.filter((e) => e.verdict === 'pass').length / filtered.length) * 100)

  if (evaluations.length === 0) {
    return (
      <p className="animate-queues-panel-in rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-600">
        No evaluations for this queue yet. Run AI judges from the queue page.
      </p>
    )
  }

  const filterCheckboxClass =
    'flex cursor-pointer items-center gap-2 rounded-md px-2 py-1 text-sm text-slate-700 hover:bg-slate-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-indigo-400/80'

  return (
    <div className="space-y-4">
      <div className="animate-queues-panel-in rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-100 px-4 py-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Judge</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {sortedJudges.map((j) => (
                <label key={j.id} className={filterCheckboxClass}>
                  <input
                    type="checkbox"
                    checked={selectedJudgeIds.includes(j.id)}
                    onChange={() => setSelectedJudgeIds((prev) => toggleStringId(prev, j.id))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{j.name}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Question</p>
            <div className="mt-2 flex max-h-48 flex-col gap-1 overflow-y-auto pr-1">
              {sortedQuestions.map((q) => (
                <label key={q.id} className={`${filterCheckboxClass} max-w-full`}>
                  <input
                    type="checkbox"
                    checked={selectedQuestionIds.includes(q.id)}
                    onChange={() => setSelectedQuestionIds((prev) => toggleStringId(prev, q.id))}
                    className="mt-0.5 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="min-w-0 break-words leading-snug">{q.question_text}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Verdict</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {VERDICT_OPTIONS.map((v) => (
                <label key={v} className={filterCheckboxClass}>
                  <input
                    type="checkbox"
                    checked={selectedVerdicts.includes(v)}
                    onChange={() => setSelectedVerdicts((prev) => toggleVerdict(prev, v))}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="capitalize">{v}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <p className="border-b border-slate-100 px-4 py-3 text-sm font-medium text-slate-800">
          {passRate === null
            ? `—% pass of ${filtered.length} evaluations`
            : `${passRate}% pass of ${filtered.length} evaluations`}
        </p>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">When</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Submission</th>
                <th className="min-w-[12rem] px-4 py-3 font-medium text-slate-600">Question</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Judge</th>
                <th className="whitespace-nowrap px-4 py-3 font-medium text-slate-600">Verdict</th>
                <th className="min-w-[16rem] px-4 py-3 font-medium text-slate-600">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-600">
                    No evaluations match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((row, index) => {
                  const q = questionById.get(row.question_id)
                  const j = judgeById.get(row.judge_id)
                  return (
                    <tr
                      key={row.id}
                      style={{ animationDelay: `${index * 50}ms` }}
                      className="animate-queue-row-in border-b border-slate-100 last:border-b-0"
                    >
                      <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                        {formatEvaluatedAt(row.created_at)}
                      </td>
                      <td className="max-w-[10rem] px-4 py-3 align-top">
                        <span className="block truncate font-mono text-xs text-slate-800" title={row.submission_id}>
                          {row.submission_id}
                        </span>
                      </td>
                      <td className="max-w-md px-4 py-3 align-top text-slate-900">
                        {q?.question_text ?? (
                          <span className="text-slate-400 italic">Deleted question</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top text-slate-800">
                        {j?.name ?? (
                          <span className="text-slate-400 italic">Unknown judge</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 align-top">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${verdictBadgeClasses(row.verdict)}`}
                        >
                          {row.verdict}
                        </span>
                      </td>
                      <td className="max-w-xl px-4 py-3 align-top text-slate-700">
                        <p className="line-clamp-4 whitespace-pre-wrap break-words" title={row.reasoning}>
                          {row.reasoning}
                        </p>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
