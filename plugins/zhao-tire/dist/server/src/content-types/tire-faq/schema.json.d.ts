declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_tire_faqs",
  "info": {
    "singularName": "tire-faq",
    "pluralName": "tire-faqs",
    "displayName": "常见问答"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "question": {
      "type": "text",
      "required": true
    },
    "answer": {
      "type": "text",
      "required": true
    },
    "sort": {
      "type": "integer",
      "default": 0
    },
    "enabled": {
      "type": "boolean",
      "default": true
    }
  }
}
;

export default _default;
