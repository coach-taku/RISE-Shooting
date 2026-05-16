'use client'

// バスケットボールコートのショットチャートコンポーネント
// SVGでコートを描画し、ゾーンごとに成功率に応じた色でヒートマップ表示

import { SHOT_AREAS } from '@/lib/constants'
import { ZoneData } from '@/lib/types'

interface ShotChartProps {
  zoneData: ZoneData[]
}

// 成功率に応じた色を返す（ヒートマップ）
function getZoneColor(percentage: number, hasData: boolean): string {
  if (!hasData) return 'rgba(255,255,255,0.1)'
  if (percentage >= 70) return 'rgba(225, 198, 20, 0.85)'  // 高い：ゴールド
  if (percentage >= 50) return 'rgba(34, 197, 94, 0.75)'   // 中程度：グリーン
  if (percentage >= 30) return 'rgba(251, 146, 60, 0.75)'  // 低め：オレンジ
  return 'rgba(239, 68, 68, 0.75)'                          // 低い：レッド
}

// ゾーン名から ZoneData を検索
function findZone(zoneData: ZoneData[], zone: string): ZoneData | undefined {
  const area = SHOT_AREAS.find((a) => a.zone === zone)
  if (!area) return undefined
  return zoneData.find((z) => z.area_name === area.value)
}

