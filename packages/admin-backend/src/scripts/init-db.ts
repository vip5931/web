import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/database'
import User from '../models/User'
import Role from '../models/Role'
import Permission from '../models/Permission'
import UserRole from '../models/UserRole'
import RolePermission from '../models/RolePermission'

// 导入关联关系
import '../models/associations'

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...')

    // 连接数据库
    await connectDatabase()
    console.log('✅ Database connection has been established successfully.')

    // 创建默认角色
    console.log('🔄 Creating default roles...')
    const [adminRole] = await Role.findOrCreate({
      where: { code: 'admin' },
      defaults: {
        name: '超级管理员',
        code: 'admin',
        description: '系统超级管理员，拥有所有权限',
        status: 'active',
        sort: 1
      }
    })

    const [userRole] = await Role.findOrCreate({
      where: { code: 'user' },
      defaults: {
        name: '普通用户',
        code: 'user',
        description: '普通用户角色',
        status: 'active',
        sort: 2
      }
    })

    // 创建默认权限
    console.log('🔄 Creating default permissions...')
    const permissions = [
      // 仪表盘
      {
        name: '仪表盘',
        code: 'dashboard',
        type: 'menu',
        path: '/dashboard',
        component: 'DashboardView',
        icon: 'DashboardOutlined',
        sort: 1
      },

      // 用户管理
      {
        name: '用户管理',
        code: 'user',
        type: 'menu',
        path: '/users',
        component: 'UsersView',
        icon: 'UserOutlined',
        sort: 2
      },
      { name: '用户查看', code: 'user:view', type: 'button', parentCode: 'user', sort: 1 },
      { name: '用户新增', code: 'user:create', type: 'button', parentCode: 'user', sort: 2 },
      { name: '用户编辑', code: 'user:edit', type: 'button', parentCode: 'user', sort: 3 },
      { name: '用户删除', code: 'user:delete', type: 'button', parentCode: 'user', sort: 4 },

      // 角色管理
      {
        name: '角色管理',
        code: 'role',
        type: 'menu',
        path: '/roles',
        component: 'RolesView',
        icon: 'TeamOutlined',
        sort: 3
      },
      { name: '角色查看', code: 'role:view', type: 'button', parentCode: 'role', sort: 1 },
      { name: '角色新增', code: 'role:create', type: 'button', parentCode: 'role', sort: 2 },
      { name: '角色编辑', code: 'role:edit', type: 'button', parentCode: 'role', sort: 3 },
      { name: '角色删除', code: 'role:delete', type: 'button', parentCode: 'role', sort: 4 },

      // 权限管理
      {
        name: '权限管理',
        code: 'permission',
        type: 'menu',
        path: '/permissions',
        component: 'PermissionsView',
        icon: 'SafetyOutlined',
        sort: 4
      },
      {
        name: '权限查看',
        code: 'permission:view',
        type: 'button',
        parentCode: 'permission',
        sort: 1
      },
      {
        name: '权限新增',
        code: 'permission:create',
        type: 'button',
        parentCode: 'permission',
        sort: 2
      },
      {
        name: '权限编辑',
        code: 'permission:edit',
        type: 'button',
        parentCode: 'permission',
        sort: 3
      },
      {
        name: '权限删除',
        code: 'permission:delete',
        type: 'button',
        parentCode: 'permission',
        sort: 4
      }
    ]

    // 创建权限
    const createdPermissions = []
    for (const perm of permissions) {
      let parentId = null
      if (perm.parentCode) {
        const parent = await Permission.findOne({ where: { code: perm.parentCode } })
        parentId = parent?.id || null
      }

      const [permission] = await Permission.findOrCreate({
        where: { code: perm.code },
        defaults: {
          name: perm.name,
          code: perm.code,
          type: perm.type as 'menu' | 'button' | 'api',
          parentId: parentId || undefined,
          path: perm.path,
          component: perm.component,
          icon: perm.icon,
          sort: perm.sort,
          status: 'active'
        }
      })
      createdPermissions.push(permission)
    }

    // 给管理员角色分配所有权限
    console.log('🔄 Assigning permissions to admin role...')
    for (const permission of createdPermissions) {
      await RolePermission.findOrCreate({
        where: { roleId: adminRole.id, permissionId: permission.id },
        defaults: { roleId: adminRole.id, permissionId: permission.id }
      })
    }

    // 给普通用户角色分配基础权限
    const userPermissions = createdPermissions.filter(p =>
      ['dashboard', 'user:view'].includes(p.code)
    )
    for (const permission of userPermissions) {
      await RolePermission.findOrCreate({
        where: { roleId: userRole.id, permissionId: permission.id },
        defaults: { roleId: userRole.id, permissionId: permission.id }
      })
    }

    // 检查是否已存在管理员用户
    const adminUser = await User.findOne({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      // 创建默认管理员用户
      const hashedPassword = await bcrypt.hash('admin123', 10)

      const newAdminUser = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        status: 'active'
      })

      // 给管理员用户分配管理员角色
      await UserRole.create({
        userId: newAdminUser.id,
        roleId: adminRole.id
      })

      console.log('✅ Default admin user created:')
      console.log('   Username: admin')
      console.log('   Password: admin123')
      console.log('   Email: admin@example.com')
    } else {
      console.log('ℹ️  Admin user already exists')

      // 确保管理员用户有管理员角色
      const existingUserRole = await UserRole.findOne({
        where: { userId: adminUser.id, roleId: adminRole.id }
      })

      if (!existingUserRole) {
        await UserRole.create({
          userId: adminUser.id,
          roleId: adminRole.id
        })
        console.log('✅ Admin role assigned to existing admin user')
      }
    }

    // 创建一些示例用户
    const userCount = await User.count()
    if (userCount < 5) {
      const sampleUsers = [
        {
          username: 'user1',
          email: 'user1@example.com',
          password: await bcrypt.hash('user123', 10),
          role: 'user' as const,
          status: 'active' as const
        },
        {
          username: 'user2',
          email: 'user2@example.com',
          password: await bcrypt.hash('user123', 10),
          role: 'user' as const,
          status: 'active' as const
        },
        {
          username: 'user3',
          email: 'user3@example.com',
          password: await bcrypt.hash('user123', 10),
          role: 'user' as const,
          status: 'inactive' as const
        }
      ]

      for (const userData of sampleUsers) {
        const existingUser = await User.findOne({
          where: { username: userData.username }
        })

        if (!existingUser) {
          await User.create(userData)
          console.log(`✅ Sample user created: ${userData.username}`)
        }
      }
    }

    console.log('🎉 Database initialization completed!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()
