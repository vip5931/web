import Router from '@koa/router'
import { Op } from 'sequelize'
import { sequelize } from '../config/database'

const router = new Router()

// 获取角色列表
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    const whereCondition: any = {}
    if (search) {
      whereCondition[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { code: { [Op.like]: `%${search}%` } }
      ]
    }

    const { count, rows } = await Role.findAndCountAll({
      where: whereCondition,
      include: [
        {
          model: Permission,
          as: 'permissions',
          attributes: ['id', 'name', 'code', 'type'],
          through: { attributes: [] }
        }
      ],
      offset,
      limit,
      order: [
        ['sort', 'ASC'],
        ['createdAt', 'DESC']
      ]
    })

    ctx.body = {
      success: true,
      data: {
        roles: rows,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total: count,
          totalPages: Math.ceil(count / Number(pageSize))
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

// 获取单个角色
router.get('/:id', async ctx => {
  try {
    const { id } = ctx.params

    const role = await Role.findByPk(id, {
      include: [
        {
          model: Permission,
          as: 'permissions',
          through: { attributes: [] }
        }
      ]
    })

    if (!role) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    ctx.body = {
      success: true,
      data: { role }
    }
  } catch (error) {
    console.error('Get role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取角色信息失败'
    }
  }
})

// 创建角色
router.post('/', async ctx => {
  try {
    const {
      name,
      code,
      description,
      status = 'active',
      sort = 0,
      permissionIds = []
    } = ctx.request.body as {
      name: string
      code: string
      description?: string
      status?: 'active' | 'inactive'
      sort?: number
      permissionIds?: number[]
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
    const existingRole = await Role.findOne({ where: { code } })
    if (existingRole) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '角色编码已存在'
      }
      return
    }

    // 创建角色
    const role = await Role.create({
      name,
      code,
      description,
      status,
      sort
    })

    // 分配权限
    if (permissionIds.length > 0) {
      const rolePermissions = permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId
      }))
      await RolePermission.bulkCreate(rolePermissions)
    }

    ctx.body = {
      success: true,
      message: '角色创建成功',
      data: { role }
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
    const { name, code, description, status, sort, permissionIds } = ctx.request.body as {
      name?: string
      code?: string
      description?: string
      status?: 'active' | 'inactive'
      sort?: number
      permissionIds?: number[]
    }

    const role = await Role.findByPk(id)
    if (!role) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    // 检查编码是否已存在（排除当前角色）
    if (code && code !== role.code) {
      const existingRole = await Role.findOne({ where: { code } })
      if (existingRole) {
        ctx.status = 400
        ctx.body = {
          success: false,
          message: '角色编码已存在'
        }
        return
      }
    }

    // 更新角色信息
    await role.update({
      ...(name && { name }),
      ...(code && { code }),
      ...(description !== undefined && { description }),
      ...(status && { status }),
      ...(sort !== undefined && { sort })
    })

    // 更新权限
    if (permissionIds !== undefined) {
      // 删除原有权限
      await RolePermission.destroy({ where: { roleId: id } })

      // 添加新权限
      if (permissionIds.length > 0) {
        const rolePermissions = permissionIds.map(permissionId => ({
          roleId: Number(id),
          permissionId
        }))
        await RolePermission.bulkCreate(rolePermissions)
      }
    }

    ctx.body = {
      success: true,
      message: '角色更新成功',
      data: { role }
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

    const role = await Role.findByPk(id)
    if (!role) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    // 检查是否有用户使用此角色
    // TODO: 添加用户角色检查

    // 删除角色权限关联
    await RolePermission.destroy({ where: { roleId: id } })

    // 删除角色
    await role.destroy()

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
