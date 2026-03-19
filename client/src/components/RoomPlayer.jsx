import React from 'react';
import { Play, Pause, SkipForward, SkipBack, Heart as HeartIcon, Music } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import { useParams } from 'react-router-dom';
import SongLyrics from './SongLyrics';

export default function RoomPlayer({ isHost }) {
  const { id: roomId } = useParams();
  const { 
    room, 
    socket, 
    currentSong, 
    isPlaying, 
    progress, 
    setIsPlaying, 
    setCurrentSong 
  } = useRoomStore();

  const hasSong = !!currentSong;
  // Note: duration is calculated from the store or from the song object if available
  const duration = currentSong?.durationMs ? currentSong.durationMs / 1000 : 0;

  const togglePlay = () => {
    if (!currentSong) return;
    if (isPlaying) {
      setIsPlaying(false);
      socket.emit('pause', { roomId, currentTime: progress });
    } else {
      setIsPlaying(true);
      socket.emit('play', { roomId, currentTime: progress });
    }
  };

  const handleSeek = (e) => {
    if (!currentSong) return;
    const newTime = parseFloat(e.target.value);
    // Optimistic update
    socket.emit('seek', { roomId, currentTime: newTime });
  };

  const playNext = () => {
    if (room?.queue?.length > 0) {
      socket.emit('change-song', { roomId, song: room.queue[0] });
    }
  };

  const playPrevious = () => {
    // Current implementation just restarts the song
    socket.emit('seek', { roomId, currentTime: 0 });
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const totalSeconds = Math.floor(secs);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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
        {/* Album Art Container */}
        <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-2xl bg-zinc-800 shadow-2xl overflow-hidden flex-shrink-0 relative group">
          {hasSong && currentSong.thumbnail ? (
            <img src={currentSong.thumbnail} alt="thumbnail" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-800 to-pink-900 flex items-center justify-center">
               <Music className="w-24 h-24 text-white/30" />
            </div>
          )}
          
          {/* Heartbeat pulse overlay */}
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

          {/* Progress Bar (Interactive) */}
          <div className="space-y-2 group/progress">
            <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden flex items-center">
              <div 
                className="absolute left-0 h-full bg-gradient-to-r from-pink-500 to-purple-500 rounded-full pointer-events-none"
                style={{ width: `${duration > 0 ? (progress / duration) * 100 : 0}%` }}
              />
              <input 
                type="range"
                min={0}
                max={duration || 100}
                value={progress}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={!hasSong}
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-zinc-500">
              <span>{formatTime(progress)}</span>
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
              <SkipBack className={`w-8 h-8 fill-current ${(!hasSong) && 'opacity-50'}`} />
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

            {/* Music Badge */}
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
