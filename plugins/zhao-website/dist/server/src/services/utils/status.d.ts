export declare const STATUS: {
    readonly DRAFT: "draft";
    readonly PUBLISHED: "published";
    readonly ARCHIVED: "archived";
};
export type ContentStatus = (typeof STATUS)[keyof typeof STATUS];
export declare function isValidStatus(s: string): s is ContentStatus;
/**
 * 应用 status 变更：published 时设置 publishedAt
 */
export declare function applyStatusChange(data: any, newStatus: ContentStatus): any;
