// コーチ用：コーチ名変更 API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行。
//
// 【仕様】
//   - コーチアカウントの username（表示名）を更新する。
//   - 実行できるのはコーチのみ（role チェックあり）。
//   - 変更対象のアカウントが 'coach' role であることを確認してから更新する。
//   - パスワード変更は対象外（コーチのパスワード変更は本機能のスコープ外）。

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

    // リクエストボディからターゲットユーザーIDと新しい名前を取得
    const body = await request.json()
    const { targetUserId, newUsername } = body

    if (!targetUserId) {
      return NextResponse.json({ error: 'ターゲットユーザーIDが必要です' }, { status: 400 })
    }

    if (!newUsername || newUsername.trim().length === 0) {
      return NextResponse.json({ error: '新しい名前を入力してください' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 変更対象が 'coach' role であることを確認
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role, username')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: '対象ユーザーが見つかりません' }, { status: 404 })
    }

    if (targetProfile.role !== 'coach') {
      return NextResponse.json({ error: 'コーチ以外のアカウントはこのAPIでは変更できません' }, { status: 400 })
    }

    // profiles テーブルの username を更新
    const { error: updateError } = await adminClient
      .from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', targetUserId)

    if (updateError) {
      return NextResponse.json(
        { error: 'コーチ名の更新に失敗しました: ' + updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
