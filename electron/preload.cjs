const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('musicAPI', {
  selectFolder: () => ipcRenderer.invoke('select-music-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-music-folder', folderPath),
  readAudioFile: (filePath) => ipcRenderer.invoke('read-audio-file', filePath),
  getTrackMetadata: (filePath) => ipcRenderer.invoke('get-track-metadata', filePath),
  getLastFolder: () => ipcRenderer.invoke("get-last-folder"),
  saveLibrary: (data) => ipcRenderer.invoke('save-library', data),
  loadLibrary: () => ipcRenderer.invoke('load-library'),
});
