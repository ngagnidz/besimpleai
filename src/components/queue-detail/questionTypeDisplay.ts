import { formatDbLabel } from '../../lib/utils'

/** Normalize labels from JSON / DB for matching. */
function normalizeType(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '_')
}

export function formatQuestionTypeLabel(raw: string): string {
  return formatDbLabel(raw, 'questionType')
}

/** Tailwind classes for TYPE column pills (ring = subtle outer edge). */
export function questionTypePillClass(raw: string): string {
  const n = normalizeType(raw)
  if (n === 'single_choice' || n === 'singlechoice') {
    return 'bg-sky-100 text-sky-900 ring-1 ring-sky-700/15'
  }
  if (n === 'yes_no' || n === 'yesno') {
    return 'bg-violet-100 text-violet-900 ring-1 ring-violet-700/15'
  }
  if (n === 'free_text' || n === 'freetext' || n === 'text') {
    return 'bg-indigo-100 text-indigo-900 ring-1 ring-indigo-700/20'
  }
  return 'bg-stone-100 text-stone-800 ring-1 ring-stone-500/15'
}
