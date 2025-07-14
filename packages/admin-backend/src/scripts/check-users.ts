import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const checkUsers = async () => {
  try {
    console.log('🔍 Checking users in database...')

    // 连接数据库
    await connectDatabase()

    // 查询所有用户
    const [users] = await sequelize.query('SELECT id, username, email, status FROM users')
    
    console.log('\n👥 Users in database:')
    console.log('================================')
    
    if (Array.isArray(users) && users.length > 0) {
      users.forEach((user: any) => {
        console.log(`ID: ${user.id}, Username: ${user.username}, Email: ${user.email}, Status: ${user.status}`)
      })
    } else {
      console.log('No users found.')
    }
    
    console.log('================================')
    console.log(`Total users: ${users.length}`)

    // 查询用户角色关联
    console.log('\n🔗 User roles:')
    const [userRoles] = await sequelize.query(`
      SELECT u.id, u.username, r.name as role_name, r.level
      FROM users u
      LEFT JOIN user_roles ur ON u.id = ur.user_id
      LEFT JOIN roles r ON ur.role_id = r.id
      ORDER BY u.id
    `)

    if (Array.isArray(userRoles) && userRoles.length > 0) {
      userRoles.forEach((ur: any) => {
        console.log(`User ${ur.id} (${ur.username}): ${ur.role_name || 'No role'} ${ur.level ? `(Level ${ur.level})` : ''}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error checking users:', error)
    process.exit(1)
  }
}

checkUsers()
