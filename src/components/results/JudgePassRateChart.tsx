import { useMemo } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Evaluation, Judge } from '../../types'

const BAR_FILL = '#4f46e5'

type ChartRow = {
  name: string
  passRate: number
  total: number
}

function aggregateByJudge(evaluations: Evaluation[], judges: Judge[]): ChartRow[] {
  const judgeById = new Map(judges.map((j) => [j.id, j]))
  const stats = new Map<string, { total: number; pass: number }>()

  for (const e of evaluations) {
    const cur = stats.get(e.judge_id) ?? { total: 0, pass: 0 }
    cur.total += 1
    if (e.verdict === 'pass') cur.pass += 1
    stats.set(e.judge_id, cur)
  }

  return [...stats.entries()]
    .filter(([, s]) => s.total > 0)
    .map(([judgeId, s]) => ({
      name: judgeById.get(judgeId)?.name ?? 'Unknown judge',
      passRate: Math.round((s.pass / s.total) * 100),
      total: s.total,
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
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null
              const row = payload[0].payload as ChartRow
              return (
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
                  <p className="font-semibold text-slate-900">{row.name}</p>
                  <p className="mt-1 text-slate-600">Pass rate: {row.passRate}%</p>
                  <p className="text-slate-600">Evaluations: {row.total}</p>
                </div>
              )
            }}
          />
          <Bar dataKey="passRate" fill={BAR_FILL} radius={[4, 4, 0, 0]} maxBarSize={48} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
