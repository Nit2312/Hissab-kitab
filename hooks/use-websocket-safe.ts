"use client"

import { useState, useEffect } from 'react'

interface WebSocketMessage {
  type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 'group_updated' | 'settlement_updated'
  data: any
  timestamp: number
}

export function useWebSocketSafe() {
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null)

  useEffect(() => {
    // Only initialize WebSocket on client side
    if (typeof window === 'undefined') return

    let ws: WebSocket | null = null
    let reconnectTimeout: NodeJS.Timeout | null = null
    let reconnectAttempts = 0
    const maxReconnectAttempts = 3 // Reduced to avoid too many reconnection attempts

    const connect = () => {
      try {
        // Connect to separate WebSocket server on port 3001
        const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.hostname}:3001`
        
        console.log('Attempting WebSocket connection to:', wsUrl)
        
        ws = new WebSocket(wsUrl)

        ws.onopen = () => {
          console.log('WebSocket connected successfully')
          setIsConnected(true)
          reconnectAttempts = 0
        }

        ws.onmessage = (event) => {
          try {
            const message: WebSocketMessage = JSON.parse(event.data)
            setLastMessage(message)
            console.log('WebSocket message received:', message)
          } catch (error) {
            console.error('Error parsing WebSocket message:', error)
          }
        }

        ws.onclose = (event) => {
          console.log('WebSocket disconnected:', event.code, event.reason)
          setIsConnected(false)
          ws = null

          // Attempt to reconnect only if it wasn't a normal closure
          if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 5000) // Max 5 seconds
            console.log(`Attempting to reconnect in ${delay}ms... (attempt ${reconnectAttempts}/${maxReconnectAttempts})`)
            reconnectTimeout = setTimeout(connect, delay)
          } else {
            console.log('WebSocket connection failed or max reconnection attempts reached')
          }
        }

        ws.onerror = (error) => {
          console.warn('WebSocket connection failed - server might not be running')
          setIsConnected(false)
          
          // Don't keep trying to reconnect if the server isn't running
          if (reconnectAttempts === 0) {
            console.log('WebSocket server not available - using fallback mode')
          }
        }

        // Set a timeout for connection attempt
        setTimeout(() => {
          if (ws && ws.readyState === WebSocket.CONNECTING) {
            console.log('WebSocket connection timeout - closing')
            ws.close()
          }
        }, 5000) // 5 second timeout

      } catch (error) {
        console.warn('Error creating WebSocket connection:', error)
        setIsConnected(false)
      }
    }

    connect()

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
      if (ws) {
        ws.close()
      }
    }
  }, [])

  const sendMessage = (message: Omit<WebSocketMessage, 'timestamp'>) => {
    if (typeof window === 'undefined') return
    
    // For now, just log the message since WebSocket server might not be running
    console.log('WebSocket message (not sent - server not available):', message)
  }

  return {
    isConnected,
    lastMessage,
    sendMessage
  }
}
