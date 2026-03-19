import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  room: null,
  socket: null,
  // Sync & Timing
  latency: 0,
  serverOffset: 0,
  
  // Playback State
  isPlaying: false,
  volume: 1,
  progress: 0,
  currentSong: null,
  queue: [],
  members: [],

  // UI State
  moodMode: 'normal',
  chatMessages: [],
  loveNotes: [],
  virtualGifts: [],
  emojis: [],
  partnerTouching: false,
  isTyping: false,
  typingMsg: '',
  
  setRoom: (room) => set({ 
    room, 
    queue: room?.queue || [], 
    currentSong: room?.song || null,
    members: room?.users || []
  }),
  setSocket: (socket) => set({ socket }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setVolume: (volume) => set({ volume }),
  setProgress: (progress) => set({ progress }),
  setCurrentSong: (currentSong) => set({ currentSong }),
  setQueue: (queue) => set({ queue }),
  setMembers: (members) => set({ members }),
  setLatency: (latency) => set({ latency }),
  
  updateRoomQueue: (queue) => set((state) => ({ 
    room: { ...state.room, queue },
    queue
  })),
  updateRoomFavorites: (favorites) => set((state) => ({ room: { ...state.room, favorites } })),
  updateSong: (song) => set((state) => ({ 
    room: state.room ? { ...state.room, song } : state.room,
    currentSong: song
  })),
  updateSongProgress: (progress) => set((state) => ({
    progress,
    room: state.room && state.room.song 
      ? { ...state.room, song: { ...state.room.song, progressMs: progress * 1000 } } 
      : state.room
  })),
  setMoodMode: (mood) => set({ moodMode: mood }),
  setMoodMode: (mood) => set({ moodMode: mood }),
  addChatMessage: (msg) => set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  addLoveNote: (note) => set((state) => ({ loveNotes: [...state.loveNotes, note] })),
  addVirtualGift: (gift) => set((state) => ({ virtualGifts: [...state.virtualGifts, gift] })),
  addEmoji: (emoji) => set((state) => ({ emojis: [...state.emojis, emoji] })),
  
  setPartnerTouching: (touching) => set({ partnerTouching: touching }),
  setTyping: (isTyping, typingMsg) => set({ isTyping, typingMsg }),

  // Cleanup for floating elements
  removeLoveNote: (id) => set((state) => ({ loveNotes: state.loveNotes.filter(n => n.id !== id) })),
  removeVirtualGift: (id) => set((state) => ({ virtualGifts: state.virtualGifts.filter(g => g.id !== id) })),
  removeEmoji: (id) => set((state) => ({ emojis: state.emojis.filter(e => e.id !== id) })),
}));
