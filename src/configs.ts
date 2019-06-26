export default {
  sequelize: {
    alias: 'cpm',
    database: 'cpm',
    username: 'shenyj',
    password: '!2!34ffh!rfRg89_',
    dialect: 'mysql',
    host: '192.168.2.181',
    pool: {
      max: 10,
      min: 3
    }
  },
  redis: '192.168.2.208:6379'
}