import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { sequelize } from '../config/database'

// 认证中间件
export const authMiddleware = async (ctx: Context, next: Next) => {
  try {
    // 获取 token
    const token = ctx.headers.authorization?.replace('Bearer ', '')
    if (!token) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '未提供认证令牌'
      }
      return
    }

    // 验证 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id: number, username: string }
    
    // 获取用户信息
    const [users] = await sequelize.query(`
      SELECT u.id, u.username, u.email, u.status,
             r.id as role_id, r.name as role_name, r.code as role_code, r.level as role_level
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      WHERE u.id = ? AND u.status = 'active'
    `, { replacements: [decoded.id] })

    if (!users || (users as any[]).length === 0) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '用户不存在或已被禁用'
      }
      return
    }

    const user = (users as any[])[0]
    
    // 将用户信息添加到上下文
    ctx.state.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role_id ? {
        id: user.role_id,
        name: user.role_name,
        code: user.role_code,
        level: user.role_level
      } : null
    }

    await next()
  } catch (error) {
    console.error('Auth middleware error:', error)
    ctx.status = 401
    ctx.body = {
      success: false,
      message: '认证失败'
    }
  }
}

// 管理员权限检查中间件
export const adminMiddleware = async (ctx: Context, next: Next) => {
  const user = ctx.state.user
  
  if (!user || !user.role || user.role.level > 2) {
    ctx.status = 403
    ctx.body = {
      success: false,
      message: '权限不足，需要管理员权限'
    }
    return
  }

  await next()
}
