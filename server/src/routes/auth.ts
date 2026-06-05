import { Router, Response } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth.js'
import { hashPassword, comparePassword, generateToken } from '../utils/crypto.js'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js'
import { sendVerifyEmail, sendResetPasswordEmail } from '../utils/email.js'
import { run, get, all, saveDatabase } from '../db/index.js'

const router = Router()

// 注册
router.post('/register', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password, email } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }
    
    if (username.length < 3 || username.length > 50) {
      return res.status(400).json({ error: '用户名长度需要 3-50 个字符' })
    }
    
    if (password.length < 6) {
      return res.status(400).json({ error: '密码长度至少 6 个字符' })
    }
    
    // 检查注册开关
    const regSetting = get('SELECT value FROM system_settings WHERE key = ?', ['registration'])
    const regConfig = regSetting ? JSON.parse(regSetting.value) : { enabled: true }
    
    if (!regConfig.enabled) {
      return res.status(403).json({ error: '注册已关闭' })
    }
    
    // 检查用户名是否已存在
    const existingUser = get('SELECT id FROM users WHERE username = ?', [username])
    if (existingUser) {
      return res.status(400).json({ error: '用户名已存在' })
    }
    
    // 检查邮箱是否已存在
    if (email) {
      const existingEmail = get('SELECT id FROM users WHERE email = ?', [email])
      if (existingEmail) {
        return res.status(400).json({ error: '邮箱已被注册' })
      }
    }
    
    // 创建用户
    const passwordHash = await hashPassword(password)
    const defaultDailyLimit = regConfig.defaultDailyLimit || 50
    const defaultMonthlyLimit = regConfig.defaultMonthlyLimit || 1000
    
    const result = run(`
      INSERT INTO users (username, email, password_hash, nickname, daily_limit, monthly_limit)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [username, email || null, passwordHash, username, defaultDailyLimit, defaultMonthlyLimit])
    
    const userId = result.lastInsertRowid
    
    // 如果有邮箱，发送验证邮件
    if (email) {
      const verifyToken = generateToken()
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      
      run('UPDATE users SET email_verify_token = ?, email_verify_expires = ? WHERE id = ?', [verifyToken, expires, userId])
      
      await sendVerifyEmail(email, username, verifyToken)
    }
    
    // 生成 token
    const accessToken = generateAccessToken({ userId, username, role: 'user' })
    const refreshToken = generateRefreshToken({ userId, username, role: 'user' })
    
    // 存储 refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    run('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [userId, refreshToken, refreshExpires])
    saveDatabase()
    
    res.json({
      user: { id: userId, username, nickname: username, role: 'user' },
      accessToken,
      refreshToken,
    })
  } catch (err: any) {
    console.error('注册失败:', err)
    res.status(500).json({ error: '注册失败' })
  }
})

// 登录
router.post('/login', async (req: AuthRequest, res: Response) => {
  try {
    const { username, password } = req.body
    
    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' })
    }
    
    // 查找用户
    const user = get(`
      SELECT id, username, email, password_hash, nickname, avatar_url, role, status
      FROM users WHERE username = ? OR email = ?
    `, [username, username]) as any
    
    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    
    if (user.status === 'banned') {
      return res.status(403).json({ error: '账户已被封禁' })
    }
    
    if (user.status === 'deleted') {
      return res.status(403).json({ error: '账户不存在' })
    }
    
    // 验证密码
    const valid = await comparePassword(password, user.password_hash)
    if (!valid) {
      return res.status(401).json({ error: '用户名或密码错误' })
    }
    
    // 更新登录时间
    run('UPDATE users SET last_login_at = datetime("now", "localtime") WHERE id = ?', [user.id])
    
    // 生成 token
    const accessToken = generateAccessToken({ userId: user.id, username: user.username, role: user.role })
    const refreshToken = generateRefreshToken({ userId: user.id, username: user.username, role: user.role })
    
    // 存储 refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    run('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [user.id, refreshToken, refreshExpires])
    saveDatabase()
    
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
        role: user.role,
      },
      accessToken,
      refreshToken,
    })
  } catch (err: any) {
    console.error('登录失败:', err)
    res.status(500).json({ error: '登录失败' })
  }
})

// 刷新 token
router.post('/refresh', (req: AuthRequest, res: Response) => {
  try {
    const { refreshToken } = req.body
    
    if (!refreshToken) {
      return res.status(400).json({ error: '缺少 refreshToken' })
    }
    
    // 验证 token 是否在数据库中
    const stored = get('SELECT user_id FROM refresh_tokens WHERE token = ? AND expires_at > datetime("now", "localtime")', [refreshToken])
    
    if (!stored) {
      return res.status(401).json({ error: 'refreshToken 已过期' })
    }
    
    // 验证 token
    const payload = verifyRefreshToken(refreshToken)
    
    // 删除旧 token
    run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken])
    
    // 生成新 token
    const newAccessToken = generateAccessToken({ userId: payload.userId, username: payload.username, role: payload.role })
    const newRefreshToken = generateRefreshToken({ userId: payload.userId, username: payload.username, role: payload.role })
    
    // 存储新 refresh token
    const refreshExpires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
    run('INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)', [payload.userId, newRefreshToken, refreshExpires])
    saveDatabase()
    
    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    })
  } catch (err: any) {
    res.status(401).json({ error: 'Token 无效' })
  }
})

// 登出
router.post('/logout', authMiddleware, (req: AuthRequest, res: Response) => {
  const { refreshToken } = req.body
  
  if (refreshToken) {
    run('DELETE FROM refresh_tokens WHERE token = ?', [refreshToken])
  }
  
  res.json({ success: true })
})

// 获取当前用户信息
router.get('/me', authMiddleware, (req: AuthRequest, res: Response) => {
  const user = get(`
    SELECT id, username, email, nickname, avatar_url, role, status,
           daily_limit, monthly_limit, total_limit,
           daily_used, monthly_used, total_used,
           email_verified, created_at, last_login_at
    FROM users WHERE id = ?
  `, [req.user!.userId])
  
  res.json({ user })
})

// 验证邮箱
router.get('/verify-email', (req: AuthRequest, res: Response) => {
  const { token } = req.query
  
  if (!token) {
    return res.status(400).json({ error: '缺少验证 token' })
  }
  
  const user = get(`
    SELECT id, email_verify_expires FROM users 
    WHERE email_verify_token = ? AND email_verified = 0
  `, [token]) as any
  
  if (!user) {
    return res.status(400).json({ error: '验证链接无效或已过期' })
  }
  
  if (new Date(user.email_verify_expires) < new Date()) {
    return res.status(400).json({ error: '验证链接已过期' })
  }
  
  run('UPDATE users SET email_verified = 1, email_verify_token = NULL, email_verify_expires = NULL WHERE id = ?', [user.id])
  
  res.json({ success: true, message: '邮箱验证成功' })
})

// 请求重置密码
router.post('/forgot-password', async (req: AuthRequest, res: Response) => {
  const { email } = req.body
  
  if (!email) {
    return res.status(400).json({ error: '请输入邮箱' })
  }
  
  const user = get('SELECT id, username, email FROM users WHERE email = ? AND status = "active"', [email]) as any
  
  if (user) {
    const resetToken = generateToken()
    const expires = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    
    run('UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?', [resetToken, expires, user.id])
    
    await sendResetPasswordEmail(email, user.username, resetToken)
  }
  
  res.json({ success: true, message: '如果该邮箱已注册，重置链接将发送到你的邮箱' })
})

// 重置密码
router.post('/reset-password', async (req: AuthRequest, res: Response) => {
  const { token, newPassword } = req.body
  
  if (!token || !newPassword) {
    return res.status(400).json({ error: '缺少必要参数' })
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '密码长度至少 6 个字符' })
  }
  
  const user = get(`
    SELECT id, reset_token_expires FROM users 
    WHERE reset_token = ? AND status = "active"
  `, [token]) as any
  
  if (!user) {
    return res.status(400).json({ error: '重置链接无效' })
  }
  
  if (new Date(user.reset_token_expires) < new Date()) {
    return res.status(400).json({ error: '重置链接已过期，请重新申请' })
  }
  
  const passwordHash = await hashPassword(newPassword)
  run('UPDATE users SET password_hash = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?', [passwordHash, user.id])
  
  // 清除所有 refresh token
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [user.id])
  
  res.json({ success: true, message: '密码重置成功，请重新登录' })
})

// 修改密码（已登录）
router.put('/password', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { oldPassword, newPassword } = req.body
  
  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入旧密码和新密码' })
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码长度至少 6 个字符' })
  }
  
  const user = get('SELECT password_hash FROM users WHERE id = ?', [req.user!.userId]) as any
  
  const valid = await comparePassword(oldPassword, user.password_hash)
  if (!valid) {
    return res.status(401).json({ error: '旧密码错误' })
  }
  
  const passwordHash = await hashPassword(newPassword)
  run('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, req.user!.userId])
  
  // 清除其他 refresh token
  run('DELETE FROM refresh_tokens WHERE user_id = ?', [req.user!.userId])
  
  res.json({ success: true, message: '密码修改成功' })
})

export default router
