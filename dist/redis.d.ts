import { Redis } from 'ioredis';
export default class RedisJSON {
    private readonly redisClient;
    private readonly prefix;
    constructor(redisClient: Redis, prefix?: string);
    getKey(key: string): string;
    set(key: string, obj: any, expire?: number): Promise<void>;
    get(key: string): Promise<any>;
    exists(key: string): Promise<any>;
    delete(key: string): Promise<any>;
    clear(): Promise<void>;
    quit(): void;
}
