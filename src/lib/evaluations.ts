import type { Verdict } from '../types'
import { supabase } from './supabase'

export type InsertEvaluationInput = {
  submission_id: string
  question_id: string
  judge_id: string
  verdict: Verdict
  reasoning: string
}

export async function insertEvaluation(row: InsertEvaluationInput): Promise<void> {
  const { error } = await supabase.from('evaluations').insert(row)
  if (error) {
    throw new Error(error.message)
  }
}
