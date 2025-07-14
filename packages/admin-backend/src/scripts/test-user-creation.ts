import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'
import bcrypt from 'bcryptjs'

const testUserCreation = async () => {
  try {
    console.log('🧪 Testing user creation...')

    // 连接数据库
    await connectDatabase()

    // 测试数据
    const testUser = {
      username: 'testuser',
      email: 'testuser@example.com',
      password: 'testpassword123'
    }

    // 删除可能存在的测试用户
    await sequelize.query(
      'DELETE FROM users WHERE username = ? OR email = ?',
      { replacements: [testUser.username, testUser.email] }
    )

    console.log('🧹 Cleaned up existing test user')

    // 加密密码
    const hashedPassword = await bcrypt.hash(testUser.password, 10)

    // 测试用户创建SQL
    console.log('💾 Creating test user...')
    const [result] = await sequelize.query(`
      INSERT INTO users (username, email, password, status, created_at, updated_at) 
      VALUES (?, ?, ?, 'active', NOW(), NOW())
    `, {
      replacements: [testUser.username, testUser.email, hashedPassword]
    })

    const userId = (result as any).insertId
    console.log(`✅ User created successfully with ID: ${userId}`)

    // 验证用户是否正确创建
    const [users] = await sequelize.query(
      'SELECT id, username, email, status, created_at, updated_at FROM users WHERE id = ?',
      { replacements: [userId] }
    )

    if (users && (users as any[]).length > 0) {
      const user = (users as any[])[0]
      console.log('\n📋 Created user details:')
      console.log(`ID: ${user.id}`)
      console.log(`Username: ${user.username}`)
      console.log(`Email: ${user.email}`)
      console.log(`Status: ${user.status}`)
      console.log(`Created at: ${user.created_at}`)
      console.log(`Updated at: ${user.updated_at}`)
    }

    // 测试用户更新
    console.log('\n🔄 Testing user update...')
    await sequelize.query(`
      UPDATE users SET status = 'inactive', updated_at = NOW() WHERE id = ?
    `, { replacements: [userId] })

    // 验证更新
    const [updatedUsers] = await sequelize.query(
      'SELECT status, updated_at FROM users WHERE id = ?',
      { replacements: [userId] }
    )

    if (updatedUsers && (updatedUsers as any[]).length > 0) {
      const updatedUser = (updatedUsers as any[])[0]
      console.log(`✅ User status updated to: ${updatedUser.status}`)
      console.log(`✅ Updated at: ${updatedUser.updated_at}`)
    }

    // 清理测试数据
    await sequelize.query('DELETE FROM users WHERE id = ?', { replacements: [userId] })
    console.log('🧹 Test user cleaned up')

    console.log('\n🎉 User creation test completed successfully!')
    process.exit(0)
  } catch (error) {
    console.error('❌ Error testing user creation:', error)
    process.exit(1)
  }
}

testUserCreation()
