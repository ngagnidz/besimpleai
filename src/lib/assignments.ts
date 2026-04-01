import { supabase } from './supabase'

export async function assignJudge(queueId: string, questionId: string, judgeId: string): Promise<void> {
  const { error } = await supabase.from('judge_assignments').upsert(
    { queue_id: queueId, question_id: questionId, judge_id: judgeId },
    { onConflict: 'queue_id,question_id,judge_id', ignoreDuplicates: true },
  )
  if (error) {
    throw new Error(error.message)
  }
}

export async function unassignJudge(queueId: string, questionId: string, judgeId: string): Promise<void> {
  const { error } = await supabase
    .from('judge_assignments')
    .delete()
    .eq('queue_id', queueId)
    .eq('question_id', questionId)
    .eq('judge_id', judgeId)

  if (error) {
    throw new Error(error.message)
  }
}
