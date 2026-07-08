declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_website_seo_configs",
  "info": {
    "singularName": "seo-config",
    "pluralName": "seo-configs",
    "displayName": "SEO 全局配置"
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
      "relation": "oneToOne",
      "target": "plugin::zhao-common.site-config",
      "required": true,
      "inversedBy": "website_seo_config"
    },
    "defaultTitle": {
      "type": "string",
      "maxLength": 60
    },
    "titleTemplate": {
      "type": "string",
      "maxLength": 60
    },
    "defaultDescription": {
      "type": "string",
      "maxLength": 160
    },
    "defaultKeywords": {
      "type": "string",
      "maxLength": 200
    },
    "ogImage": {
      "type": "media"
    },
    "favicon": {
      "type": "media"
    },
    "googleSiteVerification": {
      "type": "string",
      "maxLength": 100
    },
    "baiduSiteVerification": {
      "type": "string",
      "maxLength": 100
    },
    "bingSiteVerification": {
      "type": "string",
      "maxLength": 100
    },
    "baiduAnalyticsId": {
      "type": "string",
      "maxLength": 50
    },
    "googleAnalyticsId": {
      "type": "string",
      "maxLength": 50
    },
    "customHeadCode": {
      "type": "text"
    },
    "customBodyCode": {
      "type": "text"
    },
    "enableSitemap": {
      "type": "boolean",
      "default": true
    },
    "sitemapExcludeTypes": {
      "type": "json"
    },
    "enableRobotsTxt": {
      "type": "boolean",
      "default": true
    },
    "robotsContent": {
      "type": "text"
    },
    "aiCrawlerPolicy": {
      "type": "enumeration",
      "enum": ["allow_all", "block_all", "selective"],
      "default": "allow_all"
    },
    "geoRegion": {
      "type": "string",
      "maxLength": 20
    },
    "geoPlacename": {
      "type": "string",
      "maxLength": 100
    },
    "geoPosition": {
      "type": "string",
      "maxLength": 50
    },
    "geoICBM": {
      "type": "string",
      "maxLength": 50
    },
    "defaultLocale": {
      "type": "string",
      "maxLength": 10,
      "default": "zh-CN"
    },
    "alternateLocales": {
      "type": "json"
    },
    "hreflangStrategy": {
      "type": "enumeration",
      "enum": ["none", "subdirectory", "subdomain", "tld"],
      "default": "subdirectory"
    },
    "organizationName": {
      "type": "string",
      "maxLength": 200
    },
    "organizationLogo": {
      "type": "media"
    },
    "organizationType": {
      "type": "string",
      "maxLength": 50
    },
    "schemaSameAs": {
      "type": "json"
    },
    "schemaContactPoint": {
      "type": "json"
    },
    "icpNumber": {
      "type": "string",
      "maxLength": 50
    },
    "publicSecurityRecord": {
      "type": "string",
      "maxLength": 50
    },
    "extraConfig": {
      "type": "json"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
