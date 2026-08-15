"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const exprEval = require("expr-eval");
const register = async ({ strapi: strapi2 }) => {
};
const bootstrap = async ({ strapi: strapi2 }) => {
  const logger = strapi2.plugin("zhao-common")?.service("logger") || strapi2.log;
  const isTest = process.env.NODE_ENV === "test";
  if (!isTest) logger.info("[zhao-logistics] Initializing...");
  if (!isTest) {
    logger.info("[zhao-logistics] 权限由 zhao-auth initDefaultRoles 自动同步（PERMISSION_TREE 已扩展）");
  }
  if (!isTest) {
    logger.info("[zhao-logistics] 定时任务通过 config/cron.ts 注册");
  }
  if (!isTest) logger.info("[zhao-logistics] Ready");
};
const config = {
  default: {
    // 预留配置项
  },
  validator() {
  }
};
const kind$f = "collectionType";
const collectionName$f = "zhao_logistics_quote_requests";
const info$f = { "singularName": "quote-request", "pluralName": "quote-requests", "displayName": "物流询价单" };
const options$f = { "draftAndPublish": false };
const pluginOptions$f = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$f = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_quote_requests" }, "trackingNo": { "type": "string", "maxLength": 50 }, "routeId": { "type": "string", "maxLength": 50, "required": true }, "origin": { "type": "string", "maxLength": 100, "required": true }, "destination": { "type": "string", "maxLength": 100, "required": true }, "serviceProvider": { "type": "string", "maxLength": 50 }, "cargoType": { "type": "string", "maxLength": 50, "required": true }, "weight": { "type": "decimal", "required": true }, "volume": { "type": "decimal" }, "formData": { "type": "json", "required": true }, "quotedPrice": { "type": "json" }, "status": { "type": "enumeration", "enum": ["draft", "submitted", "quoted", "accepted", "rejected", "expired"], "default": "submitted", "required": true }, "leadId": { "type": "string" }, "customerName": { "type": "string", "maxLength": 100, "required": true }, "customerContact": { "type": "string", "maxLength": 200, "required": true }, "customerType": { "type": "enumeration", "enum": ["individual", "business", "fba_seller"] }, "utmSource": { "type": "string", "maxLength": 100 }, "utmMedium": { "type": "string", "maxLength": 100 }, "utmCampaign": { "type": "string", "maxLength": 100 }, "lang": { "type": "string", "maxLength": 10, "required": true }, "remark": { "type": "text" }, "expiresAt": { "type": "datetime" }, "deletedAt": { "type": "datetime", "default": null } };
const quoteRequest$2 = {
  kind: kind$f,
  collectionName: collectionName$f,
  info: info$f,
  options: options$f,
  pluginOptions: pluginOptions$f,
  attributes: attributes$f
};
const kind$e = "collectionType";
const collectionName$e = "zhao_logistics_quote_field_rules";
const info$e = { "singularName": "quote-field-rule", "pluralName": "quote-field-rules", "displayName": "询价动态字段规则" };
const options$e = { "draftAndPublish": false };
const pluginOptions$e = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$e = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_quote_field_rules" }, "name": { "type": "string", "maxLength": 100, "required": true, "localized": true }, "routeId": { "type": "string", "maxLength": 50 }, "serviceProvider": { "type": "string", "maxLength": 50 }, "customerType": { "type": "enumeration", "enum": ["individual", "business", "fba_seller"] }, "isActive": { "type": "boolean", "default": true, "required": true }, "priority": { "type": "integer", "default": 0 }, "fields": { "type": "json", "required": true, "localized": true }, "deletedAt": { "type": "datetime", "default": null } };
const quoteFieldRule$2 = {
  kind: kind$e,
  collectionName: collectionName$e,
  info: info$e,
  options: options$e,
  pluginOptions: pluginOptions$e,
  attributes: attributes$e
};
const kind$d = "collectionType";
const collectionName$d = "zhao_logistics_quote_price_rules";
const info$d = { "singularName": "quote-price-rule", "pluralName": "quote-price-rules", "displayName": "报价规则表" };
const options$d = { "draftAndPublish": false };
const pluginOptions$d = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$d = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_quote_price_rules" }, "routeId": { "type": "string", "maxLength": 50, "required": true }, "serviceProvider": { "type": "string", "maxLength": 50, "required": true }, "minWeight": { "type": "decimal", "required": true }, "maxWeight": { "type": "decimal", "required": true }, "pricePerKg": { "type": "decimal", "required": true }, "currency": { "type": "string", "maxLength": 10, "default": "CNY", "required": true }, "volumetricFactor": { "type": "integer" }, "minCharge": { "type": "decimal" }, "surcharges": { "type": "json" }, "formula": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-logistics.quote-price-formula", "inversedBy": "price_rules" }, "effectiveFrom": { "type": "date", "required": true }, "effectiveTo": { "type": "date" }, "isActive": { "type": "boolean", "default": true, "required": true }, "deletedAt": { "type": "datetime", "default": null } };
const quotePriceRule$2 = {
  kind: kind$d,
  collectionName: collectionName$d,
  info: info$d,
  options: options$d,
  pluginOptions: pluginOptions$d,
  attributes: attributes$d
};
const kind$c = "collectionType";
const collectionName$c = "zhao_logistics_quote_price_formulas";
const info$c = { "singularName": "quote-price-formula", "pluralName": "quote-price-formulas", "displayName": "报价公式模板" };
const options$c = { "draftAndPublish": false };
const pluginOptions$c = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$c = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_quote_price_formulas" }, "name": { "type": "string", "maxLength": 100, "required": true, "localized": true }, "description": { "type": "text", "localized": true }, "expression": { "type": "text", "required": true }, "variables": { "type": "json", "required": true }, "isActive": { "type": "boolean", "default": true, "required": true }, "price_rules": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.quote-price-rule", "mappedBy": "formula" }, "deletedAt": { "type": "datetime", "default": null } };
const quotePriceFormula$2 = {
  kind: kind$c,
  collectionName: collectionName$c,
  info: info$c,
  options: options$c,
  pluginOptions: pluginOptions$c,
  attributes: attributes$c
};
const kind$b = "collectionType";
const collectionName$b = "zhao_logistics_tracking_shipments";
const info$b = { "singularName": "tracking-shipment", "pluralName": "tracking-shipments", "displayName": "货物追踪主表" };
const options$b = { "draftAndPublish": false };
const pluginOptions$b = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$b = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_tracking_shipments" }, "trackingNo": { "type": "string", "maxLength": 50, "required": true }, "orderId": { "type": "string", "maxLength": 50 }, "status": { "type": "enumeration", "enum": ["pending", "in_transit", "customs", "hold", "delivered", "exception", "returned"], "default": "pending", "required": true }, "origin": { "type": "string", "maxLength": 100, "required": true }, "destination": { "type": "string", "maxLength": 100, "required": true }, "serviceProvider": { "type": "string", "maxLength": 50 }, "eta": { "type": "datetime" }, "actualDelivery": { "type": "datetime" }, "customerName": { "type": "string", "maxLength": 100 }, "customerContact": { "type": "string", "maxLength": 200 }, "lastSyncAt": { "type": "datetime" }, "syncProvider": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-logistics.tracking-provider", "inversedBy": "shipments" }, "nodes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.tracking-node", "mappedBy": "shipment" }, "deletedAt": { "type": "datetime", "default": null } };
const trackingShipment$2 = {
  kind: kind$b,
  collectionName: collectionName$b,
  info: info$b,
  options: options$b,
  pluginOptions: pluginOptions$b,
  attributes: attributes$b
};
const kind$a = "collectionType";
const collectionName$a = "zhao_logistics_tracking_nodes";
const info$a = { "singularName": "tracking-node", "pluralName": "tracking-nodes", "displayName": "追踪节点" };
const options$a = { "draftAndPublish": false };
const pluginOptions$a = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$a = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_tracking_nodes" }, "shipment": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-logistics.tracking-shipment", "required": true, "inversedBy": "nodes" }, "nodeStatus": { "type": "enumeration", "enum": ["done", "active", "pending", "alert"], "required": true }, "nodeType": { "type": "enumeration", "enum": ["picked_up", "export", "import", "customs", "hold", "delivery", "delivered", "exception"], "required": true }, "location": { "type": "string", "maxLength": 100 }, "eventTime": { "type": "datetime", "required": true }, "description": { "type": "text", "required": true, "localized": true }, "dataSource": { "type": "enumeration", "enum": ["internal", "external"], "default": "internal", "required": true }, "providerRef": { "type": "string", "maxLength": 50 }, "deletedAt": { "type": "datetime", "default": null } };
const trackingNode$2 = {
  kind: kind$a,
  collectionName: collectionName$a,
  info: info$a,
  options: options$a,
  pluginOptions: pluginOptions$a,
  attributes: attributes$a
};
const kind$9 = "collectionType";
const collectionName$9 = "zhao_logistics_tracking_providers";
const info$9 = { "singularName": "tracking-provider", "pluralName": "tracking-providers", "displayName": "追踪 API 配置" };
const options$9 = { "draftAndPublish": false };
const pluginOptions$9 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$9 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_tracking_providers" }, "name": { "type": "string", "maxLength": 100, "required": true }, "providerType": { "type": "enumeration", "enum": ["track17", "afterShip", "kuaidi100", "customApi"], "required": true }, "apiKey": { "type": "string", "maxLength": 200, "required": true }, "apiSecret": { "type": "string", "maxLength": 200 }, "endpoint": { "type": "string", "maxLength": 500 }, "isEnabled": { "type": "boolean", "default": true, "required": true }, "rateLimit": { "type": "integer" }, "supportedCarriers": { "type": "json" }, "extraConfig": { "type": "json" }, "shipments": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.tracking-shipment", "mappedBy": "syncProvider" }, "deletedAt": { "type": "datetime", "default": null } };
const trackingProvider$2 = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  pluginOptions: pluginOptions$9,
  attributes: attributes$9
};
const kind$8 = "collectionType";
const collectionName$8 = "zhao_logistics_contact_matrices";
const info$8 = { "singularName": "contact-matrix", "pluralName": "contact-matrices", "displayName": "联系渠道矩阵" };
const options$8 = { "draftAndPublish": false };
const pluginOptions$8 = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$8 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_contact_matrices" }, "lang": { "type": "enumeration", "enum": ["cn", "jp", "kr", "vn"], "required": true }, "flag": { "type": "string", "maxLength": 10, "required": true }, "short": { "type": "string", "maxLength": 10, "required": true }, "primary": { "type": "json", "required": true, "localized": true }, "channels": { "type": "json", "required": true, "localized": true }, "hotline": { "type": "json", "required": true, "localized": true }, "email": { "type": "email", "required": true }, "callbackNote": { "type": "text", "localized": true }, "isActive": { "type": "boolean", "default": true, "required": true }, "deletedAt": { "type": "datetime", "default": null } };
const contactMatrix$3 = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  pluginOptions: pluginOptions$8,
  attributes: attributes$8
};
const kind$7 = "collectionType";
const collectionName$7 = "zhao_logistics_reviews";
const info$7 = { "singularName": "review", "pluralName": "reviews", "displayName": "客户评价" };
const options$7 = { "draftAndPublish": false };
const pluginOptions$7 = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$7 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_reviews" }, "authorName": { "type": "string", "maxLength": 100, "required": true, "localized": true }, "authorCompany": { "type": "string", "maxLength": 100 }, "authorTitle": { "type": "string", "maxLength": 50 }, "authorCountry": { "type": "string", "maxLength": 10, "required": true }, "routeId": { "type": "string", "maxLength": 50 }, "serviceProvider": { "type": "string", "maxLength": 50 }, "rating": { "type": "integer", "required": true }, "content": { "type": "text", "required": true, "localized": true }, "videoUrl": { "type": "string", "maxLength": 500 }, "videoPoster": { "type": "media", "multiple": false }, "images": { "type": "media", "multiple": true }, "testimonialType": { "type": "enumeration", "enum": ["text", "video", "case_study"], "default": "text", "required": true }, "isVerified": { "type": "boolean", "default": false, "required": true }, "isFeatured": { "type": "boolean", "default": false }, "publishedAt": { "type": "datetime" }, "status": { "type": "enumeration", "enum": ["pending", "approved", "rejected"], "default": "pending", "required": true }, "replyContent": { "type": "text", "localized": true }, "replyAt": { "type": "datetime" }, "orderRef": { "type": "string", "maxLength": 50 }, "deletedAt": { "type": "datetime", "default": null } };
const review$3 = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  pluginOptions: pluginOptions$7,
  attributes: attributes$7
};
const kind$6 = "collectionType";
const collectionName$6 = "zhao_logistics_subscriptions";
const info$6 = { "singularName": "subscription", "pluralName": "subscriptions", "displayName": "通知订阅" };
const options$6 = { "draftAndPublish": false };
const pluginOptions$6 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$6 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_subscriptions" }, "subscriberType": { "type": "enumeration", "enum": ["tracking_update", "quote_reply", "promotion", "newsletter"], "required": true }, "channel": { "type": "enumeration", "enum": ["email", "line", "kakao", "zalo", "wechat", "sms"], "required": true }, "channelTarget": { "type": "string", "maxLength": 200, "required": true }, "trackingNo": { "type": "string", "maxLength": 50 }, "quoteRequestId": { "type": "string" }, "eventFilter": { "type": "json" }, "frequency": { "type": "enumeration", "enum": ["realtime", "daily", "weekly"], "default": "realtime", "required": true }, "isActive": { "type": "boolean", "default": true, "required": true }, "subscribedAt": { "type": "datetime", "required": true }, "unsubscribedAt": { "type": "datetime" }, "language": { "type": "string", "maxLength": 10, "required": true }, "lastNotifiedAt": { "type": "datetime" }, "notifyCount": { "type": "integer", "default": 0 }, "deletedAt": { "type": "datetime", "default": null } };
const subscription$2 = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  pluginOptions: pluginOptions$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_logistics_landing_pages";
const info$5 = { "singularName": "landing-page", "pluralName": "landing-pages", "displayName": "营销落地页" };
const options$5 = { "draftAndPublish": false };
const pluginOptions$5 = { "i18n": { "localized": true }, "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$5 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_landing_pages" }, "slug": { "type": "uid", "required": true }, "title": { "type": "string", "maxLength": 200, "required": true, "localized": true }, "campaignName": { "type": "string", "maxLength": 100, "required": true }, "utmSource": { "type": "string", "maxLength": 100, "required": true }, "utmMedium": { "type": "string", "maxLength": 100, "required": true }, "utmCampaign": { "type": "string", "maxLength": 100, "required": true }, "utmContent": { "type": "string", "maxLength": 100 }, "utmTerm": { "type": "string", "maxLength": 100 }, "conversionGoal": { "type": "enumeration", "enum": ["quote_submit", "contact_click", "phone_call", "download"], "required": true }, "heroContent": { "type": "json", "required": true, "localized": true }, "sections": { "type": "json", "required": true, "localized": true }, "formConfig": { "type": "json" }, "seoTitle": { "type": "string", "maxLength": 60, "localized": true }, "seoDescription": { "type": "string", "maxLength": 160, "localized": true }, "ogImage": { "type": "media", "multiple": false }, "variant": { "type": "string", "maxLength": 20 }, "parentPageId": { "type": "string" }, "isActive": { "type": "boolean", "default": true, "required": true }, "startAt": { "type": "datetime" }, "endAt": { "type": "datetime" }, "publishedAt": { "type": "datetime" }, "status": { "type": "enumeration", "enum": ["draft", "published", "archived"], "default": "draft", "required": true }, "deletedAt": { "type": "datetime", "default": null } };
const landingPage$3 = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  pluginOptions: pluginOptions$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_logistics_conversion_funnels";
const info$4 = { "singularName": "conversion-funnel", "pluralName": "conversion-funnels", "displayName": "转化漏斗" };
const options$4 = { "draftAndPublish": false };
const pluginOptions$4 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$4 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_conversion_funnels" }, "name": { "type": "string", "maxLength": 100, "required": true }, "lang": { "type": "string", "maxLength": 10 }, "steps": { "type": "json", "required": true }, "isActive": { "type": "boolean", "default": true, "required": true }, "events": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-logistics.conversion-event", "mappedBy": "funnel" }, "deletedAt": { "type": "datetime", "default": null } };
const conversionFunnel$2 = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  pluginOptions: pluginOptions$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_logistics_conversion_events";
const info$3 = { "singularName": "conversion-event", "pluralName": "conversion-events", "displayName": "转化事件" };
const options$3 = { "draftAndPublish": false };
const pluginOptions$3 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$3 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_conversion_events" }, "funnel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-logistics.conversion-funnel", "required": true, "inversedBy": "events" }, "eventName": { "type": "string", "maxLength": 50, "required": true }, "step": { "type": "integer", "required": true }, "visitorId": { "type": "string", "maxLength": 100, "required": true }, "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "sessionId": { "type": "string", "maxLength": 100 }, "landingPageId": { "type": "string" }, "quoteRequestId": { "type": "string" }, "utmSource": { "type": "string", "maxLength": 100 }, "utmMedium": { "type": "string", "maxLength": 100 }, "utmCampaign": { "type": "string", "maxLength": 100 }, "lang": { "type": "string", "maxLength": 10 }, "ipAddress": { "type": "string", "maxLength": 45 }, "userAgent": { "type": "string", "maxLength": 500 }, "occurredAt": { "type": "datetime", "required": true }, "deletedAt": { "type": "datetime", "default": null } };
const conversionEvent$2 = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_logistics_intent_orders";
const info$2 = { "singularName": "intent-order", "pluralName": "intent-orders", "displayName": "意向订单" };
const options$2 = { "draftAndPublish": false };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_intent_orders" }, "orderNo": { "type": "string", "maxLength": 50, "required": true }, "quoteRequestId": { "type": "string", "required": true }, "customerName": { "type": "string", "maxLength": 100, "required": true }, "customerContact": { "type": "string", "maxLength": 200, "required": true }, "customerType": { "type": "enumeration", "enum": ["individual", "business", "fba_seller"] }, "confirmedPrice": { "type": "json", "required": true }, "cargoSummary": { "type": "json", "required": true }, "routeSummary": { "type": "json", "required": true }, "plannedShipDate": { "type": "date" }, "actualShipDate": { "type": "date" }, "status": { "type": "enumeration", "enum": ["intent", "confirmed", "shipping", "delivered", "cancelled"], "default": "intent", "required": true }, "assignedTo": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "followUpRecords": { "type": "json" }, "contractSigned": { "type": "boolean", "default": false }, "depositPaid": { "type": "boolean", "default": false }, "depositAmount": { "type": "decimal" }, "convertedToOrderId": { "type": "string" }, "remark": { "type": "text" }, "leadId": { "type": "string" }, "deletedAt": { "type": "datetime", "default": null } };
const intentOrder$3 = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_logistics_referrals";
const info$1 = { "singularName": "referral", "pluralName": "referrals", "displayName": "推荐奖励" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_referrals" }, "referralCode": { "type": "string", "maxLength": 50, "required": true }, "referrerName": { "type": "string", "maxLength": 100, "required": true }, "referrerContact": { "type": "string", "maxLength": 200, "required": true }, "referrerCustomerId": { "type": "string" }, "refereeName": { "type": "string", "maxLength": 100, "required": true }, "refereeContact": { "type": "string", "maxLength": 200, "required": true }, "refereeCustomerId": { "type": "string" }, "referralChannel": { "type": "enumeration", "enum": ["friend", "community", "exhibition", "partner", "other"], "required": true }, "referralSource": { "type": "string", "maxLength": 100 }, "status": { "type": "enumeration", "enum": ["pending", "contacted", "qualified", "converted", "rewarded", "invalid"], "default": "pending", "required": true }, "quoteRequestId": { "type": "string" }, "intentOrderId": { "type": "string" }, "rewardType": { "type": "enumeration", "enum": ["points", "cash", "discount", "gift"], "required": true }, "rewardAmount": { "type": "decimal" }, "rewardStatus": { "type": "enumeration", "enum": ["pending", "issued", "claimed"], "default": "pending" }, "rewardIssuedAt": { "type": "datetime" }, "conversionValue": { "type": "decimal" }, "convertedAt": { "type": "datetime" }, "remark": { "type": "text" }, "deletedAt": { "type": "datetime", "default": null } };
const referral$3 = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_logistics_customer_profiles";
const info = { "singularName": "customer-profile", "pluralName": "customer-profiles", "displayName": "客户档案" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "site": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-common.site-config", "required": true, "inversedBy": "logistics_customer_profiles" }, "name": { "type": "string", "maxLength": 100, "required": true }, "contactPhone": { "type": "string", "maxLength": 50, "required": true }, "contactEmail": { "type": "string", "maxLength": 100 }, "contactLine": { "type": "string", "maxLength": 100 }, "contactWechat": { "type": "string", "maxLength": 100 }, "contactKakao": { "type": "string", "maxLength": 100 }, "contactZalo": { "type": "string", "maxLength": 100 }, "company": { "type": "string", "maxLength": 100 }, "title": { "type": "string", "maxLength": 50 }, "customerType": { "type": "enumeration", "enum": ["individual", "business", "fba_seller"], "required": true }, "country": { "type": "string", "maxLength": 10, "required": true }, "preferredLang": { "type": "string", "maxLength": 10 }, "preferredRoute": { "type": "json" }, "preferredService": { "type": "json" }, "totalQuoteCount": { "type": "integer", "default": 0 }, "totalOrderCount": { "type": "integer", "default": 0 }, "totalOrderValue": { "type": "decimal", "default": 0 }, "lastQuoteAt": { "type": "datetime" }, "lastOrderAt": { "type": "datetime" }, "lifecycleStage": { "type": "enumeration", "enum": ["lead", "active", "repeat", "vip", "churned"], "default": "lead", "required": true }, "tags": { "type": "json" }, "assignedTo": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "sourceChannel": { "type": "string", "maxLength": 50 }, "utmSource": { "type": "string", "maxLength": 100 }, "remark": { "type": "text" }, "relatedLeadIds": { "type": "json" }, "relatedQuoteIds": { "type": "json" }, "relatedOrderIds": { "type": "json" }, "deletedAt": { "type": "datetime", "default": null } };
const customerProfile$3 = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "quote-request": { schema: quoteRequest$2 },
  "quote-field-rule": { schema: quoteFieldRule$2 },
  "quote-price-rule": { schema: quotePriceRule$2 },
  "quote-price-formula": { schema: quotePriceFormula$2 },
  "tracking-shipment": { schema: trackingShipment$2 },
  "tracking-node": { schema: trackingNode$2 },
  "tracking-provider": { schema: trackingProvider$2 },
  "contact-matrix": { schema: contactMatrix$3 },
  "review": { schema: review$3 },
  "subscription": { schema: subscription$2 },
  "landing-page": { schema: landingPage$3 },
  "conversion-funnel": { schema: conversionFunnel$2 },
  "conversion-event": { schema: conversionEvent$2 },
  "intent-order": { schema: intentOrder$3 },
  "referral": { schema: referral$3 },
  "customer-profile": { schema: customerProfile$3 }
};
const createGenericController = (serviceName) => ({
  async find(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) {
      return ctx.badRequest("siteId 未设置");
    }
    ctx.body = await strapi.plugin("zhao-logistics").service(serviceName).findAdmin(siteId, ctx.query);
  },
  async findOne(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    const result = await strapi.plugin("zhao-logistics").service(serviceName).findOneAdmin(siteId, documentId);
    if (!result) return ctx.notFound("记录不存在");
    ctx.body = { data: result };
  },
  async create(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).createAdmin(siteId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  },
  async update(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).updateAdmin(siteId, documentId, ctx.request.body);
      ctx.body = { data: result };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  },
  async delete(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!documentId) return ctx.badRequest("documentId 必填");
    try {
      const result = await strapi.plugin("zhao-logistics").service(serviceName).deleteAdmin(siteId, documentId);
      ctx.body = { data: result };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  }
});
const quoteEngine$1 = {
  async calculate(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");
    const result = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider,
      weight: Number(weight),
      length: length ? Number(length) : void 0,
      width: width ? Number(width) : void 0,
      height: height ? Number(height) : void 0,
      variables
    });
    if (!result) return ctx.notFound("未找到匹配的报价规则");
    ctx.body = { data: result };
  },
  async calculateMulti(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");
    const results = await strapi.plugin("zhao-logistics").service("quote-engine").calculateMulti(siteId, {
      routeId,
      weight: Number(weight),
      length: length ? Number(length) : void 0,
      width: width ? Number(width) : void 0,
      height: height ? Number(height) : void 0,
      variables
    });
    ctx.body = { data: results };
  },
  async saveQuote(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { quoteRequestId, result } = ctx.request.body;
    if (!quoteRequestId || !result) return ctx.badRequest("quoteRequestId 和 result 必填");
    await strapi.plugin("zhao-logistics").service("quote-engine").saveQuote(siteId, quoteRequestId, result);
    ctx.body = { data: { success: true } };
  }
};
const trackingAggregator$1 = {
  async getTracking(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");
    const result = await strapi.plugin("zhao-logistics").service("tracking-aggregator").getTracking(siteId, trackingNo);
    if (!result) return ctx.notFound("运单不存在");
    ctx.body = { data: result };
  },
  async batchTracking(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNos } = ctx.request.body;
    if (!Array.isArray(trackingNos) || trackingNos.length === 0) {
      return ctx.badRequest("trackingNos 必填且为数组");
    }
    const results = await strapi.plugin("zhao-logistics").service("tracking-aggregator").batchTracking(siteId, trackingNos);
    ctx.body = { data: results };
  },
  async syncFromProvider(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");
    try {
      await strapi.plugin("zhao-logistics").service("tracking-aggregator").syncFromProvider(siteId, trackingNo);
      ctx.body = { data: { success: true } };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  }
};
const dynamicForm$1 = {
  async loadFields(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, customerType, lang } = ctx.query;
    const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
      routeId,
      serviceProvider,
      customerType,
      lang
    });
    ctx.body = { data: fields };
  },
  async validate(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { formData, fields } = ctx.request.body;
    if (!formData || !fields) return ctx.badRequest("formData 和 fields 必填");
    const result = await strapi.plugin("zhao-logistics").service("dynamic-form").validate(siteId, formData, fields);
    ctx.body = { data: result };
  }
};
const UID$k = "plugin::zhao-logistics.review";
const reviewAction = {
  async approve(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID$k).update({
      where: { documentId },
      data: { status: "approved", publishedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    ctx.body = { data: result };
  },
  async reject(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID$k).update({
      where: { documentId },
      data: { status: "rejected" }
    });
    ctx.body = { data: result };
  },
  async reply(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const { replyContent } = ctx.request.body;
    if (!siteId || !documentId || !replyContent) return ctx.badRequest("参数缺失");
    const result = await strapi.db.query(UID$k).update({
      where: { documentId },
      data: { replyContent, replyAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    ctx.body = { data: result };
  }
};
const ORDER_UID = "plugin::zhao-logistics.intent-order";
const REFERRAL_UID$1 = "plugin::zhao-logistics.referral";
const intentOrderAction = {
  /**
   * POST /v1/admin/intent-orders/:documentId/convert
   * 集成点 6.3：推荐转化奖励全链路
   * 1. 更新 order.status=delivered + convertedToOrderId
   * 2. 查 referral（intentOrderId=当前订单）
   * 3. referral-engine.markConverted
   * 4. customer-aggregator.upsertFromOrder
   */
  async convert(ctx) {
    const siteId = ctx.state.siteId;
    const { documentId } = ctx.params;
    const { convertedToOrderId } = ctx.request.body;
    if (!siteId || !documentId) return ctx.badRequest("参数缺失");
    const order = await strapi.db.query(ORDER_UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!order) return ctx.notFound("订单不存在");
    const updated = await strapi.db.query(ORDER_UID).update({
      where: { documentId },
      data: {
        status: "delivered",
        actualShipDate: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
        convertedToOrderId: convertedToOrderId || null
      }
    });
    const referral2 = await strapi.db.query(REFERRAL_UID$1).findOne({
      where: { site: siteId, intentOrderId: documentId, deletedAt: null }
    });
    if (referral2) {
      try {
        const conversionValue = Number(order.confirmedPrice) || 0;
        await strapi.plugin("zhao-logistics").service("referral-engine").markConverted(siteId, referral2.documentId, documentId, conversionValue);
      } catch (err) {
        strapi.log.error(`[intent-order.convert] 推荐转化失败: ${err.message}`);
      }
    }
    try {
      await strapi.plugin("zhao-logistics").service("customer-aggregator").upsertFromOrder(siteId, documentId);
    } catch (err) {
      strapi.log.error(`[intent-order.convert] 客户档案更新失败: ${err.message}`);
    }
    ctx.body = { data: updated };
  }
};
const customerProfileAction = {
  /**
   * POST /v1/admin/customer-profiles/merge
   * body: { sourceId, targetId }
   */
  async merge(ctx) {
    const siteId = ctx.state.siteId;
    const { sourceId, targetId } = ctx.request.body;
    if (!siteId || !sourceId || !targetId)
      return ctx.badRequest("siteId, sourceId, targetId 必填");
    if (sourceId === targetId)
      return ctx.badRequest("源档案和目标档案不能相同");
    try {
      const result = await strapi.plugin("zhao-logistics").service("customer-aggregator").merge(siteId, sourceId, targetId);
      ctx.body = { data: result };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  }
};
const funnelStats = {
  /**
   * GET /v1/admin/funnel/stats
   */
  async stats(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { funnelId, dateFrom, dateTo, lang, utmSource } = ctx.query;
    if (!funnelId) return ctx.badRequest("funnelId 必填");
    const result = await strapi.plugin("zhao-logistics").service("funnel-tracker").getStats(siteId, {
      funnelId,
      dateFrom,
      dateTo,
      lang,
      utmSource
    });
    ctx.body = { data: result };
  }
};
const referralStats = {
  /**
   * GET /v1/admin/referrals/stats
   */
  async stats(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { dateFrom, dateTo, referrerCustomerId } = ctx.query;
    const result = await strapi.plugin("zhao-logistics").service("referral-engine").getStats(siteId, {
      dateFrom,
      dateTo,
      referrerCustomerId
    });
    ctx.body = { data: result };
  }
};
const quoteRequest$1 = createGenericController("quote-request");
const quoteFieldRule$1 = createGenericController("quote-field-rule");
const quotePriceRule$1 = createGenericController("quote-price-rule");
const quotePriceFormula$1 = createGenericController("quote-price-formula");
const trackingShipment$1 = createGenericController("tracking-shipment");
const trackingNode$1 = createGenericController("tracking-node");
const trackingProvider$1 = createGenericController("tracking-provider");
const contactMatrix$2 = createGenericController("contact-matrix");
const review$2 = createGenericController("review");
const subscription$1 = createGenericController("subscription");
const landingPage$2 = createGenericController("landing-page");
const conversionFunnel$1 = createGenericController("conversion-funnel");
const conversionEvent$1 = createGenericController("conversion-event");
const intentOrder$2 = createGenericController("intent-order");
const referral$2 = createGenericController("referral");
const customerProfile$2 = createGenericController("customer-profile");
const adminApi = {
  "quote-request": quoteRequest$1,
  "quote-field-rule": quoteFieldRule$1,
  "quote-price-rule": quotePriceRule$1,
  "quote-price-formula": quotePriceFormula$1,
  "tracking-shipment": trackingShipment$1,
  "tracking-node": trackingNode$1,
  "tracking-provider": trackingProvider$1,
  "contact-matrix": contactMatrix$2,
  "quote-engine": quoteEngine$1,
  "tracking-aggregator": trackingAggregator$1,
  "dynamic-form": dynamicForm$1,
  "review": review$2,
  "subscription": subscription$1,
  "landing-page": landingPage$2,
  "conversion-funnel": conversionFunnel$1,
  "conversion-event": conversionEvent$1,
  "intent-order": intentOrder$2,
  "referral": referral$2,
  "customer-profile": customerProfile$2,
  "review-action": reviewAction,
  "intent-order-action": intentOrderAction,
  "customer-profile-action": customerProfileAction,
  "funnel-stats": funnelStats,
  "referral-stats": referralStats
};
const QUOTE_REQUEST_UID$1 = "plugin::zhao-logistics.quote-request";
const quote = {
  /**
   * GET /v1/quote/fields — 加载动态字段规则
   */
  async loadFields(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, customerType, lang } = ctx.query;
    const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
      routeId,
      serviceProvider,
      customerType,
      lang
    });
    ctx.body = { data: fields };
  },
  /**
   * POST /v1/quote/calculate — 公开报价计算
   */
  async calculate(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");
    const result = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider,
      weight: Number(weight),
      length: length ? Number(length) : void 0,
      width: width ? Number(width) : void 0,
      height: height ? Number(height) : void 0,
      variables
    });
    if (!result) return ctx.notFound("未找到匹配的报价规则");
    ctx.body = { data: result };
  },
  /**
   * POST /v1/quote/submit — 提交询价（集成点 6.1）
   * 1. dynamic-form.loadFields + validate
   * 2. quote-engine.calculate
   * 3. 创建 quote-request
   * 4. 调 zhao-website.lead.createPublic（type=quote）
   * 5. customer-aggregator.upsertFromQuote
   * 6. referral-engine.applyCode（若有 referralCode）
   * 7. funnel-tracker.track('quote_submit')
   */
  async submit(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const body = ctx.request.body;
    const { routeId, origin, destination, cargoType, weight, customerName, customerContact, lang, formData, referralCode, utm } = body;
    if (!routeId || !origin || !destination || !cargoType || !weight || !customerName || !customerContact || !lang) {
      return ctx.badRequest("缺少必填字段");
    }
    if (formData) {
      const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
        routeId,
        customerType: body.customerType,
        lang
      });
      const validation = strapi.plugin("zhao-logistics").service("dynamic-form").validate(siteId, formData, fields);
      if (!validation.valid) {
        return ctx.badRequest("表单校验失败", { errors: validation.errors });
      }
    }
    const quoteResult = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider: body.serviceProvider,
      weight: Number(weight),
      length: body.length,
      width: body.width,
      height: body.height
    });
    const trackingNo = `QR${Date.now()}${Math.floor(Math.random() * 100)}`;
    const quoteRequest2 = await strapi.db.query(QUOTE_REQUEST_UID$1).create({
      data: {
        site: siteId,
        trackingNo,
        routeId,
        origin,
        destination,
        serviceProvider: body.serviceProvider || null,
        cargoType,
        weight: Number(weight),
        volume: body.volume || null,
        formData: formData || {},
        quotedPrice: quoteResult || null,
        status: "submitted",
        customerName,
        customerContact,
        customerType: body.customerType || null,
        utmSource: utm?.source || null,
        utmMedium: utm?.medium || null,
        utmCampaign: utm?.campaign || null,
        lang,
        remark: body.remark || null,
        expiresAt: quoteResult?.expiresAt || null
      }
    });
    let leadId = null;
    try {
      const lead = await strapi.plugin("zhao-website").service("lead").createPublic(siteId, {
        type: "quote",
        contactName: customerName,
        contactPhone: typeof customerContact === "string" ? customerContact : JSON.stringify(customerContact),
        sourceType: "quote_submit",
        sourceId: quoteRequest2.documentId,
        referralCode: referralCode || null,
        utmSource: utm?.source || null,
        utmMedium: utm?.medium || null,
        utmCampaign: utm?.campaign || null,
        message: body.remark || null
      }, ctx);
      leadId = lead?.documentId || null;
      if (leadId) {
        await strapi.db.query(QUOTE_REQUEST_UID$1).update({
          where: { documentId: quoteRequest2.documentId },
          data: { leadId }
        });
      }
    } catch (err) {
      strapi.log.error(`[quote.submit] lead 创建失败: ${err.message}`);
    }
    try {
      await strapi.plugin("zhao-logistics").service("customer-aggregator").upsertFromQuote(siteId, quoteRequest2.documentId);
    } catch (err) {
      strapi.log.error(`[quote.submit] 客户档案更新失败: ${err.message}`);
    }
    if (referralCode) {
      try {
        await strapi.plugin("zhao-logistics").service("referral-engine").applyCode(siteId, referralCode, {
          name: customerName,
          contact: customerContact,
          source: "quote_submit"
        });
      } catch (err) {
        strapi.log.error(`[quote.submit] 推荐码应用失败: ${err.message}`);
      }
    }
    try {
      await strapi.plugin("zhao-logistics").service("funnel-tracker").track(siteId, {
        eventName: "quote_submit",
        visitorId: ctx.request.headers["x-visitor-id"] || `q_${quoteRequest2.documentId}`,
        userId: ctx.state.user?.id,
        landingPageId: body.landingPageId,
        quoteRequestId: quoteRequest2.documentId,
        utm,
        lang,
        ctx
      });
    } catch (err) {
      strapi.log.error(`[quote.submit] 漏斗事件记录失败: ${err.message}`);
    }
    ctx.body = {
      data: {
        quoteRequestId: quoteRequest2.documentId,
        trackingNo,
        quote: quoteResult,
        leadId
      }
    };
  }
};
const SUBSCRIPTION_UID = "plugin::zhao-logistics.subscription";
const tracking = {
  /**
   * GET /v1/tracking/:trackingNo — 查询轨迹
   */
  async getTracking(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo } = ctx.params;
    if (!trackingNo) return ctx.badRequest("trackingNo 必填");
    const result = await strapi.plugin("zhao-logistics").service("tracking-aggregator").getTracking(siteId, trackingNo);
    if (!result) return ctx.notFound("运单不存在");
    ctx.body = { data: result };
  },
  /**
   * POST /v1/tracking/batch — 批量查询
   */
  async batch(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNos } = ctx.request.body;
    if (!Array.isArray(trackingNos) || trackingNos.length === 0) {
      return ctx.badRequest("trackingNos 必填且为数组");
    }
    const results = await strapi.plugin("zhao-logistics").service("tracking-aggregator").batchTracking(siteId, trackingNos);
    ctx.body = { data: results };
  },
  /**
   * POST /v1/tracking/subscribe — 订阅运单更新（集成点 6.2 入口）
   */
  async subscribe(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { trackingNo, channel, channelTarget, frequency, language } = ctx.request.body;
    if (!trackingNo || !channel || !channelTarget || !language) {
      return ctx.badRequest("trackingNo, channel, channelTarget, language 必填");
    }
    const subscription2 = await strapi.db.query(SUBSCRIPTION_UID).create({
      data: {
        site: siteId,
        subscriberType: "tracking_update",
        channel,
        channelTarget,
        trackingNo,
        frequency: frequency || "realtime",
        isActive: true,
        subscribedAt: (/* @__PURE__ */ new Date()).toISOString(),
        language
      }
    });
    ctx.body = { data: subscription2 };
  }
};
const UID$j = "plugin::zhao-logistics.contact-matrix";
const contactMatrix$1 = {
  /**
   * GET /v1/contact-matrix/:lang — 获取某语言渠道矩阵
   */
  async getByLang(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { lang } = ctx.params;
    if (!lang) return ctx.badRequest("lang 必填");
    const result = await strapi.db.query(UID$j).findOne({
      where: { site: siteId, lang, isActive: true, deletedAt: null }
    });
    if (!result) return ctx.notFound("该语言的联系渠道未配置");
    ctx.body = { data: result };
  }
};
const UID$i = "plugin::zhao-logistics.review";
const review$1 = {
  /**
   * GET /v1/reviews — 评价列表（仅 approved + isVerified）
   */
  async list(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { page = 1, pageSize = 10, authorCountry, routeId, testimonialType } = ctx.query;
    const filters = { site: siteId, status: "approved", deletedAt: null };
    if (authorCountry) filters.authorCountry = authorCountry;
    if (routeId) filters.routeId = routeId;
    if (testimonialType) filters.testimonialType = testimonialType;
    const offset = (Number(page) - 1) * Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi.db.query(UID$i).findMany({
        where: filters,
        offset,
        limit: Number(pageSize),
        orderBy: { publishedAt: "desc" },
        populate: { videoPoster: true, images: true }
      }),
      strapi.db.query(UID$i).count({ where: filters })
    ]);
    ctx.body = {
      data: rows,
      pagination: { page: Number(page), pageSize: Number(pageSize), total, pageCount: Math.ceil(total / Number(pageSize)) }
    };
  },
  /**
   * POST /v1/reviews/submit — 提交评价（status=pending，可选登录）
   */
  async submit(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const body = ctx.request.body;
    const review2 = await strapi.db.query(UID$i).create({
      data: {
        site: siteId,
        authorName: body.authorName,
        authorCompany: body.authorCompany || null,
        authorTitle: body.authorTitle || null,
        authorCountry: body.authorCountry,
        routeId: body.routeId || null,
        serviceProvider: body.serviceProvider || null,
        rating: Number(body.rating),
        content: body.content,
        videoUrl: body.videoUrl || null,
        testimonialType: body.testimonialType || "text",
        isVerified: false,
        status: "pending",
        publishedAt: null,
        orderRef: body.orderRef || null
      }
    });
    ctx.body = { data: review2 };
  }
};
const UID$h = "plugin::zhao-logistics.landing-page";
const landingPage$1 = {
  /**
   * GET /v1/landing-pages/:slug — 获取落地页内容
   */
  async getBySlug(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { slug } = ctx.params;
    if (!slug) return ctx.badRequest("slug 必填");
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const result = await strapi.db.query(UID$h).findOne({
      where: {
        site: siteId,
        slug,
        isActive: true,
        status: "published",
        deletedAt: null,
        $or: [{ startAt: null }, { startAt: { $lte: now } }],
        $or: [{ endAt: null }, { endAt: { $gte: now } }]
      },
      populate: { ogImage: true }
    });
    if (!result) return ctx.notFound("落地页不存在或已下线");
    ctx.body = { data: result };
  }
};
const UID$g = "plugin::zhao-logistics.intent-order";
const intentOrder$1 = {
  /**
   * GET /v1/intent-orders/:orderNo — 查询我的意向订单（需登录）
   */
  async getMyOrder(ctx) {
    const siteId = ctx.state.siteId;
    const user = ctx.state.user;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!user?.id) return ctx.unauthorized("请先登录");
    const { orderNo } = ctx.params;
    if (!orderNo) return ctx.badRequest("orderNo 必填");
    const result = await strapi.db.query(UID$g).findOne({
      where: { site: siteId, orderNo, deletedAt: null },
      populate: { assignedTo: true }
    });
    if (!result) return ctx.notFound("订单不存在");
    ctx.body = { data: result };
  }
};
const funnel = {
  /**
   * POST /v1/funnel/track — 漏斗事件上报
   */
  async track(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { funnelId, eventName, visitorId, sessionId, landingPageId, quoteRequestId, utm, lang } = ctx.request.body;
    if (!eventName || !visitorId) return ctx.badRequest("eventName 和 visitorId 必填");
    await strapi.plugin("zhao-logistics").service("funnel-tracker").track(siteId, {
      funnelId,
      eventName,
      visitorId,
      userId: ctx.state.user?.id,
      sessionId,
      landingPageId,
      quoteRequestId,
      utm,
      lang,
      ctx
    });
    ctx.body = { data: { success: true } };
  }
};
const referral$1 = {
  /**
   * POST /v1/referral/apply — 应用推荐码
   */
  async apply(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { code, name, contact, channel, source } = ctx.request.body;
    if (!code || !name || !contact) return ctx.badRequest("code, name, contact 必填");
    try {
      const referral2 = await strapi.plugin("zhao-logistics").service("referral-engine").applyCode(siteId, code, {
        name,
        contact,
        channel,
        source
      });
      ctx.body = { data: referral2 };
    } catch (err) {
      ctx.badRequest(err.message);
    }
  },
  /**
   * GET /v1/referral/validate/:code — 验证推荐码有效性
   */
  async validate(ctx) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { code } = ctx.params;
    const result = await strapi.plugin("zhao-logistics").service("referral-engine").validateCode(siteId, code);
    ctx.body = { data: result };
  }
};
const customerProfile$1 = {
  /**
   * GET /v1/customer-profile — 查询当前用户客户档案（需登录）
   */
  async getMyProfile(ctx) {
    const siteId = ctx.state.siteId;
    const user = ctx.state.user;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    if (!user?.id) return ctx.unauthorized("请先登录");
    ctx.body = { data: null, message: "请通过手机号关联客户档案" };
  }
};
const contentApi = {
  quote,
  tracking,
  "contact-matrix": contactMatrix$1,
  review: review$1,
  "landing-page": landingPage$1,
  "intent-order": intentOrder$1,
  funnel,
  referral: referral$1,
  "customer-profile": customerProfile$1
};
const adminApiWithSuffix = Object.fromEntries(
  Object.entries(adminApi).map(([key, value]) => [`${key}-admin`, value])
);
const controllers = {
  ...contentApi,
  ...adminApiWithSuffix
};
const routes$2 = [
  // quote
  { method: "GET", path: "/v1/quote/fields", handler: "quote.loadFields", config: {} },
  { method: "POST", path: "/v1/quote/calculate", handler: "quote.calculate", config: {} },
  { method: "POST", path: "/v1/quote/submit", handler: "quote.submit", config: {} },
  // tracking
  { method: "GET", path: "/v1/tracking/:trackingNo", handler: "tracking.getTracking", config: {} },
  { method: "POST", path: "/v1/tracking/batch", handler: "tracking.batch", config: {} },
  { method: "POST", path: "/v1/tracking/subscribe", handler: "tracking.subscribe", config: {} },
  // contact-matrix
  { method: "GET", path: "/v1/contact-matrix/:lang", handler: "contact-matrix.getByLang", config: {} },
  // review
  { method: "GET", path: "/v1/reviews", handler: "review.list", config: {} },
  { method: "POST", path: "/v1/reviews/submit", handler: "review.submit", config: {} },
  // landing-page
  { method: "GET", path: "/v1/landing-pages/:slug", handler: "landing-page.getBySlug", config: {} },
  // intent-order（需登录）
  { method: "GET", path: "/v1/intent-orders/:orderNo", handler: "intent-order.getMyOrder", config: {} },
  // funnel
  { method: "POST", path: "/v1/funnel/track", handler: "funnel.track", config: {} },
  // referral
  { method: "POST", path: "/v1/referral/apply", handler: "referral.apply", config: {} },
  { method: "GET", path: "/v1/referral/validate/:code", handler: "referral.validate", config: {} },
  // customer-profile（需登录）
  { method: "GET", path: "/v1/customer-profile", handler: "customer-profile.getMyProfile", config: {} }
];
const adminRoute = (method, path, handler, permission) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
      "plugin::zhao-auth.has-tenant-access"
    ]
  }
});
const createCrudRoutes = (ctName, pluralName, permPrefix, actionMap = {}) => {
  const permFor = (action) => {
    const suffix = actionMap[action];
    if (suffix) return suffix.startsWith("logistics.") ? suffix : `${permPrefix}.${suffix}`;
    const defaultSuffix = action === "find" || action === "findOne" ? "read" : action;
    return `${permPrefix}.${defaultSuffix}`;
  };
  return [
    adminRoute("GET", `/${pluralName}`, `${ctName}-admin.find`, permFor("find")),
    adminRoute("GET", `/${pluralName}/:documentId`, `${ctName}-admin.findOne`, permFor("findOne")),
    adminRoute("POST", `/${pluralName}`, `${ctName}-admin.create`, permFor("create")),
    adminRoute("PUT", `/${pluralName}/:documentId`, `${ctName}-admin.update`, permFor("update")),
    adminRoute("DELETE", `/${pluralName}/:documentId`, `${ctName}-admin.delete`, permFor("delete"))
  ];
};
const routes$1 = [
  // ===== 16 个 CT CRUD =====
  ...createCrudRoutes("quote-request", "quote-requests", "logistics.quote-request"),
  ...createCrudRoutes("quote-field-rule", "quote-field-rules", "logistics.quote-field-rule"),
  ...createCrudRoutes("quote-price-rule", "quote-price-rules", "logistics.quote-price-rule"),
  ...createCrudRoutes("quote-price-formula", "quote-price-formulas", "logistics.quote-price-formula"),
  ...createCrudRoutes("tracking-shipment", "tracking-shipments", "logistics.tracking-shipment"),
  ...createCrudRoutes("tracking-node", "tracking-nodes", "logistics.tracking-node"),
  ...createCrudRoutes("tracking-provider", "tracking-providers", "logistics.tracking-provider"),
  ...createCrudRoutes("contact-matrix", "contact-matrices", "logistics.contact-matrix"),
  ...createCrudRoutes("review", "reviews", "logistics.review"),
  // subscription.create 缺，复用 .update
  ...createCrudRoutes("subscription", "subscriptions", "logistics.subscription", { create: "update" }),
  ...createCrudRoutes("landing-page", "landing-pages", "logistics.landing-page"),
  ...createCrudRoutes("conversion-funnel", "conversion-funnels", "logistics.conversion-funnel"),
  // conversion-event 仅 read，create/update/delete 复用 .read
  ...createCrudRoutes("conversion-event", "conversion-events", "logistics.conversion-event", {
    create: "read",
    update: "read",
    delete: "read"
  }),
  ...createCrudRoutes("intent-order", "intent-orders", "logistics.intent-order"),
  ...createCrudRoutes("referral", "referrals", "logistics.referral"),
  // customer-profile.create 缺，复用 .update
  ...createCrudRoutes("customer-profile", "customer-profiles", "logistics.customer-profile", { create: "update" }),
  // ===== 15 个自定义动作 =====
  // 报价引擎（属询价管理域，复用 quote-request.update）
  adminRoute("POST", "/quote-engine/calculate", "quote-engine-admin.calculate", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/calculate-multi", "quote-engine-admin.calculateMulti", "logistics.quote-request.update"),
  adminRoute("POST", "/quote-engine/save-quote", "quote-engine-admin.saveQuote", "logistics.quote-request.update"),
  // 运单聚合（属运单域，查询复用 tracking-shipment.read，同步属写操作复用 .update）
  adminRoute("GET", "/tracking-aggregator/:trackingNo", "tracking-aggregator-admin.getTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/batch", "tracking-aggregator-admin.batchTracking", "logistics.tracking-shipment.read"),
  adminRoute("POST", "/tracking-aggregator/:trackingNo/sync", "tracking-aggregator-admin.syncFromProvider", "logistics.tracking-shipment.update"),
  // 评价审核（approve/reject/reply 统一归 review.approve）
  adminRoute("POST", "/reviews/:documentId/approve", "review-action-admin.approve", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reject", "review-action-admin.reject", "logistics.review.approve"),
  adminRoute("POST", "/reviews/:documentId/reply", "review-action-admin.reply", "logistics.review.approve"),
  // 意向订单转化
  adminRoute("POST", "/intent-orders/:documentId/convert", "intent-order-action-admin.convert", "logistics.intent-order.convert"),
  // 客户档案合并
  adminRoute("POST", "/customer-profiles/merge", "customer-profile-action-admin.merge", "logistics.customer-profile.merge"),
  // 统计（注意：funnels 复数，与前端 logistics.js 对齐）
  adminRoute("GET", "/funnels/stats", "funnel-stats-admin.stats", "logistics.funnel-stats.read"),
  adminRoute("GET", "/referrals/stats", "referral-stats-admin.stats", "logistics.referral-stats.read"),
  // 动态表单（属询价域，复用 quote-request.read）
  adminRoute("GET", "/dynamic-form/fields", "dynamic-form-admin.loadFields", "logistics.quote-request.read"),
  adminRoute("POST", "/dynamic-form/validate", "dynamic-form-admin.validate", "logistics.quote-request.read")
];
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...routes$2, ...routes$1]
  }
};
const UID$f = "plugin::zhao-logistics.quote-request";
const quoteRequest = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, routeId, customerName, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (routeId) filters.routeId = routeId;
    if (customerName) filters.customerName = { $containsi: customerName };
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$f).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$f).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$f).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    if (!data.trackingNo) {
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
      const count = await strapi2.db.query(UID$f).count({ where: { site: siteId } });
      data.trackingNo = `QR${dateStr}${String(count + 1).padStart(3, "0")}`;
    }
    return strapi2.db.query(UID$f).create({
      data: { ...data, site: siteId }
    });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$f).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("询价单不存在或已删除");
    return strapi2.db.query(UID$f).update({
      where: { documentId },
      data
    });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$f).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("询价单不存在或已删除");
    return strapi2.db.query(UID$f).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$e = "plugin::zhao-logistics.quote-field-rule";
