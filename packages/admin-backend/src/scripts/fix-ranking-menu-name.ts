import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const fixRankingMenuName = async () => {
  try {
    console.log('🔧 Fixing ranking menu name...')

    // 连接数据库
    await connectDatabase()

    // 更新菜单名称
    await sequelize.query(`
      UPDATE menu_permissions 
      SET name = '排行管理' 
      WHERE code = 'ranking'
    `)

    console.log('✅ Menu name updated to "排行管理"')

    // 验证更新结果
    const [menus] = await sequelize.query(`
      SELECT name, code FROM menu_permissions WHERE code LIKE 'ranking%'
    `)

    console.log('\n📋 Updated ranking menus:')
    menus.forEach((menu: any) => {
      console.log(`- ${menu.name} (${menu.code})`)
    })

    process.exit(0)
  } catch (error) {
    console.error('❌ Error fixing ranking menu name:', error)
    process.exit(1)
  }
}

fixRankingMenuName()
