import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'gpt-image-playground-secret-key-change-in-production'
const ACCESS_TOKEN_EXPIRES = '2h'
const REFRESH_TOKEN_EXPIRES = '7d'

export interface JwtPayload {
  userId: number
  username: string
  role: string
}

export function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES })
}

export function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES })
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, JWT_SECRET) as JwtPayload
}
