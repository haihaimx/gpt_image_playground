import { Response, NextFunction } from 'express'
import { AuthRequest } from './auth.js'
import { get, run } from '../db/index.js'

export function checkUsageLimit(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.user!.userId
  
  const user = get(`
    SELECT daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used, limit_reset_date
    FROM users WHERE id = ?
  `, [userId]) as any
  
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  
  const today = new Date().toISOString().split('T')[0]
  const thisMonth = today.substring(0, 7)
  
  // 重置每日计数
  if (user.limit_reset_date !== today) {
    const monthlyReset = user.limit_reset_date < thisMonth
    run(`
      UPDATE users SET 
        daily_used = 0, 
        monthly_used = CASE WHEN ? THEN 0 ELSE monthly_used END,
        limit_reset_date = ?
      WHERE id = ?
    `, [monthlyReset, today, userId])
    user.daily_used = 0
    if (monthlyReset) {
      user.monthly_used = 0
    }
  }
  
  // 检查限制 (-1 表示不限制)
  if (user.daily_limit > 0 && user.daily_used >= user.daily_limit) {
    return res.status(429).json({ error: '今日使用次数已用完，明天再来吧' })
  }
  
  if (user.monthly_limit > 0 && user.monthly_used >= user.monthly_limit) {
    return res.status(429).json({ error: '本月使用次数已用完' })
  }
  
  if (user.total_limit > 0 && user.total_used >= user.total_limit) {
    return res.status(429).json({ error: '总使用次数已用完' })
  }
  
  next()
}
