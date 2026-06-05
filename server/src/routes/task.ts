import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { checkUsageLimit } from '../middleware/usageLimit.js'
import { get, all, run } from '../db/index.js'
import { enqueueTask } from '../services/task.js'

const router = Router()

// 获取用户的任务列表
router.get('/', authMiddleware, (req: AuthRequest, res: Response) => {
  const { page = '1', pageSize = '20', status } = req.query
  const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string)
  const limit = parseInt(pageSize as string)
  
  let where = 'WHERE user_id = ? AND is_deleted = 0'
  const params: any[] = [req.user!.userId]
  
  if (status) {
    where += ' AND status = ?'
    params.push(status)
  }
  
  const countResult = get(`SELECT COUNT(*) as count FROM tasks ${where}`, params) as any
  const total = countResult?.count || 0
  
  const tasks = all(`
    SELECT * FROM tasks ${where}
    ORDER BY created_at DESC
    LIMIT ? OFFSET ?
  `, [...params, limit, offset])
  
  const parsedTasks = tasks.map((t: any) => ({
    ...t,
    params: JSON.parse(t.params || '{}'),
    actual_params: t.actual_params ? JSON.parse(t.actual_params) : null,
    input_image_ids: t.input_image_ids ? JSON.parse(t.input_image_ids) : [],
    output_image_ids: t.output_image_ids ? JSON.parse(t.output_image_ids) : [],
    revised_prompts: t.revised_prompts ? JSON.parse(t.revised_prompts) : [],
  }))
  
  res.json({ total, page: parseInt(page as string), pageSize: limit, tasks: parsedTasks })
})

