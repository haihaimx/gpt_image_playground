import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { get, all } from '../db/index.js'

const router = Router()

// 获取个人信息
router.get('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = get(`
    SELECT id, username, email, nickname, avatar_url, role,
           daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used,
           email_verified, created_at, last_login_at
    FROM users WHERE id = ?
  `, [req.user!.userId])
  
  res.json({ user })
})

// 更新个人信息
router.put('/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  const { nickname } = req.body
  const { run } = require('../db/index.js')
  
  if (nickname !== undefined) {
    if (nickname.length > 100) {
      return res.status(400).json({ error: '昵称长度不能超过 100 个字符' })
    }
    run('UPDATE users SET nickname = ? WHERE id = ?', [nickname, req.user!.userId])
  }
  
  const user = get(`
    SELECT id, username, email, nickname, avatar_url, role,
           daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used,
           email_verified, created_at, last_login_at
    FROM users WHERE id = ?
  `, [req.user!.userId])
  
  res.json({ user })
})

// 获取使用统计
router.get('/usage', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = get(`
    SELECT daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used, limit_reset_date
    FROM users WHERE id = ?
  `, [req.user!.userId]) as any
  
  const today = new Date().toISOString().split('T')[0]
  const todayLogs = get(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE user_id = ? AND date(created_at) = ?
  `, [req.user!.userId, today]) as any
  
  const thisMonth = today.substring(0, 7)
  const monthLogs = get(`
    SELECT COUNT(*) as count FROM usage_logs
    WHERE user_id = ? AND strftime('%Y-%m', created_at) = ?
  `, [req.user!.userId, thisMonth]) as any
  
  res.json({
    daily: { used: todayLogs?.count || 0, limit: user?.daily_limit },
    monthly: { used: monthLogs?.count || 0, limit: user?.monthly_limit },
    total: { used: user?.total_used || 0, limit: user?.total_limit },
  })
})

export default router
