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
        favorites: [],
        chatHistory: [],
        stats: { songsListened: 0, timeSpentMs: 0 },
        ourSongs: [],
        moodMode: 'normal',
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

    // ── Authoritative join sync ──────────────────────────────────────────────
    const now = Date.now();
    let currentPos = room.currentTime;
    if (room.isPlaying) {
      currentPos += (now - room.updatedAt) / 1000;
    }

    // Include serverTime so client can calculate its RTT offset precisely  
    socket.emit('sync-state', {
      song: room.song,
      isPlaying: room.isPlaying,
      currentTime: currentPos,
      serverTime: now,
    });

    // ── Latency ──────────────────────────────────────────────────────────────
    socket.on('ping-sync', (timestamp) => {
      socket.emit('pong-sync', { timestamp, serverTime: Date.now() });
    });

    // ── Heartbeat / typing ───────────────────────────────────────────────────
    socket.on('heartbeat', (data) => socket.to(roomId).emit('partner_heartbeat', data));
    socket.on('typing', (msg) => socket.to(roomId).emit('partner_typing', msg));

    // ── Chat ─────────────────────────────────────────────────────────────────
    socket.on('send_message', (message) => {
      const msg = { sender: username, message, timestamp: Date.now() };
      room.chatHistory.push(msg);
      io.to(roomId).emit('receive_message', msg);
    });

    // ── Music Sync Engine ─────────────────────────────────────────────────────
    socket.on('play', ({ roomId: rid, currentTime }) => {
      const r = rooms[rid];
      if (!r) return;
      const serverTime = Date.now();
      r.isPlaying = true;
      r.currentTime = currentTime;
      r.updatedAt = serverTime;
      // Send serverTime so all clients can align clocks precisely
      socket.to(rid).emit('sync-play', { currentTime, updatedAt: serverTime, serverTime });
    });

    socket.on('pause', ({ roomId: rid, currentTime }) => {
      const r = rooms[rid];
      if (!r) return;
      const serverTime = Date.now();
      r.isPlaying = false;
      r.currentTime = currentTime;
      r.updatedAt = serverTime;
      socket.to(rid).emit('sync-pause', { currentTime, updatedAt: serverTime, serverTime });
    });

    socket.on('seek', ({ roomId: rid, currentTime }) => {
      const r = rooms[rid];
      if (!r) return;
      const serverTime = Date.now();
      r.currentTime = currentTime;
      r.updatedAt = serverTime;
      // Broadcast to ALL users (including sender) so host also gets confirmation
      io.to(rid).emit('sync-seek', { currentTime, updatedAt: serverTime, serverTime });
    });

    socket.on('change-song', ({ roomId: rid, song }) => {
      const r = rooms[rid];
      if (!r) return;
      if (r.queue.length > 0 && (r.queue[0].videoId === song.videoId || r.queue[0].id === song.id)) {
        r.queue.shift();
        io.to(rid).emit('queue_updated', r.queue);
      }
      r.song = song;
      r.currentTime = 0;
      r.isPlaying = true;
      r.updatedAt = Date.now();
      // Broadcast to ALL users so everyone loads the new song
      io.to(rid).emit('sync-song', { song: r.song, serverTime: r.updatedAt });
    });

    // ── Queue & Favorites ─────────────────────────────────────────────────────
    socket.on('add_to_queue', (song) => {
      if (!rooms[roomId]) return;
      rooms[roomId].queue.push(song);
      io.to(roomId).emit('queue_updated', rooms[roomId].queue);
    });

    socket.on('toggle_favorite', ({ roomId: rid, song }) => {
      const r = rooms[rid || roomId];
      if (!r) return;
      if (!r.favorites) r.favorites = [];
      const idx = r.favorites.findIndex(s => s.videoId === song.videoId || s.id === song.id);
      if (idx !== -1) r.favorites.splice(idx, 1);
      else r.favorites.push(song);
      io.to(rid || roomId).emit('favorites_updated', r.favorites);
    });

    // ── Social ────────────────────────────────────────────────────────────────
    socket.on('send_love_note', (note) => io.to(roomId).emit('receive_love_note', { ...note, sender: username }));
    socket.on('send_gift', (gift) => io.to(roomId).emit('receive_gift', { ...gift, sender: username }));
    socket.on('change_mood', (mood) => { room.moodMode = mood; io.to(roomId).emit('mood_changed', mood); });
    socket.on('save_moment', (moment) => { room.ourSongs.push({ ...moment, addedBy: username, timestamp: Date.now() }); io.to(roomId).emit('moment_saved', moment); });
    socket.on('voice_reaction', (audioData) => socket.to(roomId).emit('receive_voice_reaction', { audioData, sender: username }));
    socket.on('send_emoji', (emojiData) => io.to(roomId).emit('receive_emoji', emojiData));
    socket.on('steal_attention', () => socket.to(roomId).emit('attention_stolen'));

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      if (!rooms[roomId]) return;
      room.users = room.users.filter(u => u.socketId !== socket.id);
      if (room.users.length === 0) {
        delete rooms[roomId];
      } else {
        if (room.hostSocketId === socket.id) {
          room.hostSocketId = room.users[0].socketId;
          room.users[0].isHost = true;
        }
        io.to(roomId).emit('room_update', room);
      }
    });
  };

  socket.on('join_room', joinRoom);
};
