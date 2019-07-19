import * as path from 'path';
import { Require } from '@nelts/nelts';
import { Sequelize } from 'sequelize';
import globby from 'globby';
import * as Redis from 'ioredis';
import RedisJSON from './redis';
import { PluginProps, SequelizeModelInterface, OrmWorkerPlugin } from './index';

export default (app: OrmWorkerPlugin) => {
  let sequelize: Sequelize;
  const tableInits: string[] = [];
  let redis: RedisJSON;

  app.on('ServerStopping', () => redis && redis.quit());
  app.on('ContextGuard', ctx => {
    Object.defineProperties(ctx, {
      dbo: { get() { return this.app._tables; } },
      redis: { get() { return redis; } },
      sequelize: { get() { return sequelize; } }
    });
  });

  app.on('props', async (configs: PluginProps) => {
    if (configs.sequelize) {
      sequelize = new Sequelize(
        configs.sequelize.database, 
        configs.sequelize.username, 
        configs.sequelize.password, 
        configs.sequelize.options,
      );
      await app.root.broadcast('DBOINIT', sequelize);
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
      // app._caches = Object.freeze(app._caches);
    }
  });

  app.addCompiler(async (plugin: any) => {
    if (app.name !== plugin.name && !plugin.isDepended(app.name)) return;
    const cwd = plugin.source;
    const files = await globby([
      `sequelize/*.ts`, 
      'sequelize/*.js', 
      '!sequelize/*.d.ts',
    ], { cwd });

    const tables: { [name: string]: SequelizeModelInterface } = {};

    files.forEach(file => {
      const tablename = file.split('/').slice(-1)[0].split('.').slice(0, -1).join('.');
      const filepath = path.resolve(cwd, file);
      const fileExports = Require<SequelizeModelInterface>(filepath);
      if (tables[tablename]) throw new Error(`table<${tablename}> is already exist on database`);
      tables[tablename] = fileExports;
    });

    plugin.on('DBOINIT', async (database: Sequelize) => {
      for (const i in tables) {
        if (tableInits.indexOf(i) > -1) continue;
        const model: any = tables[i];
        if (typeof model.installer === 'function') {
          model.installer(database);
          await model.sync();
        }
        tableInits.push(i);
      }
      plugin._tables = Object.freeze(tables);
    })
  });

  // app.addCompiler(async (plugin: Plugin) => {
  //   if (app.name !== plugin.name && !plugin.isDepended(app.name)) return;
  //   const cwd = plugin.source;
  //   const files = await globby([
  //     `cache/**/*.ts`, 
  //     'cache/**/*.js', 
  //     '!cache/**/*.d.ts',
  //   ], { cwd });
  //   plugin._caches = {};
  //   files.forEach(file => {
  //     const filepath = path.resolve(cwd, file);
  //     const fileExports = Require(filepath);
  //     if (fileExports.name) plugin._caches[fileExports.name] = fileExports;
  //   })
  // });
}