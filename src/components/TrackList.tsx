import type { Track } from "../types";
import { formatTime } from "../utils/formatTime";

interface TrackListProps {
  tracks: Track[];
  currentIndex: number;
  loading: boolean;
  hasFolders: boolean;
  onPlay: (index: number) => void;
}

function TrackList({
  tracks,
  currentIndex,
  loading,
  hasFolders,
  onPlay,
}: TrackListProps) {
  return (
    <main className="flex-1 overflow-y-auto pb-[100px] pt-3">
      {tracks.length === 0 && !loading && (
        <p className="mt-[60px] text-center text-[#888]">
          {hasFolders
            ? "Select a folder from the sidebar."
            : 'No imported music. Click "Import Folder".'}
        </p>
      )}
      <ul>
        {tracks.map((track, index) => (
          <li key={track.path}>
            <button
              type="button"
              aria-current={index === currentIndex ? "true" : undefined}
              className={`flex w-full cursor-pointer items-center gap-3.5 rounded-md px-6 py-2.5 text-left ${
                index === currentIndex
                  ? "bg-surface-active text-brand"
                  : "hover:bg-surface"
              }`}
              onClick={() => onPlay(index)}
            >
              {track.cover ? (
                <img
                  src={track.cover}
                  alt=""
                  className="size-11 rounded-sm bg-[#222] object-cover"
                />
              ) : (
                <span className="flex size-11 items-center justify-center rounded-sm bg-[#222] text-xs text-[#555]">
                  #
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate font-medium">{track.title}</span>
                <span className="text-[13px] text-muted">{track.artist}</span>
              </span>
              <span className="text-[13px] text-muted">
                {formatTime(track.duration)}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

export default TrackList;