import { Request, Response, NextFunction } from 'express'
import { get } from '../db/index.js'

// 内存存储：IP -> 请求记录
const requestCounts = new Map<string, { minute: number; hour: number; minuteStart: number; hourStart: number }>()

// 每分钟清理过期记录
setInterval(() => {
  const now = Date.now()
  for (const [ip, data] of requestCounts) {
    if (now - data.hourStart > 3600000) {
      requestCounts.delete(ip)
    }
  }
}, 60000)

function getRateLimitConfig(): { enabled: boolean; maxPerMinute: number; maxPerHour: number } {
  try {
    const setting = get('SELECT value FROM system_settings WHERE key = ?', ['rate_limit']) as any
    if (setting) {
      const config = JSON.parse(setting.value)
      return {
        enabled: config.enabled !== false,
        maxPerMinute: config.maxRequestsPerMinute || 30,
        maxPerHour: config.maxRequestsPerHour || 200,
      }
    }
  } catch {}
  return { enabled: true, maxPerMinute: 30, maxPerHour: 200 }
}

export function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const config = getRateLimitConfig()
  
  if (!config.enabled) {
    return next()
  }
  
  const ip = req.ip || req.socket.remoteAddress || 'unknown'
  const now = Date.now()
  
  let data = requestCounts.get(ip)
  
  if (!data) {
    data = { minute: 0, hour: 0, minuteStart: now, hourStart: now }
    requestCounts.set(ip, data)
  }
  
  // 重置分钟计数
  if (now - data.minuteStart > 60000) {
    data.minute = 0
    data.minuteStart = now
  }
  
  // 重置小时计数
  if (now - data.hourStart > 3600000) {
    data.hour = 0
    data.hourStart = now
  }
  
  data.minute++
  data.hour++
  
  // 检查限制
  if (data.minute > config.maxPerMinute) {
    return res.status(429).json({ 
      error: '请求过于频繁，请稍后再试',
      retryAfter: Math.ceil((data.minuteStart + 60000 - now) / 1000),
    })
  }
  
  if (data.hour > config.maxPerHour) {
    return res.status(429).json({ 
      error: '请求次数已达上限，请稍后再试',
      retryAfter: Math.ceil((data.hourStart + 3600000 - now) / 1000),
    })
  }
  
  next()
}
