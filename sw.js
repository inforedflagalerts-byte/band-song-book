/* ==================================================
   BAND SONG BOOK
   CLEAN FINAL SERVICE WORKER
================================================== */

const CACHE_NAME =
    "band-song-book-app-v5";


const APP_FILES = [

    "./",

    "./index.html",

    "./style.css",

    "./app.js",

    "./manifest.json"

];


/* ==================================================
   INSTALL
================================================== */

self.addEventListener(
    "install",
    event => {

        event.waitUntil(

            caches.open(
                CACHE_NAME
            )
            .then(cache =>
                cache.addAll(
                    APP_FILES
                )
            )
            .then(() =>
                self.skipWaiting()
            )

        );

    }
);


/* ==================================================
   ACTIVATE
================================================== */

self.addEventListener(
    "activate",
    event => {

        event.waitUntil(

            caches.keys()
                .then(keys => {

                    return Promise.all(

                        keys.map(key => {

                            /*
                               Keep current app cache.

                               Keep ALL song image caches.
                               This prevents old saved songs
                               from being unexpectedly deleted.
                            */

                            if (
                                key === CACHE_NAME ||
                                key.startsWith(
                                    "song-book-images-"
                                )
                            ) {

                                return null;

                            }


                            /*
                               Delete only old app caches.
                            */

                            if (
                                key.startsWith(
                                    "band-song-book-app-"
                                ) ||
                                key ===
                                    "band-song-book-v1" ||
                                key ===
                                    "band-song-book-v2" ||
                                key ===
                                    "band-song-book-v3" ||
                                key ===
                                    "band-song-book-v4"
                            ) {

                                return caches.delete(
                                    key
                                );

                            }


                            return null;

                        })

                    );

                })

                .then(() =>
                    self.clients.claim()
                )

        );

    }
);


/* ==================================================
   FETCH
================================================== */

self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        /*
           Only handle GET.
        */

        if (
            request.method !== "GET"
        ) {

            return;

        }


        const url =
            new URL(
                request.url
            );


        /*
           IMPORTANT:

           GitHub images/API are NOT put into
           the app cache here.

           app.js controls song image caching.
        */

        if (
            url.origin !==
            self.location.origin
        ) {

            return;

        }


        /*
           Same-origin app files:
           Network first,
           cache fallback.
        */

        event.respondWith(

            fetch(request)
                .then(response => {

                    if (
                        response &&
                        response.ok
                    ) {

                        const copy =
                            response.clone();

                        caches.open(
                            CACHE_NAME
                        )
                        .then(cache => {

                            cache.put(
                                request,
                                copy
                            );

                        });

                    }


                    return response;

                })

                .catch(() => {

                    return caches.match(
                        request
                    );

                })

        );

    }
);
