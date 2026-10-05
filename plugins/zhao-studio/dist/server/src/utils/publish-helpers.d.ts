import { Core } from '../../../../../node_modules/@strapi/strapi';
export type ContentType = 'article' | 'video' | 'gallery';
export declare const CONTENT_UID: Record<ContentType, string>;
/** 从 schedule / record 文档推断 contentType */
export declare function detectContentType(doc: any): ContentType | null;
/** content 数字 ID 在 lnk 表里的列名映射 */
export declare function contentLnkCol(type: ContentType): string;
/**
 * 手动插入 publish_schedules_xxx_lnk（创建 schedule 后 Strapi connect 不可靠时用）
 */
export declare function insertScheduleLnk(strapi: Core.Strapi, contentType: ContentType, scheduleNumId: number, contentNumId: number): Promise<void>;
/**
 * 手动插入 publish_records_xxx_lnk + publish_records_account_lnk
 */
export declare function insertRecordLnks(strapi: Core.Strapi, contentType: ContentType, recordNumId: number, contentNumId: number, accountNumId: number): Promise<void>;
/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 lnk 表推断 contentType
 */
export declare function inferContentTypeFromLnk(strapi: Core.Strapi, recordNumId: number): Promise<ContentType | null>;
/**
 * Strapi populate 在 plugin CT 上不可靠 → 直接查 schedule lnk 表推断 contentType
 */
export declare function inferContentTypeFromScheduleLnk(strapi: Core.Strapi, scheduleNumId: number): Promise<ContentType | null>;
/**
 * Strapi populate 拿不到 content 关系 → 直接查 lnk + content 表
 * 返回 { contentNumId, contentDocumentId } 或 null
 */
export declare function resolveContentFromLnk(strapi: Core.Strapi, contentType: ContentType, recordNumId: number): Promise<{
    contentNumId: number;
    contentDocumentId: string;
} | null>;
/**
 * 创建 publish-record + 手动插 lnk 表（解决 Strapi plugin CT connect 不可靠问题）
 */
export declare function createPublishRecord(strapi: Core.Strapi, contentType: ContentType, contentDocumentId: string, contentNumId: number, accountDocumentId: string, accountNumId: number, extraData?: Record<string, any>): Promise<any>;
//# sourceMappingURL=publish-helpers.d.ts.map