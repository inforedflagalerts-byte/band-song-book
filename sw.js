const CACHE_NAME = "band-song-book-app-v9";
const IMAGE_CACHE = "song-book-images-v5";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(APP_FILES))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key =>
                        key !== CACHE_NAME &&
                        key !== IMAGE_CACHE
                    )
                    .map(key => caches.delete(key))
            )
        ).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    // GitHub API must ALWAYS go directly to GitHub.
    if (url.hostname === "api.github.com") return;

    // Song images are handled by app.js and its image cache.
    if (
        url.hostname === "raw.githubusercontent.com" &&
        /\/chords\/|\/lyrics\//i.test(url.pathname)
    ) return;

    const isAppFile =
        url.origin === self.location.origin &&
        (
            url.pathname.endsWith("/index.html") ||
            url.pathname.endsWith("/app.js") ||
            url.pathname.endsWith("/style.css") ||
            url.pathname.endsWith("/manifest.json") ||
            url.pathname.endsWith("/sw.js") ||
            url.pathname.endsWith("/")
        );

    if (isAppFile) {
        event.respondWith(
            fetch(request, { cache: "no-store" })
                .then(response => {
                    if (response.ok) {
                        const copy = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => cache.put(request, copy))
                            .catch(() => {});
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    event.respondWith(
        fetch(request)
            .then(response => {
                if (response.ok) {
                    const copy = response.clone();
                    caches.open(CACHE_NAME)
                        .then(cache => cache.put(request, copy))
                        .catch(() => {});
                }
                return response;
            })
            .catch(() => caches.match(request))
    );
});
