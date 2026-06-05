import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 获取所有系统设置
router.get('/', (req: AuthRequest, res: Response) => {
  const settings = all('SELECT * FROM system_settings')
  
  const settingsMap: any = {}
  for (const s of settings) {
    try {
      settingsMap[(s as any).key] = JSON.parse((s as any).value)
    } catch {
      settingsMap[(s as any).key] = (s as any).value
    }
  }
  
  res.json({ settings: settingsMap })
})

// 更新系统设置
router.put('/', (req: AuthRequest, res: Response) => {
  const { key, value } = req.body
  
  if (!key) {
    return res.status(400).json({ error: '缺少设置项 key' })
  }
  
  const valueStr = typeof value === 'object' ? JSON.stringify(value) : String(value)
  
  run(`
    INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, datetime('now', 'localtime'))
    ON CONFLICT(key) DO UPDATE SET value = ?, updated_at = datetime('now', 'localtime')
  `, [key, valueStr, valueStr])
  
  logAdminAction(req.user!.userId, 'update_setting', 'setting', undefined, key, req.ip)
  
  res.json({ success: true })
})

// 获取管理员操作日志
router.get('/logs', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '50', adminId } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE 1=1'
  const params: any[] = []
  
  if (adminId) {
    where += ' AND al.admin_id = ?'
    params.push(adminId)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM admin_logs al ${where}`, params) as any
  const total = countResult?.count || 0
  
  const logs = all(`
    SELECT al.*, u.username as admin_username
    FROM admin_logs al
    LEFT JOIN users u ON al.admin_id = u.id
    ${where}
    ORDER BY al.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  res.json({ total, logs })
})

export default router
