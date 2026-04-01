type QueueListSkeletonProps = {
  rows?: number
}

/** Pulse placeholders matching `QueueList` cards while queue summaries load. */
export function QueueListSkeleton({ rows = 3 }: QueueListSkeletonProps) {
  return (
    <ul className="flex flex-col gap-4">
      {Array.from({ length: rows }).map((_, idx) => (
        <li
          key={idx}
          className="animate-pulse flex items-center gap-6 rounded-xl border border-slate-200/70 bg-white px-8 py-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
        >
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="h-2.5 w-12 rounded bg-slate-200" />
            <div className="h-8 w-52 max-w-full rounded-md bg-slate-200" />
            <div className="h-4 w-56 max-w-full rounded bg-slate-100" />
          </div>
          <div className="h-6 w-6 shrink-0 rounded bg-slate-100" />
        </li>
      ))}
    </ul>
  )
}
