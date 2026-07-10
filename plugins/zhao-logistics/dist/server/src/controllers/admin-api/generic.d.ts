/**
 * 通用 CRUD 控制器工厂
 * 按 serviceName 动态分发到对应 service
 * 前置条件：site-resolver 中间件已设置 ctx.state.siteId
 */
declare const createGenericController: (serviceName: string) => {
    find(ctx: any): Promise<any>;
    findOne(ctx: any): Promise<any>;
    create(ctx: any): Promise<any>;
    update(ctx: any): Promise<any>;
    delete(ctx: any): Promise<any>;
};
export default createGenericController;
