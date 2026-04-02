import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import {
  defaultResultsCsvFilename,
  downloadCsvFile,
  evaluationsToCsv,
} from '../../lib/evaluationCsv'
import type { QueueSummary } from '../../lib/queries'
import type { Evaluation, Judge, Question, Verdict } from '../../types'
import { formatDbLabel } from '../../lib/utils'
import { JudgePassRateChart } from './JudgePassRateChart'
import { ResultsTableMainSkeleton } from './ResultsTableSkeleton'

export type ResultsTableProps = {
  queues: QueueSummary[]
  selectedQueueIds: string[]
  onQueueSelectionChange: (queueIds: string[]) => void
  evaluations: Evaluation[]
  questions: Question[]
  judges: Judge[]
  /** True while evaluations/questions/judges are loading for the current queue selection — table shows skeleton; filter rail stays mounted. */
  detailLoading?: boolean
}

const VERDICT_OPTIONS: Verdict[] = ['pass', 'fail', 'inconclusive']

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

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" aria-hidden>
      <path
        d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.329 3.328-1.414 1.414-3.328-3.329A7 7 0 0 1 2 9Z"
        fill="currentColor"
        fillRule="evenodd"
        clipRule="evenodd"
      />
    </svg>
  )
}

/** Toggle chip: checkbox row (questions) or pill wrap (judges). */
function FilterOptionChip({
  selected,
  onToggle,
  ariaLabel,
  fullWidth,
  pill,
  hideCheckbox,
  variant = 'default',
  children,
}: {
  selected: boolean
  onToggle: () => void
  ariaLabel: string
  fullWidth?: boolean
  pill?: boolean
  hideCheckbox?: boolean
  variant?: 'default' | 'question'
  children: ReactNode
}) {
  const isQuestion = variant === 'question'
  const radius = pill ? 'rounded-full' : 'rounded-lg'
  const padding = pill ? 'px-3 py-1.5' : isQuestion ? 'px-3 py-2.5' : 'px-3 py-2'
  const surface = isQuestion
    ? selected
      ? 'border-indigo-400 bg-indigo-600/15 text-indigo-950 shadow-sm ring-1 ring-indigo-300/50'
      : 'border-indigo-200/90 bg-indigo-50/60 text-indigo-950 shadow-sm hover:border-indigo-300 hover:bg-indigo-50'
    : selected
      ? hideCheckbox
        ? 'border-indigo-400 bg-indigo-600/15 text-indigo-950 shadow-sm ring-1 ring-indigo-300/45'
        : 'border-indigo-400 bg-indigo-600/12 text-indigo-950 shadow-sm ring-1 ring-indigo-300/50'
      : 'border-slate-200 bg-white text-slate-900 shadow-sm hover:border-slate-300 hover:bg-slate-50'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`${
        fullWidth ? 'flex w-full items-start' : 'inline-flex w-fit min-w-0 shrink-0 items-center'
      } ${hideCheckbox ? 'items-center' : 'items-start'} gap-2 ${radius} border ${padding} text-left text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${surface}`}
  >
      {hideCheckbox ? null : (
        <span
          className={`mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded border ${
            isQuestion
              ? selected
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-indigo-300 bg-white'
              : selected
                ? 'border-indigo-600 bg-indigo-600 text-white'
                : 'border-slate-300 bg-white'
          }`}
        >
          {selected ? <CheckIcon className="size-2.5 text-white" /> : null}
        </span>
      )}
      <span
        className={
          fullWidth ? 'min-w-0 flex-1' : pill ? 'min-w-0 max-w-[14rem]' : 'min-w-0 max-w-[min(100%,16rem)]'
        }
      >
        {children}
      </span>
    </button>
  )
}

