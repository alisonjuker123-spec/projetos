import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io('http://localhost:3001', {
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      console.log('Socket connected:', s.id);
      setConnected(true);
    });

    s.on('disconnect', () => {
      console.log('Socket disconnected');
      setConnected(false);
    });

    setSocket(s);

    return () => {
      s.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, connected }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error('useSocket must be used within SocketProvider');
  return ctx;
}
