declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_knowledge_point_indices",
  "info": {
    "singularName": "knowledge-point-index",
    "pluralName": "knowledge-point-indices",
    "displayName": "知识点索引",
    "description": "文章与知识点的关联索引"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": {
      "visible": true
    },
    "content-type-builder": {
      "visible": true
    }
  },
  "attributes": {
    "targetType": {
      "type": "string",
      "required": true
    },
    "targetId": {
      "type": "string",
      "required": true
    },
    "knowledgePoint": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-tag.knowledge-point"
    },
    "createdAt": {
      "type": "datetime"
    },
    "updatedAt": {
      "type": "datetime"
    }
  }
};

export default _default;
