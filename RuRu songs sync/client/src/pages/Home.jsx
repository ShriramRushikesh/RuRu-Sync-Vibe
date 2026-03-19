import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Music, Heart, Users, Share2, Sparkles, Wand2 } from 'lucide-react';
import { motion } from 'framer-motion';
import Logo from '../components/Logo';

export default function Home() {
  const [searchParams] = useSearchParams();
  const [roomId, setRoomId] = useState(searchParams.get('roomId') || '');
  const [username, setUsername] = useState('');
  const [isCoupleMode, setIsCoupleMode] = useState(false);
  const navigate = useNavigate();

  const handleJoin = (e) => {
    e.preventDefault();
    if (!username.trim()) return;

    // Generate random room ID if not provided
    const id = roomId.trim() || Math.random().toString(36).substring(2, 8).toUpperCase();

    // Pass state via router
    navigate(`/room/${id}`, { state: { username, isCoupleMode, isHost: !roomId.trim() } });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden bg-gradient-to-br from-zinc-950 via-purple-950/20 to-zinc-950">

      {/* Decorative background elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-pink-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-8 relative">
          <div className="flex justify-center mb-6">
            <h1 className="sr-only">RuRu | sync vibes everywhere</h1>
            <Logo className="w-56 h-auto text-pink-500 drop-shadow-[0_0_15px_rgba(236,72,153,0.5)]" />
          </div>
          <p className="text-zinc-400 text-lg mb-8 max-w-md mx-auto">
            RuRu | Synchronize vibes everywhere. Connect, listen, and feel the music together.
          </p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Your Name</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your nickname"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-pink-500/50 transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-1">Room Code (optional)</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value.toUpperCase())}
                placeholder="Leave blank to create a room"
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all uppercase"
                maxLength={6}
              />
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setIsCoupleMode(!isCoupleMode)}
                className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${isCoupleMode ? 'bg-pink-500/10 border-pink-500/50 text-pink-300' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
              >
                <div className="flex items-center gap-2">
                  <Heart className={`w-5 h-5 ${isCoupleMode ? 'text-pink-400 fill-pink-400' : ''}`} />
                  <span className="font-medium">Couple Mode</span>
                </div>
                <div className={`w-10 h-6 rounded-full flex items-center p-1 transition-colors ${isCoupleMode ? 'bg-pink-500' : 'bg-zinc-700'}`}>
                  <motion.div
                    layout
                    className="w-4 h-4 rounded-full bg-white shadow-sm"
                    animate={{ x: isCoupleMode ? 16 : 0 }}
                  />
                </div>
              </button>
              {isCoupleMode && (
                <p className="text-xs text-pink-400/70 mt-2 flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Creates a private exactly-2-person room
                </p>
              )}
            </div>

            <button
              type="submit"
              className="w-full mt-6 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-400 hover:to-purple-500 text-white font-semibold rounded-xl px-4 py-4 shadow-lg shadow-pink-500/25 transition-all active:scale-[0.98]"
            >
              {roomId ? 'Join Room' : 'Create Room'}
            </button>
          </form>
        </div>
      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="absolute bottom-6 text-center w-full left-0 space-y-2 px-4"
      >
        <div className="text-zinc-500 text-sm font-medium">
          Made with <Heart className="inline-block w-4 h-4 text-pink-500 mx-1 animate-pulse" /> for <span className="text-zinc-300">Paroo</span>, by <span className="text-zinc-300">Rushi</span>
        </div>
        <p className="text-[10px] text-zinc-600 max-w-lg mx-auto leading-relaxed">
          RuRu is a personal synchronization tool. We do not host, store, or distribute any copyrighted music content. 
          All audio is streamed directly from public third-party APIs. Please respect the copyright of the content creators 
          and comply with your local government regulations.
        </p>
      </motion.div>
    </div>
  );
}
