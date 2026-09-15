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

const chordsSection = document.getElementById("chordsSection");
const lyricsSection = document.getElementById("lyricsSection");

const chordList = document.getElementById("chordList");
const lyricList = document.getElementById("lyricList");

const chordSearch = document.getElementById("chordSearch");
const lyricSearch = document.getElementById("lyricSearch");

const viewer = document.getElementById("viewer");
const viewerBody = document.getElementById("viewerBody");
const viewerImage = document.getElementById("viewerImage");

const viewerTitle = document.getElementById("viewerTitle");
const viewerStatus = document.getElementById("viewerStatus");

const viewerLoading = document.getElementById("viewerLoading");
const viewerError = document.getElementById("viewerError");

const closeViewer = document.getElementById("closeViewer");
const status = document.getElementById("status");


/* =====================================================
   IMAGE ZOOM SETTINGS
===================================================== */

/*
   Small / smooth zoom.

   1.00 = normal
   1.25 = small zoom
   1.50 = medium
   1.75 = larger
   2.00 = maximum

   Double tap is intentionally NOT used.
*/

const MIN_ZOOM = 1;
const MAX_ZOOM = 2;

let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;

let isDragging = false;

let dragStartX = 0;
let dragStartY = 0;

let dragOriginX = 0;
let dragOriginY = 0;

let pinchActive = false;
let pinchStartDistance = 0;
let pinchStartZoom = 1;

let lastTouchTime = 0;


/* =====================================================
   SERVICE WORKER
===================================================== */

