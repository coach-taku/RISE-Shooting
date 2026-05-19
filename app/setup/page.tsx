'use client'

// デモ用初期設定ページ
// Supabase にデモアカウント3名を一括作成・診断するためのページ
// 初回セットアップ時 / 問題が起きたときに使用する（/setup でアクセス）

import { useState } from 'react'

// デモユーザー情報（表示用）
const DEMO_USERS = [
  { name: 'コーチ山田', email: 'yamada@rise-shooting.example.com', role: 'コーチ', password: 'rise2024' },
  { name: '選手佐藤',   email: 'sato@rise-shooting.example.com',   role: '選手',   password: 'rise2024' },
  { name: '選手鈴木',   email: 'suzuki@rise-shooting.example.com', role: '選手',   password: 'rise2024' },
]

// 診断APIから返ってくるユーザーの状態型
type DiagUser = {
  email: string
  username: string
  exists_in_auth: boolean
  email_confirmed: boolean | null
  email_confirmed_at?: string | null
  created_at?: string | null
  last_sign_in?: string | null
  user_metadata?: Record<string, unknown>
  profile: { username: string; role: string } | string | null
}

type DiagResult = {
  success?: boolean
  envCheck?: Record<string, unknown>
  demo_user_status?: DiagUser[]
  all_users_count?: number
  all_emails?: string[]
  error?: string
}

