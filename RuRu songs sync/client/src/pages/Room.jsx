import React, { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useRoomStore } from '../store/useRoomStore';
import RoomPlayer from '../components/RoomPlayer';
import Chat from '../components/Chat';
import CoupleFeatures from '../components/CoupleFeatures';
import LoveNotes from '../components/LoveNotes';
import Logo from '../components/Logo';
import MusicSearch from '../components/MusicSearch';
import { Share2, Users, MessageCircle, Instagram } from 'lucide-react';

export default function Room() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const { setSocket, setRoom, room, moodMode, setMoodMode, addChatMessage, addLoveNote, addVirtualGift, addEmoji, setTyping, updateRoomQueue, updateRoomFavorites, updateCurrentSong, updateSongProgress } = useRoomStore();
  const [isShaking, setIsShaking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState('player');

  useEffect(() => {
    if (!state?.username) {
      navigate(`/?roomId=${id}`);
      return;
    }

    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5001');
    setSocket(newSocket);

    newSocket.emit('join_room', { 
      roomId: id, 
      username: state.username, 
      isHost: state.isHost,
      isCoupleMode: state.isCoupleMode 
    });

    newSocket.on('room_update', setRoom);
    newSocket.on('mood_changed', setMoodMode);
    
    newSocket.on('queue_updated', updateRoomQueue);
    newSocket.on('favorites_updated', updateRoomFavorites);
    newSocket.on('sync_player', updateCurrentSong);
    newSocket.on('sync_progress', updateSongProgress);
    
    newSocket.on('receive_message', addChatMessage);
    newSocket.on('receive_love_note', addLoveNote);
    newSocket.on('receive_gift', addVirtualGift);
    newSocket.on('receive_emoji', addEmoji);
    newSocket.on('partner_typing', (data) => setTyping(data.isTyping, data.msg));
    newSocket.on('attention_stolen', () => {
      setIsShaking(true);
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
      setTimeout(() => setIsShaking(false), 800);
    });
    newSocket.on('error', (err) => {
      alert(err.message);
      navigate('/');
    });

    return () => newSocket.disconnect();
  }, [id, state, navigate]);

  const shareToWhatsApp = () => {
    const text = `Join my RuRu Sync Room to vibing together! ❤️🎵\nLink: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const shareToInstagram = () => {
    // Instagram doesn't have a direct "share to DM" URL like WhatsApp, 
    // so we copy link and notify user to share it there.
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    alert('Link copied! You can now paste it in Instagram DMs.');
  };

  if (!room) return <div className="min-h-screen flex items-center justify-center">Loading Vibes...</div>;

  const bgStyles = {
    normal: 'from-zinc-950 via-zinc-900 to-zinc-950 bg-gradient-to-br',
    candlelight: 'from-orange-950 via-red-950 to-zinc-950 bg-gradient-to-br',
    sunset: 'bg-sunset-animated',
    stars: 'from-blue-950 via-zinc-950 to-black bg-gradient-to-br'
  };

  return (
    <div className={`min-h-screen transition-colors duration-1000 relative ${bgStyles[moodMode]} ${isShaking ? 'animate-[shake_0.2s_ease-in-out_4]' : ''}`}>
      
      {/* Dynamic Sunset Background */}
      {moodMode === 'sunset' && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
          <div className="absolute top-[30%] left-1/2 -translate-x-1/2 w-64 h-64 bg-gradient-to-br from-yellow-300 via-orange-400 to-red-500 rounded-full blur-[60px] opacity-80 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-full h-[45%] bg-gradient-to-t from-[#0f172a] via-[#1e1b4b]/80 to-transparent flex flex-col justify-end">
            <div className="w-full h-4 bg-orange-400/20 blur-sm animate-ripple mb-2"></div>
            <div className="w-full h-6 bg-yellow-500/10 blur-sm animate-ripple-delayed mb-4"></div>
            <div className="w-full h-8 bg-red-500/10 blur-md animate-ripple mb-8"></div>
          </div>
        </div>
      )}

      <div className="relative z-10 w-full h-full">
        <LoveNotes />
        
        <header className="p-4 border-b border-white/5 flex justify-between items-center bg-black/20 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Logo className="h-10 w-auto text-pink-400 drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]" />
            <span className="text-zinc-600 hidden sm:inline-block">|</span>
            <span className="text-sm font-medium bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent hidden sm:inline-block">
              RuRu | sync vibes {room.isCoupleMode ? '🕊️💕' : ''}
            </span>
          </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-zinc-400 bg-black/30 px-3 py-1.5 rounded-full">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{room.users.length}{room.isCoupleMode ? '/2' : ''} Users</span>
          </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={shareToWhatsApp}
                className="bg-[#25D366] hover:bg-[#20ba56] text-white p-2 rounded-full transition-all shadow-lg"
                title="Share to WhatsApp"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
              </button>
              <button 
                onClick={shareToInstagram}
                className="bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white p-2 rounded-full transition-all shadow-lg"
                title="Share to Instagram"
              >
                <Instagram className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full transition-all text-sm font-medium w-40"
              >
                <Share2 className="w-4 h-4" />
                {copied ? 'Copied!' : `Invite: ${id}`}
              </button>
            </div>
          </div>
        </header>

      <main className="max-w-[1600px] mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-140px)] lg:h-[calc(100vh-80px)]">
        <div className={`${mobileTab === 'player' || mobileTab === 'extras' ? 'flex' : 'hidden'} lg:flex lg:col-span-2 flex-col gap-6 overflow-y-auto pb-4 custom-scrollbar`}>
          <div className={`${mobileTab === 'player' ? 'block' : 'hidden'} lg:block shrink-0`}>
            <RoomPlayer isHost={state?.isHost} username={state?.username} />
          </div>
          <div className={`${mobileTab === 'extras' ? 'flex' : 'hidden'} lg:flex flex-col gap-6 shrink-0`}>
            <CoupleFeatures username={state?.username} />
          </div>
        </div>
        <div className={`${mobileTab === 'search' ? 'flex' : 'hidden'} lg:flex h-full flex-col lg:col-span-1`}>
          <MusicSearch />
        </div>
        <div className={`${mobileTab === 'chat' ? 'flex' : 'hidden'} lg:flex h-full flex-col bg-black/20 rounded-3xl border border-white/5 backdrop-blur-md overflow-hidden lg:col-span-1`}>
          <Chat username={state?.username} />
        </div>
      </main>

      <nav className="lg:hidden fixed bottom-0 left-0 w-full bg-black/80 backdrop-blur-xl border-t border-white/10 flex justify-around items-center p-3 z-50 pb-5">
        <button onClick={() => setMobileTab('player')} className={`flex flex-col items-center gap-1 ${mobileTab === 'player' ? 'text-pink-400' : 'text-zinc-500'}`}>
           <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
           <span className="text-[10px] font-bold uppercase tracking-wider">Player</span>
        </button>
        <button onClick={() => setMobileTab('search')} className={`flex flex-col items-center gap-1 ${mobileTab === 'search' ? 'text-pink-400' : 'text-zinc-500'}`}>
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
           <span className="text-[10px] font-bold uppercase tracking-wider">Search</span>
        </button>
        <button onClick={() => setMobileTab('extras')} className={`flex flex-col items-center gap-1 ${mobileTab === 'extras' ? 'text-pink-400' : 'text-zinc-500'}`}>
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
           <span className="text-[10px] font-bold uppercase tracking-wider">Extras</span>
        </button>
        <button onClick={() => setMobileTab('chat')} className={`flex flex-col items-center gap-1 ${mobileTab === 'chat' ? 'text-pink-400' : 'text-zinc-500'}`}>
           <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>
           <span className="text-[10px] font-bold uppercase tracking-wider">Chat</span>
        </button>
      </nav>
      </div>
    </div>
  );
}
