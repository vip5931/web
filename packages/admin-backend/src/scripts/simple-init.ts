import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/database'
import User from '../models/User'

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...')

    // 连接数据库
    await connectDatabase()
    console.log('✅ Database connection has been established successfully.')

    // 检查是否已存在管理员用户
    const adminUser = await User.findOne({
      where: { username: 'admin' }
    })

    if (!adminUser) {
      // 创建默认管理员用户
      const hashedPassword = await bcrypt.hash('admin123', 10)

      await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        status: 'active'
      })

      console.log('✅ Default admin user created:')
      console.log('   Username: admin')
      console.log('   Password: admin123')
      console.log('   Email: admin@example.com')
    } else {
      console.log('ℹ️  Admin user already exists')
    }

    console.log('✅ Database initialization completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Database initialization failed:', error)
    process.exit(1)
  }
}

initDatabase()
