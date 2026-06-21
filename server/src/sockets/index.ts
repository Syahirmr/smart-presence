import type { Server as HttpServer } from 'node:http';
import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

let io: Server | null = null;

export function initSocket(server: HttpServer) {
  const allowedOrigins = env.CORS_ORIGIN.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  io = new Server(server, {
    cors: {
      origin: allowedOrigins.length > 0 ? allowedOrigins : '*',
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    logger.debug({ socketId: socket.id }, 'Admin Dashboard connected to WebSocket');

    socket.on('disconnect', () => {
      logger.debug({ socketId: socket.id }, 'Admin Dashboard disconnected');
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

export function getSocketInstance() {
  if (!io) {
    logger.warn('Socket.IO is not initialized yet');
  }
  return io;
}