'use client'

// P-01: ログイン画面
// 選手・コーチが「名前（メールアドレス）」と「合言葉（パスワード）」でログインする画面

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const supabase = createClient()

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('名前または合言葉が正しくありません。もう一度確認してください。')
      setLoading(false)
      return
    }

    // ロール取得してリダイレクト
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'coach') {
        router.push('/coach/dashboard')
      } else {
        router.push('/player/stats')
      }
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ backgroundColor: '#c0c0bf' }}
    >
      {/* ロゴ・タイトル */}
      <div className="mb-8 text-center">
        <div className="text-5xl mb-3">🏀</div>
        <h1 className="text-3xl font-extrabold tracking-wider" style={{ color: '#e1c614' }}>
          RISE Shooting
        </h1>
        <p className="mt-1 text-sm text-white/80">シューティング記録・分析アプリ</p>
      </div>

      {/* ログインカード */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
      >
        <h2 className="text-lg font-bold text-white mb-6 text-center">ログイン</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* メールアドレス（名前代わりに使用） */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              メールアドレス（名前）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="例: yamada@team.com"
              className="w-full rounded-lg px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 text-sm"
            />
          </div>

          {/* パスワード（合言葉） */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              合言葉（パスワード）
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="合言葉を入力"
              className="w-full rounded-lg px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 text-sm"
            />
          </div>

          {/* エラーメッセージ */}
          {error && (
            <p className="text-red-300 text-sm text-center">{error}</p>
          )}

          {/* ログインボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-gray-900 transition-all duration-200 disabled:opacity-60"
            style={{ backgroundColor: '#e1c614' }}
          >
            {loading ? 'ログイン中...' : 'ログイン 🏀'}
          </button>
        </form>

        <p className="mt-4 text-xs text-white/60 text-center">
          アカウントはコーチから発行されます
        </p>
      </div>
    </div>
  )
}
