// Supabase URL 正規化ユーティリティ
// 環境変数に誤って /rest/v1/ 等のパスが含まれている場合でも
// Supabase クライアントが期待するベース URL (origin のみ) に正規化する

export function getSupabaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  // URL を parse してオリジン (scheme + host) だけ返す
  // 例: "https://xxx.supabase.co/rest/v1/" → "https://xxx.supabase.co"
  try {
    const { origin } = new URL(raw)
    return origin
  } catch {
    // パース失敗時はそのまま返す（後続でSupabaseクライアントがエラーを出す）
    return raw
  }
}
