/**
 * Client-side CSV for Results: RFC-style quoting, UTF-8 BOM for Excel, matches visible table columns.
 */
import type { Evaluation, Judge, Question } from '../types'
import { formatDbLabel } from './utils'

/** Escape one CSV field (comma delimiter). */
export function csvEscapeField(value: string): string {
  const normalized = value.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`
  }
  return normalized
}

function formatWhen(iso: string): string {
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

/**
 * Builds CSV text for the given evaluations (already filtered). Columns align with the Results table
 * plus Queue id for multi-queue exports.
 */
export function evaluationsToCsv(
  rows: Evaluation[],
  questionById: Map<string, Question>,
  judgeById: Map<string, Judge>,
): string {
  const header = ['Queue', 'When', 'Submission', 'Question', 'Judge', 'Verdict', 'Reasoning']
  const lines = [header.map(csvEscapeField).join(',')]
  for (const row of rows) {
    const q = questionById.get(row.question_id)
    const j = judgeById.get(row.judge_id)
    const cells = [
      row.queue_id,
      formatWhen(row.created_at),
      formatDbLabel(row.submission_id, 'submission'),
      q?.question_text ?? 'Deleted question',
      j?.name ?? 'Unknown judge',
      row.verdict,
      row.reasoning,
    ]
    lines.push(cells.map((c) => csvEscapeField(String(c))).join(','))
  }
  return lines.join('\r\n')
}

/** Triggers a browser download. Prefixes UTF-8 BOM so Excel opens unicode correctly. */
export function downloadCsvFile(filename: string, csvBody: string): void {
  const bom = '\uFEFF'
  const blob = new Blob([bom + csvBody], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.click()
  URL.revokeObjectURL(url)
}

export function defaultResultsCsvFilename(): string {
  const day = new Date().toISOString().slice(0, 10)
  return `ai-judge-results-${day}.csv`
}