export default function ShotChart({ zoneData }: ShotChartProps) {
  const getZoneInfo = (zone: string) => {
    const data = findZone(zoneData, zone)
    const hasData = !!data && data.attempts > 0
    return {
      data,
      hasData,
      color: getZoneColor(data?.percentage ?? 0, hasData),
      label: hasData
        ? `${data!.successes}/${data!.attempts}\n${data!.percentage.toFixed(0)}%`
        : '-',
      pct: hasData ? `${data!.percentage.toFixed(0)}%` : '-',
      made: hasData ? `${data!.successes}/${data!.attempts}` : '-',
    }
  }

  // 各ゾーンのデータ
  const zones = {
    corner_left: getZoneInfo('corner_left'),
    wing_left: getZoneInfo('wing_left'),
    top: getZoneInfo('top'),
    wing_right: getZoneInfo('wing_right'),
    corner_right: getZoneInfo('corner_right'),
    short_corner_left: getZoneInfo('short_corner_left'),
    mid_left: getZoneInfo('mid_left'),
    mid_top: getZoneInfo('mid_top'),
    mid_right: getZoneInfo('mid_right'),
    short_corner_right: getZoneInfo('short_corner_right'),
    paint_center: getZoneInfo('paint_center'),
    under_goal: getZoneInfo('under_goal'),
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      {/* SVGコート */}
      <svg
        viewBox="0 0 300 280"
        className="w-full rounded-2xl shadow-lg"
        style={{ backgroundColor: '#2d5a27' }}
      >
        {/* コートアウトライン */}
        <rect x="10" y="10" width="280" height="260" rx="8" fill="none" stroke="#4a7c3f" strokeWidth="1.5" />

        {/* ゴール */}
        <circle cx="150" cy="30" r="8" fill="none" stroke="#e1c614" strokeWidth="2" />
        <circle cx="150" cy="30" r="3" fill="#e1c614" />
        <line x1="150" y1="38" x2="150" y2="48" stroke="#e1c614" strokeWidth="1.5" />

        {/* ペイントエリア（長方形） */}
        <rect x="100" y="10" width="100" height="80" fill="rgba(255,255,255,0.05)" stroke="#4a7c3f" strokeWidth="1" />

        {/* 制限区域（リストリクテッドエリア） */}
        <path d="M 120 90 A 30 30 0 0 1 180 90" fill="none" stroke="#4a7c3f" strokeWidth="1" />

        {/* フリースローライン */}
        <line x1="100" y1="90" x2="200" y2="90" stroke="#4a7c3f" strokeWidth="1" />
        <circle cx="150" cy="90" r="30" fill="none" stroke="#4a7c3f" strokeWidth="1" />

        {/* ===================== ゾーン描画 ===================== */}

        {/* ゴール下 */}
        <rect x="120" y="10" width="60" height="40" rx="4" fill={zones.under_goal.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="150" y="24" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.under_goal.pct}</text>
        <text x="150" y="32" textAnchor="middle" fontSize="4" fill="white">{zones.under_goal.made}</text>
        <text x="150" y="39" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">ゴール下</text>

        {/* ペイント中央 */}
        <rect x="100" y="50" width="100" height="40" rx="2" fill={zones.paint_center.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="150" y="62" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.paint_center.pct}</text>
        <text x="150" y="70" textAnchor="middle" fontSize="4" fill="white">{zones.paint_center.made}</text>
        <text x="150" y="78" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">ペイント中央</text>

        {/* ===== ミドルレンジ（フリースローライン〜3Pライン付近） ===== */}

        {/* 左ショートコーナー */}
        <rect x="10" y="55" width="90" height="55" rx="2" fill={zones.short_corner_left.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="55" y="77" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.short_corner_left.pct}</text>
        <text x="55" y="85" textAnchor="middle" fontSize="4" fill="white">{zones.short_corner_left.made}</text>
        <text x="55" y="93" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">左SCｮ</text>

        {/* 左ミドル */}
        <path d="M 10 110 L 100 110 L 100 90 A 65 65 0 0 0 10 150 Z" fill={zones.mid_left.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="45" y="120" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.mid_left.pct}</text>
        <text x="45" y="128" textAnchor="middle" fontSize="4" fill="white">{zones.mid_left.made}</text>
        <text x="45" y="136" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">左ミドル</text>

        {/* トップミドル */}
        <path d="M 100 90 A 65 65 0 0 1 200 90 L 200 90 Q 150 155 100 90 Z" fill={zones.mid_top.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="150" y="118" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.mid_top.pct}</text>
        <text x="150" y="126" textAnchor="middle" fontSize="4" fill="white">{zones.mid_top.made}</text>
        <text x="150" y="134" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">トップミドル</text>

        {/* 右ミドル */}
        <path d="M 200 110 L 290 110 L 290 150 A 65 65 0 0 0 200 90 Z" fill={zones.mid_right.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="255" y="120" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.mid_right.pct}</text>
        <text x="255" y="128" textAnchor="middle" fontSize="4" fill="white">{zones.mid_right.made}</text>
        <text x="255" y="136" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">右ミドル</text>

        {/* 右ショートコーナー */}
        <rect x="200" y="55" width="90" height="55" rx="2" fill={zones.short_corner_right.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="245" y="77" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.short_corner_right.pct}</text>
        <text x="245" y="85" textAnchor="middle" fontSize="4" fill="white">{zones.short_corner_right.made}</text>
        <text x="245" y="93" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">右SCｮ</text>

        {/* ===== 3ポイントエリア ===== */}

        {/* 左コーナー（3P） */}
        <rect x="10" y="10" width="90" height="45" rx="2" fill={zones.corner_left.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="55" y="27" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.corner_left.pct}</text>
        <text x="55" y="35" textAnchor="middle" fontSize="4" fill="white">{zones.corner_left.made}</text>
        <text x="55" y="43" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">左コーナー3P</text>

        {/* 左ウイング（3P） */}
        <path d="M 10 150 A 65 65 0 0 1 10 110 L 10 150 Z M 10 110 Q 35 155 70 170 L 10 200 L 10 150 Z" fill={zones.wing_left.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="30" y="162" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.wing_left.pct}</text>
        <text x="30" y="170" textAnchor="middle" fontSize="4" fill="white">{zones.wing_left.made}</text>
        <text x="30" y="178" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">左ウイング</text>

        {/* トップ（3P） */}
        <path d="M 10 150 A 195 195 0 0 1 290 150 L 290 200 Q 150 140 10 200 Z" fill={zones.top.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="150" y="168" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.top.pct}</text>
        <text x="150" y="176" textAnchor="middle" fontSize="4" fill="white">{zones.top.made}</text>
        <text x="150" y="184" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">トップ3P</text>

        {/* 右ウイング（3P） */}
        <path d="M 290 110 A 65 65 0 0 1 290 150 L 290 200 Q 265 155 230 170 L 290 200 Z" fill={zones.wing_right.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="265" y="162" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.wing_right.pct}</text>
        <text x="265" y="170" textAnchor="middle" fontSize="4" fill="white">{zones.wing_right.made}</text>
        <text x="265" y="178" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">右ウイング</text>

        {/* 右コーナー（3P） */}
        <rect x="200" y="10" width="90" height="45" rx="2" fill={zones.corner_right.color} stroke="rgba(255,255,255,0.2)" strokeWidth="0.5" />
        <text x="245" y="27" textAnchor="middle" fontSize="5" fill="white" fontWeight="bold">{zones.corner_right.pct}</text>
        <text x="245" y="35" textAnchor="middle" fontSize="4" fill="white">{zones.corner_right.made}</text>
        <text x="245" y="43" textAnchor="middle" fontSize="4" fill="rgba(255,255,255,0.7)">右コーナー3P</text>

        {/* バックコート（3Pアーク外の残り） */}
        <rect x="10" y="200" width="280" height="70" rx="4" fill="rgba(0,0,0,0.2)" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5" />
        <text x="150" y="240" textAnchor="middle" fontSize="7" fill="rgba(255,255,255,0.3)">RISE SHOOTING</text>

        {/* 凡例 */}
        <text x="15" y="258" fontSize="5" fill="rgba(255,255,255,0.5)">● ゴールド: 70%+</text>
        <text x="15" y="265" fontSize="5" fill="rgba(255,255,255,0.5)">● 緑: 50-69%</text>
        <text x="120" y="258" fontSize="5" fill="rgba(255,255,255,0.5)">● 橙: 30-49%</text>
        <text x="120" y="265" fontSize="5" fill="rgba(255,255,255,0.5)">● 赤: 0-29%</text>

        {/* 凡例の丸 */}
        <circle cx="12" cy="257" r="2.5" fill="rgba(225,198,20,0.85)" />
        <circle cx="12" cy="264" r="2.5" fill="rgba(34,197,94,0.75)" />
        <circle cx="117" cy="257" r="2.5" fill="rgba(251,146,60,0.75)" />
        <circle cx="117" cy="264" r="2.5" fill="rgba(239,68,68,0.75)" />
      </svg>
    </div>
  )
}
