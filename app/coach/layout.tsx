// コーチ用ページのレイアウト（ナビバー付き）
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'

export default async function CoachLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, role')
    .eq('id', user.id)
    .single()

  // 選手がコーチ画面にアクセスしようとした場合はブロック
  if (profile?.role !== 'coach') {
    redirect('/player/stats')
  }

  return (
    <div className="pt-14 pb-16 min-h-screen" style={{ backgroundColor: '#c0c0bf' }}>
      <NavBar role="coach" username={profile?.username ?? ''} />
      {children}
    </div>
  )
}
