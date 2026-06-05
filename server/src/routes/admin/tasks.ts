import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 获取所有任务列表
router.get('/', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '20', status, userId, search } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE t.is_deleted = 0'
  const params: any[] = []
  
  if (status) {
    where += ' AND t.status = ?'
    params.push(status)
  }
  
  if (userId) {
    where += ' AND t.user_id = ?'
    params.push(userId)
  }
  
  if (search) {
    where += ' AND t.prompt LIKE ?'
    params.push(`%${search}%`)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM tasks t ${where}`, params) as any
  const total = countResult?.count || 0
  
  const tasks = all(`
    SELECT t.*, u.username, u.nickname
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    ${where}
    ORDER BY t.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  res.json({ total, page: parseInt(page as string), pageSize: limit, tasks })
})

// 获取任务详情
router.get('/:id', (req: AuthRequest, res: Response) => {
  const task = get(`
    SELECT t.*, u.username, u.nickname
    FROM tasks t
    LEFT JOIN users u ON t.user_id = u.id
    WHERE t.id = ?
  `, [req.params.id])
  
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  res.json({ task })
})

// 删除任务（软删除）
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id as string)
  
  const task = get('SELECT id, user_id, prompt FROM tasks WHERE id = ?', [taskId]) as any
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  run("UPDATE tasks SET is_deleted = 1, deleted_at = datetime('now', 'localtime') WHERE id = ?", [taskId])
  
  logAdminAction(req.user!.userId, 'delete_task', 'task', taskId, task.prompt?.substring(0, 100), req.ip)
  
  res.json({ success: true })
})

export default router
