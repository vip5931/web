import Router from '@koa/router'
import { sequelize } from '../config/database'

const router = new Router()

// 获取区服列表（支持分页）
router.get('/', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '' } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    let whereClause = ''
    const replacements: any[] = []

    if (search) {
      whereClause = 'WHERE name LIKE ?'
      replacements.push(`%${search}%`)
    }

    // 获取总数
    const [countResult] = await sequelize.query(
      `SELECT COUNT(*) as total FROM servers ${whereClause}`,
      { replacements }
    )
    const total = (countResult as any[])[0].total

    // 获取分页数据
    const [servers] = await sequelize.query(
      `
      SELECT id, name, code, region, status, description, max_players, open_time, created_at, updated_at
      FROM servers
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `,
      { replacements: [...replacements, limit, offset] }
    )

    ctx.body = {
      success: true,
      data: {
        servers,
        total,
        current: Number(page),
        pageSize: Number(pageSize),
        totalPages: Math.ceil(total / Number(pageSize))
      }
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

// 获取用户可访问的区服列表
router.get('/user-servers', async ctx => {
  try {
    const userId = ctx.query.userId || 5 // 从JWT或query获取用户ID

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
        success: true,
        data: []
      }
      return
    }

    const role = (userRoles as any[])[0]

    // 超级管理员和管理员可以看到所有区服
    if (role.level <= 2) {
      // 从数据库servers表中获取所有区服
      const [allServers] = await sequelize.query(`
        SELECT id, name, code, region, status
        FROM servers
        WHERE status = 'active'
        ORDER BY name
      `)

      ctx.body = {
        success: true,
        data: allServers
      }
      return
    }

    // 普通员工根据分配的权限显示区服
    const [staffPermissions] = await sequelize.query(
      `
      SELECT server_permissions FROM staff_permissions WHERE user_id = ?
    `,
      { replacements: [userId] }
    )

    let allowedServerIds: number[] = []

    if (staffPermissions && (staffPermissions as any[]).length > 0) {
      const permission = (staffPermissions as any[])[0]
      const serverPermissions = permission.server_permissions

      // 安全解析区服权限（这里存储的是区服ID）
      if (serverPermissions) {
        try {
          if (Array.isArray(serverPermissions)) {
            allowedServerIds = serverPermissions
          } else if (typeof serverPermissions === 'string') {
            const parsed = JSON.parse(serverPermissions)
            if (Array.isArray(parsed)) {
              allowedServerIds = parsed
            }
          }
        } catch (error) {
          console.warn('Failed to parse server permissions:', error)
        }
      }
    }

    // 根据区服ID获取区服详细信息
    if (allowedServerIds.length > 0) {
      const placeholders = allowedServerIds.map(() => '?').join(',')
      const [userServers] = await sequelize.query(
        `
        SELECT id, name, code, region, status
        FROM servers
        WHERE id IN (${placeholders}) AND status = 'active'
        ORDER BY name
      `,
        { replacements: allowedServerIds }
      )

      ctx.body = {
        success: true,
        data: userServers
      }
    } else {
      ctx.body = {
        success: true,
        data: []
      }
    }
  } catch (error) {
    console.error('Get user servers error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户区服失败'
    }
  }
})

// 获取所有区服列表（管理员用）
router.get('/all', async ctx => {
  try {
    const [allServers] = await sequelize.query(`
      SELECT id, name, code, region, status, description, max_players, open_time, created_at, updated_at
      FROM servers
      ORDER BY region, name
    `)

    ctx.body = {
      success: true,
      data: allServers
    }
  } catch (error) {
    console.error('Get all servers error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取区服列表失败'
    }
  }
})

// 创建区服
router.post('/', async ctx => {
  try {
    const { name } = ctx.request.body

    if (!name) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '区服名称为必填项'
      }
      return
    }

    // 生成默认的区服编码（基于名称）
    const code = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').substring(0, 20)

    // 检查名称和编码是否已存在
    const [existing] = await sequelize.query('SELECT id FROM servers WHERE name = ? OR code = ?', {
      replacements: [name, code]
    })

    if ((existing as any[]).length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '区服名称已存在'
      }
      return
    }

    await sequelize.query(
      `
      INSERT INTO servers (name, code, region, status)
      VALUES (?, ?, ?, ?)
    `,
      {
        replacements: [name, code, '默认', 'active']
      }
    )

    ctx.body = {
      success: true,
      message: '区服创建成功'
    }
  } catch (error) {
    console.error('Create server error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '创建区服失败'
    }
  }
})

// 更新区服
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { name } = ctx.request.body

    if (!name) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '区服名称为必填项'
      }
      return
    }

    // 生成新的区服编码（基于名称）
    const code = name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '').substring(0, 20)

    // 检查名称和编码是否已存在（排除当前记录）
    const [existing] = await sequelize.query(
      'SELECT id FROM servers WHERE (name = ? OR code = ?) AND id != ?',
      {
        replacements: [name, code, id]
      }
    )

    if ((existing as any[]).length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '区服名称已存在'
      }
      return
    }

    await sequelize.query(
      `
      UPDATE servers SET name = ?, code = ?, updated_at = NOW() WHERE id = ?
    `,
      { replacements: [name, code, id] }
    )

    ctx.body = {
      success: true,
      message: '区服更新成功'
    }
  } catch (error) {
    console.error('Update server error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新区服失败'
    }
  }
})

