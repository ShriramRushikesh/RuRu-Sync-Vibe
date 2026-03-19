const rooms = {};

module.exports = (io, socket) => {
  const joinRoom = ({ roomId, username, isHost, isCoupleMode }) => {
    socket.join(roomId);
    
    if (!rooms[roomId]) {
      rooms[roomId] = {
        roomId,
        name: 'Vibes Room',
        hostSocketId: socket.id,
        isCoupleMode: isCoupleMode || false,
        users: [],
        song: null,
        isPlaying: false,
        currentTime: 0,
        updatedAt: Date.now(),
        queue: [],
        chatHistory: [],
        stats: { songsListened: 0, timeSpentMs: 0 },
        ourSongs: [],
        moodMode: 'normal'
      };
    } else {
      if (rooms[roomId].isCoupleMode && rooms[roomId].users.length >= 2) {
        socket.emit('error', { message: 'Couple mode room is full (max 2 users)' });
        return;
      }
    }

    const room = rooms[roomId];
    room.users.push({ socketId: socket.id, username, isHost });

    io.to(roomId).emit('room_update', room);

    socket.emit('sync-state', {
      song: room.song,
      isPlaying: room.isPlaying,
      currentTime: room.currentTime,
      updatedAt: room.updatedAt
    });
    
    // Heartbeat Sync
    socket.on('heartbeat', (data) => {
      socket.to(roomId).emit('partner_heartbeat', data);
    });

    // Voice Reactions
    // Emojis

    // Chat Ext
    socket.on('typing', (msg) => {
      socket.to(roomId).emit('partner_typing', msg);
    });

    // Chat
    socket.on('send_message', (message) => {
      room.chatHistory.push({ sender: username, message, timestamp: Date.now() });
      io.to(roomId).emit('receive_message', { sender: username, message, timestamp: Date.now() });
    });

    // Music Sync Engine
    socket.on('play', ({ roomId, currentTime }) => {
      const room = rooms[roomId];
      if (room) {
        room.isPlaying = true;
        room.currentTime = currentTime;
        room.updatedAt = Date.now();
        socket.to(roomId).emit('sync-play', { currentTime, updatedAt: room.updatedAt });
      }
    });

    socket.on('pause', ({ roomId, currentTime }) => {
      const room = rooms[roomId];
      if (room) {
        room.isPlaying = false;
        room.currentTime = currentTime;
        room.updatedAt = Date.now();
        socket.to(roomId).emit('sync-pause', { currentTime, updatedAt: room.updatedAt });
      }
    });

    socket.on('seek', ({ roomId, currentTime }) => {
      const room = rooms[roomId];
      if (room) {
        room.currentTime = currentTime;
        room.updatedAt = Date.now();
        socket.to(roomId).emit('sync-seek', { currentTime, updatedAt: room.updatedAt });
      }
    });

    socket.on('change-song', ({ roomId, song }) => {
      const room = rooms[roomId];
      if (room) {
        // If the song being played is the first one in the queue, remove it
        if (room.queue.length > 0 && (room.queue[0].videoId === song.videoId || room.queue[0].id === song.id)) {
          room.queue.shift();
          io.to(roomId).emit('queue_updated', room.queue);
        }
        
        room.song = song;
        room.currentTime = 0;
        room.isPlaying = true;
        room.updatedAt = Date.now();
        io.to(roomId).emit('sync-song', room.song);
      }
    });

    // Queue & Favorite fallbacks if needed by their UI
    socket.on('add_to_queue', (song) => {
      if(rooms[roomId]) {
        rooms[roomId].queue.push(song);
        io.to(roomId).emit('queue_updated', rooms[roomId].queue);
      }
    });

    socket.on('toggle_favorite', (song) => {
      if(rooms[roomId]) {
        const room = rooms[roomId];
        if (!room.favorites) room.favorites = [];
        const exists = room.favorites.findIndex(s => s.videoId === song.videoId || s.id === song.id);
        if (exists !== -1) {
          room.favorites.splice(exists, 1);
        } else {
          room.favorites.push(song);
        }
        io.to(roomId).emit('favorites_updated', room.favorites);
      }
    });

    // Love Notes
    socket.on('send_love_note', (note) => {
      io.to(roomId).emit('receive_love_note', { ...note, sender: username });
    });

    // Virtual Gifts
    socket.on('send_gift', (gift) => {
      io.to(roomId).emit('receive_gift', { ...gift, sender: username });
    });

    // Mood Lighting
    socket.on('change_mood', (mood) => {
      room.moodMode = mood;
      io.to(roomId).emit('mood_changed', mood);
    });

    // Memory Moments
    socket.on('save_moment', (moment) => {
      room.ourSongs.push({ ...moment, addedBy: username, timestamp: Date.now() });
      io.to(roomId).emit('moment_saved', moment);
    });

    // Voice Reactions
    socket.on('voice_reaction', (audioData) => {
      socket.to(roomId).emit('receive_voice_reaction', { audioData, sender: username });
    });
    
    // Emojis
    socket.on('send_emoji', (emojiData) => {
      io.to(roomId).emit('receive_emoji', emojiData);
    });
    
    // Playful commands
    socket.on('steal_attention', () => {
      socket.to(roomId).emit('attention_stolen');
    });

    socket.on('disconnect', () => {
      if (!rooms[roomId]) return;
      
      room.users = room.users.filter(u => u.socketId !== socket.id);
      
      if (room.users.length === 0) {
        delete rooms[roomId];
      } else {
        if (room.hostSocketId === socket.id && room.users.length > 0) {
          room.hostSocketId = room.users[0].socketId; // reassign host
          room.users[0].isHost = true;
        }
        io.to(roomId).emit('room_update', room);
      }
    });
  };

  socket.on('join_room', joinRoom);
};
