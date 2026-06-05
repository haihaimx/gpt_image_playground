import React, { useState } from 'react'
import { forgotPassword } from '../../lib/auth'

interface ForgotPasswordPageProps {
  onSwitchToLogin: () => void
}

export function ForgotPasswordPage({ onSwitchToLogin }: ForgotPasswordPageProps) {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    
    if (!email) {
      setError('请输入邮箱')
      return
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确')
      return
    }
    
    setIsLoading(true)
    try {
      const message = await forgotPassword(email)
      setSuccess(message)
    } catch (err: any) {
      setError(err.message || '请求失败')
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] p-4">
      <div className="w-full max-w-md">
        <div className="bg-[var(--bg-secondary)] rounded-2xl shadow-xl p-8">
          <h1 className="text-2xl font-bold text-center mb-2">找回密码</h1>
          <p className="text-center text-[var(--text-secondary)] mb-6">
            输入你的注册邮箱，我们将发送重置链接
          </p>
          
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
              <label className="block text-sm font-medium mb-1">邮箱</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2 bg-[var(--accent)] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {isLoading ? '发送中...' : '发送重置链接'}
            </button>
          </form>
          
          <div className="mt-6 pt-4 border-t border-[var(--border)] text-center text-sm">
            <button
              onClick={onSwitchToLogin}
              className="text-[var(--accent)] hover:underline"
            >
              返回登录
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
