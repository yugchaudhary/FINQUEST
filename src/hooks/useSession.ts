'use client'

import { useState, useEffect } from 'react'
import { getSession } from '@/app/actions/auth'

export function useSession() {
  const [user, setUser] = useState<any>(null)
  const [role, setRole] = useState<string | null>(null)
  const [team, setTeam] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchSession() {
      try {
        const result = await getSession()
        if (result?.success && result.data) {
          setUser(result.data.user)
          setRole(result.data.userData?.auth_role || null)
          setTeam(result.data.userData?.teams || null)
        }
      } catch (error) {
        console.error('Failed to fetch session:', error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchSession()
  }, [])

  return { user, role, team, isLoading }
}
