import { Core } from '@strapi/strapi';
/**
 * 生成 slug（基于 title），并校验在租户内唯一（含软删除排除）
 * prefix 传入板块 slug 时，生成为 {板块}-{标题}，用于同一站点跨板块同名内容
 */
export declare function generateUniqueSlug(strapi: Core.Strapi, uid: string, siteId: number, title: string, excludeDocumentId?: string, prefix?: string | null): Promise<string>;
