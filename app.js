// ==========================================
// GITHUB SETTINGS
// ==========================================

// මෙතන ඔයාගේ GitHub username එක දාන්න
const GITHUB_USERNAME = "inforedflagalerts-byte";

// මෙතන repository එකේ නම දාන්න
const GITHUB_REPO = "band-song-book";

const CHORD_FOLDER = "chords";
const LYRICS_FOLDER = "lyrics";


// ==========================================
// SCREEN CONTROL
// ==========================================

function hideAllScreens() {
    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });
}

function openSection(section) {
    hideAllScreens();

    document.getElementById(section).classList.add("active");

    if (section === "chords") {
        loadChords();
    }

    if (section === "lyrics") {
        loadLyrics();
    }
}

function goHome() {
    hideAllScreens();
    document.getElementById("home").classList.add("active");
}


// ==========================================
// GITHUB API
// ==========================================

async function getGitHubFiles(folder) {

    const url =
        `https://api.github.com/repos/${GITHUB_USERNAME}/${GITHUB_REPO}/contents/${folder}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error("GitHub folder not found");
    }

    return await response.json();
}


// ==========================================
// CHORDS
// ==========================================

async function loadChords() {

    const container = document.getElementById("chordList");

    container.innerHTML = `
        <p style="color:#777;text-align:center;">
            Loading chords...
        </p>
    `;

    try {

        const files = await getGitHubFiles(CHORD_FOLDER);

        const images = files.filter(file => {

            const name = file.name.toLowerCase();

            return (
                name.endsWith(".jpg") ||
                name.endsWith(".jpeg") ||
                name.endsWith(".png") ||
                name.endsWith(".webp")
            );

        });

        displayChords(images);

    } catch (error) {

        container.innerHTML = `
            <p style="color:#ff7777;text-align:center;">
                Could not load chord photos.
            </p>
        `;

        console.error(error);
    }
}


function displayChords(images) {

    const container = document.getElementById("chordList");

    container.innerHTML = "";

    if (images.length === 0) {

        container.innerHTML = `
            <p style="color:#777;text-align:center;">
                No chord photos found.
            </p>
        `;

        return;
    }


    images.forEach(file => {

        const item = document.createElement("div");

        item.className = "song-item";

        const songName = cleanSongName(file.name);

        item.innerHTML = `
            🎸 <strong>${songName}</strong>
        `;

        item.onclick = function () {
            openChord(songName, file.download_url);
        };

        container.appendChild(item);

    });
}


// ==========================================
// CHORD SEARCH
// ==========================================

let allChordFiles = [];


async function searchChords() {

    const search =
        document.getElementById("chordSearch")
        .value
        .toLowerCase()
        .trim();

    if (allChordFiles.length === 0) {

        try {
            const files = await getGitHubFiles(CHORD_FOLDER);

            allChordFiles = files.filter(file => {

                const name = file.name.toLowerCase();

                return (
                    name.endsWith(".jpg") ||
                    name.endsWith(".jpeg") ||
                    name.endsWith(".png") ||
                    name.endsWith(".webp")
                );

            });

        } catch {
            return;
        }
    }


    const filtered = allChordFiles.filter(file =>
        cleanSongName(file.name)
            .toLowerCase()
            .includes(search)
    );

    displayChords(filtered);
}


// ==========================================
// OPEN CHORD PHOTO
// ==========================================

function openChord(name, imageURL) {

    hideAllScreens();

    document.getElementById("chordViewer")
        .classList.add("active");

    document.getElementById("chordTitle")
        .textContent = name;

    document.getElementById("chordImage")
        .src = imageURL;
}


// ==========================================
// LYRICS
// ==========================================

async function loadLyrics() {

    const container =
        document.getElementById("lyricsList");

    container.innerHTML = `
        <p style="color:#777;text-align:center;">
            Loading lyrics...
        </p>
    `;

    try {

        const files = await getGitHubFiles(LYRICS_FOLDER);

        const lyricFiles = files.filter(file =>
            file.name.toLowerCase().endsWith(".txt")
        );

        displayLyrics(lyricFiles);

    } catch {

        container.innerHTML = `
            <p style="color:#ff7777;text-align:center;">
                Could not load lyrics.
            </p>
        `;
    }
}


function displayLyrics(files) {

    const container =
        document.getElementById("lyricsList");

    container.innerHTML = "";

    files.forEach(file => {

        const item = document.createElement("div");

        item.className = "song-item";

        const songName = cleanSongName(file.name);

        item.innerHTML = `
            🎤 <strong>${songName}</strong>
        `;

        item.onclick = function () {
            openLyrics(songName, file.download_url);
        };

        container.appendChild(item);

    });
}


// ==========================================
// SEARCH LYRICS
// ==========================================

let allLyricsFiles = [];


async function searchLyrics() {

    const search =
        document.getElementById("lyricsSearch")
        .value
        .toLowerCase()
        .trim();

    if (allLyricsFiles.length === 0) {

        try {

            const files =
                await getGitHubFiles(LYRICS_FOLDER);

            allLyricsFiles = files.filter(file =>
                file.name.toLowerCase().endsWith(".txt")
            );

        } catch {
            return;
        }
    }


    const filtered = allLyricsFiles.filter(file =>
        cleanSongName(file.name)
            .toLowerCase()
            .includes(search)
    );

    displayLyrics(filtered);
}


// ==========================================
// OPEN LYRICS
// ==========================================

async function openLyrics(name, fileURL) {

    hideAllScreens();

    document.getElementById("lyricsViewer")
        .classList.add("active");

    document.getElementById("lyricsTitle")
        .textContent = name;

    const lyricsBox =
        document.getElementById("lyricsText");

    lyricsBox.textContent = "Loading...";


    try {

        const response = await fetch(fileURL);

        const text = await response.text();

        lyricsBox.textContent = text;

    } catch {

        lyricsBox.textContent =
            "Lyrics could not be loaded.";

    }
}


// ==========================================
// CLEAN FILE NAME
// ==========================================

function cleanSongName(filename) {

    return filename
        .replace(/\.(jpg|jpeg|png|webp|txt)$/i, "")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();

}
