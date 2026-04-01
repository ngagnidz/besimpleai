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
  const { error } = await supabase
    .from('evaluations')
    .upsert(row, { onConflict: 'submission_id,question_id,judge_id' })
  if (error) {
    throw new Error(error.message)
  }
}
