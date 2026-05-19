// コーチ用管理機能（パスワードリセット等）用 Supabase Admin クライアント
// Service Role Key を使用するため、サーバーサイドのみで使用すること
import { createClient } from '@supabase/supabase-js'
import { getSupabaseUrl } from './url'

export function createAdminClient() {
  return createClient(
    getSupabaseUrl(),
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
