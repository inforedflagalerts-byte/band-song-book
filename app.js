const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";

const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;
const LIST_CACHE_KEY = "bandSongBookData_v8";
const IMAGE_CACHE = "song-book-images-v5";

let chords = [];
let lyrics = [];

/* ---------- DOM ---------- */
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
const viewerLoading = document.getElementById("viewerLoading");
const viewerError = document.getElementById("viewerError");
const viewerTitle = document.getElementById("viewerTitle");
const viewerStatus = document.getElementById("viewerStatus");
const closeViewer = document.getElementById("closeViewer");
const status = document.getElementById("status");

/* ---------- service worker ---------- */
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./sw.js", { updateViaCache: "none" })
            .then(reg => reg.update().catch(() => {}))
            .catch(() => {});
    });
}

/* ---------- status ---------- */
function updateStatus() {
    if (!status) return;
    status.textContent = navigator.onLine ? "● Online" : "● Offline Ready";
    status.style.color = navigator.onLine ? "#8ed89b" : "#c59dd9";
}
updateStatus();
window.addEventListener("online", () => {
    updateStatus();
    loadData(true);
});
window.addEventListener("offline", updateStatus);

/* ---------- helpers ---------- */
function cleanName(name = "") {
    return name
        .replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function imageURL(file) {
    return file.download_url || file.raw_url || "";
}

function isImageFile(file) {
    return file &&
        file.type === "file" &&
        /\.(jpg|jpeg|png|webp|gif|bmp|avif)$/i.test(file.name || "");
}

/* ---------- GitHub ---------- */
async function loadFolder(folder) {
    const url = `${API}/${encodeURIComponent(folder)}?ref=${encodeURIComponent(BRANCH)}&_=${Date.now()}`;

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        headers: {
            "Accept": "application/vnd.github+json",
            "Cache-Control": "no-cache"
        }
    });

    if (!response.ok) {
        throw new Error(`GitHub ${folder}: HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error(`GitHub ${folder}: unexpected response`);
    }

    return data
        .filter(isImageFile)
        .map(file => ({
            name: file.name,
            path: file.path,
            download_url: file.download_url,
            raw_url: `https://raw.githubusercontent.com/${USERNAME}/${REPO}/${BRANCH}/${file.path}`
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base"
        }));
}

/* ---------- local list cache ---------- */
function saveListData() {
    try {
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({
            chords,
            lyrics,
            savedAt: Date.now()
        }));
    } catch (_) {}
}

function loadListData() {
    try {
        const saved = localStorage.getItem(LIST_CACHE_KEY);
        if (!saved) return false;

        const data = JSON.parse(saved);

        chords = Array.isArray(data.chords) ? data.chords : [];
        lyrics = Array.isArray(data.lyrics) ? data.lyrics : [];

        return true;
    } catch (_) {
        chords = [];
        lyrics = [];
        return false;
    }
}

