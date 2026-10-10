import { useState, useRef, useEffect, useCallback } from "react";
import {
  Shuffle,
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Cast,
  ListMusic,
  Volume2,
  Maximize,
} from "lucide-react";
import "../styles/App.css";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function App() {
  const [folders, setFolders] = useState([]);
  const [selectedFolder, setSelectedFolder] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(new Audio());
  const [contextMenu, setContextMenu] = useState(null);
  const [shuffle, setShuffle] = useState(false);
  const [importProgress, setImportProgress] = useState(null);

  const tracks = selectedFolder ? selectedFolder.tracks : [];
  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const handleRightClick = (e, folder) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      folder,
    });
  };

  const handleDeleteFolder = async () => {
    const updated = folders.filter((f) => f.path !== contextMenu.folder.path);
    setFolders(updated);
    if (selectedFolder?.path == contextMenu.folder.path) {
      setSelectedFolder(updated[0] || null);
      setCurrentIndex(-1);
    }
    setContextMenu(null);
    window.musicAPI.saveLibrary({ folders: updated });
  };

  const handleImportFolder = async () => {
    const folder = await window.musicAPI.selectFolder();
    if (!folder) return;

    const folderName = folder.split("\\").pop() || folder.split("/").pop();

    if (folders.find((f) => f.path === folder)) {
      setSelectedFolder(folders.find((f) => f.path === folder));
      return;
    }

    setLoading(true);
    const filePaths = await window.musicAPI.scanFolder(folder);

    const trackList = [];
    for (let i = 0; i < filePaths.length; i++) {
      const meta = await window.musicAPI.getTrackMetadata(filePaths[i]);
      trackList.push(meta);
      setImportProgress({ current: i + 1, total: filePaths.length });
    }

    const newFolder = { name: folderName, path: folder, tracks: trackList };
    const updated = [...folders, newFolder];

    setFolders(updated);
    setSelectedFolder(newFolder);
    setCurrentIndex(-1);
    setLoading(false);
    setImportProgress(null);

    await window.musicAPI.saveLibrary({ folders: updated });
  };

  const playTrack = useCallback(
    async (index) => {
      const track = tracks[index];
      if (!track) return;

      const buffer = await window.musicAPI.readAudioFile(track.path);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      audioRef.current.src = url;
      audioRef.current.volume = volume;
      await audioRef.current.play();
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks, volume]
  );

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const playNext = useCallback(() => {
    if (shuffle) {
      const randomIndex = Math.floor(Math.random() * tracks.length);
      playTrack(randomIndex);
    } else if (currentIndex < tracks.length - 1) {
      playTrack(currentIndex + 1);
    }
  }, [currentIndex, tracks.length, playTrack, shuffle]);

  const playPrev = () => {
    if (currentIndex > 0) {
      playTrack(currentIndex - 1);
    }
  };

  const handleSeek = (e) => {
    const time = Number(e.target.value);
    audioRef.current.currentTime = time;
    setProgress(time);
  };

  const handleVolumeChange = (e) => {
    setVolume(Number(e.target.value));
  };

  useEffect(() => {
    const audio = audioRef.current;
    const onTimeUpdate = () => setProgress(audio.currentTime);
    const onLoadedMetadata = () => setDuration(audio.duration);
    const onEnded = () => playNext();

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [playNext]);

  useEffect(() => {
    audioRef.current.volume = volume;
  }, [volume]);

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

  useEffect(() => {
    const close = () => setContextMenu(null);
    window.addEventListener("click", close);
    return () => window.removeEventListener("click", close);
  }, []);

  return (
    <div className="app">
      <header className="header">
        <h1>My Player</h1>
        <button
          className="import-btn"
          onClick={handleImportFolder}
          disabled={loading}
        >
          {loading
            ? importProgress
              ? `Importing ${importProgress.current}/${importProgress.total}...`
              : "Loading..."
            : "Import Folder"}
        </button>
      </header>

      <div className="main-layout">
        <aside className="sidebar">
          <p className="sidebar-label">Your Library</p>
          {folders.length === 0 && (
            <p className="sidebar-empty">No folders yet.</p>
          )}
          {folders.map((folder) => (
            <div
              key={folder.path}
              className={`sidebar-item ${selectedFolder?.path === folder.path ? "active" : ""}`}
              onClick={() => {
                setSelectedFolder(folder);
                setCurrentIndex(-1);
              }}
              onContextMenu={(e) => handleRightClick(e, folder)}
            >
              <div className="folder-icon"></div>
              <div>
                <div className="folder-name">{folder.name}</div>
                <div className="folder-count">
                  {folder.tracks.length} músicas
                </div>
              </div>
            </div>
          ))}

          {contextMenu && (
            <div
              className="context-menu"
              style={{ top: contextMenu.y, left: contextMenu.x }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="context-menu-item delete"
                onClick={handleDeleteFolder}
              >
                Remove Folder
              </button>
            </div>
          )}
        </aside>

        <main className="library">
          {tracks.length === 0 && !loading && (
            <p className="empty-state">
              {folders.length === 0
                ? 'No imported music. Click "Import Folder".'
                : "Select a folder from the sidebar."}
            </p>
          )}
          <ul className="track-list">
            {tracks.map((track, index) => (
              <li
                key={track.path}
                className={`track-item ${index === currentIndex ? "active" : ""}`}
                onClick={() => playTrack(index)}
              >
                {track.cover ? (
                  <img src={track.cover} alt="" className="cover" />
                ) : (
                  <div className="cover placeholder">#</div>
                )}
                <div className="track-info">
                  <span className="title">{track.title}</span>
                  <span className="artist">{track.artist}</span>
                </div>
                <span className="duration">{formatTime(track.duration)}</span>
              </li>
            ))}
          </ul>
        </main>
      </div>

      {currentTrack && (
        <footer className="player-bar">
          <div className="now-playing">
            {currentTrack.cover ? (
              <img src={currentTrack.cover} alt="" className="cover-small" />
            ) : (
              <div className="cover-small placeholder">#</div>
            )}
            <div>
              <div className="title">
                {currentTrack.title}
                {currentTrack.verified && (
                  <span className="verified-badge">✓</span>
                )}
              </div>
              <div className="artist">{currentTrack.artist}</div>
            </div>
          </div>

          <div className="player-center">
            <div className="controls">
              <Shuffle
                size={16}
                className="icon-btn"
                onClick={() => setShuffle(!shuffle)}
                style={{ color: shuffle ? "#1db954" : "#ccc" }}
              />
              <SkipBack size={18} className="icon-btn" onClick={playPrev} />
              <button className="play-btn" onClick={togglePlayPause}>
                {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <SkipForward size={18} className="icon-btn" onClick={playNext} />
              <Repeat size={16} className="icon-btn" />
            </div>

            <div className="seek">
              <span className="time">{formatTime(progress)}</span>
              <input
                type="range"
                className="seek-bar"
                min="0"
                max={duration || 0}
                value={progress}
                onChange={handleSeek}
                style={{
                  "--progress": `${duration ? (progress / duration) * 100 : 0}%`,
                }}
              />
              <span className="time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-right">
            <Cast size={16} className="icon-btn" />
            <ListMusic size={16} className="icon-btn" />
            <Volume2 size={16} className="icon-btn" />
            <input
              type="range"
              className="volume-bar"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              style={{ "--progress": `${volume * 100}%` }}
            />
            <Maximize size={16} className="icon-btn" />
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;