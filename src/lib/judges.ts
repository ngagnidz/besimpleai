/** Supabase helpers for `judges` (LLM configurations). Written from `Judges`; read by `fetchJudges` / `fetchActiveJudges` in `queries.ts`. */
import type { JudgeProvider } from '../types'
import { supabase } from './supabase'

/** Payload for create or update: `id` absent = insert; present = update that row (`name`, `system_prompt`, provider, model, `active`). */
export type SaveJudgeInput = {
  id?: string
  name: string
  system_prompt: string
  provider: JudgeProvider
  model: string
  active: boolean
}

/**
 * Inserts a new judge or updates an existing one. Trims `name` and `system_prompt` before persisting.
 *
 * @throws Error with the PostgREST message if the request fails
 */
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

/**
 * Updates only the `active` flag for a judge (e.g. disable without deleting).
 *
 * @throws Error with the PostgREST message if the request fails
 */
export async function setJudgeActive(judgeId: string, active: boolean): Promise<void> {
  const { error } = await supabase.from('judges').update({ active }).eq('id', judgeId)
  if (error) throw new Error(error.message)
}
