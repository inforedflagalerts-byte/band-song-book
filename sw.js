const CACHE_NAME = "band-song-book-app-v4";

const IMAGE_CACHE = "song-book-images-v4";


/* =========================================
   APP FILES
========================================= */

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


        /*
           Activate new SW immediately
        */

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

            caches
                .keys()
                .then(keys => {

                    return Promise.all(

                        keys
                            .filter(
                                key =>
                                    key !== CACHE_NAME &&
                                    key !== IMAGE_CACHE
                            )
                            .map(
                                key =>
                                    caches.delete(key)
                            )

                    );

                })

        );


        /*
           Take control of open pages
        */

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
           Only GET requests
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


        /* =====================================
           GITHUB API

           DO NOT CACHE

           app.js handles the song list.
        ===================================== */

        if (
            url.hostname ===
            "api.github.com"
        ) {

            return;

        }


        /* =====================================
           SONG IMAGES

           DO NOT AUTOMATICALLY CACHE

           app.js downloads an image ONLY
           after the user clicks it.
        ===================================== */

        if (

            url.hostname ===
            "raw.githubusercontent.com"

            &&

            (
                url.pathname.includes(
                    "/chords/"
                )

                ||

                url.pathname.includes(
                    "/lyrics/"
                )
            )

        ) {

            return;

        }


        /* =====================================
           APP SHELL

           NETWORK FIRST
           CACHE FALLBACK
        ===================================== */

        event.respondWith(

            fetch(request)

                .then(
                    response => {

                        /*
                           Save successful app files
                        */

                        if (
                            response &&
                            response.ok
                        ) {

                            const copy =
                                response.clone();


                            caches
                                .open(
                                    CACHE_NAME
                                )
                                .then(
                                    cache => {

                                        cache.put(
                                            request,
                                            copy
                                        );

                                    }
                                );

                        }


                        return response;

                    }
                )

                .catch(
                    () => {

                        /*
                           Internet unavailable:
                           use saved app shell
                        */

                        return caches.match(
                            request
                        );

                    }
                )

        );

    }
);
