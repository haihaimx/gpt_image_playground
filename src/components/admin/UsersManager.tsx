import { useState, useEffect } from 'react'
import { adminFetch } from './AdminPanel'

interface User {
  id: number
  username: string
  email?: string
  nickname?: string
  avatar_url?: string
  role: string
  status: string
  daily_limit: number
  monthly_limit: number
  total_limit: number
  daily_used: number
  monthly_used: number
  total_used: number
  created_at: string
  last_login_at?: string
  banned_at?: string
  banned_reason?: string
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pageSize] = useState(20)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showLimitModal, setShowLimitModal] = useState<User | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const res = await adminFetch(`/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setTotal(data.total)
      }
    } catch (err) {
      console.error('获取用户列表失败:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [page, statusFilter])

  const handleSearch = () => {
    setPage(1)
    fetchUsers()
  }

  const handleBan = async (user: User) => {
    const reason = prompt('封禁原因（可选）:')
    if (reason === null) return

    const res = await adminFetch(`/admin/users/${user.id}/ban`, {
      method: 'PUT',
      body: JSON.stringify({ reason }),
    })
    if (res.ok) {
      fetchUsers()
    } else {
      const data = await res.json()
      alert(data.error || '封禁失败')
    }
  }

  const handleUnban = async (user: User) => {
    const res = await adminFetch(`/admin/users/${user.id}/unban`, { method: 'PUT' })
    if (res.ok) fetchUsers()
  }

  const handleDelete = async (user: User) => {
    if (!confirm(`确定要删除用户 ${user.username} 吗？`)) return

    const res = await adminFetch(`/admin/users/${user.id}`, { method: 'DELETE' })
    if (res.ok) {
      fetchUsers()
    } else {
      const data = await res.json()
      alert(data.error || '删除失败')
    }
  }

  const handleResetPassword = async (user: User) => {
    const newPassword = prompt(`为用户 ${user.username} 设置新密码（至少6位）:`)
    if (!newPassword) return
    if (newPassword.length < 6) {
      alert('密码长度至少6位')
      return
    }

    const res = await adminFetch(`/admin/users/${user.id}/password`, {
      method: 'PUT',
      body: JSON.stringify({ newPassword }),
    })
    if (res.ok) {
      alert('密码已重置')
    } else {
      const data = await res.json()
      alert(data.error || '重置失败')
    }
  }

  const handleSaveLimits = async (limits: { daily_limit: number; monthly_limit: number; total_limit: number }) => {
    if (!showLimitModal) return

    const res = await adminFetch(`/admin/users/${showLimitModal.id}/limit`, {
      method: 'PUT',
      body: JSON.stringify(limits),
    })
    if (res.ok) {
      setShowLimitModal(null)
      fetchUsers()
    } else {
      const data = await res.json()
      alert(data.error || '保存失败')
    }
  }

  const handleUpdateUser = async (updates: Partial<User>) => {
    if (!editingUser) return

    const res = await adminFetch(`/admin/users/${editingUser.id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
    if (res.ok) {
      setEditingUser(null)
      fetchUsers()
    } else {
      const data = await res.json()
      alert(data.error || '更新失败')
    }
  }

  const totalPages = Math.ceil(total / pageSize)

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">用户管理</h2>
        <div className="text-sm text-[var(--text-secondary)]">共 {total} 个用户</div>
      </div>

      {/* 搜索和筛选 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="搜索用户名/邮箱/昵称..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        />
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
        >
          <option value="">全部状态</option>
          <option value="active">正常</option>
          <option value="banned">已封禁</option>
        </select>
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
        >
          搜索
        </button>
      </div>

      {/* 用户列表 */}
      {loading ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">加载中...</div>
      ) : users.length === 0 ? (
        <div className="text-center py-8 text-[var(--text-secondary)]">暂无用户</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="text-left p-2">ID</th>
                <th className="text-left p-2">用户名</th>
                <th className="text-left p-2">昵称</th>
                <th className="text-left p-2">邮箱</th>
                <th className="text-left p-2">角色</th>
                <th className="text-left p-2">状态</th>
                <th className="text-left p-2">使用量</th>
                <th className="text-left p-2">注册时间</th>
                <th className="text-left p-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--bg-tertiary)]">
                  <td className="p-2">{user.id}</td>
                  <td className="p-2 font-medium">{user.username}</td>
                  <td className="p-2">{user.nickname || '-'}</td>
                  <td className="p-2">{user.email || '-'}</td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.role === 'admin' ? '管理员' : '用户'}
                    </span>
                  </td>
                  <td className="p-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      user.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {user.status === 'active' ? '正常' : '已封禁'}
                    </span>
                  </td>
                  <td className="p-2">
                    <div className="text-xs">
                      <div>日: {user.daily_used}/{user.daily_limit === -1 ? '∞' : user.daily_limit}</div>
                      <div>月: {user.monthly_used}/{user.monthly_limit === -1 ? '∞' : user.monthly_limit}</div>
                    </div>
                  </td>
                  <td className="p-2 text-xs">{user.created_at?.split(' ')[0]}</td>
                  <td className="p-2">
                    <div className="flex gap-1 flex-wrap">
                      <button
                        onClick={() => setEditingUser(user)}
                        className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setShowLimitModal(user)}
                        className="px-2 py-1 text-xs bg-yellow-500/20 text-yellow-400 rounded hover:bg-yellow-500/30"
                      >
                        限额
                      </button>
                      <button
                        onClick={() => handleResetPassword(user)}
                        className="px-2 py-1 text-xs bg-orange-500/20 text-orange-400 rounded hover:bg-orange-500/30"
                      >
                        改密
                      </button>
                      {user.status === 'active' ? (
                        <button
                          onClick={() => handleBan(user)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                        >
                          封禁
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnban(user)}
                          className="px-2 py-1 text-xs bg-green-500/20 text-green-400 rounded hover:bg-green-500/30"
                        >
                          解封
                        </button>
                      )}
                      {user.role !== 'admin' && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                        >
                          删除
                        </button>
                      )}
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

      {/* 编辑用户弹窗 */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onSave={handleUpdateUser}
          onClose={() => setEditingUser(null)}
        />
      )}

      {/* 限额设置弹窗 */}
      {showLimitModal && (
        <LimitModal
          user={showLimitModal}
          onSave={handleSaveLimits}
          onClose={() => setShowLimitModal(null)}
        />
      )}
    </div>
  )
}

