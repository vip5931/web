import { Sequelize } from 'sequelize'

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: process.env.DB_PATH || './database.sqlite',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  }
})

// 测试数据库连接
export const connectDatabase = async () => {
  try {
    await sequelize.authenticate()
    console.log('✅ Database connection has been established successfully.')

    // 同步数据库模型
    await sequelize.sync({ alter: true })
    console.log('✅ Database models synchronized.')
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    process.exit(1)
  }
}

export default sequelize
