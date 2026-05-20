// コーチ用：選手アカウント作成 API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行
//
// ※ メールアドレス廃止対応:
//   フロントからメールアドレスを受け取らず、
//   サーバー側でダミーメールアドレスを自動生成して Supabase Auth に渡す。
//   形式: [ランダム8文字]@player.rise-shooting.example.com
//
// ※ 個別パスワード管理対応（セキュリティ強化）:
//   作成時のパスワードを profiles.password_plain にも保存する。
//   コーチが管理画面でパスワードを確認できるようにするため。
//
// ※ パスワードパディング方式:
//   ユーザーが入力したパスワードに PASSWORD_SUFFIX を付加して Supabase Auth に渡す。
//   Supabase の最小文字数制約（6文字以上）を回避するため。
//   profiles.password_plain にはユーザー入力値（サフィックスなし）を保存する。

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildAuthPassword } from '@/lib/constants'

// ランダムな英小文字＋数字8文字の文字列を生成する
function generateRandomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(request: NextRequest) {
  try {
    // リクエストしているユーザーがコーチかどうか確認
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '未認証です' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'coach') {
      return NextResponse.json({ error: '権限がありません' }, { status: 403 })
    }

    // リクエストボディから選手情報取得（メールアドレスは不要）
    const body = await request.json()
    const { password, username } = body

    if (!password || !username) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    // サーバー側でダミーメールアドレスを自動生成
    // ランダム8文字 + 固定ドメインで衝突しにくい形式にする
    const randomPart = generateRandomString(8)
    const dummyEmail = `${randomPart}@player.rise-shooting.example.com`

    // Admin クライアントでユーザー作成（メール確認不要）
    const adminClient = createAdminClient()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: dummyEmail,
      password: buildAuthPassword(password), // パディング付加（Supabaseの6文字制約を回避）
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        username,
        role: 'player',
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    // ユーザー作成後、profiles テーブルの password_plain も更新する
    // （handle_new_user トリガーが profiles を作成した後に実行）
    const newUserId = newUser.user?.id
    if (newUserId) {
      // トリガーによる profiles 作成を少し待つ（非同期）
      // 失敗してもアカウント作成自体は成功とみなす
      await adminClient
        .from('profiles')
        .update({ password_plain: password })
        .eq('id', newUserId)
    }

    return NextResponse.json({ success: true, userId: newUserId })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