function EditUserModal({ user, onSave, onClose }: { user: User; onSave: (updates: Partial<User>) => void; onClose: () => void }) {
  const [nickname, setNickname] = useState(user.nickname || '')
  const [email, setEmail] = useState(user.email || '')
  const [role, setRole] = useState(user.role)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">编辑用户: {user.username}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">邮箱</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">角色</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            >
              <option value="user">用户</option>
              <option value="admin">管理员</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:opacity-80"
          >
            取消
          </button>
          <button
            onClick={() => onSave({ nickname, email, role })}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

function LimitModal({ user, onSave, onClose }: { user: User; onSave: (limits: { daily_limit: number; monthly_limit: number; total_limit: number }) => void; onClose: () => void }) {
  const [dailyLimit, setDailyLimit] = useState(user.daily_limit)
  const [monthlyLimit, setMonthlyLimit] = useState(user.monthly_limit)
  const [totalLimit, setTotalLimit] = useState(user.total_limit)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-[var(--bg-secondary)] rounded-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-semibold mb-4">设置使用限额: {user.username}</h3>
        <p className="text-xs text-[var(--text-secondary)] mb-4">设置为 -1 表示不限制</p>
        <div className="space-y-3">
          <div>
            <label className="block text-sm mb-1">每日限额</label>
            <input
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">每月限额</label>
            <input
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">总限额</label>
            <input
              type="number"
              value={totalLimit}
              onChange={(e) => setTotalLimit(Number(e.target.value))}
              className="w-full px-3 py-2 bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-lg text-sm"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-[var(--bg-tertiary)] rounded-lg text-sm hover:opacity-80"
          >
            取消
          </button>
          <button
            onClick={() => onSave({ daily_limit: dailyLimit, monthly_limit: monthlyLimit, total_limit: totalLimit })}
            className="px-4 py-2 bg-[var(--accent)] text-white rounded-lg text-sm hover:opacity-90"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  )
}
