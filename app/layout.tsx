import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import Script from 'next/script'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

// =====================================================
// PWA対応メタデータ
// =====================================================
export const metadata: Metadata = {
  title: 'RISE Shooting',
  description: 'バスケットボール シューティング記録・分析アプリ',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'RISE Shooting',
  },
  icons: {
    icon: [
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  formatDetection: {
    telephone: false,
  },
}

// =====================================================
// ビューポート設定（テーマカラー＝薄いグレー）
// Next.js App RouterではViewportはmetadataと分離して定義する
// =====================================================
export const viewport: Viewport = {
  themeColor: '#F3F4F6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ja">
      <head>
        {/* iOS Safari PWA対応メタタグ */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="RISE Shooting" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/* Android Chrome PWA対応 */}
        <meta name="mobile-web-app-capable" content="yes" />

        {/* Microsoft Tiles（Windows対応） */}
        <meta name="msapplication-TileColor" content="#F3F4F6" />
        <meta name="msapplication-TileImage" content="/icon-192x192.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        style={{ backgroundColor: '#c0c0bf', minHeight: '100vh' }}
      >
        {children}

        {/* =====================================================
            Service Worker 登録スクリプト
            afterInteractive: ページ描画後に非同期で実行（パフォーマンス考慮）
            ===================================================== */}
        <Script
          id="register-sw"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('[SW] 登録成功:', registration.scope);
                    })
                    .catch(function(err) {
                      console.warn('[SW] 登録失敗:', err);
                    });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  )
}
