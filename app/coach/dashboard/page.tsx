'use client'

// M-01: コーチ用ダッシュボード画面
// 努力量ランキング（総試投数）、エリア別トップスタッツ、選手別詳細データ

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { SHOT_AREAS } from '@/lib/constants'
import { Profile, ShootingRecord } from '@/lib/types'

// -----------------------------------------------
// 努力量ランキング用の型
// get_player_effort_ranking RPC が返すデータ型
// -----------------------------------------------
interface EffortRankingRow {
  user_id: string
  username: string
  total_attempts: number
  total_successes: number
  record_count: number
}

interface PlayerStat {
  userId: string
  username: string
  totalAttempts: number
  totalSuccesses: number
  percentage: number
  recordCount: number
}

interface AreaTopStat {
  area_name: string
  label: string
  topPlayer: string
  percentage: number
  attempts: number
  successes: number
}

export default function CoachDashboard() {
  const [playerStats, setPlayerStats] = useState<PlayerStat[]>([])
  const [areaTopStats, setAreaTopStats] = useState<AreaTopStat[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [playerRecords, setPlayerRecords] = useState<ShootingRecord[]>([])
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient()

      // -----------------------------------------------
      // 努力量ランキング: RPCで DB 側集計 (v11修正)
      // 従来のフロント側全件取得方式を廃止。
      // get_player_effort_ranking() RPC を呼び出してサーバー側で
      // 全レコードを集計した結果を取得する。
      // これにより Supabase のデフォルト1,000件取得上限の影響を受けず、
      // 全期間の正確な総試投数を表示できる。
      // -----------------------------------------------
      const { data: effortRanking, error: rpcError } = await supabase
        .rpc('get_player_effort_ranking')

      if (rpcError) {
        console.error('努力量ランキングRPCエラー:', rpcError)
      }

      // RPC の結果を PlayerStat 形式に変換
      const stats: PlayerStat[] = (effortRanking as EffortRankingRow[] ?? []).map((row) => ({
        userId: row.user_id,
        username: row.username,
        totalAttempts: Number(row.total_attempts),
        totalSuccesses: Number(row.total_successes),
        percentage:
          Number(row.total_attempts) > 0
            ? (Number(row.total_successes) / Number(row.total_attempts)) * 100
            : 0,
        recordCount: Number(row.record_count),
      }))

      // RPC がすでに total_attempts 降順でソート済みだが念のため
      stats.sort((a, b) => b.totalAttempts - a.totalAttempts)
      setPlayerStats(stats)

      // -----------------------------------------------
      // エリア別トップスタッツ:
      // 全選手プロフィール + 全シューティング記録をフロントで集計する。
      // ※ エリア別集計は今回の修正対象外のため既存ロジックを維持。
      // -----------------------------------------------
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'player')
        .order('username')

      // エリア別集計用にレコードを全件取得（既存ロジック）
      const { data: records } = await supabase
        .from('shooting_records')
        .select('*')
        .order('date', { ascending: false })

      if (profiles && records) {
        // エリア別トップスタッツ集計
        // 【選出基準】各エリアにおいて、全セットの記録を合算した累計試投数に対する
        // 累計成功数の割合（成功確率）が最も高い選手をNo.1として選出する。
        // ※ 最低50本以上シュートを打っている選手のみを対象とする（少試投数による100%等の誤選出防止）
        const areaStats: AreaTopStat[] = SHOT_AREAS.map((area) => {
          const playerAreaStats = profiles.map((profile: Profile) => {
            const areaRecs = records.filter(
              (r: ShootingRecord) => r.user_id === profile.id && r.area_name === area.value
            )
            const totalAttempts = areaRecs.reduce((s: number, r: ShootingRecord) => s + r.attempts, 0)
            const totalSuccesses = areaRecs.reduce((s: number, r: ShootingRecord) => s + r.successes, 0)
            return {
              profile,
              attempts: totalAttempts,
              successes: totalSuccesses,
              percentage: totalAttempts > 0 ? (totalSuccesses / totalAttempts) * 100 : 0,
            }
          }).filter((p) => p.attempts >= 50)

          const top = playerAreaStats.sort((a, b) => b.percentage - a.percentage)[0]

          return {
            area_name: area.value,
            label: area.label,
            topPlayer: top ? top.profile.username : '-',
            percentage: top ? top.percentage : 0,
            attempts: top ? top.attempts : 0,
            successes: top ? top.successes : 0,
          }
        }).filter((a) => a.topPlayer !== '-')

        setAreaTopStats(areaStats)
      }

      setLoading(false)
    }

    fetchData()
  }, [])

  // 選手詳細データ取得（直近50件制限は既存仕様のまま維持）
  const fetchPlayerDetail = async (userId: string, username: string) => {
    if (selectedPlayerId === userId) {
      setSelectedPlayerId(null)
      setPlayerRecords([])
      return
    }
    setSelectedPlayerId(userId)
    setLoadingDetail(true)

    const supabase = createClient()
    const { data } = await supabase
      .from('shooting_records')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(50)

    setPlayerRecords(data ?? [])
    setLoadingDetail(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-black">データを読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-extrabold text-black mb-1">📋 コーチダッシュボード</h1>
      <p className="text-black/70 text-sm mb-6">チーム全体のシューティング状況</p>

      {/* ===== 努力量ランキング ===== */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-black mb-3">🔥 努力量ランキング（総試投数）</h2>
        <div className="rounded-2xl overflow-hidden shadow-lg" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}>
          {playerStats.length === 0 ? (
            <p className="text-black/60 p-6 text-center">まだ記録がありません</p>
          ) : (
            <div className="divide-y divide-white/10">
              {playerStats.map((stat, idx) => (
                <div key={stat.userId}>
                  <button
                    className="w-full flex items-center px-4 py-3 text-left hover:bg-white/10 transition-colors"
                    onClick={() => fetchPlayerDetail(stat.userId, stat.username)}
                  >
                    {/* 順位 */}
                    <span
                      className="w-7 h-7 flex items-center justify-center rounded-full text-xs font-bold mr-3 flex-shrink-0"
                      style={{
                        backgroundColor: idx === 0 ? '#e1c614' : idx === 1 ? '#c0c0bf' : idx === 2 ? '#cd7f32' : 'rgba(255,255,255,0.15)',
                        color: idx < 3 ? '#1a1a1a' : '#ffffff',
                      }}
                    >
                      {idx + 1}
                    </span>

                    {/* 選手名 */}
                    <span className="text-black font-bold flex-1">{stat.username}</span>

                    {/* スタッツ */}
                    <div className="text-right">
                      <p className="text-black font-bold">{stat.totalAttempts}<span className="text-xs text-black/60 ml-1">本</span></p>
                      <p className="text-xs text-black/60">{stat.totalSuccesses}成功 / {stat.percentage.toFixed(1)}%</p>
                    </div>

                    <span className="ml-2 text-black/40 text-sm">
                      {selectedPlayerId === stat.userId ? '▲' : '▼'}
                    </span>
                  </button>

                  {/* 選手詳細（展開表示） */}
                  {selectedPlayerId === stat.userId && (
                    <div className="px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>
                      {loadingDetail ? (
                        <p className="text-black/60 text-sm">読み込み中...</p>
                      ) : playerRecords.length === 0 ? (
                        <p className="text-black/60 text-sm">記録がありません</p>
                      ) : (
                        <>
                          <p className="text-black/70 text-xs mb-2">直近の記録（最大50件）</p>
                          <div className="space-y-1 max-h-48 overflow-y-auto">
                            {playerRecords.map((rec) => (
                              <div key={rec.id} className="flex items-center text-xs">
                                <span className="text-black/50 w-20 flex-shrink-0">{rec.date}</span>
                                <span className="text-black/80 flex-1">{rec.area_name.replace(/^(3P|2P|FT)_/, '')}</span>
                                <span className="text-black">{rec.successes}/{rec.attempts}</span>
                                <span className="text-blue-900 w-12 text-right">
                                  {((rec.successes / rec.attempts) * 100).toFixed(0)}%
                                </span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ===== エリア別トップスタッツ ===== */}
      <section>
        <h2 className="text-lg font-bold text-black mb-3">🎯 エリア別 No.1選手</h2>
        {areaTopStats.length === 0 ? (
          <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
            <p className="text-black/60">まだデータが十分ありません（各エリア50本以上必要）</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            {areaTopStats.map((area) => (
              <div
                key={area.area_name}
                className="rounded-xl p-3 flex items-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.12)' }}
              >
                <div className="flex-1">
                  <p className="text-xs text-black/60">{area.label}</p>
                  <p className="text-black font-bold">{area.topPlayer}</p>
                  <p className="text-xs text-black/50">{area.successes}/{area.attempts}</p>
                </div>
                <span className="text-2xl font-extrabold" style={{ color: '#1e3a8a' }}>
                  {area.percentage.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
