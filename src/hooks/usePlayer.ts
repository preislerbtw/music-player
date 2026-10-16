import { useState, useRef, useEffect, useCallback } from "react";
import type { Track } from "../types";

export function usePlayer(tracks: Track[]) {
  // audio criado uma única vez
  const [audio] = useState(() => new Audio());
  const objectUrlRef = useRef<string | null>(null);

  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(0.5);
  const [shuffle, setShuffle] = useState<boolean>(false);

  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null;

  const playTrack = useCallback(
    async (index: number) => {
      const track = tracks[index];
      if (!track) return;

      const buffer = await window.musicAPI.readAudioFile(track.path);
      const url = URL.createObjectURL(new Blob([buffer]));

      // libera a memória do blob anterior
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = url;

      audio.src = url;
      await audio.play();
      setCurrentIndex(index);
      setIsPlaying(true);
    },
    [tracks, audio]
  );

  const togglePlayPause = () => {
    if (!currentTrack) return;
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
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

  const seek = (time: number) => {
    audio.currentTime = time;
    setProgress(time);
  };

  const toggleShuffle = () => setShuffle((s) => !s);

  // esconde a barra do player (ex.: ao trocar de pasta)
  const clearCurrent = () => setCurrentIndex(-1);

  useEffect(() => {
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
  }, [audio, playNext]);

  useEffect(() => {
    audio.volume = volume;
  }, [audio, volume]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    };
  }, []);

  return {
    currentTrack,
    currentIndex,
    isPlaying,
    progress,
    duration,
    volume,
    shuffle,
    playTrack,
    togglePlayPause,
    playNext,
    playPrev,
    seek,
    setVolume,
    toggleShuffle,
    clearCurrent,
  };
}