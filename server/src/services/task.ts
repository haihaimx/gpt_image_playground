import { get, run } from '../db/index.js'
import { generateWithImagesAPI } from './api/openai.js'
import { generateWithFal } from './api/fal.js'
import { generateWithCustom } from './api/custom.js'

interface TaskData {
  id: number
  user_id: number
  prompt: string
  params: any
  provider_id: number
  model_id: string
  api_mode: string
  api_model: string
  input_image_ids: string | null
  mask_image_id: number | null
}

export async function executeTask(task: TaskData): Promise<void> {
  const startTime = Date.now()
  
  try {
    // 获取服务商信息
    const provider = get('SELECT * FROM api_providers WHERE id = ?', [task.provider_id]) as any
    if (!provider) {
      throw new Error('服务商不存在')
    }
    
    const parsedParams = JSON.parse(task.params || '{}')
    const inputImageIds = task.input_image_ids ? JSON.parse(task.input_image_ids) : []
    
    let result: { imageIds: number[]; revisedPrompts?: string[] }
    
    // 根据服务商类型调用不同的 API
    switch (provider.provider_type) {
      case 'openai':
        result = await generateWithImagesAPI({
          taskId: task.id,
          userId: task.user_id,
          prompt: task.prompt,
          modelId: task.api_model,
          providerId: task.provider_id,
          baseUrl: provider.base_url,
          apiKey: provider.api_key,
          apiMode: task.api_mode as 'images' | 'responses',
          params: parsedParams,
          inputImageIds,
          maskImageId: task.mask_image_id,
        })
        break
        
      case 'fal':
        result = await generateWithFal({
          taskId: task.id,
          userId: task.user_id,
          prompt: task.prompt,
          modelId: task.api_model,
          providerId: task.provider_id,
          baseUrl: provider.base_url,
          apiKey: provider.api_key,
          params: parsedParams,
          inputImageIds,
          maskImageId: task.mask_image_id,
        })
        break
        
      case 'custom':
        result = await generateWithCustom({
          taskId: task.id,
          userId: task.user_id,
          prompt: task.prompt,
          modelId: task.api_model,
          providerId: task.provider_id,
          baseUrl: provider.base_url,
          apiKey: provider.api_key,
          configJson: provider.config_json ? JSON.parse(provider.config_json) : null,
          params: parsedParams,
          inputImageIds,
          maskImageId: task.mask_image_id,
        })
        break
        
      default:
        throw new Error(`不支持的服务商类型: ${provider.provider_type}`)
    }
    
    const elapsedMs = Date.now() - startTime
    
    // 更新任务状态
    run(`
      UPDATE tasks SET 
        status = 'done',
        output_image_ids = ?,
        revised_prompts = ?,
        actual_params = ?,
        finished_at = datetime('now', 'localtime'),
        elapsed_ms = ?
      WHERE id = ?
    `, [
      JSON.stringify(result.imageIds),
      result.revisedPrompts ? JSON.stringify(result.revisedPrompts) : null,
      JSON.stringify(parsedParams),
      elapsedMs,
      task.id,
    ])
    
  } catch (err: any) {
    const elapsedMs = Date.now() - startTime
    
    // 更新任务状态为失败
    run(`
      UPDATE tasks SET 
        status = 'error',
        error_message = ?,
        finished_at = datetime('now', 'localtime'),
        elapsed_ms = ?
      WHERE id = ?
    `, [err.message, elapsedMs, task.id])
    
    throw err
  }
}

// 后台任务队列
const taskQueue: TaskData[] = []
let isProcessing = false

export function enqueueTask(task: TaskData) {
  taskQueue.push(task)
  processQueue()
}

async function processQueue() {
  if (isProcessing || taskQueue.length === 0) return
  
  isProcessing = true
  
  while (taskQueue.length > 0) {
    const task = taskQueue.shift()
    if (!task) break
    
    try {
      await executeTask(task)
    } catch (err) {
      console.error(`任务 #${task.id} 执行失败:`, err)
    }
  }
  
  isProcessing = false
}
