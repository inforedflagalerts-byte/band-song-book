const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY = "bandSongBookData_v5";
const IMAGE_CACHE = "song-book-images-v5";

let chords = [];
let lyrics = [];

/* =========================
   DOM
========================= */

const $ = id => document.getElementById(id);

const chordsBtn = $("chordsBtn");
const lyricsBtn = $("lyricsBtn");

const chordsSection = $("chordsSection");
const lyricsSection = $("lyricsSection");

const chordList = $("chordList");
const lyricList = $("lyricList");

const chordSearch = $("chordSearch");
const lyricSearch = $("lyricSearch");

const viewer = $("viewer");
const viewerBody = $("viewerBody");
const viewerImage = $("viewerImage");

const viewerLoading = $("viewerLoading");
const viewerError = $("viewerError");

const status = $("status");


/* =========================
   SERVICE WORKER
========================= */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {

        navigator.serviceWorker
            .register("./sw.js")
            .then(() => {
                console.log("Service Worker registered");
            })
            .catch(error => {
                console.log("Service Worker error:", error);
            });

    });
}


/* =========================
   ONLINE STATUS
========================= */

function updateStatus() {

    if (!status) return;

    if (navigator.onLine) {

        status.textContent = "● Online";
        status.style.color = "#8ed89b";

    } else {

        status.textContent = "● Offline Ready";
        status.style.color = "#c59dd9";

    }

}

updateStatus();

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);


/* =========================
   HELPERS
========================= */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


function imageURL(file) {

    return file.download_url || file.html_url || "";

}


/* =========================
   LOAD FOLDER
========================= */

