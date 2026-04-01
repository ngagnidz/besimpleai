/**
 * Submission JSON parsing: validates upload payloads and normalizes them into rows for persistence.
 * No database access—use `ingestData` from `./ingest` to write these rows.
 */
import type { Answer, JsonValue, Question, Queue, Submission } from '../types'
import { isJsonValue, isRecord } from './utils'

/** Normalized rows ready for `ingestData`, plus UI preview metadata. */
export type ParsedData = {
  queues: Queue[]
  questions: Question[]
  submissions: Submission[]
  answers: Answer[]
  previewRows: { submissionId: string; queueId: string; questionCount: number }[]
}

/**
 * Ensures a submission array element is a plain object before field validation.
 * @throws If the value is null, an array, or not an object.
 */
function assertItemObject(value: unknown, index: number): asserts value is Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Item at index ${index} must be an object with id, queueId, questions, and answers.`)
  }
}

/**
 * Requires `questions` to be an array. Individual question entries are validated separately.
 * @returns The array reference for downstream parsing.
 */
function validateQuestionsArray(value: unknown, index: number): unknown[] {
  if (!Array.isArray(value)) {
    throw new Error(`Item at index ${index}: "questions" must be an array.`)
  }
  return value
}

/**
 * Coerces the upload `answers` object into a `Record` whose values are valid `JsonValue`s.
 * Rejects non-objects and any entry that fails JSON shape checks.
 * @returns A shallow copy safe to iterate for answer rows.
 */
function validateAnswersObject(value: unknown, index: number): Record<string, JsonValue> {
  if (!isRecord(value)) {
    throw new Error(`Item at index ${index}: "answers" must be a JSON object.`)
  }
  const out: Record<string, JsonValue> = {}
  for (const [key, val] of Object.entries(value)) {
    if (!isJsonValue(val)) {
      throw new Error(`Item at index ${index}: answers["${key}"] is not valid JSON.`)
    }
    out[key] = val
  }
  return out
}

/**
 * Maps one raw question block (rev + data) into a `Question` row for the database.
 * Expects camelCase source fields (`questionType`, `questionText`) and emits snake_case columns.
 */
function parseQuestionEntry(
  raw: unknown,
  itemIndex: number,
  qIndex: number,
  queueId: string,
): Question {
  if (!isRecord(raw)) {
    throw new Error(`Item at index ${itemIndex}, question ${qIndex}: expected an object.`)
  }
  const rev = raw.rev
  const data = raw.data
  if (typeof rev !== 'number' || !Number.isFinite(rev)) {
    throw new Error(`Item at index ${itemIndex}, question ${qIndex}: "rev" must be a finite number.`)
  }
  if (!isRecord(data)) {
    throw new Error(`Item at index ${itemIndex}, question ${qIndex}: "data" must be an object.`)
  }
  const templateId = data.id
  const questionType = data.questionType
  const questionText = data.questionText
  if (typeof templateId !== 'string' || templateId.length === 0) {
    throw new Error(
      `Item at index ${itemIndex}, question ${qIndex}: "data.id" must be a non-empty string.`,
    )
  }
  if (typeof questionType !== 'string') {
    throw new Error(
      `Item at index ${itemIndex}, question ${qIndex}: "data.questionType" must be a string.`,
    )
  }
  if (typeof questionText !== 'string') {
    throw new Error(
      `Item at index ${itemIndex}, question ${qIndex}: "data.questionText" must be a string.`,
    )
  }
  /** Stable PK per queue so upserts never collide when two queues reuse the same template id. */
  const id = `${queueId}::${templateId}`
  return {
    id,
    queue_id: queueId,
    question_type: questionType,
    question_text: questionText,
    rev,
  }
}

/**
 * Validates a JSON root array and builds deduplicated queue and question rows, submission rows,
 * and per-answer rows (each answer gets a new UUID).
 *
 * Required per item: `id`, `queueId`, `questions`, `answers`.
 * Optional: `labelingTaskId` / `labeling_task_id`, `createdAt` / `created_at` (defaults applied).
 *
 * Question row `id` is `${queueId}::${templateId}` so PKs are unique across queues; templates are
 * deduped so repeated definitions collapse to one row per queue+template.
 *
 * @throws Descriptive `Error` messages for invalid structure or types (includes array indices).
 */
export function parseSubmissions(raw: unknown): ParsedData {
  if (!Array.isArray(raw)) {
    throw new Error('JSON root must be an array of submissions.')
  }
  if (raw.length === 0) {
    throw new Error('Submission array is empty.')
  }

  const queueIds = new Set<string>()
  const questionByKey = new Map<string, Question>()
  const submissionIds = new Set<string>()
  const submissions: Submission[] = []
  const answers: Answer[] = []
  const previewRows: ParsedData['previewRows'] = []

  for (let i = 0; i < raw.length; i += 1) {
    const item = raw[i]
    assertItemObject(item, i)

    const id = item.id
    const queueId = item.queueId
    if (typeof id !== 'string' || id.trim().length === 0) {
      throw new Error(`Item at index ${i}: "id" must be a non-empty string.`)
    }
    if (submissionIds.has(id)) {
      throw new Error(
        `Item at index ${i}: duplicate submission id "${id}" — each submission id must appear once in the file.`,
      )
    }
    submissionIds.add(id)
    if (typeof queueId !== 'string' || queueId.trim().length === 0) {
      throw new Error(`Item at index ${i}: "queueId" must be a non-empty string.`)
    }

    const questionsRaw = validateQuestionsArray(item.questions, i)
    const answersObj = validateAnswersObject(item.answers, i)
    previewRows.push({
      submissionId: id,
      queueId,
      questionCount: questionsRaw.length,
    })

    const labelingTaskId =
      typeof item.labelingTaskId === 'string'
        ? item.labelingTaskId
        : typeof item.labeling_task_id === 'string'
          ? item.labeling_task_id
          : ''
    const createdAtRaw = item.createdAt ?? item.created_at
    const created_at =
      typeof createdAtRaw === 'number' && Number.isFinite(createdAtRaw) ? createdAtRaw : Date.now()

    queueIds.add(queueId)

    for (let q = 0; q < questionsRaw.length; q += 1) {
      const qRow = parseQuestionEntry(questionsRaw[q], i, q, queueId)
      questionByKey.set(qRow.id, qRow)
    }

    submissions.push({
      id,
      queue_id: queueId,
      labeling_task_id: labelingTaskId,
      created_at,
    })

    for (const [templateQuestionId, answerValue] of Object.entries(answersObj)) {
      answers.push({
        id: crypto.randomUUID(),
        submission_id: id,
        question_id: `${queueId}::${templateQuestionId}`,
        answer_json: answerValue,
      })
    }
  }

  const queues: Queue[] = [...queueIds].map((qid) => ({ id: qid }))
  const questions = [...questionByKey.values()]

  return { queues, questions, submissions, answers, previewRows }
}