export default function SetupPage() {
  const [loading, setLoading] = useState(false)
  const [diagLoading, setDiagLoading] = useState(false)
  const [results, setResults] = useState<{ email: string; status: string; detail?: string }[]>([])
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [diagResult, setDiagResult] = useState<DiagResult | null>(null)
  const [showDiag, setShowDiag] = useState(false)

  // アカウント作成・修復
  const handleSetup = async () => {
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch('/api/admin/seed-demo-users', { method: 'POST' })

      const text = await res.text()
      let data: { success?: boolean; results?: typeof results; error?: string }
      try {
        data = JSON.parse(text)
      } catch {
        setError(`サーバーエラー (${res.status}): レスポンスが不正です。Vercelのログを確認してください。`)
        return
      }

      if (data.success && data.results) {
        setResults(data.results)
        setDone(true)
      } else {
        setError(data.error ?? `エラーが発生しました (status: ${res.status})`)
      }
    } catch (e) {
      setError(`通信エラー: ${e instanceof Error ? e.message : String(e)}`)
    } finally {
      setLoading(false)
    }
  }

  // 診断実行
  const handleDiag = async () => {
    setDiagLoading(true)
    setDiagResult(null)
    setShowDiag(true)

    try {
      const res = await fetch('/api/admin/debug-auth')
      const text = await res.text()
      try {
        setDiagResult(JSON.parse(text))
      } catch {
        setDiagResult({ error: `レスポンス解析失敗 (${res.status}): ${text.slice(0, 200)}` })
      }
    } catch (e) {
      setDiagResult({ error: `通信エラー: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setDiagLoading(false)
    }
  }

  const statusLabel = (status: string) => {
    if (status === 'created') return '✅ 作成完了'
    if (status === 'reset') return '✅ パスワード・権限を修復'
    if (status === 'already_exists') return '⚠️ 既に存在'
    if (status === 'error') return '❌ エラー'
    return status
  }

  const diagUserIcon = (u: DiagUser) => {
    if (!u.exists_in_auth) return '❌'
    if (!u.email_confirmed) return '⚠️'
    if (!u.profile || typeof u.profile === 'string') return '⚠️'
    return '✅'
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4 py-8"
      style={{ backgroundColor: '#c0c0bf' }}
    >
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <div className="text-4xl mb-2">⚙️</div>
        <h1 className="text-2xl font-extrabold" style={{ color: '#1e3a8a' }}>
          RISE Shooting
        </h1>
        <p className="text-black/80 text-sm mt-1">初期デモアカウント セットアップ</p>
      </div>

      {/* セットアップカード */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6 mb-4"
        style={{ backgroundColor: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(8px)' }}
      >
        <h2 className="text-black font-bold text-lg mb-2">デモアカウントを作成する</h2>
        <p className="text-black/70 text-sm mb-5">
          以下の3名のアカウントを Supabase に自動作成します。<br />
          すでに作成済みの場合でも、パスワードや権限を修復できます。<br />
          <span className="text-black/50 text-xs">※ ログイン画面で名前が表示されない場合はここから作成してください。</span>
        </p>

        {/* デモユーザー一覧 */}
        <div className="rounded-xl overflow-hidden mb-5" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-black/50 text-xs">
                <th className="text-left px-3 py-2">名前</th>
                <th className="text-left px-3 py-2">権限</th>
                <th className="text-left px-3 py-2">合言葉</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {DEMO_USERS.map((u) => (
                <tr key={u.email}>
                  <td className="px-3 py-2 text-black font-medium">{u.name}</td>
                  <td className="px-3 py-2 text-black/70">{u.role}</td>
                  <td className="px-3 py-2 text-black/70 font-mono">{u.password}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 実行結果 */}
        {results.length > 0 && (
          <div className="mb-5 space-y-2">
            {results.map((r) => (
              <div key={r.email} className="flex flex-col text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-black/70">{r.email}</span>
                  <span className="font-medium" style={{ color: r.status === 'error' ? '#fca5a5' : '#86efac' }}>
                    {statusLabel(r.status)}
                  </span>
                </div>
                {r.detail && (
                  <span className="text-red-300 mt-0.5 break-all">{r.detail}</span>
                )}
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

        {/* エラー */}
        {error && (
          <div className="mb-4 p-3 rounded-xl text-xs break-all" style={{ backgroundColor: 'rgba(252,165,165,0.15)', color: '#fca5a5' }}>
            {error}
          </div>
        )}

        {/* 作成・修復ボタン */}
        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-gray-900 disabled:opacity-60 transition-all mb-3"
          style={{ backgroundColor: '#e1c614' }}
        >
          {loading ? '処理中...' : done ? 'もう一度修復する' : 'デモアカウントを作成する'}
        </button>

        {done && (
          <a
            href="/login"
            className="block w-full py-3 rounded-xl font-bold text-center text-gray-900 transition-all mb-3"
            style={{ backgroundColor: '#86efac', color: '#1a1a1a' }}
          >
            ログイン画面へ →
          </a>
        )}

        <p className="text-xs text-black/40 text-center">
          ※ このページはデモ初期設定専用です
        </p>
      </div>

      {/* 診断カード */}
      <div
        className="w-full max-w-md rounded-2xl shadow-2xl p-6"
        style={{ backgroundColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(8px)' }}
      >
        <h2 className="text-black font-bold text-base mb-2">🔍 ログインできない場合の診断</h2>
        <p className="text-black/60 text-xs mb-4">
          アカウントの状態を詳しく確認します。ログインエラーの原因特定に使用してください。
        </p>

        <button
          onClick={handleDiag}
          disabled={diagLoading}
          className="w-full py-2.5 rounded-xl font-bold text-sm disabled:opacity-60 transition-all mb-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
        >
          {diagLoading ? '診断中...' : '診断を実行する'}
        </button>

        {/* 診断結果 */}
        {showDiag && (
          <div className="space-y-3">
            {diagResult?.error && (
              <div className="p-3 rounded-xl text-xs break-all" style={{ backgroundColor: 'rgba(252,165,165,0.15)', color: '#fca5a5' }}>
                エラー: {diagResult.error}
              </div>
            )}

            {/* 環境変数チェック */}
            {diagResult?.envCheck && (
              <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                <p className="text-black/70 font-bold mb-2">環境変数</p>
                {Object.entries(diagResult.envCheck).map(([k, v]) => (
                  <div key={k} className="flex justify-between mb-1">
                  <span className="text-black/50 text-xs">{k}</span>
                    <span className="font-mono text-xs" style={{ color: v ? '#86efac' : '#fca5a5' }}>
                      {String(v)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* デモユーザー状態 */}
            {diagResult?.demo_user_status && (
              <div className="space-y-2">
                <p className="text-black/70 text-xs font-bold">デモユーザーの状態</p>
                {diagResult.demo_user_status.map((u) => (
                  <div key={u.email} className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-black font-bold">{diagUserIcon(u)} {u.username}</span>
                      <span className="text-black/50">{u.email}</span>
                    </div>
                    <div className="space-y-1 text-black/60">
                      <div className="flex justify-between">
                        <span>auth.users に存在</span>
                        <span style={{ color: u.exists_in_auth ? '#86efac' : '#fca5a5' }}>
                          {u.exists_in_auth ? 'あり' : 'なし ← 要作成'}
                        </span>
                      </div>
                      {u.exists_in_auth && (
                        <>
                          <div className="flex justify-between">
                            <span>メール認証済み</span>
                            <span style={{ color: u.email_confirmed ? '#86efac' : '#fca5a5' }}>
                              {u.email_confirmed ? 'はい' : 'いいえ ← 要確認'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>profiles テーブル</span>
                            <span style={{ color: typeof u.profile === 'object' && u.profile !== null ? '#86efac' : '#fca5a5' }}>
                              {typeof u.profile === 'object' && u.profile !== null
                                ? `role=${(u.profile as { role: string }).role}`
                                : typeof u.profile === 'string'
                                  ? u.profile
                                  : 'なし ← 要修復'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>最終ログイン</span>
                            <span className="text-black/40">
                              {u.last_sign_in ? new Date(u.last_sign_in).toLocaleString('ja-JP') : 'なし'}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 診断結果のまとめと対処法 */}
            {diagResult?.demo_user_status && (
              <div className="p-3 rounded-xl text-xs" style={{ backgroundColor: 'rgba(225,198,20,0.1)', border: '1px solid rgba(225,198,20,0.3)' }}>
                <p className="font-bold mb-2" style={{ color: '#1e3a8a' }}>📋 診断まとめ・対処法</p>
                {diagResult.demo_user_status.some((u) => !u.exists_in_auth) && (
                  <p className="text-black/70 mb-1">• 存在しないユーザーがいます → 上の「デモアカウントを作成する」を実行してください</p>
                )}
                {diagResult.demo_user_status.some((u) => u.exists_in_auth && !u.email_confirmed) && (
                  <p className="text-black/70 mb-1">• メール認証が未完了のユーザーがいます → 「デモアカウントを作成する」を実行すると修復されます</p>
                )}
                {diagResult.demo_user_status.some((u) => u.exists_in_auth && (!u.profile || typeof u.profile === 'string')) && (
                  <p className="text-black/70 mb-1">• profiles テーブルにデータがないユーザーがいます → 「デモアカウントを作成する」を実行してください</p>
                )}
                {diagResult.demo_user_status.every((u) =>
                  u.exists_in_auth && u.email_confirmed && typeof u.profile === 'object' && u.profile !== null
                ) && (
                  <p style={{ color: '#86efac' }}>• すべてのアカウントが正常な状態です。</p>
                )}
                <p className="text-black/50 mt-2">
                  ※ それでもログインできない場合は、「デモアカウントを作成する」でパスワードを再設定してください。
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
