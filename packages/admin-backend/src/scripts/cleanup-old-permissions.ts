import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const cleanupOldPermissions = async () => {
  try {
    console.log('🧹 Cleaning up old permission system...')

    // 连接数据库
    await connectDatabase()

    // 删除旧的权限相关表
    console.log('📋 Dropping old permission tables...')
    
    // 按依赖关系顺序删除
    const tablesToDrop = [
      'permissions',  // 旧的权限表
    ]

    for (const table of tablesToDrop) {
      try {
        await sequelize.query(`DROP TABLE IF EXISTS ${table}`)
        console.log(`✅ Dropped table: ${table}`)
      } catch (error) {
        console.log(`⚠️  Table ${table} not found or already dropped`)
      }
    }

    console.log('✅ Old permission system cleaned up successfully!')

    // 验证当前表结构
    console.log('\n📋 Current tables after cleanup:')
    const [tables] = await sequelize.query('SHOW TABLES')
    
    if (Array.isArray(tables)) {
      tables.forEach((row: any, index: number) => {
        const tableName = Object.values(row)[0]
        console.log(`${index + 1}. ${tableName}`)
      })
    }

    console.log('\n🎮 Game permission system tables:')
    const gamePermissionTables = [
      'roles',
      'game_servers', 
      'menu_permissions',
      'operation_permissions',
      'staff_permissions',
      'user_roles'
    ]

    for (const table of gamePermissionTables) {
      const [exists] = await sequelize.query(`SHOW TABLES LIKE '${table}'`)
      if (Array.isArray(exists) && exists.length > 0) {
        console.log(`✅ ${table} - EXISTS`)
      } else {
        console.log(`❌ ${table} - MISSING`)
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error cleaning up old permissions:', error)
    process.exit(1)
  }
}

cleanupOldPermissions()
