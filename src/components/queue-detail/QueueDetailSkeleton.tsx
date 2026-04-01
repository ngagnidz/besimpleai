type QueueDetailSkeletonProps = {
  rows?: number
}

/** Placeholder while questions, judges, and assignments load. */
export function QueueDetailSkeleton({ rows = 5 }: QueueDetailSkeletonProps) {
  return (
    <div className="animate-pulse overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,8rem)_minmax(0,12rem)] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="h-4 rounded bg-slate-200" />
        <div className="h-4 rounded bg-slate-200" />
        <div className="h-4 rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {Array.from({ length: rows }).map((_, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[minmax(0,2fr)_minmax(0,8rem)_minmax(0,12rem)] items-center gap-4 px-4 py-4"
          >
            <div className="h-4 w-full max-w-md rounded bg-slate-100" />
            <div className="h-7 w-20 rounded-full bg-slate-100" />
            <div className="h-16 w-full rounded-md bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  )
}
