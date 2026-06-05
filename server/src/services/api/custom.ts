import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import { get, run } from '../../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '../../../data/uploads/images')

if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true })
}

interface GenerateParams {
  taskId: number
  userId: number
  prompt: string
  modelId: string
  providerId: number
  baseUrl: string
  apiKey: string
  configJson?: any
  params: {
    [key: string]: any
  }
  inputImageIds?: number[]
  maskImageId?: number
}

function getImagePaths(imageIds: number[], userId: number): string[] {
  if (!imageIds || imageIds.length === 0) return []
  const placeholders = imageIds.map(() => '?').join(',')
  const images = get(
    `SELECT file_path FROM images WHERE id IN (${placeholders}) AND user_id = ? AND is_deleted = 0`,
    [...imageIds, userId]
  )
  if (Array.isArray(images)) {
    return images.map((img: any) => path.join(__dirname, '../../..', img.file_path))
  }
  return images ? [path.join(__dirname, '../../..', (images as any).file_path)] : []
}

async function saveGeneratedImage(buffer: Buffer, userId: number, taskId: number): Promise<number> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  const existing = get('SELECT id FROM images WHERE image_hash = ? AND user_id = ?', [hash, userId]) as any
  if (existing) return existing.id
  
  const filename = `${hash.substring(0, 16)}.png`
  const filePath = path.join(IMAGES_DIR, filename)
  fs.writeFileSync(filePath, buffer)
  
  const result = run(
    `INSERT INTO images (user_id, task_id, image_hash, file_path, file_size, mime_type, source)
     VALUES (?, ?, ?, ?, ?, 'image/png', 'generated')`,
    [userId, taskId, hash, `data/uploads/images/${filename}`, buffer.length]
  )
  return result.lastInsertRowid
}

export async function generateWithCustom(params: GenerateParams): Promise<{ imageIds: number[] }> {
  const { taskId, userId, prompt, modelId, baseUrl, apiKey, configJson } = params
  
  const inputImageIds = params.inputImageIds || []
  
  // 获取服务商配置
  const provider = get('SELECT config_json FROM api_providers WHERE id = ?', [params.providerId]) as any
  const config = configJson || (provider?.config_json ? JSON.parse(provider.config_json) : {})
  
  // 构建请求体 (根据配置模板)
  let body: any = {
    model: modelId,
    prompt,
    ...params.params,
  }
  
  // 如果有参考图
  if (inputImageIds.length > 0) {
    const imagePaths = getImagePaths(inputImageIds, userId)
    if (imagePaths.length > 0) {
      const images = imagePaths.map(imgPath => {
        const buffer = fs.readFileSync(imgPath)
        return `data:image/png;base64,${buffer.toString('base64')}`
      })
      body.images = images
    }
  }
  
  // 如果有蒙版
  if (params.maskImageId) {
    const maskPaths = getImagePaths([params.maskImageId], userId)
    if (maskPaths.length > 0) {
      const buffer = fs.readFileSync(maskPaths[0])
      body.mask = `data:image/png;base64,${buffer.toString('base64')}`
    }
  }
  
  // 应用自定义配置模板
  if (config.request_template) {
    body = { ...config.request_template, ...body }
  }
  
  // 发送请求
  const endpoint = config.endpoint || '/v1/images/generations'
  const url = `${baseUrl}${endpoint}`
  
  const headers: any = {
    'Content-Type': 'application/json',
  }
  
  // API Key 头
  if (config.auth_header) {
    headers[config.auth_header] = config.auth_prefix ? `${config.auth_prefix} ${apiKey}` : apiKey
  } else {
    headers['Authorization'] = `Bearer ${apiKey}`
  }
  
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`自定义 API 调用失败 (${response.status}): ${errorText}`)
  }
  
  const result = await response.json()
  
  // 解析结果 (尝试多种响应格式)
  const imageIds: number[] = []
  
  // 格式1: { data: [{ b64_json: "..." }] }
  // 格式2: { images: ["base64..."] }
  // 格式3: { output: { images: [{ url: "..." }] } }
  
  let images: any[] = []
  
  if (result.data && Array.isArray(result.data)) {
    images = result.data
  } else if (result.images && Array.isArray(result.images)) {
    images = result.images.map((img: any) => typeof img === 'string' ? { b64_json: img } : img)
  } else if (result.output?.images && Array.isArray(result.output.images)) {
    images = result.output.images
  }
  
  for (const img of images) {
    let buffer: Buffer
    
    if (img.b64_json) {
      buffer = Buffer.from(img.b64_json, 'base64')
    } else if (img.url) {
      const imgResponse = await fetch(img.url)
      buffer = Buffer.from(await imgResponse.arrayBuffer())
    } else if (typeof img === 'string') {
      buffer = Buffer.from(img, 'base64')
    } else {
      continue
    }
    
    const imageId = await saveGeneratedImage(buffer, userId, taskId)
    imageIds.push(imageId)
  }
  
  return { imageIds }
}
