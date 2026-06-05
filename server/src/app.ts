import express from 'express'
import cors from 'cors'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDatabase, startAutoSave } from './db/index.js'

import authRoutes from './routes/auth.js'
import userRoutes from './routes/user.js'
import modelRoutes from './routes/model.js'
import taskRoutes from './routes/task.js'
import imageRoutes from './routes/image.js'
import adminUserRoutes from './routes/admin/users.js'
import adminTaskRoutes from './routes/admin/tasks.js'
import adminImageRoutes from './routes/admin/images.js'
import adminModelRoutes from './routes/admin/models.js'
import adminProviderRoutes from './routes/admin/providers.js'
import adminStatsRoutes from './routes/admin/stats.js'
import adminSettingsRoutes from './routes/admin/settings.js'
import { rateLimitMiddleware } from './middleware/rateLimit.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const app = express()

// 中间件
app.use(cors())
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// 限流
app.use('/api/', rateLimitMiddleware)

// 静态文件：上传的图片
app.use('/uploads', express.static(path.join(__dirname, '../data/uploads')))

// API 路由
app.use('/api/auth', authRoutes)
app.use('/api/user', userRoutes)
app.use('/api/models', modelRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/images', imageRoutes)

// 管理后台 API
app.use('/api/admin/users', adminUserRoutes)
app.use('/api/admin/tasks', adminTaskRoutes)
app.use('/api/admin/images', adminImageRoutes)
app.use('/api/admin/models', adminModelRoutes)
app.use('/api/admin/providers', adminProviderRoutes)
app.use('/api/admin/stats', adminStatsRoutes)
app.use('/api/admin/settings', adminSettingsRoutes)

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() })
})

// 前端静态文件（生产环境）
const clientDist = path.join(__dirname, '../../client/dist')
app.use(express.static(clientDist))
app.get('*', (req, res) => {
  res.sendFile(path.join(clientDist, 'index.html'))
})

// 错误处理
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('服务器错误:', err)
  res.status(500).json({ error: '服务器内部错误' })
})

// 初始化数据库并启动自动保存
export async function startApp() {
  await initDatabase()
  startAutoSave(30000)
  
  // 服务器重启后，将之前 running 状态的任务标记为中断
  const { run: dbRun, all: dbAll } = await import('./db/index.js')
  const runningTasks = dbAll("SELECT id FROM tasks WHERE status = 'running'") as any[]
  if (runningTasks.length > 0) {
    for (const task of runningTasks) {
      dbRun(
        "UPDATE tasks SET status = 'error', error_message = '服务器重启，任务中断', finished_at = datetime('now', 'localtime') WHERE id = ?",
        [task.id]
      )
    }
    console.log(`启动时清理了 ${runningTasks.length} 个未完成任务`)
  }
  
  return app
}

export default app