const quoteFieldRule = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, isActive, routeId, serviceProvider, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    if (routeId) filters.routeId = routeId;
    if (serviceProvider) filters.serviceProvider = serviceProvider;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$e).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$e).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$e).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$e).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$e).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("字段规则不存在或已删除");
    return strapi2.db.query(UID$e).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$e).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("字段规则不存在或已删除");
    return strapi2.db.query(UID$e).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$d = "plugin::zhao-logistics.quote-price-rule";
const quotePriceRule = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, routeId, serviceProvider, isActive, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (routeId) filters.routeId = routeId;
    if (serviceProvider) filters.serviceProvider = serviceProvider;
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$d).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { formula: true }
      }),
      strapi2.db.query(UID$d).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$d).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { formula: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$d).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$d).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("报价规则不存在或已删除");
    return strapi2.db.query(UID$d).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$d).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("报价规则不存在或已删除");
    return strapi2.db.query(UID$d).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$c = "plugin::zhao-logistics.quote-price-formula";
const quotePriceFormula = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, isActive, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$c).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$c).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$c).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("报价公式不存在或已删除");
    return strapi2.db.query(UID$c).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$c).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("报价公式不存在或已删除");
    return strapi2.db.query(UID$c).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$b = "plugin::zhao-logistics.tracking-shipment";
