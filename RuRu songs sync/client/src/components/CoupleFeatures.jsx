import React, { useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Heart, Send, Sparkles, Moon, Sun, Flame, Stars, Gift, Clock, Music } from 'lucide-react';
import { motion } from 'framer-motion';

const COMPLIMENTS_DB = [
  "You have the absolute best taste in music! 🎵",
  "Just thinking about how awesome you are... ❤️",
  "You always know how to set the perfect vibe ✨",
  "I love exploring new songs with you! 🎧",
  "Your playlist is as beautiful as you are 🌹",
  "Vibing with you is my favorite thing to do 🎶",
  "Your energy makes every song sound better 💫",
  "I could listen to music with you all day 🕰️",
  "You're the rhythm to my melody 🎹",
  "Every track is a memory when I'm with you 📸",
  "I'm totally addicted to our music sessions 🎶",
  "You have a heart of gold and a playlist to match 🏆",
  "You make this room glow! ✨",
  "Our musical chemistry is unmatched 🔬",
  "Listening with you is pure magic 🪄"
];

export default function CoupleFeatures({ username }) {
  const { socket, room, moodMode } = useRoomStore();
  const [noteMsg, setNoteMsg] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [usedIndices, setUsedIndices] = useState([]);

  const generateCompliment = async () => {
    setIsGenerating(true);
    
    // Logic to never repeat until exhausted
    let availableIndices = COMPLIMENTS_DB.map((_, i) => i).filter(i => !usedIndices.includes(i));
    if (availableIndices.length === 0) {
      // Reset if all are used
      availableIndices = COMPLIMENTS_DB.map((_, i) => i);
      setUsedIndices([]);
    }
    
    // Pick random un-used
    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    const randomComp = COMPLIMENTS_DB[randomIndex];
    
    setUsedIndices(prev => [...prev, randomIndex]);
    
    setTimeout(() => {
      socket.emit('send_love_note', { id: Date.now(), message: randomComp });
      setIsGenerating(false);
    }, 800);
  };

  const moods = [
    { id: 'normal', icon: Sun, label: 'Normal' },
    { id: 'candlelight', icon: Flame, label: 'Candlelight' },
    { id: 'sunset', icon: Moon, label: 'Sunset' },
    { id: 'stars', icon: Stars, label: 'Night Sky' }
  ];

  const sendNote = (e) => {
    e.preventDefault();
    if (!noteMsg.trim()) return;
    socket.emit('send_love_note', { id: Date.now(), message: noteMsg });
    setNoteMsg('');
  };

  const sendGift = (type) => {
    socket.emit('send_emoji', { id: Date.now(), emoji: type === 'rose' ? '🌹' : '💝', x: Math.random() * 80 + 10 });
    socket.emit('send_message', { text: `Sent a ${type}!`, isBlurred: false });
  };



  const saveMoment = () => {
    const song = room?.currentSong || { name: 'Current Vibe', artist: 'Unknown' };
    socket.emit('save_moment', { id: Date.now(), ...song });
  };

  return (
    <div className="bg-black/20 rounded-3xl border border-pink-500/20 backdrop-blur-md p-6 overflow-hidden relative">
      <div className="absolute top-0 right-0 p-4 opacity-50"><Heart className="w-32 h-32 text-pink-500 blur-3xl" /></div>
      
      <h2 className="text-lg font-bold flex items-center gap-2 mb-6 text-pink-300 relative z-10">
        <Sparkles className="w-5 h-5 text-pink-400" /> Couple Features
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        
        {/* Mood Lighting */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Mood Lighting</label>
          <div className="flex flex-wrap gap-2">
            {moods.map(m => {
              const Icon = m.icon;
              const isActive = moodMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => socket.emit('change_mood', m.id)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${isActive ? 'bg-pink-500 text-white border-pink-400 shadow-lg shadow-pink-500/20' : 'bg-white/5 border-white/10 text-zinc-400 hover:bg-white/10'}`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Love Notes */}
        <div className="space-y-3">
          <label className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Send a Love Note</label>
          <form onSubmit={sendNote} className="flex gap-2">
            <input
              type="text"
              value={noteMsg}
              onChange={(e) => setNoteMsg(e.target.value)}
              placeholder="You mean the world to me..."
              className="flex-1 bg-black/40 border border-pink-500/30 rounded-xl px-4 py-2 text-sm focus:outline-none focus:border-pink-500 text-white"
            />
            <button type="submit" className="bg-pink-500 hover:bg-pink-400 text-white px-4 rounded-xl transition">
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Actions */}
        <div className="space-y-3 md:col-span-2 pt-4 border-t border-white/10">
          <label className="text-sm font-medium text-pink-400 uppercase tracking-wider flex items-center gap-2">
             <Heart className="w-4 h-4" /> Playful Interactions
          </label>
          <div className="flex flex-wrap gap-3 mt-2">
            <button onClick={generateCompliment} disabled={isGenerating} className="flex items-center justify-center gap-2 bg-purple-900/40 hover:bg-purple-800/60 border border-purple-500/50 text-purple-200 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:scale-100 flex-1 md:flex-none">
              {isGenerating ? <div className="animate-spin text-white">⏳</div> : <Sparkles className="w-4 h-4 text-purple-300" />} 
              {isGenerating ? 'Generating...' : 'AI Compliment'}
            </button>
            <button onClick={() => sendGift('heart')} className="flex items-center gap-2 bg-pink-900/40 hover:bg-pink-800/60 border border-pink-500/50 text-pink-200 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-pink-900/20">
              <Gift className="w-4 h-4" /> Send Virtual Hug
            </button>
            <button onClick={saveMoment} className="flex items-center gap-2 bg-blue-900/40 hover:bg-blue-800/60 border border-blue-500/50 text-blue-200 px-4 py-2.5 rounded-xl transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-900/20">
              <Sparkles className="w-4 h-4" /> Save Timeline Memory
            </button>
          </div>
        </div>
        
        {/* Date Night Stats */}
        <div className="md:col-span-2 flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5 mt-2">
           <div className="flex items-center gap-4">
             <div className="text-center">
               <div className="text-2xl font-bold text-pink-400">{room?.stats?.songsListened || 0}</div>
               <div className="text-xs text-zinc-500 uppercase flex items-center gap-1"><Music className="w-3 h-3"/> Songs</div>
             </div>
             <div className="w-px h-8 bg-white/10"></div>
             <div className="text-center">
               <div className="text-2xl font-bold text-purple-400">0h</div>
               <div className="text-xs text-zinc-500 uppercase flex items-center gap-1"><Clock className="w-3 h-3"/> Together</div>
             </div>
           </div>
           
           <div className="flex -space-x-3">
             {room?.users.slice(0, 3).map((u, i) => (
                <div key={i} className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold shadow-lg">
                  {u.username.substring(0,2).toUpperCase()}
                </div>
             ))}
             {room?.users.length > 3 && (
                <div className="w-10 h-10 rounded-full bg-zinc-800 border-2 border-zinc-900 flex items-center justify-center text-xs font-bold shadow-lg text-zinc-400">
                  +{room.users.length - 3}
                </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
}
