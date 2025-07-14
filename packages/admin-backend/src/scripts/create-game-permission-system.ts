import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'

const createGamePermissionSystem = async () => {
  try {
    console.log('🎮 Creating game ranking permission system...')

    // 连接数据库
    await connectDatabase()

    // 1. 重新设计角色表 - 简化为三个固定角色
    console.log('📋 Recreating roles table...')
    await sequelize.query('DROP TABLE IF EXISTS role_permissions')
    await sequelize.query('DROP TABLE IF EXISTS user_roles')
    await sequelize.query('DROP TABLE IF EXISTS roles')
    
    await sequelize.query(`
      CREATE TABLE roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '角色名称',
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
        level INT NOT NULL COMMENT '权限级别：1-超级管理员，2-管理员，3-普通员工',
        description VARCHAR(200) COMMENT '角色描述',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表'
    `)

    // 2. 创建区服表
    console.log('📋 Creating game_servers table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS game_servers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL COMMENT '区服名称',
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '区服编码',
        region VARCHAR(50) COMMENT '地区',
        status ENUM('active', 'inactive', 'maintenance') NOT NULL DEFAULT 'active',
        sort INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='游戏区服表'
    `)

    // 3. 创建菜单权限表
    console.log('📋 Creating menu_permissions table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS menu_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '菜单名称',
        code VARCHAR(100) NOT NULL UNIQUE COMMENT '菜单编码',
        path VARCHAR(200) COMMENT '路由路径',
        component VARCHAR(200) COMMENT '组件路径',
        icon VARCHAR(50) COMMENT '图标',
        parent_id INT COMMENT '父级菜单ID',
        sort INT NOT NULL DEFAULT 0,
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES menu_permissions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='菜单权限表'
    `)

    // 4. 创建操作权限表
    console.log('📋 Creating operation_permissions table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS operation_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '操作名称',
        code VARCHAR(100) NOT NULL UNIQUE COMMENT '操作编码',
        description VARCHAR(200) COMMENT '操作描述',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='操作权限表'
    `)

    // 5. 重新创建用户角色关联表
    console.log('📋 Creating user_roles table...')
    await sequelize.query(`
      CREATE TABLE user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        role_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表'
    `)

    // 6. 创建员工权限配置表
    console.log('📋 Creating staff_permissions table...')
    await sequelize.query(`
      CREATE TABLE staff_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '员工用户ID',
        menu_permissions JSON COMMENT '菜单权限ID数组',
        server_permissions JSON COMMENT '区服权限ID数组',
        operation_permissions JSON COMMENT '操作权限ID数组',
        created_by INT NOT NULL COMMENT '设置人ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_permission (user_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (created_by) REFERENCES users(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='员工权限配置表'
    `)

    console.log('✅ All game permission tables created successfully!')

    // 插入默认数据
    console.log('🔄 Inserting default data...')

    // 插入三个固定角色
    await sequelize.query(`
      INSERT INTO roles (name, code, level, description) VALUES
      ('超级管理员', 'super_admin', 1, '系统超级管理员，拥有所有权限'),
      ('管理员', 'admin', 2, '管理员，可以管理员工权限'),
      ('普通员工', 'staff', 3, '普通员工，权限受限')
    `)

    // 插入默认区服
    await sequelize.query(`
      INSERT INTO game_servers (name, code, region, sort) VALUES
      ('测试服', 'test', '测试区', 1),
      ('体验服', 'beta', '测试区', 2),
      ('正式服1区', 'server1', '华东', 3),
      ('正式服2区', 'server2', '华南', 4),
      ('正式服3区', 'server3', '华北', 5)
    `)

    // 插入默认菜单权限
    const menus = [
      ['仪表盘', 'dashboard', '/dashboard', 'DashboardView', 'DashboardOutlined', null, 1],
      ['排行榜管理', 'ranking', '/ranking', null, 'TrophyOutlined', null, 2],
      ['玩家排行', 'ranking:player', '/ranking/player', 'PlayerRankingView', null, 2, 1],
      ['公会排行', 'ranking:guild', '/ranking/guild', 'GuildRankingView', null, 2, 2],
      ['活动排行', 'ranking:activity', '/ranking/activity', 'ActivityRankingView', null, 2, 3],
      ['数据管理', 'data', '/data', null, 'DatabaseOutlined', null, 3],
      ['数据导入', 'data:import', '/data/import', 'DataImportView', null, 6, 1],
      ['数据导出', 'data:export', '/data/export', 'DataExportView', null, 6, 2],
      ['系统管理', 'system', '/system', null, 'SettingOutlined', null, 4],
      ['用户管理', 'system:users', '/system/users', 'UsersView', null, 9, 1],
      ['权限管理', 'system:permissions', '/system/permissions', 'PermissionsView', null, 9, 2]
    ]

    for (const menu of menus) {
      await sequelize.query(`
        INSERT INTO menu_permissions (name, code, path, component, icon, parent_id, sort) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, { replacements: menu })
    }

    // 插入默认操作权限
    await sequelize.query(`
      INSERT INTO operation_permissions (name, code, description) VALUES
      ('查看', 'view', '查看数据权限'),
      ('新增', 'create', '新增数据权限'),
      ('编辑', 'edit', '编辑数据权限'),
      ('删除', 'delete', '删除数据权限'),
      ('导入', 'import', '数据导入权限'),
      ('导出', 'export', '数据导出权限'),
      ('审核', 'audit', '数据审核权限')
    `)

    // 给现有的 admin 用户分配超级管理员角色
    await sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT id, 1 FROM users WHERE username = 'admin'
    `)

    console.log('✅ Default data inserted successfully!')
    console.log('✅ Game ranking permission system initialized!')

    // 显示权限系统说明
    console.log('\n🎮 游戏排行榜权限系统说明:')
    console.log('================================')
    console.log('1. 超级管理员 (super_admin): 拥有所有权限')
    console.log('2. 管理员 (admin): 拥有所有权限 + 可以设置员工权限')
    console.log('3. 普通员工 (staff): 权限受限，由管理员分配')
    console.log('')
    console.log('权限维度:')
    console.log('- 菜单权限: 控制可访问的页面')
    console.log('- 区服权限: 控制可操作的游戏区服')
    console.log('- 操作权限: 控制增删改查等操作')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating game permission system:', error)
    process.exit(1)
  }
}

createGamePermissionSystem()
