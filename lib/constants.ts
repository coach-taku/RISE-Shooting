// =====================================================
// パスワードパディング設定
// =====================================================
// Supabase Auth はダッシュボード上で最小6文字以下に設定できないため、
// アプリ側でユーザーが入力した短いパスワードに固定文字列を付加して
// Supabase に渡す（ユーザーには見えない）。
//
// 【ルール】
//   - ユーザーが入力: 4文字以上
//   - Supabase に渡す: 入力値 + PASSWORD_SUFFIX（合計6文字以上になる）
//   - コーチの管理画面表示: ユーザーが入力した文字列のみ（サフィックスは非表示）
//   - この定数を変更すると既存ユーザー全員がログインできなくなるため、絶対に変更しないこと
export const PASSWORD_SUFFIX = '__rise'

// ユーザー入力パスワードにサフィックスを付加してSupabase用パスワードを生成する
export function buildAuthPassword(userPassword: string): string {
  return userPassword + PASSWORD_SUFFIX
}

// シュートエリアの定義
// 仕様書に基づくエリア分け

export const SHOT_AREAS = [
  // 3ポイントエリア（5分割）
  { value: '3P_左コーナー', label: '左コーナー（3P）', category: '3P', zone: 'corner_left' },
  { value: '3P_左ウイング', label: '左ウイング（3P）', category: '3P', zone: 'wing_left' },
  { value: '3P_トップ', label: 'トップ（3P）', category: '3P', zone: 'top' },
  { value: '3P_右ウイング', label: '右ウイング（3P）', category: '3P', zone: 'wing_right' },
  { value: '3P_右コーナー', label: '右コーナー（3P）', category: '3P', zone: 'corner_right' },
  // 2ポイント ミドルレンジ（5分割）
  { value: '2P_左ショートコーナー', label: '左ショートコーナー（ミドル）', category: '2P_mid', zone: 'short_corner_left' },
  { value: '2P_左ミドル', label: '左ミドル', category: '2P_mid', zone: 'mid_left' },
  { value: '2P_トップミドル', label: 'トップミドル', category: '2P_mid', zone: 'mid_top' },
  { value: '2P_右ミドル', label: '右ミドル', category: '2P_mid', zone: 'mid_right' },
  { value: '2P_右ショートコーナー', label: '右ショートコーナー（ミドル）', category: '2P_mid', zone: 'short_corner_right' },
  // 2ポイント インサイド（2分割）
  { value: '2P_ペイント中央', label: 'ペイントエリア中央', category: '2P_inside', zone: 'paint_center' },
  { value: '2P_ゴール下', label: 'ゴール下', category: '2P_inside', zone: 'under_goal' },
] as const

export type ShotAreaValue = typeof SHOT_AREAS[number]['value']

// エリアカテゴリのラベル
export const CATEGORY_LABELS: Record<string, string> = {
  '3P': '3ポイント',
  '2P_mid': '2Pミドルレンジ',
  '2P_inside': '2Pインサイド',
}

// 登録成功時のポジティブメッセージ一覧
export const SUCCESS_MESSAGES = [
  'ナイスシュート！💪 今日のデータが積み上がった！',
  'いいね！継続は力なり！🔥 毎日の積み重ねが最強の武器！',
  '記録完了！🏀 今日も全力で愉しめた？',
  '素晴らしい！✨ データが自分の成長を証明してくれる！',
  'やった！🌟 コツコツ続ける選手が、試合を制する！',
  'ドンマイも次に活かせるのが強者の証！💡 今日のデータを糧に明日へ！',
  'お疲れさま！🤝 今日の練習がチームを強くする！',
  'ナイス記録！🎯 ホットゾーン、どこだった？',
]

// 期間フィルターの選択肢
export const DATE_FILTERS = [
  { value: 'today', label: '今日' },
  { value: 'week', label: '今週' },
  { value: 'month', label: '今月' },
  { value: 'all', label: '全期間' },
  { value: 'custom', label: '期間を指定' },
]
