type QueueDetailSkeletonProps = {
  rows?: number
}

/** Placeholder while queue detail loads. */
export function QueueDetailSkeleton({ rows = 5 }: QueueDetailSkeletonProps) {
  return (
    <div className="animate-pulse space-y-8">
      <div className="space-y-4">
        <div className="h-4 w-48 rounded bg-stone-200" />
        <div className="h-9 w-64 max-w-full rounded-lg bg-stone-200" />
        <div className="h-4 w-full max-w-xl rounded bg-stone-100" />
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-indigo-200/50 bg-gradient-to-b from-indigo-50/90 to-violet-50/70 px-5 py-4"
          >
            <div className="h-3 w-20 rounded bg-stone-200/90" />
            <div className="mt-3 h-8 w-12 rounded bg-stone-200/80" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
        <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,8rem)_minmax(0,14rem)] gap-4 border-b border-stone-200 bg-stone-100/80 px-5 py-3.5">
          <div className="h-3.5 rounded bg-stone-200" />
          <div className="h-3.5 w-12 rounded bg-stone-200" />
          <div className="h-3.5 rounded bg-stone-200" />
        </div>
        <div className="divide-y divide-stone-100">
          {Array.from({ length: rows }).map((_, idx) => (
            <div
              key={idx}
              className="grid grid-cols-[minmax(0,2fr)_minmax(0,8rem)_minmax(0,14rem)] items-center gap-4 px-5 py-4"
            >
              <div className="h-4 w-full max-w-md rounded bg-stone-100" />
              <div className="h-7 w-24 rounded-full bg-stone-100" />
              <div className="h-8 w-full rounded-md bg-stone-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
