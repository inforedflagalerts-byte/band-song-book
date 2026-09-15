const CACHE_NAME = "band-song-book-v3";

const APP_FILES = [
    "./",
    "./index.html",
    "./style.css",
    "./app.js",
    "./manifest.json"
];


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


self.addEventListener(
    "fetch",
    event => {

        const request =
            event.request;


        if (request.method !== "GET") {
            return;
        }


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
