/* ==================================================
   BAND SONG BOOK
   CLEAN FINAL APP.JS
   NORMAL VIEWER - NO BROWSER FULLSCREEN
================================================== */

const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API =
    `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY =
    "bandSongBookData_v5";

const IMAGE_CACHE =
    "song-book-images-v5";


/* ==================================================
   DATA
================================================== */

let chords = [];
let lyrics = [];

let viewerRequest = 0;

let currentBlobURL = null;


/* ==================================================
   DOM
================================================== */

const chordsBtn =
    document.getElementById("chordsBtn");

const lyricsBtn =
    document.getElementById("lyricsBtn");

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

const status =
    document.getElementById("status");


/* Viewer */

const viewer =
    document.getElementById("viewer");

const viewerBody =
    document.getElementById("viewerBody");

const viewerImage =
    document.getElementById("viewerImage");

const viewerLoading =
    document.getElementById("viewerLoading");

const viewerError =
    document.getElementById("viewerError");


/* ==================================================
   ZOOM STATE
================================================== */

let scale = 1;

let translateX = 0;
let translateY = 0;

let baseWidth = 0;
let baseHeight = 0;


/* Mouse */

let dragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragOriginX = 0;
let dragOriginY = 0;


/* Touch */

let pinchStartDistance = 0;
let pinchStartScale = 1;

let touchStartX = 0;
let touchStartY = 0;

let touchOriginX = 0;
let touchOriginY = 0;

let touchDragging = false;


/* ==================================================
   SERVICE WORKER
================================================== */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker
                .register("./sw.js")
                .catch(error => {

                    console.log(
                        "Service worker error:",
                        error
                    );

                });

        }
    );

}


/* ==================================================
   STATUS
================================================== */

function updateStatus() {

    if (navigator.onLine) {

        status.textContent =
            "● Online";

        status.style.color =
            "#9fe8ad";

    } else {

        status.textContent =
            "● Offline Ready";

        status.style.color =
            "#c59dd9";

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


/* ==================================================
   CLEAN NAME
================================================== */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/* ==================================================
   IMAGE URL
================================================== */

function imageURL(file) {

    return file.download_url || "";

}


/* ==================================================
   LOAD GITHUB FOLDER
================================================== */

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

                !!file.download_url &&

                /\.(jpg|jpeg|png|webp|gif)$/i
                    .test(file.name)

            )

            .map(file => ({

                name: file.name,

                path: file.path,

                download_url:
                    file.download_url

            }));


    } catch (error) {

        console.log(
            `Could not load ${folder}:`,
            error
        );

        return null;

    }

}


/* ==================================================
   SAVE LIST
================================================== */

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
            "List cache error:",
            error
        );

    }

}


/* ==================================================
   LOAD OFFLINE LIST
================================================== */

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


        chords =
            Array.isArray(data.chords)
                ? data.chords
                : [];


        lyrics =
            Array.isArray(data.lyrics)
                ? data.lyrics
                : [];


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


/* ==================================================
   IMAGE CACHE
================================================== */

async function getImageCache() {

    if (!("caches" in window)) {
        return null;
    }

    return caches.open(
        IMAGE_CACHE
    );

}


/* ==================================================
   GET CACHED IMAGE
================================================== */

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


    return URL.createObjectURL(
        blob
    );

}


/* ==================================================
   DOWNLOAD + CACHE
   ONLY CLICKED IMAGE
================================================== */

async function downloadAndCacheImage(url) {

    const cache =
        await getImageCache();


    if (!cache) {

        if (!navigator.onLine) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );

        }


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
                "IMAGE_DOWNLOAD_FAILED"
            );

        }


        const blob =
            await response.blob();


        return URL.createObjectURL(
            blob
        );

    }


    /* Check cache again */

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


    /* Download ORIGINAL */

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
            "IMAGE_DOWNLOAD_FAILED"
        );

    }


    /*
       Save original response bytes.
       No resizing.
       No compression.
       No canvas.
    */

    await cache.put(
        url,
        response.clone()
    );


    const blob =
        await response.blob();


    return URL.createObjectURL(
        blob
    );

}


/* ==================================================
   LOAD DATA
================================================== */

async function loadData() {

    chordList.innerHTML =
        `<div class="empty">🎸 Loading library...</div>`;

    lyricList.innerHTML =
        `<div class="empty">🎤 Loading library...</div>`;


    /*
       First load saved metadata.
    */

    loadListData();


    renderChords(chords);
    renderLyrics(lyrics);


    /*
       Offline = use saved metadata.
    */

    if (!navigator.onLine) {
        return;
    }


    /*
       Online = refresh song list.
       Still NO images downloaded.
    */

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


/* ==================================================
   CREATE SONG ITEM
================================================== */

function createSongItem(
    file,
    type
) {

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

    arrow.textContent =
        "›";


    item.appendChild(icon);
    item.appendChild(details);
    item.appendChild(arrow);


    /*
       IMPORTANT:
       Image download starts ONLY here,
       after user clicks.
    */

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


/* ==================================================
   RENDER CHORDS
================================================== */

function renderChords(list) {

    document.getElementById(
        "chordCount"
    ).textContent =
        list.length;


    chordList.innerHTML = "";


    if (!list.length) {

        chordList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎸</div>
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


/* ==================================================
   RENDER LYRICS
================================================== */

function renderLyrics(list) {

    document.getElementById(
        "lyricCount"
    ).textContent =
        list.length;


    lyricList.innerHTML = "";


    if (!list.length) {

        lyricList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎤</div>
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


/* ==================================================
   VIEWER STATE
================================================== */

function setViewerState(state) {

    viewerLoading.classList.toggle(
        "hidden",
        state !== "loading"
    );

    viewerError.classList.toggle(
        "hidden",
        state !== "error"
    );

}


/* ==================================================
   RESET ZOOM
================================================== */

function resetZoom() {

    scale = 1;

    translateX = 0;
    translateY = 0;

    baseWidth = 0;
    baseHeight = 0;

    viewerImage.classList.remove(
        "zoomed"
    );


    /*
       IMPORTANT:
       1x = no transform.
    */

    viewerImage.style.transform =
        "none";

}


/* ==================================================
   MEASURE IMAGE
================================================== */

function measureBaseImage() {

    const rect =
        viewerImage.getBoundingClientRect();


    baseWidth =
        rect.width;

    baseHeight =
        rect.height;

}


/* ==================================================
   CLAMP PAN
================================================== */

function clampPan() {

    if (scale <= 1) {

        translateX = 0;
        translateY = 0;

        return;

    }


    const viewportWidth =
        viewerBody.clientWidth;

    const viewportHeight =
        viewerBody.clientHeight;


    const scaledWidth =
        baseWidth * scale;

    const scaledHeight =
        baseHeight * scale;


    const maxX =
        Math.max(
            0,
            (scaledWidth - viewportWidth) / 2
        );


    const maxY =
        Math.max(
            0,
            (scaledHeight - viewportHeight) / 2
        );


    translateX =
        Math.max(
            -maxX,
            Math.min(
                maxX,
                translateX
            )
        );


    translateY =
        Math.max(
            -maxY,
            Math.min(
                maxY,
                translateY
            )
        );

}


/* ==================================================
   APPLY TRANSFORM
================================================== */

function applyTransform() {

    clampPan();


    if (scale <= 1) {

        viewerImage.style.transform =
            "none";

        viewerImage.classList.remove(
            "zoomed"
        );

        return;

    }


    viewerImage.classList.add(
        "zoomed"
    );


    viewerImage.style.transform =
        `translate3d(
            ${translateX}px,
            ${translateY}px,
            0
        ) scale(${scale})`;

}


/* ==================================================
   SET SCALE
================================================== */

function setScale(newScale) {

    scale =
        Math.max(
            1,
            Math.min(
                4,
                newScale
            )
        );


    if (scale === 1) {

        translateX = 0;
        translateY = 0;

    }


    applyTransform();

}


/* ==================================================
   OPEN VIEWER
   NO FULLSCREEN
================================================== */

async function openViewer(image) {

    if (!image) {
        return;
    }


    const requestId =
        ++viewerRequest;


    /*
       Open normal viewer.
    */

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
           Check saved image.
        */

        let localURL =
            await getCachedImageURL(
                image
            );


        if (requestId !== viewerRequest) {
            return;
        }


        /*
           Saved image.
        */

        if (localURL) {

            currentBlobURL =
                localURL;

            await showViewerImage(
                localURL,
                requestId
            );

            return;

        }


        /*
           Offline + not saved.
        */

        if (!navigator.onLine) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );

        }


        /*
           Download only now.
        */

        localURL =
            await downloadAndCacheImage(
                image
            );


        if (requestId !== viewerRequest) {

            if (
                localURL &&
                localURL.startsWith("blob:")
            ) {

                URL.revokeObjectURL(
                    localURL
                );

            }

            return;

        }


        currentBlobURL =
            localURL;


        await showViewerImage(
            localURL,
            requestId
        );


    } catch (error) {

        console.log(
            "Viewer error:",
            error
        );


        if (requestId !== viewerRequest) {
            return;
        }


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


/* ==================================================
   SHOW IMAGE
================================================== */

async function showViewerImage(
    url,
    requestId
) {

    viewerImage.classList.add(
        "hidden"
    );


    viewerImage.src =
        url;


    try {

        if (
            typeof viewerImage.decode ===
            "function"
        ) {

            await viewerImage.decode();

        } else {

            await new Promise(
                resolve => {

                    if (
                        viewerImage.complete
                    ) {

                        resolve();

                    } else {

                        viewerImage.onload =
                            resolve;

                        viewerImage.onerror =
                            resolve;

                    }

                }
            );

        }

    } catch (error) {

        console.log(
            "Decode warning:",
            error
        );

    }


    if (requestId !== viewerRequest) {
        return;
    }


    resetZoom();


    setViewerState(
        "none"
    );


    viewerImage.classList.remove(
        "hidden"
    );


    requestAnimationFrame(
        () => {

            measureBaseImage();

        }
    );

}


/* ==================================================
   CLOSE VIEWER
================================================== */

function closeImageViewer() {

    ++viewerRequest;


    viewer.classList.add(
        "hidden"
    );


    viewer.setAttribute(
        "aria-hidden",
        "true"
    );


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
        currentBlobURL &&
        currentBlobURL.startsWith("blob:")
    ) {

        URL.revokeObjectURL(
            currentBlobURL
        );

    }


    currentBlobURL = null;

}


/* ==================================================
   CLICK BACKGROUND TO CLOSE
================================================== */

viewerBody.addEventListener(
    "click",
    event => {

        /*
           Only close if the black background
           itself was clicked.
        */

        if (
            event.target === viewerBody
        ) {

            closeImageViewer();

        }

    }
);


/* ==================================================
   MOUSE WHEEL ZOOM
================================================== */

viewerBody.addEventListener(
    "wheel",
    event => {

        event.preventDefault();


        const direction =
            event.deltaY < 0
                ? 0.15
                : -0.15;


        setScale(
            scale + direction
        );

    },
    {
        passive: false
    }
);


/* ==================================================
   MOUSE DRAG
================================================== */

viewerImage.addEventListener(
    "mousedown",
    event => {

        if (scale <= 1) {
            return;
        }


        event.preventDefault();


        dragging = true;


        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;


        dragOriginX =
            translateX;

        dragOriginY =
            translateY;

    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!dragging) {
            return;
        }


        translateX =
            dragOriginX +
            (
                event.clientX -
                dragStartX
            );


        translateY =
            dragOriginY +
            (
                event.clientY -
                dragStartY
            );


        applyTransform();

    }
);


window.addEventListener(
    "mouseup",
    () => {

        dragging = false;

    }
);


/* ==================================================
   TOUCH DISTANCE
================================================== */

function distanceBetweenTouches(
    touches
) {

    const a =
        touches[0];

    const b =
        touches[1];


    return Math.hypot(
        a.clientX - b.clientX,
        a.clientY - b.clientY
    );

}


/* ==================================================
   TOUCH START
================================================== */

viewerImage.addEventListener(
    "touchstart",
    event => {

        if (
            event.touches.length === 2
        ) {

            pinchStartDistance =
                distanceBetweenTouches(
                    event.touches
                );

            pinchStartScale =
                scale;

            touchDragging = false;

            return;

        }


        if (
            event.touches.length === 1 &&
            scale > 1
        ) {

            const touch =
                event.touches[0];


            touchDragging = true;


            touchStartX =
                touch.clientX;

            touchStartY =
                touch.clientY;


            touchOriginX =
                translateX;

            touchOriginY =
                translateY;

        }

    },
    {
        passive: false
    }
);


/* ==================================================
   TOUCH MOVE
================================================== */

viewerImage.addEventListener(
    "touchmove",
    event => {

        event.preventDefault();


        /*
           PINCH ZOOM
        */

        if (
            event.touches.length === 2
        ) {

            const distance =
                distanceBetweenTouches(
                    event.touches
                );


            if (
                pinchStartDistance > 0
            ) {

                const ratio =
                    distance /
                    pinchStartDistance;


                setScale(
                    pinchStartScale *
                    ratio
                );

            }

            return;

        }


        /*
           PAN
        */

        if (
            event.touches.length === 1 &&
            touchDragging &&
            scale > 1
        ) {

            const touch =
                event.touches[0];


            translateX =
                touchOriginX +
                (
                    touch.clientX -
                    touchStartX
                );


            translateY =
                touchOriginY +
                (
                    touch.clientY -
                    touchStartY
                );


            applyTransform();

        }

    },
    {
        passive: false
    }
);


/* ==================================================
   TOUCH END
================================================== */

viewerImage.addEventListener(
    "touchend",
    event => {

        if (
            event.touches.length < 2
        ) {

            pinchStartDistance = 0;

        }


        if (
            event.touches.length === 0
        ) {

            touchDragging = false;

        }

    },
    {
        passive: false
    }
);


/* ==================================================
   DOUBLE CLICK ZOOM
================================================== */

viewerImage.addEventListener(
    "dblclick",
    event => {

        event.preventDefault();


        if (scale > 1) {

            setScale(1);

        } else {

            setScale(2);

        }

    }
);


/* ==================================================
   ESC
================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape" &&
            !viewer.classList.contains(
                "hidden"
            )
        ) {

            closeImageViewer();

        }

    }
);


/* ==================================================
   CHORD SEARCH
================================================== */

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
                    cleanName(file.name)
                        .toLowerCase()
                        .includes(text)
            )

        );

    }
);


/* ==================================================
   LYRIC SEARCH
================================================== */

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
                    cleanName(file.name)
                        .toLowerCase()
                        .includes(text)
            )

        );

    }
);


/* ==================================================
   CHORD TAB
================================================== */

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


/* ==================================================
   LYRICS TAB
================================================== */

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


/* ==================================================
   START
================================================== */

loadData();
