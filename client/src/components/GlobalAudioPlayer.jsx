import React, { useEffect, useRef } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import YouTube from 'react-youtube';

/**
 * GlobalAudioPlayer: Persistent music engine that lives across the entire app.
 * Only ONE instance exists. Handles high-precision sync and background play.
 */
export default function GlobalAudioPlayer() {
  const { 
    currentSong, 
    isPlaying, 
    volume, 
    setProgress, 
    setIsPlaying, 
    setCurrentSong,
    setLatency,
    socket, 
    room,
    queue
  } = useRoomStore();
  
  const playerRef = useRef(null);
  const roomId = room?.id;
  const syncDataRef = useRef({ currentTime: 0, updatedAt: 0, serverOffset: 0 });
  const requestRef = useRef();

  // 1. Latency Measurement (Ping-Pong)
  useEffect(() => {
    if (!socket) return;
    
    const interval = setInterval(() => {
      socket.emit('ping-sync', Date.now());
    }, 5000);

    socket.on('pong-sync', ({ timestamp, serverTime }) => {
      const now = Date.now();
      const rtt = now - timestamp;
      const serverOffset = serverTime - (now - rtt / 2);
      setLatency(rtt);
      syncDataRef.current.serverOffset = serverOffset;
    });

    return () => {
      clearInterval(interval);
      socket.off('pong-sync');
    };
  }, [socket]);

  // 2. High-Precision Sync Loop (requestAnimationFrame)
  const syncLoop = () => {
    if (playerRef.current && isPlaying && currentSong) {
      const { currentTime, updatedAt, serverOffset } = syncDataRef.current;
      if (updatedAt > 0) {
        const now = Date.now() + serverOffset;
        const expectedTime = currentTime + (now - updatedAt) / 1000;
        const actualTime = playerRef.current.getCurrentTime();
        
        // Strict 100ms threshold for Spotify-like sync
        if (Math.abs(expectedTime - actualTime) > 0.1) {
          playerRef.current.seekTo(expectedTime, true);
        }
        setProgress(actualTime);
      }
    }
    requestRef.current = requestAnimationFrame(syncLoop);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(syncLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [isPlaying, currentSong]);

  // 3. Socket Listeners
  useEffect(() => {
    if (!socket) return;
    
    const onSyncPlay = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { ...syncDataRef.current, currentTime, updatedAt };
      setIsPlaying(true);
    };
    
    const onSyncPause = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { ...syncDataRef.current, currentTime, updatedAt };
      setIsPlaying(false);
    };
    
    const onSyncSeek = ({ currentTime, updatedAt }) => {
      syncDataRef.current = { ...syncDataRef.current, currentTime, updatedAt };
    };
    
    const onSyncSong = (song) => {
      syncDataRef.current = { ...syncDataRef.current, currentTime: 0, updatedAt: Date.now() };
      setCurrentSong(song);
      setIsPlaying(true);
    };
    
    const onSyncState = (state) => {
      if (!state.song) return;
      syncDataRef.current = { 
        ...syncDataRef.current, 
        currentTime: state.currentTime, 
        updatedAt: state.serverTime || Date.now() 
      };
      setCurrentSong(state.song);
      setIsPlaying(state.isPlaying);
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

  // 4. MediaSession API (Background Controls)
  useEffect(() => {
    if ('mediaSession' in navigator && currentSong) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSong.title,
        artist: currentSong.artist || 'RuRu Sync',
        artwork: [
          { src: currentSong.thumbnail, sizes: '512x512', type: 'image/png' }
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        setIsPlaying(true);
        socket?.emit('play', { roomId, currentTime: playerRef.current?.getCurrentTime() || 0 });
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        setIsPlaying(false);
        socket?.emit('pause', { roomId, currentTime: playerRef.current?.getCurrentTime() || 0 });
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (queue?.length > 0) socket?.emit('change-song', { roomId, song: queue[0] });
      });
    }
  }, [currentSong, socket, roomId, queue]);

  const onPlayerReady = (event) => {
    playerRef.current = event.target;
    playerRef.current.setVolume(volume * 100);
    const { currentTime, updatedAt, serverOffset } = syncDataRef.current;
    if (updatedAt > 0) {
      const now = Date.now() + serverOffset;
      const delay = (now - updatedAt) / 1000;
      playerRef.current.seekTo(currentTime + delay, true);
    }
  };

  const onStateChange = (event) => {
    const state = event.data;
    if (state === 1 && !isPlaying) setIsPlaying(true);
    if (state === 2 && isPlaying) setIsPlaying(false);
  };

  if (!currentSong) return null;

  const nextSong = queue?.[0];

  return (
    <div className="fixed bottom-0 left-0 w-0 h-0 overflow-hidden pointer-events-none opacity-0">
      <YouTube
        videoId={currentSong.videoId || currentSong.id}
        opts={{
          playerVars: { autoplay: 1, controls: 0, modestbranding: 1, rel: 0 },
        }}
        onReady={onPlayerReady}
        onStateChange={onStateChange}
        onEnd={() => {
          if (queue?.length > 0) socket?.emit('change-song', { roomId, song: queue[0] });
        }}
      />
      {nextSong && (
        <YouTube
          videoId={nextSong.videoId || nextSong.id}
          opts={{
            playerVars: { autoplay: 0, controls: 0, modestbranding: 1, rel: 0 },
          }}
        />
      )}
    </div>
  );
}
