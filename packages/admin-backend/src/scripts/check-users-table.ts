import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const checkUsersTable = async () => {
  try {
    console.log('🔍 Checking users table structure...')

    // 连接数据库
    await connectDatabase()

    // 查看表结构
    const [columns] = await sequelize.query('DESCRIBE users')
    
    console.log('\n📋 Users table structure:')
    console.log('================================')
    
    if (Array.isArray(columns) && columns.length > 0) {
      columns.forEach((col: any) => {
        console.log(`${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''} ${col.Extra || ''}`)
      })
    }

    // 检查是否有created_at和updated_at字段
    const hasCreatedAt = (columns as any[]).some(col => col.Field === 'created_at')
    const hasUpdatedAt = (columns as any[]).some(col => col.Field === 'updated_at')

    console.log('\n🔍 Timestamp fields check:')
    console.log(`created_at: ${hasCreatedAt ? '✅ EXISTS' : '❌ MISSING'}`)
    console.log(`updated_at: ${hasUpdatedAt ? '✅ EXISTS' : '❌ MISSING'}`)

    if (!hasCreatedAt || !hasUpdatedAt) {
      console.log('\n🔧 Need to add missing timestamp fields...')
      
      if (!hasCreatedAt) {
        console.log('Adding created_at field...')
        await sequelize.query(`
          ALTER TABLE users 
          ADD COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        `)
      }

      if (!hasUpdatedAt) {
        console.log('Adding updated_at field...')
        await sequelize.query(`
          ALTER TABLE users 
          ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        `)
      }

      console.log('✅ Timestamp fields added successfully!')

      // 重新查看表结构
      const [newColumns] = await sequelize.query('DESCRIBE users')
      console.log('\n📋 Updated users table structure:')
      console.log('================================')
      
      if (Array.isArray(newColumns) && newColumns.length > 0) {
        newColumns.forEach((col: any) => {
          console.log(`${col.Field}: ${col.Type} ${col.Null === 'NO' ? 'NOT NULL' : 'NULL'} ${col.Default ? `DEFAULT ${col.Default}` : ''} ${col.Extra || ''}`)
        })
      }
    } else {
      console.log('\n✅ All timestamp fields are present!')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error checking users table:', error)
    process.exit(1)
  }
}

checkUsersTable()
