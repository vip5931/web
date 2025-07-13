# 后台管理系统

基于 Vue3 + Koa2 + MySQL 的现代化后台管理系统，采用 pnpm monorepo 架构。

## 技术栈

### 前端
- Vue 3
- Vite
- Ant Design Vue
- TypeScript
- Vue Router
- Pinia

### 后端
- Koa2
- MySQL
- TypeScript
- JWT 认证
- Sequelize ORM

## 项目结构

```
admin-system/
├── packages/
│   ├── admin-frontend/     # 前端项目
│   └── admin-backend/      # 后端项目
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 开发环境要求

- Node.js >= 16.0.0
- pnpm >= 8.0.0
- MySQL >= 8.0

## 快速开始

### 安装依赖
```bash
pnpm install
```

### 启动开发环境
```bash
# 同时启动前后端
pnpm dev

# 或者分别启动
pnpm frontend:dev
pnpm backend:dev
```

### 构建项目
```bash
# 构建所有项目
pnpm build

# 或者分别构建
pnpm frontend:build
pnpm backend:build
```

## 开发规范

- 使用 TypeScript 进行开发
- 遵循 ESLint 和 Prettier 代码规范
- 提交代码前请运行 `pnpm lint` 检查代码质量

## 许可证

MIT
