import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface AdminLog {
  id: number
  admin_id: number
  admin_username?: string
  action: string
  target_type?: string
  target_id?: number
  detail?: string
  ip_address?: string
  created_at: string
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(50)
  const [loading, setLoading] = useState(true)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })

      const res = await adminFetch(`/admin/settings/logs?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLogs(data.logs)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('获取日志失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page])

  const totalPages = Math.ceil(total / pageSize)

  const actionLabels: Record<string, string> = {
    update_user: '更新用户',
    update_user_limit: '更新用户限额',
    ban_user: '封禁用户',
    unban_user: '解封用户',
    reset_password: '重置密码',
    delete_user: '删除用户',
    delete_task: '删除任务',
    delete_image: '删除图片',
    add_model: '添加模型',
    update_model: '更新模型',
    delete_model: '删除模型',
    add_provider: '添加服务商',
    update_provider: '更新服务商',
    delete_provider: '删除服务商',
    update_setting: '更新设置',
  }

  const actionColors: Record<string, string> = {
    ban_user: 'text-red-400',
    unban_user: 'text-green-400',
    delete_user: 'text-red-400',
    delete_task: 'text-orange-400',
    delete_image: 'text-orange-400',
    reset_password: 'text-yellow-400',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">操作日志</h2>
        <div className="text-sm text-[var(--text-secondary)]">共 {total} 条记录</div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : logs.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无操作日志</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2">时间</th>
                <th className="text-left p-2">管理员</th>
                <th className="text-left p-2">操作</th>
                <th className="text-left p-2">目标</th>
                <th className="text-left p-2">详情</th>
                <th className="text-left p-2">IP</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                  <td className="p-2 text-xs whitespace-nowrap">{log.created_at}</td>
                  <td className="p-2">{log.admin_username || `#${log.admin_id}`}</td>
                  <td className={`p-2 ${actionColors[log.action] || ''}`}>
                    {actionLabels[log.action] || log.action}
                  </td>
                  <td className="p-2 text-xs">
                    {log.target_type && (
                      <span>
                        {log.target_type}
                        {log.target_id ? ` #${log.target_id}` : ''}
                      </span>
                    )}
                  </td>
                  <td className="p-2 text-xs max-w-[200px] truncate" title={log.detail}>
                    {log.detail || '-'}
                  </td>
                  <td className="p-2 text-xs">{log.ip_address || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 分页 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            上一页
          </button>
          <span className="text-sm text-[var(--text-secondary)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="px-3 py-1 rounded bg-[var(--bg-tertiary)] disabled:opacity-50"
          >
            下一页
          </button>
        </div>
      )}
    </div>
  )
}
