import { createClient, SupabaseClient } from '@supabase/supabase-js'

let _client: SupabaseClient | null = null

/** Browser / server-side anon client — safe for public reads */
export function getSupabase(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return null
  if (!_client) _client = createClient(url, key)
  return _client
}

let _admin: SupabaseClient | null = null

/** Service-role client — server only, never expose to browser */
export function getSupabaseAdmin(): SupabaseClient | null {
  const url  = process.env.NEXT_PUBLIC_SUPABASE_URL
  const skey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !skey) return null
  if (!_admin) _admin = createClient(url, skey)
  return _admin
}
