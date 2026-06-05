# 多阶段构建
FROM node:20-alpine AS builder

WORKDIR /app

# 安装依赖
COPY package.json package-lock.json ./
COPY server/package.json server/package-lock.json ./server/
RUN npm ci
RUN cd server && npm ci

# 复制源码
COPY . .

# 构建前端
RUN npm run build:client

# 构建后端
RUN cd server && npm run build

# 生产镜像
FROM node:20-alpine

WORKDIR /app

# 安装生产依赖
COPY --from=builder /app/server/package.json /app/server/package-lock.json ./server/
RUN cd server && npm ci --production

# 复制构建产物
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server/data ./server/data

# 创建数据目录
RUN mkdir -p /app/server/data/uploads/images \
    /app/server/data/uploads/thumbnails \
    /app/server/data/uploads/avatars

# 环境变量
ENV NODE_ENV=production
ENV PORT=3000

# 暴露端口
EXPOSE 3000

# 启动
CMD ["node", "server/dist/index.js"]
