import 'reflect-metadata';
import * as sequelize from 'sequelize';
import { Context, CustomExtendableType } from '@nelts/nelts';
import * as pathToRegexp from 'path-to-regexp';
import RedisJSON from './redis';
import { WorkerPlugin } from '@nelts/nelts';

export interface OrmWorkerPlugin extends WorkerPlugin {};

export class OrmContext<M extends OrmWorkerPlugin, T = {}> extends Context<M> {
  public readonly dbo: CustomExtendableType<T>;
  public readonly redis: RedisJSON;
  public readonly sequelize: sequelize.Sequelize;
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

export function Cacheable(path: string): MethodDecorator {
  const toPathRegexp = pathToRegexp.compile(path);
  return (target: Object, property: string, descriptor: TypedPropertyDescriptor<any>) => {
    const callback = descriptor.value;
    if (callback._rewrited) throw new Error('cannot use `@Cacheable` more then once');
    const value = makeNewDescriptorValue(toPathRegexp, callback);
    descriptor.value = value;
    descriptor.value._rewrited = true;
  }
}

function makeNewDescriptorValue(toPathRegexp: pathToRegexp.PathFunction, callback: Function) {
  const transformCallback = function(...args: any[]) {
    const ctx = this.ctx;
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
  transformCallback._rewrited = false;
  return transformCallback;
}