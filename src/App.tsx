import type { Folder } from "./types";
import { useLibrary } from "./utils/useLibrary";
import { usePlayer } from "./hooks/usePlayer";
import Header from "./components/Header";
import Sidebar from "./components/SideBar";
import TrackList from "./components/TrackList";
import PlayerBar from "./components/PlayerBar";

function App() {
  const library = useLibrary();
  const player = usePlayer(library.tracks);

  const handleSelectFolder = (folder: Folder) => {
    library.selectFolder(folder);
    player.clearCurrent();
  };

  const handleRemoveFolder = async (folder: Folder) => {
    if (library.selectedFolder?.path === folder.path) {
      player.clearCurrent();
    }
    await library.removeFolder(folder);
  };

  const handleImport = async () => {
    const result = await library.importFolder();
    if (result === "imported") player.clearCurrent();
  };

  return (
    <div className="flex h-screen flex-col">
      <Header
        loading={library.loading}
        importProgress={library.importProgress}
        onImport={handleImport}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          folders={library.folders}
          selectedPath={library.selectedFolder?.path}
          onSelect={handleSelectFolder}
          onRemove={handleRemoveFolder}
        />
        <TrackList
          tracks={library.tracks}
          currentIndex={player.currentIndex}
          loading={library.loading}
          hasFolders={library.folders.length > 0}
          onPlay={player.playTrack}
        />
      </div>

      {player.currentTrack && (
        <PlayerBar
          track={player.currentTrack}
          isPlaying={player.isPlaying}
          progress={player.progress}
          duration={player.duration}
          volume={player.volume}
          shuffle={player.shuffle}
          onTogglePlay={player.togglePlayPause}
          onPrev={player.playPrev}
          onNext={player.playNext}
          onToggleShuffle={player.toggleShuffle}
          onSeek={player.seek}
          onVolumeChange={player.setVolume}
        />
      )}
    </div>
  );
}

export default App;