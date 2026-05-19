// 名前でのログイン用 API ルート
// username からダミーメールアドレスを逆引きし、Supabase Auth でのログインに必要な
// メールアドレスをクライアントに返す
//
// ※ セキュリティ注記:
//   このエンドポイントはメールアドレス（ダミー）を返すが、
//   実際のログイン処理（パスワード照合）は Supabase Auth が行うため
//   メールアドレスだけが漏れてもアカウント不正アクセスにはつながらない。

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const { username } = await request.json()

    if (!username) {
      return NextResponse.json({ error: '名前が指定されていません' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. profiles テーブルから username で user_id を取得
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'ユーザーが見つかりません' }, { status: 404 })
    }

    // 2. auth.users から user_id でメールアドレスを取得
    const { data: authUser, error: authError } = await adminClient.auth.admin.getUserById(profile.id)

    if (authError || !authUser.user) {
      return NextResponse.json({ error: 'ユーザー情報の取得に失敗しました' }, { status: 500 })
    }

    // ダミーメールアドレスをクライアントに返す（ログイン処理に使用）
    return NextResponse.json({ email: authUser.user.email })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
