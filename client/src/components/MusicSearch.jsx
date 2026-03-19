import React, { useState, useEffect } from 'react';
import { Search, Play, Plus, Heart, Music, ListMusic, Loader2 } from 'lucide-react';
import { useRoomStore } from '../store/useRoomStore';

export default function MusicSearch() {
  const { room, socket, updateRoomQueue, updateRoomFavorites } = useRoomStore();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('search'); // search, queue, favorites

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5001'}/api/music/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Failed to search:', error);
    }
    setLoading(false);
  };

  const playSong = (song) => {
    if (!room?.roomId) return;
    socket.emit('change-song', {
      roomId: room.roomId,
      song
    });
  };

  const addToQueue = (song) => {
    if (!room?.roomId) return;
    socket.emit('add_to_queue', song);
  };

  const toggleFavorite = (song) => {
    socket.emit('toggle_favorite', song);
  };

  const isFavorite = (videoId) => {
    return room?.favorites?.some(s => s.videoId === videoId);
  };

  const renderSongItem = (song, isQueue = false) => (
    <div key={song.videoId + (isQueue ? Math.random() : '')} className="flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg group transition-colors">
      <div className="relative w-12 h-12 rounded-md overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => playSong(song)}>
        <img src={song.thumbnail} alt={song.title} className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <Play className="w-5 h-5 text-white fill-current" />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium text-white truncate">{song.title}</h4>
        <p className="text-xs text-zinc-400 truncate">{song.artist}</p>
      </div>
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button onClick={() => toggleFavorite(song)} className="text-zinc-400 hover:text-pink-400 p-1">
          <Heart className={`w-4 h-4 ${isFavorite(song.videoId) ? 'fill-pink-400 text-pink-400' : ''}`} />
        </button>
        <button onClick={() => addToQueue(song)} className="text-zinc-400 hover:text-white p-1">
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col h-full bg-black/40 rounded-3xl border border-white/10 backdrop-blur-xl overflow-hidden">
      {/* Tabs */}
      <div className="flex gap-4 p-4 border-b border-white/5 bg-black/20">
        <button 
          onClick={() => setActiveTab('search')}
          className={`text-sm font-medium transition-colors ${activeTab === 'search' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-2"><Search className="w-4 h-4"/> Search</div>
        </button>
        <button 
          onClick={() => setActiveTab('queue')}
          className={`text-sm font-medium transition-colors ${activeTab === 'queue' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-2"><ListMusic className="w-4 h-4"/> Queue {room?.queue?.length > 0 && `(${room.queue.length})`}</div>
        </button>
        <button 
          onClick={() => setActiveTab('favorites')}
          className={`text-sm font-medium transition-colors ${activeTab === 'favorites' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <div className="flex items-center gap-2"><Heart className="w-4 h-4"/> Favs</div>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        {activeTab === 'search' && (
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
              <input 
                type="text" 
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs on YouTube..." 
                className="w-full bg-black/50 border border-white/10 rounded-full py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-pink-500/50 transition-colors"
              />
            </form>
            
            <div className="space-y-1">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-pink-500 animate-spin" />
                </div>
              ) : results.length > 0 ? (
                results.map(song => renderSongItem(song))
              ) : (
                <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-3">
                  <Music className="w-12 h-12 opacity-20" />
                  <p className="text-sm">Search for a song to play</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'queue' && (
          <div className="space-y-1">
            {room?.queue?.length > 0 ? (
              room.queue.map(song => renderSongItem(song, true))
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-sm">Queue is empty</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'favorites' && (
          <div className="space-y-1">
            {room?.favorites?.length > 0 ? (
              room.favorites.map(song => renderSongItem(song))
            ) : (
              <div className="text-center py-12 text-zinc-500">
                <p className="text-sm">No favorite songs yet</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
