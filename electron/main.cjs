const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const mm = require('music-metadata');

const AUDIO_EXTENSIONS = ['.mp3', '.flac', '.wav', '.m4a', '.ogg'];

let win;

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,
    backgroundColor: '#111111',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

// abre o seletor de pasta
ipcMain.handle('select-music-folder', async () => {
  const result = await dialog.showOpenDialog(win, {
    properties: ['openDirectory'],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

// le a pasta recursivamente e retorna os caminhos dos arquivos de áudio
function scanFolder(dir) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results = results.concat(scanFolder(fullPath));
    } else if (AUDIO_EXTENSIONS.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }
  return results;
}

ipcMain.handle('scan-music-folder', async (_event, folderPath) => {
  try {
    return scanFolder(folderPath);
  } catch (err) {
    console.error('Erro ao escanear pasta:', err);
    return [];
  }
});

// le um arquivo de áudio como buffer para tocar no renderer
ipcMain.handle('read-audio-file', async (_event, filePath) => {
  const buffer = fs.readFileSync(filePath);
  return buffer;
});

// extrai titulo, artista, álbum e capa
ipcMain.handle('get-track-metadata', async (_event, filePath) => {
  try {
    const metadata = await mm.parseFile(filePath);
    const { title, artist, album } = metadata.common;
    let cover = null;
    const picture = metadata.common.picture?.[0];
    if (picture) {
      cover = `data:${picture.format};base64,${picture.data.toString('base64')}`;
    }
    return {
      path: filePath,
      title: title || path.basename(filePath, path.extname(filePath)),
      artist: artist || 'Artista desconhecido',
      album: album || '',
      duration: metadata.format.duration || 0,
      cover,
    };
  } catch (err) {
    console.error('Erro ao ler metadata de', filePath, err);
    return {
      path: filePath,
      title: path.basename(filePath, path.extname(filePath)),
      artist: 'Artista desconhecido',
      album: '',
      duration: 0,
      cover: null,
    };
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
