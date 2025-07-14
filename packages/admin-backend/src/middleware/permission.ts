import { Context, Next } from 'koa'
import jwt from 'jsonwebtoken'
import { User, Role, Permission, UserRole, RolePermission } from '../models/associations'

// 权限检查中间件
export const checkPermission = (requiredPermission: string) => {
  return async (ctx: Context, next: Next) => {
    try {
      // 获取 token
      const token = ctx.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        ctx.status = 401
        ctx.body = {
          success: false,
          message: '未提供认证令牌'
        }
        return
      }

      // 验证 token
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
      
      // 获取用户及其角色和权限
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Role,
            as: 'roles',
            include: [
              {
                model: Permission,
                as: 'permissions',
                where: { status: 'active' },
                required: false
              }
            ]
          }
        ]
      })

      if (!user) {
        ctx.status = 401
        ctx.body = {
          success: false,
          message: '用户不存在'
        }
        return
      }

      // 检查用户状态
      if (user.status !== 'active') {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: '用户已被禁用'
        }
        return
      }

      // 收集用户所有权限
      const userPermissions: string[] = []
      if (user.roles) {
        user.roles.forEach((role: any) => {
          if (role.status === 'active' && role.permissions) {
            role.permissions.forEach((permission: any) => {
              userPermissions.push(permission.code)
            })
          }
        })
      }

      // 检查是否有所需权限
      if (!userPermissions.includes(requiredPermission)) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: '权限不足'
        }
        return
      }

      // 将用户信息添加到上下文
      ctx.state.user = user
      ctx.state.permissions = userPermissions

      await next()
    } catch (error) {
      console.error('Permission check error:', error)
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '认证失败'
      }
    }
  }
}

// 角色检查中间件
export const checkRole = (requiredRoles: string[]) => {
  return async (ctx: Context, next: Next) => {
    try {
      const token = ctx.headers.authorization?.replace('Bearer ', '')
      if (!token) {
        ctx.status = 401
        ctx.body = {
          success: false,
          message: '未提供认证令牌'
        }
        return
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: number }
      
      const user = await User.findByPk(decoded.userId, {
        include: [
          {
            model: Role,
            as: 'roles',
            where: { status: 'active' },
            required: false
          }
        ]
      })

      if (!user) {
        ctx.status = 401
        ctx.body = {
          success: false,
          message: '用户不存在'
        }
        return
      }

      // 检查用户角色
      const userRoles = user.roles?.map((role: any) => role.code) || []
      const hasRequiredRole = requiredRoles.some(role => userRoles.includes(role))

      if (!hasRequiredRole) {
        ctx.status = 403
        ctx.body = {
          success: false,
          message: '角色权限不足'
        }
        return
      }

      ctx.state.user = user
      ctx.state.roles = userRoles

      await next()
    } catch (error) {
      console.error('Role check error:', error)
      ctx.status = 401
      ctx.body = {
        success: false,
        message: '认证失败'
      }
    }
  }
}

// 获取用户权限列表
export const getUserPermissions = async (userId: number): Promise<string[]> => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          where: { status: 'active' },
          include: [
            {
              model: Permission,
              as: 'permissions',
              where: { status: 'active' },
              required: false
            }
          ],
          required: false
        }
      ]
    })

    const permissions: string[] = []
    if (user?.roles) {
      user.roles.forEach((role: any) => {
        if (role.permissions) {
          role.permissions.forEach((permission: any) => {
            if (!permissions.includes(permission.code)) {
              permissions.push(permission.code)
            }
          })
        }
      })
    }

    return permissions
  } catch (error) {
    console.error('Get user permissions error:', error)
    return []
  }
}

// 获取用户菜单权限
export const getUserMenus = async (userId: number) => {
  try {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'roles',
          where: { status: 'active' },
          include: [
            {
              model: Permission,
              as: 'permissions',
              where: { 
                status: 'active',
                type: 'menu'
              },
              required: false
            }
          ],
          required: false
        }
      ]
    })

    const menuPermissions: any[] = []
    if (user?.roles) {
      user.roles.forEach((role: any) => {
        if (role.permissions) {
          role.permissions.forEach((permission: any) => {
            const existing = menuPermissions.find(p => p.id === permission.id)
            if (!existing) {
              menuPermissions.push(permission)
            }
          })
        }
      })
    }

    // 构建菜单树
    const buildMenuTree = (items: any[], parentId: number | null = null): any[] => {
      return items
        .filter(item => item.parentId === parentId)
        .map(item => ({
          id: item.id,
          name: item.name,
          code: item.code,
          path: item.path,
          component: item.component,
          icon: item.icon,
          sort: item.sort,
          children: buildMenuTree(items, item.id)
        }))
        .sort((a, b) => a.sort - b.sort)
    }

    return buildMenuTree(menuPermissions)
  } catch (error) {
    console.error('Get user menus error:', error)
    return []
  }
}
