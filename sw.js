/* WealthMorand : fonctionne hors ligne. Réseau d'abord, pour recevoir les mises
   à jour ; copie en cache en secours. Les données personnelles ne passent
   jamais ici : elles restent dans le stockage local du navigateur. */
const CACHE = "wealthmorand-v33";
const FICHIERS = [
  "./", "index.html", "styles.css", "js/demarrage.js", "js/calc.js", "js/verrou.js", "js/catalogues.js", "js/interface.js", "js/app.js", "js/rapport.js", "manifest.webmanifest",
  "polices/inter.woff2", "polices/newsreader.woff2",
  "icone.svg", "icones/icone-192.png", "icones/icone-512.png", "icones/apple-touch-icon.png", "icones/favicon-32.png",
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(cles => Promise.all(cles.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request;
  if (r.method !== "GET" || new URL(r.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(r).then(rep => {
      if (rep.ok) { const copie = rep.clone(); caches.open(CACHE).then(c => c.put(r, copie)); }
      return rep;
    }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === "navigate" ? caches.match("index.html") : undefined)))
  );
});
