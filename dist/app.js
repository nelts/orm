"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const nelts_1 = require("@nelts/nelts");
const sequelize_1 = require("sequelize");
const globby_1 = require("globby");
const Redis = require("ioredis");
const redis_1 = require("./redis");
exports.default = (app) => {
    const sequelizes = {};
    const temp = {};
    let redis;
    app.on('ServerStopping', () => {
        if (redis) {
            redis.quit();
        }
    });
    app.on('ContextGuard', ctx => {
        ctx.sequelize = Object.freeze(sequelizes);
        ctx.redis = redis;
    });
    app.on('props', async (configs) => {
        if (configs.sequelize) {
            const sequelizeConfigs = !Array.isArray(configs.sequelize)
                ? [configs.sequelize]
                : configs.sequelize;
            for (let i = 0; i < sequelizeConfigs.length; i++) {
                const config = sequelizeConfigs[i];
                const sequelize = new sequelize_1.Sequelize(config.database, config.username, config.password, {
                    dialect: config.dialect,
                    port: config.port,
                    host: config.host,
                    pool: config.pool,
                    retry: config.retry,
                    storage: config.storage,
                });
                if (temp[config.alias]) {
                    if (!sequelizes[config.alias])
                        sequelizes[config.alias] = {};
                    for (const table in temp[config.alias]) {
                        const expo = temp[config.alias][table];
                        if (expo.installer) {
                            expo.installer(sequelize);
                            await expo.sync();
                        }
                        sequelizes[config.alias][table] = expo;
                    }
                    sequelizes[config.alias] = Object.freeze(sequelizes[config.alias]);
                }
            }
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
            `sequelize/*/*.ts`,
            'sequelize/*/*.js',
            '!sequelize/*/*.d.ts',
        ], { cwd });
        files.forEach(file => {
            const ap = file.split('/');
            const database = ap[1];
            const tablename = path.basename(ap[2], path.extname(ap[2]));
            const filepath = path.resolve(cwd, file);
            const fileExports = nelts_1.Require(filepath);
            if (!temp[database])
                temp[database] = {};
            if (temp[database][tablename])
                throw new Error(`${database}.${tablename} is exists.`);
            temp[database][tablename] = fileExports;
        });
    });
};
