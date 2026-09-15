(() => {
"use strict";

const USERNAME = "inforedflagalerts-byte";
const REPO = "band-song-book";
const BRANCH = "main";
const API = `https://api.github.com/repos/${USERNAME}/${REPO}/contents`;

const LIST_CACHE_KEY = "bandSongBookData_v10";
const IMAGE_CACHE = "song-book-images-v10";

let chords = [];
let lyrics = [];

const $ = id => document.getElementById(id);

const chordsBtn = $("chordsBtn");
const lyricsBtn = $("lyricsBtn");
const chordsSection = $("chordsSection");
const lyricsSection = $("lyricsSection") || $("lyricSection");
const chordList = $("chordList");
const lyricList = $("lyricList");
const chordSearch = $("chordSearch");
const lyricSearch = $("lyricSearch");

const viewer = $("viewer");
const viewerBody = $("viewerBody");
const viewerImage = $("viewerImage");
const viewerLoading = $("viewerLoading");
const viewerError = $("viewerError");
const viewerTitle = $("viewerTitle");
const viewerStatus = $("viewerStatus");
const closeViewer = $("closeViewer");
const fullscreenViewer = $("fullscreenViewer");
const status = $("status");

let currentObjectURL = null;
let zoomScale = 1;
let zoomX = 0;
let zoomY = 0;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function updateStatus(text) {
    if (!status) return;
    status.textContent = text || (navigator.onLine ? "● Online" : "● Offline Ready");
}

function cleanName(name = "") {
    return name.replace(/\.[^/.]+$/, "")
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function isImageFile(file) {
    return file &&
        file.type === "file" &&
        /\.(jpg|jpeg|png|webp|gif|bmp|avif)$/i.test(file.name || "");
}

function imageURL(file) {
    return file.download_url ||
        `https://raw.githubusercontent.com/${USERNAME}/${REPO}/${BRANCH}/${file.path}`;
}

/* ---------- GitHub library ---------- */

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
        throw new Error(`${folder}: GitHub HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
        throw new Error(`${folder}: GitHub did not return a folder list`);
    }

    return data
        .filter(isImageFile)
        .map(file => ({
            name: file.name,
            path: file.path,
            download_url: file.download_url,
            html_url: file.html_url
        }))
        .sort((a, b) => a.name.localeCompare(b.name, undefined, {
            numeric: true,
            sensitivity: "base"
        }));
}

function saveListData() {
    try {
        localStorage.setItem(LIST_CACHE_KEY, JSON.stringify({ chords, lyrics }));
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

async function loadData() {
    if (!chordList || !lyricList) {
        updateStatus("● App HTML error");
        return;
    }

    // Show old saved list immediately, then replace it with GitHub's current list.
    loadListData();
    renderChords(chords);
    renderLyrics(lyrics);

    if (!navigator.onLine) {
        updateStatus("● Offline Ready");
        return;
    }

    updateStatus("● Updating…");

    try {
        const [newChords, newLyrics] = await Promise.all([
            loadFolder("chords"),
            loadFolder("lyrics")
        ]);

        // Replace completely: new GitHub files appear, deleted files disappear.
        chords = newChords;
        lyrics = newLyrics;

        saveListData();
        renderChords(chords);
        renderLyrics(lyrics);

        updateStatus(`● Online • ${chords.length + lyrics.length} songs`);
    } catch (error) {
        console.error("Song library update failed:", error);
        // Keep whatever cached list is available.
        renderChords(chords);
        renderLyrics(lyrics);
        updateStatus(navigator.onLine ? "● Online • Cached list" : "● Offline Ready");
    }
}

/* ---------- render ---------- */

function createSongItem(file, type) {
    const item = document.createElement("div");
    item.className = "song-item";
    item.setAttribute("role", "button");
    item.tabIndex = 0;

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

    const open = () => openViewer(imageURL(file), cleanName(file.name));
    item.addEventListener("click", open);
    item.addEventListener("keydown", e => {
        if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            open();
        }
    });

    return item;
}

function renderChords(list) {
    if (!chordList) return;
    const count = $("chordCount");
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

    list.forEach(file => chordList.appendChild(createSongItem(file, "chord")));
}

function renderLyrics(list) {
    if (!lyricList) return;
    const count = $("lyricCount");
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

    list.forEach(file => lyricList.appendChild(createSongItem(file, "lyric")));
}

/* ---------- tabs/search ---------- */

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

chordSearch?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    renderChords(chords.filter(f => cleanName(f.name).toLowerCase().includes(q)));
});

lyricSearch?.addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    renderLyrics(lyrics.filter(f => cleanName(f.name).toLowerCase().includes(q)));
});

/* ---------- image cache ---------- */

async function getImageCache() {
    if (!("caches" in window)) return null;
    return caches.open(IMAGE_CACHE);
}

async function downloadAndCacheImage(url) {
    const cache = await getImageCache();

    if (cache) {
        const existing = await cache.match(url);
        if (existing) return URL.createObjectURL(await existing.blob());
    }

    if (!navigator.onLine) throw new Error("OFFLINE_IMAGE_NOT_SAVED");

    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
        mode: "cors"
    });

    if (!response.ok) {
        throw new Error(`Image HTTP ${response.status}`);
    }

    // Store the original response bytes. No canvas, no resizing, no compression.
    if (cache) await cache.put(url, response.clone());

    return URL.createObjectURL(await response.blob());
}

/* ---------- viewer ---------- */

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

function setViewerState(state) {
    viewerLoading?.classList.toggle("hidden", state !== "loading");
    viewerError?.classList.toggle("hidden", state !== "error");

    if (state === "loading" && viewerStatus) {
        viewerStatus.textContent = navigator.onLine
            ? "Downloading & saving this image…"
            : "Checking saved image…";
    }
    if (state === "ready" && viewerStatus) {
        viewerStatus.textContent = zoomScale > 1
            ? `${zoomScale.toFixed(2)}x • Original image`
            : "Original image • Saved offline";
    }
    if (state === "error" && viewerStatus) {
        viewerStatus.textContent = "Not saved on this device";
    }
}

async function openViewer(url, title) {
    if (!viewer || !viewerImage || !url) return;

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }

    viewer.classList.remove("hidden");
    viewer.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    if (viewerTitle) viewerTitle.textContent = title || "Song";
    viewerImage.classList.add("hidden");
    viewerImage.removeAttribute("src");
    resetZoom();
    setViewerState("loading");

    try {
        const objectURL = await downloadAndCacheImage(url);
        currentObjectURL = objectURL;

        viewerImage.onload = () => {
            viewerLoading?.classList.add("hidden");
            viewerError?.classList.add("hidden");
            viewerImage.classList.remove("hidden");
            setViewerState("ready");
        };

        viewerImage.onerror = () => {
            viewerLoading?.classList.add("hidden");
            viewerError?.classList.remove("hidden");
            viewerImage.classList.add("hidden");
            if (currentObjectURL) URL.revokeObjectURL(currentObjectURL);
            currentObjectURL = null;
        };

        // Blob URL points to the exact downloaded original bytes.
        viewerImage.src = objectURL;
    } catch (error) {
        console.error("Viewer error:", error);
        setViewerState("error");
        if (error.message !== "OFFLINE_IMAGE_NOT_SAVED") {
            viewerError?.querySelector("strong")?.replaceChildren(
                document.createTextNode("Could not load this image")
            );
            viewerError?.querySelector("p")?.replaceChildren(
                document.createTextNode("Check your internet connection and try again.")
            );
        }
    }
}

function closeImageViewer() {
    if (!viewer) return;

    viewer.classList.add("hidden");
    viewer.classList.remove("is-fullscreen");
    viewer.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    if (currentObjectURL) {
        URL.revokeObjectURL(currentObjectURL);
        currentObjectURL = null;
    }

    if (viewerImage) {
        viewerImage.removeAttribute("src");
        viewerImage.classList.add("hidden");
    }

    resetZoom();
}

closeViewer?.addEventListener("click", closeImageViewer);

viewer?.addEventListener("click", e => {
    if (e.target === viewerBody) return;
});

document.addEventListener("keydown", e => {
    if (viewer?.classList.contains("hidden")) return;
    if (e.key === "Escape") {
        if (document.fullscreenElement) {
            document.exitFullscreen?.().catch(() => {});
        } else {
            closeImageViewer();
        }
    }
    if (e.key === "+" || e.key === "=") setZoom(zoomScale + .25);
    if (e.key === "-" || e.key === "_") setZoom(zoomScale - .25);
    if (e.key === "0") resetZoom();
});

viewerImage?.addEventListener("wheel", e => {
    e.preventDefault();
    setZoom(zoomScale + (e.deltaY < 0 ? .2 : -.2));
}, { passive: false });

let pinchStart = 0;
let pinchZoom = 1;

viewerImage?.addEventListener("touchstart", e => {
    if (e.touches.length === 2) {
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        pinchStart = Math.hypot(dx, dy);
        pinchZoom = zoomScale;
    }
}, { passive: true });

viewerImage?.addEventListener("touchmove", e => {
    if (e.touches.length !== 2 || !pinchStart) return;
    e.preventDefault();
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    const distance = Math.hypot(dx, dy);
    if (distance > 0) setZoom(pinchZoom * (distance / pinchStart));
}, { passive: false });

viewerImage?.addEventListener("touchend", () => {
    pinchStart = 0;
}, { passive: true });

/* ---------- optional browser fullscreen ---------- */

fullscreenViewer?.addEventListener("click", async () => {
    try {
        if (document.fullscreenElement) {
            await document.exitFullscreen();
            viewer?.classList.remove("is-fullscreen");
            fullscreenViewer.textContent = "⛶";
        } else if (viewer?.requestFullscreen) {
            await viewer.requestFullscreen();
            viewer?.classList.add("is-fullscreen");
            fullscreenViewer.textContent = "⤢";
        } else {
            viewer?.classList.toggle("is-fullscreen");
        }
    } catch (_) {
        viewer?.classList.toggle("is-fullscreen");
    }
});

document.addEventListener("fullscreenchange", () => {
    if (!viewer || !fullscreenViewer) return;
    const full = !!document.fullscreenElement;
    viewer.classList.toggle("is-fullscreen", full);
    fullscreenViewer.textContent = full ? "⤢" : "⛶";
});

/* ---------- network + service worker ---------- */

window.addEventListener("online", () => {
    updateStatus();
    loadData();
});

window.addEventListener("offline", () => {
    updateStatus();
});

if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
        try {
            const reg = await navigator.serviceWorker.register("./sw.js?v=10", {
                updateViaCache: "none"
            });
            await reg.update().catch(() => {});
        } catch (e) {
            console.warn("Service worker unavailable:", e);
        }
    });
}

/* Start only after DOM is ready. */
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadData, { once: true });
} else {
    loadData();
}

})();
