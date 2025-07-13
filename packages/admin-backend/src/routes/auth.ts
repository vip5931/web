import Router from '@koa/router'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { Op } from 'sequelize'
import User from '../models/User'

const router = new Router()

// 登录
router.post('/login', async ctx => {
  const { username, password } = ctx.request.body as { username: string; password: string }

  if (!username || !password) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '用户名和密码不能为空'
    }
    return
  }

  try {
    // 查找用户（包含密码字段用于验证）
    const user = await User.findOne({
      where: { username },
      attributes: ['id', 'username', 'email', 'password', 'role', 'status', 'avatar']
    })

    console.log(
      'Found user:',
      user ? { id: user.id, username: user.username, hasPassword: !!user.password } : null
    )

    if (!user) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '用户名或密码错误'
      }
      return
    }

    // 验证密码
    console.log('Comparing password:', {
      inputPassword: password,
      storedPassword: user.password ? 'exists' : 'missing'
    })
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '用户名或密码错误'
      }
      return
    }

    // 检查用户状态
    if (user.status !== 'active') {
      ctx.status = 403
      ctx.body = {
        success: false,
        message: '账户已被禁用'
      }
      return
    }

    // 生成 JWT token
    const token = jwt.sign(
      {
        id: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '24h' }
    )

    // 更新最后登录时间
    await user.update({ lastLoginAt: new Date() })

    ctx.body = {
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          avatar: user.avatar
        }
      }
    }
  } catch (error) {
    console.error('Login error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '登录失败，请稍后重试'
    }
  }
})

// 注册
router.post('/register', async ctx => {
  const { username, email, password } = ctx.request.body as {
    username: string
    email: string
    password: string
  }

  if (!username || !email || !password) {
    ctx.status = 400
    ctx.body = {
      success: false,
      message: '用户名、邮箱和密码不能为空'
    }
    return
  }

  try {
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    })

    if (existingUser) {
      ctx.status = 409
      ctx.body = {
        success: false,
        message: '用户名或邮箱已存在'
      }
      return
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10)

    // 创建用户
    const user = await User.create({
      username,
      email,
      password: hashedPassword,
      role: 'user',
      status: 'active'
    })

    ctx.body = {
      success: true,
      message: '注册成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    }
  } catch (error) {
    console.error('Register error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '注册失败，请稍后重试'
    }
  }
})

export { router as authRoutes }