/* ---------- render ---------- */
function renderChords(list) {
    if (!chordList) return;

    const count = document.getElementById("chordCount");
    if (count) count.textContent = list.length;

    chordList.innerHTML = "";

    if (!list.length) {
        chordList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎸</div>
                No chord sheets available.
            </div>`;
        return;
    }

    list.forEach(file => {
        chordList.appendChild(createSongItem(file, "chord"));
    });
}

function renderLyrics(list) {
    if (!lyricList) return;

    const count = document.getElementById("lyricCount");
    if (count) count.textContent = list.length;

    lyricList.innerHTML = "";

    if (!list.length) {
        lyricList.innerHTML = `
            <div class="empty">
                <div class="empty-icon">🎤</div>
                No lyrics available.
            </div>`;
        return;
    }

    list.forEach(file => {
        lyricList.appendChild(createSongItem(file, "lyric"));
    });
}

function createSongItem(file, type) {
    const item = document.createElement("div");
    item.className = "song-item";

    const icon = document.createElement("div");
    icon.className = "song-icon";
    icon.textContent = type === "chord" ? "🎸" : "🎤";

    const details = document.createElement("div");
    details.className = "song-details";

    const name = document.createElement("div");
    name.className = "song-name";
    name.textContent = cleanName(file.name);

    const sub = document.createElement("div");
    sub.className = "song-type";
    sub.textContent = type === "chord"
        ? "Chord Sheet • Tap to open"
        : "Lyrics • Tap to open";

    const arrow = document.createElement("div");
    arrow.className = "song-arrow";
    arrow.textContent = "›";

    details.append(name, sub);
    item.append(icon, details, arrow);

    item.addEventListener("click", () => {
        openViewer(imageURL(file), cleanName(file.name));
    });

    return item;
}

/* ---------- data loading ---------- */
async function loadData(forceFresh = false) {
    if (!forceFresh) {
        loadListData();
        renderChords(chords);
        renderLyrics(lyrics);
    }

    if (!navigator.onLine) {
        return;
    }

    try {
        const [newChords, newLyrics] = await Promise.all([
            loadFolder("chords"),
            loadFolder("lyrics")
        ]);

        // IMPORTANT:
        // Replace the old arrays completely.
        // This makes deleted GitHub files disappear
        // and newly uploaded files appear automatically.
        chords = newChords;
        lyrics = newLyrics;

        saveListData();
        renderChords(chords);
        renderLyrics(lyrics);
    } catch (error) {
        console.error("Library update failed:", error);

        // Keep cached data if GitHub is temporarily unavailable.
        if (!chords.length && !lyrics.length) {
            renderChords(chords);
            renderLyrics(lyrics);
        }
    }
}

/* ---------- search ---------- */
if (chordSearch) {
    chordSearch.addEventListener("input", event => {
        const text = event.target.value.toLowerCase().trim();
        renderChords(chords.filter(file =>
            cleanName(file.name).toLowerCase().includes(text)
        ));
    });
}

if (lyricSearch) {
    lyricSearch.addEventListener("input", event => {
        const text = event.target.value.toLowerCase().trim();
        renderLyrics(lyrics.filter(file =>
            cleanName(file.name).toLowerCase().includes(text)
        ));
    });
}

/* ---------- tabs ---------- */
if (chordsBtn) {
    chordsBtn.addEventListener("click", () => {
        chordsSection?.classList.remove("hidden");
        lyricsSection?.classList.add("hidden");
        chordsBtn.classList.add("active");
        lyricsBtn?.classList.remove("active");
    });
}

if (lyricsBtn) {
    lyricsBtn.addEventListener("click", () => {
        lyricsSection?.classList.remove("hidden");
        chordsSection?.classList.add("hidden");
        lyricsBtn.classList.add("active");
        chordsBtn?.classList.remove("active");
    });
}

/* ---------- image cache ---------- */
async function getImageCache() {
    if (!("caches" in window)) return null;
    return caches.open(IMAGE_CACHE);
}

async function downloadAndCacheImage(url) {
    const cache = await getImageCache();

    if (cache) {
        const existing = await cache.match(url);
        if (existing) {
            return URL.createObjectURL(await existing.blob());
        }
    }

    if (!navigator.onLine) {
        throw new Error("OFFLINE_IMAGE_NOT_SAVED");
    }

    const response = await fetch(url, {
        cache: "no-store",
        mode: "cors"
    });

    if (!response.ok) {
        throw new Error("Image download failed");
    }

    if (cache) {
        await cache.put(url, response.clone());
    }

    return URL.createObjectURL(await response.blob());
}

/* ---------- viewer / zoom ---------- */
let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function applyZoom() {
    if (!viewerImage) return;
    viewerImage.style.transform =
        `translate3d(${zoomX}px, ${zoomY}px, 0) scale(${zoomScale})`;
}

function resetZoom() {
    zoomScale = 1;
    zoomX = 0;
    zoomY = 0;
    applyZoom();
}

function setZoom(value) {
    zoomScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, value));

    if (zoomScale === 1) {
        zoomX = 0;
        zoomY = 0;
    }

    applyZoom();
}

async function openViewer(url, title) {
    if (!viewer || !viewerImage || !url) return;

    viewer.classList.remove("hidden");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (viewerTitle) viewerTitle.textContent = title || "Song";
    if (viewerStatus) viewerStatus.textContent = "Loading…";

    viewerLoading?.classList.remove("hidden");
    viewerError?.classList.add("hidden");
    viewerImage.classList.add("hidden");
    viewerImage.removeAttribute("src");

    resetZoom();

    try {
        const objectURL = await downloadAndCacheImage(url);

        viewerImage.onload = () => {
            viewerLoading?.classList.add("hidden");
            viewerImage.classList.remove("hidden");
            if (viewerStatus) viewerStatus.textContent = "Ready";
        };

        viewerImage.onerror = () => {
            viewerLoading?.classList.add("hidden");
            viewerError?.classList.remove("hidden");
            if (viewerStatus) viewerStatus.textContent = "Unable to display";
            URL.revokeObjectURL(objectURL);
        };

        viewerImage.src = objectURL;
    } catch (error) {
        viewerLoading?.classList.add("hidden");
        viewerError?.classList.remove("hidden");

        if (viewerStatus) {
            viewerStatus.textContent =
                error.message === "OFFLINE_IMAGE_NOT_SAVED"
                    ? "Not saved"
                    : "Error";
        }
    }
}

async function closeImageViewer() {
    if (!viewer) return;

    const oldURL = viewerImage?.src || "";

    viewer.classList.add("hidden");
    viewer.setAttribute("aria-hidden", "true");

    if (viewerImage) {
        viewerImage.removeAttribute("src");
        viewerImage.classList.add("hidden");
    }

    resetZoom();
    document.body.style.overflow = "";

    if (oldURL.startsWith("blob:")) {
        setTimeout(() => URL.revokeObjectURL(oldURL), 0);
    }

    if (document.fullscreenElement) {
        try {
            await document.exitFullscreen();
        } catch (_) {}
    }
}

closeViewer?.addEventListener("click", closeImageViewer);

viewer?.addEventListener("click", event => {
    if (event.target === viewer) closeImageViewer();
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape" && !viewer?.classList.contains("hidden")) {
        closeImageViewer();
    }
});

viewerBody?.addEventListener("wheel", event => {
    if (viewer?.classList.contains("hidden")) return;

    event.preventDefault();
    setZoom(zoomScale + (event.deltaY < 0 ? 0.15 : -0.15));
}, { passive: false });

let drag = false;
let dragStartX = 0;
let dragStartY = 0;
let dragOriginX = 0;
let dragOriginY = 0;

viewerImage?.addEventListener("mousedown", event => {
    if (zoomScale <= 1) return;

    drag = true;
    dragStartX = event.clientX;
    dragStartY = event.clientY;
    dragOriginX = zoomX;
    dragOriginY = zoomY;
    event.preventDefault();
});

window.addEventListener("mousemove", event => {
    if (!drag) return;

    zoomX = dragOriginX + event.clientX - dragStartX;
    zoomY = dragOriginY + event.clientY - dragStartY;
    applyZoom();
});

window.addEventListener("mouseup", () => {
    drag = false;
});

/* ---------- start ---------- */
chordList && (chordList.innerHTML = `<div class="empty">🎸 Loading library...</div>`);
lyricList && (lyricList.innerHTML = `<div class="empty">🎤 Loading library...</div>`);

loadData(true);
