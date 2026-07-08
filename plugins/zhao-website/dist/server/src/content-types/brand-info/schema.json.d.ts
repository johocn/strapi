declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_brand_infos",
  "info": {
    "singularName": "brand-info",
    "pluralName": "brand-infos",
    "displayName": "企业品牌信息"
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
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_brand_info"
    },
    "companyName": {
      "type": "string",
      "maxLength": 200,
      "required": true,
      "localized": true
    },
    "shortName": {
      "type": "string",
      "maxLength": 100,
      "localized": true
    },
    "slogan": {
      "type": "string",
      "maxLength": 200,
      "localized": true
    },
    "logo": {
      "type": "media"
    },
    "logoDark": {
      "type": "media"
    },
    "favicon": {
      "type": "media"
    },
    "description": {
      "type": "text",
      "localized": true
    },
    "foundingDate": {
      "type": "date"
    },
    "registeredAddress": {
      "type": "string",
      "maxLength": 500,
      "localized": true
    },
    "officeAddress": {
      "type": "string",
      "maxLength": 500,
      "localized": true
    },
    "contactPhone": {
      "type": "string",
      "maxLength": 30
    },
    "contactEmail": {
      "type": "email"
    },
    "serviceHotline": {
      "type": "string",
      "maxLength": 30
    },
    "businessHours": {
      "type": "string",
      "maxLength": 100
    },
    "wechatQrCode": {
      "type": "media"
    },
    "wechatPublicAccount": {
      "type": "string",
      "maxLength": 100
    },
    "miniProgramName": {
      "type": "string",
      "maxLength": 100
    },
    "socialLinks": {
      "type": "json"
    },
    "legalRepresentative": {
      "type": "string",
      "maxLength": 50
    },
    "registeredCapital": {
      "type": "string",
      "maxLength": 50
    },
    "unifiedSocialCreditCode": {
      "type": "string",
      "maxLength": 50
    },
    "businessScope": {
      "type": "text",
      "localized": true
    },
    "mainEntity": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-website.knowledge-entity",
      "inversedBy": "brandInfos"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
