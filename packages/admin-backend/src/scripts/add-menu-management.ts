import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const addMenuManagement = async () => {
  try {
    console.log('📋 Adding menu management to system...')

    // 连接数据库
    await connectDatabase()

    // 添加菜单管理到系统管理下
    const [systemMenus] = await sequelize.query(`
      SELECT id FROM menu_permissions WHERE code = 'system' LIMIT 1
    `)

    let systemMenuId = null
    if (systemMenus && (systemMenus as any[]).length > 0) {
      systemMenuId = (systemMenus as any[])[0].id
    } else {
      // 如果没有系统管理菜单，先创建
      await sequelize.query(`
        INSERT INTO menu_permissions (name, code, path, icon, parent_id, sort, status) 
        VALUES ('系统管理', 'system', '/system', 'SettingOutlined', NULL, 10, 'active')
      `)
      
      const [newSystemMenus] = await sequelize.query(`
        SELECT id FROM menu_permissions WHERE code = 'system' LIMIT 1
      `)
      systemMenuId = (newSystemMenus as any[])[0].id
    }

    // 检查菜单管理是否已存在
    const [existingMenuManagement] = await sequelize.query(`
      SELECT id FROM menu_permissions WHERE code = 'system:menu-management' LIMIT 1
    `)

    if ((existingMenuManagement as any[]).length === 0) {
      // 添加菜单管理
      await sequelize.query(`
        INSERT INTO menu_permissions (name, code, path, component, icon, parent_id, sort, status) 
        VALUES ('菜单管理', 'system:menu-management', '/menu-management', 'MenuManagementView', NULL, ?, 3, 'active')
      `, { replacements: [systemMenuId] })

      console.log('✅ Menu management added successfully!')
    } else {
      console.log('ℹ️  Menu management already exists')
    }

    // 显示更新后的菜单结构
    console.log('\n📋 Current menu structure:')
    const [allMenus] = await sequelize.query(`
      SELECT id, name, code, path, parent_id, sort 
      FROM menu_permissions 
      WHERE status = 'active'
      ORDER BY parent_id IS NULL DESC, parent_id, sort
    `)

    const buildMenuTree = (menus: any[], parentId: number | null = null, level = 0): void => {
      const children = menus.filter(m => m.parent_id === parentId)
      children.forEach(menu => {
        const indent = '  '.repeat(level)
        console.log(`${indent}- ${menu.name} (${menu.code}) - ${menu.path || 'No path'}`)
        buildMenuTree(menus, menu.id, level + 1)
      })
    }

    buildMenuTree(allMenus as any[])

    process.exit(0)
  } catch (error) {
    console.error('❌ Error adding menu management:', error)
    process.exit(1)
  }
}

addMenuManagement()
