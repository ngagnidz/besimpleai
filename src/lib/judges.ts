import { supabase } from './supabase'
import type { Judge } from '../types'

export const JUDGE_MODEL_OPTIONS = [
  'gpt-4o',
  'gpt-4o-mini',
  'claude-sonnet-4-5',
  'claude-3-haiku-20240307',
  'gemini-pro',
] as const

export type JudgeModelName = (typeof JUDGE_MODEL_OPTIONS)[number]

export type JudgeInput = {
  name: string
  system_prompt: string
  model_name: JudgeModelName
  active: boolean
}

export async function listJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, name, system_prompt, model_name, active, created_at')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Judge[]
}

export async function listActiveJudges(): Promise<Judge[]> {
  const { data, error } = await supabase
    .from('judges')
    .select('id, name, system_prompt, model_name, active, created_at')
    .eq('active', true)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as Judge[]
}

export async function createJudge(input: JudgeInput): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .insert(input)
    .select('id, name, system_prompt, model_name, active, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data as Judge
}

export async function updateJudge(id: string, input: JudgeInput): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .update(input)
    .eq('id', id)
    .select('id, name, system_prompt, model_name, active, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data as Judge
}

export async function setJudgeActive(id: string, active: boolean): Promise<Judge> {
  const { data, error } = await supabase
    .from('judges')
    .update({ active })
    .eq('id', id)
    .select('id, name, system_prompt, model_name, active, created_at')
    .single()

  if (error) throw new Error(error.message)
  return data as Judge
}

export async function deleteJudge(id: string): Promise<void> {
  const { error } = await supabase.from('judges').delete().eq('id', id)
  if (error) throw new Error(error.message)
}
