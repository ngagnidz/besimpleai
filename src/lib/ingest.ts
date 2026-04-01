/**
 * Persists normalized submission import batches to Supabase.
 * Parse uploads first with `parseSubmissions` from `./parser`.
 */
import { supabase } from './supabase'
import type { ParsedData } from './parser'

/**
 * Upserts parsed rows in dependency order: queues → questions → submissions → answers.
 *
 * All tables use `onConflict: 'id'` for idempotent re-imports.
 *
 * @throws `Error` with the Supabase message when any step fails (later steps are skipped).
 */
export async function ingestData(parsed: ParsedData): Promise<void> {
  const { error: queuesError } = await supabase
    .from('queues')
    .upsert(parsed.queues, { onConflict: 'id' })
  if (queuesError) {
    throw new Error(queuesError.message)
  }

  const { error: questionsError } = await supabase
    .from('questions')
    .upsert(parsed.questions, { onConflict: 'id' })
  if (questionsError) {
    throw new Error(questionsError.message)
  }

  const { error: submissionsError } = await supabase
    .from('submissions')
    .upsert(parsed.submissions, { onConflict: 'id' })
  if (submissionsError) {
    throw new Error(submissionsError.message)
  }

  const { error: answersError } = await supabase
    .from('answers')
    .upsert(parsed.answers, { onConflict: 'id' })
  if (answersError) {
    throw new Error(answersError.message)
  }
}
