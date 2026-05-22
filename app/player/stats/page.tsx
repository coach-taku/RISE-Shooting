'use client'

// P-03: 個人データ閲覧・期間集計画面
// ショットチャート（ヒートマップ）とエリア別サマリーを表示

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SHOT_AREAS, DATE_FILTERS } from '@/lib/constants'
import { ZoneData, ShootingRecord } from '@/lib/types'
import ShotChart from '@/components/ShotChart'
import Link from 'next/link'

type DateFilter = 'today' | 'week' | 'month' | 'all' | 'custom'

// 期間フィルターから日付範囲を計算
function getDateRange(filter: DateFilter, customStart?: string, customEnd?: string) {
  const today = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  switch (filter) {
    case 'today':
      return { start: fmt(today), end: fmt(today) }
    case 'week': {
      const start = new Date(today)
      start.setDate(today.getDate() - today.getDay())
      return { start: fmt(start), end: fmt(today) }
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1)
      return { start: fmt(start), end: fmt(today) }
    }
    case 'custom':
      return { start: customStart || fmt(today), end: customEnd || fmt(today) }
    default:
      return { start: '2020-01-01', end: fmt(today) }
  }
}

// ShootingRecord[] からエリア別集計 ZoneData[] を作成
function aggregateZoneData(records: ShootingRecord[]): ZoneData[] {
  const map = new Map<string, { attempts: number; successes: number }>()

  records.forEach((r) => {
    const cur = map.get(r.area_name) || { attempts: 0, successes: 0 }
    map.set(r.area_name, {
      attempts: cur.attempts + r.attempts,
      successes: cur.successes + r.successes,
    })
  })

  return SHOT_AREAS.map((area) => {
    const agg = map.get(area.value) || { attempts: 0, successes: 0 }
    return {
      zone: area.zone,
      area_name: area.value,
      label: area.label,
      attempts: agg.attempts,
      successes: agg.successes,
      percentage: agg.attempts > 0 ? (agg.successes / agg.attempts) * 100 : 0,
      category: area.category,
    }
  })
}

