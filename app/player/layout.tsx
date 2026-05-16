// 選手用ページのレイアウト（ナビバー付き）
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'

export default async function PlayerLayout({
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

  // コーチがアクセスしようとした場合はコーチ画面へ
  if (profile?.role === 'coach') {
    redirect('/coach/dashboard')
  }

  return (
    <div className="pt-14 pb-16 min-h-screen" style={{ backgroundColor: '#c0c0bf' }}>
      <NavBar role="player" username={profile?.username ?? ''} />
      {children}
    </div>
  )
}
