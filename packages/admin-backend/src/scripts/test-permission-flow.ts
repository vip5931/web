import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const testPermissionFlow = async () => {
  try {
    console.log('🧪 Testing complete permission flow...')

    // 连接数据库
    await connectDatabase()

    const userId = 9 // user1
    const testMenuIds = [1, 2, 3, 4, 5]
    const testServerIds = [1, 2, 3]
    const testOperationIds = [1, 2, 3, 4, 5, 6, 7]

    // 1. 清理现有数据
    console.log('🧹 Cleaning existing permissions...')
    await sequelize.query('DELETE FROM staff_permissions WHERE user_id = ?', {
      replacements: [userId]
    })

    // 2. 设置权限（模拟API调用）
    console.log('💾 Setting permissions...')
    const menuPermissions = JSON.stringify(testMenuIds)
    const serverPermissions = JSON.stringify(testServerIds)
    const operationPermissions = JSON.stringify(testOperationIds)

    console.log('Data to save:', {
      userId,
      menuPermissions,
      serverPermissions,
      operationPermissions
    })

    await sequelize.query(
      `
      INSERT INTO staff_permissions (user_id, menu_permissions, server_permissions, operation_permissions, created_by)
      VALUES (?, ?, ?, ?, 5)
    `,
      {
        replacements: [userId, menuPermissions, serverPermissions, operationPermissions]
      }
    )

    console.log('✅ Permissions saved!')

    // 3. 获取权限（模拟API调用）
    console.log('📖 Getting permissions...')
    const [permissions] = await sequelize.query(
      `
      SELECT * FROM staff_permissions WHERE user_id = ?
    `,
      { replacements: [userId] }
    )

    if (!permissions || (permissions as any[]).length === 0) {
      console.log('❌ No permissions found!')
      return
    }

    const permission = (permissions as any[])[0]
    console.log('Raw data from database:', {
      menu_permissions: permission.menu_permissions,
      server_permissions: permission.server_permissions,
      operation_permissions: permission.operation_permissions
    })

    // 4. 解析权限（模拟API响应）
    const parseDataSafely = (data: any, defaultValue: any[] = []) => {
      try {
        if (!data) {
          return defaultValue
        }
        // 如果已经是数组，直接返回
        if (Array.isArray(data)) {
          return data
        }
        // 如果是字符串，尝试解析
        if (typeof data === 'string') {
          if (data.trim() === '') {
            return defaultValue
          }
          return JSON.parse(data)
        }
        return defaultValue
      } catch (error) {
        console.warn('Data parse error:', error, 'for data:', data)
        return defaultValue
      }
    }

    const result = {
      menuIds: parseDataSafely(permission.menu_permissions),
      serverIds: parseDataSafely(permission.server_permissions),
      operationIds: parseDataSafely(permission.operation_permissions)
    }

    console.log('✅ Parsed permissions:', result)

    // 5. 验证数据完整性
    console.log('🔍 Verifying data integrity...')
    const isMenuCorrect = JSON.stringify(result.menuIds) === JSON.stringify(testMenuIds)
    const isServerCorrect = JSON.stringify(result.serverIds) === JSON.stringify(testServerIds)
    const isOperationCorrect =
      JSON.stringify(result.operationIds) === JSON.stringify(testOperationIds)

    console.log('Data integrity check:')
    console.log(
      `  Menu IDs: ${isMenuCorrect ? '✅' : '❌'} (expected: [${testMenuIds.join(',')}], got: [${result.menuIds.join(',')}])`
    )
    console.log(
      `  Server IDs: ${isServerCorrect ? '✅' : '❌'} (expected: [${testServerIds.join(',')}], got: [${result.serverIds.join(',')}])`
    )
    console.log(
      `  Operation IDs: ${isOperationCorrect ? '✅' : '❌'} (expected: [${testOperationIds.join(',')}], got: [${result.operationIds.join(',')}])`
    )

    if (isMenuCorrect && isServerCorrect && isOperationCorrect) {
      console.log('\n🎉 Permission flow test PASSED!')
    } else {
      console.log('\n❌ Permission flow test FAILED!')
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error testing permission flow:', error)
    process.exit(1)
  }
}

testPermissionFlow()
