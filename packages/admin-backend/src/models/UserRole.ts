import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface UserRoleAttributes {
  id: number
  userId: number
  roleId: number
  createdAt: Date
  updatedAt: Date
}

interface UserRoleCreationAttributes extends Optional<UserRoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class UserRole extends Model<UserRoleAttributes, UserRoleCreationAttributes> implements UserRoleAttributes {
  public id!: number
  public userId!: number
  public roleId!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

UserRole.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'user_id',
      comment: '用户ID',
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'role_id',
      comment: '角色ID',
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
    tableName: 'user_roles',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        unique: true,
        fields: ['user_id', 'role_id'],
      },
    ],
  }
)

export default UserRole
