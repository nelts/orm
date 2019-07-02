import 'reflect-metadata';
import * as sequelize from 'sequelize';
import { Context, CustomExtendableType } from '@nelts/nelts';
import * as pathToRegexp from 'path-to-regexp';
import RedisJSON from './redis';
import { WorkerPlugin } from '@nelts/nelts';

export class OrmContext<T = {}> extends Context {
  public readonly dbo: CustomExtendableType<T>;
  public readonly redis: RedisJSON;
}

export type SequelizeModelInterface<T = any, U = any> = (new () => sequelize.Model<T, U>) & typeof sequelize.Model;

export type SequelizeInitConfigs = {
  database: string, 
  username: string,
  password: string,
  options: sequelize.Options,
}

export type PluginProps = {
  sequelize?: SequelizeInitConfigs,
  redis?: boolean | string | {
    host: string,
    port: number
  },
  redis_prefix?: string,
}

export interface CacheableInterface {
  set(pathParams?: object, expire?:number): Promise<any>;
  get(pathParams?: object, expire?:number): Promise<any>;
  delete(pathParams?: object): Promise<void>;
  invoke(): Promise<any>;
}

export function Cacheable(path: string) {
  const toPathRegexp = pathToRegexp.compile(path);
  return (target: any, property: string, descriptor: PropertyDescriptor) => {
    const callback = descriptor.value;
    if (callback._rewrited) throw new Error('cannot use `@Cacheable` more then once');
    descriptor.value = function(...args: any[]) {
      const ctx: Context = this.ctx;
      const that = this;
      if (!ctx.redis) throw new Error('@Cacheable must setup redis option.');
      return {
        // set data in redis
        async set(pathParams?: object, expire?:number) {
          pathParams = pathParams || {};
          const key = toPathRegexp(pathParams).replace(/\//g, ':');
          const result = await this.invoke();
          if (result !== null && result !== undefined) {
            await ctx.redis.set(key, result, expire);
          }
          return result;
        },
        // get data from redis
        async get(pathParams?: object, expire?:number) {
          pathParams = pathParams || {};
          const key = toPathRegexp(pathParams).replace(/\//g, ':');
          let result = await ctx.redis.get(key);
          if (result === undefined) result = await this.set(pathParams, expire);
          return result;
        },
        // delete data from redis
        async delete(pathParams?: object) {
          pathParams = pathParams || {};
          const key = toPathRegexp(pathParams).replace(/\//g, ':');
          if (await ctx.redis.exists(key)) {
            await ctx.redis.delete(key);
          }
        },
        // invoke callback
        async invoke() {
          return await callback.call(that, ...args);
        }
      }
    }
    descriptor.value._rewrited = true;
  }
}

export class OrmWorkerPlugin extends WorkerPlugin {
  public _tables: {[name: string]: SequelizeModelInterface }
}