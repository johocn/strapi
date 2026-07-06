declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取产品列表
     */
    findList(filters: any, page?: number, pageSize?: number): Promise<{
        list: any;
        page: number;
        pageSize: number;
        total: any;
    }>;
    /**
     * 获取产品详情
     */
    findOne(id: number): Promise<any>;
    /**
     * 创建产品
     */
    create(data: any): Promise<any>;
    /**
     * 更新产品
     */
    update(id: number, data: any): Promise<any>;
    /**
     * 删除产品
     */
    delete(id: number): Promise<any>;
};
export default _default;
