// 认证相关工具函数

const API_BASE = '/api'

export interface User {
  id: number
  username: string
  email?: string
  nickname?: string
  avatar_url?: string
  role: 'user' | 'admin'
  daily_limit?: number
  monthly_limit?: number
  total_limit?: number
  daily_used?: number
  monthly_used?: number
  total_used?: number
  email_verified?: boolean
}

export interface AuthResponse {
  user: User
  accessToken: string
  refreshToken: string
}

// Token 管理
export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken')
}

export function getRefreshToken(): string | null {
  return localStorage.getItem('refreshToken')
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem('accessToken', accessToken)
  localStorage.setItem('refreshToken', refreshToken)
}

export function clearTokens() {
  localStorage.removeItem('accessToken')
  localStorage.removeItem('refreshToken')
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}

export function getUser(): User | null {
  const userStr = localStorage.getItem('user')
  if (userStr) {
    try {
      return JSON.parse(userStr)
    } catch {
      return null
    }
  }
  return null
}

export function setUser(user: User) {
  localStorage.setItem('user', JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem('user')
}

// API 请求封装
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAccessToken()
  
  const headers: any = {
    'Content-Type': 'application/json',
    ...options.headers,
  }
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  let response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers,
  })
  
  // 如果 token 过期，尝试刷新
  if (response.status === 401 && token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      headers['Authorization'] = `Bearer ${getAccessToken()}`
      response = await fetch(`${API_BASE}${url}`, {
        ...options,
        headers,
      })
    }
  }
  
  return response
}

// 刷新 token
async function refreshAccessToken(): Promise<boolean> {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  
  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    
    if (response.ok) {
      const data = await response.json()
      setTokens(data.accessToken, data.refreshToken)
      return true
    }
  } catch {}
  
  // 刷新失败，清除登录状态
  clearTokens()
  clearUser()
  return false
}

// 登录
export async function login(username: string, password: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '登录失败')
  }
  
  const data = await response.json()
  setTokens(data.accessToken, data.refreshToken)
  setUser(data.user)
  return data
}

// 注册
export async function register(username: string, password: string, email?: string): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, email }),
  })
  
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || '注册失败')
  }
  
  const data = await response.json()
  setTokens(data.accessToken, data.refreshToken)
  setUser(data.user)
  return data
}

// 登出
export async function logout() {
  const refreshToken = getRefreshToken()
  
  try {
    await authFetch('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    })
  } catch {}
  
  clearTokens()
  clearUser()
}

// 获取当前用户信息
export async function fetchCurrentUser(): Promise<User | null> {
  try {
    const response = await authFetch('/auth/me')
    if (response.ok) {
      const data = await response.json()
      setUser(data.user)
      return data.user
    }
  } catch {}
  
  clearTokens()
  clearUser()
  return null
}

// 忘记密码
export async function forgotPassword(email: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || '请求失败')
  }
  
  return data.message
}

// 重置密码
export async function resetPassword(token: string, newPassword: string): Promise<string> {
  const response = await fetch(`${API_BASE}/auth/reset-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword }),
  })
  
  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.error || '重置失败')
  }
  
  return data.message
}
