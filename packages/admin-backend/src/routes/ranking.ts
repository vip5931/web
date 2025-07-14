import Router from '@koa/router'
import { sequelize } from '../config/database'

const router = new Router()

// 获取玩家排行榜
router.get('/players', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '', server = '', userId = 5 } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    // 获取用户可访问的区服
    const userServers = await getUserAllowedServers(Number(userId))

    if (userServers.length === 0) {
      ctx.body = {
        success: true,
        data: {
          players: [],
          servers: [],
          pagination: {
            current: Number(page),
            pageSize: Number(pageSize),
            total: 0,
            totalPages: 0
          }
        }
      }
      return
    }

    let whereClause = ''
    const replacements: any[] = []

    // 构建查询条件
    const conditions: string[] = []

    // 添加区服权限限制
    const serverPlaceholders = userServers.map(() => '?').join(',')
    conditions.push(`server_name IN (${serverPlaceholders})`)
    replacements.push(...userServers)

    if (search) {
      conditions.push('role_name LIKE ?')
      replacements.push(`%${search}%`)
    }
    if (server) {
      conditions.push('server_name = ?')
      replacements.push(server)
    }

    whereClause = 'WHERE ' + conditions.join(' AND ')

    // 获取总数
    const [countResult] = await sequelize.query(
      `
      SELECT COUNT(*) as total FROM rank_list ${whereClause}
    `,
      { replacements }
    )
    const total = (countResult as any[])[0].total

    // 获取排行榜数据
    const [players] = await sequelize.query(
      `
      SELECT
        id, role_name, profession, combat_power, server_name,
        create_time, update_time,
        ROW_NUMBER() OVER (ORDER BY combat_power DESC) as ranking
      FROM rank_list
      ${whereClause}
      ORDER BY combat_power DESC
      LIMIT ? OFFSET ?
    `,
      {
        replacements: [...replacements, limit, offset]
      }
    )

    // 获取所有区服列表（用于筛选）
    const [servers] = await sequelize.query(`
      SELECT DISTINCT server_name FROM rank_list ORDER BY server_name
    `)

    ctx.body = {
      success: true,
      data: {
        players,
        servers,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    }
  } catch (error) {
    console.error('Get player ranking error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取玩家排行失败'
    }
  }
})

// 获取门派排行榜
router.get('/schools', async ctx => {
  try {
    const { page = 1, pageSize = 10, search = '', server = '', userId = 5 } = ctx.query

    const offset = (Number(page) - 1) * Number(pageSize)
    const limit = Number(pageSize)

    // 获取用户可访问的区服
    const userServers = await getUserAllowedServers(Number(userId))

    if (userServers.length === 0) {
      ctx.body = {
        success: true,
        data: {
          schools: [],
          servers: [],
          pagination: {
            current: Number(page),
            pageSize: Number(pageSize),
            total: 0,
            totalPages: 0
          }
        }
      }
      return
    }

    let whereClause = ''
    const replacements: any[] = []

    // 构建查询条件
    const conditions: string[] = []

    // 添加区服权限限制
    const serverPlaceholders = userServers.map(() => '?').join(',')
    conditions.push(`server IN (${serverPlaceholders})`)
    replacements.push(...userServers)

    if (search) {
      conditions.push('name LIKE ?')
      replacements.push(`%${search}%`)
    }
    if (server) {
      conditions.push('server = ?')
      replacements.push(server)
    }

    whereClause = 'WHERE ' + conditions.join(' AND ')

    // 获取总数
    const [countResult] = await sequelize.query(
      `
      SELECT COUNT(*) as total FROM school ${whereClause}
    `,
      { replacements }
    )
    const total = (countResult as any[])[0].total

    // 获取门派排行榜数据
    const [schools] = await sequelize.query(
      `
      SELECT
        id, name, server, power, master_name,
        create_time, update_time,
        ROW_NUMBER() OVER (ORDER BY power DESC) as ranking
      FROM school
      ${whereClause}
      ORDER BY power DESC
      LIMIT ? OFFSET ?
    `,
      {
        replacements: [...replacements, limit, offset]
      }
    )

    // 获取所有区服列表（用于筛选）
    const [servers] = await sequelize.query(`
      SELECT DISTINCT server FROM school ORDER BY server
    `)

    ctx.body = {
      success: true,
      data: {
        schools,
        servers,
        pagination: {
          current: Number(page),
          pageSize: Number(pageSize),
          total,
          totalPages: Math.ceil(total / Number(pageSize))
        }
      }
    }
  } catch (error) {
    console.error('Get school ranking error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取门派排行失败'
    }
  }
})

