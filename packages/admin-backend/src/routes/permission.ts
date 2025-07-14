import Router from '@koa/router'
import { Op } from 'sequelize'
import { Permission } from '../models/associations'

const router = new Router()

// 获取权限树形列表
router.get('/tree', async ctx => {
  try {
    const permissions = await Permission.findAll({
      where: { status: 'active' },
      order: [['sort', 'ASC'], ['createdAt', 'ASC']]
    })

    // 构建树形结构
    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          ...item.toJSON(),
          children: buildTree(items, item.id)
        }))
    }

    const tree = buildTree(permissions)

    ctx.body = {
      success: true,
      data: tree
    }
  } catch (error) {
    console.error('Get permission tree error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取权限树失败'
    }
  }
})

// 获取权限列表
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '', type = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    const whereCondition: any = {}
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ]
    }
    if (type) {
      whereCondition.type = type
    }

    const { count, rows } = await Permission.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Permission,
          as: 'parent',
          attributes: ['id', 'name']
        }
      ],
      offset,
      limit,
      order: [['sort', 'ASC'], ['createdAt', 'DESC']]
    })

    ctx.body = {
      success: true,
      data: {
        permissions: rows,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total: count,
          totalPages: Math.ceil(count / Number(pageSize))
        }
      }
    }
  } catch (error) {
    console.error('Get permissions error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取权限列表失败'
    }
  }
})

// 创建权限
router.post('/', async ctx => {
  try {
    const {
      name,
      code,
      type,
      parentId,
      path,
      component,
      icon,
      sort = 0,
      status = 'active',
      description
    } = ctx.request.body as {
      name: string
      code: string
      type: 'menu' | 'button' | 'api'
      parentId?: number
      path?: string
      component?: string
      icon?: string
      sort?: number
      status?: 'active' | 'inactive'
      description?: string
    }

    // 验证必填字段
    if (!name || !code || !type) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '权限名称、编码和类型为必填项'
      }
      return
    }

    // 检查编码是否已存在
    const existingPermission = await Permission.findOne({ where: { code } })
    if (existingPermission) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '权限编码已存在'
      }
      return
    }

    // 创建权限
    const permission = await Permission.create({
      name,
      code,
      type,
      parentId,
      path,
      component,
      icon,
      sort,
      status,
      description
    })

    ctx.body = {
      success: true,
      message: '权限创建成功',
      data: { permission }
    }
  } catch (error) {
    console.error('Create permission error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '创建权限失败'
    }
  }
})

// 更新权限
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const updateData = ctx.request.body

    const permission = await Permission.findByPk(id)
    if (!permission) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '权限不存在'
      }
      return
    }

    // 检查编码是否已存在（排除当前权限）
    if (updateData.code && updateData.code !== permission.code) {
      const existingPermission = await Permission.findOne({ where: { code: updateData.code } })
      if (existingPermission) {
        ctx.status = 400
        ctx.body = {
          success: false,
          message: '权限编码已存在'
        }
        return
      }
    }

    await permission.update(updateData)

    ctx.body = {
      success: true,
      message: '权限更新成功',
      data: { permission }
    }
  } catch (error) {
    console.error('Update permission error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新权限失败'
    }
  }
})

// 删除权限
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    const permission = await Permission.findByPk(id)
    if (!permission) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '权限不存在'
      }
      return
    }

    // 检查是否有子权限
    const childCount = await Permission.count({ where: { parentId: id } })
    if (childCount > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '存在子权限，无法删除'
      }
      return
    }

    await permission.destroy()

    ctx.body = {
      success: true,
      message: '权限删除成功'
    }
  } catch (error) {
    console.error('Delete permission error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除权限失败'
    }
  }
})

export { router as permissionRoutes }
