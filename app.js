```javascript
const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API =
    `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const IMAGE_CACHE = "song-book-images-v2";

let chords = [];
let lyrics = [];

const chordsBtn = document.getElementById("chordsBtn");
const lyricsBtn = document.getElementById("lyricsBtn");

const chordsSection = document.getElementById("chordsSection");
const lyricsSection = document.getElementById("lyricsSection");

const chordList = document.getElementById("chordList");
const lyricList = document.getElementById("lyricList");

const chordSearch = document.getElementById("chordSearch");
const lyricSearch = document.getElementById("lyricSearch");

const viewer = document.getElementById("viewer");
const viewerImage = document.getElementById("viewerImage");
const viewerTitle = document.getElementById("viewerTitle");
const closeViewer = document.getElementById("closeViewer");

const status = document.getElementById("status");


/* =========================================
   SERVICE WORKER
========================================= */

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")
            .catch(error => {
                console.log("Service worker error:", error);
            });

    });

}


/* =========================================
   ONLINE STATUS
========================================= */

function updateStatus() {

    if (navigator.onLine) {

        status.textContent = "● Online";
        status.style.color = "#73b87b";

    } else {

        status.textContent = "● Offline Ready";
        status.style.color = "#9a829f";

    }

}

updateStatus();

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);


/* =========================================
   NAME CLEANER
========================================= */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/* =========================================
   LOAD GITHUB FOLDER
========================================= */

