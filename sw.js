/* Service worker dell'app installata.

   Fa una cosa sola. Quando l'app si apre e il server e spento, al posto della
   pagina d'errore del browser mostra offline.html, che spiega come accendere
   il cantiere. Per tutto il resto non c'e: niente copie dei file della scena,
   che con una cache rischierebbero di restare vecchie dopo un aggiornamento. */

const CACHE = 'acropoli-offline-v2';
const OFFLINE = '/offline.html';

self.addEventListener('install', (event) => {
  // Se la cache non si apre - succede, per esempio con profili del browser
  // dai percorsi troppo lunghi su Windows - il worker si installa lo stesso:
  // si perde la pagina d'aiuto, non l'app.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add(OFFLINE)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // le versioni vecchie della pagina, se il nome della cache cambia
  event.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  // solo l'apertura delle pagine: moduli, stato e immagini vanno in rete come sempre
  if (event.request.mode !== 'navigate') return;
  event.respondWith(fetch(event.request).catch(() =>
    caches.match(OFFLINE).then((page) => page || Response.error())));
});
