import { useState, useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'
import { authFetch } from '../../lib/auth'
import { UsersManager } from './UsersManager'
import { TasksManager } from './TasksManager'
import { ImagesManager } from './ImagesManager'
import { ModelsManager } from './ModelsManager'
import { ProvidersManager } from './ProvidersManager'
import { SettingsManager } from './SettingsManager'
import { AdminLogs } from './AdminLogs'

// 管理端通用请求：自动处理 401
export async function adminFetch(url: string, options?: RequestInit) {
  const res = await authFetch(url, options)
  if (res.status === 401) {
    useAuthStore.getState().logout()
    throw new Error('登录已过期，请重新登录')
  }
  return res
}

interface AdminPanelProps {
  onBack: () => void
}

type AdminTab = 'overview' | 'users' | 'tasks' | 'images' | 'models' | 'providers' | 'settings' | 'logs'

export function AdminPanel({ onBack }: AdminPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview')
  const { user } = useAuthStore()
  
  const tabs: { key: AdminTab; label: string }[] = [
    { key: 'overview', label: '总览' },
    { key: 'users', label: '用户管理' },
    { key: 'tasks', label: '任务管理' },
    { key: 'images', label: '图片管理' },
    { key: 'models', label: '模型配置' },
    { key: 'providers', label: '服务商管理' },
    { key: 'settings', label: '系统设置' },
    { key: 'logs', label: '操作日志' },
  ]
  
  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      <div className="max-w-7xl mx-auto p-4">
        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-2 bg-[var(--bg-secondary)] rounded-lg hover:opacity-80 transition-opacity"
            >
              返回
            </button>
            <h1 className="text-2xl font-bold">管理后台</h1>
          </div>
          <div className="text-sm text-[var(--text-secondary)]">
            管理员: {user?.nickname || user?.username}
          </div>
        </div>
        
        {/* 标签页 */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--accent)] text-white'
                  : 'bg-[var(--bg-secondary)] hover:opacity-80'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* 内容区域 */}
        <div className="bg-[var(--bg-secondary)] rounded-xl p-6">
          {activeTab === 'overview' && <OverviewTab />}
          {activeTab === 'users' && <UsersManager />}
          {activeTab === 'tasks' && <TasksManager />}
          {activeTab === 'images' && <ImagesManager />}
          {activeTab === 'models' && <ModelsManager />}
          {activeTab === 'providers' && <ProvidersManager />}
          {activeTab === 'settings' && <SettingsManager />}
          {activeTab === 'logs' && <AdminLogs />}
        </div>
      </div>
    </div>
  )
}

function OverviewTab() {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    fetchStats()
  }, [])
  
  async function fetchStats() {
    try {
      const res = await adminFetch('/admin/stats/overview')
      if (res.ok) {
        const data = await res.json()
        setStats(data)
      }
    } catch (err) {
      console.error('获取统计失败:', err)
    } finally {
      setLoading(false)
    }
  }
  
  if (loading) {
    return <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
  }
  
  if (!stats) {
    return <div className="text-center py-8 text-red-400">获取统计数据失败</div>
  }
  
  return (
    <div>
      <h2 className="text-lg font-semibold mb-4">系统概览</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="总用户" value={stats.users?.total || 0} subtitle={`今日新增 ${stats.users?.newToday || 0}`} />
        <StatCard title="活跃用户" value={stats.users?.active || 0} />
        <StatCard title="总任务" value={stats.tasks?.total || 0} subtitle={`今日 ${stats.tasks?.today || 0}`} />
        <StatCard title="运行中" value={stats.tasks?.running || 0} />
        <StatCard title="总图片" value={stats.images?.total || 0} subtitle={`今日 ${stats.images?.today || 0}`} />
        <StatCard title="存储使用" value={`${stats.storage?.usedMb || 0} MB`} />
        <StatCard title="封禁用户" value={stats.users?.banned || 0} />
        <StatCard title="失败任务" value={stats.tasks?.error || 0} />
      </div>
    </div>
  )
}

function StatCard({ title, value, subtitle }: { title: string; value: number | string; subtitle?: string }) {
  return (
    <div className="bg-[var(--bg-tertiary)] rounded-lg p-4">
      <div className="text-sm text-[var(--text-secondary)]">{title}</div>
      <div className="text-2xl font-bold mt-1">{value}</div>
      {subtitle && <div className="text-xs text-[var(--text-secondary)] mt-1">{subtitle}</div>}
    </div>
  )
}
