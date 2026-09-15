const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY = "bandSongBookData_v4";
const IMAGE_CACHE = "song-book-images-v4";

let chords = [];
let lyrics = [];


/* =====================================================
   ELEMENTS
===================================================== */

const chordsBtn = document.getElementById("chordsBtn");
const lyricsBtn = document.getElementById("lyricsBtn");

const chordsSection =
    document.getElementById("chordsSection");

const lyricsSection =
    document.getElementById("lyricsSection");

const chordList =
    document.getElementById("chordList");

const lyricList =
    document.getElementById("lyricList");

const chordSearch =
    document.getElementById("chordSearch");

const lyricSearch =
    document.getElementById("lyricSearch");

const viewer =
    document.getElementById("viewer");

const viewerBody =
    document.getElementById("viewerBody");

const viewerImage =
    document.getElementById("viewerImage");

const viewerTitle =
    document.getElementById("viewerTitle");

const viewerStatus =
    document.getElementById("viewerStatus");

const viewerLoading =
    document.getElementById("viewerLoading");

const viewerError =
    document.getElementById("viewerError");

const closeViewer =
    document.getElementById("closeViewer");

const status =
    document.getElementById("status");


/* =====================================================
   SERVICE WORKER
===================================================== */

if ("serviceWorker" in navigator) {

    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")
            .then(() => {
                console.log(
                    "Service Worker registered"
                );
            })
            .catch(error => {
                console.log(
                    "Service Worker error:",
                    error
                );
            });

    });

}


/* =====================================================
   ONLINE STATUS
===================================================== */

function updateStatus() {

    if (navigator.onLine) {

        status.textContent = "● Online";

        status.style.color = "#8ed89b";

    } else {

        status.textContent =
            "● Offline Ready";

        status.style.color = "#c59dd9";
    }
}

updateStatus();

window.addEventListener(
    "online",
    updateStatus
);

window.addEventListener(
    "offline",
    updateStatus
);


/* =====================================================
   NAME
===================================================== */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


/* =====================================================
   IMAGE URL
===================================================== */

function imageURL(file) {

    return file.download_url ||
        file.html_url ||
        "";
}


/* =====================================================
   LOAD GITHUB FOLDER
===================================================== */

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

            throw new Error(
                `GitHub request failed: ${response.status}`
            );
        }

        const files =
            await response.json();

        return files
            .filter(file =>
                file.type === "file" &&
                /\.(jpg|jpeg|png|webp|gif)$/i
                    .test(file.name)
            )
            .map(file => ({
                name: file.name,
                path: file.path,
                download_url: file.download_url,
                html_url: file.html_url
            }));

    } catch (error) {

        console.log(
            `Could not load ${folder}:`,
            error
        );

        return null;
    }
}


/* =====================================================
   SAVE LIST DATA
===================================================== */

function saveListData() {

    try {

        localStorage.setItem(
            LIST_CACHE_KEY,
            JSON.stringify({
                chords,
                lyrics
            })
        );

    } catch (error) {

        console.log(
            "List storage error:",
            error
        );
    }
}


/* =====================================================
   LOAD LIST DATA
===================================================== */

function loadListData() {

    try {

        const saved =
            localStorage.getItem(
                LIST_CACHE_KEY
            );

        if (!saved) {
            return false;
        }

        const data =
            JSON.parse(saved);

        if (Array.isArray(data.chords)) {
            chords = data.chords;
        }

        if (Array.isArray(data.lyrics)) {
            lyrics = data.lyrics;
        }

        return true;

    } catch (error) {

        console.log(
            "Offline list error:",
            error
        );

        chords = [];
        lyrics = [];

        return false;
    }
}


/* =====================================================
   IMAGE CACHE
===================================================== */

async function getImageCache() {

    if (!("caches" in window)) {
        return null;
    }

    return await caches.open(
        IMAGE_CACHE
    );
}


/* =====================================================
   GET CACHED IMAGE
===================================================== */

async function getCachedImageURL(url) {

    const cache =
        await getImageCache();

    if (!cache) {
        return null;
    }

    const response =
        await cache.match(url);

    if (!response) {
        return null;
    }

    const blob =
        await response.blob();

    return URL.createObjectURL(blob);
}


