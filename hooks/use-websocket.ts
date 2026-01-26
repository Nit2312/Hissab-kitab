"use client"

import { useEffect, useRef, useState } from 'react'

interface WebSocketMessage {
  type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'group_updated' | 'settlement_updated'
  data: any
  timestamp: number
}

export function useWebSocket(url: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const reconnectAttempts = useRef(0)
  const maxReconnectAttempts = 5

  const connect = () => {
    try {
      const wsUrl = url.startsWith('ws') ? url : `wss://${url.replace(/^https?:\/\//, '')}`
      const ws = new WebSocket(wsUrl)

      ws.onopen = () => {
        console.log('WebSocket connected')
        setIsConnected(true)
        reconnectAttempts.current = 0
        setSocket(ws)
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          setLastMessage(message)
          console.log('WebSocket message received:', message)
        } catch (error) {
          console.error('Error parsing WebSocket message:', error)
        }
      }

      ws.onclose = (event: CloseEvent) => {
        console.log('WebSocket disconnected:', event.code, event.reason)
        setIsConnected(false)
        setSocket(null)

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++
          const delay = Math.pow(2, reconnectAttempts.current) * 1000 // Exponential backoff
          console.log(`Attempting to reconnect in ${delay}ms...`)
          
          reconnectTimeoutRef.current = setTimeout(() => {
            connect()
          }, delay)
        }
      }

      ws.onerror = (error: Event) => {
        console.error('WebSocket error:', error)
        setIsConnected(false)
      }

    } catch (error) {
      console.error('Error creating WebSocket connection:', error)
    }
  }

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (socket) {
      socket.close()
    }
  }

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({
        ...message,
        timestamp: Date.now()
      }))
    } else {
      console.warn('WebSocket is not connected')
    }
  }

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [url])

  return {
    socket,
    isConnected,
    lastMessage,
    sendMessage,
    disconnect,
    reconnect: connect
  }
}

// Global WebSocket instance for the app
let globalWebSocket: ReturnType<typeof useWebSocket> | null = null

export function useGlobalWebSocket() {
  try {
    if (!globalWebSocket) {
      const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 
        (typeof window !== 'undefined' ? 
          `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : 
          'ws://localhost:3000')
      globalWebSocket = useWebSocket(wsUrl)
    }
    return globalWebSocket
  } catch (error) {
    console.warn('WebSocket initialization failed:', error)
    // Return a mock WebSocket object to prevent crashes
    return {
      socket: null,
      isConnected: false,
      lastMessage: null,
      sendMessage: () => {},
      disconnect: () => {},
      reconnect: () => {}
    }
  }
}
