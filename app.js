const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API =
    `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const CACHE_NAME = "song-book-images-v1";

let chords = [];
let lyrics = [];

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

const viewerImage =
    document.getElementById("viewerImage");

const viewerTitle =
    document.getElementById("viewerTitle");

const closeViewer =
    document.getElementById("closeViewer");

const status =
    document.getElementById("status");



/* =========================
   SERVICE WORKER
========================= */

if ("serviceWorker" in navigator) {

    window.addEventListener(
        "load",
        () => {

            navigator.serviceWorker.register(
                "./sw.js"
            ).catch(error => {

                console.log(
                    "Service worker error:",
                    error
                );

            });

        }
    );

}



/* =========================
   STATUS
========================= */

function updateStatus() {

    if (navigator.onLine) {

        status.textContent =
            "● Online";

        status.style.color =
            "#73b87b";

    } else {

        status.textContent =
            "● Offline Ready";

        status.style.color =
            "#9a829f";

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



/* =========================
   CLEAN SONG NAME
========================= */

function cleanName(name) {

    return name

        .replace(/\.[^/.]+$/, "")

        .replace(/[_-]+/g, " ")

        .replace(/\s+/g, " ")

        .trim();

}



/* =========================
   LOAD FOLDER
========================= */

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
                "GitHub request failed"
            );

        }


        const files =
            await response.json();


        return files.filter(file => {

            return (
                file.type === "file" &&
                /\.(jpg|jpeg|png|webp)$/i
                    .test(file.name)
            );

        });


    } catch (error) {

        console.log(
            "Using offline data:",
            error
        );

        return [];

    }

}



/* =========================
   SAVE IMAGE CACHE
========================= */

async function cacheImages(files) {

    if (!("caches" in window)) {
        return;
    }


    try {

        const cache =
            await caches.open(
                CACHE_NAME
            );


        for (const file of files) {

            try {

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
            "Cache error:",
            error
        );

    }

}



/* =========================
   LOAD DATA
========================= */

async function loadData() {

    chordList.innerHTML = `
        <div class="empty">
            🎸 Loading...
        </div>
    `;


    lyricList.innerHTML = `
        <div class="empty">
            🎤 Loading...
        </div>
    `;


    if (navigator.onLine) {

        const newChords =
            await loadFolder("chords");

        const newLyrics =
            await loadFolder("lyrics");


        if (newChords.length > 0) {

            chords = newChords;

            cacheImages(chords);

        }


        if (newLyrics.length > 0) {

            lyrics = newLyrics;

            cacheImages(lyrics);

        }

    }


    renderChords(chords);

    renderLyrics(lyrics);

}



/* =========================
   RENDER CHORDS
========================= */

function renderChords(list) {

    document.getElementById(
        "chordCount"
    ).textContent = list.length;


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

        const item =
            createSongItem(
                file,
                "🎸 Chord Sheet"
            );


        chordList.appendChild(item);

    });

}



/* =========================
   RENDER LYRICS
========================= */

function renderLyrics(list) {

    document.getElementById(
        "lyricCount"
    ).textContent = list.length;


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

        const item =
            createSongItem(
                file,
                "🎤 Lyrics"
            );


        lyricList.appendChild(item);

    });

}



/* =========================
   CREATE LIST ITEM
========================= */

function createSongItem(
    file,
    type
) {

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



/* =========================
   IMAGE VIEWER
========================= */

function openViewer(
    image,
    title
) {

    viewerTitle.textContent =
        title;


    viewerImage.src =
        image;


    viewer.classList.remove(
        "hidden"
    );


    document.body.style.overflow =
        "hidden";

}



/* =========================
   CLOSE VIEWER
========================= */

function closeImageViewer() {

    viewer.classList.add(
        "hidden"
    );


    viewerImage.src = "";


    document.body.style.overflow =
        "";

}


closeViewer.addEventListener(
    "click",
    closeImageViewer
);


viewer.addEventListener(
    "click",
    event => {

        if (
            event.target === viewer
        ) {

            closeImageViewer();

        }

    }
);


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



/* =========================
   CHORD SEARCH
========================= */

chordSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        const result =
            chords.filter(file =>

                cleanName(file.name)
                    .toLowerCase()
                    .includes(text)

            );


        renderChords(result);

    }
);



/* =========================
   LYRIC SEARCH
========================= */

lyricSearch.addEventListener(
    "input",
    event => {

        const text =
            event.target.value
                .toLowerCase()
                .trim();


        const result =
            lyrics.filter(file =>

                cleanName(file.name)
                    .toLowerCase()
                    .includes(text)

            );


        renderLyrics(result);

    }
);



/* =========================
   BUTTONS
========================= */

chordsBtn.addEventListener(
    "click",
    () => {

        chordsSection.classList
            .remove("hidden");

        lyricsSection.classList
            .add("hidden");

        chordsBtn.classList
            .add("active");

        lyricsBtn.classList
            .remove("active");

    }
);


lyricsBtn.addEventListener(
    "click",
    () => {

        lyricsSection.classList
            .remove("hidden");

        chordsSection.classList
            .add("hidden");

        lyricsBtn.classList
            .add("active");

        chordsBtn.classList
            .remove("active");

    }
);



/* =========================
   START
========================= */

loadData();
