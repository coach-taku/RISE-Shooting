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
  try {
    const adminClient = createAdminClient()
    const results: { email: string; status: string; detail?: string }[] = []

    for (const user of DEMO_USERS) {
      // 既存ユーザーの確認
      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const alreadyExists = existingUsers?.users?.some((u) => u.email === user.email)

      if (alreadyExists) {
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
    console.error('seed-demo-users error:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
