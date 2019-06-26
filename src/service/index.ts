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