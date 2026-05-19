// コーチ用：選手アカウント作成 API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行
//
// ※ メールアドレス廃止対応:
//   フロントからメールアドレスを受け取らず、
//   サーバー側でダミーメールアドレスを自動生成して Supabase Auth に渡す。
//   形式: [ランダム8文字]@player.rise-shooting.example.com

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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
      password,
      email_confirm: true, // メール確認をスキップ
      user_metadata: {
        username,
        role: 'player',
      },
    })

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, userId: newUser.user?.id })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
