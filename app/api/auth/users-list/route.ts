// ログイン画面用：全ユーザー名一覧を返す API ルート
// profiles テーブルから全ユーザーの名前（username）と role を取得する
// 認証不要でアクセスできる（ログイン前に名前一覧を表示するため）

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // profiles テーブルから全ユーザーを取得（username と role のみ）
    const { data, error } = await adminClient
      .from('profiles')
      .select('username, role')
      .order('username')

    if (error) {
      return NextResponse.json({ error: 'ユーザー一覧の取得に失敗しました' }, { status: 500 })
    }

    return NextResponse.json({ users: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
