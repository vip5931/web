import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const addServerManagement = async () => {
  try {
    console.log('🌍 Adding server management to system...')

    // 连接数据库
    await connectDatabase()

    // 获取系统管理菜单ID
    const [systemMenus] = await sequelize.query(`
      SELECT id FROM menu_permissions WHERE code = 'system' LIMIT 1
    `)

    let systemMenuId = null
    if (systemMenus && (systemMenus as any[]).length > 0) {
      systemMenuId = (systemMenus as any[])[0].id
    }

    // 检查区服管理是否已存在
    const [existingServerManagement] = await sequelize.query(`
      SELECT id FROM menu_permissions WHERE code = 'system:server-management' LIMIT 1
    `)

    if ((existingServerManagement as any[]).length === 0) {
      // 添加区服管理
      await sequelize.query(`
        INSERT INTO menu_permissions (name, code, path, component, icon, parent_id, sort, status) 
        VALUES ('区服管理', 'system:server-management', '/server-management', 'ServerManagementView', NULL, ?, 4, 'active')
      `, { replacements: [systemMenuId] })

      console.log('✅ Server management added successfully!')
    } else {
      console.log('ℹ️  Server management already exists')
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
    console.error('❌ Error adding server management:', error)
    process.exit(1)
  }
}

addServerManagement()
