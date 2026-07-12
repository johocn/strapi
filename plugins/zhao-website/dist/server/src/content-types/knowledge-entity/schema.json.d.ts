declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_knowledge_entities",
  "info": {
    "singularName": "knowledge-entity",
    "pluralName": "knowledge-entities",
    "displayName": "知识图谱实体"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": false,
      "inversedBy": "website_knowledge_entities"
    },
    "entityType": {
      "type": "enumeration",
      "enum": [
        "Organization",
        "Person",
        "Product",
        "Service",
        "Place",
        "Event",
        "CreativeWork",
        "Article",
        "CaseStudy",
        "Offer",
        "Review",
        "FAQ",
        "HowTo",
        "BreadcrumbList",
        "Brand",
        "ContactPoint",
        "QuantitativeValue",
        "DefinedTerm"
      ],
      "required": true
    },
    "name": {
      "type": "string",
      "maxLength": 200,
      "required": true
    },
    "slug": {
      "type": "uid",
      "targetField": "name",
      "required": true
    },
    "identifier": {
      "type": "string",
      "maxLength": 100
    },
    "description": {
      "type": "text"
    },
    "sameAs": {
      "type": "json"
    },
    "image": {
      "type": "media"
    },
    "url": {
      "type": "string",
      "maxLength": 500
    },
    "properties": {
      "type": "json"
    },
    "refTargetType": {
      "type": "string",
      "maxLength": 30
    },
    "refTargetId": {
      "type": "string"
    },
    "confidence": {
      "type": "decimal",
      "default": 1.0
    },
    "sourceType": {
      "type": "enumeration",
      "enum": ["official", "derived", "manual", "imported"],
      "default": "official"
    },
    "lastVerifiedAt": {
      "type": "datetime"
    },
    "verificationStatus": {
      "type": "enumeration",
      "enum": ["verified", "pending", "outdated", "conflict"],
      "default": "verified"
    },
    "verifiedBy": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "admin::user"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "brandInfos": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.brand-info",
      "mappedBy": "mainEntity"
    },
    "subjectRelations": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.knowledge-relation",
      "mappedBy": "subject"
    },
    "objectRelations": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.knowledge-relation",
      "mappedBy": "object"
    },
    "faqMainEntities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.faq",
      "mappedBy": "mainEntity"
    },
    "faqMentions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.faq",
      "mappedBy": "mentionedEntities"
    },
    "tutorialMainEntities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.tutorial",
      "mappedBy": "mainEntity"
    },
    "tutorialMentions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.tutorial",
      "mappedBy": "mentionedEntities"
    },
    "articleMainEntities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "mainEntity"
    },
    "articleMentions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "mentionedEntities"
    },
    "firstTruthPolicies": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.first-truth-policy",
      "mappedBy": "mainEntity"
    },
    "productMainEntities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.product",
      "mappedBy": "mainEntity"
    },
    "productMentions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.product",
      "mappedBy": "mentionedEntities"
    },
    "caseMainEntities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.case",
      "mappedBy": "mainEntity"
    },
    "caseMentions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-website.case",
      "mappedBy": "mentionedEntities"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
