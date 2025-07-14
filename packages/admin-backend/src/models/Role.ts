import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface RoleAttributes {
  id: number
  name: string
  code: string
  description?: string
  status: 'active' | 'inactive'
  sort: number
  createdAt: Date
  updatedAt: Date
}

interface RoleCreationAttributes
  extends Optional<RoleAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Role extends Model<RoleAttributes, RoleCreationAttributes> implements RoleAttributes {
  public id!: number
  public name!: string
  public code!: string
  public description?: string
  public status!: 'active' | 'inactive'
  public sort!: number
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Role.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '角色名称'
    },
    code: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
      comment: '角色编码'
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '角色描述'
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态'
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'updated_at'
    }
  },
  {
    sequelize,
    tableName: 'roles',
    timestamps: true,
    underscored: true
  }
)

export default Role
