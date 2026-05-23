'use client'

// P-02: シューティング記録入力画面
// 選手が任意の日付を選択し、その日の記録としてシュート結果を入力する
// v6: インラインカレンダーUIを追加。過去・未来の制限なし。既存データの読み込みに対応。
// v7: バグ修正 — 最大10セット制限・入力の独立化・空セットのフィルタリング・SW エラー解消
// v8: 過去データの修正・削除機能を追加 — 既存データ読み込み時に修正・削除ボタンを表示
// v9: 1日の入力セット数を無制限化 — 既存データがある日でも新規追加（追記）が可能に。
//     「修正モード」を廃止し、「既存データ確認 + 追記フォーム」の2パネル構成に変更。

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SHOT_AREAS, SUCCESS_MESSAGES, CATEGORY_LABELS } from '@/lib/constants'

// 1回の送信で追加できる最大セット数（UI制限）
const MAX_ENTRIES = 10

// 1エントリ（1エリア分）の型
// id を持たせることで各セットを一意に識別し、入力の連動バグを防ぐ
interface ShotEntry {
  id: string          // 一意のID（入力連動バグ防止のため必須）
  area_name: string
  successes: string   // 入力中は文字列で扱う
}

// データベース上の既存レコードの型
interface ExistingRecord {
  record_id: number
  area_name: string
  successes: number
  attempts: number
}

// 一意IDを生成する関数（crypto.randomUUID が使えない環境向けのフォールバック付き）
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

// 空のエントリを新規作成する（毎回新しいIDを付与）
const emptyEntry = (): ShotEntry => ({
  id: generateId(),
  area_name: '',
  successes: '',
})

