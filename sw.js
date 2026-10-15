// Service worker של "סל חדרה".
// שתי אסטרטגיות נפרדות, כי לנכסים ולנתונים יש צרכים הפוכים:
//   נכסים (HTML/CSS/אייקונים) — cache-first, כדי שהאפליקציה תיפתח מיד גם בלי רשת.
//   data.json                 — network-first, כי מחיר ישן גרוע ממסך טעינה.
const VERSION = "sal-hadera-9ec3ec9b4097";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll נכשל כולו אם פריט אחד נכשל. כאן זה מכוון: shell חלקי
      // יוצר אפליקציה שבורה-למחצה, ועדיף שההתקנה תיכשל ותנסה שוב.
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // גופני Google נשארים לדפדפן

  if (url.pathname.endsWith("data.json")) {
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(VERSION).then(c => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || Response.error()))
    );
    return;
  }

  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    }))
  );
});
