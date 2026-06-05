import nodemailer from 'nodemailer'
import { get } from '../db/index.js'

function getEmailConfig() {
  try {
    const setting = get('SELECT value FROM system_settings WHERE key = ?', ['email']) as any
    if (setting) {
      const config = JSON.parse(setting.value)
      if (config.enabled) {
        return {
          host: config.host || 'smtp.qq.com',
          port: config.port || 465,
          secure: config.secure !== false,
          auth: {
            user: config.user || '',
            pass: config.pass || '',
          },
        }
      }
    }
  } catch {}
  return null
}

function getTransporter() {
  const config = getEmailConfig()
  if (!config) return null
  return nodemailer.createTransport(config)
}

export async function sendVerifyEmail(email: string, username: string, token: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('邮件服务未配置，跳过发送验证邮件')
    return
  }
  
  const setting = get('SELECT value FROM system_settings WHERE key = ?', ['email']) as any
  const emailConfig = setting ? JSON.parse(setting.value) : {}
  const from = emailConfig.from || emailConfig.user
  
  const verifyUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/verify-email?token=${token}`
  
  await transporter.sendMail({
    from,
    to: email,
    subject: '验证你的邮箱 - GPT Image Playground',
    html: `
      <h2>欢迎注册 GPT Image Playground</h2>
      <p>你好 ${username}，</p>
      <p>请点击下面的链接验证你的邮箱：</p>
      <a href="${verifyUrl}">${verifyUrl}</a>
      <p>此链接24小时内有效。</p>
    `,
  })
}

export async function sendResetPasswordEmail(email: string, username: string, token: string) {
  const transporter = getTransporter()
  if (!transporter) {
    console.warn('邮件服务未配置，跳过发送重置密码邮件')
    return
  }
  
  const setting = get('SELECT value FROM system_settings WHERE key = ?', ['email']) as any
  const emailConfig = setting ? JSON.parse(setting.value) : {}
  const from = emailConfig.from || emailConfig.user
  
  const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`
  
  await transporter.sendMail({
    from,
    to: email,
    subject: '重置密码 - GPT Image Playground',
    html: `
      <h2>重置密码请求</h2>
      <p>你好 ${username}，</p>
      <p>请点击下面的链接重置你的密码：</p>
      <a href="${resetUrl}">${resetUrl}</a>
      <p>此链接1小时内有效。如果不是你本人操作，请忽略此邮件。</p>
    `,
  })
}
