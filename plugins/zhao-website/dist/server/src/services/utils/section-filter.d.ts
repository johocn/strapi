import { Core } from '@strapi/strapi';
export declare const SECTION_UID = "plugin::zhao-website.section";
/**
 * 把板块过滤值解析为数字板块 id（content-api 传 slug / documentId）：
 * 数字原样返回；slug/documentId 先查 section 转 id；未命中返回 -1 短路，
 * 避免直接把字符串比对 FK 整数列触发数据库 500
 */
export declare function resolveSectionFilter(strapi: Core.Strapi, siteId: number, section: any): Promise<number>;
/**
 * 取板块 slug（用于生成带板块前缀的内容 slug）；板块为空或未命中返回 null
 */
export declare function getSectionSlug(strapi: Core.Strapi, siteId: number, section: any): Promise<string | null>;
