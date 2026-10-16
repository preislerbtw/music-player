import { useState, useEffect, useMemo } from "react";
import type { Folder, Track } from "../types";

export interface ImportProgress {
  current: number;
  total: number;
}

export type ImportResult = "imported" | "existing" | null;

export function useLibrary() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(
    null
  );

  const tracks = useMemo<Track[]>(
    () => (selectedFolder ? selectedFolder.tracks : []),
    [selectedFolder]
  );

  useEffect(() => {
    async function restoreLibrary() {
      const saved = await window.musicAPI.loadLibrary();
      if (saved?.folders?.length) {
        setFolders(saved.folders);
        setSelectedFolder(saved.folders[0]);
      }
    }
    restoreLibrary();
  }, []);

  const removeFolder = async (folder: Folder) => {
    const updated = folders.filter((f) => f.path !== folder.path);
    setFolders(updated);
    if (selectedFolder?.path === folder.path) {
      setSelectedFolder(updated[0] || null);
    }
    await window.musicAPI.saveLibrary({ folders: updated });
  };

  const importFolder = async (): Promise<ImportResult> => {
    const folder = await window.musicAPI.selectFolder();
    if (!folder) return null;

    const folderName =
      folder.split("\\").pop() || folder.split("/").pop() || folder;

    const existing = folders.find((f) => f.path === folder);
    if (existing) {
      setSelectedFolder(existing);
      return "existing";
    }

    setLoading(true);
    const filePaths = await window.musicAPI.scanFolder(folder);

    const trackList: Track[] = [];
    for (let i = 0; i < filePaths.length; i++) {
      const meta = await window.musicAPI.getTrackMetadata(filePaths[i]);
      trackList.push(meta);
      setImportProgress({ current: i + 1, total: filePaths.length });
    }

    const newFolder: Folder = {
      name: folderName,
      path: folder,
      tracks: trackList,
    };
    const updated = [...folders, newFolder];

    setFolders(updated);
    setSelectedFolder(newFolder);
    setLoading(false);
    setImportProgress(null);

    await window.musicAPI.saveLibrary({ folders: updated });
    return "imported";
  };

  return {
    folders,
    selectedFolder,
    tracks,
    loading,
    importProgress,
    selectFolder: setSelectedFolder,
    removeFolder,
    importFolder,
  };
}