// 获取任务详情
router.get('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const task = get(`
    SELECT * FROM tasks WHERE id = ? AND user_id = ? AND is_deleted = 0
  `, [req.params.id, req.user!.userId]) as any
  
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  const parsedTask = {
    ...task,
    params: JSON.parse(task.params || '{}'),
    actual_params: task.actual_params ? JSON.parse(task.actual_params) : null,
    input_image_ids: task.input_image_ids ? JSON.parse(task.input_image_ids) : [],
    output_image_ids: task.output_image_ids ? JSON.parse(task.output_image_ids) : [],
    revised_prompts: task.revised_prompts ? JSON.parse(task.revised_prompts) : [],
  }
  
  const images = all(`
    SELECT * FROM images WHERE task_id = ? AND user_id = ? AND is_deleted = 0
  `, [task.id, req.user!.userId])
  
  let inputImages: any[] = []
  if (parsedTask.input_image_ids.length > 0) {
    const placeholders = parsedTask.input_image_ids.map(() => '?').join(',')
    inputImages = all(`
      SELECT * FROM images WHERE id IN (${placeholders}) AND user_id = ?
    `, [...parsedTask.input_image_ids, req.user!.userId])
  }
  
  let maskImage = null
  if (parsedTask.mask_image_id) {
    maskImage = get('SELECT * FROM images WHERE id = ? AND user_id = ?', [parsedTask.mask_image_id, req.user!.userId])
  }
  
  res.json({
    task: parsedTask,
    images,
    inputImages,
    maskImage,
  })
})

// 创建任务（图片生成）
router.post('/', authMiddleware, checkUsageLimit, async (req: AuthRequest, res: Response) => {
  try {
    const { model_id, prompt, params, input_image_ids, mask_image_id } = req.body
    
    if (!model_id || !prompt) {
      return res.status(400).json({ error: '缺少模型ID或提示词' })
    }
    
    const model = get(`
      SELECT m.*, p.id as p_id, p.provider_type, p.base_url, p.api_key, p.api_mode
      FROM models m
      JOIN api_providers p ON m.provider_id = p.id
      WHERE m.model_id = ? AND m.is_active = 1 AND p.is_active = 1
    `, [model_id]) as any
    
    if (!model) {
      return res.status(400).json({ error: '模型不存在或已禁用' })
    }
    
    const uploadSetting = get('SELECT value FROM system_settings WHERE key = ?', ['upload']) as any
    const uploadConfig = uploadSetting ? JSON.parse(uploadSetting.value) : { maxReferenceImages: 16 }
    
    if (input_image_ids && input_image_ids.length > uploadConfig.maxReferenceImages) {
      return res.status(400).json({ error: `参考图最多 ${uploadConfig.maxReferenceImages} 张` })
    }
    
    const taskResult = run(`
      INSERT INTO tasks (
        user_id, prompt, params, provider_id, model_id, api_mode, api_model,
        status, input_image_ids, mask_image_id, source_mode
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'running', ?, ?, 'gallery')
    `, [
      req.user!.userId,
      prompt,
      JSON.stringify(params || {}),
      model.p_id,
      model_id,
      model.api_mode,
      model.model_id,
      input_image_ids ? JSON.stringify(input_image_ids) : null,
      mask_image_id || null,
    ])
    
    const taskId = taskResult.lastInsertRowid
    
    run('UPDATE users SET daily_used = daily_used + 1, monthly_used = monthly_used + 1, total_used = total_used + 1 WHERE id = ?', [req.user!.userId])
    run('INSERT INTO usage_logs (user_id, task_id, model_id, action) VALUES (?, ?, ?, ?)', [req.user!.userId, taskId, model_id, 'generate'])
    
    // 异步执行任务
    enqueueTask({
      id: taskId,
      user_id: req.user!.userId,
      prompt,
      params: JSON.stringify(params || {}),
      provider_id: model.p_id,
      model_id,
      api_mode: model.api_mode,
      api_model: model.model_id,
      input_image_ids: input_image_ids ? JSON.stringify(input_image_ids) : null,
      mask_image_id: mask_image_id || null,
    })
    
    res.json({ 
      taskId, 
      message: '任务已创建，正在生成中',
      task: {
        id: taskId,
        status: 'running',
        prompt,
      }
    })
  } catch (err: any) {
    console.error('创建任务失败:', err)
    res.status(500).json({ error: '创建任务失败' })
  }
})

// 删除任务（软删除）
router.delete('/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id as string)
  
  const task = get('SELECT id, user_id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user!.userId]) as any
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  run("UPDATE tasks SET is_deleted = 1, deleted_at = datetime('now', 'localtime') WHERE id = ?", [taskId])
  
  res.json({ success: true })
})

// 收藏/取消收藏任务
router.put('/:id/favorite', authMiddleware, (req: AuthRequest, res: Response) => {
  const taskId = parseInt(req.params.id as string)
  const { is_favorite } = req.body
  
  const task = get('SELECT id, user_id FROM tasks WHERE id = ? AND user_id = ?', [taskId, req.user!.userId]) as any
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  run('UPDATE tasks SET is_favorite = ? WHERE id = ?', [is_favorite ? 1 : 0, taskId])
  
  res.json({ success: true })
})

// 轮询任务状态
router.get('/:id/status', authMiddleware, (req: AuthRequest, res: Response) => {
  const task = get(`
    SELECT id, status, error_message, output_image_ids, revised_prompts, elapsed_ms
    FROM tasks WHERE id = ? AND user_id = ? AND is_deleted = 0
  `, [req.params.id, req.user!.userId]) as any
  
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }
  
  const outputImageIds = task.output_image_ids ? JSON.parse(task.output_image_ids) : []
  
  // 查询图片文件路径
  const imageFiles: Record<number, string> = {}
  if (outputImageIds.length > 0) {
    const placeholders = outputImageIds.map(() => '?').join(',')
    const images = all(
      `SELECT id, file_path FROM images WHERE id IN (${placeholders}) AND user_id = ? AND is_deleted = 0`,
      [...outputImageIds, req.user!.userId]
    ) as any[]
    for (const img of images) {
      imageFiles[img.id] = img.file_path
    }
  }
  
  res.json({
    id: task.id,
    status: task.status,
    error_message: task.error_message,
    output_image_ids: outputImageIds,
    output_image_files: imageFiles,
    revised_prompts: task.revised_prompts ? JSON.parse(task.revised_prompts) : [],
    elapsed_ms: task.elapsed_ms,
  })
})

export default router
