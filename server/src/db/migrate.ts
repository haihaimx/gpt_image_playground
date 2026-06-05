import { initDatabase, getDb, saveDatabase } from './index.js'
import bcrypt from 'bcrypt'

async function migrate() {
  console.log('开始数据库迁移...')
  
  await initDatabase()
  const db = getDb()
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      username      TEXT UNIQUE NOT NULL,
      email         TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      nickname      TEXT,
      avatar_url    TEXT,
      
      role          TEXT DEFAULT 'user' CHECK(role IN ('user', 'admin')),
      status        TEXT DEFAULT 'active' CHECK(status IN ('active', 'banned', 'deleted')),
      
      daily_limit       INTEGER DEFAULT 50,
      monthly_limit     INTEGER DEFAULT 1000,
      total_limit       INTEGER DEFAULT -1,
      daily_used        INTEGER DEFAULT 0,
      monthly_used      INTEGER DEFAULT 0,
      total_used        INTEGER DEFAULT 0,
      limit_reset_date  TEXT,
      
      email_verified    INTEGER DEFAULT 0,
      email_verify_token TEXT,
      email_verify_expires TEXT,
      reset_token       TEXT,
      reset_token_expires TEXT,
      
      created_at    TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at    TEXT DEFAULT (datetime('now', 'localtime')),
      last_login_at TEXT,
      banned_at     TEXT,
      banned_reason TEXT
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_status ON users(status)')
  db.run('CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS api_providers (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      name          TEXT NOT NULL,
      provider_type TEXT NOT NULL CHECK(provider_type IN ('openai', 'fal', 'custom')),
      base_url      TEXT NOT NULL,
      api_key       TEXT NOT NULL,
      api_mode      TEXT DEFAULT 'images' CHECK(api_mode IN ('images', 'responses')),
      is_active     INTEGER DEFAULT 1,
      config_json   TEXT,
      created_at    TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at    TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_providers_active ON api_providers(is_active)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS models (
      id                    INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id           INTEGER NOT NULL,
      model_id              TEXT NOT NULL,
      display_name          TEXT NOT NULL,
      is_active             INTEGER DEFAULT 1,
      
      supports_edit         INTEGER DEFAULT 1,
      supports_mask         INTEGER DEFAULT 1,
      supports_multi        INTEGER DEFAULT 1,
      supports_stream       INTEGER DEFAULT 0,
      
      allowed_sizes         TEXT DEFAULT '["auto","1024x1024","1024x1536","1536x1024","512x512"]',
      allowed_qualities     TEXT DEFAULT '["auto","low","medium","high"]',
      allowed_formats       TEXT DEFAULT '["png","jpeg","webp"]',
      max_n                 INTEGER DEFAULT 1,
      default_params        TEXT DEFAULT '{"size":"auto","quality":"auto","output_format":"png"}',
      
      daily_limit_per_user  INTEGER DEFAULT -1,
      cost_per_use          INTEGER DEFAULT 1,
      
      sort_order            INTEGER DEFAULT 0,
      created_at            TEXT DEFAULT (datetime('now', 'localtime')),
      
      FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE CASCADE
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_models_provider ON models(provider_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_models_active ON models(is_active)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      
      prompt          TEXT NOT NULL,
      params          TEXT NOT NULL,
      
      provider_id     INTEGER,
      model_id        TEXT,
      api_mode        TEXT,
      api_model       TEXT,
      
      status          TEXT DEFAULT 'running' CHECK(status IN ('running', 'done', 'error')),
      error_message   TEXT,
      
      input_image_ids TEXT,
      mask_image_id   INTEGER,
      output_image_ids TEXT,
      
      actual_params   TEXT,
      revised_prompts TEXT,
      
      source_mode     TEXT DEFAULT 'gallery' CHECK(source_mode IN ('gallery', 'agent')),
      conversation_id INTEGER,
      round_id        TEXT,
      
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      finished_at     TEXT,
      elapsed_ms      INTEGER,
      
      is_favorite     INTEGER DEFAULT 0,
      is_deleted      INTEGER DEFAULT 0,
      deleted_at      TEXT,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (provider_id) REFERENCES api_providers(id) ON DELETE SET NULL
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_user ON tasks(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_created ON tasks(created_at)')
  db.run('CREATE INDEX IF NOT EXISTS idx_tasks_deleted ON tasks(is_deleted)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS images (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      task_id         INTEGER,
      
      image_hash      TEXT UNIQUE NOT NULL,
      file_path       TEXT NOT NULL,
      thumbnail_path  TEXT,
      file_size       INTEGER,
      width           INTEGER,
      height          INTEGER,
      mime_type       TEXT,
      
      source          TEXT DEFAULT 'generated' CHECK(source IN ('upload', 'generated', 'mask')),
      
      is_deleted      INTEGER DEFAULT 0,
      deleted_at      TEXT,
      deleted_by      INTEGER,
      
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_images_user ON images(user_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_images_task ON images(task_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_images_hash ON images(image_hash)')
  db.run('CREATE INDEX IF NOT EXISTS idx_images_deleted ON images(is_deleted)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_conversations (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id         INTEGER NOT NULL,
      title           TEXT,
      active_round_id TEXT,
      
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at      TEXT DEFAULT (datetime('now', 'localtime')),
      
      is_deleted      INTEGER DEFAULT 0,
      deleted_at      TEXT,
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_conversations_user ON agent_conversations(user_id)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_rounds (
      id              TEXT PRIMARY KEY,
      conversation_id INTEGER NOT NULL,
      user_id         INTEGER NOT NULL,
      round_index     INTEGER NOT NULL,
      parent_round_id TEXT,
      
      user_message_id TEXT,
      assistant_message_id TEXT,
      
      prompt          TEXT NOT NULL,
      input_image_ids TEXT,
      mask_image_id   INTEGER,
      output_task_ids TEXT,
      
      response_id     TEXT,
      response_output TEXT,
      
      status          TEXT DEFAULT 'running' CHECK(status IN ('running', 'done', 'error')),
      error_message   TEXT,
      
      created_at      TEXT DEFAULT (datetime('now', 'localtime')),
      finished_at     TEXT,
      
      FOREIGN KEY (conversation_id) REFERENCES agent_conversations(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_rounds_conversation ON agent_rounds(conversation_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_rounds_user ON agent_rounds(user_id)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS usage_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      task_id     INTEGER,
      model_id    TEXT,
      action      TEXT,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_usage_user_date ON usage_logs(user_id, created_at)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS refresh_tokens (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id     INTEGER NOT NULL,
      token       TEXT UNIQUE NOT NULL,
      expires_at  TEXT NOT NULL,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_token ON refresh_tokens(token)')
  db.run('CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id)')
  
  db.run(`
    CREATE TABLE IF NOT EXISTS system_settings (
      key         TEXT PRIMARY KEY,
      value       TEXT NOT NULL,
      updated_at  TEXT DEFAULT (datetime('now', 'localtime'))
    )
  `)
  
  db.run(`
    CREATE TABLE IF NOT EXISTS admin_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER NOT NULL,
      action      TEXT NOT NULL,
      target_type TEXT,
      target_id   INTEGER,
      detail      TEXT,
      ip_address  TEXT,
      created_at  TEXT DEFAULT (datetime('now', 'localtime')),
      
      FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `)
  
  db.run('CREATE INDEX IF NOT EXISTS idx_admin_logs_admin ON admin_logs(admin_id)')
  db.run('CREATE INDEX IF NOT EXISTS idx_admin_logs_created ON admin_logs(created_at)')
  
  // 插入默认系统配置
  const settings = [
    ['site', JSON.stringify({ name: 'GPT Image Playground', description: '' })],
    ['registration', JSON.stringify({ enabled: true, needApproval: false, defaultDailyLimit: 50, defaultMonthlyLimit: 1000 })],
    ['upload', JSON.stringify({ maxSizeMb: 50, maxReferenceImages: 16 })],
    ['rate_limit', JSON.stringify({ enabled: true, maxRequestsPerMinute: 30, maxRequestsPerHour: 200 })],
    ['email', JSON.stringify({ enabled: false, host: 'smtp.qq.com', port: 465, secure: true, user: '', pass: '', from: '' })],
  ]
  
  for (const [key, value] of settings) {
    db.run('INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)', [key, value])
  }
  
  // 创建默认管理员账号
  const adminPassword = '2076659780xmx'
  const adminHash = await bcrypt.hash(adminPassword, 10)
  
  const existingAdmin = db.exec('SELECT id FROM users WHERE username = ?', ['2076659780'])
  if (!existingAdmin.length || !existingAdmin[0].values.length) {
    db.run(`
      INSERT INTO users (username, email, password_hash, role, nickname, daily_limit, monthly_limit, total_limit, email_verified)
      VALUES (?, ?, ?, 'admin', ?, -1, -1, -1, 1)
    `, ['2076659780', '2076659780@qq.com', adminHash, '管理员'])
    console.log('默认管理员账号已创建: 2076659780')
  }
  
  // 保存数据库
  saveDatabase()
  
  console.log('数据库迁移完成!')
}

migrate().catch(err => {
  console.error('数据库迁移失败:', err)
  process.exit(1)
})
