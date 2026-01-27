// Simple WebSocket server setup script
// Run this with: node scripts/setup-websocket.js

const { createServer } = require('http')
const { Server } = require('socket.io')

const PORT = process.env.WS_PORT || 3001

const httpServer = createServer()
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST']
  }
})

io.on('connection', (socket) => {
  console.log('Client connected to WebSocket server:', socket.id)

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id)
  })

  // Handle real-time events
  socket.on('expense_added', (data) => {
    console.log('Broadcasting expense_added:', data)
    io.emit('expense_added', data)
  })

  socket.on('expense_updated', (data) => {
    console.log('Broadcasting expense_updated:', data)
    io.emit('expense_updated', data)
  })

  socket.on('expense_deleted', (data) => {
    console.log('Broadcasting expense_deleted:', data)
    io.emit('expense_deleted', data)
  })

  socket.on('group_updated', (data) => {
    console.log('Broadcasting group_updated:', data)
    io.emit('group_updated', data)
  })

  socket.on('settlement_updated', (data) => {
    console.log('Broadcasting settlement_updated:', data)
    io.emit('settlement_updated', data)
  })

  socket.on('settlement_created', (data) => {
    console.log('Broadcasting settlement_created:', data)
    io.emit('settlement_created', data)
  })
})

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(`Connect your app to: ws://localhost:${PORT}`)
})

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully')
  httpServer.close(() => {
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully')
  httpServer.close(() => {
    process.exit(0)
  })
})
