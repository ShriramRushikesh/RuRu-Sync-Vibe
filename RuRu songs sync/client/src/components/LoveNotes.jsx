import React, { useEffect } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoveNotes() {
  const { loveNotes, emojis, removeLoveNote, removeEmoji } = useRoomStore();

  useEffect(() => {
    const intervals = emojis.map(emoji => {
      return setTimeout(() => removeEmoji(emoji.id), 4000);
    });
    return () => intervals.forEach(clearTimeout);
  }, [emojis, removeEmoji]);
  
  useEffect(() => {
    const intervals = loveNotes.map(note => {
      return setTimeout(() => removeLoveNote(note.id), 3500);
    });
    return () => intervals.forEach(clearTimeout);
  }, [loveNotes, removeLoveNote]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {emojis.map((em) => (
          <motion.div
            key={em.id}
            initial={{ y: '100vh', opacity: 0, x: `${em.x}vw`, scale: 0.5 }}
            animate={{ y: '-20vh', opacity: [0, 1, 1, 0], x: `${em.x + (Math.random() * 10 - 5)}vw`, scale: Math.random() * 1 + 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 4, ease: "easeOut" }}
            className="absolute text-4xl filter drop-shadow-md"
          >
            {em.emoji}
          </motion.div>
        ))}
        {loveNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, scale: 0.5, y: -40, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, scale: 0.8, y: -40, x: '-50%' }}
            transition={{ duration: 3.5, type: 'spring', bounce: 0.4 }}
            className="absolute p-5 floating bg-gradient-to-br from-pink-500/90 to-rose-500/90 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-[0_10px_40px_rgba(225,29,72,0.4)] max-w-xs text-center min-w-[280px]"
            style={{ top: '8%', left: '50%' }}
          >
            <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-white/20">
              <span className="text-xs font-black bg-white/20 text-white px-3 py-1 rounded-full shadow-inner">{note.sender}</span>
              <span className="text-xs text-pink-100/90 font-medium tracking-wide">sent a lovely note ❤️</span>
            </div>
            <p className="text-white font-semibold text-lg leading-snug drop-shadow-md">"{note.message}"</p>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