// 更新玩家数据
router.put('/players/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { role_name, profession, combat_power, server_name } = ctx.request.body

    // 构建更新语句
    const updates: string[] = []
    const replacements: any[] = []

    if (role_name) {
      updates.push('role_name = ?')
      replacements.push(role_name)
    }
    if (profession) {
      updates.push('profession = ?')
      replacements.push(profession)
    }
    if (combat_power !== undefined) {
      updates.push('combat_power = ?')
      replacements.push(combat_power)
    }
    if (server_name) {
      updates.push('server_name = ?')
      replacements.push(server_name)
    }

    if (updates.length > 0) {
      replacements.push(id)
      await sequelize.query(
        `
        UPDATE rank_list SET ${updates.join(', ')}, update_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        { replacements }
      )
    }

    ctx.body = {
      success: true,
      message: '玩家数据更新成功'
    }
  } catch (error) {
    console.error('Update player error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新玩家数据失败'
    }
  }
})

// 更新门派数据
router.put('/schools/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { name, server, power, master_name } = ctx.request.body

    // 构建更新语句
    const updates: string[] = []
    const replacements: any[] = []

    if (name) {
      updates.push('name = ?')
      replacements.push(name)
    }
    if (server) {
      updates.push('server = ?')
      replacements.push(server)
    }
    if (power !== undefined) {
      updates.push('power = ?')
      replacements.push(power)
    }
    if (master_name) {
      updates.push('master_name = ?')
      replacements.push(master_name)
    }

    if (updates.length > 0) {
      replacements.push(id)
      await sequelize.query(
        `
        UPDATE school SET ${updates.join(', ')}, update_time = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
        { replacements }
      )
    }

    ctx.body = {
      success: true,
      message: '门派数据更新成功'
    }
  } catch (error) {
    console.error('Update school error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新门派数据失败'
    }
  }
})

// 删除玩家数据
router.delete('/players/:id', async ctx => {
  try {
    const { id } = ctx.params

    await sequelize.query('DELETE FROM rank_list WHERE id = ?', {
      replacements: [id]
    })

    ctx.body = {
      success: true,
      message: '玩家数据删除成功'
    }
  } catch (error) {
    console.error('Delete player error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除玩家数据失败'
    }
  }
})

// 删除门派数据
router.delete('/schools/:id', async ctx => {
  try {
    const { id } = ctx.params

    await sequelize.query('DELETE FROM school WHERE id = ?', {
      replacements: [id]
    })

    ctx.body = {
      success: true,
      message: '门派数据删除成功'
    }
  } catch (error) {
    console.error('Delete school error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除门派数据失败'
    }
  }
})

// 获取排行榜统计信息
router.get('/stats', async ctx => {
  try {
    // 玩家统计
    const [playerStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_players,
        COUNT(DISTINCT server_name) as total_servers,
        COUNT(DISTINCT profession) as total_professions,
        MAX(combat_power) as max_power,
        AVG(combat_power) as avg_power
      FROM rank_list
    `)

    // 门派统计
    const [schoolStats] = await sequelize.query(`
      SELECT
        COUNT(*) as total_schools,
        COUNT(DISTINCT server) as school_servers,
        MAX(power) as max_school_power,
        AVG(power) as avg_school_power
      FROM school
    `)

    // 各区服玩家数量
    const [serverPlayerCounts] = await sequelize.query(`
      SELECT server_name, COUNT(*) as player_count
      FROM rank_list
      GROUP BY server_name
      ORDER BY player_count DESC
    `)

    // 各区服门派数量
    const [serverSchoolCounts] = await sequelize.query(`
      SELECT server, COUNT(*) as school_count
      FROM school
      GROUP BY server
      ORDER BY school_count DESC
    `)

    ctx.body = {
      success: true,
      data: {
        playerStats: (playerStats as any[])[0],
        schoolStats: (schoolStats as any[])[0],
        serverPlayerCounts,
        serverSchoolCounts
      }
    }
  } catch (error) {
    console.error('Get ranking stats error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取排行统计失败'
    }
  }
})

// 辅助函数：获取用户允许访问的区服
async function getUserAllowedServers(userId: number): Promise<string[]> {
  try {
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
      return []
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
      return (allServers as any[]).map(s => s.name)
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
          let serverIds: number[] = []

          if (Array.isArray(serverPermissions)) {
            serverIds = serverPermissions
          } else if (typeof serverPermissions === 'string') {
            const parsed = JSON.parse(serverPermissions)
            if (Array.isArray(parsed)) {
              serverIds = parsed
            }
          }

          // 根据区服ID获取区服名称
          if (serverIds.length > 0) {
            const placeholders = serverIds.map(() => '?').join(',')
            const [servers] = await sequelize.query(
              `SELECT name FROM servers WHERE id IN (${placeholders})`,
              { replacements: serverIds }
            )
            allowedServers = (servers as any[]).map(s => s.name)
          }
        } catch (error) {
          console.warn('Failed to parse server permissions:', error)
        }
      }
    }

    return allowedServers
  } catch (error) {
    console.error('Error getting user allowed servers:', error)
    return []
  }
}

export { router as rankingRoutes }
