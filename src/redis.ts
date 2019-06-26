import { Redis } from 'ioredis';

export default class RedisJSON {

  private readonly redisClient: Redis;
  private readonly prefix: string;

  constructor(redisClient: Redis, prefix?: string) {
    this.redisClient = redisClient;
    this.prefix = prefix || 'jc:';
  }

  getKey(key: string) {
    return `${this.prefix}${key}`;
  }

  async set(key: string, obj: any, expire?: number) {
    const keyed = this.getKey(key);
    await this.redisClient.set.call(this.redisClient, keyed, JSON.stringify(obj));
    if (expire) {
      await this.redisClient.expire.call(this.redisClient, keyed, expire);
    }
  }

  async get(key: string) {
    const keyed = this.getKey(key);
    const value = await this.redisClient.get.call(this.redisClient, keyed);
    if (value) return JSON.parse(value);
  }

  async exists(key: string) {
    return await this.redisClient.exists.call(this.redisClient, this.getKey(key));
  }

  async delete(key: string) {
    return await this.redisClient.del.call(this.redisClient, this.getKey(key));
  }

  async clear() {
    const keys = await this.redisClient.keys.call(this.redisClient, `${this.prefix}*`);
    // Multi command for efficiently all the keys at once
    await this.redisClient.multi(keys.map((k: string) => ['del', k])).exec();
  }

  quit() {
    this.redisClient.quit.call(this.redisClient);
  }
}