# @nelts/orm

nelts架构的ORM库。

## Install

```bash
npm i @nelts/orm
```

## Configure

```ts
import { Plugin } from '@nelts/nelts';
export default async (app: Plugin) => {
  app.on('props', async configs => {
    await app.getComponent('@nelts/orm').props({
      // sequelize configs: http://docs.sequelizejs.com/manual/dialects.html
      sequelize: {
        alias: configs.sequelize.alias,
        database: configs.sequelize.database,
        username: configs.sequelize.username,
        password: configs.sequelize.password,
        dialect: configs.sequelize.dialect,
        host: configs.sequelize.host,
      },
      // local redis: true
      // object redis: { port, host }
      // string redis: `${host}:${port}`
      redis: '192.168.2.208:6379'
    });
  });
}
```

## Sequelize Models

在项目目录下存在一个`sequelize`目录，里面指定的目录结构是这样的 `sequelize/${database_name}/${table_name}.ts`。每个ts文件内容请参考[这里](http://docs.sequelizejs.com/manual/typescript.html)

```ts
import { sequelize } from '@nelts/orm';
const { Sequelize, Model, DataTypes } = sequelize;

export default class Maintainers extends Model {
  public id: number;
  public account: string;
  public pid: number;
  public ctime: Date;

  public static installer(sequelize: Sequelize) {
    Maintainers.init({
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true
      },
      account: DataTypes.STRING(100),
      pid: DataTypes.INTEGER({ length: 11 }),
      ctime: DataTypes.DATE
    }, {
      tableName: 'maintainer',
      sequelize,
      createdAt: 'ctime',
      updatedAt: 'utime',
      charset: 'utf8',
      collate: 'utf8_general_ci',
    });
  }
}
```

`public static installer(sequelize: Sequelize)` 函数必须存在，定义创建表的结构。

## Redis

Redis是存在于 `ctx.redis` 上。

## Redis operations

- `set(key: string, obj: any, expire?: number): Promise<void>`;
- `get(key: string): Promise<any>`;
- `exists(key: string): Promise<any>`;
- `delete(key: string): Promise<any>`;
- `clear(): Promise<void>`;

具体请看 `/src/redis.ts` 源码。

## Use Cacheable in service

```ts
import { Component, Context } from '@nelts/nelts';
import { Cacheable, getSequelizeFieldValues } from '../index';
export default class IndexService extends Component.Service {
  constructor(ctx: Context) {
    super(ctx);
  }

  @Cacheable('/test/:id(\\d+)')
  async valid() {
    return getSequelizeFieldValues(await this.ctx.sequelize.cpm.maintainer.findAll({
      attributes: ['id', 'pid', 'account', 'ctime']
    }));
  }
}
```

`@Cacheable('/test/:id(\\d+)')`注解指定service的方法`valid`是一个缓存函数。那么可以如下调用：

```ts
// eg: in controller
const service = new this.service.IndexService(ctx);
const result = await service.valid().invoke();
const result = await service.valid().set({ id: 234 }, 10000);
const result = await service.valid().get({ id: 234 }, 10000);
await service.valid().delete({ id: 234 });
```

## License

[MIT](http://opensource.org/licenses/MIT)

Copyright (c) 2019-present, yunjie (Evio) shen

