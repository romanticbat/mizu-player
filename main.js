const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const { autoUpdater } = require("electron-updater");

if (!app.isPackaged) {
    require('electron-reload')(__dirname);
}

let mainWindow;

app.whenReady().then(() => {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    mainWindow.loadFile("index.html");
    
    console.log("🔍 Verificando atualizações...");
    autoUpdater.checkForUpdatesAndNotify();
});

// Gerenciamento de músicas
ipcMain.handle('get-songs', () => {
    const songsDir = path.join(__dirname, 'songs');
    const coversDir = path.join(__dirname, 'covers');
    
    if (!fs.existsSync(songsDir)) fs.mkdirSync(songsDir);
    if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir);

    const files = fs.readdirSync(songsDir).filter(file => file.endsWith('.mp3'));
    return files.map(file => {
        const name = path.parse(file).name;
        const imagePath = ['png', 'jpg', 'jpeg']
            .map(ext => path.join(coversDir, `${name}.${ext}`))
            .find(fs.existsSync) || null;

        return { name: file, image: imagePath ? `file://${imagePath.replace(/\\/g, '/')}` : null };
    });
});

ipcMain.handle('upload-song', async () => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Audio Files', extensions: ['mp3'] }]
    });

    if (filePaths.length === 0) return null;

    const songPath = filePaths[0];
    const songName = path.basename(songPath);
    const destPath = path.join(__dirname, 'songs', songName);

    fs.copyFileSync(songPath, destPath);
    return songName;
});

ipcMain.handle('upload-cover', async (_, songName) => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: [{ name: 'Image Files', extensions: ['png', 'jpg', 'jpeg'] }]
    });

    if (filePaths.length === 0) return null;

    const coverPath = filePaths[0];
    const ext = path.extname(coverPath);
    const destPath = path.join(__dirname, 'covers', `${path.parse(songName).name}${ext}`);

    fs.copyFileSync(coverPath, destPath);
    return destPath;
});

ipcMain.handle("change-current-cover", async (_, songName) => {
    const { filePaths } = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "Image Files", extensions: ["png", "jpg", "jpeg"] }]
    });

    if (filePaths.length === 0) return null; // Usuário cancelou

    const coverPath = filePaths[0];
    const ext = path.extname(coverPath);
    const coversDir = path.join(__dirname, "covers");
    const newCoverPath = path.join(coversDir, `${path.parse(songName).name}${ext}`);

    fs.copyFileSync(coverPath, newCoverPath); // Substitui a capa antiga

    return newCoverPath; // Retorna o novo caminho para o renderer.js
});

ipcMain.on("remove-song", (event, songPath, coverPath) => {
    try {
        if (fs.existsSync(songPath)) {
            fs.unlinkSync(songPath); // Remove a música
        }

        if (fs.existsSync(coverPath)) {
            fs.unlinkSync(coverPath); // Remove a capa
        }

        event.reply("song-removed", "Música removida com sucesso!");
    } catch (error) {
        event.reply("song-remove-error", `Erro ao remover música: ${error.message}`);
    }
});

ipcMain.on("rename-song", (event, { currentPath, newName }) => {
    const dir = path.dirname(currentPath);
    const ext = path.extname(currentPath);
    const newFilePath = path.join(dir, newName + ext);

    const coverPath = path.join("covers", path.basename(currentPath, ext) + ".jpg");
    const newCoverPath = path.join("covers", newName + ".jpg");

    try {
        fs.renameSync(currentPath, newFilePath);

        if (fs.existsSync(coverPath)) {
            fs.renameSync(coverPath, newCoverPath);
        }

        event.reply("rename-success", { newFilePath });
    } catch (error) {
        console.error("Erro ao renomear a música:", error);
        dialog.showErrorBox("Erro", "Não foi possível renomear a música.");
    }
});

// Eventos do autoUpdater
autoUpdater.on("checking-for-update", () => {
    console.log("🔍 Verificando atualizações...");
});

autoUpdater.on("update-available", (info) => {
    console.log(`🚀 Nova atualização disponível: ${info.version}`);
    dialog.showMessageBox({
        type: "info",
        title: "Atualização disponível",
        message: `Uma nova versão (${info.version}) está disponível. O download iniciará em segundo plano.`,
        buttons: ["OK"]
    });
});

autoUpdater.on("update-not-available", () => {
    console.log("✅ Nenhuma atualização disponível.");
});

autoUpdater.on("error", (error) => {
    console.log(`❌ Erro ao buscar atualização: ${error.message}`);
});

autoUpdater.on("update-downloaded", () => {
    console.log("✅ Atualização baixada. Reiniciando o aplicativo...");
    dialog.showMessageBox({
        type: "info",
        title: "Atualização pronta",
        message: "A nova versão foi baixada. O aplicativo será reiniciado para aplicar a atualização.",
        buttons: ["Reiniciar agora"]
    }).then(() => {
        autoUpdater.quitAndInstall();
    });
});