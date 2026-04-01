type JudgesListSkeletonProps = {
  cards?: number
}

export function JudgesListSkeleton({ cards = 3 }: JudgesListSkeletonProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: cards }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        >
          <div className="h-5 w-3/5 rounded bg-slate-200" />
          <div className="mt-3 h-4 w-4/5 rounded bg-slate-100" />
          <div className="mt-5 flex gap-2">
            <div className="h-9 w-16 rounded-lg bg-slate-100" />
            <div className="h-9 w-24 rounded-lg bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
