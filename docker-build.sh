#!/bin/bash

# 构建 Docker 镜像
echo "正在构建 Docker 镜像..."
docker build -t gpt-image-playground .

if [ $? -ne 0 ]; then
  echo "构建失败！"
  exit 1
fi

echo "构建成功！"
echo ""
echo "运行命令："
echo "  docker run -d -p 3000:3000 -v ./data:/app/server/data gpt-image-playground"
echo ""
echo "或使用 docker-compose："
echo "  docker-compose up -d"
