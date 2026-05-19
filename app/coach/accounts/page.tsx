'use client'

// M-02: アカウント管理画面
// コーチが選手アカウント作成・パスワードリセットを行う画面

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Profile } from '@/lib/types'

export default function AccountsPage() {
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // 選手追加フォーム
  const [newUsername, setNewUsername] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  // パスワードリセット
  const [resetTargetId, setResetTargetId] = useState('')
  const [resetTargetName, setResetTargetName] = useState('')
  const [resetPassword, setResetPassword] = useState('')
  const [resetting, setResetting] = useState(false)
  const [resetMsg, setResetMsg] = useState('')
  const [showResetModal, setShowResetModal] = useState(false)

  // 選手一覧取得
  const fetchPlayers = async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'player')
      .order('username')
    setPlayers(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchPlayers() }, []) // eslint-disable-line

  // 選手アカウント作成
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateMsg('')

    const res = await fetch('/api/admin/create-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPassword,
        username: newUsername,
      }),
    })
    const data = await res.json()

    if (data.success) {
      setCreateMsg('✅ 選手アカウントを作成しました！')
      setNewUsername('')
      setNewEmail('')
      setNewPassword('')
      fetchPlayers()
    } else {
      setCreateMsg(`❌ エラー: ${data.error}`)
    }
    setCreating(false)
  }

  // パスワードリセット
  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetting(true)
    setResetMsg('')

    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: resetTargetId,
        newPassword: resetPassword,
      }),
    })
    const data = await res.json()

    if (data.success) {
      setResetMsg('✅ 合言葉をリセットしました！')
      setResetPassword('')
      setTimeout(() => {
        setShowResetModal(false)
        setResetMsg('')
      }, 2000)
    } else {
      setResetMsg(`❌ エラー: ${data.error}`)
    }
    setResetting(false)
  }

  const openResetModal = (player: Profile) => {
    setResetTargetId(player.id)
    setResetTargetName(player.username)
    setResetPassword('')
    setResetMsg('')
    setShowResetModal(true)
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-black mb-1">👥 アカウント管理</h1>
      <p className="text-sm text-black/70 mb-6">選手の登録と合言葉管理</p>

      {/* ===== 選手アカウント作成 ===== */}
      <section className="mb-8">
        <h2 className="text-base font-bold text-black mb-3">＋ 新しい選手を追加</h2>
        <div className="rounded-2xl p-5 shadow" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          <form onSubmit={handleCreatePlayer} className="space-y-3">
            <div>
              <label className="block text-xs text-black/80 mb-1">選手名（表示名）</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                required
                placeholder="例: 山田 太郎"
                className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-black/80 mb-1">メールアドレス（ログイン用）</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                placeholder="例: yamada@team.com"
                className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs text-black/80 mb-1">合言葉（パスワード）6文字以上</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                placeholder="例: rise2024"
                className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
              />
            </div>
            {createMsg && (
              <p className="text-sm text-black font-medium">{createMsg}</p>
            )}
            <button
              type="submit"
              disabled={creating}
              className="w-full py-3 rounded-xl font-bold text-gray-900 text-sm disabled:opacity-60"
              style={{ backgroundColor: '#e1c614' }}
            >
              {creating ? '作成中...' : '選手アカウントを作成'}
            </button>
          </form>
        </div>
      </section>

      {/* ===== 選手一覧とパスワードリセット ===== */}
      <section>
        <h2 className="text-base font-bold text-black mb-3">選手一覧</h2>
        {loading ? (
          <p className="text-black/60">読み込み中...</p>
        ) : players.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-black/60">まだ選手がいません。上から追加してください。</p>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden shadow" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <div className="divide-y divide-white/10">
              {players.map((player) => (
                <div key={player.id} className="flex items-center px-4 py-3">
                  <div className="flex-1">
                    <p className="text-black font-bold">{player.username}</p>
                    <p className="text-xs text-black/50">登録日: {player.created_at.split('T')[0]}</p>
                  </div>
                  <button
                    onClick={() => openResetModal(player)}
                    className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#1a1a1a' }}
                  >
                    🔑 合言葉リセット
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== パスワードリセットモーダル ===== */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 shadow-2xl" style={{ backgroundColor: '#2a2a2a' }}>
            <h3 className="text-black font-bold text-lg mb-1">🔑 合言葉リセット</h3>
            <p className="text-black/60 text-sm mb-4">
              {resetTargetName} さんの合言葉を変更します
            </p>
            <form onSubmit={handleReset} className="space-y-3">
              <div>
                <label className="block text-xs text-black/80 mb-1">新しい合言葉（6文字以上）</label>
                <input
                  type="text"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="新しい合言葉"
                  className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
                />
              </div>
              {resetMsg && (
                <p className="text-sm text-black font-medium">{resetMsg}</p>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-black/70 border border-black/20"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="flex-1 py-2 rounded-xl font-bold text-gray-900 text-sm disabled:opacity-60"
                  style={{ backgroundColor: '#e1c614' }}
                >
                  {resetting ? 'リセット中...' : 'リセット'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
