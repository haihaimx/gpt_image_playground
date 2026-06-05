import React, { useState } from 'react'
import { useAuthStore } from '../../stores/authStore'

interface RegisterPageProps {
  onSwitchToLogin: () => void
}

export function RegisterPage({ onSwitchToLogin }: RegisterPageProps) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [validationError, setValidationError] = useState('')
  const [success, setSuccess] = useState('')
  const { register, isLoading, authError, clearAuthError } = useAuthStore()
  
  const error = authError || validationError
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    clearAuthError()
    setValidationError('')
    setSuccess('')
    
    if (!username || !password) {
      setValidationError('请输入用户名和密码')
      return
    }
    
    if (username.length < 3 || username.length > 50) {
      setValidationError('用户名长度需要 3-50 个字符')
      return
    }
    
    if (password.length < 6) {
      setValidationError('密码长度至少 6 个字符')
      return
    }
    
    if (password !== confirmPassword) {
      setValidationError('两次输入的密码不一致')
      return
    }
    
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setValidationError('邮箱格式不正确')
      return
    }
    
    try {
      await register(username, password, email || undefined)
      setSuccess('注册成功！')
    } catch {
      // authError 已经在 store 的 catch 里设置了
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-6">注册</h1>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}
          
          {success && (
            <div className="mb-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-sm">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">用户名 *</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="3-50 个字符"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">邮箱（可选，用于找回密码）</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">密码 *</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="至少 6 个字符"
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">确认密码 *</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="再次输入密码"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '注册中...' : '注册'}
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-sm">
            已有账号？{' '}
            <button
              onClick={onSwitchToLogin}
              className="text-[var(--accent)] hover:underline"
            >
              立即登录
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
