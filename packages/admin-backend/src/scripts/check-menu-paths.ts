import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const checkMenuPaths = async () => {
  try {
    console.log('🔍 Checking menu paths...')

    // 连接数据库
    await connectDatabase()

    // 查看所有菜单的路径
    const [menus] = await sequelize.query(`
      SELECT id, name, code, path, parent_id 
      FROM menu_permissions 
      WHERE status = 'active'
      ORDER BY parent_id IS NULL DESC, parent_id, sort
    `)

    console.log('\n📋 Current menu paths:')
    console.log('================================')
    
    if (Array.isArray(menus) && menus.length > 0) {
      menus.forEach((menu: any) => {
        const level = menu.parent_id ? '  ' : ''
        console.log(`${level}${menu.name} (${menu.code}): ${menu.path || 'NO PATH'}`)
      })
    }

    // 检查是否有路径问题
    const menusWithoutPath = (menus as any[]).filter(menu => !menu.path)
    if (menusWithoutPath.length > 0) {
      console.log('\n⚠️  Menus without path:')
      menusWithoutPath.forEach(menu => {
        console.log(`- ${menu.name} (${menu.code})`)
      })
    }

    // 修复一些常见的路径问题
    console.log('\n🔧 Fixing common path issues...')

    // 修复用户管理路径
    await sequelize.query(`
      UPDATE menu_permissions 
      SET path = '/users' 
      WHERE code = 'system:users' AND (path IS NULL OR path = '/system/users')
    `)

    // 修复权限管理路径
    await sequelize.query(`
      UPDATE menu_permissions 
      SET path = '/game-permissions' 
      WHERE code = 'system:permissions' AND (path IS NULL OR path = '/system/permissions')
    `)

    // 修复系统管理路径（父菜单通常不需要路径）
    await sequelize.query(`
      UPDATE menu_permissions 
      SET path = NULL 
      WHERE code = 'system' AND parent_id IS NULL
    `)

    console.log('✅ Menu paths checked and fixed!')

    // 重新查看修复后的路径
    const [updatedMenus] = await sequelize.query(`
      SELECT id, name, code, path, parent_id 
      FROM menu_permissions 
      WHERE status = 'active'
      ORDER BY parent_id IS NULL DESC, parent_id, sort
    `)

    console.log('\n📋 Updated menu paths:')
    console.log('================================')
    
    if (Array.isArray(updatedMenus) && updatedMenus.length > 0) {
      updatedMenus.forEach((menu: any) => {
        const level = menu.parent_id ? '  ' : ''
        console.log(`${level}${menu.name} (${menu.code}): ${menu.path || 'NO PATH (Parent Menu)'}`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error checking menu paths:', error)
    process.exit(1)
  }
}

checkMenuPaths()
