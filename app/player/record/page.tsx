'use client'

// P-02: シューティング記録入力画面
// 選手が1回のセッションで最大5エリア分のシュート結果を入力する

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SHOT_AREAS, SUCCESS_MESSAGES, CATEGORY_LABELS } from '@/lib/constants'

// 1エントリ（1エリア分）の型
interface ShotEntry {
  area_name: string
  successes: string // 入力中は文字列で扱う
}

const emptyEntry = (): ShotEntry => ({ area_name: '', successes: '' })

export default function RecordPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [entries, setEntries] = useState<ShotEntry[]>([emptyEntry()])
  const [loading, setLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')

  // エントリを追加（最大5つ）
  const addEntry = () => {
    if (entries.length < 5) {
      setEntries([...entries, emptyEntry()])
    }
  }

  // エントリを削除
  const removeEntry = (idx: number) => {
    if (entries.length > 1) {
      setEntries(entries.filter((_, i) => i !== idx))
    }
  }

  // フィールド更新
  const updateEntry = (idx: number, field: keyof ShotEntry, value: string) => {
    const updated = [...entries]
    updated[idx] = { ...updated[idx], [field]: value }
    setEntries(updated)
  }

  // 送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    setLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('ログインが必要です。')
      setLoading(false)
      return
    }

    // バリデーション
    for (const entry of entries) {
      if (!entry.area_name) {
        setError('エリアを選択してください。')
        setLoading(false)
        return
      }
      const suc = parseInt(entry.successes)
      if (isNaN(suc) || suc < 0 || suc > 10) {
        setError('成功数は0〜10の範囲で入力してください。')
        setLoading(false)
        return
      }
    }

    // Supabase に保存
    const records = entries.map((entry) => ({
      user_id: user.id,
      date,
      area_name: entry.area_name,
      attempts: 10, // 10本単位固定
      successes: parseInt(entry.successes),
    }))

    const { error: insertError } = await supabase
      .from('shooting_records')
      .insert(records)

    if (insertError) {
      setError('保存に失敗しました。もう一度お試しください。')
      setLoading(false)
      return
    }

    // 成功メッセージをランダム表示
    const msg = SUCCESS_MESSAGES[Math.floor(Math.random() * SUCCESS_MESSAGES.length)]
    setSuccessMsg(msg)
    setEntries([emptyEntry()])
    setLoading(false)
  }

  // エリアをカテゴリ別にグループ化
  const areasByCategory = SHOT_AREAS.reduce<Record<string, typeof SHOT_AREAS[number][]>>(
    (acc, area) => {
      if (!acc[area.category]) acc[area.category] = []
      acc[area.category].push(area)
      return acc
    },
    {}
  )

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-white mb-1">✏️ シュート記録</h1>
      <p className="text-sm text-white/70 mb-6">今日の練習を記録しよう！</p>

      {/* 成功メッセージ */}
      {successMsg && (
        <div
          className="mb-6 p-4 rounded-2xl text-center font-bold text-gray-900 shadow-lg animate-bounce"
          style={{ backgroundColor: '#e1c614' }}
        >
          {successMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* 日付選択 */}
        <div
          className="rounded-2xl p-4 shadow"
          style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
        >
          <label className="block text-sm font-medium text-white mb-1">📅 実施日</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            max={today}
            className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
          />
        </div>

        {/* エントリフォーム */}
        {entries.map((entry, idx) => (
          <div
            key={idx}
            className="rounded-2xl p-4 shadow"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold text-sm">エリア {idx + 1}</span>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(idx)}
                  className="text-xs text-white/60 hover:text-red-300 transition-colors"
                >
                  ✕ 削除
                </button>
              )}
            </div>

            {/* エリア選択 */}
            <div className="mb-3">
              <label className="block text-xs text-white/80 mb-1">エリア選択</label>
              <select
                value={entry.area_name}
                onChange={(e) => updateEntry(idx, 'area_name', e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 bg-white text-gray-800 text-sm focus:outline-none"
              >
                <option value="">-- エリアを選ぶ --</option>
                {Object.entries(areasByCategory).map(([category, areas]) => (
                  <optgroup key={category} label={CATEGORY_LABELS[category]}>
                    {areas.map((area) => (
                      <option key={area.value} value={area.value}>
                        {area.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 成功数入力（0〜10） */}
            <div>
              <label className="block text-xs text-white/80 mb-1">
                10本中 何本入った？
              </label>
              <div className="grid grid-cols-6 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateEntry(idx, 'successes', String(n))}
                    className="rounded-lg py-2 text-sm font-bold transition-all duration-150"
                    style={{
                      backgroundColor:
                        entry.successes === String(n) ? '#e1c614' : 'rgba(255,255,255,0.3)',
                      color: entry.successes === String(n) ? '#1a1a1a' : '#ffffff',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* エリア追加ボタン */}
        {entries.length < 5 && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full py-3 rounded-xl border-2 border-dashed text-white/70 hover:text-white hover:border-white transition-colors text-sm font-medium"
          >
            ＋ エリアを追加（最大5エリア）
          </button>
        )}

        {/* エラーメッセージ */}
        {error && (
          <p className="text-red-300 text-sm text-center">{error}</p>
        )}

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-extrabold text-gray-900 text-lg transition-all duration-200 disabled:opacity-60 shadow-lg"
          style={{ backgroundColor: '#e1c614' }}
        >
          {loading ? '登録中...' : '🏀 記録を登録！'}
        </button>
      </form>
    </div>
  )
}
