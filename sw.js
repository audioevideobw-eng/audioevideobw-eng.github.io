/* Service Worker do Brightway — offline-first.
   Estratégia:
   - shell (index.html, manifest, ícones): cache-first com atualização em 2º plano
   - fontes de dados (milhas.json): network-first, cai no cache sem rede
   - APIs externas (BCB, er-api): NUNCA cacheadas — passam direto
   Versão no nome do cache: subir CACHE a cada publicação de conteúdo. */
const CACHE = "bw-mesa-v21";
const SHELL = [
  "./",
  "./index.html",
  "./cambio.html",
  "./serie.html",
  "./calc.html",
  "./milhas.html",
  "./viagem.html",
  "./meta.html",
  "./diario.html",
  "./evento.html",
  "./comparador.html",
  "./app.html",
  "./alertas.html",
  "./noticias.html",
  "./casa.html",
  "./orcamento.html",
  "./contas.html",
  "./reserva.html",
  "./invest.html",
  "./equipe.html",
  "./financeiro.html",
  "./leitor.html",
  "./eventos.html",
  "./dados.html",
  "./cadastro.html",
  "./negocio.html",
  "./preco.html",
  "./fluxo.html",
  "./login.html",
  "./assets/bw-sync.js",
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

  /* FORA do site: só as bibliotecas do CDN usam cache. Todo o resto (Supabase,
     BCB, câmbio, notícias…) vai DIRETO para a rede. (13/11/2026) Antes, as
     leituras do Supabase caíam no "cache primeiro" e cada aparelho via a
     nuvem DESATUALIZADA — a principal causa dos dados "sumindo". */
  if (url.origin !== location.origin) {
    if (!/(^|\.)cdn\.jsdelivr\.net$/.test(url.hostname)) return;
    e.respondWith(
      caches.match(e.request).then(hit => {
        const rede = fetch(e.request).then(r => {
          if (r && r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); }
          return r;
        }).catch(() => hit);
        return hit || rede;
      })
    );
    return;
  }

  /* páginas e código do próprio site: REDE PRIMEIRO, cache só sem internet.
     (13/11/2026) O "cache primeiro" deixava aparelhos rodando versão velha
     do site — inclusive a sincronia antiga que sobrescrevia a nuvem. */
  if (url.origin === location.origin &&
      (e.request.mode === "navigate" || /\.(html|js|css|json)$/.test(url.pathname) || url.pathname.endsWith("/"))) {
    e.respondWith(
      fetch(e.request).then(r => {
        const cp = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, cp));
        return r;
      }).catch(() => caches.match(e.request, { ignoreSearch: true }))
    );
    return;
  }

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

/* PUSH: notificação quando um alerta de preço dispara */
self.addEventListener("push", e => {
  let d = {};
  try { d = e.data.json(); } catch (err) { d = { title: "Brightway", body: (e.data && e.data.text()) || "" }; }
  e.waitUntil(self.registration.showNotification(d.title || "Brightway", {
    body: d.body || "",
    tag: d.tag || "bw-alerta",
    icon: "icons/icon-192.png",
    badge: "icons/icon-192.png",
    data: { url: d.url || "./" }
  }));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const alvo = (e.notification.data && e.notification.data.url) || "./";
  e.waitUntil(clients.matchAll({ type: "window" }).then(cs => {
    for (const c of cs) if (c.url.includes(alvo)) return c.focus();
    return clients.openWindow(alvo);
  }));
});