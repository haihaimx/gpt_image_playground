# GPT Image Playground - 带用户系统的完整版

基于 [GPT Image Playground](https://github.com/CookSleep/gpt_image_playground) 改造，增加了完整的用户系统、后端管理和数据持久化。

---

## 功能特性

### 用户系统
- 用户注册/登录（支持邮箱验证）
- 密码找回（邮件重置链接）
- JWT 认证（access_token + refresh_token 双 token 机制）
- 用户数据隔离（每个用户只能访问自己的任务和图片）

### 管理后台
- 用户管理（查看/封禁/解封/删除/重置密码/设置使用限额）
- 任务管理（查看/搜索/删除）
- 图片管理（预览/搜索/删除）
- 模型配置（增删改查/启用禁用/设置支持的尺寸/质量/格式）
- 服务商管理（OpenAI / fal.ai / 自定义 OpenAI 兼容接口）
- 系统设置（站点信息/注册开关/上传限制/频率限制/邮箱配置）
- 操作日志（记录管理员的所有操作）

### 图片生成
- 支持 OpenAI Images API 和 Responses API
- 支持 fal.ai API
- 支持自定义 OpenAI 兼容 API
- 异步任务队列（支持长时间生成任务）
- 图片去重（SHA-256 哈希，节省存储空间）
- 支持文本生图、参考图编辑、遮罩编辑
- Agent 多轮对话模式（基于 Responses API）

### 安全特性
- 密码加密（bcrypt）
- 接口限流（每分钟/每小时）
- 使用次数限制（每日/每月/总次数，可按用户配置）
- 管理员操作日志审计

---

## 技术栈

- **前端**: React 19 + TypeScript + Tailwind CSS 3 + Zustand + Vite
- **后端**: Node.js + Express + TypeScript
- **数据库**: SQLite (sql.js)，纯本地文件存储
- **认证**: JWT + bcrypt
- **图片处理**: Sharp（缩略图生成）
- **部署**: Docker / Docker Compose

---

## 目录结构

```
gpt-image-playground/
├── src/                          # 前端源码 (React + TypeScript)
│   ├── components/
│   │   ├── admin/                # 管理后台组件
│   │   └── auth/                 # 登录/注册/密码找回组件
│   ├── lib/
│   │   ├── auth.ts               # 前端认证工具
│   │   ├── apiClient.ts          # API 请求客户端（自动附加 token）
│   │   └── backendTask.ts        # 后端任务提交与轮询
│   └── stores/
│       └── authStore.ts          # 认证状态管理（Zustand）
├── server/                       # 后端源码 (Express + TypeScript)
│   ├── src/
│   │   ├── app.ts                # Express 应用配置与路由注册
│   │   ├── index.ts              # 服务入口
│   │   ├── db/
│   │   │   ├── index.ts          # 数据库初始化与自动保存
│   │   │   ├── migrate.ts        # 数据库迁移脚本（建表 + 默认数据）
│   │   │   └── migrations/       # 迁移文件目录
│   │   ├── middleware/
│   │   │   ├── auth.ts           # JWT 认证中间件
│   │   │   ├── rateLimit.ts      # 接口限流中间件
│   │   │   └── usageLimit.ts     # 使用次数限制中间件
│   │   ├── routes/
│   │   │   ├── auth.ts           # 认证路由（注册/登录/刷新/登出）
│   │   │   ├── user.ts           # 用户信息路由
│   │   │   ├── task.ts           # 任务路由（创建/查询/轮询/删除）
│   │   │   ├── image.ts          # 图片路由（上传/查询/删除）
│   │   │   ├── model.ts          # 模型列表路由
│   │   │   └── admin/            # 管理后台路由
│   │   │       ├── users.ts      # 用户管理
│   │   │       ├── tasks.ts      # 任务管理
│   │   │       ├── images.ts     # 图片管理
│   │   │       ├── models.ts     # 模型管理
│   │   │       ├── providers.ts  # 服务商管理
│   │   │       ├── stats.ts      # 统计概览
│   │   │       └── settings.ts   # 系统设置
│   │   ├── services/
│   │   │   ├── api/              # API 调用服务
│   │   │   └── task.ts           # 任务处理服务
│   │   ├── types/                # TypeScript 类型定义
│   │   └── utils/                # 工具函数
│   ├── data/                     # 运行时数据目录
│   │   ├── app.db                # SQLite 数据库文件
│   │   └── uploads/              # 上传文件存储
│   │       ├── images/           # 原始图片
│   │       ├── thumbnails/       # 缩略图
│   │       └── avatars/          # 用户头像
│   ├── package.json
│   └── tsconfig.json
├── public/                       # 静态资源
├── docs/                         # 文档与截图
├── dist/                         # 前端构建产物（自动生成）
├── Dockerfile                    # Docker 构建文件（多阶段构建）
├── docker-compose.yml            # Docker Compose 配置
├── docker-build.sh               # Docker 构建脚本
├── package.json                  # 前端依赖与脚本
├── vite.config.ts                # Vite 配置
└── README.md                     # 英文说明文档
```

---

## 快速开始

### 方式一：本地开发环境

**前置要求：**
- Node.js >= 18（推荐 20+）
- npm >= 9

**步骤：**

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd gpt-image-playground

# 2. 安装前端依赖
npm install

# 3. 安装后端依赖
cd server
npm install
cd ..

# 4. 运行数据库迁移（建表 + 创建默认管理员）
npm run migrate

# 5. 启动开发服务器（前后端同时启动）
npm run dev
```

启动后访问：
- **前端**: http://localhost:5173
- **后端 API**: http://localhost:3000/api
- **健康检查**: http://localhost:3000/api/health

开发模式下前端通过 Vite 代理将 `/api` 请求转发到后端 3000 端口。

**可选 - 配置默认 API 地址：**

在项目根目录创建 `.env.local` 文件：

```env
VITE_DEFAULT_API_URL=https://api.openai.com/v1
```

**可选 - 本地跨域代理：**

如果遇到 CORS 问题，可配置本地代理：

```bash
cp dev-proxy.config.example.json dev-proxy.config.json
# 编辑 dev-proxy.config.json，设置 target 为真实 API 地址
```

---

### 方式二：Docker 部署

**前置要求：**
- Docker >= 20
- Docker Compose >= 2（可选）

#### 使用 Docker Compose（推荐）

```bash
# 1. 克隆项目
git clone <your-repo-url>
cd gpt-image-playground

# 2. 创建数据目录
mkdir -p data

# 3. 启动容器（首次启动会自动构建镜像、运行迁移、启动服务）
docker-compose up -d

# 4. 查看日志
docker-compose logs -f
```

启动后访问 http://localhost:3000

#### 使用 Docker CLI

```bash
# 1. 构建镜像
docker build -t gpt-image-playground .

# 2. 运行容器
docker run -d \
  --name gpt-image-playground \
  -p 3000:3000 \
  -v $(pwd)/data:/app/server/data \
  -e NODE_ENV=production \
  -e JWT_SECRET=your-secret-key-here \
  gpt-image-playground
```

#### 使用构建脚本

```bash
chmod +x docker-build.sh
./docker-build.sh
```

---

### 方式三：生产环境部署

**构建前端静态文件：**

```bash
npm run build:client
```

构建产物输出到 `dist/` 目录，可部署到任意静态文件服务器（Nginx、Vercel、Cloudflare Pages 等）。

**构建后端：**

```bash
cd server
npm run build
```

构建产物输出到 `server/dist/` 目录。

**启动生产服务：**

```bash
npm start
```

或直接运行：

```bash
cd server
node dist/index.js
```

---

## 环境变量

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `PORT` | 后端服务端口 | `3000` |
| `NODE_ENV` | 运行环境 (`development` / `production`) | `development` |
| `JWT_SECRET` | JWT 签名密钥（生产环境务必修改） | 内置默认值 |
| `DB_PATH` | SQLite 数据库文件路径 | `./data/app.db` |
| `VITE_DEFAULT_API_URL` | 前端默认 API 地址（构建时生效） | 空 |

**Docker 环境变量额外说明：**

在 `docker-compose.yml` 中配置：

```yaml
environment:
  - NODE_ENV=production
  - PORT=3000
  - JWT_SECRET=your-random-secret-key
  - DB_PATH=/app/server/data/app.db
```

---

## 默认管理员账号

| 字段 | 值 |
|------|----|
| 用户名 | `2076659780` |
| 密码 | `2076659780xmx` |

**首次登录后请立即修改密码！**

管理员可登录后访问管理后台，进行用户管理、模型配置、服务商管理等操作。

---

## API 接口文档

### 认证相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/api/auth/register` | 用户注册 |
| `POST` | `/api/auth/login` | 用户登录（返回 access_token + refresh_token） |
| `POST` | `/api/auth/refresh` | 刷新 access_token |
| `POST` | `/api/auth/logout` | 登出（清除 refresh_token） |
| `GET`  | `/api/auth/me` | 获取当前用户信息 |

### 用户相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/api/user/profile` | 获取个人资料 |
| `PUT`  | `/api/user/profile` | 更新个人资料 |
| `PUT`  | `/api/user/password` | 修改密码 |

### 任务相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/api/tasks` | 获取任务列表（分页） |
| `POST` | `/api/tasks` | 创建图片生成任务 |
| `GET`  | `/api/tasks/:id` | 获取任务详情 |
| `GET`  | `/api/tasks/:id/status` | 轮询任务状态（异步任务） |
| `DELETE` | `/api/tasks/:id` | 删除任务 |

### 图片相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/api/images` | 获取图片列表 |
| `POST` | `/api/images/upload` | 上传参考图 |
| `GET`  | `/api/images/:id` | 获取图片详情 |
| `DELETE` | `/api/images/:id` | 删除图片 |

### 模型相关

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET`  | `/api/models` | 获取可用模型列表 |

### 管理后台

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET/POST/PUT/DELETE` | `/api/admin/users/*` | 用户管理 |
| `GET/DELETE` | `/api/admin/tasks/*` | 任务管理 |
| `GET/DELETE` | `/api/admin/images/*` | 图片管理 |
| `GET/POST/PUT/DELETE` | `/api/admin/models/*` | 模型管理 |
| `GET/POST/PUT/DELETE` | `/api/admin/providers/*` | 服务商管理 |
| `GET` | `/api/admin/stats/overview` | 统计概览 |
| `GET/PUT` | `/api/admin/settings` | 系统设置 |
| `GET` | `/api/admin/settings/logs` | 操作日志 |

### 其他

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/api/health` | 健康检查 |

---

## 数据库表结构

项目使用 SQLite 数据库，通过迁移脚本自动创建以下表：

| 表名 | 说明 |
|------|------|
| `users` | 用户表（含角色、状态、使用限额） |
| `api_providers` | API 服务商配置表 |
| `models` | 模型配置表（关联服务商，配置支持的参数） |
| `tasks` | 图片生成任务表 |
| `images` | 图片记录表（SHA-256 去重） |
| `agent_conversations` | Agent 对话表 |
| `agent_rounds` | Agent 对话轮次表 |
| `usage_logs` | 使用记录日志表 |
| `refresh_tokens` | 刷新令牌表 |
| `system_settings` | 系统配置表（键值对） |
| `admin_logs` | 管理员操作日志表 |

---

## 常见问题

### Q: 如何修改默认管理员密码？
登录后进入管理后台 -> 用户管理 -> 编辑管理员用户 -> 修改密码。

### Q: 如何添加新的 API 服务商？
登录管理员账号 -> 管理后台 -> 服务商管理 -> 新增服务商，填写 API 地址和密钥，然后在模型管理中添加对应的模型。

### Q: 数据库文件在哪里？
默认在 `server/data/app.db`，Docker 部署时通过 volume 映射到宿主机的 `./data/app.db`。

### Q: 如何备份数据？
Docker 部署时，备份 `./data` 目录即可（包含数据库和上传的图片）。

### Q: 前端开发时如何连接后端？
`npm run dev` 会同时启动前端（5173 端口）和后端（3000 端口），Vite 会自动代理 `/api` 请求到后端。

---

## 许可证

MIT
