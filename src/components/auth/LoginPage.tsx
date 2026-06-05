import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface LoginPageProps {
  onSwitchToRegister: () => void
  onSwitchToForgotPassword: () => void
}

export function LoginPage({ onSwitchToRegister, onSwitchToForgotPassword }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const { login, isLoading, authError, clearAuthError } = useAuthStore()
  
  const error = authError || validationError
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setValidationError('')
    
    if (!username || !password) {
      setValidationError('请输入用户名和密码')
      return
    }
    
    try {
      await login(username, password)
    } catch {
      // authError 已经在 store 的 catch 里设置了
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">登录</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="输入用户名"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="输入密码"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '登录中...' : '登录'}
            </button>
          </form>
          
          <div className="mt-4 text-center text-sm">
            <button
              onClick={onSwitchToForgotPassword}
              className="text-[var(--accent)] hover:underline"
            >
              忘记密码？
            </button>
          </div>
          
          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-sm">
            还没有账号？{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-[var(--accent)] hover:underline"
            >
              立即注册
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
