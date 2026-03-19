import React, { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import YouTube from 'react-youtube';

// ─── Singleton Audio Engine ──────────────────────────────────────────────────
const _p = { ref: null };                   // player ref
const _s = { time: 0, at: 0, offset: 0 };  // sync state (server-authoritative)
let _raf = null;
let _ticker = null;
let _started = false; // whether user has ever explicitly played (gesture unlock)

// Exported for RoomPlayer to call DIRECTLY inside gesture handlers (mobile unlock)
export const audioEngine = {
  // Called inside tap → unlocks autoplay policy on mobile
  play() {
    _started = true;
    try {
      _p.ref?.unMute();
      _p.ref?.setVolume(100);
      _p.ref?.playVideo();
    } catch (_) {}
  },
  pause() {
    try { _p.ref?.pauseVideo(); } catch (_) {}
  },
  seek(t) {
    try { _p.ref?.seekTo(t, true); } catch (_) {}
  },
};

// Server clock → client clock conversion
function serverNow() { return Date.now() + _s.offset; }

// Expected playback position right now
function expectedTime() {
  if (!_s.at) return _s.time;
  return _s.time + (serverNow() - _s.at) / 1000;
}

function startEngine(setProgress, isPlayingRef) {
  if (_raf) cancelAnimationFrame(_raf);
  if (_ticker) clearInterval(_ticker);

  // 60fps drift correction — pure JS, ZERO React re-renders
  function loop() {
    if (_p.ref && isPlayingRef.current && _s.at) {
      try {
        const drift = _p.ref.getCurrentTime() - expectedTime();
        if (Math.abs(drift) > 0.15) {
          _p.ref.seekTo(expectedTime(), true);
        }
      } catch (_) {}
    }
    _raf = requestAnimationFrame(loop);
  }
  _raf = requestAnimationFrame(loop);

  // Progress to Zustand once/sec — not 60x/sec
  _ticker = setInterval(() => {
    try {
      if (_p.ref && isPlayingRef.current) setProgress(_p.ref.getCurrentTime());
    } catch (_) {}
  }, 1000);
}
// ─────────────────────────────────────────────────────────────────────────────

export default function GlobalAudioPlayer() {
  const {
    currentSong, isPlaying, volume,
    setProgress, setIsPlaying, setCurrentSong, setLatency,
    socket, room, queue,
  } = useRoomStore();

  const roomId = room?.roomId || room?.id;
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const volumeRef = useRef(volume);
  volumeRef.current = volume;

  useEffect(() => {
    startEngine(setProgress, isPlayingRef);
    return () => { cancelAnimationFrame(_raf); clearInterval(_ticker); };
  }, []);

  // Latency measurement — runs every 5s
  useEffect(() => {
    if (!socket) return;
    const iv = setInterval(() => socket.emit('ping-sync', Date.now()), 5000);
    const onPong = ({ timestamp, serverTime }) => {
      const rtt = Date.now() - timestamp;
      _s.offset = serverTime - (Date.now() - rtt / 2);
      setLatency(rtt);
    };
    socket.on('pong-sync', onPong);
    return () => { clearInterval(iv); socket.off('pong-sync', onPong); };
  }, [socket]);

  // Socket sync listeners — all use serverTime for clock alignment
  useEffect(() => {
    if (!socket) return;

    const onSyncPlay = ({ currentTime, serverTime }) => {
      _s.time = currentTime;
      _s.at = serverTime || Date.now(); // use server's clock, not client's
      setIsPlaying(true);
      // Start playing (for users receiving from another user's action)
      try { _p.ref?.unMute(); _p.ref?.setVolume(100); _p.ref?.playVideo(); } catch (_) {}
    };

    const onSyncPause = ({ currentTime, serverTime }) => {
      _s.time = currentTime;
      _s.at = serverTime || Date.now();
      setIsPlaying(false);
      try { _p.ref?.pauseVideo(); } catch (_) {}
    };

    const onSyncSeek = ({ currentTime, serverTime }) => {
      _s.time = currentTime;
      _s.at = serverTime || Date.now();
      // RAF loop corrects drift; explicit seek for precision
      try { _p.ref?.seekTo(currentTime, true); } catch (_) {}
    };

    const onSyncSong = ({ song, serverTime }) => {
      // Handle both formats: old `song` directly, new `{song, serverTime}`
      const s = song?.videoId ? song : song;
      _s.time = 0;
      _s.at = serverTime || Date.now();
      setCurrentSong(s);
      setIsPlaying(true);
    };

    const onSyncState = (state) => {
      if (!state.song) return;
      // Calculate correct position using server's timestamp
      const serverNowMs = state.serverTime || Date.now();
      _s.time = state.currentTime;
      _s.at = serverNowMs;
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

  // MediaSession
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSong) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSong.title,
      artist: currentSong.artist || 'RuRu Sync',
      artwork: [{ src: currentSong.thumbnail, sizes: '512x512', type: 'image/png' }],
    });
    navigator.mediaSession.setActionHandler('play', () => {
      audioEngine.play(); setIsPlaying(true);
      socket?.emit('play', { roomId, currentTime: _p.ref?.getCurrentTime() || 0 });
    });
    navigator.mediaSession.setActionHandler('pause', () => {
      audioEngine.pause(); setIsPlaying(false);
      socket?.emit('pause', { roomId, currentTime: _p.ref?.getCurrentTime() || 0 });
    });
    navigator.mediaSession.setActionHandler('nexttrack', () => {
      if (queue?.length > 0) socket?.emit('change-song', { roomId, song: queue[0] });
    });
  }, [currentSong?.videoId]);

  const onPlayerReady = useCallback((event) => {
    _p.ref = event.target;
    // Mobile: start MUTED so autoplay is allowed, then unmute only after user gesture
    _p.ref.mute();
    _p.ref.setVolume(0);

    // Seek to where we should be
    if (_s.at > 0) {
      _p.ref.seekTo(Math.max(0, expectedTime()), true);
    }

    if (isPlayingRef.current) {
      // Play muted first (mobile-safe)
      _p.ref.playVideo();

      // If user has already interacted (gesture unlock established), unmute immediately
      if (_started) {
        setTimeout(() => {
          try { _p.ref?.unMute(); _p.ref?.setVolume(volumeRef.current * 100); } catch (_) {}
        }, 200);
      }
    }
  }, []);

  const onStateChange = useCallback((event) => {
    if (event.data === 1 && !isPlayingRef.current) setIsPlaying(true);
    if (event.data === 2 && isPlayingRef.current) setIsPlaying(false);
  }, []);

  const onEnd = useCallback(() => {
    if (queue?.length > 0) socket?.emit('change-song', { roomId, song: queue[0] });
  }, [queue, socket, roomId]);

  const nextSong = queue?.[0];

  return (
    <div
      aria-hidden="true"
      style={{ position: 'fixed', bottom: 0, left: 0, width: 1, height: 1, opacity: 0.01, overflow: 'hidden', pointerEvents: 'none' }}
    >
      {currentSong && (
        <YouTube
          key={currentSong.videoId || currentSong.id}
          videoId={currentSong.videoId || currentSong.id}
          opts={{
            width: '1', height: '1',
            playerVars: { autoplay: 1, controls: 0, rel: 0, playsinline: 1, fs: 0, modestbranding: 1 },
          }}
          onReady={onPlayerReady}
          onStateChange={onStateChange}
          onEnd={onEnd}
        />
      )}
      {nextSong && nextSong.videoId !== currentSong?.videoId && (
        <YouTube
          key={`pre-${nextSong.videoId}`}
          videoId={nextSong.videoId}
          opts={{ width: '1', height: '1', playerVars: { autoplay: 0, controls: 0, rel: 0, playsinline: 1 } }}
        />
      )}
    </div>
  );
}