const trackingShipment = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, trackingNo, customerName, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (trackingNo) filters.trackingNo = { $containsi: trackingNo };
    if (customerName) filters.customerName = { $containsi: customerName };
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$b).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { syncProvider: true }
      }),
      strapi2.db.query(UID$b).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$b).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { syncProvider: true }
    });
  },
  async createAdmin(siteId, data) {
    const existing = await strapi2.db.query(UID$b).findOne({
      where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null }
    });
    if (existing) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    return strapi2.db.query(UID$b).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$b).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("运单不存在或已删除");
    if (data.trackingNo && data.trackingNo !== existing.trackingNo) {
      const dup = await strapi2.db.query(UID$b).findOne({
        where: { site: siteId, trackingNo: data.trackingNo, deletedAt: null }
      });
      if (dup) throw new Error(`运单号 ${data.trackingNo} 已存在`);
    }
    return strapi2.db.query(UID$b).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$b).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("运单不存在或已删除");
    return strapi2.db.query(UID$b).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$a = "plugin::zhao-logistics.tracking-node";
const trackingNode = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, shipmentId, nodeStatus, dataSource, sort = "eventTime:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (shipmentId) filters.shipment = shipmentId;
    if (nodeStatus) filters.nodeStatus = nodeStatus;
    if (dataSource) filters.dataSource = dataSource;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$a).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { shipment: true }
      }),
      strapi2.db.query(UID$a).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$a).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { shipment: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$a).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$a).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("追踪节点不存在或已删除");
    return strapi2.db.query(UID$a).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$a).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("追踪节点不存在或已删除");
    return strapi2.db.query(UID$a).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$9 = "plugin::zhao-logistics.tracking-provider";
