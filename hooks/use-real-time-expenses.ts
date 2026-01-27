"use client"

import { useState, useEffect } from 'react'
import { useGlobalWebSocket } from './use-websocket'

export function useRealTimeExpenses(initialExpenses: any[] = []) {
  const [expenses, setExpenses] = useState(initialExpenses)
  const { lastMessage } = useGlobalWebSocket()

  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'expense_added':
          setExpenses(prev => [...prev, lastMessage.data])
          break
        case 'expense_updated':
          setExpenses(prev => 
            prev.map(expense => 
              expense.id === lastMessage.data.id 
                ? { ...expense, ...lastMessage.data }
                : expense
            )
          )
          break
        case 'expense_deleted':
          setExpenses(prev => 
            prev.filter(expense => expense.id !== lastMessage.data.id)
          )
          break
      }
    }
  }, [lastMessage])

  return expenses
}