export default function StatsPage() {
  const [filter, setFilter] = useState<DateFilter>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [records, setRecords] = useState<ShootingRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [username, setUsername] = useState('')

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // ユーザー名取得
    const { data: profile } = await supabase
      .from('profiles')
      .select('username')
      .eq('id', user.id)
      .single()
    if (profile) setUsername(profile.username)

    const { start, end } = getDateRange(filter, customStart, customEnd)

    const { data } = await supabase
      .from('shooting_records')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', start)
      .lte('date', end)
      .order('date', { ascending: false })

    setRecords(data ?? [])
    setLoading(false)
  }, [filter, customStart, customEnd])

  useEffect(() => { fetchRecords() }, [fetchRecords]) // eslint-disable-line

  const zoneData = aggregateZoneData(records)

  // サマリー計算
  const totalAttempts = records.reduce((s, r) => s + r.attempts, 0)
  const totalSuccesses = records.reduce((s, r) => s + r.successes, 0)
  const overallPct = totalAttempts > 0 ? ((totalSuccesses / totalAttempts) * 100).toFixed(1) : '-'

  const threePointRecords = records.filter((r) => r.area_name.startsWith('3P_'))
  const twoPointRecords = records.filter((r) => r.area_name.startsWith('2P_'))
  // FT（フリースロー）の集計
  const ftRecords = records.filter((r) => r.area_name.startsWith('FT_'))
  const threePAttempts = threePointRecords.reduce((s, r) => s + r.attempts, 0)
  const threePSuccess = threePointRecords.reduce((s, r) => s + r.successes, 0)
  const twoPAttempts = twoPointRecords.reduce((s, r) => s + r.attempts, 0)
  const twoPSuccess = twoPointRecords.reduce((s, r) => s + r.successes, 0)
  const ftAttempts = ftRecords.reduce((s, r) => s + r.attempts, 0)
  const ftSuccess = ftRecords.reduce((s, r) => s + r.successes, 0)

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-extrabold text-black">📊 マイ記録</h1>
          <p className="text-sm text-black/70">{username} のショットチャート</p>
        </div>
        <Link
          href="/player/record"
          className="px-4 py-2 rounded-xl font-bold text-sm text-gray-900"
          style={{ backgroundColor: '#e1c614' }}
        >
          ✏️ 記録
        </Link>
      </div>

      {/* 期間フィルター */}
      <div className="mb-4">
        <div className="flex gap-1 flex-wrap">
          {DATE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as DateFilter)}
              className="px-3 py-1.5 rounded-full text-xs font-bold transition-all"
              style={{
                backgroundColor: filter === f.value ? '#e1c614' : 'rgba(255,255,255,0.2)',
                color: filter === f.value ? '#1a1a1a' : '#1a1a1a',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* カスタム期間 */}
        {filter === 'custom' && (
          <div className="mt-2 flex gap-2">
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="flex-1 rounded-lg px-2 py-1 text-xs bg-white text-gray-800"
            />
            <span className="text-black text-xs self-center">〜</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="flex-1 rounded-lg px-2 py-1 text-xs bg-white text-gray-800"
            />
          </div>
        )}
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-2 mb-2">
        {[
          { label: 'FG%', value: `${overallPct}%`, sub: `${totalSuccesses}/${totalAttempts}` },
          { label: '3P%', value: threePAttempts > 0 ? `${((threePSuccess / threePAttempts) * 100).toFixed(1)}%` : '-', sub: `${threePSuccess}/${threePAttempts}` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <p className="text-xs text-black/70">{item.label}</p>
            <p className="text-xl font-extrabold" style={{ color: '#1e3a8a' }}>{item.value}</p>
            <p className="text-xs text-black/60">{item.sub}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        {[
          { label: '2P%', value: twoPAttempts > 0 ? `${((twoPSuccess / twoPAttempts) * 100).toFixed(1)}%` : '-', sub: `${twoPSuccess}/${twoPAttempts}` },
          { label: 'FT%', value: ftAttempts > 0 ? `${((ftSuccess / ftAttempts) * 100).toFixed(1)}%` : '-', sub: `${ftSuccess}/${ftAttempts}` },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-xl p-3 text-center"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <p className="text-xs text-black/70">{item.label}</p>
            <p className="text-xl font-extrabold" style={{ color: '#1e3a8a' }}>{item.value}</p>
            <p className="text-xs text-black/60">{item.sub}</p>
          </div>
        ))}
      </div>

      {/* ショットチャート */}
      {loading ? (
        <div className="text-center text-black py-10">データを読み込み中...</div>
      ) : totalAttempts === 0 ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}
        >
          <p className="text-4xl mb-3">🏀</p>
          <p className="text-black font-bold">この期間の記録はまだないよ！</p>
          <p className="text-black/60 text-sm mt-1">練習したらすぐ記録しよう 💪</p>
          <Link
            href="/player/record"
            className="inline-block mt-4 px-6 py-2 rounded-xl font-bold text-gray-900 text-sm"
            style={{ backgroundColor: '#e1c614' }}
          >
            記録する →
          </Link>
        </div>
      ) : (
        <>
          <ShotChart zoneData={zoneData} />

          {/* エリア別一覧テーブル */}
          <div className="mt-4 rounded-2xl overflow-hidden shadow" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
            <div className="px-4 py-3 font-bold text-black text-sm" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
              エリア別スタッツ
            </div>
            <div className="divide-y divide-white/10">
              {zoneData
                .filter((z) => z.attempts > 0)
                .sort((a, b) => b.percentage - a.percentage)
                .map((z) => (
                  <div key={z.area_name} className="flex items-center px-4 py-2">
                    <span className="text-xs text-black/70 flex-1">{z.label}</span>
                    <span className="text-xs text-black/60 mr-3">{z.successes}/{z.attempts}</span>
                    <span
                      className="text-sm font-bold w-12 text-right"
                      style={{ color: '#1e3a8a' }}
                    >
                      {z.percentage.toFixed(0)}%
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
