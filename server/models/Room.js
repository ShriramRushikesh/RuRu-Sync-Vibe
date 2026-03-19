const mongoose = require('mongoose');

const roomSchema = new mongoose.Schema({
  roomId: { type: String, required: true, unique: true },
  name: { type: String, default: 'Vibes Room' },
  hostSocketId: { type: String },
  isCoupleMode: { type: Boolean, default: false },
  users: [{
    socketId: String,
    username: String,
    isHost: Boolean
  }],
  currentSong: {
    uri: String,
    name: String,
    artist: String,
    durationMs: Number,
    progressMs: Number,
    isPlaying: Boolean,
    updatedAt: Number
  },
  queue: [{
    uri: String,
    name: String,
    artist: String,
    durationMs: Number,
    addedBy: String
  }],
  chatHistory: [{
    sender: String,
    message: String,
    timestamp: { type: Date, default: Date.now }
  }],
  stats: {
    songsListened: { type: Number, default: 0 },
    timeSpentMs: { type: Number, default: 0 }
  },
  ourSongs: [{
    uri: String,
    name: String,
    artist: String,
    timestamp: { type: Date, default: Date.now },
    addedBy: String
  }],
  moodMode: { type: String, default: 'normal' } // normal, candlelight, sunset, stars
}, { timestamps: true });

module.exports = mongoose.model('Room', roomSchema);