// 日付文字列から表示用テキストに変換（例: 2026-05-23 → 2026年5月23日）
function formatDateJP(dateStr: string): string {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}年${m}月${d}日`
}

// インラインカレンダーコンポーネント
function InlineCalendar({
  selected,
  onChange,
}: {
  selected: string
  onChange: (date: string) => void
}) {
  const today = new Date()
  // 表示中の年月（selected の年月を初期値にする）
  const [viewYear, setViewYear] = useState(() => {
    if (selected) return parseInt(selected.split('-')[0])
    return today.getFullYear()
  })
  const [viewMonth, setViewMonth] = useState(() => {
    if (selected) return parseInt(selected.split('-')[1]) - 1
    return today.getMonth()
  })

  // selected が外部から変わったとき表示月を合わせる
  useEffect(() => {
    if (selected) {
      setViewYear(parseInt(selected.split('-')[0]))
      setViewMonth(parseInt(selected.split('-')[1]) - 1)
    }
  }, [selected])

  // 前月へ
  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear(viewYear - 1)
    } else {
      setViewMonth(viewMonth - 1)
    }
  }

  // 次月へ
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear(viewYear + 1)
    } else {
      setViewMonth(viewMonth + 1)
    }
  }

  // その月の日数と最初の曜日を計算
  const firstDay = new Date(viewYear, viewMonth, 1).getDay() // 0=日曜
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  // カレンダーに表示するセル（空白 + 日付）
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  // 日付を選択したときに "YYYY-MM-DD" 形式で親へ通知
  const handleSelectDay = (day: number) => {
    const mm = String(viewMonth + 1).padStart(2, '0')
    const dd = String(day).padStart(2, '0')
    onChange(`${viewYear}-${mm}-${dd}`)
  }

  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']
  const monthNames = [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ]

  // 今日の文字列
  const todayStr = today.toISOString().split('T')[0]

  return (
    <div
      className="rounded-2xl p-4 shadow"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
    >
      {/* ヘッダー：月移動 */}
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={prevMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-black font-bold transition-colors"
        >
          ‹
        </button>
        <span className="text-black font-extrabold text-base">
          {viewYear}年 {monthNames[viewMonth]}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/20 text-black font-bold transition-colors"
        >
          ›
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className="text-center text-xs font-bold py-1"
            style={{
              color: i === 0 ? '#e55' : i === 6 ? '#46a' : '#333',
            }}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} />
          }
          const mm = String(viewMonth + 1).padStart(2, '0')
          const dd = String(day).padStart(2, '0')
          const dateStr = `${viewYear}-${mm}-${dd}`
          const isSelected = dateStr === selected
          const isToday = dateStr === todayStr
          const weekday = (firstDay + day - 1) % 7

          return (
            <button
              key={dateStr}
              type="button"
              onClick={() => handleSelectDay(day)}
              className="flex items-center justify-center rounded-full text-sm font-bold transition-all duration-150 mx-auto"
              style={{
                width: '34px',
                height: '34px',
                backgroundColor: isSelected
                  ? '#e1c614'
                  : isToday
                  ? 'rgba(225,198,20,0.3)'
                  : 'transparent',
                color: isSelected
                  ? '#1a1a1a'
                  : weekday === 0
                  ? '#e55'
                  : weekday === 6
                  ? '#46a'
                  : '#1a1a1a',
                border: isToday && !isSelected ? '2px solid #e1c614' : '2px solid transparent',
              }}
            >
              {day}
            </button>
          )
        })}
      </div>

      {/* 選択中の日付表示 */}
      <div className="mt-3 text-center">
        <span className="text-xs text-black/60">選択中: </span>
        <span className="text-sm font-bold text-black">
          {selected ? formatDateJP(selected) : '未選択'}
        </span>
      </div>
    </div>
  )
}

// =====================================================
// 削除確認モーダルコンポーネント
// =====================================================
function DeleteConfirmModal({
  date,
  onConfirm,
  onCancel,
}: {
  date: string
  onConfirm: () => void
  onCancel: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 shadow-2xl"
        style={{ backgroundColor: '#f5f5f0' }}
      >
        {/* アイコン */}
        <div className="text-center mb-4">
          <span className="text-4xl">🗑️</span>
        </div>
        {/* タイトル */}
        <h2 className="text-center text-lg font-extrabold text-gray-900 mb-2">
          データを削除しますか？
        </h2>
        {/* 説明 */}
        <p className="text-center text-sm text-gray-600 mb-6">
          <span className="font-bold text-gray-900">{formatDateJP(date)}</span>{' '}
          のシュート記録をすべて削除します。
          <br />
          <span className="text-red-500 font-bold">この操作は元に戻せません。</span>
        </p>
        {/* ボタン */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 rounded-xl font-bold text-gray-700 transition-colors"
            style={{ backgroundColor: '#e0e0e0' }}
          >
            キャンセル
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-3 rounded-xl font-bold text-white transition-colors"
            style={{ backgroundColor: '#e55' }}
          >
            削除する
          </button>
        </div>
      </div>
    </div>
  )
}

export default function RecordPage() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)

  // エントリ配列：各要素に一意の id を付与して入力の独立性を保証する
  // key={entry.id} を使用することで、index ベースの key による入力連動バグを防ぐ
  const [entries, setEntries] = useState<ShotEntry[]>([emptyEntry()])

  const [loading, setLoading] = useState(false)
  const [loadingExisting, setLoadingExisting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [error, setError] = useState('')

  // ========== v9: 既存データ管理のための State ==========
  // 選択した日に既存レコードが存在するかどうか
  const [hasExistingData, setHasExistingData] = useState(false)
  // 既存レコードの一覧（画面表示 + 修正・削除で使用）
  const [existingRecords, setExistingRecords] = useState<ExistingRecord[]>([])
  // 既存データパネルを展開して表示するかどうか
  const [showExistingRecords, setShowExistingRecords] = useState(false)
  // 削除確認モーダルの表示フラグ
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  // 削除・修正の処理中フラグ
  const [actionLoading, setActionLoading] = useState(false)

  // エリアをカテゴリ別にグループ化（レンダリング前に計算）
  const areasByCategory = SHOT_AREAS.reduce<Record<string, typeof SHOT_AREAS[number][]>>(
    (acc, area) => {
      if (!acc[area.category]) acc[area.category] = []
      acc[area.category].push(area)
      return acc
    },
    {}
  )

  // 日付が変わったとき、その日の既存データを取得する
  // v9: 既存データが見つかっても「修正モード」には切り替えず、追記フォームを常に表示する
  const fetchExistingData = useCallback(async (targetDate: string) => {
    setLoadingExisting(true)
    setError('')
    setHasExistingData(false)
    setExistingRecords([])
    setShowExistingRecords(false)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setLoadingExisting(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('shooting_records')
      .select('id, area_name, successes, attempts')
      .eq('user_id', user.id)
      .eq('date', targetDate)
      .order('id', { ascending: true })

    setLoadingExisting(false)

    if (fetchError) {
      // 取得エラーは無視してフォームをリセット
      setEntries([emptyEntry()])
      return
    }

    if (data && data.length > 0) {
      // 既存データが見つかった場合：件数を通知し、追記フォームはリセット
      setHasExistingData(true)
      setExistingRecords(
        data.map((r) => ({
          record_id: r.id,
          area_name: r.area_name,
          successes: r.successes,
          attempts: r.attempts,
        }))
      )
      // 追記フォームは空の状態でスタート（1日の制限なし = 何度でも追記可能）
      setEntries([emptyEntry()])
    } else {
      // 既存データなし：フォームをリセット（1枠から開始）
      setEntries([emptyEntry()])
      setHasExistingData(false)
      setExistingRecords([])
    }
  }, [])

  // 日付変更時に既存データを取得
  const handleDateChange = useCallback(
    (newDate: string) => {
      setDate(newDate)
      setSuccessMsg('')
      fetchExistingData(newDate)
    },
    [fetchExistingData]
  )

  // 初回レンダリング時に今日のデータを取得
  useEffect(() => {
    fetchExistingData(today)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // エントリを追加（1回の送信は最大10セットまで）
  const addEntry = () => {
    if (entries.length < MAX_ENTRIES) {
      // スプレッドで新しい配列を生成し、新しいエントリを末尾に追加
      setEntries([...entries, emptyEntry()])
    }
  }

  // エントリを削除（id で特定することで正確に1行だけ削除）
  const removeEntry = (id: string) => {
    if (entries.length > 1) {
      setEntries(entries.filter((entry) => entry.id !== id))
    }
  }

  // 特定の行のフィールドのみを更新する（id で特定して他の行に影響を与えない）
  const updateEntry = (id: string, field: keyof Omit<ShotEntry, 'id'>, value: string) => {
    setEntries((prev) =>
      prev.map((entry) =>
        entry.id === id ? { ...entry, [field]: value } : entry
      )
    )
  }

  // =====================================================
  // v8 継続: 過去データの全削除処理
  // 削除確認モーダルで「削除する」が押されたときに呼ばれる
  // =====================================================
  const handleDelete = async () => {
    setShowDeleteModal(false)
    setError('')
    setSuccessMsg('')
    setActionLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('ログインが必要です。')
      setActionLoading(false)
      return
    }

    // 既存レコードを record_id で特定して削除
    const recordIds = existingRecords.map((r) => r.record_id)
    const { error: deleteError } = await supabase
      .from('shooting_records')
      .delete()
      .in('id', recordIds)

    if (deleteError) {
      setError('削除に失敗しました。もう一度お試しください。')
      setActionLoading(false)
      return
    }

    // 削除完了 → フォームをリセット・既存データを解除
    setSuccessMsg(`🗑️ ${formatDateJP(date)} のデータを削除しました。`)
    setEntries([emptyEntry()])
    setHasExistingData(false)
    setExistingRecords([])
    setShowExistingRecords(false)
    setActionLoading(false)
  }

  // =====================================================
  // 新規追加（追記）処理
  // v9: 1日の制限なし — 既存データの有無にかかわらず insert を実行する
  //     1回の送信に含めるセット数は最大10セットまで（UI制限）
  // =====================================================
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

    // --- 入力済みのエントリのみを抽出（空のセットは送信しない）---
    // エリアが選択されており、かつ成功数が入力されているものだけを対象にする
    const filledEntries = entries.filter(
      (entry) => entry.area_name !== '' && entry.successes !== ''
    )

    if (filledEntries.length === 0) {
      setError('少なくとも1つのエリアと成功数を入力してください。')
      setLoading(false)
      return
    }

    // バリデーション（入力済みエントリのみチェック）
    for (const entry of filledEntries) {
      const suc = parseInt(entry.successes)
      if (isNaN(suc) || suc < 0 || suc > 10) {
        setError('成功数は0〜10の範囲で入力してください。')
        setLoading(false)
        return
      }
    }

    // 選択した日付でレコードを insert（入力済みのエントリのみ、空の枠は除外）
    // v9: 同日に既にデータが存在していても制限なく追記可能
    const records = filledEntries.map((entry) => ({
      user_id: user.id,
      date,                              // カレンダーで選択した日付を使用
      area_name: entry.area_name,
      attempts: 10,                      // 10本単位固定
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

    // 保存後、その日のデータを再取得して既存データ表示を最新状態に更新
    fetchExistingData(date)
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <h1 className="text-xl font-extrabold text-black mb-1">✏️ シュート記録</h1>
      <p className="text-sm text-black/70 mb-4">日付を選んで記録しよう！</p>

      {/* 成功メッセージ */}
      {successMsg && (
        <div
          className="mb-4 p-4 rounded-2xl text-center font-bold text-gray-900 shadow-lg"
          style={{ backgroundColor: '#e1c614' }}
        >
          {successMsg}
        </div>
      )}

      {/* 削除確認モーダル */}
      {showDeleteModal && (
        <DeleteConfirmModal
          date={date}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* インラインカレンダー */}
        <div>
          <label className="block text-sm font-medium text-black mb-2">📅 実施日を選択</label>
          <InlineCalendar selected={date} onChange={handleDateChange} />
        </div>

        {/* 既存データの読み込み中インジケーター */}
        {loadingExisting && (
          <div
            className="rounded-xl p-3 text-sm text-black/70 text-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
          >
            データを確認中...
          </div>
        )}

        {/* =====================================================
            v9: 既存データパネル
            既存データが存在する日に表示。削除ボタンも含む。
            折りたたみ可能で、詳細一覧と削除機能を提供する。
            ===================================================== */}
        {!loadingExisting && hasExistingData && (
          <div
            className="rounded-xl p-4"
            style={{ backgroundColor: 'rgba(225,198,20,0.2)', border: '1px solid rgba(225,198,20,0.5)' }}
          >
            {/* ヘッダー行：件数と展開ボタン */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-black">
                📋 この日には {existingRecords.length} 件の記録があります
              </span>
              <button
                type="button"
                onClick={() => setShowExistingRecords(!showExistingRecords)}
                className="text-xs font-bold text-black/70 underline"
              >
                {showExistingRecords ? '閉じる' : '一覧を見る'}
              </button>
            </div>

            {/* 既存データ一覧（展開時のみ表示） */}
            {showExistingRecords && (
              <div className="mt-3 space-y-1">
                {existingRecords.map((rec, idx) => (
                  <div
                    key={rec.record_id}
                    className="flex items-center justify-between rounded-lg px-3 py-2 text-sm"
                    style={{ backgroundColor: 'rgba(255,255,255,0.4)' }}
                  >
                    <span className="text-black/70 text-xs mr-2">{idx + 1}.</span>
                    <span className="flex-1 text-black font-medium text-xs">{rec.area_name}</span>
                    <span className="text-black font-bold text-xs">
                      {rec.successes} / {rec.attempts} 本
                    </span>
                  </div>
                ))}

                {/* 全削除ボタン */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={actionLoading}
                    className="w-full py-2 rounded-xl font-bold text-white text-sm transition-all duration-200 disabled:opacity-60"
                    style={{ backgroundColor: 'rgba(220,50,50,0.85)' }}
                  >
                    {actionLoading ? '処理中...' : `🗑️ ${formatDateJP(date)} の記録をすべて削除`}
                  </button>
                  <p className="text-xs text-black/50 text-center mt-1">
                    ※ 削除後は新規入力フォームから再入力できます
                  </p>
                </div>
              </div>
            )}

            {/* 追記を促すメッセージ */}
            {!showExistingRecords && (
              <p className="text-xs text-black/60 mt-1">
                下のフォームから新しいセットを追記できます（1日の記録に制限はありません）
              </p>
            )}
          </div>
        )}

        {/* エントリフォーム（key に entry.id を使用して各セットの独立性を保証）*/}
        {entries.map((entry, idx) => (
          <div
            key={entry.id}  // index ではなく一意 ID を key に使用（入力連動バグ防止）
            className="rounded-2xl p-4 shadow"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-black font-bold text-sm">エリア {idx + 1}</span>
              {entries.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeEntry(entry.id)}
                  className="text-xs text-black/60 hover:text-red-300 transition-colors"
                >
                  ✕ 削除
                </button>
              )}
            </div>

            {/* エリア選択 */}
            <div className="mb-3">
              <label className="block text-xs text-black/80 mb-1">エリア選択</label>
              <select
                value={entry.area_name}
                onChange={(e) => updateEntry(entry.id, 'area_name', e.target.value)}
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
              <label className="block text-xs text-black/80 mb-1">
                10本中 何本入った？
              </label>
              <div className="grid grid-cols-6 gap-1">
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => updateEntry(entry.id, 'successes', String(n))}
                    className="rounded-lg py-2 text-sm font-bold transition-all duration-150"
                    style={{
                      backgroundColor:
                        entry.successes === String(n) ? '#e1c614' : 'rgba(255,255,255,0.3)',
                      color: '#1a1a1a',
                    }}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* エリア追加ボタン（1回の送信は最大10セットまで） */}
        {entries.length < MAX_ENTRIES && (
          <button
            type="button"
            onClick={addEntry}
            className="w-full py-3 rounded-xl border-2 border-dashed text-black/70 hover:text-black hover:border-black transition-colors text-sm font-medium"
          >
            ＋ エリアを追加（1回最大{MAX_ENTRIES}エリア）
          </button>
        )}

        {/* エラーメッセージ */}
        {error && (
          <p className="text-red-300 text-sm text-center">{error}</p>
        )}

        {/* =====================================================
            v9: 登録ボタン
            既存データの有無にかかわらず常に「追記（新規登録）」ボタンを表示する。
            1日の合計セット数制限なし。1回の送信は最大10セットまで。
            ===================================================== */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-4 rounded-2xl font-extrabold text-gray-900 text-lg transition-all duration-200 disabled:opacity-60 shadow-lg"
          style={{ backgroundColor: '#e1c614' }}
        >
          {loading
            ? '登録中...'
            : hasExistingData
            ? `🏀 ${formatDateJP(date)} に追記する！`
            : `🏀 ${formatDateJP(date)} の記録を登録！`}
        </button>

        {/* 1日無制限の説明テキスト */}
        {hasExistingData && (
          <p className="text-center text-xs text-black/50">
            ※ 1日に何度でも追記できます（1回の送信は最大{MAX_ENTRIES}セットまで）
          </p>
        )}
      </form>
    </div>
  )
}
