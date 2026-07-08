import { Core } from '@strapi/strapi';
/**
 * 生成 slug（基于 title），并校验在租户内唯一（含软删除排除）
 */
export declare function generateUniqueSlug(strapi: Core.Strapi, uid: string, siteId: number, title: string, excludeDocumentId?: string): Promise<string>;
