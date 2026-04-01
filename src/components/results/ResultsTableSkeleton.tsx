type ResultsTableSkeletonProps = {
  rows?: number
}

export function ResultsTableSkeleton({ rows = 6 }: ResultsTableSkeletonProps) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              {['When', 'Submission', 'Question', 'Judge', 'Verdict', 'Reasoning'].map((h) => (
                <th key={h} className="px-4 py-3">
                  <div className="h-3 w-16 rounded bg-slate-200" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: rows }).map((_, idx) => (
              <tr key={idx} className="animate-pulse border-b border-slate-100 last:border-b-0">
                <td className="px-4 py-3">
                  <div className="h-4 w-24 rounded bg-slate-100" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-28 rounded bg-slate-100" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-48 max-w-full rounded bg-slate-100" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-24 rounded bg-slate-100" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-6 w-20 rounded-full bg-slate-100" />
                </td>
                <td className="px-4 py-3">
                  <div className="h-4 w-full max-w-md rounded bg-slate-100" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
