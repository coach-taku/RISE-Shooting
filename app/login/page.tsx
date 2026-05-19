'use client'

// P-01: ログイン画面（デモ版）
// 名前をプルダウンで選択し、合言葉（パスワード）を入力してログインする
// 内部では選択した名前を仮想メールアドレスに変換して Supabase Auth を利用する

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// デモユーザー一覧
// 名前と内部で使用する仮想メールアドレスを対応付ける
const DEMO_USERS = [
  { name: 'コーチ山田', email: 'yamada@demo.risenote.com' },
  { name: '選手佐藤', email: 'sato@demo.risenote.com' },
  { name: '選手鈴木', email: 'suzuki@demo.risenote.com' },
]

export default function LoginPage() {
  const router = useRouter()
  const [selectedName, setSelectedName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    // 選択された名前から仮想メールアドレスを取得
    const selectedUser = DEMO_USERS.find((u) => u.name === selectedName)
    if (!selectedUser) {
      setError('名前を選択してください。')
      setLoading(false)
      return
    }

    const supabase = createClient()

    // 仮想メールアドレスとパスワードで Supabase Auth にログイン
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: selectedUser.email,
      password,
    })

    if (authError) {
      // デバッグ用：Supabaseの生のエラーメッセージを表示（原因特定後に元に戻す）
      setError(`[DEBUG] ${authError.message} (status: ${authError.status})`)
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
          {/* 名前（プルダウン選択） */}
          <div>
            <label className="block text-sm font-medium text-white mb-1">
              名前
            </label>
            <select
              value={selectedName}
              onChange={(e) => setSelectedName(e.target.value)}
              required
              className="w-full rounded-lg px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 text-sm appearance-none"
            >
              <option value="">-- 名前を選んでください --</option>
              {DEMO_USERS.map((user) => (
                <option key={user.email} value={user.name}>
                  {user.name}
                </option>
              ))}
            </select>
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
