"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HIERARCHICAL_PREDICATES = exports.PREDICATE_DICTIONARY = void 0;
exports.isValidPredicate = isValidPredicate;
// 谓词字典：键必须与 knowledge-entity.entityType 枚举一一对齐
// （见 content-types/knowledge-entity/schema.json，迭代新增枚举值时必须同步补全，否则校验形同虚设）
exports.PREDICATE_DICTIONARY = {
    Organization: ['founder', 'foundingDate', 'legalName', 'areaServed', 'numberOfEmployees',
        'contactPoint', 'location', 'hasOfferCatalog', 'slogan', 'keywords',
        'brand', 'knowsAbout', 'provides', 'url', 'sameAs'],
    Person: ['affiliation', 'jobTitle', 'worksFor', 'alumniOf', 'knowsAbout', 'nationality', 'sameAs'],
    Product: ['manufacturer', 'brand', 'offers', 'aggregateRating', 'category', 'material',
        'additionalProperty', 'isRelatedTo', 'isSimilarTo'],
    Service: ['provider', 'areaServed', 'serviceType', 'hasOfferCatalog', 'offers', 'category',
        'termsOfService', 'isRelatedTo'],
    Place: ['containedInPlace', 'containsPlace', 'geo', 'address', 'areaServed', 'openingHours'],
    Event: ['organizer', 'location', 'startDate', 'endDate', 'subEvent', 'superEvent', 'performer', 'about'],
    CreativeWork: ['about', 'mentions', 'author', 'publisher', 'datePublished', 'isPartOf', 'hasPart',
        'keywords', 'isBasedOn', 'cites'],
    Article: ['about', 'mentions', 'author', 'publisher', 'datePublished', 'articleSection',
        'mainEntity', 'isPartOf', 'hasPart', 'keywords', 'cites'],
    CaseStudy: ['subjectOf', 'about', 'mentions', 'author', 'isPartOf'],
    Offer: ['itemOffered', 'price', 'priceCurrency', 'availability', 'seller', 'areaServed',
        'validFrom', 'validThrough'],
    Review: ['itemReviewed', 'reviewRating', 'author', 'datePublished', 'reviewBody'],
    FAQ: ['about', 'mentions', 'mainEntity', 'hasPart'],
    HowTo: ['about', 'mentions', 'hasStep', 'step', 'tool', 'supply', 'totalTime'],
    BreadcrumbList: ['itemListElement', 'hasPart'],
    Brand: ['logo', 'slogan', 'manufacturer', 'aggregateRating', 'sameAs'],
    ContactPoint: ['contactType', 'telephone', 'email', 'areaServed', 'availableLanguage'],
    QuantitativeValue: ['value', 'unitText', 'minValue', 'maxValue'],
    DefinedTerm: ['inDefinedTermSet', 'termCode', 'isPartOf', 'sameAs'],
};
function isValidPredicate(entityType, predicate) {
    const list = exports.PREDICATE_DICTIONARY[entityType] || [];
    return list.includes(predicate);
}
// 层级关系（用于循环引用检测）
exports.HIERARCHICAL_PREDICATES = new Set([
    'parent', 'containsPlace', 'subEvent', 'hasPart',
]);
//# sourceMappingURL=predicate-dictionary.js.map