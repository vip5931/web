import Router from '@koa/router'
import { Op } from 'sequelize'
import bcrypt from 'bcryptjs'
import User from '../models/User'

const router = new Router()

// 获取用户列表
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    const whereCondition: any = {}
    if (search) {
      whereCondition[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ]
    }

    const { count, rows } = await User.findAndCountAll({
      where: whereCondition,
      attributes: { exclude: ['password'] },
      offset,
      limit,
      order: [['createdAt', 'DESC']]
    })

    ctx.body = {
      success: true,
      data: {
        users: rows,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total: count,
          totalPages: Math.ceil(count / Number(pageSize))
        }
      }
    }
  } catch (error) {
    console.error('Get users error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户列表失败'
    }
  }
})

// 创建用户
router.post('/', async ctx => {
  try {
    const {
      username,
      email,
      password,
      status = 'active'
    } = ctx.request.body as {
      username: string
      email: string
      password: string
      status?: 'active' | 'inactive'
    }

    // 验证必填字段
    if (!username || !email || !password) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '用户名、邮箱和密码为必填项'
      }
      return
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [{ username }, { email }]
      }
    })

    if (existingUser) {
      ctx.status = 400
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
      status
    })

    // 角色分配功能暂时禁用

    ctx.body = {
      success: true,
      message: '用户创建成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status,
          createdAt: user.createdAt
        }
      }
    }
  } catch (error) {
    console.error('Create user error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '创建用户失败'
    }
  }
})

// 获取单个用户
router.get('/:id', async ctx => {
  try {
    const { id } = ctx.params

    const user = await User.findByPk(id, {
      attributes: { exclude: ['password'] }
    })

    if (!user) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    ctx.body = {
      success: true,
      data: { user }
    }
  } catch (error) {
    console.error('Get user error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户信息失败'
    }
  }
})

// 更新用户
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { username, email, status } = ctx.request.body as {
      username?: string
      email?: string
      status?: 'active' | 'inactive'
    }

    const user = await User.findByPk(id)
    if (!user) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 保护管理员账户 - 防止修改 admin 用户的关键信息
    if (user.username === 'admin') {
      // 不允许修改管理员的用户名
      if (username && username !== 'admin') {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: '不能修改管理员用户名'
        }
        return
      }
    }

    // 更新用户基本信息
    await user.update({
      ...(username && { username }),
      ...(email && { email }),
      ...(status && { status })
    })

    // 角色更新功能暂时禁用

    ctx.body = {
      success: true,
      message: '用户信息更新成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          status: user.status
        }
      }
    }
  } catch (error) {
    console.error('Update user error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新用户信息失败'
    }
  }
})

// 删除用户
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    const user = await User.findByPk(id)
    if (!user) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 保护管理员账户 - 防止删除 admin 用户
    if (user.username === 'admin') {
      ctx.status = 403
      ctx.body = {
        success: false,
        message: '不能删除管理员账户'
      }
      return
    }

    // 角色关联删除功能暂时禁用

    await user.destroy()

    ctx.body = {
      success: true,
      message: '用户删除成功'
    }
  } catch (error) {
    console.error('Delete user error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除用户失败'
    }
  }
})

export { router as userRoutes }
