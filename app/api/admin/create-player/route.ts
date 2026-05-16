// コーチ用：選手アカウント作成 API ルート
// Service Role Key を使用するため、サーバーサイドのみで実行

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

    // リクエストボディから選手情報取得
    const body = await request.json()
    const { email, password, username } = body

    if (!email || !password || !username) {
      return NextResponse.json({ error: 'パラメータが不足しています' }, { status: 400 })
    }

    // Admin クライアントでユーザー作成（メール確認不要）
    const adminClient = createAdminClient()
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
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
