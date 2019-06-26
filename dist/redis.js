"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class RedisJSON {
    constructor(redisClient, prefix) {
        this.redisClient = redisClient;
        this.prefix = prefix || 'jc:';
    }
    getKey(key) {
        return `${this.prefix}${key}`;
    }
    async set(key, obj, expire) {
        const keyed = this.getKey(key);
        await this.redisClient.set.call(this.redisClient, keyed, JSON.stringify(obj));
        if (expire) {
            await this.redisClient.expire.call(this.redisClient, keyed, expire);
        }
    }
    async get(key) {
        const keyed = this.getKey(key);
        const value = await this.redisClient.get.call(this.redisClient, keyed);
        if (value)
            return JSON.parse(value);
    }
    async exists(key) {
        return await this.redisClient.exists.call(this.redisClient, this.getKey(key));
    }
    async delete(key) {
        return await this.redisClient.del.call(this.redisClient, this.getKey(key));
    }
    async clear() {
        const keys = await this.redisClient.keys.call(this.redisClient, `${this.prefix}*`);
        await this.redisClient.multi(keys.map((k) => ['del', k])).exec();
    }
}
exports.default = RedisJSON;