if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker
            .register("./sw.js")
            .then(() => {
                console.log("Service Worker registered");
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

        status.textContent = "● Offline Ready";
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
   HELPERS
===================================================== */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}


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

        const files =
            await response.json();

        return files
            .filter(file =>
                file.type === "file" &&
                /\.(jpg|jpeg|png|webp|gif)$/i.test(
                    file.name
                )
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
   SAVE SONG LIST
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
   LOAD SONG LIST FROM DEVICE
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


async function downloadAndCacheImage(url) {

    const cache =
        await getImageCache();

    /*
       Browser does not support Cache API.
    */

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


    /*
       Check cache FIRST.
       If saved already, don't download again.
    */

    const existing =
        await cache.match(url);

    if (existing) {

        const blob =
            await existing.blob();

        return URL.createObjectURL(
            blob
        );
    }


    /*
       No saved copy + offline.
    */

    if (!navigator.onLine) {

        throw new Error(
            "OFFLINE_IMAGE_NOT_SAVED"
        );

    }


    /*
       Download only the clicked image.
    */

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


    /*
       Save image.
    */

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
        `<div class="empty">🎸 Loading library...</div>`;

    lyricList.innerHTML =
        `<div class="empty">🎤 Loading library...</div>`;


    /*
       Load previously saved song list.
    */

    loadListData();

    renderChords(chords);
    renderLyrics(lyrics);


    /*
       If offline, use saved list.
    */

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
   SONG ITEM
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

    arrow.textContent =
        "›";


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


/* =====================================================
   RENDER LYRICS
===================================================== */

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
            zoomScale > 1
                ? `${zoomScale.toFixed(2)}x • Saved on this device`
                : "Saved on this device • Offline ready";

    }


    if (state === "error") {

        viewerStatus.textContent =
            "Not saved on this device";

    }
}


/* =====================================================
   ZOOM FUNCTIONS
===================================================== */

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


function applyZoom() {

    viewerImage.style.transform =
        `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;


    if (zoomScale > 1) {

        viewerImage.classList.add(
            "zoomed"
        );

    } else {

        viewerImage.classList.remove(
            "zoomed"
        );

    }


    if (
        viewerStatus &&
        !viewerLoading.classList.contains("hidden")
    ) {
        return;
    }


    if (
        viewerError &&
        !viewerError.classList.contains("hidden")
    ) {
        return;
    }


    viewerStatus.textContent =
        zoomScale > 1
            ? `${zoomScale.toFixed(2)}x • Saved on this device`
            : "Saved on this device • Offline ready";
}


function setZoom(
    newScale,
    centerX = 0,
    centerY = 0
) {

    const oldScale =
        zoomScale;

    zoomScale =
        clamp(
            newScale,
            MIN_ZOOM,
            MAX_ZOOM
        );


    /*
       If returning to normal size,
       remove movement.
    */

    if (zoomScale === 1) {

        zoomX = 0;
        zoomY = 0;

    } else {

        /*
           Keep movement small and stable.
           The zoom is intentionally limited.
        */

        const ratio =
            zoomScale / oldScale;

        zoomX =
            zoomX * ratio;

        zoomY =
            zoomY * ratio;

        const maxMoveX =
            Math.max(
                0,
                (viewerBody.clientWidth *
                    (zoomScale - 1)) / 2
            );

        const maxMoveY =
            Math.max(
                0,
                (viewerBody.clientHeight *
                    (zoomScale - 1)) / 2
            );

        zoomX =
            clamp(
                zoomX,
                -maxMoveX,
                maxMoveX
            );

        zoomY =
            clamp(
                zoomY,
                -maxMoveY,
                maxMoveY
            );
    }


    applyZoom();
}


function resetZoom() {

    zoomScale = 1;

    zoomX = 0;
    zoomY = 0;

    isDragging = false;
    pinchActive = false;

    viewerImage.style.transform =
        "translate3d(0, 0, 0) scale(1)";

    viewerImage.classList.remove(
        "zoomed"
    );
}


/* =====================================================
   TOUCH HELPERS
===================================================== */

function getTouchDistance(
    touch1,
    touch2
) {

    const dx =
        touch1.clientX -
        touch2.clientX;

    const dy =
        touch1.clientY -
        touch2.clientY;

    return Math.sqrt(
        dx * dx +
        dy * dy
    );
}


/* =====================================================
   MOBILE PINCH ZOOM
===================================================== */

viewerImage.addEventListener(
    "touchstart",
    event => {

        /*
           Two fingers = pinch.
        */

        if (event.touches.length === 2) {

            event.preventDefault();

            pinchActive = true;

            isDragging = false;

            pinchStartDistance =
                getTouchDistance(
                    event.touches[0],
                    event.touches[1]
                );

            pinchStartZoom =
                zoomScale;

            return;
        }


        /*
           One finger = possible drag,
           but ONLY after zoom > 1.
        */

        if (
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            event.preventDefault();

            isDragging = true;

            dragStartX =
                event.touches[0].clientX;

            dragStartY =
                event.touches[0].clientY;

            dragOriginX =
                zoomX;

            dragOriginY =
                zoomY;
        }

    },
    {
        passive: false
    }
);


/* =====================================================
   MOBILE TOUCH MOVE
===================================================== */

viewerImage.addEventListener(
    "touchmove",
    event => {

        /*
           PINCH
        */

        if (
            pinchActive &&
            event.touches.length === 2
        ) {

            event.preventDefault();

            const currentDistance =
                getTouchDistance(
                    event.touches[0],
                    event.touches[1]
                );


            if (pinchStartDistance <= 0) {
                return;
            }


            const ratio =
                currentDistance /
                pinchStartDistance;


            /*
               Smooth limited zoom.
            */

            const newZoom =
                pinchStartZoom * ratio;


            setZoom(
                newZoom
            );

            return;
        }


        /*
           DRAG
        */

        if (
            isDragging &&
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            event.preventDefault();

            const currentX =
                event.touches[0].clientX;

            const currentY =
                event.touches[0].clientY;


            const dx =
                currentX -
                dragStartX;

            const dy =
                currentY -
                dragStartY;


            const maxMoveX =
                Math.max(
                    0,
                    (viewerBody.clientWidth *
                        (zoomScale - 1)) / 2
                );

            const maxMoveY =
                Math.max(
                    0,
                    (viewerBody.clientHeight *
                        (zoomScale - 1)) / 2
                );


            zoomX =
                clamp(
                    dragOriginX + dx,
                    -maxMoveX,
                    maxMoveX
                );

            zoomY =
                clamp(
                    dragOriginY + dy,
                    -maxMoveY,
                    maxMoveY
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


/* =====================================================
   DISABLE DOUBLE TAP ZOOM
===================================================== */

viewerImage.addEventListener(
    "touchend",
    event => {

        /*
           This intentionally does NOTHING.

           Double tap zoom has been removed.
        */

        lastTouchTime = Date.now();

    },
    {
        passive: true
    }
);


/* =====================================================
   PC MOUSE WHEEL ZOOM
===================================================== */

viewerBody.addEventListener(
    "wheel",
    event => {

        if (
            viewer.classList.contains("hidden") ||
            viewerImage.classList.contains("hidden")
        ) {
            return;
        }


        event.preventDefault();


        /*
           Small zoom steps.
        */

        const step =
            event.deltaY < 0
                ? 0.125
                : -0.125;


        setZoom(
            zoomScale + step
        );

    },
    {
        passive: false
    }
);


/* =====================================================
   PC DRAG
===================================================== */

viewerImage.addEventListener(
    "mousedown",
    event => {

        if (zoomScale <= 1) {
            return;
        }

        event.preventDefault();

        isDragging = true;

        dragStartX =
            event.clientX;

        dragStartY =
            event.clientY;

        dragOriginX =
            zoomX;

        dragOriginY =
            zoomY;
    }
);


window.addEventListener(
    "mousemove",
    event => {

        if (!isDragging) {
            return;
        }

        if (zoomScale <= 1) {
            return;
        }


        const dx =
            event.clientX -
            dragStartX;

        const dy =
            event.clientY -
            dragStartY;


        const maxMoveX =
            Math.max(
                0,
                (viewerBody.clientWidth *
                    (zoomScale - 1)) / 2
            );

        const maxMoveY =
            Math.max(
                0,
                (viewerBody.clientHeight *
                    (zoomScale - 1)) / 2
            );


        zoomX =
            clamp(
                dragOriginX + dx,
                -maxMoveX,
                maxMoveX
            );

        zoomY =
            clamp(
                dragOriginY + dy,
                -maxMoveY,
                maxMoveY
            );


        applyZoom();
    }
);


window.addEventListener(
    "mouseup",
    () => {

        isDragging = false;

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


    /*
       ALWAYS start at normal size.
    */

    resetZoom();


    viewerBody.scrollTop = 0;
    viewerBody.scrollLeft = 0;


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
           First check locally saved image.
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


            setViewerState(
                "ready"
            );

            return;
        }


        /*
           Not saved + offline.
        */

        if (!navigator.onLine) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );

        }


        /*
           Download ONLY this clicked image.
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


closeViewer.addEventListener(
    "click",
    closeImageViewer
);


/* =====================================================
   CLOSE BY BACKGROUND CLICK
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
   ESCAPE KEY
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
   CHORD SEARCH
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
   LYRICS SEARCH
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
