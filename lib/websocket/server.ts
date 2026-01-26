import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { NextApiRequest, NextApiResponse } from 'next'

export interface SocketServer {
  io: SocketIOServer
  broadcast: (event: string, data: any) => void
}

let socketServer: SocketServer | null = null

export function createSocketServer(httpServer: NetServer): SocketServer {
  if (socketServer) {
    return socketServer
  }

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : ['http://localhost:3000', 'http://localhost:3001'],
      methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
  })

  io.on('connection', (socket) => {
    console.log('Client connected to WebSocket:', socket.id)

    // Join user-specific room for personalized updates
    const userId = socket.handshake.query.userId as string
    if (userId) {
      socket.join(`user:${userId}`)
      console.log(`User ${userId} joined their room`)
    }

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })

    // Handle real-time events
    socket.on('expense_added', (data) => {
      // Broadcast to all connected clients
      io.emit('expense_added', data)
    })

    socket.on('expense_updated', (data) => {
      io.emit('expense_updated', data)
    })

    socket.on('expense_deleted', (data) => {
      io.emit('expense_deleted', data)
    })

    socket.on('group_updated', (data) => {
      io.emit('group_updated', data)
    })

    socket.on('settlement_updated', (data) => {
      io.emit('settlement_updated', data)
    })

    socket.on('settlement_created', (data) => {
      io.emit('settlement_created', data)
    })
  })

  socketServer = {
    io,
    broadcast: (event: string, data: any) => {
      io.emit(event, data)
    }
  }

  return socketServer
}

export function getSocketServer(): SocketServer | null {
  return socketServer
}

// Helper function to broadcast expense updates
export function broadcastExpenseUpdate(type: 'added' | 'updated' | 'deleted', expense: any, userId?: string) {
  const server = getSocketServer()
  if (!server) return

  const eventData = {
    type: `expense_${type}`,
    data: expense,
    timestamp: Date.now(),
    userId
  }

  if (userId) {
    // Send to specific user
    server.io.to(`user:${userId}`).emit('expense_update', eventData)
  } else {
    // Broadcast to all
    server.io.emit('expense_update', eventData)
  }
}

// Helper function to broadcast group updates
export function broadcastGroupUpdate(type: 'updated', group: any, userIds?: string[]) {
  const server = getSocketServer()
  if (!server) return

  const eventData = {
    type: `group_${type}`,
    data: group,
    timestamp: Date.now()
  }

  if (userIds && userIds.length > 0) {
    // Send to specific users
    userIds.forEach(userId => {
      server.io.to(`user:${userId}`).emit('group_update', eventData)
    })
  } else {
    // Broadcast to all
    server.io.emit('group_update', eventData)
  }
}
