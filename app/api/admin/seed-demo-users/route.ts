// デモ用アカウント一括作成 API ルート
// Supabase に3名のデモユーザーが存在しない場合に自動作成する
// Service Role Key を使用するため、サーバーサイドのみで実行

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// デモユーザー定義（ログイン画面のプルダウンと一致させること）
const DEMO_USERS = [
  {
    email: 'yamada@demo.risenote.com',
    password: 'rise2024',
    username: 'コーチ山田',
    role: 'coach',
  },
  {
    email: 'sato@demo.risenote.com',
    password: 'rise2024',
    username: '選手佐藤',
    role: 'player',
  },
  {
    email: 'suzuki@demo.risenote.com',
    password: 'rise2024',
    username: '選手鈴木',
    role: 'player',
  },
]

export async function POST() {
  // 環境変数チェック（Vercelに設定されているか確認）
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: '環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません。Vercelの環境変数設定を確認してください。' },
      { status: 500 }
    )
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: '環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。Vercelの環境変数設定を確認してください。' },
      { status: 500 }
    )
  }

  try {
    const adminClient = createAdminClient()
    const results: { email: string; status: string; detail?: string }[] = []

    // 既存ユーザー一覧を1回だけ取得（ループ内で毎回呼ばないよう最適化）
    const { data: existingUsersData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json(
        { error: `ユーザー一覧の取得に失敗しました: ${listError.message}` },
        { status: 500 }
      )
    }

    const existingEmails = new Set(existingUsersData?.users?.map((u) => u.email) ?? [])

    for (const user of DEMO_USERS) {
      // 既存ユーザーの確認
      if (existingEmails.has(user.email)) {
        results.push({ email: user.email, status: 'already_exists' })
        continue
      }

      // 新規作成
      const { error } = await adminClient.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true, // メール確認をスキップ
        user_metadata: {
          username: user.username,
          role: user.role,
        },
      })

      if (error) {
        results.push({ email: user.email, status: 'error', detail: error.message })
      } else {
        results.push({ email: user.email, status: 'created' })
      }
    }

    return NextResponse.json({ success: true, results })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('seed-demo-users error:', message)
    return NextResponse.json(
      { error: `サーバーエラー: ${message}` },
      { status: 500 }
    )
  }
}
