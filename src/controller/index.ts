import { Component, WorkerPlugin, Decorator, Context } from '@nelts/nelts';
const Controller = Decorator.Controller;

@Controller.Prefix()
export default class IndexController extends Component.Controller {
  constructor(app: WorkerPlugin) {
    super(app);
  }

  @Controller.Get()
  async HOME(ctx: Context) {
    const service = new this.service.IndexService(ctx);
    const result = await service.get();
    // const result = await service.valid().get({ id: 234 }, 10000);
    ctx.body = result;
  }
}