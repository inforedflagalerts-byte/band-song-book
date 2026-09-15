const CACHE_NAME = "band-song-book-v5";

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

                        keys.map(key => {

                            /*
                             * Keep:
                             * - current app cache
                             * - manually saved song images
                             */

                            if (
                                key === CACHE_NAME ||
                                key === "song-book-images-v2"
                            ) {

                                return Promise.resolve();

                            }

                            /*
                             * Delete every old
                             * service-worker cache.
                             */

                            return caches.delete(key);

                        })

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


        /*
         * Only handle GET requests.
         */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(request.url);


        /*
         * =====================================
         * ALL IMAGE REQUESTS
         * =====================================
         *
         * NEVER automatically cache images.
         *
         * Images are saved only by app.js
         * when the user clicks a song.
         */

        const isImage =
            /\.(jpg|jpeg|png|webp|gif)$/i.test(
                url.pathname
            );


        if (isImage) {

            event.respondWith(
                fetch(request)
            );

            return;

        }


        /*
         * =====================================
         * NORMAL APP FILES
         * =====================================
         *
         * Network first.
         * If internet is unavailable,
         * use saved app files.
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
