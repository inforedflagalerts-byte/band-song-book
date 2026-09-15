const CACHE_NAME = "band-song-book-app-v6";
const IMAGE_CACHE = "song-book-images-v6";

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
    );

    self.skipWaiting();
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
        )
    );

    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const request = event.request;

    if (request.method !== "GET") return;

    const url = new URL(request.url);

    /*
     * IMPORTANT:
     * GitHub API is NOT automatically cached here.
     * The app gets fresh file lists when online.
     */
    if (url.hostname === "api.github.com") {
        return;
    }

    /*
     * Song images are controlled by app.js.
     * Do not silently download/cache every image.
     */
    if (
        url.hostname === "raw.githubusercontent.com" &&
        /\/chords\/|\/lyrics\//i.test(url.pathname)
    ) {
        return;
    }

    /*
     * App shell:
     * Network first, cache fallback.
     */
    event.respondWith(
        fetch(request)
            .then(response => {
                if (response && response.ok) {
                    const copy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, copy);
                    });
                }

                return response;
            })
            .catch(() => caches.match(request))
    );
});
