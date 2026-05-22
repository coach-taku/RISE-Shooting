// =====================================================
// Next.js Middleware — セッション自動リフレッシュ
// =====================================================
// Next.js はプロジェクトルートに "middleware.ts" という名前のファイルを置くことで
// 自動的にすべてのリクエスト前に実行する。
// このファイルで Supabase Auth のセッション Cookie を検証・更新することで
// 「ブラウザを閉じても再度ログインが不要」を実現する。
//
// ※ proxy.ts はこれまで middleware 相当のロジックを持っていたが、
//   ファイル名が Next.js の規約と異なるため実際には実行されていなかった。
//   このファイルで正式に middleware として機能させる。

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseUrl } from '@/lib/supabase/url'

// 認証不要でアクセスできるパスの一覧
const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/admin/seed-demo-users', // セットアップページから未ログインで呼ぶため除外
  '/api/admin/debug-auth',      // 診断API（ログイン前に状態確認するため除外）
  '/api/auth/users-list',       // ログイン画面の名前プルダウン取得（ログイン前に呼ぶため除外）
  '/api/auth/login-by-name',    // 名前→メールアドレス逆引き（ログイン処理の一部なので除外）
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // -----------------------------------------------------------------------
  // すべてのリクエストで共通: セッションのリフレッシュと Cookie 書き出しを行う
  // これにより、アプリを閉じて再起動しても認証状態が維持される
  // -----------------------------------------------------------------------
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    getSupabaseUrl(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // リクエストにも Cookie をセット（後続の Server Component が参照するため）
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          // レスポンスを再生成して更新済み Cookie を乗せる
          supabaseResponse = NextResponse.next({ request })
          // レスポンスの Set-Cookie ヘッダーにセッション Cookie を書き出す
          // options には maxAge（デフォルト400日）等が含まれ、永続化される
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッション取得 & 期限切れトークンの自動リフレッシュ
  // ※ getUser() はサーバーへの検証 + 必要に応じてトークンを更新し setAll を呼ぶ
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // -----------------------------------------------------------------------
  // 認証不要パスの処理
  // -----------------------------------------------------------------------
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // ログイン済みユーザーがログインページにアクセスしたらホームへリダイレクト
    if (pathname === '/login' && user) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    // 認証不要パスは（Cookie を更新しつつ）そのまま通過
    return supabaseResponse
  }

  // -----------------------------------------------------------------------
  // 認証が必要なパスの処理
  // -----------------------------------------------------------------------
  // 未ログイン（セッションなし）はログインページへリダイレクト
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ログイン済み: 更新済み Cookie を含むレスポンスをそのまま返す
  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * 以下を除くすべてのリクエストにマッチ:
     * - _next/static（静的ファイル）
     * - _next/image（画像最適化）
     * - favicon.ico
     * - 各種画像ファイル
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
