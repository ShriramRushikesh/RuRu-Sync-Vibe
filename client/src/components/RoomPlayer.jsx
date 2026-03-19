import React, { useRef, useCallback } from 'react';
import { Play, Pause, SkipForward, SkipBack, Music } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useParams } from 'react-router-dom';
import SongLyrics from './SongLyrics';
import { audioEngine } from './GlobalAudioPlayer';

export default function RoomPlayer({ isHost }) {
  const { id: roomId } = useParams();
  const {
    room,
    socket,
    currentSong,
    isPlaying,
    progress,
    setIsPlaying,
  } = useRoomStore();

  const hasSong = !!currentSong;
  const duration = currentSong?.durationMs ? currentSong.durationMs / 1000 : 0;

  // ── Seek: only emit on mouse/touch release, not every pixel drag ──────────
  const seekingRef = useRef(false);
  const seekValueRef = useRef(0);

  const handleSeekStart = () => { seekingRef.current = true; };
  const handleSeekMove = (e) => { seekValueRef.current = parseFloat(e.target.value); };
  const handleSeekEnd = useCallback(() => {
    if (!seekingRef.current || !socket || !roomId) return;
    seekingRef.current = false;
    const t = seekValueRef.current;
    audioEngine.seek(t);  // immediate local response
    socket.emit('seek', { roomId, currentTime: t });
  }, [socket, roomId]);

  // ── Play/Pause — audioEngine called IMMEDIATELY inside gesture for mobile ──
  const togglePlay = useCallback(() => {
    if (!currentSong || !socket) return;
    if (isPlaying) {
      audioEngine.pause();       // INSIDE gesture — mobile allows this
      setIsPlaying(false);
      socket.emit('pause', { roomId, currentTime: progress });
    } else {
      audioEngine.play();        // INSIDE gesture — mobile allows this
      setIsPlaying(true);
      socket.emit('play', { roomId, currentTime: progress });
    }
  }, [isPlaying, currentSong, socket, roomId, progress]);

  const playNext = useCallback(() => {
    if (room?.queue?.length > 0 && socket) {
      socket.emit('change-song', { roomId, song: room.queue[0] });
    }
  }, [room?.queue, socket, roomId]);

  const playPrevious = useCallback(() => {
    if (socket) {
      audioEngine.seek(0);
      socket.emit('seek', { roomId, currentTime: 0 });
    }
  }, [socket, roomId]);

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  // Progress percentage — use local seekValueRef while dragging for smooth UX
  const displayProgress = seekingRef.current ? seekValueRef.current : progress;
  const pct = duration > 0 ? (displayProgress / duration) * 100 : 0;

  return (
    <div className="bg-black/40 rounded-3xl border border-white/10 backdrop-blur-xl p-6 relative overflow-hidden flex flex-col">

      {/* Background blur of album art */}
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900 opacity-50" />
      {hasSong && currentSong.thumbnail && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundImage: `url(${currentSong.thumbnail})` }}
        />
      )}

      <div className="relative z-10 flex flex-col md:flex-row gap-6 md:gap-10 items-center md:items-start w-full">
        {/* Album Art */}
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl bg-zinc-800 shadow-2xl overflow-hidden flex-shrink-0 relative group">
          {hasSong && currentSong.thumbnail ? (
            <img src={currentSong.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-900 flex items-center justify-center">
              <Music className="w-24 h-24 text-white/30" />
            </div>
          )}
          {isPlaying && (
            <div className="absolute inset-0 border-4 border-pink-500/30 rounded-2xl heartbeat-pulse pointer-events-none" />
          )}
        </div>

        {/* Track Info & Controls */}
        <div className="flex-1 w-full space-y-6 flex flex-col justify-center">
          <div className="text-center md:text-left">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2 leading-tight line-clamp-2">
              {currentSong?.title || 'Nothing playing'}
            </h2>
            <p className="text-zinc-400 text-lg line-clamp-1">{currentSong?.artist || 'Search and play a song'}</p>
          </div>

          {/* Progress Bar — fires only on release */}
          <div className="space-y-2">
            <div className="relative h-3 w-full bg-white/10 rounded-full overflow-hidden flex items-center cursor-pointer">
              <div
                className="absolute left-0 h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full pointer-events-none transition-none"
                style={{ width: `${pct}%` }}
              />
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.5}
                defaultValue={0}
                onMouseDown={handleSeekStart}
                onTouchStart={handleSeekStart}
                onChange={handleSeekMove}
                onMouseUp={handleSeekEnd}
                onTouchEnd={handleSeekEnd}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={!hasSong}
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-zinc-500">
              <span>{formatTime(displayProgress)}</span>
              <span>{currentSong?.durationText || formatTime(duration) || '0:00'}</span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-center md:justify-start gap-6 mt-4 md:mt-6">
            <button
              onClick={playPrevious}
              className="text-zinc-400 hover:text-white transition"
              disabled={!hasSong}
            >
              <SkipBack className={`w-8 h-8 fill-current ${!hasSong && 'opacity-50'}`} />
            </button>

            <button
              onClick={togglePlay}
              disabled={!hasSong}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition-all ${
                hasSong
                  ? 'bg-white text-black hover:scale-105 active:scale-95 cursor-pointer'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {isPlaying ? <Pause className="w-8 h-8 fill-current" /> : <Play className="w-8 h-8 fill-current ml-1" />}
            </button>

            <button
              onClick={playNext}
              className="text-zinc-400 hover:text-white transition hover:scale-110 active:scale-95 cursor-pointer"
              disabled={!hasSong || !room?.queue?.length}
            >
              <SkipForward className={`w-8 h-8 fill-current ${(!hasSong || !room?.queue?.length) && 'opacity-50'}`} />
            </button>

            <div className="ml-auto hidden sm:flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-400 text-xs font-bold tracking-wide">
              <span>SYNC HI-FI</span>
            </div>
          </div>
        </div>
      </div>

      {currentSong && <SongLyrics currentSong={currentSong} />}
    </div>
  );
}
