import * as path from 'path';
import { Plugin, Require } from '@nelts/nelts';
import { Sequelize, Model } from 'sequelize';
import globby from 'globby';
import * as Redis from 'ioredis';
import RedisJSON from './redis';
import { PluginProps } from './index';

export default (app: Plugin) => {
  const tableInits: string[] = [];
  let redis: RedisJSON;

  app.on('ServerStopping', () => redis && redis.quit());
  app.on('ContextGuard', ctx => {
    Object.defineProperties(ctx, {
      cache: { get() { return this.app._caches; } },
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
      for (const i in app._tables) {
        if (tableInits.indexOf(i) > -1) continue;
        const model: any = app._tables[i];
        if (typeof model.installer === 'function') {
          model.installer(database);
          await model.sync();
        }
        tableInits.push(i);
      }
      app._tables = Object.freeze(app._tables);
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
      const fileExports = Require<typeof Model>(filepath);
      if (plugin._tables[tablename]) throw new Error(`table<${tablename}> is already exist on database`);
      plugin._tables[tablename] = fileExports;
    });
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