/* =====================================================
   DOWNLOAD + SAVE IMAGE
===================================================== */

async function downloadAndCacheImage(url) {

    const cache =
        await getImageCache();

    if (!cache) {

        const response =
            await fetch(
                url,
                {
                    cache: "no-store"
                }
            );

        if (!response.ok) {

            throw new Error(
                "Image download failed"
            );
        }

        const blob =
            await response.blob();

        return URL.createObjectURL(
            blob
        );
    }


    /* Already saved */

    const existing =
        await cache.match(url);

    if (existing) {

        const blob =
            await existing.blob();

        return URL.createObjectURL(
            blob
        );
    }


    /* Offline */

    if (!navigator.onLine) {

        throw new Error(
            "OFFLINE_IMAGE_NOT_SAVED"
        );
    }


    /* Download */

    const response =
        await fetch(
            url,
            {
                cache: "no-store",
                mode: "cors"
            }
        );

    if (!response.ok) {

        throw new Error(
            "Image download failed"
        );
    }


    /* Save a copy */

    const copy =
        response.clone();

    await cache.put(
        url,
        copy
    );


    const blob =
        await response.blob();

    return URL.createObjectURL(
        blob
    );
}


/* =====================================================
   LOAD DATA
===================================================== */

async function loadData() {

    chordList.innerHTML =
        `<div class="empty">
            🎸 Loading library...
        </div>`;

    lyricList.innerHTML =
        `<div class="empty">
            🎤 Loading library...
        </div>`;


    loadListData();


    renderChords(chords);
    renderLyrics(lyrics);


    if (!navigator.onLine) {
        return;
    }


    const [
        newChords,
        newLyrics
    ] = await Promise.all([
        loadFolder("chords"),
        loadFolder("lyrics")
    ]);


    if (newChords !== null) {
        chords = newChords;
    }

    if (newLyrics !== null) {
        lyrics = newLyrics;
    }


    saveListData();


    renderChords(chords);
    renderLyrics(lyrics);
}


/* =====================================================
   CREATE SONG ITEM
===================================================== */

function createSongItem(file, type) {

    const item =
        document.createElement("div");

    item.className =
        "song-item";


    const icon =
        document.createElement("div");

    icon.className =
        "song-icon";

    icon.textContent =
        type === "chord"
            ? "🎸"
            : "🎤";


    const details =
        document.createElement("div");

    details.className =
        "song-details";


    const name =
        document.createElement("div");

    name.className =
        "song-name";

    name.textContent =
        cleanName(file.name);


    const sub =
        document.createElement("div");

    sub.className =
        "song-type";

    sub.textContent =
        type === "chord"
            ? "Chord Sheet • Tap to open"
            : "Lyrics • Tap to open";


    details.appendChild(name);
    details.appendChild(sub);


    const arrow =
        document.createElement("div");

    arrow.className =
        "song-arrow";

    arrow.textContent = "›";


    item.appendChild(icon);
    item.appendChild(details);
    item.appendChild(arrow);


    item.addEventListener(
        "click",
        () => {

            openViewer(
                imageURL(file),
                cleanName(file.name)
            );

        }
    );


    return item;
}


/* =====================================================
   RENDER CHORDS
===================================================== */

function renderChords(list) {

    document.getElementById(
        "chordCount"
    ).textContent = list.length;


    chordList.innerHTML = "";


    if (!list.length) {

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
                "chord"
            )
        );

    });
}


/* =====================================================
   RENDER LYRICS
===================================================== */

function renderLyrics(list) {

    document.getElementById(
        "lyricCount"
    ).textContent = list.length;


    lyricList.innerHTML = "";


    if (!list.length) {

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
                "lyric"
            )
        );

    });
}


/* =====================================================
   VIEWER STATE
===================================================== */

function setViewerState(state) {

    viewerLoading.classList.toggle(
        "hidden",
        state !== "loading"
    );

    viewerError.classList.toggle(
        "hidden",
        state !== "error"
    );


    if (state === "loading") {

        viewerStatus.textContent =
            navigator.onLine
                ? "Downloading & saving this image..."
                : "Checking saved image...";
    }


    if (state === "ready") {

        viewerStatus.textContent =
            "Saved on this device • Offline ready";
    }


    if (state === "error") {

        viewerStatus.textContent =
            "Not saved on this device";
    }
}


