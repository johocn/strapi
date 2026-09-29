"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CITABLE_SOURCE_TYPES = void 0;
const predicate_contracts_1 = require("./utils/predicate-contracts");
const ENTITY_UID = "plugin::zhao-website.knowledge-entity";
const RELATION_UID = "plugin::zhao-website.knowledge-relation";
const TRUTH_UID = "plugin::zhao-website.first-truth-policy";
/** 对外可引用门槛：权威来源类型 */
exports.CITABLE_SOURCE_TYPES = ["government", "official_site", "third_party_verified"];
const ALL_CATEGORIES = [
    "business_license", "brand_claim", "technical_spec", "certification",
    "financial", "logistics_promise", "terminology_definition", "other",
];
const siteScope = (siteId) => ({
    $or: [{ site: siteId, deletedAt: null }, { site: null, deletedAt: null }],
});
exports.default = ({ strapi }) => ({
    /** 关系客体形态快照（供契约校验） */
    _shape(relation) {
        const hasText = !!relation.objectText;
        return {
            hasEntity: !!relation.objectEntity,
            hasValue: relation.objectValue !== undefined && relation.objectValue !== null,
            hasText,
            textLength: hasText ? String(relation.objectText).length : 0,
        };
    },
    /** 已登记契约的关系违规原因；未登记返回 null */
    _violationReason(relation) {
        const entityType = relation.subjectEntity?.entityType;
        if (!entityType)
            return null;
        if (!(0, predicate_contracts_1.getPredicateContract)(entityType, relation.predicate))
            return null;
        return (0, predicate_contracts_1.validateObjectContract)(entityType, relation.predicate, this._shape(relation), relation.truthPolicy);
    },
    isCitable(fact) {
        return !!fact?.canonicalSourceUrl || exports.CITABLE_SOURCE_TYPES.includes(fact?.canonicalSourceType);
    },
    async completeness(siteId) {
        const entities = await strapi.db.query(ENTITY_UID).findMany({ where: siteScope(siteId) });
        const facts = await strapi.db.query(TRUTH_UID).findMany({
            where: siteScope(siteId),
            populate: ["canonicalEntity"],
        });
        const relations = await strapi.db.query(RELATION_UID).findMany({
            where: siteScope(siteId),
            populate: ["subjectEntity", "objectEntity"],
        });
        const entityStats = { total: entities.length, missingSameAs: 0, missingDescription: 0, missingUrl: 0, missingIdentifier: 0 };
        for (const e of entities) {
            if (!e.sameAs || (Array.isArray(e.sameAs) && e.sameAs.length === 0))
                entityStats.missingSameAs++;
            if (!e.description)
                entityStats.missingDescription++;
            if (!e.url)
                entityStats.missingUrl++;
            if (!e.identifier)
                entityStats.missingIdentifier++;
        }
        const categoryCount = {};
        for (const c of ALL_CATEGORIES)
            categoryCount[c] = 0;
        const factStats = {
            total: facts.length, missingSourceUrl: 0, internalSourceCount: 0,
            otherCategoryCount: 0, unboundCanonicalEntity: 0,
            emptyCategories: [],
            unclassifiedOther: [],
        };
        for (const f of facts) {
            if (!f.canonicalSourceUrl)
                factStats.missingSourceUrl++;
            if (f.canonicalSourceType === "internal")
                factStats.internalSourceCount++;
            if (f.claimCategory && categoryCount[f.claimCategory] !== undefined)
                categoryCount[f.claimCategory]++;
            if (!f.canonicalEntity)
                factStats.unboundCanonicalEntity++;
            if (f.claimCategory === "other") {
                factStats.otherCategoryCount++;
                factStats.unclassifiedOther.push({ documentId: f.documentId, claimKey: f.claimKey, claim: f.claim });
            }
        }
        factStats.emptyCategories = ALL_CATEGORIES.filter((c) => categoryCount[c] === 0);
        let contractViolations = 0;
        let missingTruthPolicy = 0;
        for (const r of relations) {
            if (this._violationReason(r))
                contractViolations++;
            if (r.predicate === "cites" && !r.truthPolicy)
                missingTruthPolicy++;
        }
        return {
            entities: entityStats,
            facts: factStats,
            relations: { total: relations.length, contractViolations, missingTruthPolicy },
        };
    },
    async violations(siteId) {
        const relations = await strapi.db.query(RELATION_UID).findMany({
            where: siteScope(siteId),
            populate: ["subjectEntity", "objectEntity"],
        });
        const rows = [];
        for (const r of relations) {
            const reason = this._violationReason(r);
            if (!reason)
                continue;
            const preview = r.objectText
                ? String(r.objectText).slice(0, 80)
                : (r.objectEntity?.name ?? (r.objectValue == null ? "" : String(r.objectValue)));
            rows.push({
                relationDocumentId: r.documentId,
                subjectEntity: r.subjectEntity?.name ?? "",
                predicate: r.predicate,
                reason,
                objectPreview: preview,
            });
        }
        return rows;
    },
});
//# sourceMappingURL=knowledge-health.js.map