const trackingProvider = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, providerType, isEnabled, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (providerType) filters.providerType = providerType;
    if (isEnabled !== void 0) filters.isEnabled = isEnabled === "true" || isEnabled === true;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$9).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$9).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$9).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$9).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$9).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("API 配置不存在或已删除");
    return strapi2.db.query(UID$9).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$9).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("API 配置不存在或已删除");
    return strapi2.db.query(UID$9).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$8 = "plugin::zhao-logistics.contact-matrix";
const contactMatrix = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, lang, isActive, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (lang) filters.lang = lang;
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$8).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$8).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$8).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$8).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$8).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("渠道矩阵不存在或已删除");
    return strapi2.db.query(UID$8).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$8).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("渠道矩阵不存在或已删除");
    return strapi2.db.query(UID$8).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const RULE_UID = "plugin::zhao-logistics.quote-price-rule";
const REQUEST_UID = "plugin::zhao-logistics.quote-request";
const quoteEngine = ({ strapi: strapi2 }) => ({
  /**
   * 计算报价（单服务商）
   * 1. 匹配 quote-price-rule（routeId + serviceProvider + weight 区间）
   * 2. 若 rule.formula 存在，加载 quote-price-formula
   * 3. 解析 variables（从 input + rule 提取值）
   * 4. 沙箱执行 expression（用 expr-eval）
   * 5. 返回 QuoteResult
   */
  async calculate(siteId, input) {
    const rules = await strapi2.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight },
        ...input.serviceProvider ? { serviceProvider: input.serviceProvider } : {}
      },
      populate: { formula: true },
      limit: 1,
      orderBy: { minWeight: "asc" }
    });
    if (!rules || rules.length === 0) return null;
    const rule = rules[0];
    let volumetricWeight = 0;
    if (input.length && input.width && input.height && rule.volumetricFactor) {
      volumetricWeight = input.length * input.width * input.height / rule.volumetricFactor;
    }
    const chargeableWeight = Math.max(input.weight, volumetricWeight);
    let basePrice = chargeableWeight * Number(rule.pricePerKg);
    const surcharges = [];
    if (rule.surcharges && Array.isArray(rule.surcharges)) {
      for (const surcharge of rule.surcharges) {
        const amount = typeof surcharge.amount === "number" ? surcharge.amount : chargeableWeight * Number(surcharge.amount || 0);
        surcharges.push({ name: surcharge.name, amount });
        basePrice += amount;
      }
    }
    let formulaExpression;
    let formulaId;
    if (rule.formula && rule.formula.expression) {
      formulaExpression = rule.formula.expression;
      formulaId = rule.formula.documentId;
      try {
        const parser = new exprEval.Parser();
        const expr = parser.parse(formulaExpression);
        const variables = {
          weight: chargeableWeight,
          base: basePrice,
          ...input.variables
        };
        if (rule.formula.variables && typeof rule.formula.variables === "object") {
          for (const [key, val] of Object.entries(rule.formula.variables)) {
            if (typeof val === "number" && !(key in variables)) {
              variables[key] = val;
            }
          }
        }
        basePrice = expr.evaluate(variables);
      } catch (err) {
        strapi2.log.error(`[quote-engine] 公式执行失败: ${formulaExpression}`, err);
      }
    }
    const minCharge = rule.minCharge ? Number(rule.minCharge) : 0;
    if (basePrice < minCharge) {
      basePrice = minCharge;
    }
    const now = /* @__PURE__ */ new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1e3);
    return {
      ruleId: rule.documentId,
      formulaId,
      serviceProvider: rule.serviceProvider,
      minPrice: Math.round(basePrice * 100) / 100,
      maxPrice: Math.round(basePrice * 1.1 * 100) / 100,
      currency: rule.currency || "CNY",
      breakdown: {
        base: Math.round(chargeableWeight * Number(rule.pricePerKg) * 100) / 100,
        volumetricWeight: Math.round(volumetricWeight * 100) / 100,
        surcharges,
        minCharge,
        formula: formulaExpression
      },
      expiresAt: expiresAt.toISOString()
    };
  },
  /**
   * 批量计算（多服务商比价）
   */
  async calculateMulti(siteId, input) {
    const rules = await strapi2.db.query(RULE_UID).findMany({
      where: {
        site: siteId,
        routeId: input.routeId,
        isActive: true,
        deletedAt: null,
        minWeight: { $lte: input.weight },
        maxWeight: { $gte: input.weight }
      },
      populate: { formula: true },
      orderBy: { serviceProvider: "asc" }
    });
    if (!rules || rules.length === 0) return [];
    const serviceProviderMap = /* @__PURE__ */ new Map();
    for (const rule of rules) {
      if (!serviceProviderMap.has(rule.serviceProvider)) {
        serviceProviderMap.set(rule.serviceProvider, rule);
      }
    }
    const results = [];
    for (const provider of serviceProviderMap.values()) {
      const result = await this.calculate(siteId, {
        ...input,
        serviceProvider: provider.serviceProvider
      });
      if (result) results.push(result);
    }
    return results.sort((a, b) => a.minPrice - b.minPrice);
  },
  /**
   * 保存报价到 quote-request
   */
  async saveQuote(siteId, quoteRequestId, result) {
    await strapi2.db.query(REQUEST_UID).update({
      where: { site: siteId, documentId: quoteRequestId },
      data: {
        quotedPrice: result.minPrice,
        quotedPriceMax: result.maxPrice,
        quotedCurrency: result.currency,
        quotedBreakdown: result.breakdown,
        quotedExpiresAt: result.expiresAt,
        status: "quoted"
      }
    });
  }
});
const track17Provider = {
  async queryTracking(providerConfig, trackingNo) {
    const endpoint = providerConfig.endpoint || "https://api.17track.net/track/v2.2/gettrackinfo";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "17token": providerConfig.apiKey
      },
      body: JSON.stringify({ data: [{ number: trackingNo }] })
    });
    if (!response.ok) {
      throw new Error(`17Track API 返回 ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const nodes = [];
    if (data?.data?.accepted && data.data.accepted.length > 0) {
      const trackInfo = data.data.accepted[0];
      if (trackInfo?.track?.z0) {
        for (const event of trackInfo.track.z0) {
          nodes.push({
            eventTime: event.z ? new Date(Number(event.z)).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
            location: event.c || void 0,
            description: event.z1 || event.b || "",
            status: event.a || void 0,
            providerRef: `${trackingNo}_${event.z || Date.now()}`
          });
        }
      }
    }
    return nodes;
  }
};
const afterShipProvider = {
  async queryTracking(providerConfig, trackingNo) {
    const endpoint = providerConfig.endpoint || "https://api.aftership.com/v4/trackings";
    const response = await fetch(`${endpoint}/${trackingNo}`, {
      method: "GET",
      headers: {
        "aftership-api-key": providerConfig.apiKey,
        "Content-Type": "application/json"
      }
    });
    if (!response.ok) {
      throw new Error(`AfterShip API 返回 ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const nodes = [];
    if (data?.data?.tracking?.checkpoints) {
      for (const checkpoint of data.data.tracking.checkpoints) {
        nodes.push({
          eventTime: checkpoint.checkpoint_time || (/* @__PURE__ */ new Date()).toISOString(),
          location: checkpoint.location || void 0,
          description: checkpoint.message || checkpoint.tag || "",
          status: checkpoint.tag || void 0,
          providerRef: `${trackingNo}_${checkpoint.checkpoint_time || Date.now()}`
        });
      }
    }
    return nodes;
  }
};
const kuaidi100Provider = {
  async queryTracking(providerConfig, trackingNo) {
    const endpoint = providerConfig.endpoint || "https://poll.kuaidi100.com/poll/query.do";
    const params = new URLSearchParams({
      customer: providerConfig.apiKey,
      param: JSON.stringify({
        com: providerConfig.extraConfig?.com || "auto",
        num: trackingNo,
        phone: providerConfig.extraConfig?.phone || ""
      })
    });
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params.toString()
    });
    if (!response.ok) {
      throw new Error(`快递100 API 返回 ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const nodes = [];
    if (data?.data && Array.isArray(data.data)) {
      for (const item of data.data) {
        nodes.push({
          eventTime: item.ftime || (/* @__PURE__ */ new Date()).toISOString(),
          location: item.location || void 0,
          description: item.context || "",
          status: item.status || void 0,
          providerRef: `${trackingNo}_${item.ftime || Date.now()}`
        });
      }
    }
    return nodes;
  }
};
const customProvider = {
  async queryTracking(providerConfig, trackingNo) {
    if (!providerConfig.endpoint) {
      throw new Error("自定义追踪 API 需配置 endpoint");
    }
    const extraConfig = providerConfig.extraConfig || {};
    const method = extraConfig.method || "GET";
    const headers = extraConfig.headers || { "Content-Type": "application/json" };
    let url = providerConfig.endpoint;
    let body;
    if (method === "GET") {
      url += `?trackingNo=${encodeURIComponent(trackingNo)}`;
    } else {
      body = JSON.stringify({ trackingNo, ...extraConfig.body || {} });
    }
    const response = await fetch(url, {
      method,
      headers: { ...headers, Authorization: `Bearer ${providerConfig.apiKey}` },
      body
    });
    if (!response.ok) {
      throw new Error(`自定义追踪 API 返回 ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    const nodes = [];
    const dataPath = extraConfig.dataPath || "data";
    const items = dataPath.split(".").reduce((obj, key) => obj?.[key], data) || [];
    const fieldMapping = extraConfig.fieldMapping || {};
    for (const item of items) {
      nodes.push({
        eventTime: item[fieldMapping.eventTime || "eventTime"] || (/* @__PURE__ */ new Date()).toISOString(),
        location: item[fieldMapping.location || "location"] || void 0,
        description: item[fieldMapping.description || "description"] || "",
        status: item[fieldMapping.status || "status"] || void 0,
        providerRef: item[fieldMapping.providerRef || "providerRef"] || `${trackingNo}_${Date.now()}`
      });
    }
    return nodes;
  }
};
const providers = {
  track17: track17Provider,
  afterShip: afterShipProvider,
  kuaidi100: kuaidi100Provider,
  customApi: customProvider
};
function getProvider(providerConfig) {
  const provider = providers[providerConfig.providerType];
  if (!provider) {
    throw new Error(`不支持的追踪 API 类型: ${providerConfig.providerType}`);
  }
  return provider;
}
const SHIPMENT_UID = "plugin::zhao-logistics.tracking-shipment";
const NODE_UID = "plugin::zhao-logistics.tracking-node";
const trackingAggregator = ({ strapi: strapi2 }) => ({
  /**
   * 查询运单轨迹（内部 + 外部合并）
   * 1. 查 tracking-shipment
   * 2. 查 tracking-node（internal 源）
   * 3. 若 shipment.syncProvider 存在，调用外部 API
   * 4. 合并节点，按 eventTime 排序
   * 5. 检测异常状态（hold/exception 节点）
   * 6. 返回 {shipment, nodes, isAlert, alertNodes}
   */
  async getTracking(siteId, trackingNo) {
    const shipment = await strapi2.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true }
    });
    if (!shipment) return null;
    const internalNodes = await strapi2.db.query(NODE_UID).findMany({
      where: { site: siteId, shipment: shipment.id, deletedAt: null },
      orderBy: { eventTime: "desc" }
    });
    let allNodes = [...internalNodes];
    if (shipment.syncProvider && shipment.syncProvider.isEnabled) {
      const externalNodes = await strapi2.db.query(NODE_UID).findMany({
        where: { site: siteId, shipment: shipment.id, dataSource: "external", deletedAt: null },
        orderBy: { eventTime: "desc" }
      });
      allNodes = [...allNodes, ...externalNodes];
    }
    allNodes.sort((a, b) => new Date(b.eventTime).getTime() - new Date(a.eventTime).getTime());
    const alertStatuses = ["hold", "exception", "returned"];
    const alertNodes = allNodes.filter((n) => alertStatuses.includes(n.status));
    const isAlert = alertNodes.length > 0;
    return {
      shipment,
      nodes: allNodes,
      isAlert,
      alertNodes
    };
  },
  /**
   * 批量查询（最多 10 单）
   */
  async batchTracking(siteId, trackingNos) {
    if (trackingNos.length > 10) {
      throw new Error("批量查询最多 10 单");
    }
    const results = [];
    for (const trackingNo of trackingNos) {
      const result = await this.getTracking(siteId, trackingNo);
      if (result) results.push(result);
    }
    return results;
  },
  /**
   * 从外部 API 同步运单轨迹
   * 1. 加载 tracking-provider 配置
   * 2. 调用外部 API（按 providerType 分发）
   * 3. 增量写入 tracking-node（dataSource=external，去重 providerRef）
   * 4. 更新 shipment.lastSyncAt + status
   */
  async syncFromProvider(siteId, trackingNo) {
    const shipment = await strapi2.db.query(SHIPMENT_UID).findOne({
      where: { site: siteId, trackingNo, deletedAt: null },
      populate: { syncProvider: true }
    });
    if (!shipment) throw new Error(`运单不存在: ${trackingNo}`);
    if (!shipment.syncProvider || !shipment.syncProvider.isEnabled) {
      throw new Error(`运单 ${trackingNo} 未配置外部追踪源或已禁用`);
    }
    const providerConfig = {
      providerType: shipment.syncProvider.providerType,
      apiKey: shipment.syncProvider.apiKey,
      apiSecret: shipment.syncProvider.apiSecret || void 0,
      endpoint: shipment.syncProvider.endpoint || void 0,
      extraConfig: shipment.syncProvider.extraConfig || void 0
    };
    const provider = getProvider(providerConfig);
    const externalNodes = await provider.queryTracking(providerConfig, trackingNo);
    let newCount = 0;
    for (const node of externalNodes) {
      if (!node.providerRef) continue;
      const existing = await strapi2.db.query(NODE_UID).findOne({
        where: { site: siteId, shipment: shipment.id, providerRef: node.providerRef, deletedAt: null }
      });
      if (!existing) {
        await strapi2.db.query(NODE_UID).create({
          data: {
            site: siteId,
            shipment: shipment.id,
            trackingNo,
            eventTime: node.eventTime,
            location: node.location || "",
            description: node.description,
            status: node.status || "info",
            dataSource: "external",
            providerRef: node.providerRef,
            providerName: providerConfig.providerType
          }
        });
        newCount++;
      }
    }
    const latestNode = externalNodes[0];
    const statusMap = {
      delivered: "delivered",
      exception: "exception",
      hold: "hold",
      in_transit: "in_transit",
      customs: "customs",
      returned: "returned"
    };
    const updateData = {
      lastSyncAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    if (latestNode?.status && statusMap[latestNode.status]) {
      updateData.status = statusMap[latestNode.status];
    }
    await strapi2.db.query(SHIPMENT_UID).update({
      where: { site: siteId, documentId: shipment.documentId },
      data: updateData
    });
    strapi2.log.info(`[tracking-aggregator] ${trackingNo} 同步完成，新增 ${newCount} 条节点`);
  }
});
const FIELD_RULE_UID = "plugin::zhao-logistics.quote-field-rule";
const dynamicForm = ({ strapi: strapi2 }) => ({
  /**
   * 加载字段规则
   * 按条件匹配 quote-field-rule，合并 fields JSON
   */
  async loadFields(siteId, context) {
    const where = { site: siteId, isActive: true, deletedAt: null };
    if (context.routeId) {
      where.$or = [{ routeId: null }, { routeId: context.routeId }];
    }
    if (context.serviceProvider) ;
    const rules = await strapi2.db.query(FIELD_RULE_UID).findMany({
      where,
      orderBy: { priority: "desc" }
    });
    const filtered = rules.filter((r) => {
      if (!r.customerType) return true;
      if (!context.customerType) return true;
      return r.customerType === context.customerType;
    });
    const fieldMap = /* @__PURE__ */ new Map();
    for (const rule of filtered) {
      if (!rule.fields || !Array.isArray(rule.fields)) continue;
      for (const field of rule.fields) {
        if (fieldMap.has(field.key)) {
          fieldMap.set(field.key, { ...fieldMap.get(field.key), ...field });
        } else {
          fieldMap.set(field.key, field);
        }
      }
    }
    return Array.from(fieldMap.values()).sort((a, b) => a.order - b.order);
  },
  /**
   * 校验表单数据
   */
  validate(siteId, formData, fields) {
    const errors = [];
    for (const field of fields) {
      if (!field.visible) continue;
      const value = formData[field.key];
      if (field.required && (value === void 0 || value === null || value === "")) {
        errors.push({
          field: field.key,
          message: field.validation?.messageKey || `${field.label}为必填项`
        });
        continue;
      }
      if (value === void 0 || value === null || value === "") continue;
      if (field.validation?.pattern) {
        const regex = new RegExp(field.validation.pattern);
        if (!regex.test(String(value))) {
          errors.push({
            field: field.key,
            message: field.validation.messageKey || `${field.label}格式不正确`
          });
          continue;
        }
      }
      if (field.type === "number") {
        const numValue = Number(value);
        if (field.validation?.min !== void 0 && numValue < field.validation.min) {
          errors.push({
            field: field.key,
            message: `${field.label}不能小于 ${field.validation.min}`
          });
        }
        if (field.validation?.max !== void 0 && numValue > field.validation.max) {
          errors.push({
            field: field.key,
            message: `${field.label}不能大于 ${field.validation.max}`
          });
        }
      }
      if (field.type === "select" && field.options) {
        const validValues = field.options.map((o) => o.value);
        if (!validValues.includes(String(value))) {
          errors.push({
            field: field.key,
            message: `${field.label}的值无效`
          });
        }
      }
    }
    return { valid: errors.length === 0, errors };
  },
  /**
   * 解析显隐联动（前端用）
   * 根据 formData 的当前值，计算字段的可见性
   */
  resolveVisibility(formData, fields) {
    return fields.map((field) => {
      if (!field.visibleWhen) return field;
      const targetValue = formData[field.visibleWhen.field];
      const expected = field.visibleWhen.value;
      let visible = false;
      switch (field.visibleWhen.op) {
        case "eq":
          visible = String(targetValue) === String(expected);
          break;
        case "ne":
          visible = String(targetValue) !== String(expected);
          break;
        case "contains":
          visible = String(targetValue || "").includes(String(expected));
          break;
        case "gt":
          visible = Number(targetValue) > Number(expected);
          break;
        case "lt":
          visible = Number(targetValue) < Number(expected);
          break;
      }
      return { ...field, visible };
    });
  }
});
const FUNNEL_UID = "plugin::zhao-logistics.conversion-funnel";
const EVENT_UID = "plugin::zhao-logistics.conversion-event";
const funnelTracker = ({ strapi: strapi2 }) => ({
  /**
   * 记录漏斗事件（同步写入，保证统计实时性）
   */
  async track(siteId, event) {
    const ipAddress = event.ctx?.request?.ip;
    const userAgent = event.ctx?.request?.headers?.["user-agent"];
    let funnelId = event.funnelId;
    if (!funnelId) {
      const funnel2 = await strapi2.db.query(FUNNEL_UID).findOne({
        where: { site: siteId, isActive: true, deletedAt: null }
      });
      funnelId = funnel2?.documentId;
    }
    let step = 1;
    if (funnelId) {
      const funnel2 = await strapi2.db.query(FUNNEL_UID).findOne({
        where: { documentId: funnelId, deletedAt: null }
      });
      if (funnel2?.steps && Array.isArray(funnel2.steps)) {
        const matched = funnel2.steps.find((s) => s.eventName === event.eventName);
        if (matched) step = matched.step;
      }
    }
    await strapi2.db.query(EVENT_UID).create({
      data: {
        site: siteId,
        funnelId: funnelId || null,
        eventName: event.eventName,
        step,
        visitorId: event.visitorId,
        userId: event.userId || null,
        sessionId: event.sessionId || null,
        landingPageId: event.landingPageId || null,
        quoteRequestId: event.quoteRequestId || null,
        utmSource: event.utm?.source || null,
        utmMedium: event.utm?.medium || null,
        utmCampaign: event.utm?.campaign || null,
        lang: event.lang || null,
        ipAddress: ipAddress || null,
        userAgent: userAgent || null,
        occurredAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
  },
  /**
   * 查询漏斗转化率统计
   */
  async getStats(siteId, params) {
    const funnel2 = await strapi2.db.query(FUNNEL_UID).findOne({
      where: { site: siteId, documentId: params.funnelId, deletedAt: null }
    });
    if (!funnel2) throw new Error("漏斗不存在");
    const stepsDef = Array.isArray(funnel2.steps) ? funnel2.steps : [];
    if (stepsDef.length === 0) {
      return { steps: [], totalVisitors: 0, totalConverted: 0 };
    }
    const where = {
      site: siteId,
      funnelId: params.funnelId,
      deletedAt: null
    };
    if (params.dateFrom || params.dateTo) {
      where.occurredAt = {};
      if (params.dateFrom) where.occurredAt.$gte = params.dateFrom;
      if (params.dateTo) where.occurredAt.$lte = params.dateTo;
    }
    if (params.lang) where.lang = params.lang;
    if (params.utmSource) where.utmSource = params.utmSource;
    const allEvents = await strapi2.db.query(EVENT_UID).findMany({
      where,
      orderBy: { occurredAt: "asc" }
    });
    const stepVisitorMap = /* @__PURE__ */ new Map();
    const stepTimesMap = /* @__PURE__ */ new Map();
    for (const ev of allEvents) {
      const step = ev.step;
      if (!stepVisitorMap.has(step)) stepVisitorMap.set(step, /* @__PURE__ */ new Set());
      stepVisitorMap.get(step).add(ev.visitorId);
      if (!stepTimesMap.has(step)) stepTimesMap.set(step, /* @__PURE__ */ new Map());
      const timeMap = stepTimesMap.get(step);
      const ts = new Date(ev.occurredAt).getTime();
      if (!timeMap.has(ev.visitorId) || timeMap.get(ev.visitorId) > ts) {
        timeMap.set(ev.visitorId, ts);
      }
    }
    const totalVisitors = stepVisitorMap.get(1)?.size || 0;
    const totalConverted = stepVisitorMap.get(stepsDef.length)?.size || 0;
    const steps = stepsDef.sort((a, b) => a.step - b.step).map((s, idx) => {
      const count = stepVisitorMap.get(s.step)?.size || 0;
      const prevCount = idx > 0 ? stepVisitorMap.get(stepsDef[idx - 1].step)?.size || 0 : count;
      const conversionRate = prevCount > 0 ? Math.round(count / prevCount * 1e4) / 100 : 0;
      const overallRate = totalVisitors > 0 ? Math.round(count / totalVisitors * 1e4) / 100 : 0;
      let avgTimeFromPrevious = null;
      if (idx > 0) {
        const prevTimes = stepTimesMap.get(stepsDef[idx - 1].step);
        const currTimes = stepTimesMap.get(s.step);
        if (prevTimes && currTimes) {
          const diffs = [];
          for (const [visitor, currTs] of currTimes) {
            const prevTs = prevTimes.get(visitor);
            if (prevTs !== void 0 && currTs > prevTs) {
              diffs.push(currTs - prevTs);
            }
          }
          if (diffs.length > 0) {
            avgTimeFromPrevious = Math.round(diffs.reduce((a, b) => a + b, 0) / diffs.length);
          }
        }
      }
      return {
        step: s.step,
        name: s.name,
        eventName: s.eventName,
        count,
        conversionRate,
        overallRate,
        avgTimeFromPrevious
      };
    });
    return { steps, totalVisitors, totalConverted };
  }
});
const REFERRAL_UID = "plugin::zhao-logistics.referral";
const referralEngine = ({ strapi: strapi2 }) => ({
  /**
   * 生成推荐码（格式：REF + 时间戳后 6 位 + 随机 2 位）
   */
  async generateCode(siteId, referrerInfo) {
    const ts = Date.now().toString().slice(-6);
    const rand = Math.floor(Math.random() * 90 + 10).toString();
    return `REF${ts}${rand}`;
  },
  /**
   * 应用推荐码
   * 1. 校验推荐码有效性（存在 + status != invalid）
   * 2. 创建 referral 记录（referee 信息）
   * 3. 若有 quoteRequestId，关联
   */
  async applyCode(siteId, code, refereeInfo) {
    const existing = await strapi2.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, referralCode: code, deletedAt: null }
    });
    if (!existing) throw new Error("推荐码无效");
    if (existing.status === "invalid") throw new Error("推荐码已失效");
    const referral2 = await strapi2.db.query(REFERRAL_UID).create({
      data: {
        site: siteId,
        referralCode: code,
        referrerName: existing.referrerName,
        referrerContact: existing.referrerContact,
        referrerCustomerId: existing.referrerCustomerId,
        refereeName: refereeInfo.name,
        refereeContact: refereeInfo.contact,
        referralChannel: refereeInfo.channel || "friend",
        referralSource: refereeInfo.source || null,
        status: "pending",
        rewardType: "points",
        rewardStatus: "pending"
      }
    });
    return referral2;
  },
  /**
   * 标记推荐转化
   * 1. 更新 referral.status=converted + conversionValue + convertedAt
   * 2. 若 rewardType=points 且 referrerCustomerId 存在，调 zhao-point 发放积分
   * 3. 更新 referral.rewardStatus=issued + rewardIssuedAt
   */
  async markConverted(siteId, referralId, intentOrderId, conversionValue) {
    const referral2 = await strapi2.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, documentId: referralId, deletedAt: null }
    });
    if (!referral2) throw new Error("推荐记录不存在");
    await strapi2.db.query(REFERRAL_UID).update({
      where: { documentId: referralId },
      data: {
        status: "converted",
        intentOrderId,
        conversionValue,
        convertedAt: (/* @__PURE__ */ new Date()).toISOString()
      }
    });
    if (referral2.rewardType === "points" && referral2.referrerCustomerId) {
      try {
        const userId = Number(referral2.referrerCustomerId);
        const rewardAmount = Number(referral2.rewardAmount) || 100;
        await strapi2.plugin("zhao-point").service("point").earnPoints({
          userId,
          action: "referral_convert",
          source: "zhao-logistics",
          remark: `推荐转化奖励 - 订单 ${intentOrderId}`,
          orderId: intentOrderId
        });
        await strapi2.db.query(REFERRAL_UID).update({
          where: { documentId: referralId },
          data: {
            rewardStatus: "issued",
            rewardIssuedAt: (/* @__PURE__ */ new Date()).toISOString(),
            rewardAmount
          }
        });
        strapi2.log.info(`[referral-engine] 推荐奖励已发放: referral=${referralId}, user=${userId}`);
      } catch (err) {
        strapi2.log.error(`[referral-engine] 积分发放失败: ${err.message}`);
        await strapi2.db.query(REFERRAL_UID).update({
          where: { documentId: referralId },
          data: { remark: `积分发放失败: ${err.message}` }
        });
      }
    }
  },
  /**
   * 验证推荐码有效性（不创建记录）
   */
  async validateCode(siteId, code) {
    const existing = await strapi2.db.query(REFERRAL_UID).findOne({
      where: { site: siteId, referralCode: code, deletedAt: null }
    });
    if (!existing) return { valid: false };
    if (existing.status === "invalid") return { valid: false };
    return { valid: true, referrerName: existing.referrerName };
  },
  /**
   * 查询推荐统计
   */
  async getStats(siteId, params) {
    const where = { site: siteId, deletedAt: null };
    if (params.dateFrom || params.dateTo) {
      where.createdAt = {};
      if (params.dateFrom) where.createdAt.$gte = params.dateFrom;
      if (params.dateTo) where.createdAt.$lte = params.dateTo;
    }
    if (params.referrerCustomerId) where.referrerCustomerId = params.referrerCustomerId;
    const all = await strapi2.db.query(REFERRAL_UID).findMany({ where });
    const byStatus = {};
    let totalConverted = 0;
    let totalRewardAmount = 0;
    for (const r of all) {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1;
      if (r.status === "converted" || r.status === "rewarded") {
        totalConverted++;
        totalRewardAmount += Number(r.rewardAmount) || 0;
      }
    }
    return {
      totalReferrals: all.length,
      byStatus,
      totalConverted,
      totalRewardAmount: Math.round(totalRewardAmount * 100) / 100,
      conversionRate: all.length > 0 ? Math.round(totalConverted / all.length * 1e4) / 100 : 0
    };
  }
});
const PROFILE_UID = "plugin::zhao-logistics.customer-profile";
const QUOTE_REQUEST_UID = "plugin::zhao-logistics.quote-request";
const INTENT_ORDER_UID = "plugin::zhao-logistics.intent-order";
const LEAD_UID = "plugin::zhao-website.lead";
const customerAggregator = ({ strapi: strapi2 }) => ({
  /**
   * 按 phone/email 匹配现有档案，存在则更新，不存在则创建
   */
  async upsert(siteId, info2) {
    let existing = null;
    if (info2.contactPhone) {
      existing = await strapi2.db.query(PROFILE_UID).findOne({
        where: { site: siteId, contactPhone: info2.contactPhone, deletedAt: null }
      });
    }
    if (!existing && info2.contactEmail) {
      existing = await strapi2.db.query(PROFILE_UID).findOne({
        where: { site: siteId, contactEmail: info2.contactEmail, deletedAt: null }
      });
    }
    if (existing) {
      const updateData = {};
      if (info2.name && !existing.name) updateData.name = info2.name;
      if (info2.contactEmail && !existing.contactEmail) updateData.contactEmail = info2.contactEmail;
      if (info2.contactPhone && !existing.contactPhone) updateData.contactPhone = info2.contactPhone;
      if (info2.customerType && !existing.customerType) updateData.customerType = info2.customerType;
      if (Object.keys(updateData).length > 0) {
        return strapi2.db.query(PROFILE_UID).update({
          where: { documentId: existing.documentId },
          data: updateData
        });
      }
      return existing;
    }
    return strapi2.db.query(PROFILE_UID).create({
      data: {
        site: siteId,
        name: info2.name,
        contactPhone: info2.contactPhone || "",
        contactEmail: info2.contactEmail || null,
        customerType: info2.customerType || "individual",
        country: info2.country || "cn",
        lifecycleStage: "lead",
        sourceChannel: info2.sourceChannel || null,
        utmSource: info2.utmSource || null,
        totalQuoteCount: 0,
        totalOrderCount: 0,
        totalOrderValue: 0
      }
    });
  },
  /**
   * 从 lead 创建/更新客户档案，并关联 leadId
   */
  async upsertFromLead(siteId, leadId) {
    const lead = await strapi2.db.query(LEAD_UID).findOne({
      where: { site: siteId, documentId: leadId, deletedAt: null }
    });
    if (!lead) throw new Error("lead 不存在");
    const profile = await this.upsert(siteId, {
      name: lead.contactName || "未知",
      contactPhone: lead.contactPhone,
      contactEmail: lead.contactEmail,
      customerType: "individual",
      country: "cn",
      sourceChannel: lead.sourceType,
      utmSource: lead.utmSource
    });
    const relatedLeadIds = Array.isArray(profile.relatedLeadIds) ? profile.relatedLeadIds : [];
    if (!relatedLeadIds.includes(leadId)) {
      relatedLeadIds.push(leadId);
      await strapi2.db.query(PROFILE_UID).update({
        where: { documentId: profile.documentId },
        data: { relatedLeadIds }
      });
    }
    return profile;
  },
  /**
   * 询价提交时更新档案：累计询价数 + 关联 quoteRequestId
   */
  async upsertFromQuote(siteId, quoteRequestId) {
    const quote2 = await strapi2.db.query(QUOTE_REQUEST_UID).findOne({
      where: { site: siteId, documentId: quoteRequestId, deletedAt: null }
    });
    if (!quote2) throw new Error("询价单不存在");
    let contactPhone = "";
    let contactEmail = "";
    try {
      const contact = typeof quote2.customerContact === "string" ? JSON.parse(quote2.customerContact) : quote2.customerContact;
      if (Array.isArray(contact)) {
        for (const c of contact) {
          if (c.type === "phone") contactPhone = c.value;
          if (c.type === "email") contactEmail = c.value;
        }
      }
    } catch {
    }
    const profile = await this.upsert(siteId, {
      name: quote2.customerName,
      contactPhone,
      contactEmail,
      customerType: quote2.customerType,
      country: "cn",
      sourceChannel: quote2.utmSource,
      utmSource: quote2.utmSource
    });
    const relatedQuoteIds = Array.isArray(profile.relatedQuoteIds) ? profile.relatedQuoteIds : [];
    if (!relatedQuoteIds.includes(quoteRequestId)) {
      relatedQuoteIds.push(quoteRequestId);
    }
    const totalQuoteCount = (profile.totalQuoteCount || 0) + 1;
    const updated = await strapi2.db.query(PROFILE_UID).update({
      where: { documentId: profile.documentId },
      data: {
        relatedQuoteIds,
        totalQuoteCount,
        lastQuoteAt: (/* @__PURE__ */ new Date()).toISOString(),
        lifecycleStage: this._computeStage(totalQuoteCount, profile.totalOrderCount || 0)
      }
    });
    return updated;
  },
  /**
   * 订单成交时更新档案：累计订单数 + 成交额 + 关联 orderId
   */
  async upsertFromOrder(siteId, intentOrderId) {
    const order = await strapi2.db.query(INTENT_ORDER_UID).findOne({
      where: { site: siteId, documentId: intentOrderId, deletedAt: null }
    });
    if (!order) throw new Error("意向订单不存在");
    const profile = await this.upsert(siteId, {
      name: order.customerName,
      contactPhone: this._extractPhone(order.customerContact),
      customerType: order.customerType,
      country: "cn"
    });
    const relatedOrderIds = Array.isArray(profile.relatedOrderIds) ? profile.relatedOrderIds : [];
    if (!relatedOrderIds.includes(intentOrderId)) {
      relatedOrderIds.push(intentOrderId);
    }
    const totalOrderCount = (profile.totalOrderCount || 0) + 1;
    const orderValue = Number(order.confirmedPrice) || 0;
    const totalOrderValue = Number(profile.totalOrderValue || 0) + orderValue;
    const updated = await strapi2.db.query(PROFILE_UID).update({
      where: { documentId: profile.documentId },
      data: {
        relatedOrderIds,
        totalOrderCount,
        totalOrderValue: Math.round(totalOrderValue * 100) / 100,
        lastOrderAt: (/* @__PURE__ */ new Date()).toISOString(),
        lifecycleStage: this._computeStage(profile.totalQuoteCount || 0, totalOrderCount)
      }
    });
    return updated;
  },
  /**
   * 聚合查询客户档案详情（含关联 lead/quote/order 列表）
   */
  async getProfile(siteId, profileId) {
    const profile = await strapi2.db.query(PROFILE_UID).findOne({
      where: { site: siteId, documentId: profileId, deletedAt: null },
      populate: { assignedTo: true }
    });
    if (!profile) throw new Error("客户档案不存在");
    const [leads, quotes, orders] = await Promise.all([
      profile.relatedLeadIds?.length ? strapi2.db.query(LEAD_UID).findMany({
        where: { site: siteId, documentId: { $in: profile.relatedLeadIds }, deletedAt: null }
      }) : [],
      profile.relatedQuoteIds?.length ? strapi2.db.query(QUOTE_REQUEST_UID).findMany({
        where: { site: siteId, documentId: { $in: profile.relatedQuoteIds }, deletedAt: null }
      }) : [],
      profile.relatedOrderIds?.length ? strapi2.db.query(INTENT_ORDER_UID).findMany({
        where: { site: siteId, documentId: { $in: profile.relatedOrderIds }, deletedAt: null }
      }) : []
    ]);
    return { ...profile, leads, quotes, orders };
  },
  /**
   * 合并重复客户档案（把 source 的关联记录转移到 target，软删 source）
   */
  async merge(siteId, sourceId, targetId) {
    const [source, target] = await Promise.all([
      strapi2.db.query(PROFILE_UID).findOne({ where: { site: siteId, documentId: sourceId, deletedAt: null } }),
      strapi2.db.query(PROFILE_UID).findOne({ where: { site: siteId, documentId: targetId, deletedAt: null } })
    ]);
    if (!source) throw new Error("源档案不存在");
    if (!target) throw new Error("目标档案不存在");
    const mergeIds = (a, b) => Array.from(/* @__PURE__ */ new Set([...Array.isArray(a) ? a : [], ...Array.isArray(b) ? b : []]));
    const relatedLeadIds = mergeIds(target.relatedLeadIds, source.relatedLeadIds);
    const relatedQuoteIds = mergeIds(target.relatedQuoteIds, source.relatedQuoteIds);
    const relatedOrderIds = mergeIds(target.relatedOrderIds, source.relatedOrderIds);
    const totalQuoteCount = (target.totalQuoteCount || 0) + (source.totalQuoteCount || 0);
    const totalOrderCount = (target.totalOrderCount || 0) + (source.totalOrderCount || 0);
    const totalOrderValue = Number(target.totalOrderValue || 0) + Number(source.totalOrderValue || 0);
    const updated = await strapi2.db.query(PROFILE_UID).update({
      where: { documentId: targetId },
      data: {
        relatedLeadIds,
        relatedQuoteIds,
        relatedOrderIds,
        totalQuoteCount,
        totalOrderCount,
        totalOrderValue: Math.round(totalOrderValue * 100) / 100,
        lastQuoteAt: this._laterTime(source.lastQuoteAt, target.lastQuoteAt),
        lastOrderAt: this._laterTime(source.lastOrderAt, target.lastOrderAt)
      }
    });
    await strapi2.db.query(PROFILE_UID).update({
      where: { documentId: sourceId },
      data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    return updated;
  },
  _extractPhone(contactStr) {
    try {
      const contact = typeof contactStr === "string" ? JSON.parse(contactStr) : contactStr;
      if (Array.isArray(contact)) {
        const phone = contact.find((c) => c.type === "phone");
        return phone?.value || "";
      }
    } catch {
    }
    return "";
  },
  _computeStage(quoteCount, orderCount) {
    if (orderCount >= 5) return "vip";
    if (orderCount >= 2) return "repeat";
    if (orderCount >= 1) return "active";
    if (quoteCount >= 1) return "active";
    return "lead";
  },
  _laterTime(a, b) {
    if (!a) return b;
    if (!b) return a;
    return new Date(a).getTime() > new Date(b).getTime() ? a : b;
  }
});
const UID$7 = "plugin::zhao-logistics.review";
const review = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, testimonialType, isFeatured, authorCountry, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (testimonialType) filters.testimonialType = testimonialType;
    if (isFeatured !== void 0) filters.isFeatured = isFeatured === "true" || isFeatured === true;
    if (authorCountry) filters.authorCountry = authorCountry;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$7).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { videoPoster: true, images: true }
      }),
      strapi2.db.query(UID$7).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$7).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { videoPoster: true, images: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$7).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$7).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("客户评价不存在或已删除");
    return strapi2.db.query(UID$7).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$7).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("客户评价不存在或已删除");
    return strapi2.db.query(UID$7).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$6 = "plugin::zhao-logistics.subscription";
