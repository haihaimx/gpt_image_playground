import { create } from 'zustand'
import * as auth from '../lib/auth'

interface AuthState {
  user: auth.User | null
  isAuthenticated: boolean
  isAdmin: boolean
  isLoading: boolean
  authError: string | null
  clearAuthError: () => void
  
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string, email?: string) => Promise<void>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
  fetchUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: auth.getUser(),
  isAuthenticated: auth.isLoggedIn(),
  isAdmin: auth.getUser()?.role === 'admin',
  isLoading: false,
  authError: null,
  clearAuthError: () => set({ authError: null }),
  
  login: async (username, password) => {
    set({ isLoading: true, authError: null })
    try {
      const data = await auth.login(username, password)
      set({ 
        user: data.user, 
        isAuthenticated: true, 
        isAdmin: data.user.role === 'admin',
        isLoading: false,
        authError: null
      })
    } catch (err: any) {
      const msg = err?.message || '登录失败'
      set({ isLoading: false, authError: msg })
      throw err
    }
  },
  
  register: async (username, password, email) => {
    set({ isLoading: true, authError: null })
    try {
      const data = await auth.register(username, password, email)
      set({ 
        user: data.user, 
        isAuthenticated: true, 
        isAdmin: data.user.role === 'admin',
        isLoading: false,
        authError: null
      })
    } catch (err: any) {
      const msg = err?.message || '注册失败'
      set({ isLoading: false, authError: msg })
      throw err
    }
  },
  
  logout: async () => {
    await auth.logout()
    set({ 
      user: null, 
      isAuthenticated: false, 
      isAdmin: false 
    })
  },
  
  checkAuth: async () => {
    if (!auth.isLoggedIn()) {
      set({ user: null, isAuthenticated: false, isAdmin: false })
      return
    }
    
    set({ isLoading: true })
    try {
      const user = await auth.fetchCurrentUser()
      if (user) {
        set({ 
          user, 
          isAuthenticated: true, 
          isAdmin: user.role === 'admin',
          isLoading: false 
        })
      } else {
        set({ 
          user: null, 
          isAuthenticated: false, 
          isAdmin: false, 
          isLoading: false 
        })
      }
    } catch {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isAdmin: false, 
        isLoading: false 
      })
    }
  },
  
  fetchUser: async () => {
    try {
      const user = await auth.fetchCurrentUser()
      if (user) {
        set({ 
          user, 
          isAdmin: user.role === 'admin' 
        })
      }
    } catch {}
  },
}))
