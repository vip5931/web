import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const fixPermissionData = async () => {
  try {
    console.log('🔧 Fixing permission data...')

    // 连接数据库
    await connectDatabase()

    // 查看当前数据
    const [currentData] = await sequelize.query(`
      SELECT * FROM staff_permissions
    `)

    console.log('\n📋 Current staff permissions data:')
    console.log('================================')
    
    if (Array.isArray(currentData) && currentData.length > 0) {
      currentData.forEach((sp: any, index: number) => {
        console.log(`${index + 1}. User ID: ${sp.user_id}`)
        console.log(`   Menu permissions: "${sp.menu_permissions}"`)
        console.log(`   Server permissions: "${sp.server_permissions}"`)
        console.log(`   Operation permissions: "${sp.operation_permissions}"`)
        console.log('---')
      })
    }

    // 清理并重新设置正确的权限数据
    console.log('\n🧹 Cleaning and resetting permission data...')
    
    // 删除现有数据
    await sequelize.query('DELETE FROM staff_permissions')
    
    // 重新插入正确的测试数据
    await sequelize.query(`
      INSERT INTO staff_permissions (user_id, menu_permissions, server_permissions, operation_permissions, created_by)
      VALUES (9, ?, ?, ?, 5)
    `, {
      replacements: [
        JSON.stringify([1, 2, 3]),
        JSON.stringify([1, 2]),
        JSON.stringify([1, 2, 3])
      ]
    })

    console.log('✅ Permission data fixed!')

    // 验证修复结果
    const [fixedData] = await sequelize.query(`
      SELECT * FROM staff_permissions
    `)

    console.log('\n📊 Fixed permission data:')
    console.log('================================')
    
    if (Array.isArray(fixedData) && fixedData.length > 0) {
      fixedData.forEach((sp: any, index: number) => {
        console.log(`${index + 1}. User ID: ${sp.user_id}`)
        console.log(`   Menu permissions: "${sp.menu_permissions}"`)
        console.log(`   Server permissions: "${sp.server_permissions}"`)
        console.log(`   Operation permissions: "${sp.operation_permissions}"`)
        
        // 测试JSON解析
        try {
          const menuIds = JSON.parse(sp.menu_permissions || '[]')
          const serverIds = JSON.parse(sp.server_permissions || '[]')
          const operationIds = JSON.parse(sp.operation_permissions || '[]')
          
          console.log(`   Parsed menu IDs: [${menuIds.join(', ')}]`)
          console.log(`   Parsed server IDs: [${serverIds.join(', ')}]`)
          console.log(`   Parsed operation IDs: [${operationIds.join(', ')}]`)
        } catch (error) {
          console.log(`   ❌ JSON parsing error: ${error.message}`)
        }
        console.log('---')
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing permission data:', error)
    process.exit(1)
  }
}

fixPermissionData()
