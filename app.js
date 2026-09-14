```javascript
// ===============================
// SONG DATABASE
// ===============================

const chords = [
    {
        name: "Adare Kiya",
        image: "chords/adare-kiya.jpg"
    },

    {
        name: "Sanda Eliya",
        image: "chords/sanda-eliya.jpg"
    }
];


const lyrics = [
    {
        name: "Adare Kiya",
        file: "lyrics/adare-kiya.txt"
    },

    {
        name: "Sanda Eliya",
        file: "lyrics/sanda-eliya.txt"
    }
];


// ===============================
// SCREEN CONTROL
// ===============================

function hideAllScreens() {

    document.querySelectorAll(".screen").forEach(screen => {
        screen.classList.remove("active");
    });

}


function openSection(section) {

    hideAllScreens();

    document.getElementById(section).classList.add("active");

    if (section === "chords") {
        displayChords(chords);
    }

    if (section === "lyrics") {
        displayLyrics(lyrics);
    }
}


function goHome() {

    hideAllScreens();

    document.getElementById("home").classList.add("active");

}


// ===============================
// CHORDS
// ===============================

function displayChords(list) {

    const container = document.getElementById("chordList");

    container.innerHTML = "";

    if (list.length === 0) {

        container.innerHTML =
            `<p style="color:#777;text-align:center;">
                No songs found
            </p>`;

        return;
    }


    list.forEach(song => {

        const item = document.createElement("div");

        item.className = "song-item";

        item.innerHTML = `
            🎸 <strong>${song.name}</strong>
        `;

        item.onclick = function () {
            openChord(song);
        };

        container.appendChild(item);

    });

}


function searchChords() {

    const search =
        document.getElementById("chordSearch")
        .value
        .toLowerCase();

    const filtered = chords.filter(song =>
        song.name.toLowerCase().includes(search)
    );

    displayChords(filtered);

}


function openChord(song) {

    hideAllScreens();

    document.getElementById("chordViewer")
        .classList.add("active");

    document.getElementById("chordTitle")
        .textContent = song.name;

    document.getElementById("chordImage")
        .src = song.image;

}


// ===============================
// LYRICS
// ===============================

function displayLyrics(list) {

    const container = document.getElementById("lyricsList");

    container.innerHTML = "";


    if (list.length === 0) {

        container.innerHTML =
            `<p style="color:#777;text-align:center;">
                No songs found
            </p>`;

        return;
    }


    list.forEach(song => {

        const item = document.createElement("div");

        item.className = "song-item";

        item.innerHTML = `
            🎤 <strong>${song.name}</strong>
        `;

        item.onclick = function () {
            openLyrics(song);
        };

        container.appendChild(item);

    });

}


function searchLyrics() {

    const search =
        document.getElementById("lyricsSearch")
        .value
        .toLowerCase();

    const filtered = lyrics.filter(song =>
        song.name.toLowerCase().includes(search)
    );

    displayLyrics(filtered);

}


async function openLyrics(song) {

    hideAllScreens();

    document.getElementById("lyricsViewer")
        .classList.add("active");

    document.getElementById("lyricsTitle")
        .textContent = song.name;


    const lyricsBox =
        document.getElementById("lyricsText");

    lyricsBox.textContent = "Loading...";


    try {

        const response = await fetch(song.file);

        if (!response.ok) {
            throw new Error("File not found");
        }

        const text = await response.text();

        lyricsBox.textContent = text;

    } catch (error) {

        lyricsBox.textContent =
            "Lyrics could not be loaded.";

    }

}
```
