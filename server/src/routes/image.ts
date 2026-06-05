import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { get, all, run } from '../db/index.js'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.join(__dirname, '../../data/uploads/images')

// 确保上传目录存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true })
}

const router = Router()

// 获取用户的图片列表
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '50', source, taskId } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE user_id = ? AND is_deleted = 0'
  const params: any[] = [req.user!.userId]
  
  if (source) {
    where += ' AND source = ?'
    params.push(source)
  }
  
  if (taskId) {
    where += ' AND task_id = ?'
    params.push(taskId)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM images ${where}`, params) as any
  const total = countResult?.count || 0
  
  const images = all(`
    SELECT * FROM images ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  res.json({ total, page: parseInt(page as string), pageSize: limit, images })
})

// 上传图片
router.post('/upload', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // 检查上传限制
    const uploadSetting = get('SELECT value FROM system_settings WHERE key = ?', ['upload']) as any
    const uploadConfig = uploadSetting ? JSON.parse(uploadSetting.value) : { maxSizeMb: 50 }
    
    // 从请求体获取 base64 图片数据
    const { image, filename, mime_type } = req.body
    
    if (!image) {
      return res.status(400).json({ error: '缺少图片数据' })
    }
    
    // 解码 base64
    const base64Data = image.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64Data, 'base64')
    
    // 检查大小
    if (buffer.length > uploadConfig.maxSizeMb * 1024 * 1024) {
      return res.status(400).json({ error: `图片大小不能超过 ${uploadConfig.maxSizeMb}MB` })
    }
    
    // 计算哈希
    const hash = crypto.createHash('sha256').update(buffer).digest('hex')
    
    // 检查是否已存在
    const existing = get('SELECT id FROM images WHERE image_hash = ? AND user_id = ? AND is_deleted = 0', [hash, req.user!.userId]) as any
    if (existing) {
      return res.json({ id: existing.id, message: '图片已存在' })
    }
    
    // 保存文件
    const ext = (filename?.split('.').pop() || 'png').toLowerCase()
    const savedFilename = `${hash.substring(0, 16)}.${ext}`
    const filePath = path.join(UPLOAD_DIR, savedFilename)
    
    fs.writeFileSync(filePath, buffer)
    
    // 保存到数据库
    const relativePath = `data/uploads/images/${savedFilename}`
    const result = run(`
      INSERT INTO images (user_id, image_hash, file_path, file_size, mime_type, source)
      VALUES (?, ?, ?, ?, ?, 'upload')
    `, [req.user!.userId, hash, relativePath, buffer.length, mime_type || `image/${ext}`])
    
    res.json({
      id: result.lastInsertRowid,
      file_path: relativePath,
      image_hash: hash,
    })
  } catch (err: any) {
    console.error('上传图片失败:', err)
    res.status(500).json({ error: '上传图片失败' })
  }
})

// 删除图片（软删除）
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const imageId = parseInt(req.params.id as string)
  
  const image = get('SELECT id, user_id FROM images WHERE id = ? AND user_id = ?', [imageId, req.user!.userId]) as any
  if (!image) {
    return res.status(404).json({ error: '图片不存在' })
  }
  
  run("UPDATE images SET is_deleted = 1, deleted_at = datetime('now', 'localtime') WHERE id = ?", [imageId])
  
  res.json({ success: true })
})

// 获取单张图片详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const image = get('SELECT * FROM images WHERE id = ? AND user_id = ? AND is_deleted = 0', [req.params.id, req.user!.userId]) as any
  
  if (!image) {
    return res.status(404).json({ error: '图片不存在' })
  }
  
  res.json({ image })
})

export default router
