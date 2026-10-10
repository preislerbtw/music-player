import type { Library, Track } from "./types";

export {};

declare global {
  interface Window {
    musicAPI: {
      selectFolder: () => Promise<string | null>;
      scanFolder: (folderPath: string) => Promise<string[]>;
      readAudioFile: (filePath: string) => Promise<Uint8Array<ArrayBuffer>>;
      getTrackMetadata: (filePath: string) => Promise<Track>;
      getLastFolder: () => Promise<string | null>;
      saveLibrary: (data: Library) => Promise<boolean>;
      loadLibrary: () => Promise<Library | null>;
    };
  }
}