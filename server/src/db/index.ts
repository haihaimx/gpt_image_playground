import initSqlJs, { Database } from 'sql.js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.DB_PATH || path.join(__dirname, '../../data/app.db')

let db: Database

// 确保数据目录存在
const dbDir = path.dirname(DB_PATH)
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true })
}

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs()
  
  // 如果数据库文件存在，读取它
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH)
    db = new SQL.Database(buffer)
  } else {
    db = new SQL.Database()
  }
  
  // 启用 WAL 模式
  db.run('PRAGMA journal_mode = WAL')
  db.run('PRAGMA busy_timeout = 5000')
  db.run('PRAGMA synchronous = NORMAL')
  db.run('PRAGMA cache_size = -64000')
  db.run('PRAGMA foreign_keys = ON')
  
  return db
}

export function getDb(): Database {
  if (!db) {
    throw new Error('数据库未初始化，请先调用 initDatabase()')
  }
  return db
}

// 保存数据库到文件
export function saveDatabase() {
  if (!db) return
  const data = db.export()
  const buffer = Buffer.from(data)
  fs.writeFileSync(DB_PATH, buffer)
}

// 定期保存（每 30 秒）
let saveInterval: ReturnType<typeof setInterval> | null = null

export function startAutoSave(intervalMs = 30000) {
  if (saveInterval) clearInterval(saveInterval)
  saveInterval = setInterval(() => {
    try {
      saveDatabase()
    } catch (err) {
      console.error('自动保存数据库失败:', err)
    }
  }, intervalMs)
}

export function stopAutoSave() {
  if (saveInterval) {
    clearInterval(saveInterval)
    saveInterval = null
  }
}

// 封装常用的查询方法
export function run(sql: string, params: any[] = []): { lastInsertRowid: number; changes: number } {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  const result = {
    lastInsertRowid: db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0] as number || 0,
    changes: db.getRowsModified(),
  }
  stmt.free()
  return result
}

export function get(sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const columns = stmt.getColumnNames()
  if (stmt.step()) {
    const values = stmt.get()
    stmt.free()
    const row: any = {}
    columns.forEach((col, i) => {
      row[col] = values[i]
    })
    return row
  }
  stmt.free()
  return null
}

export function all(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const columns = stmt.getColumnNames()
  const rows: any[] = []
  while (stmt.step()) {
    const values = stmt.get()
    const row: any = {}
    columns.forEach((col, i) => {
      row[col] = values[i]
    })
    rows.push(row)
  }
  stmt.free()
  return rows
}

export default { getDb, initDatabase, saveDatabase, run, get, all }
