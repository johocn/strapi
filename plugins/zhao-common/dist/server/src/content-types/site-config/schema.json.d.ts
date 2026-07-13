declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_site_configs",
  "info": {
    "singularName": "site-config",
    "pluralName": "site-configs",
    "displayName": "站点配置",
    "description": "站点通用配置（多租户）"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "siteName": {
      "type": "string",
      "maxLength": 100
    },
    "siteDescription": {
      "type": "text"
    },
    "logo": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "favicon": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "icpNumber": {
      "type": "string",
      "maxLength": 50
    },
    "seoKeywords": {
      "type": "string",
      "maxLength": 500
    },
    "seoDescription": {
      "type": "text"
    },
    "tencentMapKey": {
      "type": "string",
      "maxLength": 64
    },
    "shareTitle": {
      "type": "string",
      "maxLength": 100
    },
    "shareDescription": {
      "type": "string",
      "maxLength": 200
    },
    "shareImage": {
      "type": "media",
      "multiple": false,
      "required": false,
      "allowedTypes": ["images"]
    },
    "customerServiceUrl": {
      "type": "string",
      "maxLength": 500
    },
    "domain": {
      "type": "string",
      "maxLength": 255,
      "unique": true
    },
    "channels": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-channel.channel",
      "mappedBy": "sites"
    },
    "featureFlags": {
      "type": "json",
      "default": {
        "sso": false,
        "points": true,
        "quiz": true,
        "course": true,
        "channel": true,
        "thirdParty": true,
        "oss": false,
        "website": true,
        "logistics": true,
        "studio": true
      }
    },
    "template": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-common.site-template",
      "inversedBy": "sites"
    },
    "extraConfig": {
      "type": "json"
    },
    "themeConfig": {
      "type": "json",
      "default": "{}"
    },
    "channelUsage": {
      "type": "enumeration",
      "enum": ["site_only", "site_and_cross", "site_cross_user"],
      "default": "site_cross_user",
      "required": true
    },
    "tags": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag",
      "mappedBy": "site"
    },
    "tagGroups": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-tag.tag-group",
      "mappedBy": "site"
    },
    "website_seo_config": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-website.seo-config",
      "mappedBy": "site"
    },
    "website_brand_info": {
      "type": "relation",
      "relation": "oneToOne",
      "target": "plugin::zhao-website.brand-info",
      "mappedBy": "site"
    },
    "website_articles": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.article",
      "mappedBy": "site"
    },
    "website_article_categories": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.article-category",
      "mappedBy": "site"
    },
    "website_cases": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.case",
      "mappedBy": "site"
    },
    "website_faqs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.faq",
      "mappedBy": "site"
    },
    "website_tutorials": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.tutorial",
      "mappedBy": "site"
    },
    "website_compliances": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.compliance",
      "mappedBy": "site"
    },
    "website_downloads": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.download",
      "mappedBy": "site"
    },
    "website_ai_summaries": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.ai-content-summary",
      "mappedBy": "site"
    },
    "website_first_truths": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.first-truth-policy",
      "mappedBy": "site"
    },
    "website_knowledge_entities": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.knowledge-entity",
      "mappedBy": "site"
    },
    "website_knowledge_relations": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.knowledge-relation",
      "mappedBy": "site"
    },
    "website_leads": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.lead",
      "mappedBy": "site"
    },
    "website_interactions": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.interaction",
      "mappedBy": "site"
    },
    "website_search_logs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.search-log",
      "mappedBy": "site"
    },
    "website_visit_logs": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.visit-log",
      "mappedBy": "site"
    },
    "website_products": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.product",
      "mappedBy": "site"
    },
    "logistics_tracking_providers": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.tracking-provider",
      "mappedBy": "site"
    },
    "logistics_tracking_shipments": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.tracking-shipment",
      "mappedBy": "site"
    },
    "logistics_tracking_nodes": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.tracking-node",
      "mappedBy": "site"
    },
    "logistics_subscriptions": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.subscription",
      "mappedBy": "site"
    },
    "logistics_quote_requests": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.quote-request",
      "mappedBy": "site"
    },
    "logistics_quote_price_rules": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.quote-price-rule",
      "mappedBy": "site"
    },
    "logistics_quote_price_formulas": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.quote-price-formula",
      "mappedBy": "site"
    },
    "logistics_quote_field_rules": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.quote-field-rule",
      "mappedBy": "site"
    },
    "logistics_customer_profiles": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.customer-profile",
      "mappedBy": "site"
    },
    "logistics_conversion_events": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.conversion-event",
      "mappedBy": "site"
    },
    "logistics_conversion_funnels": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.conversion-funnel",
      "mappedBy": "site"
    },
    "logistics_contact_matrices": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.contact-matrix",
      "mappedBy": "site"
    },
    "logistics_landing_pages": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.landing-page",
      "mappedBy": "site"
    },
    "logistics_intent_orders": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.intent-order",
      "mappedBy": "site"
    },
    "logistics_referrals": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.referral",
      "mappedBy": "site"
    },
    "logistics_reviews": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-logistics.review",
      "mappedBy": "site"
    },
    "studio_sync_events": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-studio.sync-event",
      "mappedBy": "site"
    },
    "website_brand_voices": {
      "type": "relation",
      "relation": "oneToMany",
      "target": "plugin::zhao-website.brand-voice",
      "mappedBy": "site"
    }
  }
}
;

export default _default;
