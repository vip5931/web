import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { connectDatabase } from '../config/database'
import User from '../models/User'

const initDatabase = async () => {
  try {
    console.log('🔄 Initializing database...')

    // 连接数据库
    await connectDatabase()

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
        role: 'admin',
        status: 'active'
      })

      console.log('✅ Default admin user created:')
      console.log('   Username: admin')
      console.log('   Password: admin123')
      console.log('   Email: admin@example.com')
    } else {
      console.log('ℹ️  Admin user already exists')
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
