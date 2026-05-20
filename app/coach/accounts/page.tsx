'use client'

// M-02: アカウント管理画面（セキュリティ強化版）
// コーチが選手アカウントの作成・名前変更・パスワード変更を行う画面。
//
// ※ セキュリティ改善（個別パスワード管理への移行）:
//   - 画面を開く際に「管理者パスワード認証」を要求（3.2 管理者専用アクセス制御）
//   - 選手一覧で現在のパスワードを確認できるビューを追加
//   - 選手の名前（username）を直接変更できる機能を追加
//   - パスワードを「リセット（初期化）」だけでなく「任意の値に直接変更」できるよう拡張
//   - 変更内容は Supabase Auth と profiles テーブルの両方に即時反映される

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { buildAuthPassword } from '@/lib/constants'
import { Profile } from '@/lib/types'

export default function AccountsPage() {
  // ===== 管理者アクセス制御 =====
  // コーチが自分のパスワードで認証してはじめて管理機能にアクセスできる
  const [adminVerified, setAdminVerified] = useState(false)
  const [adminPassword, setAdminPassword] = useState('')
  const [adminError, setAdminError] = useState('')
  const [adminLoading, setAdminLoading] = useState(false)

  // ===== 選手一覧 =====
  const [players, setPlayers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  // 選手追加フォーム
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [creating, setCreating] = useState(false)
  const [createMsg, setCreateMsg] = useState('')

  // 選手情報編集モーダル（名前変更 + パスワード変更を統合）
  const [editTarget, setEditTarget] = useState<Profile | null>(null)
  const [editUsername, setEditUsername] = useState('')
  const [editPassword, setEditPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editMsg, setEditMsg] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)

  // 一覧のパスワード表示/非表示の切り替え（全体）
  const [showAllPasswords, setShowAllPasswords] = useState(false)

  // 管理者認証済みになったら選手一覧を読み込む
  useEffect(() => {
    if (adminVerified) {
      fetchPlayers()
    }
  }, [adminVerified]) // eslint-disable-line

  // 選手一覧取得（password_plain カラムも取得）
  const fetchPlayers = async () => {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('profiles')
      .select('id, username, role, password_plain, created_at')
      .eq('role', 'player')
      .order('username')
    setPlayers(data ?? [])
    setLoading(false)
  }

  // ===== 管理者パスワード認証 =====
  // コーチが自分のパスワードを入力して認証する
  // Supabase Auth で現在ログイン中のコーチのメールアドレスを取得し、
  // 入力されたパスワードで signInWithPassword を試みることで照合する
  const handleAdminVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setAdminLoading(true)
    setAdminError('')

    const supabase = createClient()

    // 現在ログイン中のコーチのメールアドレスを取得
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      setAdminError('ログイン情報が取得できませんでした。再ログインしてください。')
      setAdminLoading(false)
      return
    }

    // 入力されたパスワード（パディング付き）で照合を試みる
    // パディング方式: ユーザー入力値 + PASSWORD_SUFFIX を Supabase Auth に渡す
    const { error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: buildAuthPassword(adminPassword),
    })

    if (error) {
      setAdminError('パスワードが正しくありません。')
      setAdminLoading(false)
      return
    }

    // 認証成功 — 管理機能を解放する
    setAdminVerified(true)
    setAdminPassword('')
    setAdminLoading(false)
  }

  // 選手アカウント作成（メールアドレスはサーバー側で自動生成）
  const handleCreatePlayer = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    setCreateMsg('')

    const res = await fetch('/api/admin/create-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        password: newPassword,
        username: newUsername,
      }),
    })
    const data = await res.json()

    if (data.success) {
      // 作成後、profiles テーブルの password_plain も更新する
      // （create-player API がパスワードを保存しない場合のため、update-player API で補完）
      if (data.userId) {
        await fetch('/api/admin/update-player', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUserId: data.userId,
            newPassword,
          }),
        })
      }
      setCreateMsg('✅ 選手アカウントを作成しました！')
      setNewUsername('')
      setNewPassword('')
      fetchPlayers()
    } else {
      setCreateMsg(`❌ エラー: ${data.error}`)
    }
    setCreating(false)
  }

  // 編集モーダルを開く
  const openEditModal = (player: Profile) => {
    setEditTarget(player)
    setEditUsername(player.username)
    setEditPassword('')
    setShowPassword(false)
    setEditMsg('')
    setShowEditModal(true)
  }

  // 選手情報の更新（名前 and/or パスワード）
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editTarget) return

    setEditing(true)
    setEditMsg('')

    // 名前が変更されているかチェック
    const nameChanged = editUsername.trim() !== editTarget.username
    const passwordChanged = editPassword.trim().length > 0

    if (!nameChanged && !passwordChanged) {
      setEditMsg('⚠️ 変更内容がありません。')
      setEditing(false)
      return
    }

    const body: Record<string, string> = { targetUserId: editTarget.id }
    if (nameChanged) body.newUsername = editUsername.trim()
    if (passwordChanged) body.newPassword = editPassword.trim()

    const res = await fetch('/api/admin/update-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()

    if (data.success) {
      setEditMsg('✅ 更新しました！')
      fetchPlayers()
      setTimeout(() => {
        setShowEditModal(false)
        setEditMsg('')
      }, 1500)
    } else {
      setEditMsg(`❌ エラー: ${data.error}`)
    }
    setEditing(false)
  }

  // ===== 管理者認証画面 =====
  // adminVerified が false の間はこちらを表示
  if (!adminVerified) {
    return (
      <div className="max-w-sm mx-auto px-4 py-10">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🔐</div>
          <h1 className="text-xl font-extrabold text-black">管理者認証</h1>
          <p className="text-sm text-black/70 mt-1">
            アカウント管理画面にアクセスするには<br />
            コーチのパスワードを入力してください
          </p>
        </div>

        <div
          className="rounded-2xl p-6 shadow"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <form onSubmit={handleAdminVerify} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                パスワード
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                required
                placeholder="コーチのパスワードを入力"
                autoFocus
                className="w-full rounded-lg px-4 py-3 text-gray-800 bg-white focus:outline-none focus:ring-2 text-sm"
              />
            </div>

            {adminError && (
              <p className="text-red-400 text-sm text-center font-medium">{adminError}</p>
            )}

            <button
              type="submit"
              disabled={adminLoading}
              className="w-full py-3 rounded-xl font-bold text-gray-900 text-sm disabled:opacity-60"
              style={{ backgroundColor: '#e1c614' }}
            >
              {adminLoading ? '確認中...' : '認証して管理画面を開く'}
            </button>
          </form>
        </div>

        <p className="mt-4 text-xs text-black/50 text-center">
          ※ コーチ自身のログインパスワードを入力してください
        </p>
      </div>
    )
  }

  // ===== 管理者認証済み — メインの管理画面 =====
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <h1 className="text-xl font-extrabold text-black">👥 アカウント管理</h1>
        {/* 認証済みバッジ */}
        <span
          className="text-xs px-2 py-0.5 rounded-full font-medium"
          style={{ backgroundColor: 'rgba(225,198,20,0.3)', color: '#1a1a1a' }}
        >
          🔓 認証済み
        </span>
      </div>
      <p className="text-sm text-black/70 mb-6">選手の登録・名前変更・パスワード管理</p>

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
              <label className="block text-xs text-black/80 mb-1">パスワード（4文字以上）</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={4}
                placeholder="例: taro2024"
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

      {/* ===== 選手一覧（パスワード確認 + 編集） ===== */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-black">選手一覧</h2>
          {/* パスワードの一括表示/非表示ボタン */}
          {players.length > 0 && (
            <button
              onClick={() => setShowAllPasswords(!showAllPasswords)}
              className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
              style={{ backgroundColor: 'rgba(255,255,255,0.25)', color: '#1a1a1a' }}
            >
              {showAllPasswords ? '🔒 パスワードを隠す' : '👁 パスワードを表示'}
            </button>
          )}
        </div>

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
                <div key={player.id} className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      {/* 選手名 */}
                      <p className="text-black font-bold truncate">{player.username}</p>
                      {/* パスワード表示エリア */}
                      <div className="mt-0.5">
                        {showAllPasswords ? (
                          <p className="text-xs font-mono text-black/70">
                            🔑 {player.password_plain ?? '（未設定）'}
                          </p>
                        ) : (
                          <p className="text-xs text-black/40">
                            🔑 {'●'.repeat(Math.min(player.password_plain?.length ?? 8, 8))}
                          </p>
                        )}
                      </div>
                      <p className="text-xs text-black/40 mt-0.5">登録日: {player.created_at.split('T')[0]}</p>
                    </div>
                    {/* 編集ボタン */}
                    <button
                      onClick={() => openEditModal(player)}
                      className="ml-3 text-xs px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap"
                      style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#1a1a1a' }}
                    >
                      ✏️ 編集
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* ===== 選手情報編集モーダル（名前 + パスワード統合） ===== */}
      {showEditModal && editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center px-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
            style={{ backgroundColor: '#2a2a2a' }}
          >
            <h3 className="text-white font-bold text-lg mb-1">✏️ 選手情報の編集</h3>
            <p className="text-white/60 text-sm mb-4">
              {editTarget.username} さんの情報を変更します
            </p>
            <form onSubmit={handleEdit} className="space-y-4">
              {/* 名前の変更 */}
              <div>
                <label className="block text-xs text-white/80 mb-1">名前（表示名）</label>
                <input
                  type="text"
                  value={editUsername}
                  onChange={(e) => setEditUsername(e.target.value)}
                  required
                  placeholder="選手名を入力"
                  className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
                />
              </div>

              {/* パスワードの変更 */}
              <div>
                <label className="block text-xs text-white/80 mb-1">
                  新しいパスワード（変更しない場合は空欄）
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    minLength={4}
                    placeholder="4文字以上で入力"
                    className="w-full rounded-lg px-3 py-2 pr-10 bg-white text-gray-800 text-sm focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs"
                  >
                    {showPassword ? '🔒' : '👁'}
                  </button>
                </div>
                {/* 現在のパスワード表示 */}
                {editTarget.password_plain && (
                  <p className="text-xs text-white/50 mt-1">
                    現在: {editTarget.password_plain}
                  </p>
                )}
              </div>

              {editMsg && (
                <p className="text-sm text-white font-medium">{editMsg}</p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 rounded-xl text-sm text-white/70 border border-white/20"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={editing}
                  className="flex-1 py-2 rounded-xl font-bold text-gray-900 text-sm disabled:opacity-60"
                  style={{ backgroundColor: '#e1c614' }}
                >
                  {editing ? '更新中...' : '変更を保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
