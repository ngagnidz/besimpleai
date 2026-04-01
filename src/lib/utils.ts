/**
 * Shared helpers: JSON type guards, DB/API → human-readable UI labels.
 */
import type { JsonValue } from '../types'

/**
 * True for any non-null object (including arrays — in JS `typeof [] === 'object'`).
 * Use alongside `Array.isArray` when you need “plain object only”.
 */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

/**
 * True when `value` matches our recursive `JsonValue` shape (JSON-serializable tree).
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return true
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue)
  }

  if (isRecord(value)) {
    return Object.values(value).every(isJsonValue)
  }

  return false
}

// --- Display labels (use only in UI; never for URLs, keys, or persistence) ---

export type DbDisplayContext = 'queue' | 'submission' | 'questionType' | 'generic'

const QUESTION_TYPE_LABELS: Record<string, string> = {
  single_choice: 'Single choice',
  yes_no: 'Yes / No',
  free_text: 'Free text',
  freetext: 'Free text',
}

function normalizeDisplayKey(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, '_')
}

/** "foo_bar_baz" / "foo-bar" → "Foo Bar Baz" */
function titleCaseFromSnake(s: string): string {
  return s
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((w) => {
      if (/^\d+$/.test(w)) return w
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    })
    .join(' ')
}

function formatQuestionType(raw: string): string {
  const n = normalizeDisplayKey(raw)
  if (QUESTION_TYPE_LABELS[n]) return QUESTION_TYPE_LABELS[n]
  return titleCaseFromSnake(raw)
}

function formatQueue(raw: string): string {
  const v = raw.trim()
  const simpleNum = v.match(/^queue[_-]?(\d+)$/i)
  if (simpleNum) return `Queue ${simpleNum[1]}`

  if (/^queue[_-]/i.test(v)) {
    const rest = v.replace(/^queue[_-]?/i, '')
    if (/^\d+$/.test(rest)) return `Queue ${rest}`
    const tail = titleCaseFromSnake(rest)
    return tail ? `Queue ${tail}` : 'Queue'
  }

  return titleCaseFromSnake(v)
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function formatSubmission(raw: string): string {
  const v = raw.trim()
  if (UUID_RE.test(v)) return `Submission ${v.slice(0, 8)}…`

  const prefixed = v.match(/^(?:sub|submission)[_-]?(.+)$/i)
  if (prefixed) {
    const rest = prefixed[1]
    if (/^\d+$/.test(rest)) return `Submission ${rest}`
    if (UUID_RE.test(rest)) return `Submission ${rest.slice(0, 8)}…`
    return `Submission ${titleCaseFromSnake(rest)}`
  }

  if (v.length > 28) return `${v.slice(0, 14)}…`
  return titleCaseFromSnake(v)
}

function formatComposite(raw: string): string {
  return raw
    .split('::')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => titleCaseFromSnake(part))
    .join(' · ')
}

/**
 * @param value - Raw string from DB or API
 * @param context - What kind of identifier this is (improves patterns like queue_1 vs sub_1)
 */
export function formatDbLabel(value: string, context: DbDisplayContext = 'generic'): string {
  const v = value.trim()
  if (!v) return ''

  switch (context) {
    case 'questionType':
      return formatQuestionType(v)
    case 'queue':
      return formatQueue(v)
    case 'submission':
      return formatSubmission(v)
    case 'generic':
    default:
      if (v.includes('::')) return formatComposite(v)
      return titleCaseFromSnake(v)
  }
}