/* =====================================================
   ZOOM SYSTEM
===================================================== */

let zoomScale = 1;

let zoomX = 0;
let zoomY = 0;

let startDistance = 0;
let startScale = 1;

let startPanX = 0;
let startPanY = 0;

let startPointerX = 0;
let startPointerY = 0;

let isDragging = false;

let lastTapTime = 0;

const MIN_ZOOM = 1;

const MAX_ZOOM = 4;


/* =====================================================
   APPLY ZOOM
===================================================== */

function applyZoom() {

    viewerImage.style.transform =
        `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;

}


/* =====================================================
   RESET ZOOM
===================================================== */

function resetZoom() {

    zoomScale = 1;

    zoomX = 0;
    zoomY = 0;

    viewerImage.style.transform =
        "translate3d(0, 0, 0) scale(1)";

    viewerImage.style.maxWidth =
        "100%";

    viewerImage.style.maxHeight =
        "100%";

    viewerBody.scrollLeft = 0;
    viewerBody.scrollTop = 0;
}


/* =====================================================
   SET ZOOM
===================================================== */

function setZoom(scale) {

    zoomScale =
        Math.max(
            MIN_ZOOM,
            Math.min(
                MAX_ZOOM,
                scale
            )
        );


    if (zoomScale === 1) {

        zoomX = 0;
        zoomY = 0;

        viewerImage.style.maxWidth =
            "100%";

        viewerImage.style.maxHeight =
            "100%";

    } else {

        /*
         * Allow image to become larger
         * than the viewer when zoomed.
         */
        viewerImage.style.maxWidth =
            "none";

        viewerImage.style.maxHeight =
            "none";
    }


    applyZoom();
}


/* =====================================================
   DISTANCE BETWEEN TWO TOUCH POINTS
===================================================== */

function getTouchDistance(touches) {

    const dx =
        touches[0].clientX -
        touches[1].clientX;

    const dy =
        touches[0].clientY -
        touches[1].clientY;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


/* =====================================================
   TOUCH START
===================================================== */

viewerImage.addEventListener(
    "touchstart",
    event => {

        if (event.touches.length === 2) {

            event.preventDefault();

            startDistance =
                getTouchDistance(
                    event.touches
                );

            startScale =
                zoomScale;

            isDragging = false;

            return;
        }


        if (event.touches.length === 1) {

            const now =
                Date.now();


            /*
             * Double tap
             */
            if (
                now - lastTapTime <
                300
            ) {

                event.preventDefault();


                if (zoomScale > 1) {

                    resetZoom();

                } else {

                    setZoom(2.2);

                }


                lastTapTime = 0;

                return;
            }


            lastTapTime = now;


            if (zoomScale > 1) {

                startPointerX =
                    event.touches[0].clientX;

                startPointerY =
                    event.touches[0].clientY;

                startPanX = zoomX;
                startPanY = zoomY;

                isDragging = true;

            }
        }

    },
    {
        passive: false
    }
);


/* =====================================================
   TOUCH MOVE
===================================================== */

viewerImage.addEventListener(
    "touchmove",
    event => {

        /*
         * PINCH ZOOM
         */
        if (event.touches.length === 2) {

            event.preventDefault();


            const distance =
                getTouchDistance(
                    event.touches
                );


            if (!startDistance) {
                return;
            }


            const ratio =
                distance /
                startDistance;


            setZoom(
                startScale *
                ratio
            );


            return;
        }


        /*
         * DRAG
         */
        if (
            event.touches.length === 1 &&
            zoomScale > 1 &&
            isDragging
        ) {

            event.preventDefault();


            const currentX =
                event.touches[0].clientX;

            const currentY =
                event.touches[0].clientY;


            zoomX =
                startPanX +
                (
                    currentX -
                    startPointerX
                );

            zoomY =
                startPanY +
                (
                    currentY -
                    startPointerY
                );


            applyZoom();
        }

    },
    {
        passive: false
    }
);


/* =====================================================
   TOUCH END
===================================================== */

viewerImage.addEventListener(
    "touchend",
    event => {

        if (
            event.touches.length <
            2
        ) {

            startDistance = 0;
        }


        if (
            event.touches.length === 0
        ) {

            isDragging = false;
        }

    },
    {
        passive: false
    }
);


/* =====================================================
   MOUSE WHEEL ZOOM
===================================================== */

viewerBody.addEventListener(
    "wheel",
    event => {

        if (!viewerImage.src) {
            return;
        }


        event.preventDefault();


        const amount =
            event.deltaY < 0
                ? 0.15
                : -0.15;


        setZoom(
            zoomScale +
            amount
        );

    },
    {
        passive: false
    }
);


/* =====================================================
   DOUBLE CLICK PC
===================================================== */

viewerImage.addEventListener(
    "dblclick",
    event => {

        event.preventDefault();


        if (zoomScale > 1) {

            resetZoom();

        } else {

            setZoom(2.2);

        }

    }
);


/* =====================================================
   OPEN VIEWER
===================================================== */

async function openViewer(
    image,
    title
) {

    if (!image) {
        return;
    }


    viewerTitle.textContent =
        title;


    viewer.classList.remove(
        "hidden"
    );


    viewer.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    viewerBody.scrollTop = 0;
    viewerBody.scrollLeft = 0;


    resetZoom();


    viewerImage.removeAttribute(
        "src"
    );


    viewerImage.classList.add(
        "hidden"
    );


    setViewerState(
        "loading"
    );


    try {

        /*
         * FIRST:
         * Check local saved copy.
         */
        let cachedURL =
            await getCachedImageURL(
                image
            );


        if (cachedURL) {

            viewerImage.src =
                cachedURL;

            viewerImage.classList.remove(
                "hidden"
            );

            resetZoom();

            setViewerState(
                "ready"
            );

            return;
        }


        /*
         * No saved copy + offline.
         */
        if (!navigator.onLine) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );
        }


        /*
         * Online:
         * Download and save only this image.
         */
        const localURL =
            await downloadAndCacheImage(
                image
            );


        viewerImage.src =
            localURL;


        viewerImage.classList.remove(
            "hidden"
        );


        resetZoom();


        setViewerState(
            "ready"
        );


    } catch (error) {

        console.log(
            "Viewer error:",
            error
        );


        viewerImage.removeAttribute(
            "src"
        );


        viewerImage.classList.add(
            "hidden"
        );


        setViewerState(
            "error"
        );
    }
}


/* =====================================================
   CLOSE VIEWER
===================================================== */

function closeImageViewer() {

    viewer.classList.add(
        "hidden"
    );


    viewer.setAttribute(
        "aria-hidden",
        "true"
    );


    const oldURL =
        viewerImage.src;


    viewerImage.removeAttribute(
        "src"
    );


    viewerImage.classList.add(
        "hidden"
    );


    resetZoom();


    document.body.style.overflow =
        "";


    if (
        oldURL &&
        oldURL.startsWith("blob:")
    ) {

        setTimeout(
            () => {

                URL.revokeObjectURL(
                    oldURL
                );

            },
            0
        );
    }
}


/* =====================================================
   CLOSE BUTTON
===================================================== */

closeViewer.addEventListener(
    "click",
    closeImageViewer
);


/* =====================================================
   CLICK OUTSIDE VIEWER
===================================================== */

viewer.addEventListener(
    "click",
    event => {

        if (
            event.target === viewer ||
            event.target === viewerBody
        ) {

            closeImageViewer();
        }

    }
);


/* =====================================================
   ESC KEY
===================================================== */

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


/* =====================================================
   SEARCH CHORDS
===================================================== */

chordSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        renderChords(
            chords.filter(
                file =>
                    cleanName(
                        file.name
                    )
                    .toLowerCase()
                    .includes(text)
            )
        );

    }
);


/* =====================================================
   SEARCH LYRICS
===================================================== */

lyricSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        renderLyrics(
            lyrics.filter(
                file =>
                    cleanName(
                        file.name
                    )
                    .toLowerCase()
                    .includes(text)
            )
        );

    }
);


/* =====================================================
   CHORD TAB
===================================================== */

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


/* =====================================================
   LYRICS TAB
===================================================== */

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


/* =====================================================
   START
===================================================== */

loadData();
