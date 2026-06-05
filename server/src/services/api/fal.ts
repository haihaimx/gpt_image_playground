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
  params: {
    image_size?: string
    num_images?: number
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

export async function generateWithFal(params: GenerateParams): Promise<{ imageIds: number[] }> {
  const { taskId, userId, prompt, modelId, baseUrl, apiKey } = params
  const { image_size = '1024x1024', num_images = 1, ...restParams } = params.params
  
  const inputImageIds = params.inputImageIds || []
  
  // 构建请求体
  const body: any = {
    prompt,
    ...restParams,
  }
  
  // 如果有参考图，转为 base64
  if (inputImageIds.length > 0) {
    const imagePaths = getImagePaths(inputImageIds, userId)
    if (imagePaths.length > 0) {
      const buffer = fs.readFileSync(imagePaths[0])
      body.image_url = `data:image/png;base64,${buffer.toString('base64')}`
    }
  }
  
  // 调用 fal.ai API
  const url = `${baseUrl}/${modelId}`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Key ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`fal.ai API 调用失败 (${response.status}): ${errorText}`)
  }
  
  const result = await response.json()
  
  // 保存图片
  const imageIds: number[] = []
  const images = result.images || result.data || []
  
  for (const img of images) {
    let buffer: Buffer
    
    if (img.url) {
      const imgResponse = await fetch(img.url)
      buffer = Buffer.from(await imgResponse.arrayBuffer())
    } else if (img.base64) {
      buffer = Buffer.from(img.base64, 'base64')
    } else {
      continue
    }
    
    const imageId = await saveGeneratedImage(buffer, userId, taskId)
    imageIds.push(imageId)
  }
  
  return { imageIds }
}
