import 'dotenv/config'
import { connectDatabase } from '../config/database'
import { sequelize } from '../config/database'

const checkTables = async () => {
  try {
    console.log('🔍 Checking database tables...')

    // 连接数据库
    await connectDatabase()
    console.log('✅ Database connection established.')

    // 查询所有表
    const [results] = await sequelize.query('SHOW TABLES')

    console.log('\n📋 Current tables in database:')
    console.log('================================')

    if (Array.isArray(results) && results.length > 0) {
      results.forEach((row: any, index: number) => {
        const tableName = Object.values(row)[0]
        console.log(`${index + 1}. ${tableName}`)
      })
    } else {
      console.log('No tables found.')
    }

    console.log('================================')
    console.log(`Total tables: ${results.length}`)

    // 检查具体表结构
    const expectedTables = ['users', 'roles', 'permissions', 'user_roles', 'role_permissions']

    console.log('\n🔍 Checking expected tables:')
    for (const table of expectedTables) {
      try {
        const [tableExists] = await sequelize.query(`SHOW TABLES LIKE '${table}'`)
        if (Array.isArray(tableExists) && tableExists.length > 0) {
          console.log(`✅ ${table} - EXISTS`)

          // 显示表结构
          const [columns] = await sequelize.query(`DESCRIBE ${table}`)
          console.log(`   Columns: ${(columns as any[]).map(col => col.Field).join(', ')}`)
        } else {
          console.log(`❌ ${table} - MISSING`)
        }
      } catch (error) {
        console.log(`❌ ${table} - ERROR: ${error.message}`)
      }
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error checking tables:', error)
    process.exit(1)
  }
}

checkTables()
