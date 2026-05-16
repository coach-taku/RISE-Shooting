'use client'

// 共通ナビゲーションバー（選手・コーチ両方で使用）
import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface NavBarProps {
  role: 'player' | 'coach'
  username: string
}

export default function NavBar({ role, username }: NavBarProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  // 選手用ナビ項目
  const playerNavItems = [
    { href: '/player/stats', label: '📊 マイ記録', icon: '📊' },
    { href: '/player/record', label: '✏️ 記録する', icon: '✏️' },
  ]

  // コーチ用ナビ項目
  const coachNavItems = [
    { href: '/coach/dashboard', label: '📋 ダッシュボード', icon: '📋' },
    { href: '/coach/accounts', label: '👥 選手管理', icon: '👥' },
  ]

  const navItems = role === 'coach' ? coachNavItems : playerNavItems

  return (
    <>
      {/* トップバー */}
      <header
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 shadow-md"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        <span className="font-extrabold tracking-wide" style={{ color: '#e1c614' }}>
          🏀 RISE
        </span>
        <span className="text-white text-sm">
          {username}
          {role === 'coach' && (
            <span className="ml-1 text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: '#e1c614', color: '#1a1a1a' }}>
              コーチ
            </span>
          )}
        </span>
        <button
          onClick={handleLogout}
          className="text-xs text-white/70 hover:text-white transition-colors"
        >
          ログアウト
        </button>
      </header>

      {/* ボトムナビ（スマホ用） */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex shadow-2xl"
        style={{ backgroundColor: '#1a1a1a' }}
      >
        {navItems.map((item) => {
          const isActive = pathname === item.href
          return (
            <button
              key={item.href}
              onClick={() => router.push(item.href)}
              className="flex-1 flex flex-col items-center justify-center py-2 text-xs font-medium transition-colors"
              style={{
                color: isActive ? '#e1c614' : 'rgba(255,255,255,0.5)',
                borderTop: isActive ? '2px solid #e1c614' : '2px solid transparent',
              }}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label.replace(/^.+\s/, '')}</span>
            </button>
          )
        })}
      </nav>
    </>
  )
}
