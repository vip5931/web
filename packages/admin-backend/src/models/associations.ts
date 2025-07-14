import User from './User'
import Role from './Role'
import Permission from './Permission'
import UserRole from './UserRole'
import RolePermission from './RolePermission'

// 用户和角色的多对多关系
User.belongsToMany(Role, {
  through: UserRole,
  foreignKey: 'userId',
  otherKey: 'roleId',
  as: 'roles'
})

Role.belongsToMany(User, {
  through: UserRole,
  foreignKey: 'roleId',
  otherKey: 'userId',
  as: 'users'
})

// 角色和权限的多对多关系
Role.belongsToMany(Permission, {
  through: RolePermission,
  foreignKey: 'roleId',
  otherKey: 'permissionId',
  as: 'permissions'
})

Permission.belongsToMany(Role, {
  through: RolePermission,
  foreignKey: 'permissionId',
  otherKey: 'roleId',
  as: 'roles'
})

// 权限的自关联（父子关系）
Permission.hasMany(Permission, {
  foreignKey: 'parentId',
  as: 'children'
})

Permission.belongsTo(Permission, {
  foreignKey: 'parentId',
  as: 'parent'
})

// 中间表关联
UserRole.belongsTo(User, { foreignKey: 'userId' })
UserRole.belongsTo(Role, { foreignKey: 'roleId' })

RolePermission.belongsTo(Role, { foreignKey: 'roleId' })
RolePermission.belongsTo(Permission, { foreignKey: 'permissionId' })

export {
  User,
  Role,
  Permission,
  UserRole,
  RolePermission
}
