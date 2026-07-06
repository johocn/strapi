import { Core } from '@strapi/strapi';
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /**
     * 列出模板
     */
    listTemplates(filters?: Record<string, any>): Promise<import('@strapi/types/dist/modules/documents').AnyDocument[]>;
    /**
     * 获取模板
     */
    getTemplate(documentId: string): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 创建模板
     */
    createTemplate(data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 更新模板
     */
    updateTemplate(documentId: string, data: any): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 删除模板
     * 先清除关联站点的 template 引用，再删除模板
     */
    deleteTemplate(documentId: string): Promise<{
        documentId: import('@strapi/types/dist/modules/documents').ID;
        entries: import('@strapi/types/dist/modules/documents').Result<TContentTypeUID, TParams>[];
    }>;
    /**
     * 获取默认模板
     */
    getDefaultTemplate(): Promise<import('@strapi/types/dist/modules/documents').AnyDocument>;
    /**
     * 将模板应用到站点
     * @param mode 'overwrite' 覆盖模式（模板预设值替换租户配置），'merge' 合并模式（租户自定义值保留，模板补充缺失字段）
     */
    applyTemplateToSite(templateDocumentId: string, siteDocumentId: string, mode?: "overwrite" | "merge"): Promise<{
        success: boolean;
        templateName: any;
        mode: "overwrite" | "merge";
    }>;
    /**
     * 获取合并后的配置（模板预设 + 租户自定义）
     * 租户自定义值覆盖模板预设值
     * @param siteConfig 站点配置对象（避免重复查询）
     */
    getMergedConfig(siteConfig: any): Promise<{
        config: {
            [x: string]: any;
        };
        meta: {
            templateId: any;
            templateName: any;
            fieldConstraints: Record<string, any>;
            presetKeys: string[];
        };
    }>;
    /**
     * 校验更新是否在模板约束范围内
     * 返回 { valid: true } 或 { valid: false, deniedFields: [...] }
     */
    validateUpdate(siteId: string, updateData: Record<string, any>): Promise<{
        valid: boolean;
        deniedFields?: undefined;
        message?: undefined;
    } | {
        valid: boolean;
        deniedFields: string[];
        message: string;
    }>;
    /**
     * 清除其他模板的 isDefault 标记（确保唯一性）
     * @param excludeDocumentId 排除的模板ID（更新时排除自身）
     */
    _clearDefaultFlag(excludeDocumentId?: string): Promise<void>;
};
export default _default;
