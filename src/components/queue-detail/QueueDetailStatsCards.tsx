type QueueDetailStatsCardsProps = {
  questionsCount: number
  passRatePct: number | null
  /** Completed “Run AI Judges” sessions (`queues.judge_run_count`). */
  queueRunCount: number
}

const cardClass =
  'rounded-xl border border-indigo-200/60 bg-gradient-to-b from-indigo-50/95 to-violet-50/75 px-5 py-4 shadow-[0_1px_3px_-1px_rgba(67,56,202,0.1)]'

export function QueueDetailStatsCards({
  questionsCount,
  passRatePct,
  queueRunCount,
}: QueueDetailStatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
      <div className={cardClass}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-500">Questions</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">{questionsCount}</p>
      </div>
      <div className={cardClass}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-500">Pass rate</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
          {passRatePct === null ? '—' : `${passRatePct}%`}
        </p>
      </div>
      <div className={`${cardClass} col-span-2 lg:col-span-1`}>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-stone-500">Queue runs</p>
        <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-stone-900">
          {queueRunCount}
        </p>
      </div>
    </div>
  )
}
