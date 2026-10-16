import type { CSSProperties } from "react";
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
import type { Track } from "../types";
import { formatTime } from "../utils/formatTime";
import IconButton from "./IconButton";

interface PlayerBarProps {
  track: Track;
  isPlaying: boolean;
  progress: number;
  duration: number;
  volume: number;
  shuffle: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onToggleShuffle: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
}

function PlayerBar({
  track,
  isPlaying,
  progress,
  duration,
  volume,
  shuffle,
  onTogglePlay,
  onPrev,
  onNext,
  onToggleShuffle,
  onSeek,
  onVolumeChange,
}: PlayerBarProps) {
  return (
    <footer className="flex h-[72px] items-center justify-between bg-black px-4 text-white">
      <div className="flex min-w-[200px] items-center gap-3">
        {track.cover ? (
          <img
            src={track.cover}
            alt=""
            className="size-12 rounded-sm object-cover"
          />
        ) : (
          <div className="flex size-12 items-center justify-center rounded-sm text-[11px] text-[#555]">
            #
          </div>
        )}
        <div>
          <div className="flex items-center gap-1.5 text-[13px] font-semibold">
            {track.title}
            {track.verified && (
              <span className="inline-flex size-3.5 items-center justify-center rounded-full bg-brand text-[10px] text-black">
                ✓
              </span>
            )}
          </div>
          <div className="text-[11px] text-muted">{track.artist}</div>
        </div>
      </div>

      <div className="flex max-w-[600px] flex-1 flex-col items-center">
        <div className="mb-1.5 flex items-center gap-[18px]">
          <IconButton label="Shuffle" active={shuffle} onClick={onToggleShuffle}>
            <Shuffle size={16} />
          </IconButton>
          <IconButton label="Previous" onClick={onPrev}>
            <SkipBack size={18} />
          </IconButton>
          <button
            type="button"
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex size-[30px] cursor-pointer items-center justify-center rounded-full bg-white text-black"
            onClick={onTogglePlay}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <IconButton label="Next" onClick={onNext}>
            <SkipForward size={18} />
          </IconButton>
          <IconButton label="Repeat">
            <Repeat size={16} />
          </IconButton>
        </div>

        <div className="flex w-full items-center gap-2">
          <span className="min-w-8 text-center text-[11px] text-muted">
            {formatTime(progress)}
          </span>
          <input
            type="range"
            aria-label="Seek"
            className="range flex-1"
            min="0"
            max={duration || 0}
            value={progress}
            onChange={(e) => onSeek(Number(e.target.value))}
            style={
              {
                "--progress": `${duration ? (progress / duration) * 100 : 0}%`,
              } as CSSProperties
            }
          />
          <span className="min-w-8 text-center text-[11px] text-muted">
            {formatTime(duration)}
          </span>
        </div>
      </div>

      <div className="flex min-w-[200px] items-center justify-end gap-3.5">
        <IconButton label="Cast">
          <Cast size={16} />
        </IconButton>
        <IconButton label="Queue">
          <ListMusic size={16} />
        </IconButton>
        <IconButton label="Volume">
          <Volume2 size={16} />
        </IconButton>
        <input
          type="range"
          aria-label="Volume"
          className="range w-20"
          min="0"
          max="1"
          step="0.1"
          value={volume}
          onChange={(e) => onVolumeChange(Number(e.target.value))}
          style={{ "--progress": `${volume * 100}%` } as CSSProperties}
        />
        <IconButton label="Fullscreen">
          <Maximize size={16} />
        </IconButton>
      </div>
    </footer>
  );
}

export default PlayerBar;