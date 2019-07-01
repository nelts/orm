import 'reflect-metadata';
import * as sequelize from 'sequelize';
import { Context, CustomExtendableType } from '@nelts/nelts';
import RedisJSON from './redis';
export declare class OrmContext<T = {}> extends Context {
    readonly dbo: CustomExtendableType<T>;
    readonly redis: RedisJSON;
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
export declare function Cacheable(path: string): (target: any, property: string, descriptor: PropertyDescriptor) => void;
