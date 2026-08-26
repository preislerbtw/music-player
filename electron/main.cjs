const { app, BrowserWindow, ipcMain, dialog } = require("electron");

const path = require("path");
const fs = require("fs");
const mm = require("music-metadata");

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".m4a", ".ogg"];

let win;

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const LIBRARY_PATH = path.join(app.getPath("userData"), "library.json");

// ======================================================
// CONFIG
// ======================================================

function readConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};

    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (err) {
    console.error("Erro ao ler config:", err);
    return {};
  }
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Erro ao salvar config:", err);
  }
}

// ======================================================
// JANELA
// ======================================================

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
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

// ======================================================
// LIBRARY
// ======================================================

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

// ======================================================
// SELECIONAR PASTA DE MÚSICAS
// ======================================================

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

// ======================================================
// RECUPERAR ÚLTIMA PASTA
// ======================================================

ipcMain.handle("get-last-folder", () => {
  const config = readConfig();

  return config.musicFolder || null;
});

// ======================================================
// ESCANEAR PASTA
// ======================================================

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

// ======================================================
// LER ARQUIVO DE ÁUDIO
// ======================================================

ipcMain.handle("read-audio-file", async (_event, filePath) => {
  return fs.readFileSync(filePath);
});

// ======================================================
// BUSCA DE CAPA ONLINE
// MusicBrainz + Cover Art Archive
// ======================================================

const MB_USER_AGENT = "MyMusicPlayer/1.0 (contato@exemplo.com)";

let lastMbRequest = 0;

// Respeita o limite aproximado de 1 requisição por segundo
async function respeitarRateLimit() {
  const agora = Date.now();

  const espera = Math.max(0, 1100 - (agora - lastMbRequest));

  if (espera > 0) {
    await new Promise((resolve) => setTimeout(resolve, espera));
  }

  lastMbRequest = Date.now();
}

// ======================================================
// LIMPAR TÍTULO
// ======================================================

// Remove informações comuns adicionadas por vídeos do YouTube.
// Exemplo:
//
// "The Weeknd - Blinding Lights (Official Video)"
//
// vira:
//
// "The Weeknd - Blinding Lights"
//
function limparTitulo(bruto) {
  return bruto
    .replace(/\(official\s*(music\s*)?video\)/gi, "")
    .replace(/\(lyric\s*video\)/gi, "")
    .replace(/\(official\s*audio\)/gi, "")
    .replace(/\(lyrics?\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}

// ======================================================
// EXTRAIR ARTISTA E TÍTULO
// ======================================================

function extrairArtistaETitulo(tituloOriginal, artistaTag) {
  // Se a tag do artista já estiver preenchida,
  // usamos ela diretamente.
  if (artistaTag && artistaTag !== "Artista desconhecido") {
    return {
      artista: artistaTag,
      titulo: limparTitulo(tituloOriginal),
    };
  }

  // Limpa o título antes de tentar separar artista e música
  const limpo = limparTitulo(tituloOriginal);

  // Tenta encontrar o formato:
  //
  // Artista - Música
  //
  const partes = limpo.split(/\s-\s/);

  if (partes.length >= 2) {
    return {
      artista: partes[0].trim(),
      titulo: partes.slice(1).join(" - ").trim(),
    };
  }

  return {
    artista: null,
    titulo: limpo,
  };
}

// ======================================================
// BUSCAR CAPA ONLINE
// ======================================================

async function buscarCapaOnline(artista, titulo) {
  try {
    if (!artista || !titulo) {
      return null;
    }

    await respeitarRateLimit();

    const query = encodeURIComponent(
      `recording:"${titulo}" AND artist:"${artista}"`
    );

    const res = await fetch(
      `https://musicbrainz.org/ws/2/recording/?query=${query}&fmt=json&limit=1`,
      {
        headers: {
          "User-Agent": MB_USER_AGENT,
        },
      }
    );

    if (!res.ok) {
      console.log(
        "MusicBrainz respondeu:",
        res.status,
        artista,
        "-",
        titulo
      );

      return null;
    }

    const data = await res.json();

    const releaseId = data.recordings?.[0]?.releases?.[0]?.id;

    if (!releaseId) {
      console.log(
        "Sem release encontrado para:",
        artista,
        "-",
        titulo
      );

      return null;
    }

    const coverRes = await fetch(
      `https://coverartarchive.org/release/${releaseId}`,
      {
        headers: {
          "User-Agent": MB_USER_AGENT,
        },
      }
    );

    if (!coverRes.ok) {
      return null;
    }

    const coverData = await coverRes.json();

    return (
      coverData.images?.[0]?.thumbnails?.small ||
      coverData.images?.[0]?.image ||
      null
    );
  } catch (err) {
    console.error(
      "Erro ao buscar capa online:",
      artista,
      titulo,
      err.message
    );

    return null;
  }
}

// ======================================================
// METADATA DA MÚSICA
// ======================================================

ipcMain.handle("get-track-metadata", async (_event, filePath) => {
  try {
    const metadata = await mm.parseFile(filePath);

    const { title, artist, album } = metadata.common;

    // --------------------------------------------
    // 1. Procura capa dentro do próprio arquivo
    // --------------------------------------------

    let cover = null;

    const picture = metadata.common.picture?.[0];

    if (picture) {
      cover = `data:${picture.format};base64,${picture.data.toString(
        "base64"
      )}`;
    }

    // --------------------------------------------
    // 2. Descobre título e artista
    // --------------------------------------------

    const tituloBruto =
      title || path.basename(filePath, path.extname(filePath));

    const {
      artista: artistaExtraido,
      titulo: tituloExtraido,
    } = extrairArtistaETitulo(tituloBruto, artist);

    const artistaFinal =
      artistaExtraido || "Artista desconhecido";

    // --------------------------------------------
    // 3. Se não tiver capa embutida,
    //    procura online
    // --------------------------------------------

    if (!cover && artistaExtraido) {
      cover = await buscarCapaOnline(
        artistaExtraido,
        tituloExtraido
      );
    }

    // --------------------------------------------
    // 4. Retorna os dados
    // --------------------------------------------

    return {
      path: filePath,
      title: tituloExtraido,
      artist: artistaFinal,
      album: album || "",
      duration: metadata.format.duration || 0,
      cover,
    };
  } catch (err) {
    console.error("Erro ao ler metadata:", err);

    return {
      path: filePath,
      title: path.basename(
        filePath,
        path.extname(filePath)
      ),
      artist: "Artista desconhecido",
      album: "",
      duration: 0,
      cover: null,
    };
  }
});

// ======================================================
// EVENTOS DO ELECTRON
// ======================================================

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