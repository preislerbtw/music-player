import { useState, useRef, useEffect, useCallback } from "react";
import { Shuffle, SkipBack, Play, Pause, SkipForward, Repeat, Cast, ListMusic, Volume2, Maximize, } from "lucide-react";
import "../styles/App.css";

function formatTime(seconds) {
  if (!seconds || isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function App() {
  const [tracks, setTracks] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef(new Audio());

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const handleImportFolder = async () => {
    const folder = await window.musicAPI.selectFolder();
    if (!folder) return;

    setLoading(true);
    const filePaths = await window.musicAPI.scanFolder(folder);

    const trackList = [];
    for (const filePath of filePaths) {
      const meta = await window.musicAPI.getTrackMetadata(filePath);
      trackList.push(meta);
    }
    setTracks(trackList);
    setLoading(false);
  };

  const playTrack = useCallback(
    async (index) => {
      const track = tracks[index];
      if (!track) return;

      const buffer = await window.musicAPI.readAudioFile(track.path);
      const blob = new Blob([buffer]);
      const url = URL.createObjectURL(blob);

      audioRef.current.src = url;
      audioRef.current.play();
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks],
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
    if (currentIndex < tracks.length - 1) {
      playTrack(currentIndex + 1);
    }
  }, [currentIndex, tracks.length, playTrack]);

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
    const v = Number(e.target.value);
    audioRef.current.volume = v;
    setVolume(v);
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

  return (
    <div className="app">
      <header className="header">
        <h1>My Player</h1>
        <button
          className="import-btn"
          onClick={handleImportFolder}
          disabled={loading}
        >
          {loading ? "Carregando..." : "Importar Pasta"}
        </button>
      </header>

      <main className="library">
        {tracks.length === 0 && !loading && (
          <p className="empty-state">
            No imported music. Click "Import Folder"..
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
              <Shuffle size={16} className="icon-btn"></Shuffle>
              <SkipBack size={18} className="icon-btn" onClick={playPrev}></SkipBack>
              <button className="play-btn" onClick={togglePlayPause}>
                {isPlaying ? <Pause size={16} /> : <Play size={16}/>}
              </button>
              <SkipForward size={18} className="icon-btn" onClick={playNext}></SkipForward>
              <Repeat size={16} className="icon-btn"></Repeat>
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
              style={{'--progress': `${duration ? (progress / duration) * 100 : 0}%`}}
            />
            <span className="time">{formatTime(duration)}</span>
            </div>
          </div>

          <div className="player-right">
            <Cast size={16} className="icon-btn"></Cast>
            <ListMusic size={16} className="icon-btn"></ListMusic>
            <Volume2 size={16} className="icon-btn"></Volume2>
            <input
            type="range"
            className="volume-bar"
            min="0"
            max="1"
            step="0.1"
            value={volume}
            onChange={handleVolumeChange}
            style={{ '--progress': `${volume * 100}%` }}
          />
          <Maximize size={16} className="icon-btn" />
          </div>
        </footer>
      )}
    </div>
  );
}

export default App;