const subscription = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, subscriberType, channel, isActive, trackingNo, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (subscriberType) filters.subscriberType = subscriberType;
    if (channel) filters.channel = channel;
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    if (trackingNo) filters.trackingNo = trackingNo;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$6).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$6).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$6).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$6).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$6).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("订阅不存在或已删除");
    return strapi2.db.query(UID$6).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$6).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("订阅不存在或已删除");
    return strapi2.db.query(UID$6).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$5 = "plugin::zhao-logistics.landing-page";
const landingPage = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, campaignName, isActive, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (campaignName) filters.campaignName = { $containsi: campaignName };
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$5).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { ogImage: true }
      }),
      strapi2.db.query(UID$5).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { ogImage: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$5).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("落地页不存在或已删除");
    return strapi2.db.query(UID$5).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$5).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("落地页不存在或已删除");
    return strapi2.db.query(UID$5).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$4 = "plugin::zhao-logistics.conversion-funnel";
const conversionFunnel = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, isActive, lang, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (isActive !== void 0) filters.isActive = isActive === "true" || isActive === true;
    if (lang) filters.lang = lang;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$4).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$4).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$4).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$4).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$4).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("转化漏斗不存在或已删除");
    return strapi2.db.query(UID$4).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$4).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("转化漏斗不存在或已删除");
    return strapi2.db.query(UID$4).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$3 = "plugin::zhao-logistics.conversion-event";
