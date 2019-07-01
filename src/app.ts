import * as path from 'path';
import { Plugin, Require } from '@nelts/nelts';
import { Sequelize, Model } from 'sequelize';
import globby from 'globby';
import * as Redis from 'ioredis';
import RedisJSON from './redis';
import { PluginProps, SequelizeModelInterface } from './index';

export default (app: Plugin) => {
  const tableInits: string[] = [];
  let redis: RedisJSON;

  app.on('ServerStopping', () => redis && redis.quit());
  app.on('ContextGuard', ctx => {
    Object.defineProperties(ctx, {
      dbo: { get() { return this.app._tables; } },
      redis: { get() { return redis; } },
    });
  });

  app.on('props', async (configs: PluginProps) => {
    if (configs.sequelize) {
      const database = new Sequelize(
        configs.sequelize.database, 
        configs.sequelize.username, 
        configs.sequelize.password, 
        configs.sequelize.options,
      );
      await app.root.broadcast('DBOINIT', database);
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

  app.addCompiler(async (plugin: Plugin) => {
    if (app.name !== plugin.name && !plugin.isDepended(app.name)) return;
    const cwd = plugin.source;
    const files = await globby([
      `sequelize/*.ts`, 
      'sequelize/*.js', 
      '!sequelize/*.d.ts',
    ], { cwd });

    plugin._tables = {};

    files.forEach(file => {
      const tablename = file.split('/').slice(-1)[0].split('.').slice(0, -1).join('.');
      const filepath = path.resolve(cwd, file);
      const fileExports = Require<SequelizeModelInterface>(filepath);
      if (plugin._tables[tablename]) throw new Error(`table<${tablename}> is already exist on database`);
      plugin._tables[tablename] = fileExports;
    });

    plugin.on('DBOINIT', async (database: Sequelize) => {
      for (const i in plugin._tables) {
        if (tableInits.indexOf(i) > -1) continue;
        const model: any = plugin._tables[i];
        if (typeof model.installer === 'function') {
          model.installer(database);
          await model.sync();
        }
        tableInits.push(i);
      }
      plugin._tables = Object.freeze(plugin._tables);
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