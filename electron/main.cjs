const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const mm = require("music-metadata");

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".m4a", ".ogg"];

let win;

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log("Config não existe.");
      return {};
    }

    const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));

    console.log("Config carregada:", config);

    return config;
  } catch (err) {
    console.error("Erro ao ler config:", err);
    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));

    console.log("Config salva em:", CONFIG_PATH);
    console.log(config);
  } catch (err) {
    console.error("Erro ao salvar config:", err);
  }
}
// resolucao da tela/pop up
function createWindow() {
  win = new BrowserWindow({
    width: 1000,
    height: 800,
    backgroundColor: "#111111",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === "development") {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

const LIBRARY_PATH = path.join(app.getPath("userData"), "library.json");

ipcMain.handle("save-library", async (_event, data) => {
  try {
    fs.writeFileSync(LIBRARY_PATH, JSON.stringify(data, null, 2));
    return true;
  } catch (err) {
    console.error("Erro ao salvar library:", err);
    return false;
  }
});

ipcMain.handle("load-library", async () => {
  try {
    if (!fs.existsSync(LIBRARY_PATH)) return null;
    return JSON.parse(fs.readFileSync(LIBRARY_PATH, "utf-8"));
  } catch (err) {
    console.error("Erro ao carregar library:", err);
    return null;
  }
});

ipcMain.handle("select-music-folder", async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ["openDirectory"],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const folder = result.filePaths[0];

  const config = readConfig();
  config.musicFolder = folder;
  saveConfig(config);

  return folder;
});

ipcMain.handle("get-last-folder", () => {
  const config = readConfig();
  return config.musicFolder || null;
});

function scanFolder(dir) {
  let results = [];

  const entries = fs.readdirSync(dir, {
    withFileTypes: true,
  });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      results = results.concat(scanFolder(fullPath));
    } else if (
      AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())
    ) {
      results.push(fullPath);
    }
  }

  return results;
}

ipcMain.handle("scan-music-folder", async (_event, folderPath) => {
  try {
    return scanFolder(folderPath);
  } catch (err) {
    console.error("Erro ao escanear pasta:", err);
    return [];
  }
});

ipcMain.handle("read-audio-file", async (_event, filePath) => {
  return fs.readFileSync(filePath);
});

ipcMain.handle("get-track-metadata", async (_event, filePath) => {
  try {
    const metadata = await mm.parseFile(filePath);

    const { title, artist, album } = metadata.common;

    let cover = null;

    const picture = metadata.common.picture?.[0];

    if (picture) {
      cover = `data:${picture.format};base64,${picture.data.toString(
        "base64"
      )}`;
    }

    return {
      path: filePath,
      title: title || path.basename(filePath, path.extname(filePath)),
      artist: artist || "Artista desconhecido",
      album: album || "",
      duration: metadata.format.duration || 0,
      cover,
    };
  } catch (err) {
    console.error("Erro ao ler metadata:", err);

    return {
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      artist: "Artista desconhecido",
      album: "",
      duration: 0,
      cover: null,
    };
  }
});

app.whenReady().then(createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});