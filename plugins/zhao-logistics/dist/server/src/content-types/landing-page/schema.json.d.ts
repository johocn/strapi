declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_logistics_landing_pages",
  "info": {
    "singularName": "landing-page",
    "pluralName": "landing-pages",
    "displayName": "营销落地页"
  },
  "options": {
    "draftAndPublish": false
  },
  "pluginOptions": {
    "i18n": { "localized": true },
    "content-manager": { "visible": true },
    "content-type-builder": { "visible": false }
  },
  "attributes": {
    "site": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "logistics_landing_pages"
    },
    "slug": {
      "type": "uid",
      "required": true
    },
    "title": {
      "type": "string",
      "maxLength": 200,
      "required": true,
      "localized": true
    },
    "campaignName": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmSource": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmMedium": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmCampaign": {
      "type": "string",
      "maxLength": 100,
      "required": true
    },
    "utmContent": {
      "type": "string",
      "maxLength": 100
    },
    "utmTerm": {
      "type": "string",
      "maxLength": 100
    },
    "conversionGoal": {
      "type": "enumeration",
      "enum": ["quote_submit", "contact_click", "phone_call", "download"],
      "required": true
    },
    "heroContent": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "sections": {
      "type": "json",
      "required": true,
      "localized": true
    },
    "formConfig": {
      "type": "json"
    },
    "seoTitle": {
      "type": "string",
      "maxLength": 60,
      "localized": true
    },
    "seoDescription": {
      "type": "string",
      "maxLength": 160,
      "localized": true
    },
    "ogImage": {
      "type": "media",
      "multiple": false
    },
    "variant": {
      "type": "string",
      "maxLength": 20
    },
    "parentPageId": {
      "type": "string"
    },
    "isActive": {
      "type": "boolean",
      "default": true,
      "required": true
    },
    "startAt": {
      "type": "datetime"
    },
    "endAt": {
      "type": "datetime"
    },
    "publishedAt": {
      "type": "datetime"
    },
    "status": {
      "type": "enumeration",
      "enum": ["draft", "published", "archived"],
      "default": "draft",
      "required": true
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