// 删除区服
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    // 检查是否有相关数据
    const [serverInfo] = await sequelize.query('SELECT name FROM servers WHERE id = ?', {
      replacements: [id]
    })

    if ((serverInfo as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '区服不存在'
      }
      return
    }

    const serverName = (serverInfo as any[])[0].name

    // 检查是否有排行榜数据
    const [playerData] = await sequelize.query(
      'SELECT COUNT(*) as count FROM rank_list WHERE server_name = ?',
      { replacements: [serverName] }
    )

    const [schoolData] = await sequelize.query(
      'SELECT COUNT(*) as count FROM school WHERE server = ?',
      { replacements: [serverName] }
    )

    const playerCount = (playerData as any[])[0].count
    const schoolCount = (schoolData as any[])[0].count

    if (playerCount > 0 || schoolCount > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: `该区服还有 ${playerCount} 个玩家和 ${schoolCount} 个门派数据，请先清理数据后再删除`
      }
      return
    }

    await sequelize.query('DELETE FROM servers WHERE id = ?', {
      replacements: [id]
    })

    ctx.body = {
      success: true,
      message: '区服删除成功'
    }
  } catch (error) {
    console.error('Delete server error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除区服失败'
    }
  }
})

// 获取区服统计信息
router.get('/stats', async ctx => {
  try {
    const userId = Number(ctx.query.userId) || 5

    // 获取用户可访问的区服
    const userServersResponse = await getUserServers(userId)
    const userServers = userServersResponse.data.map((s: any) => s.name)

    if (userServers.length === 0) {
      ctx.body = {
        success: true,
        data: {
          totalServers: 0,
          serverStats: []
        }
      }
      return
    }

    const placeholders = userServers.map(() => '?').join(',')

    // 获取每个区服的统计信息
    const [serverStats] = await sequelize.query(
      `
      SELECT
        server_name as name,
        COUNT(*) as player_count,
        MAX(combat_power) as max_power,
        AVG(combat_power) as avg_power
      FROM rank_list
      WHERE server_name IN (${placeholders})
      GROUP BY server_name
      ORDER BY player_count DESC
    `,
      { replacements: userServers }
    )

    const [schoolStats] = await sequelize.query(
      `
      SELECT
        server as name,
        COUNT(*) as school_count,
        MAX(power) as max_school_power,
        AVG(power) as avg_school_power
      FROM school
      WHERE server IN (${placeholders})
      GROUP BY server
      ORDER BY school_count DESC
    `,
      { replacements: userServers }
    )

    ctx.body = {
      success: true,
      data: {
        totalServers: userServers.length,
        serverStats,
        schoolStats
      }
    }
  } catch (error) {
    console.error('Get server stats error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取区服统计失败'
    }
  }
})

// 辅助函数：获取用户区服
async function getUserServers(userId: number) {
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
    return { success: true, data: [] }
  }

  const role = (userRoles as any[])[0]

  // 超级管理员和管理员可以看到所有区服
  if (role.level <= 2) {
    const [allServers] = await sequelize.query(`
      SELECT DISTINCT server_name as name FROM rank_list
      UNION
      SELECT DISTINCT server as name FROM school
      ORDER BY name
    `)
    return { success: true, data: allServers }
  }

  // 普通员工根据权限
  const [staffPermissions] = await sequelize.query(
    `
    SELECT server_permissions FROM staff_permissions WHERE user_id = ?
  `,
    { replacements: [userId] }
  )

  let allowedServers: string[] = []

  if (staffPermissions && (staffPermissions as any[]).length > 0) {
    const permission = (staffPermissions as any[])[0]
    const serverPermissions = permission.server_permissions

    if (serverPermissions) {
      try {
        if (Array.isArray(serverPermissions)) {
          allowedServers = serverPermissions
        } else if (typeof serverPermissions === 'string') {
          const parsed = JSON.parse(serverPermissions)
          if (Array.isArray(parsed)) {
            allowedServers = parsed
          }
        }
      } catch (error) {
        console.warn('Failed to parse server permissions:', error)
      }
    }
  }

  if (allowedServers.length > 0) {
    const placeholders = allowedServers.map(() => '?').join(',')
    const [userServers] = await sequelize.query(
      `
      SELECT DISTINCT server_name as name FROM rank_list WHERE server_name IN (${placeholders})
      UNION
      SELECT DISTINCT server as name FROM school WHERE server IN (${placeholders})
      ORDER BY name
    `,
      { replacements: [...allowedServers, ...allowedServers] }
    )

    return { success: true, data: userServers }
  }

  return { success: true, data: [] }
}

export { router as serverRoutes }
