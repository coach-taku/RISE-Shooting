// コーチ用：選手パスワードリセット API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行
//
// ※ 個別パスワード管理対応（セキュリティ強化）:
//   パスワード変更時に profiles.password_plain も同期更新する。

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

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

    // リクエストボディからターゲットユーザーIDと新パスワードを取得
    const body = await request.json()
    const { targetUserId, newPassword } = body

    if (!targetUserId || !newPassword) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    if (newPassword.length < 4) {
      return NextResponse.json({ error: 'パスワードは4文字以上にしてください' }, { status: 400 })
    }

    // Admin クライアントでパスワードリセット
    const adminClient = createAdminClient()
    const { error } = await adminClient.auth.admin.updateUserById(targetUserId, {
      password: newPassword,
    })

    if (error) {
      return NextResponse.json({ error: 'パスワードのリセットに失敗しました' }, { status: 500 })
    }

    // profiles テーブルの password_plain も同期更新する
    // コーチが管理画面でパスワードを確認できるようにするため
    await adminClient
      .from('profiles')
      .update({ password_plain: newPassword })
      .eq('id', targetUserId)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
