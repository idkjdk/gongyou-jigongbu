// 工友记工簿 Service Worker
// 离线缓存策略:应用外壳 cache-first,数据已在 localStorage 无需缓存
const VERSION = 'v1.0.0';
const CACHE = 'gongyou-' + VERSION;
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon.svg',
  './icon-192.png',
  './icon-512.png'
];

// 安装:预缓存应用外壳
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

// 激活:清理旧缓存,接管客户端
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// 请求策略:
//  - index.html: 网络优先(保证更新),失败回退缓存
//  - 静态资源: 缓存优先,失败回退网络
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(networkFirst(e.request));
  } else {
    e.respondWith(cacheFirst(e.request));
  }
});

async function networkFirst(req) {
  try {
    const fresh = await fetch(req, { cache: 'no-store' });
    const c = await caches.open(CACHE);
    c.put('./index.html', fresh.clone());
    return fresh;
  } catch (err) {
    const cached = await caches.match('./index.html');
    return cached || caches.match('./');
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const fresh = await fetch(req);
    const c = await caches.open(CACHE);
    c.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return cached;
  }
}

// 接收更新消息:让客户端刷新
self.addEventListener('message', e => {
  if (e.data === 'SKIP_WAITING') self.skipWaiting();
});
