import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const testGetPermissions = async () => {
  try {
    console.log('🧪 Testing get permissions API...')

    // 连接数据库
    await connectDatabase()

    // 查询有权限配置的用户
    const [staffPermissions] = await sequelize.query(`
      SELECT sp.*, u.username 
      FROM staff_permissions sp
      JOIN users u ON sp.user_id = u.id
    `)

    console.log('\n📋 Staff permissions in database:')
    console.log('================================')
    
    if (Array.isArray(staffPermissions) && staffPermissions.length > 0) {
      staffPermissions.forEach((sp: any) => {
        console.log(`User: ${sp.username} (ID: ${sp.user_id})`)
        console.log(`  Menu permissions: ${sp.menu_permissions}`)
        console.log(`  Server permissions: ${sp.server_permissions}`)
        console.log(`  Operation permissions: ${sp.operation_permissions}`)
        console.log(`  Created by: ${sp.created_by}`)
        console.log('---')
      })
    } else {
      console.log('No staff permissions found.')
    }

    // 测试API逻辑
    if (staffPermissions.length > 0) {
      const testUser = (staffPermissions as any[])[0]
      console.log(`\n🔍 Testing API logic for user ${testUser.username} (ID: ${testUser.user_id})`)
      
      const [permissions] = await sequelize.query(`
        SELECT * FROM staff_permissions WHERE user_id = ?
      `, { replacements: [testUser.user_id] })

      if (permissions && (permissions as any[]).length > 0) {
        const permission = (permissions as any[])[0]
        
        const result = {
          menuIds: JSON.parse(permission.menu_permissions || '[]'),
          serverIds: JSON.parse(permission.server_permissions || '[]'),
          operationIds: JSON.parse(permission.operation_permissions || '[]')
        }
        
        console.log('API would return:')
        console.log(JSON.stringify(result, null, 2))
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error testing get permissions:', error)
    process.exit(1)
  }
}

testGetPermissions()
