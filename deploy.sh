#!/bin/bash

# 部署脚本
echo "开始部署管理系统..."

# 检查 Node.js 版本
echo "检查 Node.js 版本..."
node --version

# 检查 pnpm
echo "检查 pnpm..."
pnpm --version

# 安装依赖
echo "安装依赖..."
pnpm install

# 构建前端
echo "构建前端..."
pnpm frontend:build

# 构建后端
echo "构建后端..."
pnpm backend:build

# 运行数据库迁移
echo "初始化数据库..."
cd packages/admin-backend
pnpm init-db
cd ../..

echo "部署完成！"
echo "前端访问地址: http://localhost:5173"
echo "后端访问地址: http://localhost:3000"
