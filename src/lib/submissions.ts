import { supabase } from './supabase'
import type { JsonValue, Submission } from '../types'

type UploadedSubmission = Omit<Submission, 'queue_id' | 'labeling_task_id' | 'created_at'> & {
  queueId: Submission['queue_id']
  labelingTaskId: Submission['labeling_task_id']
  createdAt: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isJsonValue(value: unknown): value is JsonValue {
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

function toUploadedSubmission(value: unknown, index: number): UploadedSubmission {
  if (!isRecord(value)) {
    throw new Error(`Item at index ${index} must be an object.`)
  }

  const { id, queueId, labelingTaskId, createdAt, questions, answers } = value

  if (typeof id !== 'string' || id.trim().length === 0) {
    throw new Error(`Item at index ${index} is missing a valid "id".`)
  }
  if (typeof queueId !== 'string' || queueId.trim().length === 0) {
    throw new Error(`Item at index ${index} is missing a valid "queueId".`)
  }
  if (typeof labelingTaskId !== 'string' || labelingTaskId.trim().length === 0) {
    throw new Error(`Item at index ${index} is missing a valid "labelingTaskId".`)
  }
  if (typeof createdAt !== 'number' || !Number.isFinite(createdAt)) {
    throw new Error(`Item at index ${index} is missing a valid "createdAt".`)
  }
  if (!isJsonValue(questions)) {
    throw new Error(`Item at index ${index} has invalid "questions" JSON.`)
  }
  if (!isJsonValue(answers)) {
    throw new Error(`Item at index ${index} has invalid "answers" JSON.`)
  }

  return {
    id,
    queueId,
    labelingTaskId,
    createdAt,
    questions,
    answers,
  }
}

export function parseSubmissionJson(text: string): Submission[] {
  let parsed: unknown

  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Invalid JSON file.')
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Uploaded JSON must be an array of submissions.')
  }

  if (parsed.length === 0) {
    throw new Error('Uploaded JSON array is empty.')
  }

  return parsed.map((item, index) => {
    const row = toUploadedSubmission(item, index)
    return {
      id: row.id,
      queue_id: row.queueId,
      labeling_task_id: row.labelingTaskId,
      created_at: row.createdAt,
      questions: row.questions,
      answers: row.answers,
    }
  })
}

export async function upsertSubmissions(rows: Submission[]): Promise<void> {
  const { error } = await supabase.from('submissions').upsert(rows, { onConflict: 'id' })

  if (error) {
    throw new Error(error.message)
  }
}

export async function listSubmissionsByQueue(queueId: string): Promise<Submission[]> {
  const { data, error } = await supabase
    .from('submissions')
    .select('id, queue_id, labeling_task_id, created_at, questions, answers')
    .eq('queue_id', queueId)
    .order('created_at', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []) as Submission[]
}
