import { useCallback, useEffect, useMemo, useState } from 'react'
import VerdictBadge from '../components/VerdictBadge'
import { fetchEvaluationsWithContext } from '../lib/evaluations'
import type { EvaluationRow } from '../lib/evaluations'
import type { Verdict } from '../types'

const VERDICTS: Verdict[] = ['pass', 'fail', 'inconclusive']

function formatCreatedAt(iso: string): string {
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString()
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max)}…`
}

function Results() {
  const [rows, setRows] = useState<EvaluationRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set())

  const [judgeFilter, setJudgeFilter] = useState<Set<string>>(() => new Set())
  const [questionFilter, setQuestionFilter] = useState<Set<string>>(() => new Set())
  const [verdictFilter, setVerdictFilter] = useState<Set<Verdict>>(() => new Set())

  const load = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchEvaluationsWithContext()
      setRows(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load evaluations.')
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const judgeOptions = useMemo(() => {
    const names = new Set<string>()
    for (const r of rows) names.add(r.judge_name)
    return [...names].sort((a, b) => a.localeCompare(b))
  }, [rows])

  const questionOptions = useMemo(() => {
    const texts = new Set<string>()
    for (const r of rows) texts.add(r.question_text)
    return [...texts].sort((a, b) => a.localeCompare(b))
  }, [rows])

  const filteredRows = useMemo(() => {
    return rows.filter((r) => {
      if (judgeFilter.size > 0 && !judgeFilter.has(r.judge_name)) return false
      if (questionFilter.size > 0 && !questionFilter.has(r.question_text)) return false
      if (verdictFilter.size > 0 && !verdictFilter.has(r.verdict)) return false
      return true
    })
  }, [rows, judgeFilter, questionFilter, verdictFilter])

  const stats = useMemo(() => {
    const total = filteredRows.length
    const passed = filteredRows.filter((r) => r.verdict === 'pass').length
    const failed = filteredRows.filter((r) => r.verdict === 'fail').length
    const inconclusive = filteredRows.filter((r) => r.verdict === 'inconclusive').length
    const passRate = total === 0 ? 0 : Math.round((passed / total) * 100)
    return { total, passed, failed, inconclusive, passRate }
  }, [filteredRows])

  const toggleJudge = (name: string) => {
    setJudgeFilter((prev) => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const toggleQuestion = (text: string) => {
    setQuestionFilter((prev) => {
      const next = new Set(prev)
      if (next.has(text)) next.delete(text)
      else next.add(text)
      return next
    })
  }

  const toggleVerdict = (v: Verdict) => {
    setVerdictFilter((prev) => {
      const next = new Set(prev)
      if (next.has(v)) next.delete(v)
      else next.add(v)
      return next
    })
  }

  const clearFilters = () => {
    setJudgeFilter(new Set())
    setQuestionFilter(new Set())
    setVerdictFilter(new Set())
  }

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Results</h1>
        <p className="mt-1 text-sm text-slate-600">Evaluation outcomes across all submissions and judges.</p>
      </div>

      {isLoading ? (
        <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
          Loading evaluations…
        </div>
      ) : null}

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      ) : null}

      {!isLoading && !error && rows.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          No evaluations yet. Run AI Judges from the Queue page.
        </div>
      ) : null}

      {!isLoading && !error && rows.length > 0 ? (
        <>
          <div className="flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="text-sm text-slate-800">
              <span className="font-semibold">{stats.passRate}%</span> pass rate{' '}
              <span className="text-slate-500">of {stats.total} total evaluations</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-800">
                {stats.passed} passed
              </span>
              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-medium text-red-800">
                {stats.failed} failed
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">
                {stats.inconclusive} inconclusive
              </span>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-700">Filters</p>
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Clear all
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Judge</legend>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {judgeOptions.map((name) => (
                    <label key={name} className="flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={judgeFilter.has(name)}
                        onChange={() => toggleJudge(name)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="truncate">{name}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Question</legend>
                <div className="mt-2 max-h-40 space-y-2 overflow-y-auto">
                  {questionOptions.map((text) => (
                    <label key={text} className="flex items-start gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        checked={questionFilter.has(text)}
                        onChange={() => toggleQuestion(text)}
                        className="mt-1 h-4 w-4 shrink-0 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="line-clamp-2">{text}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="rounded-md border border-slate-200 p-3">
                <legend className="px-1 text-xs font-semibold uppercase text-slate-500">Verdict</legend>
                <div className="mt-2 space-y-2">
                  {VERDICTS.map((v) => (
                    <label key={v} className="flex items-center gap-2 text-sm capitalize text-slate-700">
                      <input
                        type="checkbox"
                        checked={verdictFilter.has(v)}
                        onChange={() => toggleVerdict(v)}
                        className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      {v}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Submission ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Question
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Judge
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Verdict
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Reasoning
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((r) => {
                  const expanded = expandedIds.has(r.id)
                  const short = truncate(r.reasoning, 100)
                  const needsExpand = r.reasoning.length > 100

                  return (
                    <tr key={r.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-800">
                        {r.submission_id}
                      </td>
                      <td className="max-w-xs px-4 py-3 text-sm text-slate-800">{r.question_text}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-700">{r.judge_name}</td>
                      <td className="px-4 py-3">
                        <VerdictBadge verdict={r.verdict} />
                      </td>
                      <td className="max-w-md px-4 py-3 text-sm text-slate-700">
                        <span title={r.reasoning}>{expanded ? r.reasoning : short}</span>
                        {needsExpand ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(r.id)}
                            className="ml-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                          >
                            {expanded ? 'Show less' : 'Show more'}
                          </button>
                        ) : null}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatCreatedAt(r.created_at)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredRows.length === 0 ? (
            <p className="text-center text-sm text-slate-500">No rows match the current filters.</p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

export default Results
