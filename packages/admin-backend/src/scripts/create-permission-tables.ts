import 'dotenv/config'
import { connectDatabase, sequelize } from '../config/database'
import bcrypt from 'bcryptjs'

const createPermissionTables = async () => {
  try {
    console.log('🔄 Creating permission management tables...')

    // 连接数据库
    await connectDatabase()

    // 创建角色表
    console.log('📋 Creating roles table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '角色名称',
        code VARCHAR(50) NOT NULL UNIQUE COMMENT '角色编码',
        description VARCHAR(200) COMMENT '角色描述',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
        sort INT NOT NULL DEFAULT 0 COMMENT '排序',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色表'
    `)

    // 创建权限表
    console.log('📋 Creating permissions table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(50) NOT NULL COMMENT '权限名称',
        code VARCHAR(100) NOT NULL UNIQUE COMMENT '权限编码',
        type ENUM('menu', 'button', 'api') NOT NULL COMMENT '权限类型',
        parent_id INT COMMENT '父级权限ID',
        path VARCHAR(200) COMMENT '路由路径',
        component VARCHAR(200) COMMENT '组件路径',
        icon VARCHAR(50) COMMENT '图标',
        sort INT NOT NULL DEFAULT 0 COMMENT '排序',
        status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
        description VARCHAR(200) COMMENT '权限描述',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (parent_id) REFERENCES permissions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='权限表'
    `)

    // 创建用户角色关联表
    console.log('📋 Creating user_roles table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL COMMENT '用户ID',
        role_id INT NOT NULL COMMENT '角色ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_role (user_id, role_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户角色关联表'
    `)

    // 创建角色权限关联表
    console.log('📋 Creating role_permissions table...')
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        role_id INT NOT NULL COMMENT '角色ID',
        permission_id INT NOT NULL COMMENT '权限ID',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_role_permission (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='角色权限关联表'
    `)

    console.log('✅ All permission tables created successfully!')

    // 插入默认数据
    console.log('🔄 Inserting default data...')

    // 插入默认角色
    await sequelize.query(`
      INSERT IGNORE INTO roles (name, code, description, status, sort) VALUES
      ('超级管理员', 'admin', '系统超级管理员，拥有所有权限', 'active', 1),
      ('普通用户', 'user', '普通用户角色', 'active', 2)
    `)

    // 插入默认权限
    const permissions = [
      // 仪表盘
      ['仪表盘', 'dashboard', 'menu', null, '/dashboard', 'DashboardView', 'DashboardOutlined', 1],
      
      // 用户管理
      ['用户管理', 'user', 'menu', null, '/users', 'UsersView', 'UserOutlined', 2],
      ['用户查看', 'user:view', 'button', null, null, null, null, 1],
      ['用户新增', 'user:create', 'button', null, null, null, null, 2],
      ['用户编辑', 'user:edit', 'button', null, null, null, null, 3],
      ['用户删除', 'user:delete', 'button', null, null, null, null, 4],
      
      // 角色管理
      ['角色管理', 'role', 'menu', null, '/roles', 'RolesView', 'TeamOutlined', 3],
      ['角色查看', 'role:view', 'button', null, null, null, null, 1],
      ['角色新增', 'role:create', 'button', null, null, null, null, 2],
      ['角色编辑', 'role:edit', 'button', null, null, null, null, 3],
      ['角色删除', 'role:delete', 'button', null, null, null, null, 4],
      
      // 权限管理
      ['权限管理', 'permission', 'menu', null, '/permissions', 'PermissionsView', 'SafetyOutlined', 4],
      ['权限查看', 'permission:view', 'button', null, null, null, null, 1],
      ['权限新增', 'permission:create', 'button', null, null, null, null, 2],
      ['权限编辑', 'permission:edit', 'button', null, null, null, null, 3],
      ['权限删除', 'permission:delete', 'button', null, null, null, null, 4]
    ]

    for (const perm of permissions) {
      await sequelize.query(`
        INSERT IGNORE INTO permissions (name, code, type, parent_id, path, component, icon, sort, status, description) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
      `, {
        replacements: [...perm, `${perm[0]}权限`]
      })
    }

    // 给管理员角色分配所有权限
    await sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT 1, id FROM permissions
    `)

    // 给普通用户角色分配基础权限
    await sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT 2, id FROM permissions WHERE code IN ('dashboard', 'user:view')
    `)

    // 给现有的 admin 用户分配管理员角色
    await sequelize.query(`
      INSERT IGNORE INTO user_roles (user_id, role_id)
      SELECT id, 1 FROM users WHERE username = 'admin'
    `)

    console.log('✅ Default data inserted successfully!')
    console.log('✅ Permission management system initialized!')

    process.exit(0)
  } catch (error) {
    console.error('❌ Error creating permission tables:', error)
    process.exit(1)
  }
}

createPermissionTables()
