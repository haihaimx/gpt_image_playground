# GPT Image Playground

基于 OpenAI gpt-image-2 API 的图片生成与编辑工具，支持 OpenAI / OpenAI 兼容接口。

## 功能特性

- **文生图**：输入文本描述，AI 生成图片
- **图片编辑**：支持参考图 + 遮罩编辑
- **Gallery 模式**：简单直观的单图生成
- **Agent 模式**：多轮对话式图片生成
- **本地存储**：数据纯本地化，支持历史记录和参数管理
- **API 代理**：解决浏览器直连外部 API 超时问题

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19 + TypeScript + Vite + TailwindCSS |
| 后端 | Node.js + Express + TypeScript + sql.js |
| 认证 | JWT + bcrypt |
| 存储 | sql.js (WebAssembly) |

## 快速开始

### 环境要求

- Node.js 18+
- npm 或 pnpm

### 安装

```bash
# 克隆仓库
git clone https://github.com/haihaimx/gpt_image_playground.git
cd gpt_image_playground

# 安装前端依赖
npm install

# 安装后端依赖
cd server
npm install
cd ..
```

### 配置

1. 启动后端服务：
```bash
cd server
npm run build
PORT=3002 nohup node dist/index.js > /tmp/backend.log 2>&1 &
```

2. 启动前端开发服务器：
```bash
nohup npx vite --port 5173 > /tmp/vite.log 2>&1 &
```

3. 访问 http://localhost:5173

### API 配置

在设置页面配置 API Provider：

| 字段 | 值 |
|------|-----|
| Base URL | `https://api.suchuang.vip/v1` |
| API Key | 你的 API Key |
| Model | `gpt-image-2` |

## 项目结构

```
gpt_image_playground/
├── src/                    # 前端源码
│   ├── components/         # React 组件
│   ├── lib/                # 工具函数和 API 客户端
│   ├── store.ts            # 状态管理
│   └── main.tsx            # 入口文件
├── server/                 # 后端源码
│   ├── src/
│   │   ├── routes/         # API 路由
│   │   ├── services/       # 业务逻辑
│   │   └── db/             # 数据库
│   └── data/               # 数据文件
├── vite.config.ts          # Vite 配置
├── dev-proxy.config.json   # API 代理配置
└── .env.local              # 环境变量
```

## API 代理

为解决浏览器直连外部 API 超时问题，项目内置了 Vite 代理：

- **代理路径**：`/api-proxy/*`
- **目标**：`https://api.suchuang.vip/v1`
- **超时**：10 分钟

前端自动通过代理发送请求，无需手动配置。

## 常见问题

### Q: 图片生成失败，提示 "Failed to fetch"

A: 已通过 API 代理解决此问题。确保 `vite.config.ts` 中的代理配置正确。

### Q: 如何更换 API Provider？

A: 在设置页面修改 Base URL 和 API Key，或在数据库 `server/data/app.db` 的 `api_providers` 表中直接修改。

### Q: 如何部署到生产环境？

A: 构建前端后将 `dist/` 目录部署到静态文件服务器，并配置反向代理到后端服务。

```bash
npm run build
```

## 相关链接

- [OpenAI API 文档](https://platform.openai.com/docs/api-reference/images)
- [gpt-image-2 模型说明](https://platform.openai.com/docs/models/gpt-image-2)

## 许可证

MIT License

---

*基于 [CookSleep/gpt_image_playground](https://github.com/CookSleep/gpt_image_playground) 修改*
