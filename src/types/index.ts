export type Verdict = 'pass' | 'fail' | 'inconclusive'

export type JsonPrimitive = string | number | boolean | null

export type JsonValue = JsonPrimitive | JsonObject | JsonValue[]

export type JsonObject = {
  [key: string]: JsonValue
}

export type Queue = {
  id: string
}

export type Question = {
  id: string
  queue_id: string
  question_type: string
  question_text: string
  rev: number
}

export type Submission = {
  id: string
  queue_id: string
  labeling_task_id: string
  created_at: number
}

export type Answer = {
  id: string  
  submission_id: string
  question_id: string
  answer_json: JsonValue
}

export type JudgeProvider = 'openai' | 'anthropic'

export type Judge = {
  id: string
  name: string
  system_prompt: string
  model: string
  provider: JudgeProvider
  active: boolean
  created_at: string
}

export type JudgeAssignment = {
  id: string
  queue_id: string
  question_id: string
  judge_id: string
}

export type Evaluation = {
  id: string
  queue_id: string
  submission_id: string
  question_id: string
  judge_id: string
  verdict: Verdict
  reasoning: string
  created_at: string
}