async function loadFolder(folder) {

    try {

        const response = await fetch(
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

        const files = await response.json();

        return files

            .filter(file =>

                file.type === "file" &&
                /\.(jpg|jpeg|png|webp|gif)$/i.test(file.name)

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


/* =========================
   LIST CACHE
========================= */

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


function loadListData() {

    try {

        const saved =
            localStorage.getItem(LIST_CACHE_KEY);

        if (!saved) return false;

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


/* =========================
   IMAGE CACHE
========================= */

async function getImageCache() {

    if (!("caches" in window)) {

        return null;

    }

    return await caches.open(IMAGE_CACHE);

}


async function getCachedImageURL(url) {

    const cache =
        await getImageCache();

    if (!cache) return null;

    const response =
        await cache.match(url);

    if (!response) return null;

    const blob =
        await response.blob();

    return URL.createObjectURL(blob);

}


async function downloadAndCacheImage(url) {

    const cache =
        await getImageCache();


    /* Check cache first */

    if (cache) {

        const existing =
            await cache.match(url);

        if (existing) {

            const blob =
                await existing.blob();

            return URL.createObjectURL(blob);

        }

    }


    /* Offline */

    if (!navigator.onLine) {

        throw new Error(
            "OFFLINE_IMAGE_NOT_SAVED"
        );

    }


    /* Download ORIGINAL image */

    const response =
        await fetch(url, {

            cache: "no-store",
            mode: "cors"

        });


    if (!response.ok) {

        throw new Error(
            `Image download failed: ${response.status}`
        );

    }


    /*
       IMPORTANT

       We save the ORIGINAL response.

       No canvas.
       No resizing.
       No compression.
    */

    if (cache) {

        await cache.put(
            url,
            response.clone()
        );

    }


    const blob =
        await response.blob();

    return URL.createObjectURL(blob);

}


/* =========================
   LOAD DATA
========================= */

async function loadData() {

    chordList.innerHTML =
        `<div class="empty">
            🎸 Loading library...
        </div>`;

    lyricList.innerHTML =
        `<div class="empty">
            🎤 Loading library...
        </div>`;


    /* Load saved list */

    loadListData();

    renderChords(chords);
    renderLyrics(lyrics);


    /* Offline */

    if (!navigator.onLine) {

        return;

    }


    /* Get latest GitHub list */

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


/* =========================
   SONG ITEM
========================= */

function createSongItem(file, type) {

    const item =
        document.createElement("div");

    item.className = "song-item";


    const icon =
        document.createElement("div");

    icon.className = "song-icon";

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
                imageURL(file)
            );

        }
    );


    return item;

}


/* =========================
   RENDER CHORDS
========================= */

function renderChords(list) {

    const count =
        $("chordCount");

    if (count) {

        count.textContent =
            list.length;

    }


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


/* =========================
   RENDER LYRICS
========================= */

function renderLyrics(list) {

    const count =
        $("lyricCount");

    if (count) {

        count.textContent =
            list.length;

    }


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
   HIGH QUALITY IMAGE VIEWER
===================================================== */

let currentObjectURL = null;


/* Zoom values */

let zoomScale = 1;

let zoomX = 0;
let zoomY = 0;

let minZoom = 1;
let maxZoom = 1;


/* Mouse drag */

let isDragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragOriginX = 0;
let dragOriginY = 0;


/* Pinch */

let pinchActive = false;

let pinchStartDistance = 0;
let pinchStartScale = 1;

let pinchStartMidX = 0;
let pinchStartMidY = 0;

let pinchStartX = 0;
let pinchStartY = 0;


/* Double tap */

let lastTapTime = 0;


/* =========================
   CLAMP
========================= */

function clamp(
    value,
    min,
    max
) {

    return Math.min(
        Math.max(value, min),
        max
    );

}


/* =========================
   SMART MAX ZOOM
========================= */

function calculateSmartZoomLimit() {

    if (
        !viewerImage.naturalWidth ||
        !viewerImage.naturalHeight
    ) {

        maxZoom = 1;

        return;

    }


    const rect =
        viewerImage.getBoundingClientRect();


    if (
        !rect.width ||
        !rect.height
    ) {

        maxZoom = 1;

        return;

    }


    /*
       Natural image pixels / screen pixels
    */

    const nativeScaleX =
        viewerImage.naturalWidth /
        rect.width;


    const nativeScaleY =
        viewerImage.naturalHeight /
        rect.height;


    /*
       Use the smaller ratio.

       This means we don't unnecessarily
       upscale beyond the real source
       resolution in both directions.
    */

    const nativeZoom =
        Math.min(
            nativeScaleX,
            nativeScaleY
        );


    /*
       Maximum 4x browser zoom.

       High resolution images can use
       the full 4x.
    */

    maxZoom =
        Math.max(
            1,
            Math.min(
                4,
                nativeZoom
            )
        );

}


/* =========================
   APPLY ZOOM
========================= */

function applyZoom() {

    if (!viewerImage) return;


    zoomScale =
        clamp(
            zoomScale,
            minZoom,
            maxZoom
        );


    if (zoomScale === 1) {

        zoomX = 0;
        zoomY = 0;

    }


    viewerImage.style.transform =

        `translate3d(
            ${zoomX}px,
            ${zoomY}px,
            0
        )
        scale(${zoomScale})`;

}


/* =========================
   RESET ZOOM
========================= */

function resetZoom() {

    zoomScale = 1;

    zoomX = 0;
    zoomY = 0;

    minZoom = 1;

    calculateSmartZoomLimit();

    applyZoom();

}


/* =========================
   SET ZOOM
========================= */

function setZoom(
    newScale,
    centerX = window.innerWidth / 2,
    centerY = window.innerHeight / 2
) {

    if (
        !viewerImage ||
        viewerImage.classList.contains("hidden")
    ) {

        return;

    }


    const oldScale =
        zoomScale;


    const nextScale =
        clamp(
            newScale,
            minZoom,
            maxZoom
        );


    if (nextScale === oldScale) {

        return;

    }


    /*
       Zoom toward pointer/finger.
    */

    const ratio =
        nextScale /
        oldScale;


    zoomX =
        centerX -
        (centerX - zoomX) *
        ratio;


    zoomY =
        centerY -
        (centerY - zoomY) *
        ratio;


    zoomScale =
        nextScale;


    if (zoomScale === 1) {

        zoomX = 0;
        zoomY = 0;

    }


    applyZoom();

}


/* =========================
   TOUCH HELPERS
========================= */

function touchDistance(
    t1,
    t2
) {

    const dx =
        t2.clientX -
        t1.clientX;

    const dy =
        t2.clientY -
        t1.clientY;


    return Math.sqrt(
        dx * dx +
        dy * dy
    );

}


function touchMidpoint(
    t1,
    t2
) {

    return {

        x:
            (t1.clientX +
             t2.clientX) / 2,

        y:
            (t1.clientY +
             t2.clientY) / 2

    };

}


/* =========================
   VIEWER STATE
========================= */

function setViewerState(state) {

    if (viewerLoading) {

        viewerLoading.classList.toggle(
            "hidden",
            state !== "loading"
        );

    }


    if (viewerError) {

        viewerError.classList.toggle(
            "hidden",
            state !== "error"
        );

    }

}


/* =========================
   SHOW VIEWER
========================= */

function showViewerShell() {

    viewer.classList.remove(
        "hidden"
    );

    viewer.setAttribute(
        "aria-hidden",
        "false"
    );


    document.body.style.overflow =
        "hidden";


    resetZoom();

}


/* =========================
   FULLSCREEN
========================= */

async function enterFullscreen() {

    try {

        if (
            viewer &&
            document.fullscreenEnabled &&
            !document.fullscreenElement
        ) {

            await viewer.requestFullscreen();

        }

    } catch (error) {

        console.log(
            "Fullscreen unavailable:",
            error
        );

    }

}


async function exitFullscreen() {

    try {

        if (document.fullscreenElement) {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.log(
            "Fullscreen exit error:",
            error
        );

    }

}


/* =========================
   OPEN VIEWER
========================= */

async function openViewer(image) {

    if (!image) return;


    /*
       Show viewer immediately.
    */

    showViewerShell();


    /*
       IMPORTANT:

       Fullscreen request happens BEFORE
       async downloading.
    */

    enterFullscreen();


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
           First check local cache.
        */

        let localURL =
            await getCachedImageURL(
                image
            );


        /*
           Not cached:
           download ONLY this image.
        */

        if (!localURL) {

            if (!navigator.onLine) {

                throw new Error(
                    "OFFLINE_IMAGE_NOT_SAVED"
                );

            }


            localURL =
                await downloadAndCacheImage(
                    image
                );

        }


        currentObjectURL =
            localURL;


        /*
           Wait for browser to fully
           decode the original image.
        */

        viewerImage.onload =
            () => {

                requestAnimationFrame(
                    () => {

                        /*
                           Read REAL natural
                           image dimensions.
                        */

                        calculateSmartZoomLimit();

                        resetZoom();


                        viewerImage.classList.remove(
                            "hidden"
                        );


                        setViewerState(
                            "ready"
                        );

                    }
                );

            };


        viewerImage.onerror =
            () => {

                viewerImage.classList.add(
                    "hidden"
                );

                setViewerState(
                    "error"
                );

            };


        /*
           Give browser the original
           blob URL.
        */

        viewerImage.src =
            localURL;


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


/* =========================
   CLOSE VIEWER
========================= */

async function closeImageViewer() {

    const oldURL =
        currentObjectURL;


    currentObjectURL =
        null;


    viewerImage.removeAttribute(
        "src"
    );

    viewerImage.classList.add(
        "hidden"
    );


    viewer.classList.add(
        "hidden"
    );

    viewer.setAttribute(
        "aria-hidden",
        "true"
    );


    document.body.style.overflow =
        "";


    resetZoom();


    if (
        oldURL &&
        oldURL.startsWith("blob:")
    ) {

        setTimeout(
            () => {

                try {

                    URL.revokeObjectURL(
                        oldURL
                    );

                } catch (error) {}

            },
            0
        );

    }


    await exitFullscreen();

}


/* =====================================================
   PC WHEEL ZOOM
===================================================== */

viewerBody.addEventListener(
    "wheel",
    event => {

        if (
            viewer.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        event.preventDefault();


        const rect =
            viewerBody.getBoundingClientRect();


        const pointerX =
            event.clientX -
            rect.left;


        const pointerY =
            event.clientY -
            rect.top;


        const zoomFactor =
            event.deltaY < 0
                ? 1.15
                : 1 / 1.15;


        setZoom(

            zoomScale *
            zoomFactor,

            pointerX,
            pointerY

        );

    },
    {
        passive: false
    }
);


/* =====================================================
   PC MOUSE DRAG
===================================================== */

viewerBody.addEventListener(
    "mousedown",
    event => {

        if (
            zoomScale <= 1
        ) {

            return;

        }


        if (
            event.button !== 0
        ) {

            return;

        }


        isDragging = true;


        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;


        dragOriginX =
            zoomX;

        dragOriginY =
            zoomY;


        viewerBody.classList.add(
            "dragging"
        );


        event.preventDefault();

    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!isDragging) return;


        zoomX =
            dragOriginX +
            (
                event.clientX -
                dragStartX
            );


        zoomY =
            dragOriginY +
            (
                event.clientY -
                dragStartY
            );


        applyZoom();


        event.preventDefault();

    }
);


window.addEventListener(
    "mouseup",
    () => {

        isDragging = false;

        viewerBody.classList.remove(
            "dragging"
        );

    }
);


/* =====================================================
   MOBILE PINCH ZOOM + DRAG
===================================================== */

viewerBody.addEventListener(
    "touchstart",
    event => {

        /*
           Two fingers = pinch
        */

        if (
            event.touches.length === 2
        ) {

            pinchActive = true;

            isDragging = false;


            const t1 =
                event.touches[0];

            const t2 =
                event.touches[1];


            pinchStartDistance =
                touchDistance(
                    t1,
                    t2
                );


            pinchStartScale =
                zoomScale;


            const mid =
                touchMidpoint(
                    t1,
                    t2
                );


            pinchStartMidX =
                mid.x;

            pinchStartMidY =
                mid.y;


            pinchStartX =
                zoomX;

            pinchStartY =
                zoomY;


            event.preventDefault();

            return;

        }


        /*
           One finger while zoomed =
           drag image
        */

        if (
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            const touch =
                event.touches[0];


            isDragging = true;


            dragStartX =
                touch.clientX;

            dragStartY =
                touch.clientY;


            dragOriginX =
                zoomX;

            dragOriginY =
                zoomY;


            event.preventDefault();

        }

    },
    {
        passive: false
    }
);


viewerBody.addEventListener(
    "touchmove",
    event => {

        /*
           PINCH
        */

        if (
            event.touches.length === 2 &&
            pinchActive
        ) {

            const t1 =
                event.touches[0];

            const t2 =
                event.touches[1];


            const distance =
                touchDistance(
                    t1,
                    t2
                );


            if (
                pinchStartDistance <= 0
            ) {

                return;

            }


            const ratio =
                distance /
                pinchStartDistance;


            const nextScale =
                clamp(

                    pinchStartScale *
                    ratio,

                    minZoom,
                    maxZoom

                );


            const mid =
                touchMidpoint(
                    t1,
                    t2
                );


            const scaleRatio =
                nextScale /
                pinchStartScale;


            /*
               Keep pinch point
               under the fingers.
            */

            zoomX =
                mid.x -
                (
                    pinchStartMidX -
                    pinchStartX
                ) *
                scaleRatio;


            zoomY =
                mid.y -
                (
                    pinchStartMidY -
                    pinchStartY
                ) *
                scaleRatio;


            zoomScale =
                nextScale;


            applyZoom();


            event.preventDefault();

            return;

        }


        /*
           DRAG
        */

        if (
            event.touches.length === 1 &&
            isDragging &&
            zoomScale > 1
        ) {

            const touch =
                event.touches[0];


            zoomX =
                dragOriginX +
                (
                    touch.clientX -
                    dragStartX
                );


            zoomY =
                dragOriginY +
                (
                    touch.clientY -
                    dragStartY
                );


            applyZoom();


            event.preventDefault();

        }

    },
    {
        passive: false
    }
);


viewerBody.addEventListener(
    "touchend",
    event => {

        if (
            event.touches.length < 2
        ) {

            pinchActive = false;

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


viewerBody.addEventListener(
    "touchcancel",
    () => {

        pinchActive = false;
        isDragging = false;

    }
);


/* =====================================================
   DOUBLE TAP
===================================================== */

viewerBody.addEventListener(
    "touchend",
    event => {

        if (
            event.changedTouches.length !== 1
        ) {

            return;

        }


        const now =
            Date.now();


        if (
            now - lastTapTime < 280
        ) {

            /*
               Already zoomed = reset
            */

            if (zoomScale > 1) {

                resetZoom();

            } else {

                /*
                   Normal = 2x
                */

                const touch =
                    event.changedTouches[0];


                setZoom(

                    Math.min(
                        2,
                        maxZoom
                    ),

                    touch.clientX,
                    touch.clientY

                );

            }

        }


        lastTapTime =
            now;

    },
    {
        passive: true
    }
);


/* =====================================================
   WINDOW RESIZE
===================================================== */

window.addEventListener(
    "resize",
    () => {

        if (
            viewer.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        requestAnimationFrame(
            () => {

                calculateSmartZoomLimit();


                if (
                    zoomScale >
                    maxZoom
                ) {

                    zoomScale =
                        maxZoom;

                }


                applyZoom();

            }
        );

    }
);


/* =====================================================
   KEYBOARD
===================================================== */

document.addEventListener(
    "keydown",
    event => {

        /*
           Escape closes viewer
        */

        if (
            event.key === "Escape" &&
            !viewer.classList.contains(
                "hidden"
            )
        ) {

            closeImageViewer();

        }


        /*
           R = reset zoom
        */

        if (
            event.key.toLowerCase() === "r" &&
            !viewer.classList.contains(
                "hidden"
            )
        ) {

            resetZoom();

        }

    }
);


/* =====================================================
   TABS
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
   SEARCH
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
   START APP
===================================================== */

loadData();
