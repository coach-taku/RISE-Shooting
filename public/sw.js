// =====================================================
// RISE Shooting - Service Worker
// 戦略: Stale-While-Revalidate（キャッシュ優先、バックグラウンドで更新）
// オフライン時もアプリシェルを表示できるようにする
// v7: FetchEvent エラーハンドリングを改善
//   - network error 時に null/undefined を返さないよう修正
//   - respondWith に渡すPromiseが必ずResponseを返すよう保証
// =====================================================

const CACHE_NAME = 'rise-shooting-v2';

// アプリシェルとして優先的にキャッシュするリソース
const APP_SHELL_URLS = [
  '/',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/apple-touch-icon.png',
];

// =====================================================
// インストール: アプリシェルを事前にキャッシュ
// =====================================================
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // addAll が失敗しても全体を止めないよう、個別に add する
      return Promise.allSettled(
        APP_SHELL_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] キャッシュ失敗:', url, err);
          })
        )
      );
    })
  );
  // 待機中の新しい Service Worker を即座にアクティブ化
  self.skipWaiting();
});

// =====================================================
// アクティベート: 古いキャッシュの削除
// =====================================================
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[SW] 古いキャッシュを削除:', name);
            return caches.delete(name);
          })
      );
    })
  );
  // 新しい Service Worker が即座に全クライアントを制御できるようにする
  self.clients.claim();
});

// =====================================================
// フェッチ: Stale-While-Revalidate 戦略
// キャッシュがあればすぐ返し、バックグラウンドで更新する
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GETリクエスト以外（POST/PUT/DELETE 等の API 呼び出し）はキャッシュしない
  // respondWith を呼ばないことでブラウザのデフォルト処理に委ねる
  if (request.method !== 'GET') {
    return;
  }

  // Supabase API・Next.js API ルート・データルートはキャッシュしない（常にネットワーク優先）
  // respondWith を呼ばないことでブラウザのデフォルト処理に委ねる
  let url;
  try {
    url = new URL(request.url);
  } catch {
    // URL のパースに失敗した場合はキャッシュ処理をスキップ
    return;
  }

  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  // chrome-extension など http/https 以外のスキームはスキップ
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // _next/static（JS/CSS 等の静的アセット）はキャッシュ優先
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request)
            .then((response) => {
              // 正常なレスポンスのみキャッシュに保存
              if (response && response.ok) {
                cache.put(request, response.clone());
              }
              return response;
            })
            .catch(() => {
              // ネットワークエラー時：キャッシュがあれば返し、なければエラーレスポンスを返す
              if (cached) return cached;
              return new Response('Network error', {
                status: 503,
                statusText: 'Service Unavailable',
                headers: { 'Content-Type': 'text/plain' },
              });
            });
        });
      })
    );
    return;
  }

  // その他のリクエスト: Stale-While-Revalidate
  // respondWith に渡す Promise は必ず Response を返すよう保証する
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // バックグラウンドでネットワークから取得してキャッシュを更新
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            // 有効なレスポンスのみキャッシュに保存（エラーレスポンスはキャッシュしない）
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch((err) => {
            console.warn('[SW] ネットワークエラー:', request.url, err);
            // ネットワークエラー時：キャッシュがあればそれを返す
            if (cachedResponse) return cachedResponse;
            // キャッシュもない場合：503 レスポンスを返す（null/undefined を返さない）
            return new Response('Network error', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: { 'Content-Type': 'text/plain' },
            });
          });

        // キャッシュがあればすぐに返す（バックグラウンドで更新は継続）
        // キャッシュがない場合はネットワークからの取得結果を待つ
        return cachedResponse || networkFetch;
      });
    }).catch((err) => {
      // キャッシュ操作自体が失敗した場合のフォールバック
      console.warn('[SW] キャッシュ操作エラー:', err);
      return fetch(request).catch(() => {
        return new Response('Service Unavailable', {
          status: 503,
          statusText: 'Service Unavailable',
          headers: { 'Content-Type': 'text/plain' },
        });
      });
    })
  );
});
