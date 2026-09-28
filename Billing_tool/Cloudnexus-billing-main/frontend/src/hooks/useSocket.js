import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

export function useSocket(handlers) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  useEffect(() => { handlersRef.current = handlers; });

  useEffect(() => {
    const uid = localStorage.getItem('cn_tool_uid') || '';
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      query: uid ? { uid } : {},
    });
    socketRef.current = socket;
    socket.on('connect', () => {
      handlersRef.current.onConnect?.();
      const u = localStorage.getItem('cn_tool_uid')  || '';
      const n = localStorage.getItem('cn_tool_name') || '';
      if (u) socket.emit('user:online', { email: u, name: n });
    });
    socket.on('disconnect',      ()   => handlersRef.current.onDisconnect?.());
    socket.on('alerts:updated',  data => handlersRef.current.onAlertsUpdated?.(data));
    socket.on('session:revoked', data => handlersRef.current.onSessionRevoked?.(data));
    return () => {
      const u = localStorage.getItem('cn_tool_uid') || '';
      if (u) socket.emit('user:offline', { email: u });
      socket.disconnect();
    };
  }, []);

  return { emit: (e, d) => socketRef.current?.emit(e, d) };
}
