const { ipcRenderer } = require('electron'); 
const path = require('path');

let songs = [];
let currentSongIndex = 0;
let currentTheme = 'strawberry';

const audioPlayer = document.getElementById("audioPlayer");
const songTitle = document.getElementById("songTitle");
const coverImage = document.getElementById("cover");
const playPauseBtn = document.getElementById("playPauseBtn");
const prevSongBtn = document.getElementById("prevSong");
const nextSongBtn = document.getElementById("nextSong");
const menuBtn = document.getElementById("menu");
const playlist = document.getElementById("playlist");
const volumeToggle = document.getElementById("volumeToggle");
const volumeControl = document.getElementById("volumeControl");
const progressBar = document.getElementById("progressBar");
const progressBall = document.getElementById("progressBall");
const currentTimeDisplay = document.getElementById("currentTime");
const durationDisplay = document.getElementById("duration");
const themeToggle = document.getElementById("themeToggle");
const uploadBtn = document.getElementById("uploadBtn");
const optionsBtn = document.getElementById("optionsBtn");
const optionsMenu = document.getElementById("dropdownMenu");
const changeCoverBtn = document.getElementById("changeCover");


const temas = ["strawberry", "dark", "blue", "lilac", "sunset", "ocean", "fairy", "y2k", "blackpink", "brat", "ruby", "candy", "orquideas", "ether"];

function carregarPreferencias() {
    const preferencias = JSON.parse(localStorage.getItem('preferencias')) || {};
    
    if (preferencias.tema) {
        aplicarTema(preferencias.tema);
    }

    if (preferencias.ultimaMusica && songs.length > 0) {
        const index = songs.findIndex(song => song.name === preferencias.ultimaMusica);
        if (index !== -1) {
            playSong(index);
        }
    }
}

function salvarPreferencias() {
    const preferencias = {
        tema: currentTheme,
        ultimaMusica: songs[currentSongIndex]?.name || null
    };
    localStorage.setItem('preferencias', JSON.stringify(preferencias));
}

function salvarOrdemPlaylist() {
    if (songs.length > 0) {
        const ordem = songs.map(song => song.name);
        localStorage.setItem('ordemPlaylist', JSON.stringify(ordem));
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadSongs();
    salvarOrdemPlaylist();
});

optionsBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    optionsMenu.classList.toggle("hidden");
});


document.addEventListener("click", (event) => {
    if (!optionsContainer.contains(event.target)) {
        optionsMenu.classList.add("hidden");
    }
});

changeCoverBtn.addEventListener("click", async () => {
    if (songs.length === 0) return;

    const currentSong = songs[currentSongIndex].name;
    const newCoverPath = await ipcRenderer.invoke("change-current-cover", currentSong);

    if (newCoverPath) {
        coverImage.src = `file://${newCoverPath}`;
    }
});

function aplicarTema(tema) {
    document.body.classList.remove(...temas.map(t => `${t}-mode`));
    document.body.classList.add(`${tema}-mode`);
    currentTheme = tema;
}

async function loadSongs() {
    try {
        songs = await ipcRenderer.invoke('get-songs');
        const ordemSalva = JSON.parse(localStorage.getItem('ordemPlaylist')) || [];

        if (ordemSalva.length === songs.length) {
            songs.sort((a, b) => ordemSalva.indexOf(a.name) - ordemSalva.indexOf(b.name));
        } else {
            salvarOrdemPlaylist();
        }

        playlist.innerHTML = "";

        songs.forEach((song, index) => {
            const li = document.createElement("li");
            li.textContent = song.name.replace(".mp3", "");
            li.setAttribute("draggable", true);
            li.addEventListener("click", () => playSong(index));
            playlist.appendChild(li);

            // Arrastar e soltar músicas
            li.addEventListener("dragstart", (e) => {
                e.dataTransfer.setData("text/plain", index);
                li.classList.add("dragging");
            });

            li.addEventListener("dragover", (e) => {
                e.preventDefault();
                const draggingElement = document.querySelector(".dragging");
                const elements = [...playlist.children];
                const afterElement = elements.find(child => {
                    const box = child.getBoundingClientRect();
                    return e.clientY < box.bottom;
                });

                if (afterElement) {
                    playlist.insertBefore(draggingElement, afterElement);
                } else {
                    playlist.appendChild(draggingElement);
                }
            });

            li.addEventListener("drop", (e) => {
                e.preventDefault();
                const fromIndex = parseInt(e.dataTransfer.getData("text/plain"));
                const toIndex = [...playlist.children].indexOf(li);
            
                if (fromIndex !== toIndex) {
                    const movedSong = songs.splice(fromIndex, 1)[0];
                    songs.splice(toIndex, 0, movedSong);
            
                
                    if (currentSongIndex === fromIndex) {
                        currentSongIndex = toIndex;
                    } else if (fromIndex < currentSongIndex && toIndex >= currentSongIndex) {
                        currentSongIndex--;
                    } else if (fromIndex > currentSongIndex && toIndex <= currentSongIndex) {
                        currentSongIndex++;
                    }
            
                    salvarOrdemPlaylist();
                }
            });            

            li.addEventListener("dragend", () => {
                document.querySelectorAll(".dragging").forEach(el => el.classList.remove("dragging"));
            });
        });

        carregarPreferencias();

    } catch (error) {
        console.error("Erro ao carregar músicas:", error);
    }
}

