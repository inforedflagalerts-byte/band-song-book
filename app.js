const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY = "bandSongBookData_v4";

/*
 * IMPORTANT:
 * v5 = old cached image copies are ignored.
 */
const IMAGE_CACHE = "song-book-images-v5";

let chords = [];
let lyrics = [];

/* =====================================================
   ELEMENTS
===================================================== */

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
   ZOOM
   1x -> 2x
   Pinch on mobile
   Wheel on PC
   Drag when zoomed

   Double-tap is OFF.
===================================================== */

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


/* =====================================================
   SERVICE WORKER
===================================================== */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

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

        }
    );

}


/* =====================================================
   ONLINE STATUS
===================================================== */

function updateStatus() {

    if (!status) return;

    if (navigator.onLine) {

        status.textContent =
            "● Online";

        status.style.color =
            "#8ed89b";

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

    return (
        file.download_url ||
        file.html_url ||
        ""
    );

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
            .filter(
                file =>
                    file.type === "file" &&
                    /\.(jpg|jpeg|png|webp|gif)$/i
                        .test(file.name)
            )
            .map(
                file => ({

                    name:
                        file.name,

                    path:
                        file.path,

                    download_url:
                        file.download_url,

                    html_url:
                        file.html_url

                })
            );

    } catch (error) {

        console.log(
            `Could not load ${folder}:`,
            error
        );

        return null;

    }

}


/* =====================================================
   LIST CACHE
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


        if (
            Array.isArray(
                data.chords
            )
        ) {

            chords =
                data.chords;

        }


        if (
            Array.isArray(
                data.lyrics
            )
        ) {

            lyrics =
                data.lyrics;

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

    if (
        !("caches" in window)
    ) {

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


/* =====================================================
   DOWNLOAD ONLY CLICKED IMAGE

   IMPORTANT:
   No resize.
   No canvas.
   No JPEG recompression.

   The original GitHub response is cached.
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


        return URL.createObjectURL(
            await response.blob()
        );

    }


    const existing =
        await cache.match(url);


    if (existing) {

        return URL.createObjectURL(
            await existing.blob()
        );

    }


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
            "Image download failed"
        );

    }


    /*
     * Save the original response.
     */
    await cache.put(
        url,
        response.clone()
    );


    return URL.createObjectURL(
        await response.blob()
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
    ] =
        await Promise.all([

            loadFolder("chords"),

            loadFolder("lyrics")

        ]);


    if (
        newChords !== null
    ) {

        chords =
            newChords;

    }


    if (
        newLyrics !== null
    ) {

        lyrics =
            newLyrics;

    }


    saveListData();


    renderChords(chords);
    renderLyrics(lyrics);

}


/* =====================================================
   SONG ITEM
===================================================== */

function createSongItem(
    file,
    type
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "song-item";


    const icon =
        document.createElement(
            "div"
        );


    icon.className =
        "song-icon";


    icon.textContent =
        type === "chord"
            ? "🎸"
            : "🎤";


    const details =
        document.createElement(
            "div"
        );


    details.className =
        "song-details";


    const name =
        document.createElement(
            "div"
        );


    name.className =
        "song-name";


    name.textContent =
        cleanName(
            file.name
        );


    const sub =
        document.createElement(
            "div"
        );


    sub.className =
        "song-type";


    sub.textContent =
        type === "chord"
            ? "Chord Sheet • Tap to open"
            : "Lyrics • Tap to open";


    details.appendChild(name);
    details.appendChild(sub);


    const arrow =
        document.createElement(
            "div"
        );


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

    const count =
        document.getElementById(
            "chordCount"
        );


    if (count) {

        count.textContent =
            list.length;

    }


    chordList.innerHTML =
        "";


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


    list.forEach(
        file => {

            chordList.appendChild(
                createSongItem(
                    file,
                    "chord"
                )
            );

        }
    );

}


/* =====================================================
   RENDER LYRICS
===================================================== */

function renderLyrics(list) {

    const count =
        document.getElementById(
            "lyricCount"
        );


    if (count) {

        count.textContent =
            list.length;

    }


    lyricList.innerHTML =
        "";


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


    list.forEach(
        file => {

            lyricList.appendChild(
                createSongItem(
                    file,
                    "lyric"
                )
            );

        }
    );

}


/* =====================================================
   VIEWER STATE
===================================================== */

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


    /*
     * Pure image-only viewer may not have viewerStatus.
     */
    if (!viewerStatus) {

        return;

    }


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
   ZOOM HELPERS
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


