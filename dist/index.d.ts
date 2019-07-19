import 'reflect-metadata';
import * as sequelize from 'sequelize';
import { Context, CustomExtendableType } from '@nelts/nelts';
import RedisJSON from './redis';
import { WorkerPlugin } from '@nelts/nelts';
export interface OrmWorkerPlugin<T = {}> extends WorkerPlugin {
    _tables: CustomExtendableType<T>;
}
export declare class OrmContext<T = {}, U = {}> extends Context<OrmWorkerPlugin<U>> {
    readonly dbo: CustomExtendableType<T>;
    readonly redis: RedisJSON;
    readonly sequelize: sequelize.Sequelize;
}
export declare type SequelizeModelInterface<T = any, U = any> = (new () => sequelize.Model<T, U>) & typeof sequelize.Model;
export declare type SequelizeInitConfigs = {
    database: string;
    username: string;
    password: string;
    options: sequelize.Options;
};
export declare type PluginProps = {
    sequelize?: SequelizeInitConfigs;
    redis?: boolean | string | {
        host: string;
        port: number;
    };
    redis_prefix?: string;
};
export interface CacheableInterface {
    set(pathParams?: object, expire?: number): Promise<any>;
    get(pathParams?: object, expire?: number): Promise<any>;
    delete(pathParams?: object): Promise<void>;
    invoke(): Promise<any>;
}
export declare function Cacheable(path: string): MethodDecorator;
