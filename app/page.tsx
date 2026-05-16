// ホームページ：ロールに応じて適切な画面へリダイレクト
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function HomePage() {
  const supabase = await createClient()

  // ログイン中のユーザーを取得
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // プロフィール取得（ロール確認）
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role === 'coach') {
    redirect('/coach/dashboard')
  } else {
    redirect('/player/stats')
  }
}
