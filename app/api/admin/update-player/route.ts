// コーチ用：選手情報更新 API ルート
// 選手の「名前（username）」と「パスワード」を個別または同時に更新できる。
// Service Role Key を使用するため、サーバーサイドのみで実行。
//
// ※ 個別パスワード管理への移行対応:
//   パスワードを更新すると Supabase Auth と profiles テーブルの両方が同期される。
//   また profiles テーブルの password_plain カラムにも平文を保存する（コーチが確認できるように）。

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

    // リクエストボディからターゲットユーザーIDと更新内容を取得
    const body = await request.json()
    const { targetUserId, newUsername, newPassword } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'ターゲットユーザーIDが必要です' }, { status: 400 })
    }

    if (!newUsername && !newPassword) {
      return NextResponse.json({ error: '名前またはパスワードのどちらかは必要です' }, { status: 400 })
    }

    if (newPassword && newPassword.length < 4) {
      return NextResponse.json({ error: 'パスワードは4文字以上にしてください' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // --- 1. パスワードを変更する場合: Supabase Auth に反映 ---
    if (newPassword) {
      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      })

      if (authUpdateError) {
        return NextResponse.json({ error: 'パスワードの更新に失敗しました: ' + authUpdateError.message }, { status: 500 })
      }
    }

    // --- 2. profiles テーブルを更新（名前 and/or パスワード平文） ---
    // password_plain は「コーチが一覧画面で確認できる」用途のカラム
    const updateData: Record<string, string> = {}
    if (newUsername) {
      updateData.username = newUsername
    }
    if (newPassword) {
      // コーチが管理画面で確認できるよう平文も保存する
      // ※ この値は表示専用。実際の認証は Supabase Auth が行う
      updateData.password_plain = newPassword
    }

    const { error: profileUpdateError } = await adminClient
      .from('profiles')
      .update(updateData)
      .eq('id', targetUserId)

    if (profileUpdateError) {
      return NextResponse.json({ error: 'プロフィールの更新に失敗しました: ' + profileUpdateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