const conversionEvent = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, funnel: funnel2, eventName, visitorId, sort = "occurredAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (funnel2) filters.funnel = funnel2;
    if (eventName) filters.eventName = eventName;
    if (visitorId) filters.visitorId = visitorId;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$3).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { funnel: true, user: true }
      }),
      strapi2.db.query(UID$3).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$3).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { funnel: true, user: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID$3).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$3).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("转化事件不存在或已删除");
    return strapi2.db.query(UID$3).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$3).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("转化事件不存在或已删除");
    return strapi2.db.query(UID$3).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$2 = "plugin::zhao-logistics.intent-order";
const intentOrder = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, customerName, assignedTo, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (customerName) filters.customerName = { $containsi: customerName };
    if (assignedTo) filters.assignedTo = assignedTo;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$2).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { assignedTo: true }
      }),
      strapi2.db.query(UID$2).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$2).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { assignedTo: true }
    });
  },
  async createAdmin(siteId, data) {
    if (!data.orderNo) {
      const dateStr = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10).replace(/-/g, "");
      const count = await strapi2.db.query(UID$2).count({ where: { site: siteId } });
      data.orderNo = `IO${dateStr}${String(count + 1).padStart(3, "0")}`;
    }
    return strapi2.db.query(UID$2).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$2).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("意向订单不存在或已删除");
    return strapi2.db.query(UID$2).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$2).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("意向订单不存在或已删除");
    return strapi2.db.query(UID$2).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID$1 = "plugin::zhao-logistics.referral";