/* =====================================================
   QUALITY FIX
===================================================== */

function applyZoom() {

    /*
     * VERY IMPORTANT:
     *
     * At normal 1x:
     * NO transform.
     *
     * This prevents the browser from unnecessarily
     * resampling the sheet through a CSS transform.
     *
     * When zoomed, transform is used.
     */

    if (zoomScale === 1) {

        viewerImage.style.transform =
            "none";

    } else {

        viewerImage.style.transform =
            `translate3d(
                ${zoomX}px,
                ${zoomY}px,
                0
            ) scale(${zoomScale})`;

    }


    viewerImage.classList.toggle(
        "zoomed",
        zoomScale > 1
    );


    if (
        !viewerLoading ||
        !viewerError
    ) {

        return;

    }


    if (
        !viewerLoading.classList.contains(
            "hidden"
        ) ||
        !viewerError.classList.contains(
            "hidden"
        )
    ) {

        return;

    }


    if (viewerStatus) {

        viewerStatus.textContent =
            zoomScale > 1
                ? `${zoomScale.toFixed(2)}x • Saved on this device`
                : "Saved on this device • Offline ready";

    }

}


/* =====================================================
   SET ZOOM
===================================================== */

function setZoom(
    newScale
) {

    const oldScale =
        zoomScale;


    zoomScale =
        clamp(
            newScale,
            MIN_ZOOM,
            MAX_ZOOM
        );


    if (
        zoomScale === 1
    ) {

        zoomX = 0;
        zoomY = 0;

    } else {

        const ratio =
            zoomScale /
            oldScale;


        zoomX *= ratio;
        zoomY *= ratio;


        const maxMoveX =
            Math.max(
                0,
                (
                    viewerBody.clientWidth *
                    (zoomScale - 1)
                ) / 2
            );


        const maxMoveY =
            Math.max(
                0,
                (
                    viewerBody.clientHeight *
                    (zoomScale - 1)
                ) / 2
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


/* =====================================================
   RESET ZOOM
===================================================== */

function resetZoom() {

    zoomScale = 1;

    zoomX = 0;
    zoomY = 0;

    isDragging = false;
    pinchActive = false;


    /*
     * No transform at normal size.
     */
    viewerImage.style.transform =
        "none";


    viewerImage.classList.remove(
        "zoomed"
    );

}


/* =====================================================
   TOUCH DISTANCE
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
   PINCH ZOOM
===================================================== */

viewerImage.addEventListener(
    "touchstart",
    event => {

        if (
            event.touches.length === 2
        ) {

            event.preventDefault();


            pinchActive =
                true;


            isDragging =
                false;


            pinchStartDistance =
                getTouchDistance(
                    event.touches[0],
                    event.touches[1]
                );


            pinchStartZoom =
                zoomScale;


            return;

        }


        if (
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            event.preventDefault();


            isDragging =
                true;


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
   TOUCH MOVE
===================================================== */

viewerImage.addEventListener(
    "touchmove",
    event => {

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


            if (
                pinchStartDistance <= 0
            ) {

                return;

            }


            const ratio =
                currentDistance /
                pinchStartDistance;


            setZoom(
                pinchStartZoom *
                ratio
            );


            return;

        }


        if (
            isDragging &&
            event.touches.length === 1 &&
            zoomScale > 1
        ) {

            event.preventDefault();


            const dx =
                event.touches[0].clientX -
                dragStartX;


            const dy =
                event.touches[0].clientY -
                dragStartY;


            const maxMoveX =
                Math.max(
                    0,
                    (
                        viewerBody.clientWidth *
                        (zoomScale - 1)
                    ) / 2
                );


            const maxMoveY =
                Math.max(
                    0,
                    (
                        viewerBody.clientHeight *
                        (zoomScale - 1)
                    ) / 2
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

            pinchActive =
                false;

        }


        if (
            event.touches.length === 0
        ) {

            isDragging =
                false;

        }

    },
    {
        passive: false
    }
);


/* =====================================================
   DOUBLE TAP OFF
===================================================== */

viewerImage.addEventListener(
    "dblclick",
    event => {

        event.preventDefault();

    },
    {
        passive: false
    }
);


/* =====================================================
   PC WHEEL ZOOM
===================================================== */

viewerBody.addEventListener(
    "wheel",
    event => {

        if (
            viewer.classList.contains(
                "hidden"
            ) ||
            viewerImage.classList.contains(
                "hidden"
            )
        ) {

            return;

        }


        event.preventDefault();


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

        if (
            zoomScale <= 1
        ) {

            return;

        }


        event.preventDefault();


        isDragging =
            true;


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

        if (
            !isDragging ||
            zoomScale <= 1
        ) {

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
                (
                    viewerBody.clientWidth *
                    (zoomScale - 1)
                ) / 2
            );


        const maxMoveY =
            Math.max(
                0,
                (
                    viewerBody.clientHeight *
                    (zoomScale - 1)
                ) / 2
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

        isDragging =
            false;

    }
);


/* =====================================================
   INITIAL IMAGE RENDER
===================================================== */

function prepareInitialImageRender() {

    /*
     * QUALITY FIX
     *
     * Tall chord/lyrics sheets use the full available
     * viewport height.
     *
     * We do NOT resize the actual image file.
     * We do NOT use canvas.
     * We do NOT recompress JPEG.
     */

    viewerImage.style.width =
        "auto";


    viewerImage.style.height =
        "100dvh";


    viewerImage.style.maxWidth =
        "100vw";


    viewerImage.style.maxHeight =
        "100dvh";


    viewerImage.style.objectFit =
        "contain";


    viewerImage.style.imageRendering =
        "auto";


    viewerImage.style.transform =
        "none";

}


/* =====================================================
   WAIT FOR ORIGINAL IMAGE TO DECODE
===================================================== */

async function waitForImageDecode() {

    try {

        if (
            viewerImage.decode
        ) {

            await viewerImage.decode();

        }

    } catch (error) {

        /*
         * Some browsers reject decode()
         * even though image is usable.
         *
         * Do not break viewer.
         */

    }

}


/* =====================================================
   BROWSER FULLSCREEN
===================================================== */

async function enterFullscreen() {

    try {

        if (
            document.fullscreenElement
        ) {

            return;

        }


        if (
            viewer.requestFullscreen
        ) {

            await viewer.requestFullscreen();

        } else if (
            viewer.webkitRequestFullscreen
        ) {

            viewer.webkitRequestFullscreen();

        }

    } catch (error) {

        console.log(
            "Fullscreen not available:",
            error
        );

    }

}


async function exitFullscreen() {

    try {

        if (
            document.fullscreenElement
        ) {

            await document.exitFullscreen();

        }

    } catch (error) {

        console.log(
            "Fullscreen exit:",
            error
        );

    }

}


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


    if (viewerTitle) {

        viewerTitle.textContent =
            title;

    }


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

    prepareInitialImageRender();


    viewerBody.scrollTop =
        0;


    viewerBody.scrollLeft =
        0;


    viewerImage.removeAttribute(
        "src"
    );


    viewerImage.classList.add(
        "hidden"
    );


    setViewerState(
        "loading"
    );


    /*
     * Start fullscreen while still in the
     * click flow.
     */
    enterFullscreen();


    try {

        /*
         * Check cached original image first.
         */

        const cachedURL =
            await getCachedImageURL(
                image
            );


        if (cachedURL) {

            viewerImage.src =
                cachedURL;


            await waitForImageDecode();


            viewerImage.classList.remove(
                "hidden"
            );


            applyZoom();


            setViewerState(
                "ready"
            );


            return;

        }


        /*
         * Offline + image not previously saved.
         */

        if (
            !navigator.onLine
        ) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );

        }


        /*
         * Download ONLY the image that
         * the user clicked.
         */

        const localURL =
            await downloadAndCacheImage(
                image
            );


        viewerImage.src =
            localURL;


        await waitForImageDecode();


        viewerImage.classList.remove(
            "hidden"
        );


        applyZoom();


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

async function closeImageViewer() {

    const oldURL =
        viewerImage.src;


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


    await exitFullscreen();

}


if (closeViewer) {

    closeViewer.addEventListener(
        "click",
        closeImageViewer
    );

}


/* =====================================================
   ESCAPE
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
   FULLSCREEN CHANGE
===================================================== */

document.addEventListener(
    "fullscreenchange",
    () => {

        /*
         * If browser fullscreen was exited,
         * close viewer too.
         */

        if (
            !document.fullscreenElement &&
            !viewer.classList.contains(
                "hidden"
            )
        ) {

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

    }
);


/* =====================================================
   SEARCH - CHORDS
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
   SEARCH - LYRICS
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
