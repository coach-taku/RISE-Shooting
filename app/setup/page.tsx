'use client'

// デモ用初期設定ページ
// Supabase にデモアカウント3名を一括作成するためのページ
// 初回セットアップ時のみ使用する（/setup でアクセス）

import { useState } from 'react'

// デモユーザー情報（表示用）
const DEMO_USERS = [
  { name: 'コーチ山田', email: 'yamada@demo.risenote.com', role: 'コーチ', password: 'rise2024' },
  { name: '選手佐藤',   email: 'sato@demo.risenote.com',   role: '選手',   password: 'rise2024' },
  { name: '選手鈴木',   email: 'suzuki@demo.risenote.com', role: '選手',   password: 'rise2024' },
]

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<{ email: string; status: string; detail?: string }[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  const handleSetup = async () => {
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch('/api/admin/seed-demo-users', { method: 'POST' })

      // レスポンスが JSON でない場合に備えてテキストで受け取る
      const text = await res.text()
      let data: { success?: boolean; results?: typeof results; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        // JSON パース失敗 = サーバーが HTML などを返した場合（500エラーなど）
        setError(`サーバーエラー (${res.status}): レスポンスが不正です。Vercelのログを確認してください。`)
        return
      }

      if (data.success && data.results) {
        setResults(data.results)
        setDone(true)
      } else {
        // サーバーから返ってきた具体的なエラーメッセージをそのまま表示
        setError(data.error ?? `エラーが発生しました (status: ${res.status})`)
      }
    } catch (e) {
      // fetch 自体が失敗した場合（ネットワークエラーなど）
      setError(`通信エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  const statusLabel = (status: string) => {
    if (status === 'created') return '✅ 作成完了'
    if (status === 'reset') return '✅ パスワード・権限を修復しました'
    if (status === 'already_exists') return '⚠️ 既に存在します'
    if (status === 'error') return '❌ エラー'
    return status
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: '#c0c0bf' }}
    >
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">⚙️</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#e1c614' }}>
          RISE Shooting
        </h1>
        <p className="text-white/80 text-sm mt-1">初期デモアカウント セットアップ</p>
      </div>

      {/* セットアップカード */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
      >
        <h2 className="text-white font-bold text-lg mb-2">デモアカウントを作成する</h2>
        <p className="text-white/70 text-sm mb-5">
          以下の3名のアカウントを Supabase に自動作成します。<br />
          初回セットアップ時のみ実行してください。
        </p>

        {/* デモユーザー一覧 */}
        <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-white/50 text-xs">
                <th className="text-left px-3 py-2">名前</th>
                <th className="text-left px-3 py-2">権限</th>
                <th className="text-left px-3 py-2">合言葉</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-3 py-2 text-white font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-white/70">{u.role}</td>
                  <td className="px-3 py-2 text-white/70 font-mono">{u.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 実行結果 */}
        {results.length > 0 && (
          <div className="mb-5 space-y-2">
            {results.map((r) => (
              <div key={r.email} className="flex items-center justify-between text-sm">
                <span className="text-white/70 text-xs">{r.email}</span>
                <span className="font-medium text-xs" style={{ color: r.status === 'error' ? '#fca5a5' : r.status === 'created' ? '#86efac' : '#fde68a' }}>
                  {statusLabel(r.status)}
                  {r.detail && <span className="ml-1">({r.detail})</span>}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* 完了メッセージ */}
        {done && (
          <div className="mb-5 p-3 rounded-xl text-center text-sm font-medium" style={{ backgroundColor: 'rgba(134,239,172,0.15)', color: '#86efac' }}>
            セットアップ完了！ログイン画面からログインできます 🏀
          </div>
        )}

        {/* エラー（サーバーから返ってきたメッセージをそのまま表示） */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs break-all" style={{ backgroundColor: 'rgba(252,165,165,0.15)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* ボタン */}
        {!done ? (
          <button
            onClick={handleSetup}
            disabled={loading}
            className="w-full py-3 rounded-xl font-bold text-gray-900 disabled:opacity-60 transition-all"
            style={{ backgroundColor: '#e1c614' }}
          >
            {loading ? '作成中...' : 'デモアカウントを作成する'}
          </button>
        ) : (
          <a
            href="/login"
            className="block w-full py-3 rounded-xl font-bold text-center text-gray-900 transition-all"
            style={{ backgroundColor: '#e1c614' }}
          >
            ログイン画面へ →
          </a>
        )}

        <p className="mt-4 text-xs text-white/40 text-center">
          ※ このページはデモ初期設定専用です
        </p>
      </div>
    </div>
  )
}
