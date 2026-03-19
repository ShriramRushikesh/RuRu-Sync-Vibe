import React, { useState, useEffect } from 'react';
import { Loader2, Mic2, ChevronDown, ChevronUp } from 'lucide-react';

export default function SongLyrics({ currentSong }) {
  const [lyrics, setLyrics] = useState('');
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (!currentSong) {
      setLyrics('');
      return;
    }

    const fetchLyrics = async () => {
      setLoading(true);
      setLyrics('');
      try {
        // Strip out parentheticals like "(Official Video)" to help API matching
        const artist = (currentSong.artist || '').split(',')[0].trim();
        const title = (currentSong.title || '').replace(/[\(\[].*?[\)\]]/g, '').replace(/official video/i, '').replace(/feat\.?/i, '').replace(/ft\.?/i, '').trim();
        
        if (!artist || !title) {
          setLyrics('Could not determine track metadata.');
          setLoading(false);
          return;
        }

        const res = await fetch(`https://api.lyrics.ovh/v1/${encodeURIComponent(artist)}/${encodeURIComponent(title)}`);
        if (res.ok) {
          const data = await res.json();
          let rawLyrics = data.lyrics || 'Lyrics not found.';
          // lyrics.ovh sometimes prepends "Paroles de la chanson X par Y"
          rawLyrics = rawLyrics.replace(/Paroles de la chanson.*\n/i, '').trim();
          setLyrics(rawLyrics);
        } else {
          setLyrics('Lyrics not found or unavailable for this track.');
        }
      } catch (err) {
        setLyrics('Failed to load lyrics.');
      }
      setLoading(false);
    };

    fetchLyrics();
  }, [currentSong?.videoId, currentSong?.title]);

  if (!currentSong) return null;

  return (
    <div className="bg-[#1e1e1e]/60 rounded-3xl relative flex flex-col border border-white/10 shadow-xl mt-6 transition-all duration-300">
      
      {/* Clickable Header */}
      <button 
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-5 z-10 hover:bg-white/5 transition-colors rounded-3xl shrink-0 cursor-pointer focus:outline-none"
      >
        <div className="flex items-center gap-3">
          <div className="bg-green-500/20 p-2 rounded-full">
            <Mic2 className="w-5 h-5 text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-wide">Lyrics</h2>
        </div>
        <div>
          {isExpanded ? <ChevronUp className="w-5 h-5 text-zinc-400" /> : <ChevronDown className="w-5 h-5 text-zinc-400" />}
        </div>
      </button>

      {/* Expandable Content */}
      <div 
        className={`overflow-hidden transition-all duration-300 ease-in-out flex flex-col ${isExpanded ? 'h-[400px] opacity-100 p-6 pt-0' : 'h-0 opacity-0 px-6 py-0'}`}
      >
        {loading ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 text-green-500 animate-spin mb-4" />
            <p className="text-zinc-500 font-medium">Hunting for lyrics...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 text-left">
            {lyrics && !lyrics.includes('not found') && !lyrics.includes('Failed') && !lyrics.includes('Could not') ? (
              <div className="text-2xl md:text-3xl font-bold text-zinc-300/[0.85] leading-snug whitespace-pre-wrap tracking-wide pb-8 transition-colors hover:text-white duration-500">
                {lyrics}
              </div>
            ) : (
              <div className="flex h-full items-center justify-center text-center">
                 <p className="text-zinc-500 font-semibold text-lg">{lyrics}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
