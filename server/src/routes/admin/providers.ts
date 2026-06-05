import { Router, Response } from 'express'
import { authMiddleware, adminMiddleware, AuthRequest, logAdminAction } from '../../middleware/auth.js'
import { get, all, run } from '../../db/index.js'

const router = Router()

router.use(authMiddleware, adminMiddleware)

// 获取所有服务商
router.get('/', (req: AuthRequest, res: Response) => {
  const providers = all(`
    SELECT * FROM api_providers ORDER BY id
  `)
  
  // 隐藏 API Key 中间部分
  const safeProviders = providers.map((p: any) => ({
    ...p,
    api_key: p.api_key ? p.api_key.substring(0, 8) + '****' + p.api_key.substring(p.api_key.length - 4) : '',
    config_json: p.config_json ? JSON.parse(p.config_json) : null,
  }))
  
  res.json({ providers: safeProviders })
})

// 添加服务商
router.post('/', (req: AuthRequest, res: Response) => {
  const { name, provider_type, base_url, api_key, api_mode, is_active, config_json } = req.body
  
  if (!name || !provider_type || !base_url || !api_key) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  
  if (!['openai', 'fal', 'custom'].includes(provider_type)) {
    return res.status(400).json({ error: '服务商类型无效' })
  }
  
  const result = run(`
    INSERT INTO api_providers (name, provider_type, base_url, api_key, api_mode, is_active, config_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [
    name, provider_type, base_url, api_key,
    api_mode || 'images',
    is_active !== undefined ? is_active : 1,
    config_json ? JSON.stringify(config_json) : null,
  ])
  
  logAdminAction(req.user!.userId, 'add_provider', 'provider', result.lastInsertRowid, name, req.ip)
  
  res.json({ id: result.lastInsertRowid, success: true })
})

// 修改服务商
router.put('/:id', (req: AuthRequest, res: Response) => {
  const providerId = parseInt(req.params.id as string)
  const { name, base_url, api_key, api_mode, is_active, config_json } = req.body
  
  const provider = get('SELECT id, name FROM api_providers WHERE id = ?', [providerId]) as any
  if (!provider) {
    return res.status(404).json({ error: '服务商不存在' })
  }
  
  const updates: string[] = []
  const params: any[] = []
  
  if (name !== undefined) { updates.push('name = ?'); params.push(name) }
  if (base_url !== undefined) { updates.push('base_url = ?'); params.push(base_url) }
  if (api_key !== undefined && api_key !== '') { 
    // 检查是否是掩码后的 key
    if (!api_key.includes('****')) {
      updates.push('api_key = ?'); params.push(api_key) 
    }
  }
  if (api_mode !== undefined) { updates.push('api_mode = ?'); params.push(api_mode) }
  if (is_active !== undefined) { updates.push('is_active = ?'); params.push(is_active) }
  if (config_json !== undefined) { updates.push('config_json = ?'); params.push(JSON.stringify(config_json)) }
  
  if (updates.length > 0) {
    updates.push("updated_at = datetime('now', 'localtime')")
    params.push(providerId)
    run(`UPDATE api_providers SET ${updates.join(', ')} WHERE id = ?`, params)
  }
  
  logAdminAction(req.user!.userId, 'update_provider', 'provider', providerId, name || provider.name, req.ip)
  
  res.json({ success: true })
})

// 删除服务商
router.delete('/:id', (req: AuthRequest, res: Response) => {
  const providerId = parseInt(req.params.id as string)
  
  const provider = get('SELECT id, name FROM api_providers WHERE id = ?', [providerId]) as any
  if (!provider) {
    return res.status(404).json({ error: '服务商不存在' })
  }
  
  // 检查是否有模型关联
  const modelCount = get('SELECT COUNT(*) as count FROM models WHERE provider_id = ?', [providerId]) as any
  if (modelCount?.count > 0) {
    return res.status(400).json({ error: `该服务商下还有 ${modelCount.count} 个模型，请先删除模型` })
  }
  
  run('DELETE FROM api_providers WHERE id = ?', [providerId])
  
  logAdminAction(req.user!.userId, 'delete_provider', 'provider', providerId, provider.name, req.ip)
  
  res.json({ success: true })
})

export default router
