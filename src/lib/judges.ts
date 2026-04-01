import type { JudgeProvider } from '../types'
import { supabase } from './supabase'

export type SaveJudgeInput = {
  id?: string
  name: string
  system_prompt: string
  provider: JudgeProvider
  model: string
  active: boolean
}

export async function saveJudge(input: SaveJudgeInput): Promise<void> {
  const row = {
    name: input.name.trim(),
    system_prompt: input.system_prompt.trim(),
    provider: input.provider,
    model: input.model,
    active: input.active,
  }

  if (input.id) {
    const { error } = await supabase.from('judges').update(row).eq('id', input.id)
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('judges').insert(row)
  if (error) throw new Error(error.message)
}

export async function setJudgeActive(judgeId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('judges').update({ active }).eq('id', judgeId)
  if (error) throw new Error(error.message)
}