const referral = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, status, referralCode, referralChannel, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (status) filters.status = status;
    if (referralCode) filters.referralCode = { $containsi: referralCode };
    if (referralChannel) filters.referralChannel = referralChannel;
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID$1).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" }
      }),
      strapi2.db.query(UID$1).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
  },
  async createAdmin(siteId, data) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, referralCode: data.referralCode, deletedAt: null }
    });
    if (existing) throw new Error(`推荐码 ${data.referralCode} 已存在`);
    return strapi2.db.query(UID$1).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("推荐记录不存在或已删除");
    if (data.referralCode && data.referralCode !== existing.referralCode) {
      const dup = await strapi2.db.query(UID$1).findOne({
        where: { site: siteId, referralCode: data.referralCode, deletedAt: null }
      });
      if (dup) throw new Error(`推荐码 ${data.referralCode} 已存在`);
    }
    return strapi2.db.query(UID$1).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID$1).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("推荐记录不存在或已删除");
    return strapi2.db.query(UID$1).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const UID = "plugin::zhao-logistics.customer-profile";
const customerProfile = ({ strapi: strapi2 }) => ({
  async findAdmin(siteId, query) {
    const { page = 1, pageSize = 10, customerType, lifecycleStage, country, name, sort = "createdAt:desc" } = query;
    const filters = { site: siteId, deletedAt: null };
    if (customerType) filters.customerType = customerType;
    if (lifecycleStage) filters.lifecycleStage = lifecycleStage;
    if (country) filters.country = country;
    if (name) filters.name = { $containsi: name };
    const [sortField, sortOrder] = String(sort).split(":");
    const offset = (Number(page) - 1) * Number(pageSize);
    const limit = Number(pageSize);
    const [rows, total] = await Promise.all([
      strapi2.db.query(UID).findMany({
        where: filters,
        offset,
        limit,
        orderBy: { [sortField]: sortOrder || "desc" },
        populate: { assignedTo: true }
      }),
      strapi2.db.query(UID).count({ where: filters })
    ]);
    return {
      data: rows,
      pagination: { page: Number(page), pageSize: limit, total, pageCount: Math.ceil(total / limit) }
    };
  },
  async findOneAdmin(siteId, documentId) {
    return strapi2.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null },
      populate: { assignedTo: true }
    });
  },
  async createAdmin(siteId, data) {
    return strapi2.db.query(UID).create({ data: { ...data, site: siteId } });
  },
  async updateAdmin(siteId, documentId, data) {
    const existing = await strapi2.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi2.db.query(UID).update({ where: { documentId }, data });
  },
  async deleteAdmin(siteId, documentId) {
    const existing = await strapi2.db.query(UID).findOne({
      where: { site: siteId, documentId, deletedAt: null }
    });
    if (!existing) throw new Error("客户档案不存在或已删除");
    return strapi2.db.query(UID).update({
      where: { documentId },
      data: { deletedAt: /* @__PURE__ */ new Date() }
    });
  }
});
const services = {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "quote-engine": quoteEngine,
  "tracking-aggregator": trackingAggregator,
  "dynamic-form": dynamicForm,
  "funnel-tracker": funnelTracker,
  "referral-engine": referralEngine,
  "customer-aggregator": customerAggregator,
  "review": review,
  "subscription": subscription,
  "landing-page": landingPage,
  "conversion-funnel": conversionFunnel,
  "conversion-event": conversionEvent,
  "intent-order": intentOrder,
  "referral": referral,
  "customer-profile": customerProfile
};
const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes
};
exports.default = index;
