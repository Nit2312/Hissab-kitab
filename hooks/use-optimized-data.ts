import { useState, useEffect, useCallback } from 'react'
import { cachedFetch } from '@/lib/cache'

// Optimized hook for fetching expenses with caching
export function useExpenses() {
  const [expenses, setExpenses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await cachedFetch(
        'expenses',
        async () => {
          const response = await fetch('/api/expenses', { credentials: 'include' })
          if (!response.ok) throw new Error('Failed to fetch expenses')
          return response.json()
        },
        5 * 60 * 1000 // 5 minutes cache
      )
      
      setExpenses(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    const cacheKey = 'expenses'
    if (typeof window !== 'undefined') {
      // Trigger cache invalidation by adding timestamp
      fetch(`/api/expenses?t=${Date.now()}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => setExpenses(data))
        .catch(console.error)
    }
  }, [])

  return { expenses, loading, error, refetch }
}

// Optimized hook for fetching groups with caching
export function useGroups() {
  const [groups, setGroups] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchGroups = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await cachedFetch(
        'groups',
        async () => {
          const response = await fetch('/api/groups', { credentials: 'include' })
          if (!response.ok) throw new Error('Failed to fetch groups')
          return response.json()
        },
        5 * 60 * 1000 // 5 minutes cache
      )
      
      setGroups(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    if (typeof window !== 'undefined') {
      fetch(`/api/groups?t=${Date.now()}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => setGroups(data))
        .catch(console.error)
    }
  }, [])

  return { groups, loading, error, refetch }
}

// Optimized hook for fetching settlements with caching
export function useSettlements() {
  const [settlements, setSettlements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const data = await cachedFetch(
        'settlements',
        async () => {
          const response = await fetch('/api/settlements/pending', { credentials: 'include' })
          if (!response.ok) throw new Error('Failed to fetch settlements')
          return response.json()
        },
        5 * 60 * 1000 // 5 minutes cache
      )
      
      setSettlements(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSettlements()
  }, [fetchSettlements])

  const refetch = useCallback(() => {
    // Clear cache and refetch
    if (typeof window !== 'undefined') {
      fetch(`/api/settlements/pending?t=${Date.now()}`, { credentials: 'include' })
        .then(response => response.json())
        .then(data => setSettlements(data))
        .catch(console.error)
    }
  }, [])

  return { settlements, loading, error, refetch }
}
