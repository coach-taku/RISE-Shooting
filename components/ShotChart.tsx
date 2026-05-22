'use client'

// バスケットボールコートのショットチャートコンポーネント
// 添付画像の区分け（3P×5 / 2Pミドル×5 / 2Pペイント×2）に準拠した SVG 実装
//
// ── viewBox 0 0 300 280, コート x=10~290(W=280), y=10~270(H=260) ──
// halfcourt 2.html 比率をコート幅 280 に適用:
//   3P半円中心  : (150, 66),  r=112
//   FT半円中心  : (150, 122), r=39.2
//   ペイント    : x=101~199,  y=10~122
//   ペイント区切: y=58  (ゴール下 / Paint 境界)
//   コーナー縦線: x=38 / 262
//   Elbow斜め線 : (101,122)→(67,142) / (199,122)→(233,142)

import { SHOT_AREAS } from '@/lib/constants'
import { ZoneData } from '@/lib/types'

interface ShotChartProps {
  zoneData: ZoneData[]
}

// 成功率 → ヒートマップ色
function getZoneColor(percentage: number, hasData: boolean): string {
  if (!hasData) return 'rgba(255,255,255,0.08)'
  if (percentage >= 70) return 'rgba(225,198,20,0.85)'   // ゴールド
  if (percentage >= 50) return 'rgba(34,197,94,0.75)'    // グリーン
  if (percentage >= 30) return 'rgba(251,146,60,0.75)'   // オレンジ
  return 'rgba(239,68,68,0.75)'                           // レッド
}

function findZone(zoneData: ZoneData[], zone: string): ZoneData | undefined {
  const area = SHOT_AREAS.find((a) => a.zone === zone)
  if (!area) return undefined
  return zoneData.find((z) => z.area_name === area.value)
}

// FT（フリースロー）データを取得
function findFTZone(zoneData: ZoneData[]): ZoneData | undefined {
  return zoneData.find((z) => z.area_name === 'FT_フリースロー')
}

