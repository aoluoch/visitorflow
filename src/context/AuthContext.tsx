import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { AdminProfile, Visitor, GroupAdminAssignment, UserProfile } from '../types'

interface AuthContextValue {
  user: User | null
  session: Session | null
  adminProfile: AdminProfile | null
  userProfile: UserProfile | null
  visitor: Visitor | null
  groupAssignments: GroupAdminAssignment[]
  isAdmin: boolean
  isSuperAdmin: boolean
  isGroupAdmin: boolean
  isUser: boolean
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>
  resetPassword: (email: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  updateUserProfile: (updates: Partial<UserProfile>) => Promise<{ error: string | null }>
  refreshUserProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [visitor, setVisitor] = useState<Visitor | null>(null)
  const [groupAssignments, setGroupAssignments] = useState<GroupAdminAssignment[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAdminProfile(userId: string) {
    const { data } = await supabase
      .from('admin_profiles')
      .select('*')
      .eq('id', userId)
      .single()
    setAdminProfile(data ?? null)
  }

  async function loadUserProfile(userId: string) {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      if (error) {
        setUserProfile(null)
      } else {
        setUserProfile((data as UserProfile) ?? null)
      }
    } catch {
      setUserProfile(null)
    }
  }

  async function loadVisitor(userId: string) {
    try {
      const { data } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      setVisitor((data as Visitor) ?? null)
    } catch {
      setVisitor(null)
    }
  }

  async function loadAssignments(userId: string) {
    try {
      const { data, error } = await supabase
        .from('group_admin_assignments')
        .select('*')
        .eq('user_id', userId)
      if (error) {
        // Table may not exist yet before migrations; fail soft
        setGroupAssignments([])
      } else {
        setGroupAssignments((data as GroupAdminAssignment[]) ?? [])
      }
    } catch {
      setGroupAssignments([])
    }
  }

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        await Promise.all([
          loadAdminProfile(session.user.id),
          loadUserProfile(session.user.id),
          loadVisitor(session.user.id),
          loadAssignments(session.user.id),
        ])
      }
      setLoading(false)
    })()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setSession(session)
      setUser(session?.user ?? null)
      if (session?.user) {
        loadAdminProfile(session.user.id)
        loadUserProfile(session.user.id)
        loadVisitor(session.user.id)
        loadAssignments(session.user.id)
      } else {
        setAdminProfile(null)
        setUserProfile(null)
        setVisitor(null)
        setGroupAssignments([])
      }
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signUp(email: string, password: string, fullName?: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
      },
    })
    if (error) return { error: error.message }
    return { error: null }
  }

  async function resetPassword(email: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) return { error: error.message }
    return { error: null }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateUserProfile(updates: Partial<UserProfile>): Promise<{ error: string | null }> {
    if (!user) return { error: 'Not authenticated' }
    const { error } = await supabase
      .from('user_profiles')
      .update(updates)
      .eq('id', user.id)
    if (error) return { error: error.message }
    await loadUserProfile(user.id)
    return { error: null }
  }

  async function refreshUserProfile() {
    if (user) await loadUserProfile(user.id)
  }

  const isAdmin = !!adminProfile
  const isSuperAdmin = adminProfile?.role === 'super_admin'
  const isGroupAdmin = groupAssignments.length > 0
  const isUser = !!userProfile && !isAdmin && !isGroupAdmin

  return (
    <AuthContext.Provider value={{ user, session, adminProfile, userProfile, visitor, groupAssignments, isAdmin, isSuperAdmin, isGroupAdmin, isUser, loading, signIn, signUp, resetPassword, signOut, updateUserProfile, refreshUserProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
