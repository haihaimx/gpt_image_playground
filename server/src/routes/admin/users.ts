import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { hashPassword } from '../../utils/crypto.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

// 所有路由需要管理员权限
router.use(authMiddleware, adminMiddleware)

// 获取用户列表
router.get('/', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '20', search, status } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE 1=1'
  const params: any[] = []
  
  if (search) {
    where += ' AND (username LIKE ? OR nickname LIKE ? OR email LIKE ?)'
    params.push(`%${search}%`, `%${search}%`, `%${search}%`)
  }
  
  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM users ${where}`, params) as any
  const total = countResult?.count || 0
  
  const users = all(`
    SELECT id, username, email, nickname, avatar_url, role, status,
           daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used,
           created_at, last_login_at, banned_at, banned_reason
    FROM users ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  res.json({ total, page: parseInt(page as string), pageSize: limit, users })
})

// 获取用户详情
router.get('/:id', (req: AuthRequest, res: Response) => {
  const user = get(`
    SELECT id, username, email, nickname, avatar_url, role, status,
           daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used,
           email_verified, created_at, last_login_at, banned_at, banned_reason
    FROM users WHERE id = ?
  `, [req.params.id])
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  res.json({ user })
})

// 修改用户信息
router.put('/:id', (req: AuthRequest, res: Response) => {
  const { nickname, email, role } = req.body
  const userId = parseInt(req.params.id as string)
  
  const user = get('SELECT id, username FROM users WHERE id = ?', [userId]) as any
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  if (nickname !== undefined) {
    run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, userId])
  }
  
  if (email !== undefined) {
    const existing = get('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId])
    if (existing) {
      return res.status(400).json({ error: '邮箱已被其他用户使用' })
    }
    run('UPDATE users SET email = ? WHERE id = ?', [email, userId])
  }
  
  if (role !== undefined && ['user', 'admin'].includes(role)) {
    run('UPDATE users SET role = ? WHERE id = ?', [role, userId])
  }
  
  logAdminAction(req.user!.userId, 'update_user', 'user', userId, JSON.stringify(req.body), req.ip)
  
  res.json({ success: true })
})

// 修改使用限制
router.put('/:id/limit', (req: AuthRequest, res: Response) => {
  const { daily_limit, monthly_limit, total_limit } = req.body
  const userId = parseInt(req.params.id as string)
  
  run(`
    UPDATE users SET daily_limit = ?, monthly_limit = ?, total_limit = ?
    WHERE id = ?
  `, [daily_limit, monthly_limit, total_limit, userId])
  
  logAdminAction(req.user!.userId, 'update_user_limit', 'user', userId, 
    `daily=${daily_limit}, monthly=${monthly_limit}, total=${total_limit}`, req.ip)
  
  res.json({ success: true })
})

// 封禁用户
router.put('/:id/ban', (req: AuthRequest, res: Response) => {
  const { reason } = req.body
  const userId = parseInt(req.params.id as string)
  
  const user = get('SELECT id, username, role FROM users WHERE id = ?', [userId]) as any
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  if (user.role === 'admin') {
    return res.status(400).json({ error: '不能封禁管理员账号' })
  }
  
  run(`
    UPDATE users SET status = 'banned', banned_at = datetime('now', 'localtime'), banned_reason = ?
    WHERE id = ?
  `, [reason || null, userId])
  
  // 清除该用户的所有 refresh token
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId])
  
  logAdminAction(req.user!.userId, 'ban_user', 'user', userId, reason, req.ip)
  
  res.json({ success: true })
})

// 解封用户
router.put('/:id/unban', (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id as string)
  
  run(`
    UPDATE users SET status = 'active', banned_at = NULL, banned_reason = NULL
    WHERE id = ?
  `, [userId])
  
  logAdminAction(req.user!.userId, 'unban_user', 'user', userId, '', req.ip)
  
  res.json({ success: true })
})

// 重置密码
router.put('/:id/password', async (req: AuthRequest, res: Response) => {
  const { newPassword } = req.body
  const userId = parseInt(req.params.id as string)
  
  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 个字符' })
  }
  
  const passwordHash = await hashPassword(newPassword)
  run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId])
  
  // 清除该用户的所有 refresh token
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId])
  
  logAdminAction(req.user!.userId, 'reset_password', 'user', userId, '', req.ip)
  
  res.json({ success: true })
})

// 删除用户（软删除）
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const userId = parseInt(req.params.id as string)
  
  const user = get('SELECT id, username, role FROM users WHERE id = ?', [userId]) as any
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  if (user.role === 'admin') {
    return res.status(400).json({ error: '不能删除管理员账号' })
  }
  
  run("UPDATE users SET status = 'deleted' WHERE id = ?", [userId])
  
  // 清除该用户的所有 refresh token
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [userId])
  
  logAdminAction(req.user!.userId, 'delete_user', 'user', userId, user.username, req.ip)
  
  res.json({ success: true })
})

// 查看用户的任务
router.get('/:id/tasks', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '20' } = req.query
  const userId = parseInt(req.params.id as string)
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  const tasks = all(`
    SELECT * FROM tasks
    WHERE user_id = ? AND is_deleted = 0
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset])
  
  const countResult = get('SELECT COUNT(*) as count FROM tasks WHERE user_id = ? AND is_deleted = 0', [userId]) as any
  
  res.json({ total: countResult?.count || 0, tasks })
})

// 查看用户的图片
router.get('/:id/images', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '50' } = req.query
  const userId = parseInt(req.params.id as string)
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  const images = all(`
    SELECT * FROM images
    WHERE user_id = ? AND is_deleted = 0
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [userId, limit, offset])
  
  const countResult = get('SELECT COUNT(*) as count FROM images WHERE user_id = ? AND is_deleted = 0', [userId]) as any
  
  res.json({ total: countResult?.count || 0, images })
})

export default router
