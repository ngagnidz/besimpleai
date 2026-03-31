import { supabase } from './supabase'
import type { QuestionJudgeAssignment } from '../types'

export async function listAssignments(queueId: string): Promise<QuestionJudgeAssignment[]> {
  const { data, error } = await supabase
    .from('question_judge_assignments')
    .select('id, queue_id, question_id, judge_id')
    .eq('queue_id', queueId)

  if (error) throw new Error(error.message)
  return (data ?? []) as QuestionJudgeAssignment[]
}

export async function addAssignment(
  queueId: string,
  questionId: string,
  judgeId: string,
): Promise<QuestionJudgeAssignment> {
  const { data, error } = await supabase
    .from('question_judge_assignments')
    .insert({
      queue_id: queueId,
      question_id: questionId,
      judge_id: judgeId,
    })
    .select('id, queue_id, question_id, judge_id')
    .single()

  if (error) throw new Error(error.message)
  return data as QuestionJudgeAssignment
}

export async function removeAssignment(
  queueId: string,
  questionId: string,
  judgeId: string,
): Promise<void> {
  const { error } = await supabase
    .from('question_judge_assignments')
    .delete()
    .eq('queue_id', queueId)
    .eq('question_id', questionId)
    .eq('judge_id', judgeId)

  if (error) throw new Error(error.message)
}
