import type { Verdict } from '../types'

type VerdictBadgeProps = {
  verdict: Verdict
}

const styles: Record<Verdict, string> = {
  pass: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  fail: 'bg-red-100 text-red-800 ring-red-200',
  inconclusive: 'bg-amber-100 text-amber-900 ring-amber-200',
}

function VerdictBadge({ verdict }: VerdictBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${styles[verdict]}`}
    >
      {verdict}
    </span>
  )
}

export default VerdictBadge
