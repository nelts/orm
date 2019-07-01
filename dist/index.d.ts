import 'reflect-metadata';
import * as sequelize from 'sequelize';
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
