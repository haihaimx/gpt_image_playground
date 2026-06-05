import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest } from '../../middleware/auth.js'
import { get, all } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 总览统计
router.get('/overview', (req: AuthRequest, res: Response) => {
  const today = new Date().toISOString().split('T')[0]
  
  // 用户统计
  const totalUsers = get('SELECT COUNT(*) as count FROM users WHERE status != "deleted"') as any
  const activeUsers = get('SELECT COUNT(*) as count FROM users WHERE status = "active"') as any
  const bannedUsers = get('SELECT COUNT(*) as count FROM users WHERE status = "banned"') as any
  const newUsersToday = get('SELECT COUNT(*) as count FROM users WHERE date(created_at) = ?', [today]) as any
  
  // 任务统计
  const totalTasks = get('SELECT COUNT(*) as count FROM tasks WHERE is_deleted = 0') as any
  const todayTasks = get('SELECT COUNT(*) as count FROM tasks WHERE date(created_at) = ? AND is_deleted = 0', [today]) as any
  const runningTasks = get('SELECT COUNT(*) as count FROM tasks WHERE status = "running" AND is_deleted = 0') as any
  const errorTasks = get('SELECT COUNT(*) as count FROM tasks WHERE status = "error" AND is_deleted = 0') as any
  
  // 图片统计
  const totalImages = get('SELECT COUNT(*) as count FROM images WHERE is_deleted = 0') as any
  const todayImages = get('SELECT COUNT(*) as count FROM images WHERE date(created_at) = ? AND is_deleted = 0', [today]) as any
  
  // 存储统计
  const storageUsed = get('SELECT COALESCE(SUM(file_size), 0) as total FROM images WHERE is_deleted = 0') as any
  
  res.json({
    users: {
      total: totalUsers?.count || 0,
      active: activeUsers?.count || 0,
      banned: bannedUsers?.count || 0,
      newToday: newUsersToday?.count || 0,
    },
    tasks: {
      total: totalTasks?.count || 0,
      today: todayTasks?.count || 0,
      running: runningTasks?.count || 0,
      error: errorTasks?.count || 0,
    },
    images: {
      total: totalImages?.count || 0,
      today: todayImages?.count || 0,
    },
    storage: {
      usedBytes: storageUsed?.total || 0,
      usedMb: Math.round((storageUsed?.total || 0) / 1024 / 1024 * 100) / 100,
    },
  })
})

// 使用趋势（最近7天）
router.get('/usage', (req: AuthRequest, res: Response) => {
  const { days = '7' } = req.query
  const numDays = parseInt(days as string)
  
  const trend = all(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM tasks
    WHERE is_deleted = 0 AND created_at >= datetime('now', 'localtime', '-${numDays} days')
    GROUP BY date(created_at)
    ORDER BY date
  `)
  
  const userTrend = all(`
    SELECT date(created_at) as date, COUNT(*) as count
    FROM users
    WHERE created_at >= datetime('now', 'localtime', '-${numDays} days')
    GROUP BY date(created_at)
    ORDER BY date
  `)
  
  res.json({ taskTrend: trend, userTrend: userTrend })
})

// 各模型使用占比
router.get('/models', (req: AuthRequest, res: Response) => {
  const modelStats = all(`
    SELECT model_id, COUNT(*) as count
    FROM tasks
    WHERE is_deleted = 0 AND model_id IS NOT NULL
    GROUP BY model_id
    ORDER BY count DESC
    LIMIT 10
  `)
  
  res.json({ models: modelStats })
})

export default router
