import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Evaluation, Judge } from '../../types'

const PASS_FILL = '#10b981'
const FAIL_FILL = '#ef4444'
const INCONCLUSIVE_FILL = '#f59e0b'

type ChartRow = {
  name: string
  passRate: number
  failRate: number
  inconclusiveRate: number
  total: number
  passCount: number
  failCount: number
  inconclusiveCount: number
}

function pct(part: number, total: number): number {
  if (total === 0) return 0
  return Math.round((part / total) * 100)
}

/** Per-judge verdict shares using only the evaluations passed in (same filter as the table). */
function aggregateByJudge(evaluations: Evaluation[], judges: Judge[]): ChartRow[] {
  const judgeById = new Map(judges.map((j) => [j.id, j]))
  const stats = new Map<string, { total: number; pass: number; fail: number; inconclusive: number }>()

  for (const e of evaluations) {
    const cur = stats.get(e.judge_id) ?? { total: 0, pass: 0, fail: 0, inconclusive: 0 }
    cur.total += 1
    if (e.verdict === 'pass') cur.pass += 1
    else if (e.verdict === 'fail') cur.fail += 1
    else cur.inconclusive += 1
    stats.set(e.judge_id, cur)
  }

  return [...stats.entries()]
    .filter(([, s]) => s.total > 0)
    .map(([judgeId, s]) => ({
      name: judgeById.get(judgeId)?.name ?? 'Unknown judge',
      passRate: pct(s.pass, s.total),
      failRate: pct(s.fail, s.total),
      inconclusiveRate: pct(s.inconclusive, s.total),
      total: s.total,
      passCount: s.pass,
      failCount: s.fail,
      inconclusiveCount: s.inconclusive,
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

type JudgePassRateChartProps = {
  /** Evaluations to aggregate (e.g. same filtered set as the Results table). */
  evaluations: Evaluation[]
  judges: Judge[]
}

export function JudgePassRateChart({ evaluations, judges }: JudgePassRateChartProps) {
  const data = useMemo(() => aggregateByJudge(evaluations, judges), [evaluations, judges])

  if (data.length === 0) {
    return (
      <p className="flex h-[240px] items-center justify-center text-sm text-slate-500">No data</p>
    )
  }

  return (
    <div className="h-[240px] w-full min-w-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: '#475569' }}
            interval={0}
            angle={-18}
            textAnchor="end"
            height={56}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: '#475569' }}
            tickFormatter={(v) => `${v}%`}
            width={40}
            label={{
              angle: -90,
              position: 'insideLeft',
              style: { fontSize: 10, fill: '#64748b' },
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(value) => <span className="text-slate-700">{value}</span>}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as ChartRow
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 text-slate-600">
                    Pass: {row.passCount} ({row.passRate}%)
                  </p>
                  <p className="text-slate-600">
                    Fail: {row.failCount} ({row.failRate}%)
                  </p>
                  <p className="text-slate-600">
                    Inconclusive: {row.inconclusiveCount} ({row.inconclusiveRate}%)
                  </p>
                  <p className="mt-1 border-t border-slate-100 pt-1 text-slate-500">Total: {row.total}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="passRate" name="Pass" fill={PASS_FILL} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="failRate" name="Fail" fill={FAIL_FILL} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar
            dataKey="inconclusiveRate"
            name="Inconclusive"
            fill={INCONCLUSIVE_FILL}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
