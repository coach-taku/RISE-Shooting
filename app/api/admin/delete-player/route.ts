// コーチ用：選手アカウント削除 API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行。
//
// 【削除の仕様】
//   - Supabase Auth の auth.users から対象ユーザーを削除する。
//   - auth.users の削除に連動して、profiles テーブルも cascade で自動削除される
//     （schema.sql: profiles.id references auth.users(id) on delete cascade）。
//   - shooting_records テーブルも cascade で自動削除される
//     （schema.sql: shooting_records.user_id references profiles(id) on delete cascade）。
//   - つまり auth.users から削除するだけで、関連データがすべて安全に削除される。
//
// 【安全性の考慮】
//   - コーチのみが実行可能（role チェックあり）。
//   - 自分自身（コーチ自身）は削除できないよう制限している。
//   - 削除対象が 'player' role であることを確認してから削除する。

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

    // リクエストボディから削除対象ユーザーIDを取得
    const body = await request.json()
    const { targetUserId } = body

    if (!targetUserId) {
      return NextResponse.json({ error: '削除対象のユーザーIDが必要です' }, { status: 400 })
    }

    // 自分自身（コーチ）は削除させない
    if (targetUserId === user.id) {
      return NextResponse.json({ error: '自分自身を削除することはできません' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 削除対象が 'player' であることを確認（コーチを誤って削除しないため）
    const { data: targetProfile } = await adminClient
      .from('profiles')
      .select('role, username')
      .eq('id', targetUserId)
      .single()

    if (!targetProfile) {
      return NextResponse.json({ error: '対象ユーザーが見つかりません' }, { status: 404 })
    }

    if (targetProfile.role !== 'player') {
      return NextResponse.json({ error: '選手以外のアカウントは削除できません' }, { status: 400 })
    }

    // Supabase Auth からユーザーを削除する
    // （profiles と shooting_records は on delete cascade で自動削除される）
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(targetUserId)

    if (deleteError) {
      return NextResponse.json(
        { error: 'ユーザーの削除に失敗しました: ' + deleteError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
