const GITHUB_USERNAME = "inforedflagalerts-byte";
const GITHUB_REPO = "band-song-book";
const GITHUB_BRANCH = "main";


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


let chordFiles = [];

let lyricFiles = [];



/* =========================
   GET FILES FROM GITHUB
========================= */

async function getFiles(folder) {

    const url =
        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folder}?ref=${GITHUB_BRANCH}`;

    const response =
        await fetch(url);

    if (!response.ok) {

        throw new Error(
            "Could not load " + folder
        );

    }

    return await response.json();
}



/* =========================
   LOAD CHORDS
========================= */

async function loadChords() {

    chordList.innerHTML = `
        <div class="empty">
            <div class="empty-icon">🎸</div>
            <p>Loading chords...</p>
        </div>
    `;


    try {

        const files =
            await getFiles("chords");


        chordFiles =
            files.filter(file =>
                file.type === "file" &&
                /\.(jpg|jpeg|png|webp|gif)$/i
                .test(file.name)
            );


        displayChords(chordFiles);


    } catch (error) {

        console.error(error);

        chordList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎵</div>
                <p>Could not load chord songs.</p>
            </div>
        `;
    }
}



/* =========================
   LOAD LYRICS
========================= */

async function loadLyrics() {

    lyricList.innerHTML = `
        <div class="empty">
            <div class="empty-icon">🎤</div>
            <p>Loading lyrics...</p>
        </div>
    `;


    try {

        const files =
            await getFiles("lyrics");


        lyricFiles =
            files.filter(file =>
                file.type === "file"
            );


        displayLyrics(lyricFiles);


    } catch (error) {

        console.error(error);

        lyricList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎤</div>
                <p>No lyrics added yet.</p>
            </div>
        `;
    }
}



/* =========================
   SONG NAME
========================= */

function songName(filename) {

    return filename

        .replace(/\.[^/.]+$/, "")

        .replace(/[_-]+/g, " ")

        .replace(/\s+/g, " ")

        .trim();
}



/* =========================
   DISPLAY CHORDS
========================= */

function displayChords(files) {

    chordList.innerHTML = "";


    if (files.length === 0) {

        chordList.innerHTML = `
            <div class="empty">

                <div class="empty-icon">
                    🎸
                </div>

                <p>
                    No chord songs found.
                </p>

            </div>
        `;

        return;
    }


    files.forEach(file => {

        const card =
            document.createElement("article");


        card.className =
            "song-card";


        const name =
            songName(file.name);


        card.innerHTML = `

            <div class="song-image">

                <img
                    src="${file.download_url}"
                    alt="${name}"
                    loading="lazy"
                >

                <div class="play-icon">
                    🎸
                </div>

            </div>


            <div class="song-info">

                <h3>
                    ${name}
                </h3>

                <p>
                    Chord Sheet
                </p>

            </div>

        `;


        const image =
            card.querySelector(".song-image");


        image.addEventListener(
            "click",
            () => {

                openImage(
                    file.download_url,
                    name
                );

            }
        );


        chordList.appendChild(card);

    });
}



/* =========================
   DISPLAY LYRICS
========================= */

function displayLyrics(files) {

    lyricList.innerHTML = "";


    if (files.length === 0) {

        lyricList.innerHTML = `
            <div class="empty">

                <div class="empty-icon">
                    🎤
                </div>

                <p>
                    No lyrics added yet.
                </p>

            </div>
        `;

        return;
    }


    files.forEach(file => {

        const card =
            document.createElement("article");


        card.className =
            "song-card";


        const name =
            songName(file.name);


        const isImage =
            /\.(jpg|jpeg|png|webp|gif)$/i
            .test(file.name);


        if (isImage) {

            card.innerHTML = `

                <div class="song-image">

                    <img
                        src="${file.download_url}"
                        alt="${name}"
                        loading="lazy"
                    >

                    <div class="play-icon">
                        🎤
                    </div>

                </div>


                <div class="song-info">

                    <h3>
                        ${name}
                    </h3>

                    <p>
                        Lyrics
                    </p>

                </div>
            `;


            card.querySelector(
                ".song-image"
            ).addEventListener(
                "click",
                () => {

                    openImage(
                        file.download_url,
                        name
                    );

                }
            );

        }


        lyricList.appendChild(card);

    });
}



/* =========================
   IMAGE VIEWER
========================= */

function openImage(url, title) {

    const modal =
        document.createElement("div");


    modal.className =
        "image-modal";


    modal.innerHTML = `

        <div class="modal-top">

            <span>
                🎵 ${title}
            </span>

            <button
                class="close-modal"
            >
                ×
            </button>

        </div>


        <div class="modal-content">

            <img
                src="${url}"
                alt="${title}"
            >

        </div>
    `;


    document.body.appendChild(modal);


    const closeButton =
        modal.querySelector(
            ".close-modal"
        );


    closeButton.onclick = () => {

        modal.remove();

    };


    modal.addEventListener(
        "click",
        event => {

            if (
                event.target === modal
            ) {

                modal.remove();

            }

        }
    );


    document.addEventListener(
        "keydown",
        function closeWithEscape(event) {

            if (
                event.key === "Escape"
            ) {

                modal.remove();

                document.removeEventListener(
                    "keydown",
                    closeWithEscape
                );

            }

        }
    );
}



/* =========================
   CHORD SEARCH
========================= */

chordSearch.addEventListener(
    "input",
    event => {

        const search =
            event.target.value
                .toLowerCase()
                .trim();


        const filtered =
            chordFiles.filter(file =>
                songName(file.name)
                    .toLowerCase()
                    .includes(search)
            );


        displayChords(filtered);

    }
);



/* =========================
   LYRIC SEARCH
========================= */

lyricSearch.addEventListener(
    "input",
    event => {

        const search =
            event.target.value
                .toLowerCase()
                .trim();


        const filtered =
            lyricFiles.filter(file =>
                songName(file.name)
                    .toLowerCase()
                    .includes(search)
            );


        displayLyrics(filtered);

    }
);



/* =========================
   CHORD BUTTON
========================= */

chordsBtn.addEventListener(
    "click",
    () => {

        chordsSection
            .classList
            .remove("hidden");


        lyricsSection
            .classList
            .add("hidden");


        chordsBtn
            .classList
            .add("active");


        lyricsBtn
            .classList
            .remove("active");

    }
);



/* =========================
   LYRICS BUTTON
========================= */

lyricsBtn.addEventListener(
    "click",
    () => {

        lyricsSection
            .classList
            .remove("hidden");


        chordsSection
            .classList
            .add("hidden");


        lyricsBtn
            .classList
            .add("active");


        chordsBtn
            .classList
            .remove("active");

    }
);



/* =========================
   START APP
========================= */

loadChords();

loadLyrics();