function QueueNumberChip({
  queueIndex,
  selected,
  onToggle,
  title,
  ariaLabel,
}: {
  queueIndex: number
  selected: boolean
  onToggle: () => void
  title: string
  ariaLabel: string
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      title={title}
      onClick={onToggle}
      className={`flex size-9 shrink-0 items-center justify-center rounded-full border text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
        selected
          ? 'border-indigo-500 bg-indigo-600/25 text-indigo-900 shadow-sm ring-1 ring-indigo-400/35'
          : 'border-slate-200 bg-white text-slate-800 hover:border-indigo-200 hover:bg-indigo-50/40'
      }`}
    >
      {queueIndex}
    </button>
  )
}

function VerdictFilterChip({
  verdict,
  selected,
  onToggle,
  ariaLabel,
}: {
  verdict: Verdict
  selected: boolean
  onToggle: () => void
  ariaLabel: string
}) {
  const dot =
    verdict === 'pass'
      ? 'bg-emerald-500'
      : verdict === 'fail'
        ? 'bg-red-500'
        : 'bg-amber-500'
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={ariaLabel}
      onClick={onToggle}
      className={`inline-flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ${
        selected
          ? 'border-indigo-600 bg-indigo-600/18 text-indigo-950 shadow-sm'
          : 'border-slate-900 bg-white text-slate-900 hover:bg-slate-50'
      }`}
    >
      <span className={`size-2 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="capitalize">{verdict}</span>
    </button>
  )
}

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

/** Collapsed to 4 lines (`line-clamp-4`); “Read more” only when the clamp actually hides text (not char/line heuristics). */
function ReasoningCell({ reasoning }: { reasoning: string }) {
  const [expanded, setExpanded] = useState(false)
  const textRef = useRef<HTMLParagraphElement>(null)
  const [truncated, setTruncated] = useState(false)

  useEffect(() => {
    setExpanded(false)
  }, [reasoning])

  const measureTruncation = useCallback(() => {
    const el = textRef.current
    if (!el || !reasoning.trim()) {
      setTruncated(false)
      return
    }
    if (expanded) return
    setTruncated(el.scrollHeight > el.clientHeight + 1)
  }, [expanded, reasoning])

  useLayoutEffect(() => {
    measureTruncation()
  }, [measureTruncation])

  useEffect(() => {
    const el = textRef.current
    if (!el) return
    const ro = new ResizeObserver(() => measureTruncation())
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureTruncation])

  return (
    <div>
      <p
        ref={textRef}
        className={`whitespace-pre-wrap break-words ${expanded ? '' : 'line-clamp-4'}`}
        title={expanded ? undefined : reasoning}
      >
        {reasoning}
      </p>
      {(truncated || expanded) && reasoning ? (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-xs font-medium text-indigo-600 hover:text-indigo-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          {expanded ? 'Read less' : 'Read more'}
        </button>
      ) : null}
    </div>
  )
}

function toggleStringId(list: string[], id: string): string[] {
  return list.includes(id) ? list.filter((x) => x !== id) : [...list, id]
}

function toggleVerdict(list: Verdict[], v: Verdict): Verdict[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v]
}

function matchesSearch(haystack: string, needle: string): boolean {
  if (!needle.trim()) return true
  return haystack.toLowerCase().includes(needle.trim().toLowerCase())
}

function FilterSearchInput({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  placeholder: string
  ariaLabel: string
}) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm text-slate-900 shadow-inner placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/25"
      />
    </div>
  )
}

function FilterAccordionSection({
  title,
  titleExtra,
  open,
  onToggle,
  children,
}: {
  title: string
  titleExtra?: ReactNode
  open: boolean
  onToggle: () => void
  children: ReactNode
}) {
  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full list-none items-center justify-between gap-3 py-3.5 text-left"
      >
        <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.06em] text-slate-500">
            {title}
          </span>
          {titleExtra ? (
            <span className="text-xs font-normal tabular-nums text-slate-400">{titleExtra}</span>
          ) : null}
        </span>
        <span
          className={`inline-block shrink-0 text-[0.65rem] text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : '-rotate-90'}`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open ? <div className="flex flex-col gap-3">{children}</div> : null}
    </div>
  )
}

const railClass =
  'rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.08)] [scrollbar-gutter:stable] lg:max-h-[min(calc(100vh-5.5rem),900px)] lg:overflow-y-auto lg:overscroll-contain'

const mainCardClass =
  'animate-queues-panel-in overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_2px_8px_-2px_rgba(15,23,42,0.06)]'

export function ResultsTable({
  queues,
  selectedQueueIds,
  onQueueSelectionChange,
  evaluations,
  questions,
  judges,
  detailLoading = false,
}: ResultsTableProps) {
  const baseId = useId()
  const [judgeQuery, setJudgeQuery] = useState('')
  const [questionQuery, setQuestionQuery] = useState('')
  const [selectedJudgeIds, setSelectedJudgeIds] = useState<string[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
  const [selectedVerdicts, setSelectedVerdicts] = useState<Verdict[]>([])
  const [openQueueSec, setOpenQueueSec] = useState(false)
  const [openJudgesSec, setOpenJudgesSec] = useState(false)
  const [openQuestionsSec, setOpenQuestionsSec] = useState(false)
  const [openVerdictSec, setOpenVerdictSec] = useState(false)

  const toggleQueue = useCallback(
    (queueId: string) => {
      const has = selectedQueueIds.includes(queueId)
      if (has && selectedQueueIds.length === 1) return
      const next = has
        ? selectedQueueIds.filter((id) => id !== queueId)
        : [...selectedQueueIds, queueId]
      onQueueSelectionChange(next)
    },
    [selectedQueueIds, onQueueSelectionChange],
  )

  const clearRowFilters = useCallback(() => {
    setSelectedJudgeIds([])
    setSelectedQuestionIds([])
    setSelectedVerdicts([])
    setJudgeQuery('')
    setQuestionQuery('')
  }, [])

  const clearAllFilters = useCallback(() => {
    if (queues.length > 0) onQueueSelectionChange(queues.map((q) => q.id))
    clearRowFilters()
  }, [queues, onQueueSelectionChange, clearRowFilters])

  const allQueuesSelected = useMemo(() => {
    if (queues.length === 0) return true
    const selected = new Set(selectedQueueIds)
    return (
      selectedQueueIds.length === queues.length && queues.every((q) => selected.has(q.id))
    )
  }, [queues, selectedQueueIds])

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

  const filteredJudgesForList = useMemo(() => {
    return sortedJudges.filter((j) => matchesSearch(j.name, judgeQuery))
  }, [sortedJudges, judgeQuery])

  const filteredQuestionsForList = useMemo(() => {
    return sortedQuestions.filter((q) => matchesSearch(q.question_text, questionQuery))
  }, [sortedQuestions, questionQuery])

  const filtered = useMemo(() => {
    return evaluations.filter((e) => {
      if (selectedJudgeIds.length > 0 && !selectedJudgeIds.includes(e.judge_id)) return false
      if (selectedQuestionIds.length > 0 && !selectedQuestionIds.includes(e.question_id)) return false
      if (selectedVerdicts.length > 0 && !selectedVerdicts.includes(e.verdict)) return false
      return true
    })
  }, [evaluations, selectedJudgeIds, selectedQuestionIds, selectedVerdicts])

  const handleExportCsv = useCallback(() => {
    if (filtered.length === 0) return
    const csv = evaluationsToCsv(filtered, questionById, judgeById)
    downloadCsvFile(defaultResultsCsvFilename(), csv)
  }, [filtered, questionById, judgeById])

  const passRate =
    filtered.length === 0
      ? null
      : Math.round((filtered.filter((e) => e.verdict === 'pass').length / filtered.length) * 100)

  const rowFiltersActive =
    selectedJudgeIds.length + selectedQuestionIds.length + selectedVerdicts.length > 0

  const searchFieldsActive = Boolean(judgeQuery.trim() || questionQuery.trim())

  const canClearAll =
    rowFiltersActive || searchFieldsActive || !allQueuesSelected

  const queueSection = (
    <FilterAccordionSection title="Queues" open={openQueueSec} onToggle={() => setOpenQueueSec((o) => !o)}>
      <div className="mb-3 flex flex-wrap gap-2.5">
        {queues.map((row, index) => {
          const selected = selectedQueueIds.includes(row.id)
          return (
            <QueueNumberChip
              key={row.id}
              queueIndex={index + 1}
              selected={selected}
              onToggle={() => toggleQueue(row.id)}
              title={row.id}
              ariaLabel={`Queue ${index + 1}, ${row.id}${selected ? ', selected' : ''}`}
            />
          )
        })}
      </div>
    </FilterAccordionSection>
  )

  const judgeQuestionVerdictSections = (
    <>
      <FilterAccordionSection title="Judges" open={openJudgesSec} onToggle={() => setOpenJudgesSec((o) => !o)}>
        <FilterSearchInput
          id={`${baseId}-judge-search`}
          value={judgeQuery}
          onChange={setJudgeQuery}
          placeholder="Search judges…"
          ariaLabel="Filter judge list"
        />
        <div
          role="list"
          aria-label="Judge filters"
          className="mb-3 flex flex-wrap gap-x-2.5 gap-y-3"
        >
          {filteredJudgesForList.length === 0 ? (
            <p className="w-full py-4 text-center text-xs text-slate-500">No judges match.</p>
          ) : (
            filteredJudgesForList.map((j) => {
              const selected = selectedJudgeIds.includes(j.id)
              return (
                <FilterOptionChip
                  key={j.id}
                  pill
                  hideCheckbox
                  selected={selected}
                  onToggle={() => setSelectedJudgeIds((prev) => toggleStringId(prev, j.id))}
                  ariaLabel={`Judge ${j.name}${selected ? ', filtered' : ''}`}
                >
                  <span className="break-words font-semibold leading-snug text-slate-900">{j.name}</span>
                </FilterOptionChip>
              )
            })
          )}
        </div>
      </FilterAccordionSection>

      <FilterAccordionSection
        title="Questions"
        titleExtra={`${selectedQuestionIds.length} selected`}
        open={openQuestionsSec}
        onToggle={() => setOpenQuestionsSec((o) => !o)}
      >
        <FilterSearchInput
          id={`${baseId}-question-search`}
          value={questionQuery}
          onChange={setQuestionQuery}
          placeholder="Search questions…"
          ariaLabel="Filter question list"
        />
        <div className="mb-3 max-h-56 overflow-y-auto overscroll-contain pr-1">
          {filteredQuestionsForList.length === 0 ? (
            <p className="py-4 text-center text-xs text-slate-500">No questions match.</p>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredQuestionsForList.map((q) => {
                const selected = selectedQuestionIds.includes(q.id)
                const qNum = sortedQuestions.findIndex((x) => x.id === q.id) + 1
                return (
                  <FilterOptionChip
                    key={q.id}
                    fullWidth
                    variant="question"
                    selected={selected}
                    onToggle={() => setSelectedQuestionIds((prev) => toggleStringId(prev, q.id))}
                    ariaLabel={`Question Q${qNum}${selected ? ', filtered' : ''}`}
                  >
                    <span className="break-words leading-snug">
                      <span className="font-semibold text-indigo-950">Q{qNum}</span>{' '}
                      <span className="font-normal text-indigo-900/90">{q.question_text}</span>
                    </span>
                  </FilterOptionChip>
                )
              })}
            </div>
          )}
        </div>
      </FilterAccordionSection>

      <FilterAccordionSection title="Verdict" open={openVerdictSec} onToggle={() => setOpenVerdictSec((o) => !o)}>
        <div className="flex flex-wrap items-center gap-2.5">
          {VERDICT_OPTIONS.map((v) => {
            const selected = selectedVerdicts.includes(v)
            return (
              <VerdictFilterChip
                key={v}
                verdict={v}
                selected={selected}
                onToggle={() => setSelectedVerdicts((prev) => toggleVerdict(prev, v))}
                ariaLabel={`Verdict ${v}${selected ? ', filtered' : ''}`}
              />
            )
          })}
        </div>
      </FilterAccordionSection>
    </>
  )

  const filterRail = (
    <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-80 lg:self-start">
      <div className={`${railClass} p-5`}>
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 py-3.5">
          <h2 className="text-base font-semibold text-slate-900">Filters</h2>
          <button
            type="button"
            onClick={clearAllFilters}
            disabled={!canClearAll}
            className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Clear all
          </button>
        </div>
        <div>
          {queueSection}
          {selectedQueueIds.length > 0 ? (
            judgeQuestionVerdictSections
          ) : (
            <p className="border-t border-slate-200 py-3.5 text-xs leading-relaxed text-slate-500">
              Select at least one queue to filter by judge, question, and verdict.
            </p>
          )}
        </div>
      </div>
    </aside>
  )

  const queuePhrase =
    selectedQueueIds.length === 1 ? 'this queue' : `${selectedQueueIds.length} queues`

  const tableSection =
    detailLoading && evaluations.length === 0 ? (
      <ResultsTableMainSkeleton rows={7} />
    ) : evaluations.length === 0 ? (
      <p className="animate-queues-panel-in rounded-xl border border-dashed border-slate-200 bg-slate-50/90 px-6 py-14 text-center text-sm text-slate-600">
        No evaluations yet for {queuePhrase}. Run AI judges from the{' '}
        <span className="font-medium text-slate-800">queue page</span>.
      </p>
    ) : (
      <div className="flex flex-col gap-6">
        <div className={`${mainCardClass} p-5`}>
          <h2 className="mb-4 text-base font-semibold text-slate-900">Verdict mix by judge</h2>
          <JudgePassRateChart evaluations={filtered} judges={judges} />
        </div>
        <div className={mainCardClass}>
          <div className="flex flex-col gap-3 border-b border-slate-100 bg-slate-50/90 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <p className="text-sm font-medium text-slate-800">
              {passRate === null
                ? `—% pass of ${filtered.length} evaluations`
                : `${passRate}% pass of ${filtered.length} evaluations`}
            </p>
            <button
              type="button"
              onClick={handleExportCsv}
              disabled={filtered.length === 0}
              className="shrink-0 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Export CSV
            </button>
          </div>
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
                    <td colSpan={6} className="px-4 py-12 text-center text-sm text-slate-600">
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
                        style={{ animationDelay: `${index * 40}ms` }}
                        className="animate-queue-row-in border-b border-slate-100 last:border-b-0"
                      >
                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                          {formatEvaluatedAt(row.created_at)}
                        </td>
                        <td className="max-w-[10rem] px-4 py-3 align-top">
                          <span
                            className="block truncate text-xs text-slate-800"
                            title={row.submission_id}
                          >
                            {formatDbLabel(row.submission_id, 'submission')}
                          </span>
                        </td>
                        <td className="max-w-md px-4 py-3 align-top text-slate-900">
                          {q?.question_text ?? (
                            <span className="text-slate-400 italic">Deleted question</span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top text-slate-800">
                          {j?.name ?? <span className="text-slate-400 italic">Unknown judge</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 align-top">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${verdictBadgeClasses(row.verdict)}`}
                          >
                            {row.verdict}
                          </span>
                        </td>
                        <td className="max-w-xl px-4 py-3 align-top text-slate-700">
                          <ReasoningCell reasoning={row.reasoning} />
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

  return (
    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
      {filterRail}
      <div className="min-w-0 flex-1">{tableSection}</div>
    </div>
  )
}
