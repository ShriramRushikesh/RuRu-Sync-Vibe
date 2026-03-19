import { create } from 'zustand';

export const useRoomStore = create((set) => ({
  room: null,
  socket: null,
  playerState: null,
  moodMode: 'normal',
  chatMessages: [],
  loveNotes: [],
  virtualGifts: [],
  emojis: [],
  partnerTouching: false,
  isTyping: false,
  typingMsg: '',
  
  setRoom: (room) => set({ room }),
  setSocket: (socket) => set({ socket }),
  setPlayerState: (state) => set({ playerState: state }),
  updateRoomQueue: (queue) => set((state) => ({ room: { ...state.room, queue } })),
  updateRoomFavorites: (favorites) => set((state) => ({ room: { ...state.room, favorites } })),
  updateSong: (song) => set((state) => ({ room: state.room ? { ...state.room, song } : state.room })),
  updateSongProgress: (progressMs) => set((state) => ({
    room: state.room && state.room.song 
      ? { ...state.room, song: { ...state.room.song, progressMs } } 
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
