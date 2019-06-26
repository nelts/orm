import * as path from 'path';
import { Plugin, Require } from '@nelts/nelts';
import { Sequelize, PoolOptions, RetryOptions, Dialect, Model } from 'sequelize';
import globby from 'globby';
import * as Redis from 'ioredis';
import RedisJSON from './redis';

type SequelizeMap<T = any> = { 
  [name: string]: {
    [name: string]: T
  }
}

export default (app: Plugin) => {
  const sequelizes: SequelizeMap<Model> = {};
  const temp: SequelizeMap = {};
  let redis: RedisJSON;

  app.on('ServerStopping', () => {
    if (redis) {
      redis.quit();
    }
  });

  app.on('ContextGuard', ctx => {
    ctx.sequelize = Object.freeze(sequelizes);
    ctx.redis = redis;
  });

  app.on('props', configs => {
    if (configs.sequelize) {
      const sequelizeConfigs = !Array.isArray(configs.sequelize) 
        ? [configs.sequelize] 
        : configs.sequelize;

      for (let i = 0; i < sequelizeConfigs.length; i++) {
        const config = sequelizeConfigs[i];
        const sequelize = new Sequelize(config.database, config.username, config.password, {
          dialect: config.dialect as Dialect,
          port: config.port,
          host: config.host,
          pool: config.pool as PoolOptions,
          retry: config.retry as RetryOptions,
          storage: config.storage,
        });

        if (temp[config.alias]) {
          if (!sequelizes[config.alias]) sequelizes[config.alias] = {};
          for (const table in temp[config.alias]) {
            const expo = temp[config.alias][table];
            if (expo.installer) expo.installer(sequelize);
            sequelizes[config.alias][table] = expo;
          }
          sequelizes[config.alias] = Object.freeze(sequelizes[config.alias]);
        }
      }
    }
    if (configs.redis) {
      let reidsClient: Redis.Redis | Redis.Cluster;
      if (configs.redis === true) {
        reidsClient = new Redis();
      } else if (typeof configs.redis === 'string'){
        const a = configs.redis.split(':');
        reidsClient = new Redis({
          port: Number(a[1] || 6379),
          host: a[0],
        });
      } else {
        reidsClient = new Redis(configs.redis);
      }
      redis = new RedisJSON(reidsClient, configs.redis_prefix);
    }
  });

  app.addCompiler(async (plugin: Plugin) => {
    if (app.name !== plugin.name && !plugin.isDepended(app.name)) return;
    const cwd = plugin.source;
    const files = await globby([
      `sequelize/*/*.ts`, 
      'sequelize/*/*.js', 
      '!sequelize/*/*.d.ts',
    ], { cwd });
    files.forEach(file => {
      const ap = file.split('/');
      const database = ap[1];
      const tablename = path.basename(ap[2], path.extname(ap[2]));
      const filepath = path.resolve(cwd, file);
      const fileExports = Require(filepath);
      if (!temp[database]) temp[database] = {};
      if (temp[database][tablename]) throw new Error(`${database}.${tablename} is exists.`);
      temp[database][tablename] = fileExports;
    })
  });
}