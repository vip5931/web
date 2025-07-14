import Router from '@koa/router'
import { sequelize } from '../config/database'

const router = new Router()

// 获取所有角色
router.get('/roles', async ctx => {
  try {
    const [roles] = await sequelize.query(`
      SELECT * FROM roles WHERE status = 'active' ORDER BY level ASC
    `)

    ctx.body = {
      success: true,
      data: roles
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

// 分配用户角色
router.post('/assign', async ctx => {
  try {
    const { userId, roleId } = ctx.request.body as {
      userId: number
      roleId: number
    }

    if (!userId || !roleId) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '用户ID和角色ID为必填项'
      }
      return
    }

    // 检查用户是否存在
    const [users] = await sequelize.query(
      'SELECT id FROM users WHERE id = ?',
      { replacements: [userId] }
    )
    
    if (!users || (users as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '用户不存在'
      }
      return
    }

    // 检查角色是否存在
    const [roles] = await sequelize.query(
      'SELECT id FROM roles WHERE id = ?',
      { replacements: [roleId] }
    )
    
    if (!roles || (roles as any[]).length === 0) {
      ctx.status = 404
      ctx.body = {
        success: false,
        message: '角色不存在'
      }
      return
    }

    // 删除用户现有角色
    await sequelize.query(
      'DELETE FROM user_roles WHERE user_id = ?',
      { replacements: [userId] }
    )

    // 分配新角色
    await sequelize.query(
      'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
      { replacements: [userId, roleId] }
    )

    ctx.body = {
      success: true,
      message: '角色分配成功'
    }
  } catch (error) {
    console.error('Assign role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '分配角色失败'
    }
  }
})

// 获取用户角色
router.get('/user/:userId', async ctx => {
  try {
    const { userId } = ctx.params

    const [userRoles] = await sequelize.query(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, { replacements: [userId] })

    ctx.body = {
      success: true,
      data: userRoles && (userRoles as any[]).length > 0 ? (userRoles as any[])[0] : null
    }
  } catch (error) {
    console.error('Get user role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户角色失败'
    }
  }
})

// 移除用户角色
router.delete('/user/:userId', async ctx => {
  try {
    const { userId } = ctx.params

    await sequelize.query(
      'DELETE FROM user_roles WHERE user_id = ?',
      { replacements: [userId] }
    )

    ctx.body = {
      success: true,
      message: '角色移除成功'
    }
  } catch (error) {
    console.error('Remove user role error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '移除角色失败'
    }
  }
})

export { router as userRoleRoutes }
