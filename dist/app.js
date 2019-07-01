"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const nelts_1 = require("@nelts/nelts");
const sequelize_1 = require("sequelize");
const globby_1 = require("globby");
const Redis = require("ioredis");
const redis_1 = require("./redis");
exports.default = (app) => {
    const tableInits = [];
    let redis;
    app.on('ServerStopping', () => redis && redis.quit());
    app.on('ContextGuard', ctx => {
        Object.defineProperties(ctx, {
            cache: { get() { return this.app._caches; } },
            dbo: { get() { return this.app._tables; } },
            redis: { get() { return redis; } },
        });
    });
    app.on('props', async (configs) => {
        if (configs.sequelize) {
            const database = new sequelize_1.Sequelize(configs.sequelize.database, configs.sequelize.username, configs.sequelize.password, configs.sequelize.options);
            for (const i in app._tables) {
                if (tableInits.indexOf(i) > -1)
                    continue;
                const model = app._tables[i];
                if (typeof model.installer === 'function') {
                    model.installer(database);
                    await model.sync();
                }
                tableInits.push(i);
            }
            app._tables = Object.freeze(app._tables);
        }
        if (configs.redis) {
            let reidsClient;
            if (configs.redis === true) {
                reidsClient = new Redis();
            }
            else if (typeof configs.redis === 'string') {
                const a = configs.redis.split(':');
                reidsClient = new Redis({
                    port: Number(a[1] || 6379),
                    host: a[0],
                });
            }
            else {
                reidsClient = new Redis(configs.redis);
            }
            redis = new redis_1.default(reidsClient, configs.redis_prefix);
        }
    });
    app.addCompiler(async (plugin) => {
        if (app.name !== plugin.name && !plugin.isDepended(app.name))
            return;
        const cwd = plugin.source;
        const files = await globby_1.default([
            `sequelize/*.ts`,
            'sequelize/*.js',
            '!sequelize/*.d.ts',
        ], { cwd });
        plugin._tables = {};
        files.forEach(file => {
            const tablename = file.split('/').slice(-1)[0].split('.').slice(0, -1).join('.');
            const filepath = path.resolve(cwd, file);
            const fileExports = nelts_1.Require(filepath);
            if (plugin._tables[tablename])
                throw new Error(`table<${tablename}> is already exist on database`);
            plugin._tables[tablename] = fileExports;
        });
    });
};
