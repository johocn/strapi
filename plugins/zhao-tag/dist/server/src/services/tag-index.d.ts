import { Core } from '../../../../../node_modules/@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 业务方 lifecycle 调用：同步标签索引
     * 计算 diff：新增的入库，移除的删除
     */
    sync(targetType: string, targetId: string, tagIds: string[]): Promise<void>;
    /**
     * 业务方 lifecycle 调用：删除某业务记录的所有索引
     */
    remove(targetType: string, targetId: string): Promise<void>;
    /**
     * 跨业务检索：按 tag 查所有关联内容
     * 返回 [{ targetType, targetId }]
     */
    searchByTag(tagDocumentId: string, targetType?: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    /**
     * 统计：标签被引用次数
     */
    countByTag(tagDocumentId: string): Promise<number>;
};
export default _default;
//# sourceMappingURL=tag-index.d.ts.map