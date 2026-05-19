// 認証デバッグ用API（問題解決後に削除予定）
// 環境変数・auth.users・profiles の状態を診断する

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

// デモユーザー定義（seed-demo-users と同一）
const DEMO_USERS = [
  { email: 'yamada@rise-shooting.example.com', username: 'コーチ山田', role: 'coach' },
  { email: 'sato@rise-shooting.example.com', username: '選手佐藤', role: 'player' },
  { email: 'suzuki@rise-shooting.example.com', username: '選手鈴木', role: 'player' },
]

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

  // 環境変数の詳細チェック（値の一部を表示して確認できるようにする）
  const envCheck = {
    SUPABASE_URL_exists: !!url,
    SUPABASE_URL_preview: url ? url.replace(/^(https:\/\/[^.]+).*/, '$1...') : 'なし',
    ANON_KEY_exists: !!anonKey,
    ANON_KEY_length: anonKey.length,
    ANON_KEY_prefix: anonKey ? anonKey.slice(0, 20) + '...' : 'なし',
    SERVICE_KEY_exists: !!serviceKey,
    SERVICE_KEY_length: serviceKey.length,
    SERVICE_KEY_prefix: serviceKey ? serviceKey.slice(0, 20) + '...' : 'なし',
  }

  // ANON KEY で実際に Supabase に疎通確認（ログインは不要）
  let anonKeyTest: { ok: boolean; status?: number; error?: string } = { ok: false }
  if (url && anonKey) {
    try {
      // 存在しないメールでログイン試行 → "Invalid login credentials" が返れば ANON KEY は有効
      const testClient = createSupabaseClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
      const { error } = await testClient.auth.signInWithPassword({
        email: 'test-key-check@example.com',
        password: 'dummy-password-check',
      })
      if (error) {
        // "Invalid login credentials" → ANON KEY は有効、ユーザーが存在しないだけ
        // "Invalid API key" → ANON KEY が無効
        anonKeyTest = {
          ok: error.message !== 'Invalid API key',
          status: error.status,
          error: error.message,
        }
      } else {
        anonKeyTest = { ok: true }
      }
    } catch (e) {
      anonKeyTest = { ok: false, error: String(e) }
    }
  }

  if (!serviceKey) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です。',
      envCheck,
      anonKeyTest,
    }, { status: 500 })
  }

  try {
    const adminClient = createAdminClient()

    // auth.users の全ユーザー取得
    const { data: usersData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json({
        error: `auth.users 取得失敗: ${listError.message}`,
        envCheck,
        anonKeyTest,
      }, { status: 500 })
    }

    const allUsers = usersData?.users ?? []

    // デモユーザーの詳細状態を確認
    const demoUserStatus = await Promise.all(
      DEMO_USERS.map(async (demo) => {
        const found = allUsers.find((u) => u.email === demo.email)

        if (!found) {
          return {
            email: demo.email,
            username: demo.username,
            exists_in_auth: false,
            email_confirmed: null,
            profile: null,
          }
        }

        const { data: profile, error: profileError } = await adminClient
          .from('profiles')
          .select('username, role')
          .eq('id', found.id)
          .single()

        return {
          email: demo.email,
          username: demo.username,
          exists_in_auth: true,
          email_confirmed: found.email_confirmed_at !== null,
          email_confirmed_at: found.email_confirmed_at,
          created_at: found.created_at,
          last_sign_in: found.last_sign_in_at,
          user_metadata: found.user_metadata,
          profile: profileError ? `エラー: ${profileError.message}` : profile,
        }
      })
    )

    return NextResponse.json({
      success: true,
      envCheck,
      anonKeyTest,
      demo_user_status: demoUserStatus,
      all_users_count: allUsers.length,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      error: `サーバーエラー: ${message}`,
      envCheck,
      anonKeyTest,
    }, { status: 500 })
  }
}
