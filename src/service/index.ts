import { Component, Context } from '@nelts/nelts';
import { Cacheable, CacheableInterface } from '../index';

export default class IndexService extends Component.Service {
  constructor(ctx: Context) {
    super(ctx);
  }

  @Cacheable('/test/:id(\\d+)')
  async valid() {
    const value = await this.ctx.dbo.maintainer.findAll({
      attributes: ['id', 'pid', 'account', 'ctime']
    });
    console.log(value)
    return value;
  }

  async get() {
    const obj: CacheableInterface = await this.valid();
    return await obj.invoke();
  }
}