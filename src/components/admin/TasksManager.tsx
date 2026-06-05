import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface Task {
  id: number
  user_id: number
  username?: string
  nickname?: string
  prompt: string
  model_id?: string
  status: string
  error_message?: string
  created_at: string
  finished_at?: string
  elapsed_ms?: number
}

export function TasksManager() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [userIdFilter, setUserIdFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const fetchTasks = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)
      if (userIdFilter) params.set('userId', userIdFilter)

      const res = await adminFetch(`/admin/tasks?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTasks(data.tasks)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('获取任务列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [page, statusFilter])

  const handleSearch = () => {
    setPage(1)
    fetchTasks()
  }

  const handleDelete = async (task: Task) => {
    if (!confirm(`确定要删除任务 #${task.id} 吗？`)) return

    const res = await adminFetch(`/admin/tasks/${task.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchTasks()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  const statusColors: Record<string, string> = {
    running: 'bg-blue-500/20 text-blue-400',
    done: 'bg-green-500/20 text-green-400',
    error: 'bg-red-500/20 text-red-400',
  }

  const statusLabels: Record<string, string> = {
    running: '运行中',
    done: '已完成',
    error: '失败',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">任务管理</h2>
        <div className="text-sm text-[var(--text-secondary)]">共 {total} 个任务</div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="搜索提示词..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 min-w-[200px] px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
        <input
          type="number"
          placeholder="用户ID"
          value={userIdFilter}
          onChange={(e) => setUserIdFilter(e.target.value)}
          className="w-24 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">全部状态</option>
          <option value="running">运行中</option>
          <option value="done">已完成</option>
          <option value="error">失败</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
        >
          搜索
        </button>
      </div>

      {/* 任务列表 */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : tasks.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无任务</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">用户</th>
                <th className="text-left p-2">提示词</th>
                <th className="text-left p-2">模型</th>
                <th className="text-left p-2">状态</th>
                <th className="text-left p-2">耗时</th>
                <th className="text-left p-2">创建时间</th>
                <th className="text-left p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                  <td className="p-2">{task.id}</td>
                  <td className="p-2">
                    <div className="text-xs">
                      <div>{task.username || `用户#${task.user_id}`}</div>
                      {task.nickname && <div className="text-[var(--text-secondary)]">{task.nickname}</div>}
                    </div>
                  </td>
                  <td className="p-2 max-w-[300px] truncate" title={task.prompt}>
                    {task.prompt}
                  </td>
                  <td className="p-2 text-xs">{task.model_id || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${statusColors[task.status] || ''}`}>
                      {statusLabels[task.status] || task.status}
                    </span>
                  </td>
                  <td className="p-2 text-xs">
                    {task.elapsed_ms ? `${(task.elapsed_ms / 1000).toFixed(1)}s` : '-'}
                  </td>
                  <td className="p-2 text-xs">{task.created_at?.split('.')[0]}</td>
                  <td className="p-2">
                    <div className="flex gap-1">
                      <button
                        onClick={() => setSelectedTask(task)}
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                      >
                        详情
                      </button>
                      <button
                        onClick={() => handleDelete(task)}
                        className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                      >
                        删除
                      </button>
                    </div>
                  </td>
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

      {/* 任务详情弹窗 */}
      {selectedTask && (
        <TaskDetailModal task={selectedTask} onClose={() => setSelectedTask(null)} />
      )}
    </div>
  )
}

function TaskDetailModal({ task, onClose }: { task: Task; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">任务详情 #{task.id}</h3>
          <button onClick={onClose} className="text-2xl leading-none">&times;</button>
        </div>
        <div className="space-y-3 text-sm">
          <div>
            <span className="text-[var(--text-secondary)]">用户: </span>
            {task.username || `#${task.user_id}`}
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">状态: </span>
            <span className={`px-2 py-0.5 rounded text-xs ${
              task.status === 'done' ? 'bg-green-500/20 text-green-400' :
              task.status === 'error' ? 'bg-red-500/20 text-red-400' :
              'bg-blue-500/20 text-blue-400'
            }`}>
              {task.status === 'done' ? '已完成' : task.status === 'error' ? '失败' : '运行中'}
            </span>
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">模型: </span>
            {task.model_id || '-'}
          </div>
          <div>
            <span className="text-[var(--text-secondary)]">提示词: </span>
            <div className="mt-1 p-2 bg-[var(--bg-tertiary)] rounded whitespace-pre-wrap">{task.prompt}</div>
          </div>
          {task.error_message && (
            <div>
              <span className="text-[var(--text-secondary)]">错误信息: </span>
              <div className="mt-1 p-2 bg-red-500/10 rounded text-red-400">{task.error_message}</div>
            </div>
          )}
          <div>
            <span className="text-[var(--text-secondary)]">创建时间: </span>
            {task.created_at}
          </div>
          {task.finished_at && (
            <div>
              <span className="text-[var(--text-secondary)]">完成时间: </span>
              {task.finished_at}
            </div>
          )}
          {task.elapsed_ms && (
            <div>
              <span className="text-[var(--text-secondary)]">耗时: </span>
              {(task.elapsed_ms / 1000).toFixed(1)} 秒
            </div>
          )}
        </div>
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:opacity-80"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  )
}
