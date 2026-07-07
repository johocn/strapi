// 谓词字典（与迁移 003 保持一致）
export const PREDICATE_DICTIONARY: Record<string, string[]> = {
  Organization: ['founder', 'foundingDate', 'legalName', 'areaServed',
                 'numberOfEmployees', 'contactPoint', 'location', 'hasOfferCatalog'],
  Person: ['affiliation', 'jobTitle', 'worksFor', 'alumniOf'],
  Product: ['manufacturer', 'brand', 'offers', 'aggregateRating', 'category'],
  Article: ['about', 'mentions', 'author', 'publisher', 'datePublished'],
  CaseStudy: ['subjectOf', 'about', 'mentions'],
  Event: ['organizer', 'location', 'startDate', 'subEvent'],
  FAQ: ['about', 'mentions', 'mainEntity'],
  HowTo: ['about', 'mentions', 'hasStep'],
  Download: ['about', 'mentions', 'fileFormat'],
};

export function isValidPredicate(entityType: string, predicate: string): boolean {
  const list = PREDICATE_DICTIONARY[entityType] || [];
  return list.includes(predicate);
}

// 层级关系（用于循环引用检测）
export const HIERARCHICAL_PREDICATES = new Set([
  'parent', 'containsPlace', 'subEvent', 'hasPart',
]);
