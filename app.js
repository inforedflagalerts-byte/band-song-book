const chordFiles = [
  {
    name: "77 Kanda Kenda",
    file: "77kanda kenda new_page-0001.jpg"
  }
];

const lyricsFiles = [];

const chordsBtn = document.getElementById("chordsBtn");
const lyricsBtn = document.getElementById("lyricsBtn");
const chordsSection = document.getElementById("chordsSection");
const lyricsSection = document.getElementById("lyricsSection");
const chordList = document.getElementById("chordList");
const lyricList = document.getElementById("lyricList");
const chordSearch = document.getElementById("chordSearch");
const lyricSearch = document.getElementById("lyricSearch");

function showChords() {
  chordsSection.classList.remove("hidden");
  lyricsSection.classList.add("hidden");

  chordsBtn.classList.add("active");
  lyricsBtn.classList.remove("active");

  displayChords(chordFiles);
}

function showLyrics() {
  lyricsSection.classList.remove("hidden");
  chordsSection.classList.add("hidden");

  lyricsBtn.classList.add("active");
  chordsBtn.classList.remove("active");

  displayLyrics(lyricsFiles);
}

function displayChords(files) {
  chordList.innerHTML = "";

  if (files.length === 0) {
    chordList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎵</div>
        <p>No chord songs found</p>
      </div>
    `;
    return;
  }

  files.forEach(song => {
    const card = document.createElement("div");
    card.className = "song-card";

    const imagePath = `./chords/${encodeURIComponent(song.file)}`;

    card.innerHTML = `
      <div class="song-image">
        <img src="${imagePath}" alt="${song.name}">
        <div class="play-icon">🎸</div>
      </div>

      <div class="song-info">
        <h3>${song.name}</h3>
        <p>Chord Sheet</p>
      </div>
    `;

    card.querySelector(".song-image").addEventListener("click", () => {
      openImage(imagePath, song.name);
    });

    chordList.appendChild(card);
  });
}

function displayLyrics(files) {
  lyricList.innerHTML = "";

  if (files.length === 0) {
    lyricList.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🎤</div>
        <p>No lyrics added yet</p>
      </div>
    `;
    return;
  }
}

function openImage(src, title) {
  const modal = document.createElement("div");
  modal.className = "image-modal";

  modal.innerHTML = `
    <div class="modal-top">
      <span>🎵 ${title}</span>
      <button class="close-modal">×</button>
    </div>

    <div class="modal-content">
      <img src="${src}" alt="${title}">
    </div>
  `;

  document.body.appendChild(modal);

  modal.querySelector(".close-modal").onclick = () => {
    modal.remove();
  };

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.remove();
    }
  };
}

chordsBtn.addEventListener("click", showChords);
lyricsBtn.addEventListener("click", showLyrics);

chordSearch.addEventListener("input", () => {
  const value = chordSearch.value.toLowerCase();

  const filtered = chordFiles.filter(song =>
    song.name.toLowerCase().includes(value)
  );

  displayChords(filtered);
});

lyricSearch.addEventListener("input", () => {
  const value = lyricSearch.value.toLowerCase();

  const filtered = lyricsFiles.filter(song =>
    song.name.toLowerCase().includes(value)
  );

  displayLyrics(filtered);
});

showChords();
