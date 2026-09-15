const CACHE_NAME = "band-song-book-v4";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


/* =========================================
   INSTALL
========================================= */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(cache => {

                    return cache.addAll(
                        APP_FILES
                    );

                })

        );

        self.skipWaiting();

    }
);


/* =========================================
   ACTIVATE
========================================= */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME &&
                                    key !== "song-book-images-v2"
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )

                    );

                })

        );

        self.clients.claim();

    }
);


/* =========================================
   FETCH
========================================= */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;

        if (request.method !== "GET") {
            return;
        }


        const url =
            new URL(request.url);


        /*
         * GitHub image files must NOT be
         * automatically cached by service worker.
         *
         * They are cached only when the user
         * clicks the song.
         */

        const isGitHubImage =
            url.hostname === "raw.githubusercontent.com" &&
            /\.(jpg|jpeg|png|webp)$/i.test(
                url.pathname
            );


        if (isGitHubImage) {

            event.respondWith(
                fetch(request)
            );

            return;

        }


        /*
         * Normal app files:
         * Network first,
         * offline cache as fallback.
         */

        event.respondWith(

            fetch(request)
                .then(response => {

                    if (
                        response &&
                        response.status === 200
                    ) {

                        const copy =
                            response.clone();

                        caches
                            .open(CACHE_NAME)
                            .then(cache => {

                                cache.put(
                                    request,
                                    copy
                                );

                            });

                    }

                    return response;

                })

                .catch(
                    () => {

                        return caches.match(
                            request
                        );

                    }
                )

        );

    }
);
