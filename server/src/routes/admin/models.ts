import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 获取所有模型（含 inactive）
router.get('/', (req: AuthRequest, res: Response) => {
  const models = all(`
    SELECT m.*, p.name as provider_name, p.provider_type
    FROM models m
    JOIN api_providers p ON m.provider_id = p.id
    ORDER BY m.sort_order, m.id
  `)
  
  const parsedModels = models.map((m: any) => ({
    ...m,
    allowed_sizes: JSON.parse(m.allowed_sizes || '[]'),
    allowed_qualities: JSON.parse(m.allowed_qualities || '[]'),
    allowed_formats: JSON.parse(m.allowed_formats || '[]'),
    default_params: JSON.parse(m.default_params || '{}'),
  }))
  
  res.json({ models: parsedModels })
})

// 添加模型
router.post('/', (req: AuthRequest, res: Response) => {
  const {
    provider_id, model_id, display_name, is_active,
    supports_edit, supports_mask, supports_multi, supports_stream,
    allowed_sizes, allowed_qualities, allowed_formats,
    max_n, default_params, daily_limit_per_user, cost_per_use, sort_order
  } = req.body
  
  if (!provider_id || !model_id || !display_name) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  
  // 检查服务商是否存在
  const provider = get('SELECT id FROM api_providers WHERE id = ?', [provider_id])
  if (!provider) {
    return res.status(400).json({ error: '服务商不存在' })
  }
  
  const result = run(`
    INSERT INTO models (
      provider_id, model_id, display_name, is_active,
      supports_edit, supports_mask, supports_multi, supports_stream,
      allowed_sizes, allowed_qualities, allowed_formats,
      max_n, default_params, daily_limit_per_user, cost_per_use, sort_order
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    provider_id, model_id, display_name, is_active !== undefined ? is_active : 1,
    supports_edit !== undefined ? supports_edit : 1,
    supports_mask !== undefined ? supports_mask : 1,
    supports_multi !== undefined ? supports_multi : 1,
    supports_stream !== undefined ? supports_stream : 0,
    JSON.stringify(allowed_sizes || ['auto', '1024x1024', '1024x1536', '1536x1024', '512x512']),
    JSON.stringify(allowed_qualities || ['auto', 'low', 'medium', 'high']),
    JSON.stringify(allowed_formats || ['png', 'jpeg', 'webp']),
    max_n || 1,
    JSON.stringify(default_params || { size: 'auto', quality: 'auto', output_format: 'png' }),
    daily_limit_per_user !== undefined ? daily_limit_per_user : -1,
    cost_per_use || 1,
    sort_order || 0,
  ])
  
  logAdminAction(req.user!.userId, 'add_model', 'model', result.lastInsertRowid, model_id, req.ip)
  
  res.json({ id: result.lastInsertRowid, success: true })
})

// 修改模型
router.put('/:id', (req: AuthRequest, res: Response) => {
  const modelId = parseInt(req.params.id as string)
  const {
    display_name, is_active,
    supports_edit, supports_mask, supports_multi, supports_stream,
    allowed_sizes, allowed_qualities, allowed_formats,
    max_n, default_params, daily_limit_per_user, cost_per_use, sort_order
  } = req.body
  
  const model = get('SELECT id, model_id FROM models WHERE id = ?', [modelId]) as any
  if (!model) {
    return res.status(404).json({ error: '模型不存在' })
  }
  
  const updates: string[] = []
  const params: any[] = []
  
  if (display_name !== undefined) { updates.push('display_name = ?'); params.push(display_name) }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active) }
  if (supports_edit !== undefined) { updates.push('supports_edit = ?'); params.push(supports_edit) }
  if (supports_mask !== undefined) { updates.push('supports_mask = ?'); params.push(supports_mask) }
  if (supports_multi !== undefined) { updates.push('supports_multi = ?'); params.push(supports_multi) }
  if (supports_stream !== undefined) { updates.push('supports_stream = ?'); params.push(supports_stream) }
  if (allowed_sizes !== undefined) { updates.push('allowed_sizes = ?'); params.push(JSON.stringify(allowed_sizes)) }
  if (allowed_qualities !== undefined) { updates.push('allowed_qualities = ?'); params.push(JSON.stringify(allowed_qualities)) }
  if (allowed_formats !== undefined) { updates.push('allowed_formats = ?'); params.push(JSON.stringify(allowed_formats)) }
  if (max_n !== undefined) { updates.push('max_n = ?'); params.push(max_n) }
  if (default_params !== undefined) { updates.push('default_params = ?'); params.push(JSON.stringify(default_params)) }
  if (daily_limit_per_user !== undefined) { updates.push('daily_limit_per_user = ?'); params.push(daily_limit_per_user) }
  if (cost_per_use !== undefined) { updates.push('cost_per_use = ?'); params.push(cost_per_use) }
  if (sort_order !== undefined) { updates.push('sort_order = ?'); params.push(sort_order) }
  
  if (updates.length > 0) {
    params.push(modelId)
    run(`UPDATE models SET ${updates.join(', ')} WHERE id = ?`, params)
  }
  
  logAdminAction(req.user!.userId, 'update_model', 'model', modelId, model.model_id, req.ip)
  
  res.json({ success: true })
})

// 删除模型
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const modelId = parseInt(req.params.id as string)
  
  const model = get('SELECT id, model_id FROM models WHERE id = ?', [modelId]) as any
  if (!model) {
    return res.status(404).json({ error: '模型不存在' })
  }
  
  run('DELETE FROM models WHERE id = ?', [modelId])
  
  logAdminAction(req.user!.userId, 'delete_model', 'model', modelId, model.model_id, req.ip)
  
  res.json({ success: true })
})

export default router
