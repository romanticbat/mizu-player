const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const db = new sqlite3.Database(path.join(__dirname, '../mizu.db'));

// Criar tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS preferencias (
        id INTEGER PRIMARY KEY, 
        tema TEXT, 
        ultimaMusica INTEGER,
        FOREIGN KEY (ultimaMusica) REFERENCES musicas(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playlists (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS playlist_musicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        playlist_id INTEGER,
        musica_id INTEGER,
        FOREIGN KEY (playlist_id) REFERENCES playlists(id),
        FOREIGN KEY (musica_id) REFERENCES musicas(id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS musicas (
        id INTEGER PRIMARY KEY AUTOINCREMENT, 
        nome TEXT,
        caminho TEXT, 
        capa TEXT
    )`);
});

// Criar uma nova playlist
function criarPlaylist(nome, callback) {
    db.run("INSERT INTO playlists (nome) VALUES (?)", [nome], function (err) {
        if (callback) callback(err, this.lastID);
    });
}

// Adicionar música a uma playlist
function adicionarMusicaPlaylist(playlistId, musicaId, callback) {
    db.run("INSERT INTO playlist_musicas (playlist_id, musica_id) VALUES (?, ?)", [playlistId, musicaId], callback);
}

// Remover música de uma playlist
function removerMusicaPlaylist(playlistId, musicaId, callback) {
    db.run("DELETE FROM playlist_musicas WHERE playlist_id = ? AND musica_id = ?", [playlistId, musicaId], callback);
}

// Listar músicas de uma playlist
function listarMusicasPlaylist(playlistId, callback) {
    db.all(`SELECT m.id, m.nome, m.caminho, m.capa FROM playlist_musicas pm 
            JOIN musicas m ON pm.musica_id = m.id 
            WHERE pm.playlist_id = ?`, [playlistId], (err, rows) => {
        if (callback) callback(err, rows);
    });
}

// Listar todas as playlists
function listarPlaylists(callback) {
    db.all("SELECT * FROM playlists", [], (err, rows) => {
        if (callback) callback(err, rows);
    });
}

// Deletar uma playlist
function deletarPlaylist(playlistId, callback) {
    db.run("DELETE FROM playlist_musicas WHERE playlist_id = ?", [playlistId], (err) => {
        if (err) return callback(err);
        db.run("DELETE FROM playlists WHERE id = ?", [playlistId], callback);
    });
}

module.exports = { 
    criarPlaylist, 
    adicionarMusicaPlaylist, 
    removerMusicaPlaylist, 
    listarMusicasPlaylist, 
    listarPlaylists, 
    deletarPlaylist
};
