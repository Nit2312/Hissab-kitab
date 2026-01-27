"use client"

import { useState, useEffect } from 'react'
import { useGlobalWebSocket } from './use-websocket'

export function useRealTimeKhata(initialData: any = null) {
  const [khataData, setKhataData] = useState(initialData)
  const { lastMessage } = useGlobalWebSocket()

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'group_updated':
          setKhataData((prev: any) => ({
            ...prev,
            groups: prev?.groups?.map((group: any) => 
              group.id === lastMessage.data.id 
                ? { ...group, ...lastMessage.data }
                : group
            ) || []
          }))
          break
        case 'settlement_updated':
          setKhataData((prev: any) => ({
            ...prev,
            settlements: [...(prev?.settlements || []), lastMessage.data]
          }))
          break
        case 'expense_added':
          // Update business khata when new expense is added
          if (!lastMessage.data.group_id) {
            setKhataData((prev: any) => ({
              ...prev,
              totalExpenses: (prev?.totalExpenses || 0) + lastMessage.data.amount
            }))
          }
          break
      }
    }
  }, [lastMessage])

  return khataData
}
