// src/hooks/useSocket.js
import { useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

export function useSocket(handlers) {
  const socketRef = useRef(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const uid = localStorage.getItem('cn_tool_uid') || '';
    const socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      query: uid ? { uid } : {},
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      handlersRef.current.onConnect?.();
      // Announce presence so the admin portal sees this user as online
      const u = localStorage.getItem('cn_tool_uid')  || '';
      const n = localStorage.getItem('cn_tool_name') || '';
      if (u) socket.emit('user:online', { email: u, name: n });
    });
    socket.on('disconnect', () => handlersRef.current.onDisconnect?.());
    socket.on('initial:state', data => handlersRef.current.onInitialState?.(data));
    socket.on('provider:updated', data => handlersRef.current.onProviderUpdated?.(data));
    socket.on('provider:fetching', data => handlersRef.current.onProviderFetching?.(data));
    socket.on('provider:error', data => handlersRef.current.onProviderError?.(data));
    socket.on('provider:disconnected', data => handlersRef.current.onProviderDisconnected?.(data));
    socket.on('alerts:updated', data => handlersRef.current.onAlertsUpdated?.(data));
    socket.on('topology:updated', data => handlersRef.current.onTopologyUpdated?.(data));
    socket.on('session:revoked', data => handlersRef.current.onSessionRevoked?.(data));
    socket.on('account:switched', data => handlersRef.current.onAccountSwitched?.(data));

    return () => {
      const u = localStorage.getItem('cn_tool_uid') || '';
      if (u) socket.emit('user:offline', { email: u });
      socket.disconnect();
    };
  }, []);

  const emit = useCallback((event, data) => {
    socketRef.current?.emit(event, data);
  }, []);

  return { emit };
}
