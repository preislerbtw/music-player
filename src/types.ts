export interface Track {
  path: string;
  title: string;
  artist: string;
  album: string;
  duration: number;
  cover: string | null;
  verified?: boolean;
}

export interface Folder {
  name: string;
  path: string;
  tracks: Track[];
}

export interface Library {
  folders: Folder[];
}