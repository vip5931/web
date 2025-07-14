import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const testPermissionSetting = async () => {
  try {
    console.log('🧪 Testing permission setting...')

    // 连接数据库
    await connectDatabase()

    // 获取一个普通员工用户
    const [staffUsers] = await sequelize.query(`
      SELECT u.id, u.username, r.level
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      WHERE r.level = 3
      LIMIT 1
    `)

    if (!staffUsers || (staffUsers as any[]).length === 0) {
      console.log('❌ No staff user found')
      process.exit(1)
    }

    const staffUser = (staffUsers as any[])[0]
    console.log(`📋 Testing with staff user: ${staffUser.username} (ID: ${staffUser.id})`)

    // 获取admin用户ID
    const [adminUsers] = await sequelize.query(`
      SELECT id FROM users WHERE username = 'admin' LIMIT 1
    `)

    if (!adminUsers || (adminUsers as any[]).length === 0) {
      console.log('❌ Admin user not found')
      process.exit(1)
    }

    const adminUserId = (adminUsers as any[])[0].id
    console.log(`👑 Admin user ID: ${adminUserId}`)

    // 测试权限设置
    const menuIds = [1, 2, 3]
    const serverIds = [1, 2]
    const operationIds = [1, 2, 3]

    console.log('🔧 Setting permissions...')
    
    await sequelize.query(`
      INSERT INTO staff_permissions (user_id, menu_permissions, server_permissions, operation_permissions, created_by)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
      menu_permissions = VALUES(menu_permissions),
      server_permissions = VALUES(server_permissions),
      operation_permissions = VALUES(operation_permissions),
      created_by = VALUES(created_by),
      updated_at = CURRENT_TIMESTAMP
    `, {
      replacements: [
        staffUser.id,
        JSON.stringify(menuIds),
        JSON.stringify(serverIds),
        JSON.stringify(operationIds),
        adminUserId
      ]
    })

    console.log('✅ Permissions set successfully!')

    // 验证权限设置
    const [permissions] = await sequelize.query(`
      SELECT * FROM staff_permissions WHERE user_id = ?
    `, { replacements: [staffUser.id] })

    if (permissions && (permissions as any[]).length > 0) {
      const permission = (permissions as any[])[0]
      console.log('\n📊 Permission verification:')
      console.log(`User ID: ${permission.user_id}`)
      console.log(`Menu permissions: ${permission.menu_permissions}`)
      console.log(`Server permissions: ${permission.server_permissions}`)
      console.log(`Operation permissions: ${permission.operation_permissions}`)
      console.log(`Created by: ${permission.created_by}`)
    }

    console.log('\n✅ Permission setting test completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error testing permission setting:', error)
    process.exit(1)
  }
}

testPermissionSetting()
