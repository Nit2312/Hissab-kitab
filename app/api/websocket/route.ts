import { NextRequest } from 'next/server'
import { Server as NetServer } from 'http'
import { Server as SocketIOServer } from 'socket.io'
import { createSocketServer, getSocketServer } from '@/lib/websocket/server'

let io: SocketIOServer | null = null

export async function GET(req: NextRequest) {
  // This is just to establish the WebSocket connection
  // The actual WebSocket server will be created when the app starts
  return new Response('WebSocket endpoint', { status: 200 })
}

export async function POST(req: NextRequest) {
  // Handle WebSocket events via HTTP for fallback
  const body = await req.json()
  
  const server = getSocketServer()
  if (!server) {
    return new Response('WebSocket server not available', { status: 503 })
  }

  const { event, data, userId } = body
  
  switch (event) {
    case 'expense_added':
    case 'expense_updated':
    case 'expense_deleted':
      server.broadcast('expense_update', { type: event, data, userId, timestamp: Date.now() })
      break
    case 'group_updated':
      server.broadcast('group_update', { type: event, data, timestamp: Date.now() })
      break
    case 'settlement_updated':
      server.broadcast('settlement_update', { type: event, data, timestamp: Date.now() })
      break
    default:
      return new Response('Unknown event', { status: 400 })
  }

  return new Response('Event broadcasted', { status: 200 })
}

// Initialize WebSocket server when this module is imported
if (typeof globalThis !== 'undefined' && !getSocketServer()) {
  // Create a simple HTTP server for Socket.IO
  const httpServer = new NetServer()
  createSocketServer(httpServer)
}
