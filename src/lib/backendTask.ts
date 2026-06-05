// 后端任务提交和轮询模块

import * as apiClient from './apiClient'
import { getAccessToken } from './auth'

interface BackendTaskResult {
  taskId: number
  status: 'running' | 'done' | 'error'
  outputImageIds: number[]
  outputImageFiles: Record<number, string>  // id -> file_path
  revisedPrompts: string[]
  errorMessage?: string
  elapsedMs?: number
}

// 上传图片到后端
export async function uploadImageToBackend(dataUrl: string, filename?: string): Promise<number | null> {
  try {
    const result = await apiClient.uploadImage(dataUrl, filename)
    return result.id
  } catch (err) {
    console.error('上传图片失败:', err)
    return null
  }
}

// 提交任务到后端
export async function submitTaskToBackend(params: {
  modelId: string
  prompt: string
  params?: any
  inputImageBackendIds?: number[]
  maskImageBackendId?: number
}): Promise<number | null> {
  try {
    const result = await apiClient.createTask({
      model_id: params.modelId,
      prompt: params.prompt,
      params: params.params,
      input_image_ids: params.inputImageBackendIds,
      mask_image_id: params.maskImageBackendId,
    })
    return result.taskId
  } catch (err) {
    console.error('提交任务失败:', err)
    throw err
  }
}

// 轮询任务状态
export async function pollTaskStatus(taskId: number): Promise<BackendTaskResult> {
  const result = await apiClient.fetchTaskStatus(taskId)
  return {
    taskId: result.id,
    status: result.status,
    outputImageIds: result.output_image_ids || [],
    outputImageFiles: result.output_image_files || {},
    revisedPrompts: result.revised_prompts || [],
    errorMessage: result.error_message,
    elapsedMs: result.elapsed_ms,
  }
}

// 等待任务完成（带轮询）
export async function waitForTaskCompletion(
  taskId: number,
  onProgress?: (status: BackendTaskResult) => void,
  pollInterval = 2000,
  maxWaitTime = 300000,
  maxRetries = 5
): Promise<BackendTaskResult> {
  const startTime = Date.now()
  let consecutiveErrors = 0
  
  while (true) {
    try {
      const result = await pollTaskStatus(taskId)
      consecutiveErrors = 0 // 成功则重置
      
      if (onProgress) {
        onProgress(result)
      }
      
      if (result.status === 'done' || result.status === 'error') {
        return result
      }
      
      // 检查超时
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('任务执行超时')
      }
      
      // 等待后继续轮询
      await new Promise(resolve => setTimeout(resolve, pollInterval))
    } catch (err: any) {
      // AbortError（刷新页面导致的 fetch 中断）直接抛出，不标记为失败
      if (err.name === 'AbortError') {
        throw err
      }
      consecutiveErrors++
      console.warn(`轮询任务 #${taskId} 失败 (${consecutiveErrors}/${maxRetries}):`, err.message)
      
      if (consecutiveErrors >= maxRetries) {
        throw new Error(`连续 ${maxRetries} 次轮询失败: ${err.message}`)
      }
      
      // 指数退避重试
      const backoff = Math.min(pollInterval * Math.pow(2, consecutiveErrors), 10000)
      await new Promise(resolve => setTimeout(resolve, backoff))
    }
  }
}

// 获取后端图片 URL
export function getBackendImageUrl(filePath: string): string {
  // filePath 格式: data/uploads/images/xxx.png
  // 静态文件服务挂载在 /uploads，需要去掉 data/ 前缀
  const urlPath = filePath.replace(/^data\//, '')
  return `/${urlPath}`
}

// 下载后端图片并转为 dataUrl（用于缓存到 IndexedDB）
export async function fetchBackendImageDataUrl(filePath: string): Promise<string> {
  const url = getBackendImageUrl(filePath)
  const res = await fetch(url)
  if (!res.ok) throw new Error(`下载图片失败: ${res.status}`)
  const blob = await res.blob()
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

// 检查是否使用后端模式
export function isBackendMode(): boolean {
  return !!getAccessToken()
}
