'use client'

// P-01: ログイン画面
// 名前をプルダウンで選択し、パスワードを入力してログインする。
// ユーザー一覧は DB（profiles テーブル）から動的に取得する。
// 内部ではサーバー API 経由でダミーメールアドレスを逆引きし、Supabase Auth でログインする。
// ※ セキュリティ改善: 共通「合言葉」から個別パスワード管理へ移行済み

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// DB から取得するユーザー情報の型
interface UserEntry {
  username: string
  role: string
}

export default function LoginPage() {
  const router = useRouter()
  const [users, setUsers] = useState<UserEntry[]>([])
  const [usersLoading, setUsersLoading] = useState(true)
  // ユーザー一覧取得時のエラーメッセージ（画面に表示してデバッグしやすくする）
  const [usersError, setUsersError] = useState('')
  const [selectedName, setSelectedName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // ログイン画面が開いたとき、DB からユーザー一覧を取得する
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/auth/users-list')
        // レスポンスが JSON でない場合（404、500 など）も考慮
        const text = await res.text()
        let data: { users?: UserEntry[]; error?: string }
        try {
          data = JSON.parse(text)
        } catch {
          setUsersError(`サーバーからの応答が不正です (${res.status})`)
          return
        }

        if (!res.ok || data.error) {
          setUsersError(data.error ?? `ユーザー一覧の取得に失敗しました (${res.status})`)
          return
        }

        if (data.users) {
          setUsers(data.users)
        }
      } catch (e) {
        setUsersError(`通信エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`)
      } finally {
        setUsersLoading(false)
      }
    }
    fetchUsers()
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (!selectedName) {
      setError('名前を選択してください。')
      setLoading(false)
      return
    }

    // サーバー API 経由で、選択した名前に対応するダミーメールアドレスを取得
    let email = ''
    try {
      const res = await fetch('/api/auth/login-by-name', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: selectedName }),
      })
      const data = await res.json()

      if (!res.ok || !data.email) {
        setError(data.error ?? 'ユーザー情報の取得に失敗しました。')
        setLoading(false)
        return
      }
      email = data.email
    } catch {
      setError('サーバーへの接続に失敗しました。')
      setLoading(false)
      return
    }

    // 取得したダミーメールアドレスとパスワードで Supabase Auth にログイン
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('名前またはパスワードが正しくありません。')
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

      // router.refresh() でサーバー側のセッション状態をクライアントに同期する。
      // これにより、proxy.ts が書き出した Cookie をサーバーコンポーネントが
      // 正しく認識し、ログイン状態が確実に維持される。
      router.refresh()

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
        <h1 className="text-3xl font-extrabold tracking-wider" style={{ color: '#1e3a8a' }}>
          RISE Shooting
        </h1>
        <p className="mt-1 text-sm text-black/80">シューティング記録・分析アプリ</p>
      </div>

      {/* ログインカード */}
      <div
        className="w-full max-w-sm rounded-2xl shadow-2xl p-8"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
      >
        <h2 className="text-lg font-bold text-black mb-6 text-center">ログイン</h2>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* 名前（プルダウン選択 — DB から動的取得） */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              名前
            </label>
            {usersLoading ? (
              <div className="w-full rounded-lg px-4 py-3 bg-white text-gray-400 text-sm">
                読み込み中...
              </div>
            ) : usersError ? (
              /* ユーザー一覧の取得に失敗した場合 — エラー内容を表示 */
              <div className="w-full rounded-lg px-4 py-3 bg-white text-red-500 text-xs">
                ⚠️ {usersError}
              </div>
            ) : (
              <select
                value={selectedName}
                onChange={(e) => setSelectedName(e.target.value)}
                required
                className="w-full rounded-lg px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 text-sm appearance-none"
              >
                <option value="">-- 名前を選んでください --</option>
                {users.map((user) => (
                  <option key={user.username} value={user.username}>
                    {user.username}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* パスワード */}
          <div>
            <label className="block text-sm font-medium text-black mb-1">
              パスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="パスワードを入力"
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
            disabled={loading || usersLoading || !!usersError}
            className="w-full py-3 rounded-xl font-bold text-gray-900 transition-all duration-200 disabled:opacity-60"
            style={{ backgroundColor: '#e1c614' }}
          >
            {loading ? 'ログイン中...' : 'ログイン 🏀'}
          </button>
        </form>

        <p className="mt-4 text-xs text-black/60 text-center">
          アカウントはコーチから発行されます
        </p>

        {/* 名前が表示されない・エラーが出ている場合の案内 */}
        {!usersLoading && (users.length === 0 || usersError) && (
          <div className="mt-4 p-3 rounded-xl text-center text-xs" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}>
            <p className="text-black/70 mb-2">
              {usersError ? 'ユーザー情報を読み込めませんでした。' : '名前が表示されていません。'}
            </p>
            <a
              href="/setup"
              className="inline-block px-4 py-1.5 rounded-lg font-bold text-gray-900 text-xs"
              style={{ backgroundColor: '#e1c614' }}
            >
              ⚙️ セットアップページへ
            </a>
          </div>
        )}
      </div>
    </div>
  )
}
