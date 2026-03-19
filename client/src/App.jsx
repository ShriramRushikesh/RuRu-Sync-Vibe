import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Room from './pages/Room';
import GlobalAudioPlayer from './components/GlobalAudioPlayer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
       staleTime: 1000 * 60 * 5, // 5 minutes
       gcTime: 1000 * 60 * 30, // 30 minutes
       retry: 1,
       refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="min-h-screen bg-zinc-950 text-white selection:bg-pink-500/30">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/room/:id" element={<Room />} />
          </Routes>
          
          {/* Global persistent components */}
          <GlobalAudioPlayer />
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
