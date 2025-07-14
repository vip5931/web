import 'dotenv/config'
import Koa from 'koa'
import cors from '@koa/cors'
import logger from 'koa-logger'
import { koaBody } from 'koa-body'
import Router from '@koa/router'

import { errorHandler } from './middleware/errorHandler'
import { authRoutes } from './routes/auth'
import { userSimpleRoutes } from './routes/user-simple'
import { userRoleRoutes } from './routes/user-roles'
import { gamePermissionRoutes } from './routes/game-permission'
import { rankingRoutes } from './routes/ranking'
import { menuRoutes } from './routes/menu'
import { serverRoutes } from './routes/server'
import { connectDatabase } from './config/database'

const app = new Koa()
const router = new Router()

// 中间件
app.use(errorHandler)
app.use(logger())
app.use(
  cors({
    origin: '*', // 开发环境允许所有来源
    credentials: true
  })
)
app.use(
  koaBody({
    multipart: true,
    formidable: {
      maxFileSize: 10 * 1024 * 1024 // 10MB
    }
  })
)

// 路由
router.use('/api/auth', authRoutes.routes())
router.use('/api/users', userSimpleRoutes.routes())
router.use('/api/user-roles', userRoleRoutes.routes())
router.use('/api/game-permissions', gamePermissionRoutes.routes())
router.use('/api/ranking', rankingRoutes.routes())
router.use('/api/menus', menuRoutes.routes())
router.use('/api/servers', serverRoutes.routes())

// 健康检查
router.get('/health', ctx => {
  ctx.body = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    message: 'Admin Backend API is running'
  }
})

app.use(router.routes())
app.use(router.allowedMethods())

const PORT = process.env.PORT || 3000

const startServer = async () => {
  try {
    // 连接数据库
    await connectDatabase()

    // 启动服务器
    app.listen(PORT, () => {
      console.log(`🚀 Server is running on http://localhost:${PORT}`)
      console.log(`📊 Health check: http://localhost:${PORT}/health`)
    })
  } catch (error) {
    console.error('❌ Failed to start server:', error)
    process.exit(1)
  }
}

startServer()

export default app
