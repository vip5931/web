import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface RolePermissionAttributes {
  id: number
  roleId: number
  permissionId: number
  createdAt: Date
  updatedAt: Date
}

interface RolePermissionCreationAttributes extends Optional<RolePermissionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class RolePermission extends Model<RolePermissionAttributes, RolePermissionCreationAttributes> implements RolePermissionAttributes {
  public id!: number
  public roleId!: number
  public permissionId!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

RolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      comment: '角色ID',
    },
    permissionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'permission_id',
      comment: '权限ID',
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at',
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at',
    },
  },
  {
    sequelize,
    tableName: 'role_permissions',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['role_id', 'permission_id'],
      },
    ],
  }
)

export default RolePermission
