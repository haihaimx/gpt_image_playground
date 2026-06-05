import { Request, Response, NextFunction } from 'express'
import { verifyAccessToken, type JwtPayload } from '../utils/jwt.js'
import { get, run } from '../db/index.js'

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '')
  
  if (!token) {
    return res.status(401).json({ error: '未登录' })
  }
  
  try {
    const payload = verifyAccessToken(token)
    
    // 检查用户状态
    const user = get('SELECT id, username, role, status FROM users WHERE id = ?', [payload.userId]) as any
    
    if (!user) {
      return res.status(401).json({ error: '用户不存在' })
    }
    
    if (user.status !== 'active') {
      return res.status(403).json({ error: '账户已被禁用' })
    }
    
    req.user = {
      userId: user.id,
      username: user.username,
      role: user.role,
    }
    
    next()
  } catch (err) {
    return res.status(401).json({ error: 'Token 已过期，请重新登录' })
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: '无权限访问，需要管理员权限' })
  }
  next()
}

export function logAdminAction(adminId: number, action: string, targetType?: string, targetId?: number, detail?: string, ip?: string) {
  run(`
    INSERT INTO admin_logs (admin_id, action, target_type, target_id, detail, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [adminId, action, targetType || null, targetId || null, detail || null, ip || null])
}
