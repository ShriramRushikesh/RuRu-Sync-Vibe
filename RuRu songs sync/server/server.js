require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const roomHandler = require('./sockets/roomHandler');

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL || '*' }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || '*', methods: ['GET', 'POST'] }
});

// Removed MongoDB to make it instantly runnable in-memory and avoid connection issues!
console.log('Running in memory with no database dependencies ✨');

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  roomHandler(io, socket);
});

const ytSearch = require('yt-search');

// Simple API route
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.get('/api/music/search', async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.status(400).json({ error: 'Query is required' });
    const r = await ytSearch(q);
    const videos = r.videos.slice(0, 10).map(v => ({
      videoId: v.videoId,
      title: v.title,
      artist: v.author.name,
      durationText: v.timestamp,
      durationMs: v.seconds * 1000,
      thumbnail: v.thumbnail,
      url: v.url
    }));
    res.json({ results: videos });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Failed to search music' });
  }
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
