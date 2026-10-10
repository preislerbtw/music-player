import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("musicAPI", {
  selectFolder: () => ipcRenderer.invoke("select-music-folder"),
  scanFolder: (folderPath: string) =>
    ipcRenderer.invoke("scan-music-folder", folderPath),
  readAudioFile: (filePath: string) =>
    ipcRenderer.invoke("read-audio-file", filePath),
  getTrackMetadata: (filePath: string) =>
    ipcRenderer.invoke("get-track-metadata", filePath),
  getLastFolder: () => ipcRenderer.invoke("get-last-folder"),
  saveLibrary: (data: unknown) => ipcRenderer.invoke("save-library", data),
  loadLibrary: () => ipcRenderer.invoke("load-library"),
});