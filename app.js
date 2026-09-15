const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY = "bandSongBookData_v4";
const IMAGE_CACHE = "song-book-images-v4";

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
const viewerBody = document.getElementById("viewerBody");
const viewerImage = document.getElementById("viewerImage");
const viewerTitle = document.getElementById("viewerTitle");
const viewerStatus = document.getElementById("viewerStatus");

const viewerLoading = document.getElementById("viewerLoading");
const viewerError = document.getElementById("viewerError");

const closeViewer = document.getElementById("closeViewer");
const status = document.getElementById("status");


/* =========================================
   SERVICE WORKER
========================================= */

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


/* =========================================
   ONLINE / OFFLINE STATUS
========================================= */

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

window.addEventListener("online", updateStatus);
window.addEventListener("offline", updateStatus);


/* =========================================
   CLEAN FILE NAME
========================================= */

function cleanName(name) {

    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}


/* =========================================
   IMAGE URL
========================================= */

function imageURL(file) {

    return file.download_url || file.html_url || "";

}


/* =========================================
   LOAD FOLDER FROM GITHUB
========================================= */

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


/* =========================================
   SAVE SONG LIST
   NOTE:
   මෙතන image download වෙන්නේ නැහැ.
========================================= */

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


/* =========================================
   LOAD SAVED SONG LIST
========================================= */

function loadListData() {

    try {

        const saved =
            localStorage.getItem(LIST_CACHE_KEY);

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


/* =========================================
   OPEN IMAGE CACHE
========================================= */

async function getImageCache() {

    if (!("caches" in window)) {
        return null;
    }

    return await caches.open(IMAGE_CACHE);

}


/* =========================================
   CHECK IF IMAGE IS ALREADY SAVED
========================================= */

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


/* =========================================
   DOWNLOAD + SAVE ONLY CLICKED IMAGE
========================================= */

async function downloadAndCacheImage(url) {

    const cache =
        await getImageCache();


    /*
       Browser Cache API unavailable
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

        return URL.createObjectURL(blob);
    }


    /*
       FIRST CHECK CACHE AGAIN
    */

    const existing =
        await cache.match(url);

    if (existing) {

        const blob =
            await existing.blob();

        return URL.createObjectURL(blob);
    }


    /*
       IMAGE NOT SAVED
    */

    if (!navigator.onLine) {

        throw new Error(
            "OFFLINE_IMAGE_NOT_SAVED"
        );

    }


    /*
       DOWNLOAD ONLY NOW
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
       SAVE IMAGE LOCALLY
    */

    const copy =
        response.clone();

    await cache.put(
        url,
        copy
    );


    /*
       SHOW IMAGE
    */

    const blob =
        await response.blob();

    return URL.createObjectURL(blob);

}


/* =========================================
   LOAD APP
========================================= */

async function loadData() {

    chordList.innerHTML =
        `<div class="empty">🎸 Loading library...</div>`;

    lyricList.innerHTML =
        `<div class="empty">🎤 Loading library...</div>`;


    /*
       FIRST LOAD SAVED LIST
    */

    loadListData();

    renderChords(chords);
    renderLyrics(lyrics);


    /*
       IF OFFLINE:
       DO NOT CONTACT GITHUB
    */

    if (!navigator.onLine) {

        return;
    }


    /*
       ONLINE:
       GET ONLY FILE LIST.
       DO NOT DOWNLOAD IMAGES.
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


    /*
       SAVE ONLY LIST DATA
    */

    saveListData();


    renderChords(chords);
    renderLyrics(lyrics);

}


/* =========================================
   CREATE SONG LIST ITEM
========================================= */

function createSongItem(file, type) {

    const item =
        document.createElement("div");

    item.className =
        "song-item";


    /*
       ICON
    */

    const icon =
        document.createElement("div");

    icon.className =
        "song-icon";

    icon.textContent =
        type === "chord"
            ? "🎸"
            : "🎤";


    /*
       DETAILS
    */

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


    /*
       ARROW
    */

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
       IMAGE DOWNLOAD STARTS ONLY HERE
       WHEN USER CLICKS.
    */

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


/* =========================================
   RENDER CHORDS
========================================= */

function renderChords(list) {

    document.getElementById(
        "chordCount"
    ).textContent = list.length;


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


/* =========================================
   RENDER LYRICS
========================================= */

function renderLyrics(list) {

    document.getElementById(
        "lyricCount"
    ).textContent = list.length;


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


/* =========================================
   VIEWER STATE
========================================= */

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


/* =========================================
   OPEN IMAGE VIEWER
========================================= */

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
           STEP 1
           CHECK LOCAL CACHE FIRST
        */

        let cachedURL =
            await getCachedImageURL(
                image
            );


        /*
           STEP 2
           ALREADY SAVED
           NO DOWNLOAD
        */

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
           STEP 3
           NOT SAVED
        */

        if (!navigator.onLine) {

            throw new Error(
                "OFFLINE_IMAGE_NOT_SAVED"
            );

        }


        /*
           STEP 4
           DOWNLOAD + SAVE
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


        /*
           NOW IT IS SAVED
        */

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


/* =========================================
   CLOSE VIEWER
========================================= */

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


    document.body.style.overflow =
        "";


    /*
       Release temporary blob URL
    */

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


/*
   Click outside image = close
*/

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


/*
   ESC = close
*/

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {

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
   START APPLICATION
========================================= */

loadData();
