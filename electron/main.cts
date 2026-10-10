import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "node:path";
import fs from "node:fs";

interface Config {
  musicFolder?: string;
}

interface TrackMeta {
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string | null;
}

interface ArtistaETitulo {
  artista: string | null;
  titulo: string;
}

interface MusicBrainzResponse {
  recordings?: { releases?: { id: string }[] }[];
}

interface CoverArtResponse {
  images?: {
    image?: string;
    thumbnails?: { small?: string };
  }[];
}

const AUDIO_EXTENSIONS = [".mp3", ".flac", ".wav", ".m4a", ".ogg"];

let win: BrowserWindow | null = null;

const CONFIG_PATH = path.join(app.getPath("userData"), "config.json");
const LIBRARY_PATH = path.join(app.getPath("userData"), "library.json");


function readConfig(): Config {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};

    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8")) as Config;
  } catch (err) {
    console.error("Erro ao ler config:", err);
    return {};
  }
}

function saveConfig(config: Config): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch (err) {
    console.error("Erro ao salvar config:", err);
  }
}

function createWindow(): void {
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
    win.loadFile(path.join(__dirname, "../../dist/index.html"));
  }
}


ipcMain.handle("save-library", async (_event, data: unknown) => {
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
  const options: Electron.OpenDialogOptions = {
    properties: ["openDirectory"],
  };

  const result = win
    ? await dialog.showOpenDialog(win, options)
    : await dialog.showOpenDialog(options);

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


function scanFolder(dir: string): string[] {
  let results: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

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

ipcMain.handle("scan-music-folder", async (_event, folderPath: string) => {
  try {
    return scanFolder(folderPath);
  } catch (err) {
    console.error("Erro ao escanear pasta:", err);

    return [];
  }
});


ipcMain.handle("read-audio-file", async (_event, filePath: string) => {
  return fs.readFileSync(filePath);
});


const MB_USER_AGENT = "MyMusicPlayer/1.0 (contato@exemplo.com)";

let lastMbRequest = 0;

// Respeita o limite aproximado de 1 requisição por segundo
async function respeitarRateLimit(): Promise<void> {
  const agora = Date.now();

  const espera = Math.max(0, 1100 - (agora - lastMbRequest));

  if (espera > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, espera));
  }

  lastMbRequest = Date.now();
}

function limparTitulo(bruto: string): string {
  return bruto
    .replace(/\(official\s*(music\s*)?video\)/gi, "")
    .replace(/\(lyric\s*video\)/gi, "")
    .replace(/\(official\s*audio\)/gi, "")
    .replace(/\(lyrics?\)/gi, "")
    .replace(/\[.*?\]/g, "")
    .trim();
}


function extrairArtistaETitulo(
  tituloOriginal: string,
  artistaTag?: string
): ArtistaETitulo {
  // se a tag do artista já estiver preenchida, usa ela diretamente
  if (artistaTag && artistaTag !== "Artista desconhecido") {
    return {
      artista: artistaTag,
      titulo: limparTitulo(tituloOriginal),
    };
  }

  const limpo = limparTitulo(tituloOriginal);

  // Tenta o formato "Artista - Música"
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

async function buscarCapaOnline(
  artista: string | null,
  titulo: string
): Promise<string | null> {
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
      console.log("MusicBrainz respondeu:", res.status, artista, "-", titulo);

      return null;
    }

    const data = (await res.json()) as MusicBrainzResponse;

    const releaseId = data.recordings?.[0]?.releases?.[0]?.id;

    if (!releaseId) {
      console.log("Sem release encontrado para:", artista, "-", titulo);

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

    const coverData = (await coverRes.json()) as CoverArtResponse;

    return (
      coverData.images?.[0]?.thumbnails?.small ||
      coverData.images?.[0]?.image ||
      null
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);

    console.error("Erro ao buscar capa online:", artista, titulo, message);

    return null;
  }
}


ipcMain.handle(
  "get-track-metadata",
  async (_event, filePath: string): Promise<TrackMeta> => {
    try {
      // music-metadata é ESM-only: import dinâmico dentro de um módulo CJS
      const { parseFile } = await import("music-metadata");
      const metadata = await parseFile(filePath);

      const { title, artist, album } = metadata.common;

      // 1. Procura capa dentro do próprio arquivo
      let cover: string | null = null;

      const picture = metadata.common.picture?.[0];

      if (picture) {
        cover = `data:${picture.format};base64,${Buffer.from(
          picture.data
        ).toString("base64")}`;
      }

      // 2. Descobre título e artista
      const tituloBruto =
        title || path.basename(filePath, path.extname(filePath));

      const { artista: artistaExtraido, titulo: tituloExtraido } =
        extrairArtistaETitulo(tituloBruto, artist);

      const artistaFinal = artistaExtraido || "Artista desconhecido";

      // 3. Se não tiver capa embutida, procura online
      if (!cover && artistaExtraido) {
        cover = await buscarCapaOnline(artistaExtraido, tituloExtraido);
      }

      // 4. Retorna os dados
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
        title: path.basename(filePath, path.extname(filePath)),
        artist: "Artista desconhecido",
        album: "",
        duration: 0,
        cover: null,
      };
    }
  }
);

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