async function loadFolder(folder) {

    try {

        const response =
            await fetch(
                `${API}/${folder}?ref=${BRANCH}`,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {
            throw new Error("GitHub request failed");
        }

        const files =
            await response.json();

        return files.filter(file => {

            return (
                file.type === "file" &&
                /\.(jpg|jpeg|png|webp)$/i.test(file.name)
            );

        });

    } catch (error) {

        console.log(
            `Could not load ${folder}:`,
            error
        );

        return null;

    }

}


/* =========================================
   SAVE OFFLINE SONG LIST
========================================= */

function saveOfflineData() {

    try {

        localStorage.setItem(
            "bandSongBookChords",
            JSON.stringify(chords)
        );

        localStorage.setItem(
            "bandSongBookLyrics",
            JSON.stringify(lyrics)
        );

    } catch (error) {

        console.log(
            "Local storage save error:",
            error
        );

    }

}


/* =========================================
   LOAD OFFLINE SONG LIST
========================================= */

function loadOfflineData() {

    try {

        const savedChords =
            localStorage.getItem(
                "bandSongBookChords"
            );

        const savedLyrics =
            localStorage.getItem(
                "bandSongBookLyrics"
            );


        if (savedChords) {

            chords =
                JSON.parse(savedChords);

        }


        if (savedLyrics) {

            lyrics =
                JSON.parse(savedLyrics);

        }

    } catch (error) {

        console.log(
            "Offline data error:",
            error
        );

        chords = [];
        lyrics = [];

    }

}


/* =========================================
   CACHE ONLY NEW IMAGES
========================================= */

async function cacheImages(files) {

    if (!("caches" in window)) {
        return;
    }


    try {

        const cache =
            await caches.open(
                IMAGE_CACHE
            );


        for (const file of files) {

            try {

                const existing =
                    await cache.match(
                        file.download_url
                    );


                if (existing) {

                    console.log(
                        "Already cached:",
                        file.name
                    );

                    continue;

                }


                console.log(
                    "Downloading new image:",
                    file.name
                );

                await cache.add(
                    file.download_url
                );


            } catch (error) {

                console.log(
                    "Image cache skipped:",
                    file.name
                );

            }

        }

    } catch (error) {

        console.log(
            "Image cache error:",
            error
        );

    }

}


/* =========================================
   GET CACHED IMAGE
========================================= */

async function getImageURL(url) {

    if (!("caches" in window)) {

        return url;

    }


    try {

        const response =
            await caches.match(url);


        if (response) {

            const blob =
                await response.blob();

            return URL.createObjectURL(
                blob
            );

        }

    } catch (error) {

        console.log(
            "Cached image error:",
            error
        );

    }


    return url;

}


/* =========================================
   LOAD DATA
========================================= */

async function loadData() {

    chordList.innerHTML =
        `<div class="empty">🎸 Loading...</div>`;

    lyricList.innerHTML =
        `<div class="empty">🎤 Loading...</div>`;


    loadOfflineData();


    renderChords(chords);
    renderLyrics(lyrics);


    if (!navigator.onLine) {

        return;

    }


    const newChords =
        await loadFolder("chords");

    const newLyrics =
        await loadFolder("lyrics");


    /* =====================================
       UPDATE CHORDS
    ===================================== */

    if (newChords !== null) {

        chords = newChords;


        localStorage.setItem(
            "bandSongBookChords",
            JSON.stringify(chords)
        );


        cacheImages(chords);

    }


    /* =====================================
       UPDATE LYRICS
    ===================================== */

    if (newLyrics !== null) {

        lyrics = newLyrics;


        localStorage.setItem(
            "bandSongBookLyrics",
            JSON.stringify(lyrics)
        );


        cacheImages(lyrics);

    }


    renderChords(chords);
    renderLyrics(lyrics);

}


/* =========================================
   CREATE SONG ITEM
========================================= */

function createSongItem(file, type) {

    const item =
        document.createElement("div");

    item.className =
        "song-item";


    const name =
        cleanName(file.name);


    item.innerHTML = `

        <div class="thumbnail">

            <img
                src="${file.download_url}"
                alt=""
                loading="lazy"
            >

        </div>


        <div class="song-details">

            <div class="song-name">
                ${name}
            </div>

            <div class="song-type">
                ${type}
            </div>

        </div>


        <div class="arrow">
            ›
        </div>

    `;


    item.addEventListener(
        "click",
        () => {

            openViewer(
                file.download_url,
                name
            );

        }
    );


    return item;

}


/* =========================================
   RENDER CHORDS
========================================= */

function renderChords(list) {

    document.getElementById(
        "chordCount"
    ).textContent =
        list.length;


    chordList.innerHTML = "";


    if (list.length === 0) {

        chordList.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🎸
                </div>

                No chord sheets available.

            </div>

        `;

        return;

    }


    list.forEach(file => {

        chordList.appendChild(

            createSongItem(
                file,
                "🎸 Chord Sheet"
            )

        );

    });

}


/* =========================================
   RENDER LYRICS
========================================= */

function renderLyrics(list) {

    document.getElementById(
        "lyricCount"
    ).textContent =
        list.length;


    lyricList.innerHTML = "";


    if (list.length === 0) {

        lyricList.innerHTML = `

            <div class="empty">

                <div class="empty-icon">
                    🎤
                </div>

                No lyrics available.

            </div>

        `;

        return;

    }


    list.forEach(file => {

        lyricList.appendChild(

            createSongItem(
                file,
                "🎤 Lyrics"
            )

        );

    });

}


/* =========================================
   OPEN FULL SCREEN VIEWER
========================================= */

async function openViewer(
    image,
    title
) {

    viewerTitle.textContent =
        title;


    viewer.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";


    /* Reset zoom */

    zoomScale = 1;
    translateX = 0;
    translateY = 0;

    updateImageTransform();


    const cachedURL =
        await getImageURL(image);


    viewerImage.src =
        cachedURL;

}


/* =========================================
   PINCH ZOOM SYSTEM
========================================= */

let zoomScale = 1;

let translateX = 0;
let translateY = 0;

let startDistance = 0;
let startScale = 1;

let startX = 0;
let startY = 0;

let startTranslateX = 0;
let startTranslateY = 0;


/* =========================================
   UPDATE IMAGE POSITION
========================================= */

function updateImageTransform() {

    viewerImage.style.transform =
        `translate3d(${translateX}px, ${translateY}px, 0) scale(${zoomScale})`;

}


/* =========================================
   DISTANCE BETWEEN TWO FINGERS
========================================= */

function getTouchDistance(touch1, touch2) {

    const dx =
        touch2.clientX - touch1.clientX;

    const dy =
        touch2.clientY - touch1.clientY;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


/* =========================================
   TOUCH START
========================================= */

viewerImage.addEventListener(
    "touchstart",
    event => {

        /*
         * Two fingers = pinch zoom
         */

        if (event.touches.length === 2) {

            startDistance =
                getTouchDistance(
                    event.touches[0],
                    event.touches[1]
                );

            startScale =
                zoomScale;

        }


        /*
         * One finger = move image
         * when zoomed
         */

        else if (
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            startX =
                event.touches[0].clientX;

            startY =
                event.touches[0].clientY;

            startTranslateX =
                translateX;

            startTranslateY =
                translateY;

        }

    },
    {
        passive: false
    }
);


/* =========================================
   TOUCH MOVE
========================================= */

viewerImage.addEventListener(
    "touchmove",
    event => {

        /*
         * PINCH ZOOM
         */

        if (event.touches.length === 2) {

            event.preventDefault();


            const currentDistance =
                getTouchDistance(
                    event.touches[0],
                    event.touches[1]
                );


            if (startDistance > 0) {

                const ratio =
                    currentDistance /
                    startDistance;


                zoomScale =
                    startScale * ratio;


                /*
                 * Minimum zoom
                 */

                if (zoomScale < 1) {

                    zoomScale = 1;

                }


                /*
                 * Maximum zoom
                 */

                if (zoomScale > 5) {

                    zoomScale = 5;

                }


                updateImageTransform();

            }

        }


        /*
         * MOVE ZOOMED IMAGE
         */

        else if (
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            event.preventDefault();


            const currentX =
                event.touches[0].clientX;

            const currentY =
                event.touches[0].clientY;


            translateX =
                startTranslateX +
                (currentX - startX);

            translateY =
                startTranslateY +
                (currentY - startY);


            updateImageTransform();

        }

    },
    {
        passive: false
    }
);


/* =========================================
   TOUCH END
========================================= */

viewerImage.addEventListener(
    "touchend",
    event => {

        if (event.touches.length < 2) {

            startDistance = 0;

        }

        /*
         * If zoom returns to normal,
         * reset position.
         */

        if (zoomScale <= 1) {

            zoomScale = 1;

            translateX = 0;
            translateY = 0;

            updateImageTransform();

        }

    }
);


/* =========================================
   CLOSE VIEWER
========================================= */

function closeImageViewer() {

    viewer.classList.add(
        "hidden"
    );


    viewerImage.src = "";


    document.body.style.overflow =
        "";


    /*
     * Reset zoom
     */

    zoomScale = 1;

    translateX = 0;
    translateY = 0;

    updateImageTransform();

}


/* =========================================
   CLOSE BUTTON
========================================= */

closeViewer.addEventListener(
    "click",
    closeImageViewer
);


/* =========================================
   TAP OUTSIDE VIEWER
========================================= */

viewer.addEventListener(
    "click",
    event => {

        if (
            event.target === viewer ||
            event.target === document.querySelector(
                ".viewer-body"
            )
        ) {

            closeImageViewer();

        }

    }
);


/* =========================================
   ESC KEY
========================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeImageViewer();

        }

    }
);


/* =========================================
   CHORD SEARCH
========================================= */

chordSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        const result =
            chords.filter(
                file => {

                    return cleanName(
                        file.name
                    )
                    .toLowerCase()
                    .includes(text);

                }
            );


        renderChords(result);

    }
);


/* =========================================
   LYRIC SEARCH
========================================= */

lyricSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        const result =
            lyrics.filter(
                file => {

                    return cleanName(
                        file.name
                    )
                    .toLowerCase()
                    .includes(text);

                }
            );


        renderLyrics(result);

    }
);


/* =========================================
   CHORD TAB
========================================= */

chordsBtn.addEventListener(
    "click",
    () => {

        chordsSection.classList.remove(
            "hidden"
        );

        lyricsSection.classList.add(
            "hidden"
        );

        chordsBtn.classList.add(
            "active"
        );

        lyricsBtn.classList.remove(
            "active"
        );

    }
);


/* =========================================
   LYRICS TAB
========================================= */

lyricsBtn.addEventListener(
    "click",
    () => {

        lyricsSection.classList.remove(
            "hidden"
        );

        chordsSection.classList.add(
            "hidden"
        );

        lyricsBtn.classList.add(
            "active"
        );

        chordsBtn.classList.remove(
            "active"
        );

    }
);


/* =========================================
   START APP
========================================= */

loadData();
```
