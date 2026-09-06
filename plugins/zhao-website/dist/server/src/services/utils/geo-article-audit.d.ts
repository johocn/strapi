export type AuditLevel = "error" | "warning";
export type AuditCheck = {
    group: string;
    field: string;
    rule: string;
    level: AuditLevel;
    passed: boolean;
    hint?: string;
};
export type GeoAuditInput = {
    type?: string;
    title?: string;
    content?: string;
    faqQuestion?: string;
    comparisonData?: any[];
    listItems?: any[];
    summaryPoints?: string;
    localTips?: string;
    infoBoundary?: string;
    sourceName?: string;
    sourceUrl?: string;
    truthBasis?: any[];
    mentionedEntities?: any[];
    author?: any;
    authorName?: string;
    jsonLdType?: string;
    businessData?: any[];
    ctaType?: string;
    leadFormEnabled?: boolean;
    riskType?: string;
    reviewChecks?: Record<string, boolean>;
    reviewerName?: string;
    reviewedAt?: string;
    cityWords?: string[];
};
/** 12 条整改标准 → 8 组校验（纯函数，无 strapi 依赖） */
export declare function auditGeoArticle(article: GeoAuditInput): {
    pass: boolean;
    missing: AuditCheck[];
};