function playSong(index) {
    if (songs.length === 0) return; 

    currentSongIndex = index;
    const songPath = `file://${path.join(__dirname, 'src/assets/songs', songs[index].name).replace(/\\/g, '/')}`;

    audioPlayer.src = songPath; 
    audioPlayer.play().catch(error => console.error("Erro ao reproduzir música:", error)); 
    songTitle.textContent = songs[index].name.replace(".mp3", ""); 
    playPauseBtn.innerHTML = '<img src="src/assets/icons/pause.png" alt="Pause">';
    coverImage.src = songs[index].image || "src/assets/default-cover.jpg"

    salvarPreferencias(); 
}

function nextSong() {
    if (songs.length === 0) return; 

    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
}

audioPlayer.addEventListener("ended", () => {
    nextSong();
});

function togglePlayPause() {
    if (audioPlayer.paused) {
        audioPlayer.play().catch(error => console.error("Erro ao dar play:", error));
        playPauseBtn.innerHTML = '<img src="src/assets/icons/pause.png" alt="Pause">';
    } else {
        audioPlayer.pause();
        playPauseBtn.innerHTML = '<img src="src/assets/icons/play.png" alt="Play">';
    }
}

audioPlayer.addEventListener("ended", () => {
    nextSong();
});

audioPlayer.addEventListener("timeupdate", () => {
    if (!audioPlayer.duration || audioPlayer.ended) return;

    const progress = (audioPlayer.currentTime / audioPlayer.duration) * 100;
    progressBall.style.left = `${progress}%`;
    currentTimeDisplay.textContent = formatTime(audioPlayer.currentTime);
    durationDisplay.textContent = formatTime(audioPlayer.duration);
});

progressBar.addEventListener("click", (e) => {
    if (!audioPlayer.duration) return;
    const rect = progressBar.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audioPlayer.currentTime = percent * audioPlayer.duration;
});

function formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

// 🔹 Eventos de botão
playPauseBtn.addEventListener("click", togglePlayPause);

prevSongBtn.addEventListener("click", () => {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex - 1 + songs.length) % songs.length;
    playSong(currentSongIndex);
});

nextSongBtn.addEventListener("click", () => {
    if (songs.length === 0) return;
    currentSongIndex = (currentSongIndex + 1) % songs.length;
    playSong(currentSongIndex);
});

// 🔹 Menu e volume
menuBtn.addEventListener("click", () => {
    playlist.classList.toggle("hidden");
    playlist.style.display = playlist.classList.contains("hidden") ? 'none' : 'block';
});

volumeToggle.addEventListener("click", () => {
    volumeControl.style.display = volumeControl.style.display === "none" ? "block" : "none";
});

volumeControl.addEventListener("input", () => {
    audioPlayer.volume = volumeControl.value;
});

themeToggle.addEventListener("click", () => {
    let novoIndex = (temas.indexOf(currentTheme) + 1) % temas.length;
    aplicarTema(temas[novoIndex]);
    salvarPreferencias();
});

// 🔹 Upload de música
uploadBtn.addEventListener("click", async () => {
    const uploadedSongName = await ipcRenderer.invoke('upload-song');
    if (uploadedSongName) {
        const uploadCover = confirm("Deseja enviar uma capa para a música?");
        if (uploadCover) {
            await ipcRenderer.invoke('upload-cover', uploadedSongName);
        }
        loadSongs();
    }
});


document.getElementById("renameSong").addEventListener("click", async () => {
    const audioPlayer = document.getElementById("audioPlayer");
    let currentPath = decodeURI(audioPlayer.src.replace("file:///", "")).replace(/\//g, path.sep);

    if (!currentPath || currentPath === path.sep) {
        alert("Nenhuma música carregada.");
        return;
    }

    const newName = prompt("Digite o novo nome da música (sem extensão):");
    if (!newName) return;

    ipcRenderer.send("rename-song", { currentPath, newName });
});

ipcRenderer.on("rename-success", (event, { newFilePath }) => {
    const audioPlayer = document.getElementById("audioPlayer");
    audioPlayer.src = "file:///" + newFilePath.replace(/\\/g, "/");

    const songTitle = document.getElementById("songTitle");
    songTitle.textContent = path.basename(newFilePath, path.extname(newFilePath));
});

document.getElementById("removeSong").addEventListener("click", () => {
    if (songs.length === 0 || currentSongIndex < 0 || !songs[currentSongIndex]) {
        alert("Nenhuma música carregada para remover.");
        return;
    }

    const currentSong = songs[currentSongIndex];
    const songPath = path.join(__dirname, "songs", currentSong.name);
    const coverPath = currentSong.image ? currentSong.image.replace("file://", "") : "";

    ipcRenderer.send("remove-song", songPath, coverPath);
});

audioPlayer.addEventListener("timeupdate", () => {
    updateLyrics(audioPlayer.currentTime);
});

// 🔹 Carregar músicas ao iniciar
document.addEventListener("DOMContentLoaded", loadSongs);