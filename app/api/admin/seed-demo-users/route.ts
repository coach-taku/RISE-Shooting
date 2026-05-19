// デモ用アカウント一括作成・修復 API ルート
// 既存ユーザーも含めてパスワード・profiles を確実に正しい状態にする
// Service Role Key を使用するため、サーバーサイドのみで実行

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// デモユーザー定義（ログイン画面のプルダウンと一致させること）
const DEMO_USERS = [
  {
    email: 'yamada@rise-shooting.example.com',
    password: 'rise2024',
    username: 'コーチ山田',
    role: 'coach',
  },
  {
    email: 'sato@rise-shooting.example.com',
    password: 'rise2024',
    username: '選手佐藤',
    role: 'player',
  },
  {
    email: 'suzuki@rise-shooting.example.com',
    password: 'rise2024',
    username: '選手鈴木',
    role: 'player',
  },
]

export async function POST() {
  // 環境変数チェック
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json(
      { error: '環境変数 NEXT_PUBLIC_SUPABASE_URL が設定されていません。' },
      { status: 500 }
    )
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: '環境変数 SUPABASE_SERVICE_ROLE_KEY が設定されていません。' },
      { status: 500 }
    )
  }

  try {
    const adminClient = createAdminClient()
    const results: { email: string; status: string; detail?: string }[] = []

    // 既存ユーザー一覧を取得
    const { data: existingUsersData, error: listError } = await adminClient.auth.admin.listUsers()
    if (listError) {
      return NextResponse.json(
        { error: `ユーザー一覧の取得に失敗しました: ${listError.message}` },
        { status: 500 }
      )
    }

    const existingUserMap = new Map(
      existingUsersData?.users?.map((u) => [u.email, u.id]) ?? []
    )

    for (const user of DEMO_USERS) {
      const existingId = existingUserMap.get(user.email)

      if (existingId) {
        // 既存ユーザー：パスワードと user_metadata を強制リセット
        const { error: updateError } = await adminClient.auth.admin.updateUserById(
          existingId,
          {
            password: user.password,
            email_confirm: true,
            user_metadata: {
              username: user.username,
              role: user.role,
            },
          }
        )
        if (updateError) {
          results.push({ email: user.email, status: 'error', detail: `パスワードリセット失敗: ${updateError.message}` })
          continue
        }

        // profiles テーブルも確実に更新
        const { error: profileError } = await adminClient
          .from('profiles')
          .upsert(
            { id: existingId, username: user.username, role: user.role },
            { onConflict: 'id' }
          )
        if (profileError) {
          results.push({ email: user.email, status: 'error', detail: `profile更新失敗: ${profileError.message}` })
          continue
        }

        results.push({ email: user.email, status: 'reset' })
      } else {
        // 新規ユーザー：作成
        const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
          email: user.email,
          password: user.password,
          email_confirm: true,
          user_metadata: {
            username: user.username,
            role: user.role,
          },
        })
        if (createError) {
          results.push({ email: user.email, status: 'error', detail: createError.message })
          continue
        }

        // profiles テーブルに手動で挿入（トリガーが失敗する場合の保険）
        if (newUser?.user?.id) {
          await adminClient
            .from('profiles')
            .upsert(
              { id: newUser.user.id, username: user.username, role: user.role },
              { onConflict: 'id' }
            )
        }

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
