import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 获取所有图片列表
router.get('/', (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '50', userId, source } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE i.is_deleted = 0'
  const params: any[] = []
  
  if (userId) {
    where += ' AND i.user_id = ?'
    params.push(userId)
  }
  
  if (source) {
    where += ' AND i.source = ?'
    params.push(source)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM images i ${where}`, params) as any
  const total = countResult?.count || 0
  
  const images = all(`
    SELECT i.*, u.username, u.nickname
    FROM images i
    LEFT JOIN users u ON i.user_id = u.id
    ${where}
    ORDER BY i.created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  res.json({ total, page: parseInt(page as string), pageSize: limit, images })
})

// 删除图片（软删除）
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const imageId = parseInt(req.params.id as string)
  
  const image = get('SELECT id, user_id, file_path FROM images WHERE id = ?', [imageId]) as any
  if (!image) {
    return res.status(404).json({ error: '图片不存在' })
  }
  
  run(`
    UPDATE images SET is_deleted = 1, deleted_at = datetime('now', 'localtime'), deleted_by = ?
    WHERE id = ?
  `, [req.user!.userId, imageId])
  
  logAdminAction(req.user!.userId, 'delete_image', 'image', imageId, image.file_path, req.ip)
  
  res.json({ success: true })
})

export default router
