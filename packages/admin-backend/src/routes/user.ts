import Router from '@koa/router'
import { Op } from 'sequelize'
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
    const { username, email, role, status } = ctx.request.body as {
      username?: string
      email?: string
      role?: 'admin' | 'user'
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

    await user.update({
      ...(username && { username }),
      ...(email && { email }),
      ...(role && { role }),
      ...(status && { status })
    })

    ctx.body = {
      success: true,
      message: '用户信息更新成功',
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
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