export default function ShotChart({ zoneData }: ShotChartProps) {
  const getZoneInfo = (zone: string) => {
    const data = findZone(zoneData, zone)
    const hasData = !!data && data.attempts > 0
    return {
      color: getZoneColor(data?.percentage ?? 0, hasData),
      pct:   hasData ? `${data!.percentage.toFixed(0)}%` : '-',
      made:  hasData ? `${data!.successes}/${data!.attempts}` : '',
    }
  }

  // FTデータ
  const ftData = findFTZone(zoneData)
  const ftHasData = !!ftData && ftData.attempts > 0
  const ftColor = getZoneColor(ftData?.percentage ?? 0, ftHasData)
  const ftPct = ftHasData ? `${ftData!.percentage.toFixed(0)}%` : '-'
  const ftMade = ftHasData ? `${ftData!.successes}/${ftData!.attempts}` : ''

  const z = {
    corner_left:        getZoneInfo('corner_left'),
    wing_left:          getZoneInfo('wing_left'),
    top:                getZoneInfo('top'),
    wing_right:         getZoneInfo('wing_right'),
    corner_right:       getZoneInfo('corner_right'),
    mid_left:           getZoneInfo('mid_left'),
    mid_top:            getZoneInfo('mid_top'),
    mid_right:          getZoneInfo('mid_right'),
    short_corner_left:  getZoneInfo('short_corner_left'),
    short_corner_right: getZoneInfo('short_corner_right'),
    paint_center:       getZoneInfo('paint_center'),
    under_goal:         getZoneInfo('under_goal'),
  }

  // ── ゾーンラベル共通コンポーネント ──
  const ZL = ({
    x, y, pct, made, name, fs = 4.5,
  }: {
    x: number; y: number; pct: string; made: string; name: string; fs?: number
  }) => (
    <g>
      <text x={x} y={y - 4}    textAnchor="middle" fontSize={fs + 0.5} fill="white" fontWeight="bold">{pct}</text>
      <text x={x} y={y + 3.5}  textAnchor="middle" fontSize={fs - 0.5} fill="rgba(255,255,255,0.75)">{made}</text>
      <text x={x} y={y + 10.5} textAnchor="middle" fontSize={fs - 1}   fill="rgba(255,255,255,0.55)">{name}</text>
    </g>
  )

  return (
    <div className="w-full max-w-sm mx-auto">
      <svg
        viewBox="0 0 300 280"
        className="w-full rounded-2xl shadow-lg"
        style={{ backgroundColor: '#1e3a1a' }}
      >
        {/* ═══════════════════════════════════════════
            STEP 1: ゾーン塗り分け（コートライン下）
            ─────────────────────────────────────────
            座標定義:
              3P半円  : cx=150, cy=66,  r=112  (下向き弧)
              FT半円  : cx=150, cy=122, r=39.2 (下向き弧)
              ペイント: x=101~199, y=10~122
              区切り  : y=58  (ゴール下 / Paint)
              コーナー縦線: x=38 / 262
              3P直線高 : y=10~66
              Elbow斜め線:
                左 (101,122)→(67.4,141.6) 延長して3Pアーク交点
                右 (199,122)→(232.6,141.6)
            ═══════════════════════════════════════════ */}

        {/* ── 2P ゴール下: ペイント上段 x=101~199, y=10~58 ── */}
        <rect x="101" y="10"  width="98" height="48"
              fill={z.under_goal.color}  stroke="none"/>

        {/* ── 2P Paint: ペイント下段 x=101~199, y=58~122 ── */}
        <rect x="101" y="58"  width="98" height="64"
              fill={z.paint_center.color} stroke="none"/>

        {/* ── 2P 左 Middle: x=38~101, y=10~122 ── */}
        <rect x="38"  y="10"  width="63" height="112"
              fill={z.mid_left.color}  stroke="none"/>

        {/* ── 2P 右 Middle: x=199~262, y=10~122 ── */}
        <rect x="199" y="10"  width="63" height="112"
              fill={z.mid_right.color} stroke="none"/>

        {/* ── 2P 左 Elbow
            3Pアーク内 かつ ペイント左外 かつ Elbow線より内側（右下）
            パス: (38,66)[コーナー縦線上端]
                → 3Pアーク沿い(x=38→67.4)
                → Elbow斜め線 (67.4,141.6)→(101,122)
                → FTライン (101,122)→(38,122)
                → 戻る
            ── */}
        <path
          d={`
            M 38,66
            A 112,112 0 0,0 67.4,141.6
            L 101,122
            L 38,122
            Z
          `}
          fill={z.short_corner_left.color} stroke="none"
        />

        {/* ── 2P 右 Elbow ── */}
        <path
          d={`
            M 262,66
            A 112,112 0 0,1 232.6,141.6
            L 199,122
            L 262,122
            Z
          `}
          fill={z.short_corner_right.color} stroke="none"
        />

        {/* ── 2P Top (FT半円内・下向き半円領域)
            cx=150, cy=122, r=39.2  下向き弧
            M 110.8,122 A 39.2,39.2 0 0,0 189.2,122 L 189.2,270 L 110.8,270 Z
            ── */}
        <path
          d="M 110.8,122 A 39.2,39.2 0 0,0 189.2,122 L 189.2,200 L 110.8,200 Z"
          fill={z.mid_top.color} stroke="none"
        />

        {/* ── 3P 左 Corner: x=10~38, y=10~66 ── */}
        <rect x="10"  y="10"  width="28" height="56"
              fill={z.corner_left.color}  stroke="none"/>
        {/* コーナー下部（y=66以下）: 3Pアーク外側 x=10~38 */}
        <path
          d={`M 10,66 L 38,66 A 112,112 0 0,1 10,66 Z`}
          fill={z.corner_left.color} stroke="none"
        />
        {/* コーナー縦線より左全域（y=66以下は3Pアーク外なので全部corner色） */}
        <rect x="10"  y="66"  width="28" height="204"
              fill={z.corner_left.color}  stroke="none"/>

        {/* ── 3P 右 Corner ── */}
        <rect x="262" y="10"  width="28" height="56"
              fill={z.corner_right.color} stroke="none"/>
        <rect x="262" y="66"  width="28" height="204"
              fill={z.corner_right.color} stroke="none"/>

        {/* ── 3P 左 Wing
            コーナー縦線(x=38)より内側 & 3Pアーク外側 & Elbow線より左上
            3Pアーク上(x=38,y=66)→アーク沿い→Elbow終点(67.4,141.6)
            → Elbow線 → ペイント下角(101,122) → Middle下端 → コーナー縦線
            ── */}
        <path
          d={`
            M 38,66
            A 112,112 0 0,0 67.4,141.6
            L 101,122
            L 101,10
            L 38,10
            Z
          `}
          fill={z.wing_left.color} stroke="none"
        />

        {/* ── 3P 右 Wing ── */}
        <path
          d={`
            M 262,66
            A 112,112 0 0,1 232.6,141.6
            L 199,122
            L 199,10
            L 262,10
            Z
          `}
          fill={z.wing_right.color} stroke="none"
        />

        {/* ── 3P Top
            Elbow線2本の間 & 3Pアーク外側
            (101,122)→(67.4,141.6) アーク沿い(67.4→232.6) →(232.6,141.6)→(199,122)
            ── */}
        <path
          d={`
            M 101,122
            L 67.4,141.6
            A 112,112 0 0,0 232.6,141.6
            L 199,122
            Z
          `}
          fill={z.top.color} stroke="none"
        />

        {/* ── バックコート（3Pアーク外・最下部） ── */}
        <rect x="10" y="178" width="280" height="92"
              fill="rgba(0,0,0,0.25)" stroke="none"/>

        {/* ═══════════════════════════════════════════
            STEP 2: コートライン（ゾーン塗りの上に重ねる）
            ═══════════════════════════════════════════ */}

        {/* コート外枠 */}
        <rect x="10" y="10" width="280" height="260"
              fill="none" stroke="#4d8c42" strokeWidth="1.5"/>

        {/* ペイント外枠 */}
        <rect x="101" y="10" width="98" height="112"
              fill="none" stroke="#4d8c42" strokeWidth="1"/>

        {/* ペイント内区切り（ゴール下 / Paint 境界） */}
        <line x1="101" y1="58" x2="199" y2="58"
              stroke="#4d8c42" strokeWidth="0.8"/>

        {/* FTライン（ペイント内水平線） */}
        <line x1="101" y1="122" x2="199" y2="122"
              stroke="#4d8c42" strokeWidth="1"/>

        {/* FT半円（下向き） */}
        <path d="M 110.8,122 A 39.2,39.2 0 0,0 189.2,122"
              fill="none" stroke="#4d8c42" strokeWidth="1"/>

        {/* 3P コーナー直線（左右）y=10~66 */}
        <line x1="38"  y1="10" x2="38"  y2="66"
              stroke="#4d8c42" strokeWidth="1"/>
        <line x1="262" y1="10" x2="262" y2="66"
              stroke="#4d8c42" strokeWidth="1"/>

        {/* 3P 半円アーク（下向き） */}
        <path d="M 38,66 A 112,112 0 0,0 262,66"
              fill="none" stroke="#4d8c42" strokeWidth="1"/>

        {/* Elbow 斜め線（左）: ペイント下角 → 3Pアーク交点 */}
        <line x1="101" y1="122" x2="67.4" y2="141.6"
              stroke="#4d8c42" strokeWidth="0.9" opacity="0.85"/>

        {/* Elbow 斜め線（右） */}
        <line x1="199" y1="122" x2="232.6" y2="141.6"
              stroke="#4d8c42" strokeWidth="0.9" opacity="0.85"/>

        {/* FTライン水平延長（ペイント外端〜コーナー縦線） */}
        <line x1="38"  y1="122" x2="101" y2="122"
              stroke="#4d8c42" strokeWidth="0.8" opacity="0.7"/>
        <line x1="199" y1="122" x2="262" y2="122"
              stroke="#4d8c42" strokeWidth="0.8" opacity="0.7"/>

        {/* ゴールリング */}
        <circle cx="150" cy="30" r="7"
                fill="none" stroke="#e1c614" strokeWidth="1.5"/>

        {/* ═══════════════════════════════════════════
            STEP 3: ゾーンラベル
            ═══════════════════════════════════════════ */}

        {/* 2P ゴール下 */}
        <ZL x={150} y={38}  pct={z.under_goal.pct}  made={z.under_goal.made}  name="ゴール下" fs={4.5}/>

        {/* 2P Paint */}
        <ZL x={150} y={95}  pct={z.paint_center.pct} made={z.paint_center.made} name="ペイント" fs={4.5}/>

        {/* 2P 左 Middle */}
        <ZL x={70}  y={62}  pct={z.mid_left.pct}  made={z.mid_left.made}  name="左Middle" fs={4.5}/>

        {/* 2P 右 Middle */}
        <ZL x={230} y={62}  pct={z.mid_right.pct} made={z.mid_right.made} name="右Middle" fs={4.5}/>

        {/* 2P 左 Elbow */}
        <ZL x={52}  y={107} pct={z.short_corner_left.pct}  made={z.short_corner_left.made}  name="左Elbow" fs={4}/>

        {/* 2P 右 Elbow */}
        <ZL x={248} y={107} pct={z.short_corner_right.pct} made={z.short_corner_right.made} name="右Elbow" fs={4}/>

        {/* 2P Top */}
        <ZL x={150} y={144} pct={z.mid_top.pct} made={z.mid_top.made} name="2P Top" fs={4.5}/>

        {/* 3P 左 Corner */}
        <ZL x={24}  y={34}  pct={z.corner_left.pct}  made={z.corner_left.made}  name="左Corner" fs={3.8}/>

        {/* 3P 右 Corner */}
        <ZL x={276} y={34}  pct={z.corner_right.pct} made={z.corner_right.made} name="右Corner" fs={3.8}/>

        {/* 3P 左 Wing */}
        <ZL x={62}  y={68}  pct={z.wing_left.pct}  made={z.wing_left.made}  name="左Wing" fs={4.2}/>

        {/* 3P 右 Wing */}
        <ZL x={238} y={68}  pct={z.wing_right.pct} made={z.wing_right.made} name="右Wing" fs={4.2}/>

        {/* 3P Top */}
        <ZL x={150} y={162} pct={z.top.pct} made={z.top.made} name="3P Top" fs={4.5}/>

        {/* ── ロゴ & 凡例 ── */}
        <text x="150" y="222" textAnchor="middle" fontSize="7"
              fill="rgba(255,255,255,0.18)" fontFamily="monospace">RISE SHOOTING</text>

        {/* 凡例 */}
        <circle cx="17"  cy="236" r="3" fill="rgba(225,198,20,0.85)"/>
        <text x="22" y="239" fontSize="4.5" fill="rgba(255,255,255,0.5)">70%+</text>
        <circle cx="50"  cy="236" r="3" fill="rgba(34,197,94,0.75)"/>
        <text x="55" y="239" fontSize="4.5" fill="rgba(255,255,255,0.5)">50-69%</text>
        <circle cx="90"  cy="236" r="3" fill="rgba(251,146,60,0.75)"/>
        <text x="95" y="239" fontSize="4.5" fill="rgba(255,255,255,0.5)">30-49%</text>
        <circle cx="132" cy="236" r="3" fill="rgba(239,68,68,0.75)"/>
        <text x="137" y="239" fontSize="4.5" fill="rgba(255,255,255,0.5)">0-29%</text>
      </svg>

      {/* ── フリースロー（FT）スタッツ表示 ──
          コート図にはFTラインが既に描画されているが、
          FTは特定のコートゾーンではなくラインで打つため、
          チャート下部に専用カードとして表示する */}
      <div
        className="mt-2 rounded-xl px-4 py-3 flex items-center gap-3"
        style={{ backgroundColor: ftHasData ? ftColor : 'rgba(255,255,255,0.08)' }}
      >
        <div className="flex-1">
          <p className="text-xs font-bold" style={{ color: ftHasData ? '#1a1a1a' : 'rgba(255,255,255,0.5)' }}>
            🎯 フリースロー（FT）
          </p>
          {ftHasData && (
            <p className="text-xs" style={{ color: 'rgba(0,0,0,0.6)' }}>{ftMade}本</p>
          )}
        </div>
        <span
          className="text-2xl font-extrabold"
          style={{ color: ftHasData ? '#1a1a1a' : 'rgba(255,255,255,0.3)' }}
        >
          {ftPct}
        </span>
      </div>
    </div>
  )
}
