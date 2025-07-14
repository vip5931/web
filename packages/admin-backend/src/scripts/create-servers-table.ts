import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const createServersTable = async () => {
  try {
    console.log('🌍 Creating servers table...')

    // 连接数据库
    await connectDatabase()

    // 创建区服表
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS servers (
        id bigint NOT NULL AUTO_INCREMENT COMMENT '区服ID',
        name varchar(100) NOT NULL COMMENT '区服名称',
        code varchar(50) NOT NULL COMMENT '区服编码',
        region varchar(50) NOT NULL COMMENT '区服区域',
        status enum('active','inactive','maintenance') NOT NULL DEFAULT 'active' COMMENT '区服状态',
        description text COMMENT '区服描述',
        max_players int DEFAULT 10000 COMMENT '最大玩家数',
        open_time datetime COMMENT '开服时间',
        created_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        updated_at datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (id),
        UNIQUE KEY uk_name (name),
        UNIQUE KEY uk_code (code),
        KEY idx_region (region),
        KEY idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci COMMENT='区服信息表'
    `)

    console.log('✅ Servers table created successfully!')

    // 从现有数据中导入区服
    console.log('📊 Importing existing servers from ranking data...')
    
    // 从排行榜数据中获取区服
    const [existingServers] = await sequelize.query(`
      SELECT DISTINCT server_name as name FROM rank_list
      UNION
      SELECT DISTINCT server as name FROM school
      ORDER BY name
    `)

    if ((existingServers as any[]).length > 0) {
      for (const server of existingServers as any[]) {
        const serverName = server.name
        const serverCode = serverName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        
        // 判断区域
        let region = '其他'
        if (serverName.includes('QQ')) {
          region = 'QQ'
        } else if (serverName.includes('微信')) {
          region = '微信'
        } else if (serverName.includes('安卓')) {
          region = '安卓'
        }

        try {
          await sequelize.query(`
            INSERT IGNORE INTO servers (name, code, region, status, description, open_time)
            VALUES (?, ?, ?, 'active', ?, NOW())
          `, {
            replacements: [
              serverName,
              serverCode,
              region,
              `${serverName} - 自动导入`
            ]
          })
        } catch (error) {
          console.warn(`Failed to import server ${serverName}:`, error)
        }
      }
      
      console.log(`✅ Imported ${(existingServers as any[]).length} servers from existing data`)
    }

    // 显示导入的区服
    const [allServers] = await sequelize.query(`
      SELECT id, name, code, region, status FROM servers ORDER BY region, name
    `)

    console.log('\n📋 Current servers:')
    console.log('================================')
    
    if (Array.isArray(allServers) && allServers.length > 0) {
      let currentRegion = ''
      allServers.forEach((server: any) => {
        if (server.region !== currentRegion) {
          currentRegion = server.region
          console.log(`\n${currentRegion}区:`)
        }
        console.log(`  - ${server.name} (${server.code}) [${server.status}]`)
      })
    }

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating servers table:', error)
    process.exit(1)
  }
}

createServersTable()
