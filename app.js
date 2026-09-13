import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";


const firebaseConfig = {
  apiKey: "AIzaSyBZlnbDkfu0ucO5h6tscWsLhKO2v7DUNuc",
  authDomain: "band-song-book.firebaseapp.com",
  projectId: "band-song-book",
  storageBucket: "band-song-book.firebasestorage.app",
  messagingSenderId: "523471759825",
  appId: "1:523471759825:web:6f6ae48a632b1bdd6e18f0"
};


const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


const songList = document.getElementById("songList");
const searchInput = document.getElementById("searchInput");

let songs = [];


async function loadSongs() {

  try {

    const snapshot = await getDocs(collection(db, "songs"));

    songs = [];

    snapshot.forEach((doc) => {

      songs.push({
        id: doc.id,
        ...doc.data()
      });

    });

    displaySongs(songs);

  } catch (error) {

    console.error(error);

    songList.innerHTML =
      "<p>❌ Songs load කරන්න බැරි වුණා.</p>";

  }

}


function displaySongs(list) {

  if (list.length === 0) {

    songList.innerHTML =
      "<p>🎵 තාම Songs නැහැ.</p>";

    return;
  }


  songList.innerHTML = "";


  list.forEach((song) => {

    const div = document.createElement("div");

    div.className = "song";


    div.innerHTML = `
      <h2>🎵 ${song.name || "Unnamed Song"}</h2>
    `;


    songList.appendChild(div);

  });

}


searchInput.addEventListener("input", () => {

  const text =
    searchInput.value.toLowerCase();


  const filtered = songs.filter(song =>

    (song.name || "")
      .toLowerCase()
      .includes(text)

  );


  displaySongs(filtered);

});


loadSongs();
