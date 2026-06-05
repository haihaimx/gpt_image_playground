import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath } from 'url'
import FormData from 'form-data'
import { get, run, getDb } from '../../db/index.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const IMAGES_DIR = path.join(__dirname, '../../../data/uploads/images')

// 确保目录存在
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
  apiMode: 'images' | 'responses'
  params: {
    size?: string
    quality?: string
    output_format?: string
    n?: number
    [key: string]: any
  }
  inputImageIds?: number[]
  maskImageId?: number
}

// 获取用户上传的图片路径
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

// 保存生成的图片
async function saveGeneratedImage(buffer: Buffer, userId: number, taskId: number): Promise<number> {
  const hash = crypto.createHash('sha256').update(buffer).digest('hex')
  
  // 检查是否已存在
  const existing = get('SELECT id FROM images WHERE image_hash = ? AND user_id = ?', [hash, userId]) as any
  if (existing) return existing.id
  
  // 保存文件
  const filename = `${hash.substring(0, 16)}.png`
  const filePath = path.join(IMAGES_DIR, filename)
  fs.writeFileSync(filePath, buffer)
  
  // 保存到数据库
  const result = run(
    `INSERT INTO images (user_id, task_id, image_hash, file_path, file_size, mime_type, source)
     VALUES (?, ?, ?, ?, ?, 'image/png', 'generated')`,
    [userId, taskId, hash, `data/uploads/images/${filename}`, buffer.length]
  )
  
  return result.lastInsertRowid
}

// 调用 OpenAI Images API
export async function generateWithImagesAPI(params: GenerateParams): Promise<{ imageIds: number[]; revisedPrompts?: string[] }> {
  const { taskId, userId, prompt, baseUrl, apiKey, apiMode } = params
  const { size = '1024x1024', quality = 'auto', output_format = 'png', n = 1 } = params.params
  
  if (!params.modelId) {
    throw new Error(`modelId 为空! 传入参数: ${JSON.stringify({ modelId: params.modelId, apiMode, baseUrl })}`)
  }
  
  console.log(`[API] generateWithImagesAPI: model='${params.modelId}', mode=${apiMode}, base=${baseUrl}`)
  
  const inputImageIds = params.inputImageIds || []
  const maskImageId = params.maskImageId
  
  let url: string
  let body: string | FormData
  let headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
  }
  
  if (apiMode === 'responses') {
    // Responses API
    url = `${baseUrl}/responses`
    headers['Content-Type'] = 'application/json'
    
    const content: any[] = [
      { type: 'input_text', text: prompt }
    ]
    
    // 添加参考图
    if (inputImageIds.length > 0) {
      const imagePaths = getImagePaths(inputImageIds, userId)
      for (const imgPath of imagePaths) {
        const buffer = fs.readFileSync(imgPath)
        const base64 = buffer.toString('base64')
        content.unshift({
          type: 'input_image',
          image_url: `data:image/png;base64,${base64}`
        })
      }
    }
    
    body = JSON.stringify({
      model: params.modelId,
      input: [{
        role: 'user',
        content
      }],
      tools: [{
        type: 'image_generation',
        quality,
        output_format,
        size,
        n,
      }]
    })
  } else if (inputImageIds.length > 0 || maskImageId) {
    // 编辑模式 - 使用 multipart/form-data
    url = `${baseUrl}/images/edits`
    
    const form = new FormData()
    form.append('model', params.modelId)
    form.append('prompt', prompt)
    form.append('n', String(n))
    form.append('size', size)
    form.append('quality', quality)
    form.append('output_format', output_format)
    
    // 添加图片
    const imagePaths = getImagePaths(inputImageIds, userId)
    for (const imgPath of imagePaths) {
      const imgBuffer = fs.readFileSync(imgPath)
      form.append('image', imgBuffer, {
        filename: path.basename(imgPath),
        contentType: 'image/png',
      })
    }
    
    // 添加蒙版
    if (maskImageId) {
      const maskPaths = getImagePaths([maskImageId], userId)
      if (maskPaths.length > 0) {
        const maskBuffer = fs.readFileSync(maskPaths[0])
        form.append('mask', maskBuffer, {
          filename: path.basename(maskPaths[0]),
          contentType: 'image/png',
        })
      }
    }
    
    // form-data npm 包和 Node.js 原生 fetch 不兼容，需要手动转 buffer
    const formBuffer = form.getBuffer()
    const formHeaders = form.getHeaders()
    headers = { ...headers, ...formHeaders }
    body = formBuffer as any
  } else {
    // 普通生成 - 使用 JSON
    url = `${baseUrl}/images/generations`
    headers['Content-Type'] = 'application/json'
    
    body = JSON.stringify({
      model: params.modelId,
      prompt,
      n,
      size,
      quality,
      output_format,
    })
  }
  
  console.log(`[API] POST ${url}`)
  console.log(`[API] Body type: ${typeof body}, isFormData: ${body instanceof FormData}`)
  
  // 发送请求
  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: body as any,
  })
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error(`[API] 请求失败 (${response.status}):`, errorText.substring(0, 500))
    throw new Error(`API 调用失败 (${response.status}): ${errorText}`)
  }
  
  const result = await response.json()
  
  // 解析结果
  const imageIds: number[] = []
  const revisedPrompts: string[] = []
  
  if (apiMode === 'responses') {
    // Responses API 结果
    const output = result.output || []
    for (const item of output) {
      if (item.type === 'image_generation_call' && item.result) {
        const buffer = Buffer.from(item.result, 'base64')
        const imageId = await saveGeneratedImage(buffer, userId, taskId)
        imageIds.push(imageId)
      }
      if (item.revised_prompt) {
        revisedPrompts.push(item.revised_prompt)
      }
    }
  } else {
    // Images API 结果
    const data = result.data || []
    for (const item of data) {
      if (item.b64_json) {
        const buffer = Buffer.from(item.b64_json, 'base64')
        const imageId = await saveGeneratedImage(buffer, userId, taskId)
        imageIds.push(imageId)
      } else if (item.url) {
        // 下载图片
        const imgResponse = await fetch(item.url)
        const buffer = Buffer.from(await imgResponse.arrayBuffer())
        const imageId = await saveGeneratedImage(buffer, userId, taskId)
        imageIds.push(imageId)
      }
      if (item.revised_prompt) {
        revisedPrompts.push(item.revised_prompt)
      }
    }
  }
  
  return { imageIds, revisedPrompts }
}
