import { Sequelize } from 'sequelize'

const sequelize = new Sequelize({
  dialect: 'mysql',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'admin_system',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
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

    // 暂时禁用自动同步，避免索引冲突
    // await sequelize.sync({ alter: true })
    console.log('✅ Database models ready.')
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error)
    process.exit(1)
  }
}

export { sequelize }
export default sequelize
