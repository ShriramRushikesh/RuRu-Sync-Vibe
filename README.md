# Groic Music Room Clone

A full-stack synchronized music listening platform optimized for couples.

## Features
- Real-time synchronized playback (Spotify simulation)
- Couple Mode (private 2-user rooms)
- Love Notes (floating messages)
- Mood Lighting (dynamic backgrounds)
- Virtual Gifts and Emoji reactions
- Live Chat
- Date Night Stats ("Songs Listened", "Time Together")

## Tech Stack
- **Frontend**: React 18, Vite, TailwindCSS (v3), Framer Motion, Zustand, Socket.io-client
- **Backend**: Node.js, Express, Socket.io, MongoDB, Mongoose

## Setup

1. **Install dependencies**
   ```bash
   cd server && npm install
   cd ../client && npm install
   ```

2. **Environment Variables**
   - Copy `server/.env.example` to `server/.env`
   - Configure MONGODB_URI and SPOTIFY credentials.

3. **Run Locally (Dev)**
   - Start MongoDB using Docker (optional):
     ```bash
     docker-compose up -d
     ```
   - Start Backend:
     ```bash
     cd server && npm run dev
     ```
   - Start Frontend:
     ```bash
     cd client && npm run dev
     ```

## Deployment
- **Frontend**: Deploy `client` folder to Vercel. Ensure build command is `npm run build` and output directory is `dist`. Set `VITE_API_URL` to your deployed backend URL.
- **Backend**: Deploy `server` folder to Render/Railway. Set environment variables.

## Spotify API Note
To fully implement the Spotify Web Playback SDK:
1. Go to Spotify Developer Dashboard and obtain Client ID/Secret.
2. Update the `RoomPlayer.jsx` to load `spotify-player.js`.
3. Handle OAuth in `server/routes/auth.js` (currently omitted for brevity, logic structure mocked).
