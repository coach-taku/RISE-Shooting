// アプリ全体で使用する型定義

export interface Profile {
  id: string
  username: string
  role: 'player' | 'coach'
  // コーチが管理画面でパスワードを確認するための表示用フィールド
  // 実際の認証は Supabase Auth が担当。null の場合は未設定。
  password_plain?: string | null
  created_at: string
}

export interface ShootingRecord {
  id: number
  user_id: string
  date: string
  area_name: string
  attempts: number
  successes: number
  created_at: string
}

// エリアごとの集計データ
export interface AreaStats {
  area_name: string
  total_attempts: number
  total_successes: number
  percentage: number
}

// コート上のゾーン表示用データ
export interface ZoneData {
  zone: string
  area_name: string
  label: string
  attempts: number
  successes: number
  percentage: number
  category: string
}
