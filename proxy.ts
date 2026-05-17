// 認証・ルーティング Proxy（Next.js 16 以降の仕様）
// middleware.ts から proxy.ts へリネーム済み（関数名も proxy に変更）
// 未ログインのユーザーはログインページへ、ロールに応じて適切な画面へリダイレクト

import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// 認証不要でアクセスできるパスの一覧
const PUBLIC_PATHS = [
  '/login',
  '/setup',
  '/api/admin/seed-demo-users', // セットアップページから未ログインで呼ぶため除外
]

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 認証不要パスはそのまま通過
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    // ログイン済みでログインページにアクセスした場合のみホームへリダイレクト
    if (pathname === '/login') {
      // ログイン状態確認（ログインページのみ）
      const supabaseCheck = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll() { /* ログインページ確認のみなので set 不要 */ },
          },
        }
      )
      const { data: { user } } = await supabaseCheck.auth.getUser()
      if (user) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }
    return NextResponse.next({ request })
  }

  // 上記以外のパス：認証チェックを行う
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // セッション取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 未ログインはログインページへリダイレクト
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
