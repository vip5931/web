import Router from '@koa/router'
import { sequelize } from '../config/database'
import { authMiddleware, adminMiddleware } from '../middleware/auth'

const router = new Router()

// 获取用户权限信息
router.get('/user/:userId', async ctx => {
  try {
    const { userId } = ctx.params

    // 获取用户角色
    const [userRoles] = await sequelize.query(
      `
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `,
      { replacements: [userId] }
    )

    if (!userRoles || (userRoles as any[]).length === 0) {
      ctx.body = {
        success: false,
        message: '用户未分配角色'
      }
      return
    }

    const role = (userRoles as any[])[0]

    // 如果是超级管理员或管理员，返回所有权限
    if (role.level <= 2) {
      const [menus] = await sequelize.query(
        'SELECT * FROM menu_permissions WHERE status = "active" ORDER BY sort'
      )
      const [servers] = await sequelize.query(
        'SELECT * FROM game_servers WHERE status = "active" ORDER BY sort'
      )
      const [operations] = await sequelize.query('SELECT * FROM operation_permissions ORDER BY id')

      ctx.body = {
        success: true,
        data: {
          role,
          permissions: {
            menus,
            servers,
            operations,
            isFullAccess: true
          }
        }
      }
      return
    }

    // 普通员工，获取分配的权限
    const [staffPermissions] = await sequelize.query(
      `
      SELECT * FROM staff_permissions WHERE user_id = ?
    `,
      { replacements: [userId] }
    )

    if (!staffPermissions || (staffPermissions as any[]).length === 0) {
      ctx.body = {
        success: true,
        data: {
          role,
          permissions: {
            menus: [],
            servers: [],
            operations: [],
            isFullAccess: false
          }
        }
      }
      return
    }

    const permission = (staffPermissions as any[])[0]

    // 获取具体的权限数据
    const menuIds = JSON.parse(permission.menu_permissions || '[]')
    const serverIds = JSON.parse(permission.server_permissions || '[]')
    const operationIds = JSON.parse(permission.operation_permissions || '[]')

    const [menus] = await sequelize.query(`
      SELECT * FROM menu_permissions WHERE id IN (${menuIds.length ? menuIds.join(',') : '0'}) AND status = "active"
    `)
    const [servers] = await sequelize.query(`
      SELECT * FROM game_servers WHERE id IN (${serverIds.length ? serverIds.join(',') : '0'}) AND status = "active"
    `)
    const [operations] = await sequelize.query(`
      SELECT * FROM operation_permissions WHERE id IN (${operationIds.length ? operationIds.join(',') : '0'})
    `)

    ctx.body = {
      success: true,
      data: {
        role,
        permissions: {
          menus,
          servers,
          operations,
          isFullAccess: false
        }
      }
    }
  } catch (error) {
    console.error('Get user permissions error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户权限失败'
    }
  }
})

// 获取所有菜单权限
router.get('/menus', async ctx => {
  try {
    const [menus] = await sequelize.query(`
      SELECT * FROM menu_permissions WHERE status = 'active' ORDER BY sort, id
    `)

    // 构建树形结构
    const buildTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parent_id === parentId)
        .map(item => ({
          ...item,
          children: buildTree(items, item.id)
        }))
    }

    const tree = buildTree(menus as any[])

    ctx.body = {
      success: true,
      data: tree
    }
  } catch (error) {
    console.error('Get menus error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取菜单权限失败'
    }
  }
})

// 获取所有区服
router.get('/servers', async ctx => {
  try {
    const [servers] = await sequelize.query(`
      SELECT * FROM game_servers WHERE status = 'active' ORDER BY sort, id
    `)

    ctx.body = {
      success: true,
      data: servers
    }
  } catch (error) {
    console.error('Get servers error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取区服列表失败'
    }
  }
})

