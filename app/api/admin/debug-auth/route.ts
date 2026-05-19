// 認証デバッグ用API（問題解決後に削除予定）
// auth.users の状態・パスワード確認・profiles の状態を診断する

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// デモユーザー定義（seed-demo-users と同一）
const DEMO_USERS = [
  { email: 'yamada@demo.risenote.com', username: 'コーチ山田', role: 'coach' },
  { email: 'sato@demo.risenote.com', username: '選手佐藤', role: 'player' },
  { email: 'suzuki@demo.risenote.com', username: '選手鈴木', role: 'player' },
]

export async function GET() {
  // 環境変数チェック
  const envCheck = {
    NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    supabase_url_value: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/^(https:\/\/[^.]+).*/, '$1...') ?? 'なし',
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY が未設定です。Vercelの環境変数を確認してください。',
      envCheck,
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
            created_at: null,
            last_sign_in: null,
            profile: null,
          }
        }

        // profiles テーブルも確認
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

    // auth.users に存在する全メールアドレス一覧（デバッグ用）
    const allEmails = allUsers.map((u) => u.email)

    return NextResponse.json({
      success: true,
      envCheck,
      demo_user_status: demoUserStatus,
      all_users_count: allUsers.length,
      all_emails: allEmails,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      error: `サーバーエラー: ${message}`,
      envCheck,
    }, { status: 500 })
  }
}
