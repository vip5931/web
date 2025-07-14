import Router from '@koa/router'
import { sequelize } from '../config/database'

const router = new Router()

// 获取角色列表
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    let whereClause = ''
    const replacements: any[] = []

    if (search) {
      whereClause = 'WHERE name LIKE ? OR code LIKE ?'
      replacements.push(`%${search}%`, `%${search}%`)
    }

    // 获取总数
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as total FROM roles ${whereClause}
    `, { replacements })
    const total = (countResult as any[])[0].total

    // 获取角色列表
    const [roles] = await sequelize.query(`
      SELECT * FROM roles ${whereClause}
      ORDER BY sort ASC, created_at DESC
      LIMIT ? OFFSET ?
    `, { 
      replacements: [...replacements, limit, offset]
    })

    ctx.body = {
      success: true,
      data: {
        roles,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    }
  } catch (error) {
    console.error('Get roles error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取角色列表失败'
    }
  }
})

// 创建角色
router.post('/', async ctx => {
  try {
    const { name, code, description, status = 'active', sort = 0 } = ctx.request.body as {
      name: string
      code: string
      description?: string
      status?: 'active' | 'inactive'
      sort?: number
    }

    // 验证必填字段
    if (!name || !code) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '角色名称和编码为必填项'
      }
      return
    }

    // 检查编码是否已存在
    const [existing] = await sequelize.query(
      'SELECT id FROM roles WHERE code = ?',
      { replacements: [code] }
    )
    
    if ((existing as any[]).length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '角色编码已存在'
      }
      return
    }

    // 创建角色
    await sequelize.query(`
      INSERT INTO roles (name, code, description, status, sort) 
      VALUES (?, ?, ?, ?, ?)
    `, {
      replacements: [name, code, description, status, sort]
    })

    ctx.body = {
      success: true,
      message: '角色创建成功'
    }
  } catch (error) {
    console.error('Create role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '创建角色失败'
    }
  }
})

// 更新角色
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { name, code, description, status, sort } = ctx.request.body

    // 检查角色是否存在
    const [existing] = await sequelize.query(
      'SELECT * FROM roles WHERE id = ?',
      { replacements: [id] }
    )
    
    if ((existing as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    // 构建更新语句
    const updates: string[] = []
    const replacements: any[] = []

    if (name) {
      updates.push('name = ?')
      replacements.push(name)
    }
    if (code) {
      updates.push('code = ?')
      replacements.push(code)
    }
    if (description !== undefined) {
      updates.push('description = ?')
      replacements.push(description)
    }
    if (status) {
      updates.push('status = ?')
      replacements.push(status)
    }
    if (sort !== undefined) {
      updates.push('sort = ?')
      replacements.push(sort)
    }

    if (updates.length > 0) {
      replacements.push(id)
      await sequelize.query(`
        UPDATE roles SET ${updates.join(', ')} WHERE id = ?
      `, { replacements })
    }

    ctx.body = {
      success: true,
      message: '角色更新成功'
    }
  } catch (error) {
    console.error('Update role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新角色失败'
    }
  }
})

// 删除角色
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    // 检查角色是否存在
    const [existing] = await sequelize.query(
      'SELECT * FROM roles WHERE id = ?',
      { replacements: [id] }
    )
    
    if ((existing as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    // 检查是否为系统角色
    const role = (existing as any[])[0]
    if (role.code === 'admin') {
      ctx.status = 403
      ctx.body = {
        success: false,
        message: '不能删除系统角色'
      }
      return
    }

    // 删除角色
    await sequelize.query('DELETE FROM roles WHERE id = ?', { replacements: [id] })

    ctx.body = {
      success: true,
      message: '角色删除成功'
    }
  } catch (error) {
    console.error('Delete role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除角色失败'
    }
  }
})

export { router as roleRoutes }
