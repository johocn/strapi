declare const _default: {
  "kind": "collectionType",
  "collectionName": "sso_msg_template_versions",
  "info": { "singularName": "msg-template-version", "pluralName": "msg-template-versions", "displayName": "SSO Msg Template Version" },
  "options": { "draftAndPublish": false },
  "attributes": {
    "template": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-sso.msg-template", "required": true },
    "code": { "type": "string", "required": true },
    "name": { "type": "string" },
    "wxTemplateId": { "type": "string" },
    "wxTemplateFields": { "type": "json" },
    "content": { "type": "text" },
    "link": { "type": "string" },
    "weight": { "type": "integer", "default": 1 },
    "status": { "type": "enumeration", "enum": ["draft", "active"], "default": "draft", "required": true },
    "sentCount": { "type": "integer", "default": 0 },
    "successCount": { "type": "integer", "default": 0 },
    "clickCount": { "type": "integer", "default": 0 },
    "lastUsedAt": { "type": "datetime" }
  }
}
;

export default _default;
