import type { Core } from "@strapi/strapi";
/** 对外可引用门槛：权威来源类型 */
export declare const CITABLE_SOURCE_TYPES: string[];
declare const _default: ({ strapi }: {
    strapi: Core.Strapi;
}) => {
    /** 关系客体形态快照（供契约校验） */
    _shape(relation: any): {
        hasEntity: boolean;
        hasValue: boolean;
        hasText: boolean;
        textLength: number;
    };
    /** 已登记契约的关系违规原因；未登记返回 null */
    _violationReason(relation: any): string | null;
    isCitable(fact: any): boolean;
    completeness(siteId: number): Promise<{
        entities: {
            total: number;
            missingSameAs: number;
            missingDescription: number;
            missingUrl: number;
            missingIdentifier: number;
        };
        facts: {
            total: number;
            missingSourceUrl: number;
            internalSourceCount: number;
            otherCategoryCount: number;
            unboundCanonicalEntity: number;
            emptyCategories: string[];
            unclassifiedOther: Array<{
                documentId: string;
                claimKey: string;
                claim: string;
            }>;
        };
        relations: {
            total: number;
            contractViolations: number;
            missingTruthPolicy: number;
        };
    }>;
    violations(siteId: number): Promise<any[]>;
};
export default _default;
//# sourceMappingURL=knowledge-health.d.ts.map