import { DataTypes, Model, Optional } from 'sequelize'
import { sequelize } from '../config/database'

interface PermissionAttributes {
  id: number
  name: string
  code: string
  type: 'menu' | 'button' | 'api'
  parentId?: number
  path?: string
  component?: string
  icon?: string
  sort: number
  status: 'active' | 'inactive'
  description?: string
  createdAt: Date
  updatedAt: Date
}

interface PermissionCreationAttributes extends Optional<PermissionAttributes, 'id' | 'createdAt' | 'updatedAt'> {}

class Permission extends Model<PermissionAttributes, PermissionCreationAttributes> implements PermissionAttributes {
  public id!: number
  public name!: string
  public code!: string
  public type!: 'menu' | 'button' | 'api'
  public parentId?: number
  public path?: string
  public component?: string
  public icon?: string
  public sort!: number
  public status!: 'active' | 'inactive'
  public description?: string
  public readonly createdAt!: Date
  public readonly updatedAt!: Date
}

Permission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
      comment: '权限名称',
    },
    code: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
      comment: '权限编码',
    },
    type: {
      type: DataTypes.ENUM('menu', 'button', 'api'),
      allowNull: false,
      comment: '权限类型：menu-菜单，button-按钮，api-接口',
    },
    parentId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'parent_id',
      comment: '父级权限ID',
    },
    path: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '路由路径',
    },
    component: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '组件路径',
    },
    icon: {
      type: DataTypes.STRING(50),
      allowNull: true,
      comment: '图标',
    },
    sort: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: '排序',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
      comment: '状态',
    },
    description: {
      type: DataTypes.STRING(200),
      allowNull: true,
      comment: '权限描述',
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
    tableName: 'permissions',
    timestamps: true,
    underscored: true,
  }
)

export default Permission
