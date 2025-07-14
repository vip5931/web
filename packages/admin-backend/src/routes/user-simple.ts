import Router from '@koa/router'
import bcrypt from 'bcryptjs'
import { sequelize } from '../config/database'

const router = new Router()

// 获取用户列表（包含角色信息）
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    let whereClause = ''
    const replacements: any[] = []

    if (search) {
      whereClause = 'WHERE u.username LIKE ? OR u.email LIKE ?'
      replacements.push(`%${search}%`, `%${search}%`)
    }

    // 获取总数
    const [countResult] = await sequelize.query(
      `
      SELECT COUNT(*) as total FROM users u ${whereClause}
    `,
      { replacements }
    )
    const total = (countResult as any[])[0].total

    // 获取用户列表（包含角色信息）
    const [users] = await sequelize.query(
      `
      SELECT
        u.id, u.username, u.email, u.status, u.avatar, u.last_login_at, u.created_at,
        r.id as role_id, r.name as role_name, r.code as role_code, r.level as role_level
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ${whereClause}
      ORDER BY u.created_at DESC
      LIMIT ? OFFSET ?
    `,
      {
        replacements: [...replacements, limit, offset]
      }
    )

    // 格式化数据
    const formattedUsers = (users as any[]).map(user => ({
      id: user.id,
      username: user.username,
      email: user.email,
      status: user.status,
      avatar: user.avatar,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
      role: user.role_id
        ? {
            id: user.role_id,
            name: user.role_name,
            code: user.role_code,
            level: user.role_level
          }
        : null
    }))

    ctx.body = {
      success: true,
      data: {
        users: formattedUsers,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
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
    const { username, email, password, roleId } = ctx.request.body as {
      username: string
      email: string
      password: string
      roleId?: number
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
    const [existingUser] = await sequelize.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      { replacements: [username, email] }
    )

    if ((existingUser as any[]).length > 0) {
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
    const [result] = await sequelize.query(
      `
      INSERT INTO users (username, email, password, status, created_at, updated_at)
      VALUES (?, ?, ?, 'active', NOW(), NOW())
    `,
      {
        replacements: [username, email, hashedPassword]
      }
    )

    const userId = (result as any).insertId

    // 分配角色（如果提供了）
    if (roleId) {
      await sequelize.query(
        `
        INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)
      `,
        { replacements: [userId, roleId] }
      )
    }

    ctx.body = {
      success: true,
      message: '用户创建成功'
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

// 更新用户
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { username, email, status, roleId } = ctx.request.body

    // 检查用户是否存在
    const [existing] = await sequelize.query('SELECT * FROM users WHERE id = ?', {
      replacements: [id]
    })

    if ((existing as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 构建更新语句
    const updates: string[] = []
    const replacements: any[] = []

    if (username) {
      updates.push('username = ?')
      replacements.push(username)
    }
    if (email) {
      updates.push('email = ?')
      replacements.push(email)
    }
    if (status) {
      updates.push('status = ?')
      replacements.push(status)
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()')
      replacements.push(id)
      await sequelize.query(
        `
        UPDATE users SET ${updates.join(', ')} WHERE id = ?
      `,
        { replacements }
      )
    }

    // 更新角色
    if (roleId !== undefined) {
      // 删除现有角色
      await sequelize.query('DELETE FROM user_roles WHERE user_id = ?', { replacements: [id] })

      // 分配新角色
      if (roleId) {
        await sequelize.query('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)', {
          replacements: [id, roleId]
        })
      }
    }

    ctx.body = {
      success: true,
      message: '用户更新成功'
    }
  } catch (error) {
    console.error('Update user error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新用户失败'
    }
  }
})

// 删除用户
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    // 检查用户是否存在
    const [existing] = await sequelize.query('SELECT username FROM users WHERE id = ?', {
      replacements: [id]
    })

    if ((existing as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 检查是否为系统管理员
    const user = (existing as any[])[0]
    if (user.username === 'admin') {
      ctx.status = 403
      ctx.body = {
        success: false,
        message: '不能删除系统管理员'
      }
      return
    }

    // 删除用户（级联删除角色关联）
    await sequelize.query('DELETE FROM users WHERE id = ?', { replacements: [id] })

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

// 切换用户状态
router.patch('/:id/status', async ctx => {
  try {
    const { id } = ctx.params
    const { status } = ctx.request.body

    await sequelize.query('UPDATE users SET status = ?, updated_at = NOW() WHERE id = ?', {
      replacements: [status, id]
    })

    ctx.body = {
      success: true,
      message: '用户状态更新成功'
    }
  } catch (error) {
    console.error('Toggle user status error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新用户状态失败'
    }
  }
})

export { router as userSimpleRoutes }
