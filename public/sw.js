// =====================================================
// RISE Shooting - Service Worker
// 戦略: Stale-While-Revalidate（キャッシュ優先、バックグラウンドで更新）
// オフライン時もアプリシェルを表示できるようにする
// =====================================================

const CACHE_NAME = 'rise-shooting-v1';

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
      return cache.addAll(APP_SHELL_URLS).catch((err) => {
        // 一部のリソースがキャッシュできなくても続行する
        console.warn('[SW] アプリシェルの一部キャッシュに失敗しました:', err);
      });
    })
  );
  // 待機中の新しいService Workerを即座にアクティブ化
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
  // 新しいService Workerが即座に全クライアントを制御できるようにする
  self.clients.claim();
});

// =====================================================
// フェッチ: Stale-While-Revalidate 戦略
// キャッシュがあればすぐ返し、バックグラウンドで更新する
// =====================================================
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // GETリクエスト以外（API呼び出し等）はキャッシュしない
  if (request.method !== 'GET') {
    return;
  }

  // Supabase APIへのリクエストはキャッシュしない（常にネットワーク優先）
  const url = new URL(request.url);
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/_next/data/')
  ) {
    return;
  }

  // _next/static（JS/CSS等の静的アセット）はキャッシュ優先
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(request).then((cached) => {
          if (cached) return cached;
          return fetch(request).then((response) => {
            if (response.ok) {
              cache.put(request, response.clone());
            }
            return response;
          });
        });
      })
    );
    return;
  }

  // その他のリクエスト: Stale-While-Revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((cachedResponse) => {
        // バックグラウンドでネットワークから取得してキャッシュを更新
        const networkFetch = fetch(request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.ok) {
              cache.put(request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => {
            // ネットワークエラー時はキャッシュがあればそれを使用
            return cachedResponse;
          });

        // キャッシュがあればすぐに返す（バックグラウンドで更新は継続）
        return cachedResponse || networkFetch;
      });
    })
  );
});
