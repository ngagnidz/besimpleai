export type Verdict = 'pass' | 'fail' | 'inconclusive'

export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export type JsonObject = {
  [key: string]: JsonValue
}

export type Submission = {
  id: string
  queue_id: string
  labeling_task_id: string
  created_at: number
  questions: JsonValue
  answers: JsonValue
}

export type Judge = {
  id: string
  name: string
  system_prompt: string
  model_name: string
  active: boolean
  created_at: string
}

export type QuestionJudgeAssignment = {
  id: string
  queue_id: string
  question_id: string
  judge_id: string
}

export type Evaluation = {
  id: string
  submission_id: string
  question_id: string
  judge_id: string
  verdict: Verdict
  reasoning: string
  error: string | null
  created_at: string
}
