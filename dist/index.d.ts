import 'reflect-metadata';
import * as sequelize from 'sequelize';
export declare function Cacheable(path: string): (target: any, property: string, descriptor: PropertyDescriptor) => void;
declare type sequelizeFieldValues = {
    dataValues: object;
    [name: string]: any;
};
export declare function getSequelizeFieldValues(result: sequelizeFieldValues[]): object[];
export { sequelize };
