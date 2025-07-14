import Router from '@koa/router'
import { sequelize } from '../config/database'

const router = new Router()

// 获取用户可访问的菜单
router.get('/user-menus', async ctx => {
  try {
    // 从JWT或session获取用户ID（这里暂时硬编码，实际应该从认证中间件获取）
    const userId = ctx.query.userId || 5 // 默认admin用户

    // 获取用户角色
    const [userRoles] = await sequelize.query(`
      SELECT r.* FROM roles r
      JOIN user_roles ur ON r.id = ur.role_id
      WHERE ur.user_id = ?
    `, { replacements: [userId] })

    if (!userRoles || (userRoles as any[]).length === 0) {
      // 没有角色的用户只能看到仪表盘
      ctx.body = {
        success: true,
        data: [
          {
            id: 1,
            name: '仪表盘',
            code: 'dashboard',
            path: '/dashboard',
            icon: 'DashboardOutlined',
            children: []
          }
        ]
      }
      return
    }

    const role = (userRoles as any[])[0]

    // 超级管理员和管理员可以看到所有菜单
    if (role.level <= 2) {
      const [allMenus] = await sequelize.query(`
        SELECT * FROM menu_permissions 
        WHERE status = 'active' 
        ORDER BY parent_id IS NULL DESC, parent_id, sort
      `)

      const menuTree = buildMenuTree(allMenus as any[])
      
      ctx.body = {
        success: true,
        data: menuTree
      }
      return
    }

    // 普通员工根据分配的权限显示菜单
    const [staffPermissions] = await sequelize.query(`
      SELECT menu_permissions FROM staff_permissions WHERE user_id = ?
    `, { replacements: [userId] })

    let allowedMenuIds: number[] = [1] // 默认包含仪表盘

    if (staffPermissions && (staffPermissions as any[]).length > 0) {
      const permission = (staffPermissions as any[])[0]
      const menuPermissions = permission.menu_permissions

      // 安全解析菜单权限
      if (menuPermissions) {
        try {
          if (Array.isArray(menuPermissions)) {
            allowedMenuIds = [...allowedMenuIds, ...menuPermissions]
          } else if (typeof menuPermissions === 'string') {
            const parsed = JSON.parse(menuPermissions)
            if (Array.isArray(parsed)) {
              allowedMenuIds = [...allowedMenuIds, ...parsed]
            }
          }
        } catch (error) {
          console.warn('Failed to parse menu permissions:', error)
        }
      }
    }

    // 去重
    allowedMenuIds = [...new Set(allowedMenuIds)]

    // 获取允许的菜单
    if (allowedMenuIds.length > 0) {
      const [allowedMenus] = await sequelize.query(`
        SELECT * FROM menu_permissions 
        WHERE id IN (${allowedMenuIds.join(',')}) AND status = 'active'
        ORDER BY parent_id IS NULL DESC, parent_id, sort
      `)

      const menuTree = buildMenuTree(allowedMenus as any[])
      
      ctx.body = {
        success: true,
        data: menuTree
      }
    } else {
      // 只返回仪表盘
      ctx.body = {
        success: true,
        data: [
          {
            id: 1,
            name: '仪表盘',
            code: 'dashboard',
            path: '/dashboard',
            icon: 'DashboardOutlined',
            children: []
          }
        ]
      }
    }
  } catch (error) {
    console.error('Get user menus error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取用户菜单失败'
    }
  }
})

// 获取所有菜单（管理员用）
router.get('/all', async ctx => {
  try {
    const [menus] = await sequelize.query(`
      SELECT * FROM menu_permissions 
      WHERE status = 'active' 
      ORDER BY parent_id IS NULL DESC, parent_id, sort
    `)

    const menuTree = buildMenuTree(menus as any[])
    
    ctx.body = {
      success: true,
      data: menuTree
    }
  } catch (error) {
    console.error('Get all menus error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '获取菜单列表失败'
    }
  }
})

// 创建菜单
router.post('/', async ctx => {
  try {
    const { name, code, path, component, icon, parent_id, sort = 0 } = ctx.request.body

    if (!name || !code) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '菜单名称和编码为必填项'
      }
      return
    }

    // 检查编码是否已存在
    const [existing] = await sequelize.query(
      'SELECT id FROM menu_permissions WHERE code = ?',
      { replacements: [code] }
    )
    
    if ((existing as any[]).length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '菜单编码已存在'
      }
      return
    }

    await sequelize.query(`
      INSERT INTO menu_permissions (name, code, path, component, icon, parent_id, sort, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
    `, {
      replacements: [name, code, path, component, icon, parent_id, sort]
    })

    ctx.body = {
      success: true,
      message: '菜单创建成功'
    }
  } catch (error) {
    console.error('Create menu error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '创建菜单失败'
    }
  }
})

// 更新菜单
router.put('/:id', async ctx => {
  try {
    const { id } = ctx.params
    const { name, code, path, component, icon, parent_id, sort, status } = ctx.request.body

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
    if (path !== undefined) {
      updates.push('path = ?')
      replacements.push(path)
    }
    if (component !== undefined) {
      updates.push('component = ?')
      replacements.push(component)
    }
    if (icon !== undefined) {
      updates.push('icon = ?')
      replacements.push(icon)
    }
    if (parent_id !== undefined) {
      updates.push('parent_id = ?')
      replacements.push(parent_id)
    }
    if (sort !== undefined) {
      updates.push('sort = ?')
      replacements.push(sort)
    }
    if (status) {
      updates.push('status = ?')
      replacements.push(status)
    }

    if (updates.length > 0) {
      updates.push('updated_at = NOW()')
      replacements.push(id)
      await sequelize.query(`
        UPDATE menu_permissions SET ${updates.join(', ')} WHERE id = ?
      `, { replacements })
    }

    ctx.body = {
      success: true,
      message: '菜单更新成功'
    }
  } catch (error) {
    console.error('Update menu error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '更新菜单失败'
    }
  }
})

// 删除菜单
router.delete('/:id', async ctx => {
  try {
    const { id } = ctx.params

    // 检查是否有子菜单
    const [children] = await sequelize.query(
      'SELECT id FROM menu_permissions WHERE parent_id = ?',
      { replacements: [id] }
    )
    
    if ((children as any[]).length > 0) {
      ctx.status = 400
      ctx.body = {
        success: false,
        message: '请先删除子菜单'
      }
      return
    }

    await sequelize.query('DELETE FROM menu_permissions WHERE id = ?', { 
      replacements: [id] 
    })

    ctx.body = {
      success: true,
      message: '菜单删除成功'
    }
  } catch (error) {
    console.error('Delete menu error:', error)
    ctx.status = 500
    ctx.body = {
      success: false,
      message: '删除菜单失败'
    }
  }
})

// 构建菜单树
function buildMenuTree(menus: any[], parentId: number | null = null): any[] {
  return menus
    .filter(menu => menu.parent_id === parentId)
    .map(menu => ({
      id: menu.id,
      name: menu.name,
      code: menu.code,
      path: menu.path,
      component: menu.component,
      icon: menu.icon,
      sort: menu.sort,
      children: buildMenuTree(menus, menu.id)
    }))
}

export { router as menuRoutes }