// 获取所有操作权限
router.get('/operations', async ctx => {
  try {
    const [operations] = await sequelize.query(`
      SELECT * FROM operation_permissions ORDER BY id
    `)

    ctx.body = {
      success: true,
      data: operations
    }
  } catch (error) {
    console.error('Get operations error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取操作权限失败'
    }
  }
})

// 设置员工权限（仅管理员可用）
router.post('/staff/:userId', async ctx => {
  try {
    const { userId } = ctx.params
    const { menuIds, serverIds, operationIds } = ctx.request.body as {
      menuIds: number[]
      serverIds: number[]
      operationIds: number[]
    }

    // 获取admin用户ID作为创建者
    const [adminUsers] = await sequelize.query(`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `)

    const currentUserId =
      adminUsers && (adminUsers as any[]).length > 0 ? (adminUsers as any[])[0].id : 5 // 备用ID

    // 检查目标用户是否为普通员工
    const [userRoles] = await sequelize.query(
      `
      SELECT r.level FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `,
      { replacements: [userId] }
    )

    if (!userRoles || (userRoles as any[]).length === 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '用户未分配角色'
      }
      return
    }

    const userRole = (userRoles as any[])[0]
    if (userRole.level <= 2) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '不能设置管理员权限'
      }
      return
    }

    // 更新或插入员工权限
    const menuPermissions = JSON.stringify(menuIds || [])
    const serverPermissions = JSON.stringify(serverIds || [])
    const operationPermissions = JSON.stringify(operationIds || [])

    console.log('Saving permissions:', {
      userId,
      menuPermissions,
      serverPermissions,
      operationPermissions,
      currentUserId
    })

    await sequelize.query(
      `
      INSERT INTO staff_permissions (user_id, menu_permissions, server_permissions, operation_permissions, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      menu_permissions = VALUES(menu_permissions),
      server_permissions = VALUES(server_permissions),
      operation_permissions = VALUES(operation_permissions),
      created_by = VALUES(created_by),
      updated_at = CURRENT_TIMESTAMP
    `,
      {
        replacements: [
          userId,
          menuPermissions,
          serverPermissions,
          operationPermissions,
          currentUserId
        ]
      }
    )

    ctx.body = {
      success: true,
      message: '员工权限设置成功'
    }
  } catch (error) {
    console.error('Set staff permissions error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '设置员工权限失败'
    }
  }
})

// 获取员工权限配置
router.get('/staff/:userId', async ctx => {
  try {
    const { userId } = ctx.params

    const [permissions] = await sequelize.query(
      `
      SELECT * FROM staff_permissions WHERE user_id = ?
    `,
      { replacements: [userId] }
    )

    if (!permissions || (permissions as any[]).length === 0) {
      ctx.body = {
        success: true,
        data: {
          menuIds: [],
          serverIds: [],
          operationIds: []
        }
      }
      return
    }

    const permission = (permissions as any[])[0]

    // 安全的数据解析（MySQL JSON字段可能返回数组或字符串）
    const parseDataSafely = (data: any, defaultValue: any[] = []) => {
      try {
        if (!data) {
          return defaultValue
        }
        // 如果已经是数组，直接返回
        if (Array.isArray(data)) {
          return data
        }
        // 如果是字符串，尝试解析
        if (typeof data === 'string') {
          if (data.trim() === '') {
            return defaultValue
          }
          return JSON.parse(data)
        }
        return defaultValue
      } catch (error) {
        console.warn('Data parse error:', error, 'for data:', data)
        return defaultValue
      }
    }

    const result = {
      menuIds: parseDataSafely(permission.menu_permissions),
      serverIds: parseDataSafely(permission.server_permissions),
      operationIds: parseDataSafely(permission.operation_permissions)
    }

    console.log('Returning permissions for user', userId, ':', result)

    ctx.body = {
      success: true,
      data: result
    }
  } catch (error) {
    console.error('Get staff permissions error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取员工权限失败'
    }
  }
})

export { router as gamePermissionRoutes }
