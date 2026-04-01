/**
 * Shared Supabase browser client (Vite `import.meta.env`).
 * URL + anon key must be set in `.env` as `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
 */
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
