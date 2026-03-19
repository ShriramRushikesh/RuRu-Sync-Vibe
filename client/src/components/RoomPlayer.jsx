import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Volume2, Search, ListMusic, Heart as HeartIcon, Music, Loader2 } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';
import YouTube from 'react-youtube';
import { useParams } from 'react-router-dom';
import SongLyrics from './SongLyrics';

export default function RoomPlayer({ isHost }) {
  const { id: roomId } = useParams();
  const { room, socket } = useRoomStore();
  const [currentSong, setCurrentSong] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [pendingState, setPendingState] = useState(null);
  
  const hasSong = !!currentSong;
  const syncDataRef = useRef({ currentTime: 0, updatedAt: 0 });
  const playerRef = useRef(null);

  useEffect(() => {
    if (!socket) return;
    
    const onSyncPlay = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { currentTime, updatedAt };
      if (!playerRef.current) return;
      setIsPlaying(true);
      const delay = (Date.now() - updatedAt) / 1000;
      playerRef.current.seekTo(currentTime + delay, true);
      playerRef.current.playVideo();
    };
    
    const onSyncPause = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { currentTime, updatedAt };
      if (!playerRef.current) return;
      setIsPlaying(false);
      playerRef.current.pauseVideo();
    };
    
    const onSyncSeek = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { currentTime, updatedAt };
      if (!playerRef.current) return;
      const delay = (Date.now() - updatedAt) / 1000;
      playerRef.current.seekTo(currentTime + delay, true);
      setProgress(currentTime + delay);
    };
    
    const onSyncSong = (song) => {
      syncDataRef.current = { currentTime: 0, updatedAt: Date.now() };
      setCurrentSong(song);
      setIsPlaying(true);
      if (playerRef.current) {
        playerRef.current.loadVideoById(song.videoId || song.id);
        playerRef.current.playVideo();
      }
    };
    
    const onSyncState = (state) => {
      if (!state.song) return;
      syncDataRef.current = { currentTime: state.currentTime, updatedAt: state.updatedAt };
      setCurrentSong(state.song);
      setIsPlaying(state.isPlaying);
      if (playerRef.current) {
        playerRef.current.loadVideoById(state.song.videoId || state.song.id);
        const delay = (Date.now() - state.updatedAt) / 1000;
        playerRef.current.seekTo(state.currentTime + delay, true);
        if (state.isPlaying) playerRef.current.playVideo();
        else playerRef.current.pauseVideo();
      } else {
        setPendingState(state);
      }
    };

    socket.on('sync-play', onSyncPlay);
    socket.on('sync-pause', onSyncPause);
    socket.on('sync-seek', onSyncSeek);
    socket.on('sync-song', onSyncSong);
    socket.on('sync-state', onSyncState);

    return () => {
      socket.off('sync-play', onSyncPlay);
      socket.off('sync-pause', onSyncPause);
      socket.off('sync-seek', onSyncSeek);
      socket.off('sync-song', onSyncSong);
      socket.off('sync-state', onSyncState);
    };
  }, [socket]);

  // Progress Bar Updater (Local UI only, runs every 1 second)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying || !playerRef.current) return;
      const current = playerRef.current.getCurrentTime();
      if (current) {
        setProgress(current);
        setDuration(playerRef.current.getDuration());
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  // Anti-desync loop (Drift correction every 10 seconds)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isPlaying || !playerRef.current || !hasSong) return;
      const { currentTime, updatedAt } = syncDataRef.current;
      if (updatedAt === 0) return;
      
      const expectedTime = currentTime + (Date.now() - updatedAt) / 1000;
      const actualTime = playerRef.current.getCurrentTime();
      
      // Increase drift threshold to 3.0 seconds to avoid micro-stuttering/lag
      if (Math.abs(expectedTime - actualTime) > 3.0) {
        console.log(`Drift corrected! Expected: ${expectedTime}, Actual: ${actualTime}`);
        playerRef.current.seekTo(expectedTime, true);
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [isPlaying, hasSong]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    if (pendingState) {
      playerRef.current.loadVideoById(pendingState.song.videoId || pendingState.song.id);
      const delay = (Date.now() - pendingState.updatedAt) / 1000;
      playerRef.current.seekTo(pendingState.currentTime + delay, true);
      if (pendingState.isPlaying) playerRef.current.playVideo();
      else playerRef.current.pauseVideo();
      setPendingState(null);
    }
  };

  const togglePlay = () => {
    if (!playerRef.current || !currentSong) return;
    const currentTime = playerRef.current.getCurrentTime();
    if (isPlaying) {
      setIsPlaying(false);
      playerRef.current.pauseVideo();
      socket.emit('pause', { roomId, currentTime });
    } else {
      setIsPlaying(true);
      playerRef.current.playVideo();
      socket.emit('play', { roomId, currentTime });
    }
  };

  const handleSeek = (e) => {
    if (!playerRef.current || !currentSong) return;
    const newTime = parseFloat(e.target.value);
    setProgress(newTime);
    playerRef.current.seekTo(newTime, true);
    socket.emit('seek', { roomId, currentTime: newTime });
  };

  const playNext = () => {
    if (room?.queue?.length > 0) {
      playSong(room.queue[0]);
    }
  };

  const playPrevious = () => {
    // Current implementation just restarts the song as we don't track history.
    if (playerRef.current) {
      playerRef.current.seekTo(0, true);
      setProgress(0);
      socket.emit('seek', { roomId, currentTime: 0 });
    }
  };

  const playSong = (song) => {
    socket.emit('change-song', { roomId, song });
  };

  const formatTime = (secs) => {
    if (!secs || isNaN(secs)) return "0:00";
    const totalSeconds = Math.floor(secs);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    if (!currentSong) return;
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title || 'Unknown Title',
        artist: currentSong.artist || 'Unknown Artist',
        artwork: [{ src: currentSong.thumbnail || '', sizes: '512x512', type: 'image/jpeg' }]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        if (!playerRef.current) return;
        setIsPlaying(true);
        playerRef.current.playVideo();
        socket.emit('play', { roomId, currentTime: playerRef.current.getCurrentTime() });
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (!playerRef.current) return;
        setIsPlaying(false);
        playerRef.current.pauseVideo();
        socket.emit('pause', { roomId, currentTime: playerRef.current.getCurrentTime() });
      });

      navigator.mediaSession.setActionHandler('previoustrack', playPrevious);
      navigator.mediaSession.setActionHandler('nexttrack', playNext);
    }
  }, [currentSong]);

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
        {/* Album Art Container / Hidden Player */}
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

          {/* Hidden YouTube Player */}
          <div className="hidden">
            <YouTube
              videoId={currentSong?.videoId || currentSong?.id || ''}
              opts={{ playerVars: { autoplay: 0, controls: 0 } }}
              onReady={onPlayerReady}
              onEnd={playNext}
            />
          </div>
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
              <span>YT AUDIO</span>
            </div>
          </div>
        </div>
      </div>

      {currentSong && <SongLyrics currentSong={currentSong} />}

    </div>
  );
}
