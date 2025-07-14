import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const updateRankingMenus = async () => {
  try {
    console.log('🏆 Updating ranking management menus...')

    // 连接数据库
    await connectDatabase()

    // 1. 删除旧的数据管理相关菜单
    console.log('🗑️ Removing old data management menus...')
    await sequelize.query(`
      DELETE FROM menu_permissions 
      WHERE code IN ('data', 'data:import', 'data:export')
    `)

    // 2. 清理现有的排行榜菜单
    await sequelize.query(`
      DELETE FROM menu_permissions 
      WHERE code LIKE 'ranking%'
    `)

    // 3. 插入新的排行榜管理菜单
    console.log('📋 Adding new ranking management menus...')
    
    const menus = [
      // 主菜单
      ['排行榜管理', 'ranking', '/ranking', null, 'TrophyOutlined', null, 2],
      
      // 子菜单 - 玩家排行
      ['玩家排行', 'ranking:player', '/ranking/player', 'PlayerRankingView', null, null, 1],
      
      // 子菜单 - 门派排行  
      ['门派排行', 'ranking:school', '/ranking/school', 'SchoolRankingView', null, null, 2]
    ]

    for (const menu of menus) {
      const [name, code, path, component, icon, parentId, sort] = menu
      
      // 如果是子菜单，需要找到父菜单ID
      let actualParentId = parentId
      if (code.includes(':')) {
        const [parentResult] = await sequelize.query(`
          SELECT id FROM menu_permissions WHERE code = 'ranking' LIMIT 1
        `)
        if (parentResult && (parentResult as any[]).length > 0) {
          actualParentId = (parentResult as any[])[0].id
        }
      }

      await sequelize.query(`
        INSERT INTO menu_permissions (name, code, path, component, icon, parent_id, sort, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, 'active')
      `, { 
        replacements: [name, code, path, component, icon, actualParentId, sort] 
      })
    }

    console.log('✅ Ranking management menus updated successfully!')

    // 4. 显示更新后的菜单结构
    console.log('\n📋 Updated menu structure:')
    const [allMenus] = await sequelize.query(`
      SELECT id, name, code, path, parent_id, sort 
      FROM menu_permissions 
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
    console.error('❌ Error updating ranking menus:', error)
    process.exit(1)
  }
}

updateRankingMenus()
