declare const _default: ({ strapi }: {
    strapi: any;
}) => {
    /**
     * 获取用户自选列表（C端）
     */
    list(ctx: any): Promise<void>;
    /**
     * 添加自选（C端）
     */
    add(ctx: any): Promise<void>;
    /**
     * 删除自选（C端）
     */
    remove(ctx: any): Promise<void>;
};
export default _default;
