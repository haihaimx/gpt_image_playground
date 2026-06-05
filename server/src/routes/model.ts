import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { get, all } from '../db/index.js'

const router = Router()

// 获取可用模型列表（用户端，只返回 active 的）
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const models = all(`
    SELECT m.id, m.model_id, m.display_name,
           m.supports_edit, m.supports_mask, m.supports_multi, m.supports_stream,
           m.allowed_sizes, m.allowed_qualities, m.allowed_formats,
           m.max_n, m.default_params, m.daily_limit_per_user, m.cost_per_use,
           p.name as provider_name, p.provider_type
    FROM models m
    JOIN api_providers p ON m.provider_id = p.id
    WHERE m.is_active = 1 AND p.is_active = 1
    ORDER BY m.sort_order, m.id
  `)
  
  // 解析 JSON 字段
  const parsedModels = models.map((m: any) => ({
    ...m,
    allowed_sizes: JSON.parse(m.allowed_sizes || '[]'),
    allowed_qualities: JSON.parse(m.allowed_qualities || '[]'),
    allowed_formats: JSON.parse(m.allowed_formats || '[]'),
    default_params: JSON.parse(m.default_params || '{}'),
  }))
  
  res.json({ models: parsedModels })
})

// 获取模型详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const model = get(`
    SELECT m.*, p.name as provider_name, p.provider_type, p.base_url
    FROM models m
    JOIN api_providers p ON m.provider_id = p.id
    WHERE m.id = ? AND m.is_active = 1
  `, [req.params.id]) as any
  
  if (!model) {
    return res.status(404).json({ error: '模型不存在' })
  }
  
  res.json({
    model: {
      ...model,
      allowed_sizes: JSON.parse(model.allowed_sizes || '[]'),
      allowed_qualities: JSON.parse(model.allowed_qualities || '[]'),
      allowed_formats: JSON.parse(model.allowed_formats || '[]'),
      default_params: JSON.parse(model.default_params || '{}'),
    },
  })
})

export default router
