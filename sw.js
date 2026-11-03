/* Service Worker da Mesa BW — offline-first.
   Estratégia:
   - shell (index.html, manifest, ícones): cache-first com atualização em 2º plano
   - fontes de dados (milhas.json): network-first, cai no cache sem rede
   - APIs externas (BCB, er-api): NUNCA cacheadas — passam direto
   Versão no nome do cache: subir CACHE a cada publicação de conteúdo. */
const CACHE = "bw-mesa-v1";
const SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;

  /* APIs externas: sempre rede, sem cache */
  if (url.origin !== location.origin &&
      /olinda\.bcb\.gov\.br|open\.er-api\.com/.test(url.hostname)) return;

  /* dados da automação (milhas.json): rede primeiro, cache como reserva */
  if (url.pathname.endsWith("milhas.json")) {
    e.respondWith(
      fetch(e.request)
        .then(r => {
          const cp = r.clone();
          caches.open(CACHE).then(c => c.put(e.request, cp));
          return r;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  /* shell do app: cache primeiro, atualiza em 2º plano */
  e.respondWith(
    caches.match(e.request).then(hit => {
      const rede = fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => hit);
      return hit || rede;
    })
  );
});