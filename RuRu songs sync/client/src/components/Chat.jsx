import React, { useRef, useState } from 'react';
import { useRoomStore } from '../store/useRoomStore';
import { Send, Heart, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Chat({ username }) {
  const [msg, setMsg] = useState('');
  const { chatMessages, socket, room, isTyping, typingMsg } = useRoomStore();
  const endRef = useRef();

  let typingTimeout = useRef(null);

  const handleTyping = (e) => {
    setMsg(e.target.value);
    
    // Random romantic typing texts
    const romanticDrafts = ['Thinking about you... 💭', 'Typing something dangerous 😈', 'Writing a love note... ✍️'];
    const selectedTypingMsg = romanticDrafts[Math.floor(Math.random() * romanticDrafts.length)];
    
    socket.emit('typing', { isTyping: true, msg: selectedTypingMsg });
    
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket.emit('typing', { isTyping: false, msg: '' });
    }, 2000);
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    
    let isBlurred = msg.startsWith('*blur*');
    let finalMsg = isBlurred ? msg.slice(6).trim() : msg;

    socket.emit('send_message', { text: finalMsg, isBlurred });
    socket.emit('typing', { isTyping: false });
    
    setMsg('');
    setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  const sendEmoji = (emoji) => {
    socket.emit('send_emoji', { id: Date.now(), emoji, x: Math.random() * 80 + 10 });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/5 flex justify-between items-center">
        <h2 className="font-semibold text-zinc-200">Room Chat</h2>
        <div className="flex gap-2">
          {['❤️', '😍', '🔥'].map(em => (
            <button key={em} onClick={() => sendEmoji(em)} className="p-1.5 hover:bg-white/10 rounded-full transition text-lg bg-black/20">
              {em}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.map((m, i) => {
          const isMe = m.sender === username;
          return (
            <div key={i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div 
                className={`max-w-[80%] rounded-3xl px-5 py-3 shadow-sm ${
                  isMe ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-tr-sm shadow-pink-500/20' 
                       : 'bg-white/10 text-white rounded-tl-sm backdrop-blur-md border border-white/5'
                } ${m.message.isBlurred ? 'blur-sm hover:blur-none transition-all duration-300 cursor-pointer select-none' : ''}`}
                title={m.message.isBlurred ? "Tap to reveal" : ""}
              >
                {!isMe && <div className="text-[10px] text-pink-300/80 font-bold uppercase tracking-wider mb-1">{m.sender}</div>}
                <p className="text-sm leading-relaxed break-words">{m.message.text || m.message}</p>
              </div>
            </div>
          );
        })}
        
        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex justify-start">
              <div className="bg-white/5 backdrop-blur-sm border border-white/5 text-purple-300 text-xs px-4 py-2 rounded-full rounded-tl-sm italic font-medium animate-pulse">
                {typingMsg || "typing..."}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        
        <div ref={endRef} />
      </div>

      <div className="p-4 border-t border-white/5 bg-black/40">
        <form onSubmit={handleSend} className="flex gap-2 relative">
          <input
            type="text"
            value={msg}
            onChange={handleTyping}
            placeholder="Type *blur* message... or whisper..."
            className="flex-1 bg-black/50 border border-white/10 rounded-full pl-6 pr-12 py-3.5 text-sm focus:outline-none focus:border-pink-500/50 focus:ring-1 focus:ring-pink-500/50 transition-all text-white placeholder:text-zinc-600"
          />
          <button 
            type="submit"
            disabled={!msg.trim()}
            className="absolute right-1 top-1 bottom-1 w-11 flex items-center justify-center bg-gradient-to-tr from-pink-500 to-purple-600 rounded-full text-white shadow-lg shadow-pink-500/30 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
          >
            <Send className="w-4 h-4 ml-[-2px]" />
          </button>
        </form>
      </div>
    </div>
  );
}
