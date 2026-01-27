"use client"

import React, { createContext, useContext, useEffect, ReactNode } from 'react'
import { useGlobalWebSocket } from '@/hooks/use-websocket'

interface WebSocketContextType {
  isConnected: boolean
  lastMessage: any
  sendMessage: (message: any) => void
}

const WebSocketContext = createContext<WebSocketContextType | null>(null)

export function useWebSocketContext() {
  const context = useContext(WebSocketContext)
  if (!context) {
    throw new Error('useWebSocketContext must be used within WebSocketProvider')
  }
  return context
}

interface WebSocketProviderProps {
  children: ReactNode
}

export function WebSocketProvider({ children }: WebSocketProviderProps) {
  const { isConnected, lastMessage, sendMessage } = useGlobalWebSocket()

  const value = {
    isConnected,
    lastMessage,
    sendMessage
  }

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  )
}
