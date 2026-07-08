declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_knowledge_relations",
  "info": {
    "singularName": "knowledge-relation",
    "pluralName": "knowledge-relations",
    "displayName": "知识图谱关系"
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
      "required": true,
      "inversedBy": "website_knowledge_relations"
    },
    "subjectEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity",
      "required": true,
      "inversedBy": "subjectRelations"
    },
    "predicate": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "objectEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity",
      "inversedBy": "objectRelations"
    },
    "objectValue": {
      "type": "json"
    },
    "objectText": {
      "type": "text"
    },
    "sourceUrl": {
      "type": "string",
      "maxLength": 500
    },
    "sourceType": {
      "type": "enumeration",
      "enum": ["official", "derived", "manual", "inferred"],
      "default": "manual"
    },
    "confidence": {
      "type": "decimal",
      "default": 1.0
    },
    "lastVerifiedAt": {
      "type": "datetime"
    },
    "verificationStatus": {
      "type": "enumeration",
      "enum": ["verified", "pending", "outdated", "conflict"],
      "default": "verified"
    },
    "status": {
      "type": "boolean",
      "default": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
