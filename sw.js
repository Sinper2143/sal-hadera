// Service worker של "סל חדרה".
//
// הדף עצמו נטען מהרשת תחילה. זו לא בחירה אסתטית: כשמבנה הנתונים משתנה,
// דף ישן מהמטמון יחד עם נתונים חדשים מייצר מסך שבור בלי שום הודעת שגיאה
// (שמות ריקים, מחירים חסרים). עדיפה טעינה מהרשת, עם נפילה למטמון רק כשאין
// אינטרנט, מאשר אפליקציה שנראית תקינה ומציגה שטויות.
//
// נכסים שלא משתנים (אייקונים) נשארים מטמון תחילה.
const VERSION = "sal-hadera-6e33a14e72d8";
const SHELL = ["./", "./index.html", "./manifest.webmanifest",
               "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// הדף יכול לבקש ניקוי מלא כשהוא מזהה נתונים שאינם תואמים לקוד שלו
self.addEventListener("message", e => {
  if (e.data === "purge") {
    e.waitUntil(caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k)))));
  }
});

function networkFirst(req) {
  return fetch(req)
    .then(res => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
      }
      return res;
    })
    .catch(() => caches.match(req).then(hit => hit || Response.error()));
}

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   // גופני Google נשארים לדפדפן

  const p = url.pathname;
  const isDoc = req.mode === "navigate" || p.endsWith("/") ||
                p.endsWith(".html") || p.endsWith("data.json");

  if (isDoc) { e.respondWith(networkFirst(req)); return; }

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
