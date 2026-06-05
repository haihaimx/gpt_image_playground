// 前端 API 客户端 - 用于与后端通信

import { getAccessToken, getRefreshToken, setTokens, clearTokens, clearUser } from './auth'

const API_BASE = '/api'

// 通用请求方法
async function request(url: string, options: RequestInit = {}): Promise<any> {
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
  
  // Token 过期，尝试刷新
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
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }))
    throw new Error(error.error || `HTTP ${response.status}`)
  }
  
  return response.json()
}

// 刷新 Token
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
  
  clearTokens()
  clearUser()
  return false
}

// ===== 模型 API =====

export async function fetchModels() {
  const data = await request('/models')
  return data.models
}

// ===== 任务 API =====

export async function createTask(params: {
  model_id: string
  prompt: string
  params?: any
  input_image_ids?: number[]
  mask_image_id?: number
}) {
  return request('/tasks', {
    method: 'POST',
    body: JSON.stringify(params),
  })
}

export async function fetchTasks(page = 1, pageSize = 20, status?: string) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (status) params.set('status', status)
  return request(`/tasks?${params}`)
}

export async function fetchTask(id: number) {
  return request(`/tasks/${id}`)
}

export async function fetchTaskStatus(id: number) {
  return request(`/tasks/${id}/status`)
}

export async function deleteTask(id: number) {
  return request(`/tasks/${id}`, { method: 'DELETE' })
}

export async function toggleFavoriteTask(id: number, isFavorite: boolean) {
  return request(`/tasks/${id}/favorite`, {
    method: 'PUT',
    body: JSON.stringify({ is_favorite: isFavorite }),
  })
}

// ===== 图片 API =====

export async function uploadImage(image: string, filename?: string, mimeType?: string) {
  return request('/images/upload', {
    method: 'POST',
    body: JSON.stringify({ image, filename, mime_type: mimeType }),
  })
}

export async function fetchImages(page = 1, pageSize = 50, source?: string, taskId?: number) {
  const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) })
  if (source) params.set('source', source)
  if (taskId) params.set('taskId', String(taskId))
  return request(`/images?${params}`)
}

export async function fetchImage(id: number) {
  return request(`/images/${id}`)
}

export async function deleteImage(id: number) {
  return request(`/images/${id}`, { method: 'DELETE' })
}

// ===== 用户 API =====

export async function fetchUserProfile() {
  return request('/user/profile')
}

export async function fetchUsageStats() {
  return request('/user/usage')
}

// ===== 管理员 API =====

export async function adminFetchUsers(params: any) {
  const query = new URLSearchParams(params)
  return request(`/admin/users?${query}`)
}

export async function adminBanUser(id: number, reason?: string) {
  return request(`/admin/users/${id}/ban`, {
    method: 'PUT',
    body: JSON.stringify({ reason }),
  })
}

export async function adminUnbanUser(id: number) {
  return request(`/admin/users/${id}/unban`, { method: 'PUT' })
}

export async function adminDeleteUser(id: number) {
  return request(`/admin/users/${id}`, { method: 'DELETE' })
}

export async function adminResetPassword(id: number, newPassword: string) {
  return request(`/admin/users/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ newPassword }),
  })
}

export async function adminUpdateUserLimit(id: number, limits: any) {
  return request(`/admin/users/${id}/limit`, {
    method: 'PUT',
    body: JSON.stringify(limits),
  })
}

export async function adminFetchTasks(params: any) {
  const query = new URLSearchParams(params)
  return request(`/admin/tasks?${query}`)
}

export async function adminDeleteTask(id: number) {
  return request(`/admin/tasks/${id}`, { method: 'DELETE' })
}

export async function adminFetchImages(params: any) {
  const query = new URLSearchParams(params)
  return request(`/admin/images?${query}`)
}

export async function adminDeleteImage(id: number) {
  return request(`/admin/images/${id}`, { method: 'DELETE' })
}

export async function adminFetchModels() {
  return request('/admin/models')
}

export async function adminCreateModel(data: any) {
  return request('/admin/models', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function adminUpdateModel(id: number, data: any) {
  return request(`/admin/models/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function adminDeleteModel(id: number) {
  return request(`/admin/models/${id}`, { method: 'DELETE' })
}

export async function adminFetchProviders() {
  return request('/admin/providers')
}

export async function adminCreateProvider(data: any) {
  return request('/admin/providers', {
    method: 'POST',
    body: JSON.stringify(data),
  })
}

export async function adminUpdateProvider(id: number, data: any) {
  return request(`/admin/providers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export async function adminDeleteProvider(id: number) {
  return request(`/admin/providers/${id}`, { method: 'DELETE' })
}

export async function adminFetchStats() {
  return request('/admin/stats/overview')
}

export async function adminFetchSettings() {
  return request('/admin/settings')
}

export async function adminUpdateSettings(key: string, value: any) {
  return request('/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({ key, value }),
  })
}

export async function adminFetchLogs(params: any) {
  const query = new URLSearchParams(params)
  return request(`/admin/settings/logs?${query}`)
}
