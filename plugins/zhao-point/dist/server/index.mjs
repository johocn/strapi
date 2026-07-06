import crypto from "crypto";
const config = {
  default: {
    // 增加积分规则 (category: increase)
    increaseRules: {
      // 每日签到类 (taskGroup: daily)
      daily_sign_in: { points: 5, limitPerDay: 1, isOneTime: false, description: "每日签到", taskGroup: "daily", extraConfig: {} },
      daily_sign_in_streak: { points: 10, limitPerDay: 1, isOneTime: false, description: "连续签到奖励", taskGroup: "daily", extraConfig: { streakMilestones: [7, 14, 30], streakBonusPoints: [50, 100, 200] } },
      daily_first_login: { points: 2, limitPerDay: 1, isOneTime: false, description: "每日首次登录", taskGroup: "daily", extraConfig: {} },
      online_duration: { points: 1, limitPerDay: 0, isOneTime: false, description: "在线时长(每10分钟)", taskGroup: "daily", extraConfig: {} },
      // 内容互动类 (taskGroup: interact)
      browse_article: { points: 3, limitPerDay: 10, isOneTime: false, description: "浏览文章", taskGroup: "interact", extraConfig: {} },
      like_article: { points: 1, limitPerDay: 20, isOneTime: false, description: "文章点赞", taskGroup: "interact", extraConfig: {} },
      comment_article: { points: 2, limitPerDay: 10, isOneTime: false, description: "文章评论", taskGroup: "interact", extraConfig: {} },
      share_article: { points: 3, limitPerDay: 5, isOneTime: false, description: "文章分享", taskGroup: "interact", extraConfig: {} },
      watch_video: { points: 5, limitPerDay: 10, isOneTime: false, description: "观看视频", taskGroup: "interact", extraConfig: {} },
      like_video: { points: 1, limitPerDay: 20, isOneTime: false, description: "视频点赞", taskGroup: "interact", extraConfig: {} },
      comment_video: { points: 2, limitPerDay: 10, isOneTime: false, description: "视频评论", taskGroup: "interact", extraConfig: {} },
      share_video: { points: 3, limitPerDay: 5, isOneTime: false, description: "视频分享", taskGroup: "interact", extraConfig: {} },
      // 广告类 (taskGroup: interact)
      click_ad: { points: 1, limitPerDay: 20, isOneTime: false, description: "点击广告", taskGroup: "interact", extraConfig: {} },
      watch_ad: { points: 3, limitPerDay: 10, isOneTime: false, description: "观看完整广告视频", taskGroup: "interact", extraConfig: {} },
      // 学习类 (taskGroup: learn)
      complete_lesson: { points: 10, limitPerDay: 0, isOneTime: false, description: "完成单个课时", taskGroup: "learn", extraConfig: {} },
      complete_course: { points: 50, limitPerDay: 0, isOneTime: false, description: "完成课程学习", taskGroup: "learn", extraConfig: {} },
      review_course: { points: 5, limitPerDay: 5, isOneTime: false, description: "课程评价", taskGroup: "learn", extraConfig: {} },
      complete_quiz: { points: 10, limitPerDay: 0, isOneTime: false, description: "完成答题", taskGroup: "learn", extraConfig: {} },
      quiz_perfect: { points: 20, limitPerDay: 0, isOneTime: false, description: "答题满分", taskGroup: "learn", extraConfig: {} },
      quiz_pass: { points: 0, limitPerDay: 0, isOneTime: false, description: "答题通过(动态积分)", taskGroup: "learn", extraConfig: {} },
      // 社交类 (taskGroup: social)
      invite_register: { points: 100, limitPerDay: 0, isOneTime: false, description: "邀请好友注册", taskGroup: "social", extraConfig: {} },
      invite_purchase: { points: 200, limitPerDay: 0, isOneTime: false, description: "邀请好友消费", taskGroup: "social", extraConfig: {} },
      follow_official_account: { points: 10, limitPerDay: 0, isOneTime: true, description: "关注公众号", taskGroup: "social", extraConfig: {} },
      join_community: { points: 20, limitPerDay: 0, isOneTime: true, description: "加入社群", taskGroup: "social", extraConfig: {} },
      // 用户类 (taskGroup: onetime)
      new_user_reward: { points: 100, limitPerDay: 0, isOneTime: true, description: "新用户注册奖励", taskGroup: "onetime", extraConfig: {} },
      complete_profile: { points: 20, limitPerDay: 0, isOneTime: true, description: "完善个人资料", taskGroup: "onetime", extraConfig: {} },
      bind_phone: { points: 10, limitPerDay: 0, isOneTime: true, description: "绑定手机号", taskGroup: "onetime", extraConfig: {} },
      bind_wechat: { points: 10, limitPerDay: 0, isOneTime: true, description: "绑定微信", taskGroup: "onetime", extraConfig: {} },
      birthday_reward: { points: 50, limitPerDay: 0, isOneTime: true, description: "生日奖励", taskGroup: "onetime", extraConfig: {} },
      // 其他 (taskGroup: other)
      submit_feedback: { points: 5, limitPerDay: 3, isOneTime: false, description: "提交反馈建议", taskGroup: "other", extraConfig: {} },
      report_violation: { points: 2, limitPerDay: 5, isOneTime: false, description: "举报违规", taskGroup: "other", extraConfig: {} },
      purchase_course: { points: 0, limitPerDay: 0, isOneTime: false, description: "购买课程(按金额比例)", taskGroup: "other", extraConfig: {} },
      browse_page: { points: 2, limitPerDay: 5, isOneTime: false, description: "浏览特定页面", taskGroup: "other", extraConfig: {} },
      task_complete: { points: 10, limitPerDay: 0, isOneTime: false, description: "完成任务", taskGroup: "other", extraConfig: {} },
      qr_scan_verify: { points: 5, limitPerDay: 3, isOneTime: false, description: "扫码核销奖励", taskGroup: "other", extraConfig: {} }
    },
    // 扣除积分规则 (category: decrease)
    decreaseRules: {
      redeem_gift: { points: 0, description: "兑换礼品", taskGroup: "redeem", extraConfig: {} },
      redeem_coupon: { points: 0, description: "兑换优惠券", taskGroup: "redeem", extraConfig: {} },
      exchange_course: { points: 0, description: "兑换课程", taskGroup: "redeem", extraConfig: {} },
      exchange_membership: { points: 0, description: "兑换会员", taskGroup: "redeem", extraConfig: {} },
      lottery_cost: { points: 0, description: "抽奖消耗", taskGroup: "redeem", extraConfig: {} },
      unlock_content: { points: 0, description: "解锁付费内容", taskGroup: "redeem", extraConfig: {} },
      cancel_order_penalty: { points: 10, description: "取消订单罚款", taskGroup: "penalty", extraConfig: {} },
      violation_penalty: { points: 50, description: "违规扣分", taskGroup: "penalty", extraConfig: {} },
      refund_deduct: { points: 0, description: "退款扣回", taskGroup: "penalty", extraConfig: {} },
      expiration_deduct: { points: 0, description: "过期扣除", taskGroup: "penalty", extraConfig: {} }
    },
    defaultOperator: "system"
  }
};
const kind$9 = "collectionType";
const collectionName$9 = "zhao_point_records";
const info$9 = { "singularName": "point-record", "pluralName": "point-records", "displayName": "积分记录", "description": "用户积分变动记录" };
const options$9 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$9 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$9 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true }, "action": { "type": "string", "required": true }, "type": { "type": "enumeration", "enum": ["increase", "decrease"], "required": true }, "points": { "type": "integer", "required": true }, "balance": { "type": "integer", "required": true }, "source": { "type": "string", "maxLength": 64 }, "method": { "type": "string", "maxLength": 100 }, "orderId": { "type": "string", "maxLength": 64 }, "remark": { "type": "text" }, "operator": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "expiresAt": { "type": "datetime" }, "expiredAt": { "type": "datetime" }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "userChannel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" } };
const pointRecord = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  pluginOptions: pluginOptions$9,
  attributes: attributes$9
};
const kind$8 = "collectionType";
const collectionName$8 = "zhao_point_rules";
const info$8 = { "singularName": "point-rule", "pluralName": "point-rules", "displayName": "积分规则", "description": "积分获取/扣除规则配置" };
const options$8 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$8 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$8 = { "action": { "type": "string", "required": true, "unique": true }, "category": { "type": "enumeration", "enum": ["increase", "decrease"], "required": true }, "points": { "type": "integer", "required": true }, "description": { "type": "string", "maxLength": 200 }, "enabled": { "type": "boolean", "default": true }, "limitPerDay": { "type": "integer", "default": 0 }, "limitPerUser": { "type": "integer", "default": 0 }, "limitPerDayPerUser": { "type": "integer", "default": 0 }, "isOneTime": { "type": "boolean", "default": false }, "startTime": { "type": "time" }, "endTime": { "type": "time" }, "applicableChannels": { "type": "json" }, "priority": { "type": "integer", "default": 0 }, "taskGroup": { "type": "enumeration", "enum": ["daily", "interact", "learn", "social", "onetime", "other", "redeem", "penalty"], "default": "other" }, "extraConfig": { "type": "json" }, "deletedAt": { "type": "datetime", "default": null } };
const pointRule = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  pluginOptions: pluginOptions$8,
  attributes: attributes$8
};
const kind$7 = "collectionType";
const collectionName$7 = "zhao_point_redemptions";
const info$7 = { "singularName": "point-redemption", "pluralName": "point-redemptions", "displayName": "积分兑换", "description": "用户积分兑换礼品记录" };
const options$7 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$7 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$7 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true }, "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.point-product" }, "itemName": { "type": "string", "maxLength": 100, "required": true }, "pointsCost": { "type": "integer", "required": true }, "quantity": { "type": "integer", "default": 1 }, "totalCost": { "type": "integer", "required": true }, "status": { "type": "enumeration", "enum": ["pending", "approved", "rejected", "shipped", "completed", "cancelled"], "default": "pending" }, "deliveryType": { "type": "enumeration", "enum": ["self_pickup", "express"] }, "pickupCode": { "type": "string", "maxLength": 20 }, "pickupLocation": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-point.pickup-location" }, "salesMode": { "type": "enumeration", "enum": ["points_only", "purchase_only", "hybrid"] }, "priceAmount": { "type": "decimal", "precision": 10, "scale": 2 }, "pointsAmount": { "type": "integer" }, "expressCompany": { "type": "string", "maxLength": 50 }, "trackingNumber": { "type": "string", "maxLength": 100 }, "receiverName": { "type": "string", "maxLength": 50 }, "receiverPhone": { "type": "string", "maxLength": 20 }, "receiverAddress": { "type": "text" }, "remark": { "type": "text" }, "operator": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "completedAt": { "type": "datetime" }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "deductionDetail": { "type": "json" }, "deletedAt": { "type": "datetime", "default": null } };
const pointRedemption = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  pluginOptions: pluginOptions$7,
  attributes: attributes$7
};
const kind$6 = "collectionType";
const collectionName$6 = "zhao_point_products";
const info$6 = { "singularName": "point-product", "pluralName": "point-products", "displayName": "积分商品", "description": "积分商城商品" };
const options$6 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$6 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$6 = { "name": { "type": "string", "maxLength": 100, "required": true }, "subtitle": { "type": "string", "maxLength": 200 }, "description": { "type": "text" }, "detail": { "type": "richtext" }, "category": { "type": "string", "maxLength": 50 }, "coverImage": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "images": { "type": "media", "multiple": true, "required": false, "allowedTypes": ["images"] }, "video": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["videos"] }, "pointsCost": { "type": "integer", "required": true }, "originalPrice": { "type": "decimal", "precision": 10, "scale": 2 }, "stock": { "type": "integer", "default": 0 }, "totalStock": { "type": "integer", "default": 0 }, "deliveryType": { "type": "enumeration", "enum": ["self_pickup", "express", "both"], "required": true }, "salesMode": { "type": "enumeration", "enum": ["points_only", "purchase_only", "hybrid"], "default": "points_only" }, "price": { "type": "decimal", "precision": 10, "scale": 2 }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "allowCrossChannel": { "type": "boolean", "default": false }, "allowGlobalPoints": { "type": "boolean", "default": true }, "status": { "type": "enumeration", "enum": ["on_shelf", "off_shelf"], "default": "on_shelf" }, "maxPerUser": { "type": "integer", "default": 0 }, "sortOrder": { "type": "integer", "default": 0 }, "deletedAt": { "type": "datetime", "default": null } };
const pointProduct = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  pluginOptions: pluginOptions$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_point_configs";
const info$5 = { "singularName": "point-config", "pluralName": "point-configs", "displayName": "积分配置", "description": "积分模块全局配置" };
const options$5 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$5 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$5 = { "moduleEnabled": { "type": "boolean", "default": true }, "earnEnabled": { "type": "boolean", "default": true }, "redeemEnabled": { "type": "boolean", "default": true }, "expiryEnabled": { "type": "boolean", "default": false }, "expiryDays": { "type": "integer", "default": 365 }, "expiryReminderDays": { "type": "integer", "default": 7 }, "minRedeemPoints": { "type": "integer", "default": 0 }, "maxDailyEarn": { "type": "integer", "default": 0 }, "defaultExchangeRate": { "type": "decimal", "precision": 10, "scale": 2, "default": 1 }, "remark": { "type": "text" }, "signInEnabled": { "type": "boolean", "default": true }, "tasksEnabled": { "type": "boolean", "default": true }, "quizRetryEnabled": { "type": "boolean", "default": true }, "quizMaxRetryCount": { "type": "integer", "default": 1 }, "maxDailyQuiz": { "type": "integer", "default": 3 }, "tencentMapKey": { "type": "string" } };
const pointConfig = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  pluginOptions: pluginOptions$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "zhao_channel_verifications";
const info$4 = { "singularName": "channel-verification", "pluralName": "channel-verifications", "displayName": "渠道核销", "description": "渠道核销审计日志" };
const options$4 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$4 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$4 = { "verifier": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true }, "verifiedUser": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel", "required": true }, "direction": { "type": "enumeration", "enum": ["superior_to_subordinate", "subordinate_to_superior"], "required": true }, "method": { "type": "enumeration", "enum": ["qr_scan", "manual"], "required": true }, "status": { "type": "enumeration", "enum": ["pending", "approved", "rejected"], "default": "pending" }, "qrCodeToken": { "type": "string", "maxLength": 64, "unique": true }, "qrCodeExpiresAt": { "type": "datetime" }, "location": { "type": "json" }, "remark": { "type": "text" }, "verifiedAt": { "type": "datetime" } };
const channelVerification = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  pluginOptions: pluginOptions$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_rule_templates";
const info$3 = { "singularName": "rule-template", "pluralName": "rule-templates", "displayName": "规则模板", "description": "积分规则模板" };
const options$3 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$3 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$3 = { "name": { "type": "string", "maxLength": 100, "required": true }, "description": { "type": "text" }, "category": { "type": "enumeration", "enum": ["increase", "decrease"], "required": true }, "defaultPoints": { "type": "integer", "default": 0 }, "defaultLimitPerDay": { "type": "integer", "default": 0 }, "defaultIsOneTime": { "type": "boolean", "default": false }, "configSchema": { "type": "json", "required": true }, "builtIn": { "type": "boolean", "default": false }, "enabled": { "type": "boolean", "default": true } };
const ruleTemplate = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_point_types";
const info$2 = { "singularName": "point-type", "pluralName": "point-types", "displayName": "积分类型", "description": "积分分类管理" };
const options$2 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "name": { "type": "string", "required": true }, "code": { "type": "string", "required": true, "unique": true }, "description": { "type": "string", "maxLength": 500 }, "enabled": { "type": "boolean", "default": true }, "canExpire": { "type": "boolean", "default": false }, "expireDays": { "type": "integer", "default": 365 }, "deletedAt": { "type": "datetime", "default": null } };
const pointType = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_point_sign_in_records";
const info$1 = { "singularName": "sign-in-record", "pluralName": "sign-in-records", "displayName": "签到记录", "description": "用户签到记录" };
const options$1 = { "draftAndPublish": false, "comment": "" };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user", "required": true }, "signInDate": { "type": "date", "required": true }, "streakDays": { "type": "integer", "default": 1 }, "pointsEarned": { "type": "integer", "default": 0 }, "isStreakReward": { "type": "boolean", "default": false } };
const signInRecord = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_pickup_locations";
const info = { "singularName": "pickup-location", "pluralName": "pickup-locations", "displayName": "自提点", "description": "商品自提点信息" };
const options = { "draftAndPublish": false, "comment": "" };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "name": { "type": "string", "maxLength": 100, "required": true }, "address": { "type": "text" }, "latitude": { "type": "decimal", "precision": 10, "scale": 7 }, "longitude": { "type": "decimal", "precision": 10, "scale": 7 }, "phone": { "type": "string", "maxLength": 20 }, "businessHours": { "type": "string", "maxLength": 200 }, "businessLicense": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "coverImage": { "type": "media", "multiple": false, "required": false, "allowedTypes": ["images"] }, "description": { "type": "text" }, "status": { "type": "enumeration", "enum": ["active", "inactive"], "default": "active" }, "sortOrder": { "type": "integer", "default": 0 }, "channels": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-channel.channel" }, "deletedAt": { "type": "datetime", "default": null } };
const pickupLocation = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "point-record": { schema: pointRecord },
  "point-rule": { schema: pointRule },
  "point-redemption": { schema: pointRedemption },
  "point-product": { schema: pointProduct },
  "point-config": { schema: pointConfig },
  "channel-verification": { schema: channelVerification },
  "rule-template": { schema: ruleTemplate },
  "point-type": { schema: pointType },
  "sign-in-record": { schema: signInRecord },
  "pickup-location": { schema: pickupLocation }
};
const wrap = (data, meta = {}) => ({ data, meta });
const wrapList = (result) => {
  if (result && typeof result === "object" && !Array.isArray(result) && "results" in result) {
    return { data: result.results, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "list" in result) {
    return { data: result.list, meta: { pagination: result.pagination || {} } };
  }
  if (result && typeof result === "object" && !Array.isArray(result) && "data" in result && "pagination" in result) {
    return { data: result.data, meta: { pagination: result.pagination } };
  }
  if (Array.isArray(result)) {
    return { data: result, meta: {} };
  }
  return { data: result, meta: {} };
};
const point$1 = ({ strapi }) => {
  const getUserId = (ctx) => ctx.state.user.id || ctx.state.user.documentId;
  return {
    async earn(ctx) {
      try {
        const userId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { action, source, method, remark, orderId, channelId } = body;
        const record = await strapi.plugin("zhao-point").service("point").earnPoints({
          userId,
          action,
          source,
          method,
          remark,
          orderId,
          channelId
        });
        ctx.body = wrap(record);
      } catch (e) {
        const status = e.code === "POINT_001" || e.code === "POINT_004" || e.code === "POINT_011" || e.code === "POINT_019" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async deduct(ctx) {
      try {
        const userId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { action, points, source, method, remark, orderId } = body;
        const record = await strapi.plugin("zhao-point").service("point").deductPoints({
          userId,
          action,
          points,
          source,
          method,
          remark,
          orderId
        });
        ctx.body = wrap(record);
      } catch (e) {
        const status = e.code === "POINT_002" || e.code === "POINT_010" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async balance(ctx) {
      try {
        const userId = getUserId(ctx);
        const result = await strapi.plugin("zhao-point").service("point").getBalance(userId);
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async records(ctx) {
      try {
        const userId = getUserId(ctx);
        const { page, pageSize, action, type, startDate, endDate } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("point").getRecords(userId, {
          page: page ? parseInt(page) : void 0,
          pageSize: pageSize ? parseInt(pageSize) : void 0,
          action,
          type,
          startDate,
          endDate
        });
        ctx.body = wrapList(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async statistics(ctx) {
      try {
        const userId = getUserId(ctx);
        const result = await strapi.plugin("zhao-point").service("point").getStatistics(userId);
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async redeem(ctx) {
      try {
        const userId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { productId, itemName, pointsCost, quantity, deliveryType, pickupLocationId, receiverName, receiverPhone, receiverAddress, remark, useGlobalPoints, selectedChannels } = body;
        const result = await strapi.plugin("zhao-point").service("redemption").createRedemption({
          userId,
          productId,
          itemName,
          pointsCost,
          quantity,
          deliveryType,
          pickupLocationId,
          receiverName,
          receiverPhone,
          receiverAddress,
          remark,
          useGlobalPoints,
          selectedChannels
        });
        ctx.body = wrap(result);
      } catch (e) {
        const status = e.code === "POINT_005" || e.code === "POINT_013" || e.code === "POINT_014" || e.code === "POINT_015" || e.code === "POINT_021" || e.code === "POINT_022" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async redeemRecords(ctx) {
      try {
        const userId = getUserId(ctx);
        const { status, page, pageSize } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("redemption").getUserRedemptions(userId, {
          status,
          page: page ? parseInt(page) : void 0,
          pageSize: pageSize ? parseInt(pageSize) : void 0
        });
        ctx.body = wrapList(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async verifyPickup(ctx) {
      try {
        const operatorId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { pickupCode } = body;
        const result = await strapi.plugin("zhao-point").service("redemption").verifyRedemption(pickupCode, operatorId);
        ctx.body = wrap(result);
      } catch (e) {
        const status = e.code === "POINT_020" || e.code === "POINT_023" || e.code === "POINT_025" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async rules(ctx) {
      try {
        const { action, category } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("point").getRules({ action, category });
        ctx.body = wrapList(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async listProducts(ctx) {
      try {
        const userId = ctx.state.user?.id;
        const siteId = ctx.state?.siteId;
        const { status, deliveryType, page, pageSize } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("redemption").getProducts({
          status: status || "on_shelf",
          deliveryType,
          page: page ? parseInt(page) : 1,
          pageSize: pageSize ? parseInt(pageSize) : 20,
          userId,
          siteId
        });
        ctx.body = wrapList(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getProduct(ctx) {
      try {
        const { id } = ctx.params;
        const userId = ctx.state.user?.id;
        const product = await strapi.plugin("zhao-point").service("redemption").getProduct(id, userId);
        if (!product) {
          ctx.status = 404;
          ctx.body = { error: "商品不存在" };
          return;
        }
        ctx.body = wrap(product);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async listPickupLocations(ctx) {
      try {
        const { channelId, status, page, pageSize } = ctx.query;
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const where = { deletedAt: null };
        if (status) where.status = status;
        else where.status = "active";
        if (channelId) {
          const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
            where: {
              $or: [
                { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
                { documentId: String(channelId) }
              ]
            },
            select: ["id"]
          });
          if (ch) where.channels = { id: ch.id };
          else where.channels = { id: -1 };
        }
        const [records, total] = await Promise.all([
          strapi.db.query(LOCATION_UID).findMany({
            where,
            orderBy: { sortOrder: "asc" },
            offset: ((page ? parseInt(page) : 1) - 1) * (pageSize ? parseInt(pageSize) : 50),
            limit: pageSize ? parseInt(pageSize) : 50,
            populate: { coverImage: true, businessLicense: true }
          }),
          strapi.db.query(LOCATION_UID).count({ where })
        ]);
        ctx.body = wrapList({ records, total, page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 50 });
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getPickupLocation(ctx) {
      try {
        const { id } = ctx.params;
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const where = { deletedAt: null };
        if (typeof id === "string" && isNaN(Number(id))) {
          where.documentId = id;
        } else {
          where.id = id;
        }
        const location = await strapi.db.query(LOCATION_UID).findOne({
          where,
          populate: { coverImage: true, businessLicense: true, channels: { select: ["id", "documentId", "name"] } }
        });
        if (!location) {
          ctx.status = 404;
          ctx.body = { error: "自提点不存在" };
          return;
        }
        ctx.body = wrap(location);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async generateQRCode(ctx) {
      try {
        const userId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { channelId, direction } = body;
        const result = await strapi.plugin("zhao-point").service("verification").generateQRCode({
          verifierId: userId,
          channelId,
          direction
        });
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async verifyByQRCode(ctx) {
      try {
        const userId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { token, location } = body;
        const result = await strapi.plugin("zhao-point").service("verification").verifyByQRCode({
          token,
          verifiedUserId: userId,
          location
        });
        ctx.body = wrap(result);
      } catch (e) {
        const status = e.code === "POINT_017" || e.code === "POINT_018" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async manualVerify(ctx) {
      try {
        const verifierId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { verifiedUserId, channelId, direction, remark } = body;
        const result = await strapi.plugin("zhao-point").service("verification").manualVerify({
          verifierId,
          verifiedUserId,
          channelId,
          direction,
          remark
        });
        ctx.body = wrap(result);
      } catch (e) {
        const status = e.code === "POINT_018" ? 400 : 500;
        ctx.status = status;
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async getMyVerifications(ctx) {
      try {
        const userId = getUserId(ctx);
        const { direction, status, page, pageSize } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("verification").getVerificationLog({
          verifierId: userId,
          direction,
          status,
          page: page ? parseInt(page) : void 0,
          pageSize: pageSize ? parseInt(pageSize) : void 0
        });
        ctx.body = wrapList(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getEligibleActions(ctx) {
      try {
        const userId = getUserId(ctx);
        const { channelId } = ctx.query;
        const result = await strapi.plugin("zhao-point").service("rule-engine").getEligibleActions(
          userId,
          channelId
        );
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getExchangeRate(ctx) {
      try {
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        const config2 = await configService2.getConfig();
        ctx.body = wrap({ rate: config2.defaultExchangeRate || 1 });
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getFeatureFlags(ctx) {
      try {
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        const config2 = await configService2.getConfig();
        ctx.body = wrap({
          signInEnabled: config2?.signInEnabled !== false,
          tasksEnabled: config2?.tasksEnabled !== false,
          redemptionEnabled: config2?.redeemEnabled !== false,
          moduleEnabled: config2?.moduleEnabled !== false,
          quizRetryEnabled: config2?.quizRetryEnabled !== false,
          quizMaxRetryCount: config2?.quizMaxRetryCount ?? 1,
          maxDailyQuiz: config2?.maxDailyQuiz ?? 3
        });
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async signIn(ctx) {
      try {
        const userId = getUserId(ctx);
        const result = await strapi.plugin("zhao-point").service("sign-in").signIn(userId);
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || (e.code === "SIGN_001" ? 400 : 500);
        ctx.body = { error: e.message, code: e.code };
      }
    },
    async getSignInStatus(ctx) {
      try {
        const userId = getUserId(ctx);
        const result = await strapi.plugin("zhao-point").service("sign-in").getSignInStatus(userId);
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    },
    async getTasks(ctx) {
      try {
        const userId = getUserId(ctx);
        const result = await strapi.plugin("zhao-point").service("point").getTasks(userId);
        ctx.body = wrap(result);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
      }
    }
  };
};
const pointAdmin = ({ strapi }) => {
  const getUserId = (ctx) => ctx.state.user.id || ctx.state.user.documentId;
  const scopeSvc = () => strapi.plugin("zhao-auth")?.service("channel-scope");
  const getScope = (ctx) => ctx.state?.channelScope;
  const channelFilter = (ctx, field) => {
    return scopeSvc()?.buildChannelFilter?.(getScope(ctx), field) ?? null;
  };
  const assertInScope = (ctx, record, field) => {
    scopeSvc()?.assertRecordInScope?.(getScope(ctx), record, field);
  };
  const assertUserInScope = async (ctx, userId) => {
    const scope = getScope(ctx);
    if (!scope || scope.all) return;
    const channelPermService = strapi.plugin("zhao-channel")?.service("channel-permission");
    if (!channelPermService?.getUserAllChannels) return;
    const userChannelIds = await channelPermService.getUserAllChannels(userId);
    const allowed = Array.isArray(scope.channelIds) ? scope.channelIds : [];
    const hasIntersection = Array.isArray(userChannelIds) && userChannelIds.some((id) => allowed.includes(id));
    if (!hasIntersection) {
      const e = new Error("无权操作该用户的积分");
      e.status = 403;
      throw e;
    }
  };
  const assertChannelDocIdInScope = async (ctx, channelDocumentId) => {
    await scopeSvc()?.assertChannelDocIdInScope?.(getScope(ctx), channelDocumentId);
  };
  return {
    // ===== 积分类型 CRUD =====
    async findTypes(ctx) {
      try {
        const { enabled } = ctx.query;
        const filters = {};
        if (enabled !== void 0) filters.enabled = enabled === "true";
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        ctx.body = await configService2.findTypes(filters);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async findOneType(ctx) {
      try {
        const { documentId } = ctx.params;
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        const type = await configService2.findOneType(documentId);
        if (!type) {
          ctx.status = 404;
          ctx.body = { error: "积分类型不存在" };
          return;
        }
        ctx.body = type;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async createType(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        ctx.body = await configService2.createType(body);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async updateType(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        ctx.body = await configService2.updateType(documentId, body);
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async deleteType(ctx) {
      try {
        const { documentId } = ctx.params;
        const configService2 = strapi.plugin("zhao-point").service("config-service");
        await configService2.deleteType(documentId);
        ctx.body = { success: true };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 积分规则 CRUD =====
    // GET /point-rules
    async findRules(ctx) {
      try {
        const { action, category, enabled } = ctx.query;
        const rules = await strapi.plugin("zhao-point").service("point").getRules({
          action,
          category,
          enabled: enabled !== void 0 ? enabled === "true" : void 0
        });
        ctx.body = rules;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /point-rules/:documentId
    async findOneRule(ctx) {
      try {
        const { documentId } = ctx.params;
        const rule = await strapi.db.query("plugin::zhao-point.point-rule").findOne({
          where: { documentId }
        });
        if (!rule) {
          ctx.status = 404;
          ctx.body = { error: "规则不存在" };
          return;
        }
        ctx.body = rule;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /point-rules
    async createRule(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const rule = await strapi.plugin("zhao-point").service("point").upsertRule(body);
        ctx.body = rule;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // PUT /point-rules/:documentId
    async updateRule(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const existing = await strapi.db.query("plugin::zhao-point.point-rule").findOne({
          where: { documentId }
        });
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "规则不存在" };
          return;
        }
        const rule = await strapi.plugin("zhao-point").service("point").upsertRule({
          action: existing.action,
          ...body
        });
        ctx.body = rule;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // DELETE /point-rules/:documentId
    async deleteRule(ctx) {
      try {
        const { documentId } = ctx.params;
        await strapi.plugin("zhao-point").service("point").deleteRule(documentId);
        ctx.body = { success: true };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /point-rules/batch-enable
    async batchEnableRules(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const { actions, enabled } = body;
        const result = await strapi.plugin("zhao-point").service("rule-engine").batchEnableActions(actions, enabled);
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 规则模板 CRUD =====
    // GET /rule-templates
    async findTemplates(ctx) {
      try {
        const { category, enabled } = ctx.query;
        const templates = await strapi.plugin("zhao-point").service("rule-engine").getTemplates({
          category,
          enabled: enabled !== void 0 ? enabled === "true" : void 0
        });
        ctx.body = templates;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /rule-templates
    async createTemplate(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const template = await strapi.plugin("zhao-point").service("rule-engine").createTemplate(body);
        ctx.body = template;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // PUT /rule-templates/:documentId
    async updateTemplate(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const template = await strapi.plugin("zhao-point").service("rule-engine").updateTemplate(documentId, body);
        ctx.body = template;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // DELETE /rule-templates/:documentId
    async deleteTemplate(ctx) {
      try {
        const { documentId } = ctx.params;
        await strapi.plugin("zhao-point").service("rule-engine").deleteTemplate(documentId);
        ctx.body = { success: true };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /rule-templates/:documentId/apply
    async applyTemplate(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const { targetAction } = body;
        const rule = await strapi.plugin("zhao-point").service("rule-engine").applyTemplate(documentId, targetAction);
        ctx.body = rule;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 积分记录管理 =====
    // GET /point-records
    async findRecords(ctx) {
      try {
        const { page = "1", pageSize = "20", userId, action, type, startDate, endDate } = ctx.query;
        const extraWhere = {};
        const cf = channelFilter(ctx, "channel");
        if (cf) Object.assign(extraWhere, cf);
        const result = await strapi.plugin("zhao-point").service("point").listRecords({
          userId,
          action,
          type,
          startDate,
          endDate,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          extraWhere
        });
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /point-records/:documentId
    async findOneRecord(ctx) {
      try {
        const { documentId } = ctx.params;
        const record = await strapi.plugin("zhao-point").service("point").findRecordByDocumentId(documentId);
        if (!record) {
          ctx.status = 404;
          ctx.body = { error: "记录不存在" };
          return;
        }
        if (record.channel != null) {
          const normalized = typeof record.channel === "number" ? { id: record.channel } : record.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        ctx.body = record;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /point-records/admin-adjust
    async adminAdjust(ctx) {
      try {
        const operatorId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { userId, points, action, remark } = body;
        if (userId) {
          await assertUserInScope(ctx, userId);
        }
        const record = await strapi.plugin("zhao-point").service("point").adminAdjust({
          userId,
          points,
          action,
          remark,
          operatorId
        });
        ctx.body = record;
      } catch (e) {
        ctx.status = e.code === "POINT_002" ? 400 : e.status || 500;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /point-records/batch-adjust
    async batchAdjust(ctx) {
      try {
        const operatorId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { adjustments } = body;
        if (!Array.isArray(adjustments)) {
          ctx.status = 400;
          ctx.body = { error: "adjustments 必须为数组" };
          return;
        }
        if (adjustments.length > 100) {
          ctx.status = 400;
          ctx.body = { error: "单次批量不能超过 100 条" };
          return;
        }
        for (const adj of adjustments) {
          if (adj.userId) {
            await assertUserInScope(ctx, adj.userId);
          }
        }
        const result = await strapi.plugin("zhao-point").service("point").batchAdjust(adjustments, operatorId);
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /point-records/statistics
    async getRecordStats(ctx) {
      try {
        const { userId } = ctx.query;
        if (userId) {
          const stats = await strapi.plugin("zhao-point").service("point").getStatistics(userId);
          ctx.body = stats;
        } else {
          ctx.body = { message: "请指定用户ID" };
        }
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 兑换审核 =====
    // GET /point-redemptions
    async findRedemptions(ctx) {
      try {
        const { page = "1", pageSize = "20", status, userId, deliveryType, startDate, endDate } = ctx.query;
        const extraWhere = {};
        const cf = channelFilter(ctx, "channel");
        if (cf) Object.assign(extraWhere, cf);
        const result = await strapi.plugin("zhao-point").service("redemption").getRedemptions({
          status,
          userId,
          deliveryType,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          startDate,
          endDate,
          extraWhere
        });
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /point-redemptions/:documentId
    async findOneRedemption(ctx) {
      try {
        const { documentId } = ctx.params;
        const record = await strapi.plugin("zhao-point").service("redemption").getRedemption(documentId);
        if (!record) {
          ctx.status = 404;
          ctx.body = { error: "兑换记录不存在" };
          return;
        }
        if (record.channel != null) {
          const normalized = typeof record.channel === "number" ? { id: record.channel } : record.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        ctx.body = record;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // PUT /point-redemptions/:documentId
    async updateRedemption(ctx) {
      try {
        const { documentId } = ctx.params;
        const operatorId = getUserId(ctx);
        const body = ctx.request.body?.data || ctx.request.body;
        const { status, expressCompany, trackingNumber } = body;
        const existing = await strapi.plugin("zhao-point").service("redemption").getRedemption(documentId);
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "兑换记录不存在" };
          return;
        }
        if (existing.channel != null) {
          const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        const result = await strapi.plugin("zhao-point").service("redemption").reviewRedemption(
          documentId,
          status,
          operatorId,
          { expressCompany, trackingNumber }
        );
        ctx.body = result;
      } catch (e) {
        ctx.status = e.code === "POINT_006" || e.code === "POINT_016" ? 400 : e.status || 500;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 商品管理 =====
    // GET /products
    async findProducts(ctx) {
      try {
        const { status, deliveryType, name, page = "1", pageSize = "20" } = ctx.query;
        const extraWhere = {};
        const cf = channelFilter(ctx, "channel");
        if (cf) Object.assign(extraWhere, cf);
        const result = await strapi.plugin("zhao-point").service("redemption").getProducts({
          status,
          deliveryType,
          name,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          extraWhere
        });
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /products/:documentId
    async findOneProduct(ctx) {
      try {
        const { documentId } = ctx.params;
        const product = await strapi.plugin("zhao-point").service("redemption").getProduct(documentId);
        if (!product) {
          ctx.status = 404;
          ctx.body = { error: "商品不存在" };
          return;
        }
        if (product.channel != null) {
          const normalized = typeof product.channel === "number" ? { id: product.channel } : product.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        ctx.body = product;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /products
    async createProduct(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        if (body?.channel) {
          const channelDocId = typeof body.channel === "string" ? body.channel : body.channel?.documentId;
          if (channelDocId) {
            await assertChannelDocIdInScope(ctx, channelDocId);
          }
        }
        const product = await strapi.plugin("zhao-point").service("redemption").createProduct(body);
        ctx.body = product;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // PUT /products/:documentId
    async updateProduct(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const existing = await strapi.plugin("zhao-point").service("redemption").getProduct(documentId);
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "商品不存在" };
          return;
        }
        if (existing.channel != null) {
          const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        if (body?.channel) {
          const channelDocId = typeof body.channel === "string" ? body.channel : body.channel?.documentId;
          if (channelDocId) {
            await assertChannelDocIdInScope(ctx, channelDocId);
          }
        }
        const product = await strapi.plugin("zhao-point").service("redemption").updateProduct(documentId, body);
        ctx.body = product;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // DELETE /products/:documentId
    async deleteProduct(ctx) {
      try {
        const { documentId } = ctx.params;
        const existing = await strapi.plugin("zhao-point").service("redemption").getProduct(documentId);
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "商品不存在" };
          return;
        }
        if (existing.channel != null) {
          const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        await strapi.plugin("zhao-point").service("redemption").deleteProduct(documentId);
        ctx.body = { success: true };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // POST /products/:documentId/stock
    async adjustStock(ctx) {
      try {
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const { delta } = body;
        const existing = await strapi.plugin("zhao-point").service("redemption").getProduct(documentId);
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "商品不存在" };
          return;
        }
        if (existing.channel != null) {
          const normalized = typeof existing.channel === "number" ? { id: existing.channel } : existing.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        const product = await strapi.plugin("zhao-point").service("redemption").adjustStock(documentId, delta);
        ctx.body = product;
      } catch (e) {
        ctx.status = e.code === "POINT_013" || e.code === "POINT_014" ? 400 : e.status || 500;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 自提点 CRUD =====
    async findPickupLocations(ctx) {
      try {
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const { status, page, pageSize } = ctx.query;
        const where = { deletedAt: null };
        if (status) where.status = status;
        const cf = channelFilter(ctx, "channels");
        if (cf) Object.assign(where, cf);
        const [records, total] = await Promise.all([
          strapi.db.query(LOCATION_UID).findMany({
            where,
            orderBy: { sortOrder: "asc" },
            offset: ((page ? parseInt(page) : 1) - 1) * (pageSize ? parseInt(pageSize) : 20),
            limit: pageSize ? parseInt(pageSize) : 20,
            populate: { coverImage: true, businessLicense: true, channels: { select: ["id", "documentId", "name"] } }
          }),
          strapi.db.query(LOCATION_UID).count({ where })
        ]);
        ctx.body = { data: records, meta: { pagination: { page: page ? parseInt(page) : 1, pageSize: pageSize ? parseInt(pageSize) : 20, total } } };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async findOnePickupLocation(ctx) {
      try {
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const { documentId } = ctx.params;
        const location = await strapi.db.query(LOCATION_UID).findOne({
          where: { documentId, deletedAt: null },
          populate: { coverImage: true, businessLicense: true, channels: { select: ["id", "documentId", "name"] } }
        });
        if (!location) {
          ctx.status = 404;
          ctx.body = { error: "自提点不存在" };
          return;
        }
        if (Array.isArray(location.channels) && location.channels.length > 0) {
          assertInScope(ctx, location, "channels");
        }
        ctx.body = { data: location };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async createPickupLocation(ctx) {
      try {
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const body = ctx.request.body?.data || ctx.request.body;
        const data = { ...body };
        if (Array.isArray(data.channels) && data.channels.length > 0) {
          const channelIds = await Promise.all(
            data.channels.map(async (chId) => {
              const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
                where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
                select: ["id", "documentId"]
              });
              if (ch) {
                assertInScope(ctx, ch, "id");
              }
              return ch?.id;
            })
          );
          data.channels = [...new Set(channelIds.filter(Boolean))];
        }
        if (data.coverImage && typeof data.coverImage !== "number") data.coverImage = Number(data.coverImage) || void 0;
        if (data.businessLicense && typeof data.businessLicense !== "number") data.businessLicense = Number(data.businessLicense) || void 0;
        const location = await strapi.db.query(LOCATION_UID).create({ data });
        const populated = await strapi.db.query(LOCATION_UID).findOne({
          where: { documentId: location.documentId },
          populate: { coverImage: true, businessLicense: true, channels: { select: ["id", "documentId", "name"] } }
        });
        ctx.body = { data: populated };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async updatePickupLocation(ctx) {
      try {
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const { documentId } = ctx.params;
        const body = ctx.request.body?.data || ctx.request.body;
        const existing = await strapi.db.query(LOCATION_UID).findOne({
          where: { documentId, deletedAt: null },
          populate: { channels: { select: ["id", "documentId", "name"] } }
        });
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "自提点不存在" };
          return;
        }
        if (Array.isArray(existing.channels) && existing.channels.length > 0) {
          assertInScope(ctx, existing, "channels");
        }
        const data = { ...body };
        if (Array.isArray(data.channels) && data.channels.length > 0) {
          const channelIds = await Promise.all(
            data.channels.map(async (chId) => {
              const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
                where: { $or: [{ id: !isNaN(Number(chId)) ? Number(chId) : -1 }, { documentId: String(chId) }] },
                select: ["id", "documentId"]
              });
              if (ch) {
                assertInScope(ctx, ch, "id");
              }
              return ch?.id;
            })
          );
          data.channels = [...new Set(channelIds.filter(Boolean))];
        }
        if (data.coverImage && typeof data.coverImage !== "number") data.coverImage = Number(data.coverImage) || void 0;
        if (data.businessLicense && typeof data.businessLicense !== "number") data.businessLicense = Number(data.businessLicense) || void 0;
        await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data });
        const populated = await strapi.db.query(LOCATION_UID).findOne({
          where: { documentId },
          populate: { coverImage: true, businessLicense: true, channels: { select: ["id", "documentId", "name"] } }
        });
        ctx.body = { data: populated };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    async deletePickupLocation(ctx) {
      try {
        const LOCATION_UID = "plugin::zhao-point.pickup-location";
        const { documentId } = ctx.params;
        const existing = await strapi.db.query(LOCATION_UID).findOne({
          where: { documentId, deletedAt: null },
          populate: { channels: { select: ["id", "documentId", "name"] } }
        });
        if (!existing) {
          ctx.status = 404;
          ctx.body = { error: "自提点不存在" };
          return;
        }
        if (Array.isArray(existing.channels) && existing.channels.length > 0) {
          assertInScope(ctx, existing, "channels");
        }
        await strapi.db.query(LOCATION_UID).update({ where: { documentId }, data: { deletedAt: /* @__PURE__ */ new Date() } });
        ctx.body = { success: true };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 系统配置 =====
    // GET /config
    async getConfig(ctx) {
      try {
        const config2 = await strapi.plugin("zhao-point").service("config-service").getConfig();
        ctx.body = config2;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // PUT /config
    async updateConfig(ctx) {
      try {
        const body = ctx.request.body?.data || ctx.request.body;
        const config2 = await strapi.plugin("zhao-point").service("config-service").updateConfig(body);
        ctx.body = config2;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 核销管理 =====
    // GET /verifications
    async findVerifications(ctx) {
      try {
        const { page = "1", pageSize = "20", verifierId, verifiedUserId, channelId, direction, status, method, startDate, endDate } = ctx.query;
        const extraWhere = {};
        const cf = channelFilter(ctx, "channel");
        if (cf) Object.assign(extraWhere, cf);
        const result = await strapi.plugin("zhao-point").service("verification").getVerificationLog({
          verifierId,
          verifiedUserId,
          channelId,
          direction,
          status,
          method,
          startDate,
          endDate,
          page: parseInt(page),
          pageSize: parseInt(pageSize),
          extraWhere
        });
        ctx.body = result;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /verifications/:documentId
    async findOneVerification(ctx) {
      try {
        const { documentId } = ctx.params;
        const record = await strapi.plugin("zhao-point").service("point").findVerificationByDocumentId(documentId);
        if (!record) {
          ctx.status = 404;
          ctx.body = { error: "核销记录不存在" };
          return;
        }
        if (record.channel != null) {
          const normalized = typeof record.channel === "number" ? { id: record.channel } : record.channel;
          assertInScope(ctx, { channel: normalized }, "channel");
        }
        ctx.body = record;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // GET /verifications/stats
    async getVerificationStats(ctx) {
      try {
        const { channelId } = ctx.query;
        const stats = await strapi.plugin("zhao-point").service("verification").getVerificationStats(channelId);
        ctx.body = stats;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 签到记录 =====
    // GET /sign-in-records
    async findSignInRecords(ctx) {
      try {
        const { page = "1", pageSize = "20", userId } = ctx.query;
        const SIGN_IN_UID2 = "plugin::zhao-point.sign-in-record";
        const where = {};
        if (userId) where.user = userId;
        const [records, total] = await Promise.all([
          strapi.db.query(SIGN_IN_UID2).findMany({
            where,
            orderBy: { signInDate: "desc" },
            offset: (parseInt(page) - 1) * parseInt(pageSize),
            limit: parseInt(pageSize),
            populate: { user: { select: ["id"] } }
          }),
          strapi.db.query(SIGN_IN_UID2).count({ where })
        ]);
        ctx.body = {
          results: records,
          pagination: {
            page: parseInt(page),
            pageSize: parseInt(pageSize),
            total,
            pageCount: Math.ceil(total / parseInt(pageSize))
          }
        };
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    },
    // ===== 仪表盘 =====
    // GET /dashboard
    async getDashboard(ctx) {
      try {
        const stats = await strapi.plugin("zhao-point").service("config-service").getDashboardStats();
        ctx.body = stats;
      } catch (e) {
        ctx.status = e.status || 400;
        ctx.body = { error: e.message };
        return;
      }
    }
  };
};
const controllers = {
  point: point$1,
  "point-admin": pointAdmin
};
const register = ({ strapi }) => {
  try {
    const i18n = strapi.plugin("zhao-common").service("i18n");
    i18n.setMessages({
      POINT_001: "积分规则不存在 (action={action})",
      POINT_002: "积分余额不足",
      POINT_003: "积分操作失败",
      POINT_004: "已达每日积分上限",
      POINT_005: "兑换失败 - 积分不足",
      POINT_006: "兑换记录不存在",
      POINT_007: "积分调整失败 - 用户不存在",
      POINT_008: "批量调整失败 - 部分记录未处理",
      POINT_009: "积分规则已存在 (action={action})",
      POINT_010: "无效的积分操作类型",
      POINT_011: "一次性奖励已领取过 (action={action})",
      POINT_012: "积分过期扣除",
      POINT_013: "商品不存在或已下架",
      POINT_014: "商品库存不足",
      POINT_015: "已达该商品最大兑换数量",
      POINT_016: "兑换订单状态错误",
      POINT_017: "核销码无效或已过期",
      POINT_018: "渠道层级关系校验失败",
      POINT_019: "积分模块未启用",
      POINT_020: "功能模块已关闭，请联系管理员",
      POINT_021: "自提点不存在",
      POINT_022: "该自提点不支持此商品的渠道",
      POINT_023: "提货码无效，未找到对应兑换记录",
      POINT_024: "该订单非自提订单，无法扫码兑付",
      POINT_025: "订单状态不允许兑付"
    });
  } catch {
  }
};
const RULE_UID = "plugin::zhao-point.point-rule";
const bootstrap = async ({ strapi }) => {
  strapi.log.info("[zhao-point] 插件已加载，开始种子数据检查...");
  try {
    const defaultConfig = strapi.plugin("zhao-point").config("default");
    if (!defaultConfig) return;
    const allRules = {};
    for (const [action, rule] of Object.entries(defaultConfig.increaseRules || {})) {
      allRules[action] = { ...rule, category: "increase" };
    }
    for (const [action, rule] of Object.entries(defaultConfig.decreaseRules || {})) {
      allRules[action] = { ...rule, category: "decrease" };
    }
    const existingRules = await strapi.db.query(RULE_UID).findMany({
      select: ["action"]
    });
    const existingActions = new Set(existingRules.map((r) => r.action));
    let seeded = 0;
    for (const [action, rule] of Object.entries(allRules)) {
      if (existingActions.has(action)) continue;
      await strapi.db.query(RULE_UID).create({
        data: {
          action,
          category: rule.category,
          points: rule.points || 0,
          enabled: true,
          limitPerDay: rule.limitPerDay ?? 0,
          limitPerUser: rule.limitPerUser ?? 0,
          limitPerDayPerUser: rule.limitPerDayPerUser ?? 0,
          isOneTime: rule.isOneTime ?? false,
          description: rule.description || "",
          taskGroup: rule.taskGroup || "other",
          extraConfig: rule.extraConfig ? JSON.stringify(rule.extraConfig) : "{}"
        }
      });
      seeded++;
    }
    if (seeded > 0) {
      strapi.log.info(`[zhao-point] 已种子 ${seeded} 条积分规则`);
    } else {
      strapi.log.info("[zhao-point] 积分规则已完整，无需种子");
    }
  } catch (err) {
    strapi.log.warn(`[zhao-point] 种子数据失败: ${err.message}`);
  }
};
const destroy = ({ strapi: _strapi }) => {
};
const RECORD_UID$1 = "plugin::zhao-point.point-record";
const getDefaultConfig = () => config.default;
const point = ({ strapi }) => {
  const RULE_UID2 = "plugin::zhao-point.point-rule";
  const getMergedRule = async (action) => {
    const dbRule = await strapi.db.query(RULE_UID2).findOne({
      where: { action, deletedAt: null }
    });
    if (dbRule) {
      return {
        action: dbRule.action,
        category: dbRule.category,
        points: dbRule.points,
        enabled: dbRule.enabled,
        limitPerDay: dbRule.limitPerDay,
        limitPerUser: dbRule.limitPerUser,
        limitPerDayPerUser: dbRule.limitPerDayPerUser,
        isOneTime: dbRule.isOneTime,
        description: dbRule.description,
        extraConfig: dbRule.extraConfig
      };
    }
    const defaultRules = getDefaultConfig();
    if (defaultRules.increaseRules[action]) {
      return { ...defaultRules.increaseRules[action], category: "increase", enabled: true };
    }
    if (defaultRules.decreaseRules[action]) {
      return { ...defaultRules.decreaseRules[action], category: "decrease", enabled: true };
    }
    return null;
  };
  const getLatestBalance = async (userId) => {
    const lastRecord = await strapi.db.query(RECORD_UID$1).findOne({
      where: { user: userId },
      orderBy: { createdAt: "desc" }
    });
    return lastRecord ? lastRecord.balance : 0;
  };
  const countTodayAction = async (userId, action) => {
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const count = await strapi.db.query(RECORD_UID$1).count({
      where: {
        user: userId,
        action,
        createdAt: { $gte: today.toISOString() }
      }
    });
    return count;
  };
  const checkOneTimeClaimed = async (userId, action) => {
    const existing = await strapi.db.query(RECORD_UID$1).findOne({
      where: { user: userId, action, type: "increase" }
    });
    return !!existing;
  };
  const createRecord = async (userId, action, points, currentBalance, type, extra) => {
    if (!extra.channelId && !extra.userChannelId) {
      throwError("POINT_020", "积分记录必须归属渠道（业务渠道或用户渠道）", { action });
    }
    const newBalance = type === "increase" ? currentBalance + points : currentBalance - points;
    return await strapi.db.query(RECORD_UID$1).create({
      data: {
        user: userId,
        action,
        points: type === "increase" ? points : -points,
        balance: newBalance,
        type,
        source: extra.source || "",
        method: extra.method || "",
        remark: extra.remark || "",
        orderId: extra.orderId || void 0,
        operator: extra.operatorId || void 0,
        channel: extra.channelId || void 0,
        userChannel: extra.userChannelId || void 0,
        expiresAt: extra.expiresAt || void 0,
        createdAt: /* @__PURE__ */ new Date()
      }
    });
  };
  const throwError = (code, message, details) => {
    const err = new Error(message);
    err.code = code;
    err.details = details;
    throw err;
  };
  const earnPoints = async (params) => {
    const { userId, action, source, method, remark, orderId, channelId, userChannelId } = params;
    const finalChannelId = channelId ?? userChannelId;
    const rule = await getMergedRule(action);
    if (!rule || rule.category === "decrease") {
      throwError("POINT_001", `积分规则不存在 (action=${action})`, { action });
    }
    if (!rule.enabled) {
      throwError("POINT_019", `积分规则未启用 (action=${action})`, { action });
    }
    if (rule.isOneTime) {
      const claimed = await checkOneTimeClaimed(userId, action);
      if (claimed) {
        throwError("POINT_011", `一次性奖励已领取过 (action=${action})`, { action });
      }
    }
    if (rule.limitPerDay > 0) {
      const todayCount = await countTodayAction(userId, action);
      if (todayCount >= rule.limitPerDay) {
        throwError("POINT_004", `已达每日积分上限 (action=${action})`, { action, limit: rule.limitPerDay });
      }
    }
    const balance = await getLatestBalance(userId);
    const now = /* @__PURE__ */ new Date();
    let expiresAt;
    try {
      const configService2 = strapi.plugin("zhao-point").service("config-service");
      if (configService2) {
        const config2 = await configService2.getConfig();
        if (config2?.expiryEnabled && config2?.expiryDays > 0) {
          const expiryDate = new Date(now);
          expiryDate.setDate(expiryDate.getDate() + config2.expiryDays);
          expiresAt = expiryDate.toISOString();
        }
      }
    } catch {
    }
    const record = await createRecord(userId, action, rule.points, balance, "increase", {
      source,
      method,
      remark,
      orderId,
      channelId: finalChannelId,
      userChannelId,
      expiresAt
    });
    return record;
  };
  const deductPoints = async (params) => {
    const { userId, action, points: customPoints, source, method, remark, orderId } = params;
    const rule = await getMergedRule(action);
    const deductAmount = customPoints || rule?.points || 0;
    if (deductAmount <= 0) {
      throwError("POINT_010", "无效的积分操作类型", { action });
    }
    const balance = await getLatestBalance(userId);
    if (balance < deductAmount) {
      throwError("POINT_002", "积分余额不足", { balance, required: deductAmount });
    }
    const record = await createRecord(userId, action, deductAmount, balance, "decrease", {
      source,
      method,
      remark,
      orderId
    });
    return record;
  };
  const getBalance = async (userId) => {
    const records = await strapi.db.query(RECORD_UID$1).findMany({
      where: { user: userId },
      select: ["points"],
      populate: { channel: { select: ["id", "name"] } }
    });
    let totalBalance = 0;
    let globalBalance = 0;
    const channelMap = /* @__PURE__ */ new Map();
    for (const r of records) {
      const pts = r.points || 0;
      totalBalance += pts;
      if (!r.channel) {
        globalBalance += pts;
      } else {
        const chId = r.channel.id || r.channel;
        const chName = r.channel.name || `渠道${chId}`;
        const existing = channelMap.get(chId) || { name: chName, balance: 0 };
        existing.balance += pts;
        channelMap.set(chId, existing);
      }
    }
    const channelBalances = Array.from(channelMap.entries()).map(([channelId, data]) => ({
      channelId,
      channelName: data.name,
      balance: data.balance
    }));
    return { balance: totalBalance, channelBalances, globalBalance };
  };
  const getRecords = async (userId, params) => {
    const { page = 1, pageSize = 20, action, type, startDate, endDate, channelId } = params || {};
    const where = { user: userId };
    if (action) where.action = action;
    if (type) where.type = type;
    if (channelId) where.channel = channelId;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    const [records, total] = await Promise.all([
      strapi.db.query(RECORD_UID$1).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      }),
      strapi.db.query(RECORD_UID$1).count({ where })
    ]);
    const balance = await getLatestBalance(userId);
    return { records, total, balance, page, pageSize };
  };
  const getStatistics = async (userId) => {
    const now = /* @__PURE__ */ new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const stats = async (since) => {
      const result = await strapi.db.query(RECORD_UID$1).findMany({
        where: {
          user: userId,
          createdAt: { $gte: since.toISOString() }
        }
      });
      let earned = 0, spent = 0;
      result.forEach((r) => {
        if (r.type === "increase") earned += Math.abs(r.points);
        else spent += Math.abs(r.points);
      });
      return { earned, spent };
    };
    const [today, month, balance] = await Promise.all([
      stats(startOfToday),
      stats(startOfMonth),
      getLatestBalance(userId)
    ]);
    const allRecords = await strapi.db.query(RECORD_UID$1).findMany({
      where: { user: userId }
    });
    let totalEarned = 0, totalSpent = 0;
    allRecords.forEach((r) => {
      if (r.type === "increase") totalEarned += Math.abs(r.points);
      else totalSpent += Math.abs(r.points);
    });
    let expiringSoon = 0;
    try {
      const configService2 = strapi.plugin("zhao-point").service("config-service");
      if (configService2) {
        const config2 = await configService2.getConfig();
        if (config2?.expiryEnabled) {
          const reminderDate = /* @__PURE__ */ new Date();
          reminderDate.setDate(reminderDate.getDate() + (config2.expiryReminderDays || 7));
          const expiringRecords = await strapi.db.query(RECORD_UID$1).findMany({
            where: {
              user: userId,
              type: "increase",
              expiresAt: {
                $gte: (/* @__PURE__ */ new Date()).toISOString(),
                $lte: reminderDate.toISOString()
              },
              expiredAt: null
            }
          });
          expiringSoon = expiringRecords.reduce((sum, r) => sum + Math.abs(r.points), 0);
        }
      }
    } catch {
    }
    return {
      todayEarned: today.earned,
      todaySpent: today.spent,
      monthEarned: month.earned,
      monthSpent: month.spent,
      totalEarned,
      totalSpent,
      balance,
      expiringSoon
    };
  };
  const adminAdjust = async (params) => {
    const { userId, points, action, remark, operatorId } = params;
    if (points === 0) {
      throwError("POINT_003", "积分操作失败", { message: "调整积分数不能为 0" });
    }
    const balance = await getLatestBalance(userId);
    const type = points > 0 ? "increase" : "decrease";
    const absPoints = Math.abs(points);
    if (type === "decrease" && balance < absPoints) {
      throwError("POINT_002", "积分余额不足", { balance, required: absPoints });
    }
    const record = await createRecord(userId, action || "manual_adjust", absPoints, balance, type, {
      method: "管理员手动调整",
      remark,
      operatorId
    });
    return record;
  };
  const batchAdjust = async (items, operatorId) => {
    if (!items || items.length === 0) {
      throwError("POINT_008", "批量调整失败 - 部分记录未处理", { message: "调整列表为空" });
    }
    const results = [];
    const errors = [];
    for (const item of items) {
      try {
        const record = await adminAdjust({
          userId: item.userId,
          points: item.points,
          action: item.action || "manual_adjust",
          remark: item.remark,
          operatorId
        });
        results.push(record);
      } catch (e) {
        errors.push({ userId: item.userId, error: e.message });
      }
    }
    if (errors.length > 0 && results.length === 0) {
      throwError("POINT_008", "批量调整失败 - 部分记录未处理", errors);
    }
    return { success: results, failed: errors, totalSuccess: results.length, totalFailed: errors.length };
  };
  const getExpiringPoints = async (userId, withinDays) => {
    const now = /* @__PURE__ */ new Date();
    const future = /* @__PURE__ */ new Date();
    future.setDate(future.getDate() + withinDays);
    const records = await strapi.db.query(RECORD_UID$1).findMany({
      where: {
        user: userId,
        type: "increase",
        expiresAt: {
          $gte: now.toISOString(),
          $lte: future.toISOString()
        },
        expiredAt: null
      },
      orderBy: { expiresAt: "asc" }
    });
    const totalPoints = records.reduce((sum, r) => sum + Math.abs(r.points), 0);
    return { points: totalPoints, records };
  };
  const applyExpiryDeduction = async (userId) => {
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const expiredRecords = await strapi.db.query(RECORD_UID$1).findMany({
      where: {
        user: userId,
        type: "increase",
        expiresAt: { $lte: now },
        expiredAt: null
      }
    });
    let deducted = 0;
    const processed = [];
    for (const record of expiredRecords) {
      const points = Math.abs(record.points);
      const balance = await getLatestBalance(userId);
      await createRecord(userId, "expiration_deduct", points, balance, "decrease", {
        method: "积分过期扣除",
        remark: `积分记录 #${record.id} 到期扣除`
      });
      await strapi.db.query(RECORD_UID$1).update({
        where: { id: record.id },
        data: { expiredAt: now }
      });
      deducted += points;
      processed.push(record);
    }
    return { deducted, records: processed };
  };
  const getRules = async (params) => {
    const dbRuleList = await strapi.db.query(RULE_UID2).findMany({
      where: { deletedAt: null }
    });
    const dbRuleMap = {};
    for (const r of dbRuleList) {
      dbRuleMap[r.action] = r;
    }
    const defaultConfig = getDefaultConfig();
    const allRules = [];
    const mergeRules = (config2, category) => {
      for (const [action, rule] of Object.entries(config2)) {
        const dbRule = dbRuleMap[action];
        allRules.push({
          action,
          category,
          points: dbRule?.points ?? rule.points,
          limitPerDay: dbRule?.limitPerDay ?? rule.limitPerDay ?? 0,
          isOneTime: dbRule?.isOneTime ?? rule.isOneTime ?? false,
          description: dbRule?.description ?? rule.description,
          enabled: dbRule?.enabled ?? true,
          limitPerUser: dbRule?.limitPerUser ?? 0,
          limitPerDayPerUser: dbRule?.limitPerDayPerUser ?? 0,
          priority: dbRule?.priority ?? 0,
          taskGroup: dbRule?.taskGroup ?? rule.taskGroup ?? "other"
        });
      }
    };
    mergeRules(defaultConfig.increaseRules, "increase");
    mergeRules(defaultConfig.decreaseRules, "decrease");
    for (const [action, dbRule] of Object.entries(dbRuleMap)) {
      if (!defaultConfig.increaseRules[action] && !defaultConfig.decreaseRules[action]) {
        allRules.push({
          action,
          category: dbRule.category,
          points: dbRule.points,
          limitPerDay: dbRule.limitPerDay ?? 0,
          isOneTime: dbRule.isOneTime ?? false,
          description: dbRule.description,
          enabled: dbRule.enabled ?? true,
          limitPerUser: dbRule.limitPerUser ?? 0,
          limitPerDayPerUser: dbRule.limitPerDayPerUser ?? 0,
          priority: dbRule.priority ?? 0,
          taskGroup: dbRule.taskGroup ?? "other"
        });
      }
    }
    let result = allRules;
    if (params?.action) result = result.filter((r) => r.action === params.action);
    if (params?.category) result = result.filter((r) => r.category === params.category);
    if (params?.enabled !== void 0) result = result.filter((r) => r.enabled === params.enabled);
    return result;
  };
  const upsertRule = async (data) => {
    const existing = await strapi.db.query(RULE_UID2).findOne({
      where: { action: data.action, deletedAt: null }
    });
    if (existing) {
      await strapi.db.query(RULE_UID2).update({
        where: { id: existing.id },
        data: {
          category: data.category,
          points: data.points,
          description: data.description || existing.description,
          limitPerDay: data.limitPerDay ?? existing.limitPerDay,
          limitPerUser: data.limitPerUser ?? existing.limitPerUser,
          limitPerDayPerUser: data.limitPerDayPerUser ?? existing.limitPerDayPerUser,
          isOneTime: data.isOneTime ?? existing.isOneTime,
          enabled: data.enabled ?? existing.enabled,
          priority: data.priority ?? existing.priority,
          taskGroup: data.taskGroup ?? existing.taskGroup,
          extraConfig: data.extraConfig ? JSON.stringify(data.extraConfig) : existing.extraConfig
        }
      });
    } else {
      await strapi.db.query(RULE_UID2).create({
        data: {
          action: data.action,
          category: data.category,
          points: data.points,
          description: data.description || "",
          limitPerDay: data.limitPerDay ?? 0,
          limitPerUser: data.limitPerUser ?? 0,
          limitPerDayPerUser: data.limitPerDayPerUser ?? 0,
          isOneTime: data.isOneTime ?? false,
          enabled: data.enabled ?? true,
          priority: data.priority ?? 0,
          taskGroup: data.taskGroup ?? "other",
          extraConfig: data.extraConfig ? JSON.stringify(data.extraConfig) : "{}"
        }
      });
    }
    return { action: data.action, ...data };
  };
  const deleteRule = async (action) => {
    const existing = await strapi.db.query(RULE_UID2).findOne({
      where: { action, deletedAt: null }
    });
    if (existing) {
      await strapi.db.query(RULE_UID2).update({
        where: { id: existing.id },
        data: { deletedAt: (/* @__PURE__ */ new Date()).toISOString() }
      });
    }
    return { success: true };
  };
  const listRecords = async (params) => {
    const { userId, action, type, startDate, endDate, page, pageSize, extraWhere } = params;
    const where = {};
    if (userId) where.user = userId;
    if (action) where.action = action;
    if (type) where.type = type;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
    }
    const [records, total] = await Promise.all([
      strapi.db.query(RECORD_UID$1).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      }),
      strapi.db.query(RECORD_UID$1).count({ where })
    ]);
    return { records, total, page, pageSize };
  };
  const findRecordByDocumentId = async (documentId) => {
    return strapi.db.query(RECORD_UID$1).findOne({
      where: { documentId }
    });
  };
  const findVerificationByDocumentId = async (documentId) => {
    return strapi.db.query("plugin::zhao-point.channel-verification").findOne({
      where: { documentId }
    });
  };
  const findOneRule = async (action) => {
    const rule = await strapi.db.query(RULE_UID2).findOne({
      where: { action, deletedAt: null }
    });
    return rule ? { action, ...rule } : null;
  };
  const earnCustomPoints = async (params) => {
    const { userId, action, points, source, remark, channelId, userChannelId } = params;
    const finalChannelId = channelId ?? userChannelId;
    const rule = await getMergedRule(action);
    if (!rule || rule.category === "decrease") {
      throwError("POINT_001", `积分规则不存在 (action=${action})`, { action });
    }
    if (!rule.enabled) {
      throwError("POINT_019", `积分规则未启用 (action=${action})`, { action });
    }
    if (rule.isOneTime) {
      const claimed = await checkOneTimeClaimed(userId, action);
      if (claimed) {
        throwError("POINT_011", `一次性奖励已领取过 (action=${action})`, { action });
      }
    }
    if (rule.limitPerDay > 0) {
      const todayCount = await countTodayAction(userId, action);
      if (todayCount >= rule.limitPerDay) {
        throwError("POINT_004", `已达每日积分上限 (action=${action})`, { action, limit: rule.limitPerDay });
      }
    }
    if (points <= 0) {
      throwError("POINT_003", "积分操作失败", { message: "积分数必须大于 0" });
    }
    const balance = await getLatestBalance(userId);
    let expiresAt;
    try {
      const configService2 = strapi.plugin("zhao-point").service("config-service");
      if (configService2) {
        const config2 = await configService2.getConfig();
        if (config2?.expiryEnabled && config2?.expiryDays > 0) {
          const expiryDate = /* @__PURE__ */ new Date();
          expiryDate.setDate(expiryDate.getDate() + config2.expiryDays);
          expiresAt = expiryDate.toISOString();
        }
      }
    } catch {
    }
    const record = await createRecord(userId, action, points, balance, "increase", {
      source: source || "",
      method: "用户自主领取",
      remark: remark || "",
      channelId: finalChannelId ?? void 0,
      userChannelId: userChannelId ?? void 0,
      expiresAt
    });
    return record;
  };
  const getTasks = async (userId) => {
    const RULE_UID22 = "plugin::zhao-point.point-rule";
    const RECORD_UID2 = "plugin::zhao-point.point-record";
    const rules = await strapi.db.query(RULE_UID22).findMany({
      where: { category: "increase", enabled: true, deletedAt: null },
      orderBy: { taskGroup: "asc", action: "asc" }
    });
    const todayStart = /* @__PURE__ */ new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayRecords = await strapi.db.query(RECORD_UID2).findMany({
      where: {
        user: userId,
        type: "increase",
        createdAt: { $gte: todayStart.toISOString() }
      }
    });
    const todayActionCount = {};
    for (const r of todayRecords) {
      todayActionCount[r.action] = (todayActionCount[r.action] || 0) + 1;
    }
    const groups = {};
    for (const rule of rules) {
      const group = rule.taskGroup || "other";
      if (!groups[group]) groups[group] = [];
      const todayCount = todayActionCount[rule.action] || 0;
      const isCompleted = rule.limitPerDay > 0 ? todayCount >= rule.limitPerDay : rule.isOneTime ? todayCount > 0 : false;
      groups[group].push({
        action: rule.action,
        description: rule.description,
        points: rule.points,
        limitPerDay: rule.limitPerDay,
        isOneTime: rule.isOneTime,
        todayCount,
        isCompleted
      });
    }
    return groups;
  };
  return {
    earnPoints,
    earnCustomPoints,
    deductPoints,
    getBalance,
    getRecords,
    getStatistics,
    adminAdjust,
    batchAdjust,
    getExpiringPoints,
    applyExpiryDeduction,
    getRules,
    findOneRule,
    upsertRule,
    deleteRule,
    getDefaultConfig,
    listRecords,
    findRecordByDocumentId,
    findVerificationByDocumentId,
    getMergedRule,
    getTasks
  };
};
const PRODUCT_UID = "plugin::zhao-point.point-product";
const REDEMPTION_UID = "plugin::zhao-point.point-redemption";
const RECORD_UID = "plugin::zhao-point.point-record";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";
const redemption = ({ strapi }) => {
  const throwError = (code, message, details) => {
    const err = new Error(message);
    err.code = code;
    err.details = details;
    throw err;
  };
  const generatePickupCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };
  const createProduct = async (data) => {
    const intFields = ["pointsCost", "stock", "totalStock", "maxPerUser", "sortOrder"];
    for (const key of intFields) {
      if (data[key] !== void 0 && data[key] !== null) {
        data[key] = Math.round(Number(data[key])) || 0;
      }
    }
    if (data.originalPrice !== void 0 && data.originalPrice !== null) {
      data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
    }
    if (data.price !== void 0 && data.price !== null) {
      data.price = Math.round(Number(data.price) * 100) / 100 || null;
    }
    if (data.channel && typeof data.channel === "string") {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
        select: ["id"]
      });
      if (ch) data.channel = ch.id;
      else delete data.channel;
    }
    const created = await strapi.db.query(PRODUCT_UID).create({ data });
    return await strapi.db.query(PRODUCT_UID).findOne({
      where: { id: created.id },
      populate: {
        channel: { select: ["id", "documentId", "name"] },
        coverImage: true,
        images: true,
        video: true
      }
    });
  };
  const updateProduct = async (id, data) => {
    const intFields = ["pointsCost", "stock", "totalStock", "maxPerUser", "sortOrder"];
    for (const key of intFields) {
      if (data[key] !== void 0 && data[key] !== null) {
        data[key] = Math.round(Number(data[key])) || 0;
      }
    }
    if (data.originalPrice !== void 0 && data.originalPrice !== null) {
      data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
    }
    if (data.price !== void 0 && data.price !== null) {
      data.price = Math.round(Number(data.price) * 100) / 100 || null;
    }
    if (data.channel && typeof data.channel === "string") {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
        select: ["id"]
      });
      if (ch) data.channel = ch.id;
      else delete data.channel;
    }
    let numericId = id;
    if (typeof id === "string" && isNaN(Number(id))) {
      const product = await strapi.db.query(PRODUCT_UID).findOne({
        where: { documentId: id },
        select: ["id"]
      });
      if (!product) throwError("POINT_013", "商品不存在");
      numericId = product.id;
    }
    await strapi.db.query(PRODUCT_UID).update({ where: { id: numericId }, data });
    return await strapi.db.query(PRODUCT_UID).findOne({
      where: { id: numericId },
      populate: {
        channel: { select: ["id", "documentId", "name"] },
        coverImage: true,
        images: true,
        video: true
      }
    });
  };
  const deleteProduct = async (id) => {
    if (typeof id === "string" && isNaN(Number(id))) {
      const product = await strapi.db.query(PRODUCT_UID).findOne({ where: { documentId: id }, select: ["id"] });
      if (!product) throwError("POINT_013", "商品不存在");
      return await strapi.db.query(PRODUCT_UID).delete({ where: { id: product.id } });
    }
    return await strapi.db.query(PRODUCT_UID).delete({ where: { id } });
  };
  const getProducts = async (filters) => {
    const { status, deliveryType, name, page = 1, pageSize = 20, userId, siteId, extraWhere } = filters || {};
    const where = { deletedAt: null, status: status || "on_shelf" };
    if (deliveryType) where.deliveryType = deliveryType;
    if (name) where.name = { $containsi: name };
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
    }
    if (userId && siteId) {
      const availableChannels = await strapi.plugin("zhao-common").service("site-config").getAvailableChannels(siteId, userId);
      const channelIds = availableChannels.map((c) => c.id).filter(Boolean);
      if (channelIds.length > 0) {
        where.$or = [
          { channel: { $in: channelIds } },
          { allowCrossChannel: true }
        ];
      } else {
        where.allowCrossChannel = true;
      }
    } else if (userId) {
      const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
        where: { user: userId },
        populate: { channel: { select: ["id"] } }
      });
      const userChannelIds = members.map((m) => m.channel?.id || m.channel).filter(Boolean);
      if (userChannelIds.length > 0) {
        where.$or = [
          { channel: { $in: userChannelIds } },
          { allowCrossChannel: true }
        ];
      } else {
        where.allowCrossChannel = true;
      }
    }
    const [records, total] = await Promise.all([
      strapi.db.query(PRODUCT_UID).findMany({
        where,
        orderBy: { sortOrder: "asc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: {
          channel: { select: ["id", "documentId", "name"] },
          coverImage: true,
          images: true
        }
      }),
      strapi.db.query(PRODUCT_UID).count({ where })
    ]);
    return { records, total, page, pageSize };
  };
  const getProduct = async (id, userId) => {
    const where = { deletedAt: null };
    if (typeof id === "string" && isNaN(Number(id))) {
      where.documentId = id;
    } else {
      where.id = id;
    }
    const product = await strapi.db.query(PRODUCT_UID).findOne({
      where,
      select: [
        "id",
        "documentId",
        "name",
        "subtitle",
        "description",
        "detail",
        "pointsCost",
        "originalPrice",
        "price",
        "stock",
        "totalStock",
        "deliveryType",
        "salesMode",
        "status",
        "maxPerUser",
        "sortOrder",
        "allowCrossChannel",
        "allowGlobalPoints",
        "createdAt",
        "updatedAt"
      ],
      populate: {
        channel: { select: ["id", "documentId", "name"] },
        coverImage: true,
        images: true
      }
    });
    if (userId && product) {
      if (product.allowCrossChannel) {
        return product;
      }
      const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
        where: { user: userId },
        populate: { channel: { select: ["id"] } }
      });
      const userChannelIds = members.map((m) => m.channel?.id || m.channel).filter(Boolean);
      const productChannelId = product.channel?.id || product.channel;
      if (!productChannelId || !userChannelIds.includes(productChannelId)) {
        return null;
      }
    }
    return product;
  };
  const adjustStock = async (id, delta) => {
    let numericId = id;
    if (typeof id === "string" && isNaN(Number(id))) {
      const p = await strapi.db.query(PRODUCT_UID).findOne({ where: { documentId: id, deletedAt: null }, select: ["id"] });
      if (!p) throwError("POINT_013", "商品不存在或已下架");
      numericId = p.id;
    }
    const product = await getProduct(numericId);
    if (!product) {
      throwError("POINT_013", "商品不存在或已下架");
    }
    const newStock = (product.stock || 0) + delta;
    if (newStock < 0) {
      throwError("POINT_014", "商品库存不足");
    }
    return await strapi.db.query(PRODUCT_UID).update({
      where: { id: numericId },
      data: { stock: newStock }
    });
  };
  const createRedemption = async (params) => {
    const {
      userId,
      productId,
      itemName,
      pointsCost: manualPointsCost,
      quantity = 1,
      deliveryType,
      pickupLocationId,
      receiverName,
      receiverPhone,
      receiverAddress,
      remark,
      channelId,
      useGlobalPoints = false,
      selectedChannels: rawSelectedChannels = []
    } = params;
    let finalItemName = itemName || "";
    let finalPointsCost = manualPointsCost || 0;
    let finalSalesMode = "points_only";
    let finalPrice = 0;
    let productNumericId;
    let productChannelId;
    let productAllowGlobalPoints = true;
    let productAllowCrossChannel = false;
    if (productId) {
      const product = await getProduct(productId);
      if (!product || product.status !== "on_shelf") {
        throwError("POINT_013", "商品不存在或已下架");
      }
      productNumericId = product.id;
      if (product.channel) productChannelId = product.channel.id || product.channel;
      productAllowGlobalPoints = product.allowGlobalPoints !== false;
      productAllowCrossChannel = product.allowCrossChannel === true;
      finalItemName = product.name;
      finalSalesMode = product.salesMode || "points_only";
      finalPrice = parseFloat(product.price) || 0;
      if (finalSalesMode === "points_only") {
        finalPointsCost = product.pointsCost;
      } else if (finalSalesMode === "hybrid") {
        finalPointsCost = product.pointsCost;
      } else {
        finalPointsCost = 0;
      }
      if (product.stock !== void 0 && product.stock !== null && product.stock >= 0 && product.stock < quantity) {
        throwError("POINT_014", "商品库存不足");
      }
      if (product.maxPerUser > 0) {
        const userRedemptions = await strapi.db.query(REDEMPTION_UID).count({
          where: {
            user: userId,
            product: product.id,
            status: { $in: ["pending", "approved", "shipped", "completed"] }
          }
        });
        if (userRedemptions + quantity > product.maxPerUser) {
          throwError("POINT_015", "已达该商品最大兑换数量");
        }
      }
    }
    let pickupLocationNumericId;
    if (pickupLocationId) {
      const loc = await strapi.db.query("plugin::zhao-point.pickup-location").findOne({
        where: {
          deletedAt: null,
          $or: [
            { id: !isNaN(Number(pickupLocationId)) ? Number(pickupLocationId) : -1 },
            { documentId: String(pickupLocationId) }
          ]
        },
        populate: { channels: { select: ["id", "documentId"] } }
      });
      if (!loc) {
        throwError("POINT_021", "自提点不存在");
      }
      if (productId && productChannelId) {
        const locChannelIds = (loc.channels || []).map((c) => c.id);
        if (!locChannelIds.includes(productChannelId)) {
          throwError("POINT_022", "该自提点不支持此商品的渠道");
        }
      }
      pickupLocationNumericId = loc.id;
    }
    let channelNumericId;
    if (channelId) {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: {
          $or: [
            { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
            { documentId: String(channelId) }
          ]
        },
        select: ["id"]
      });
      if (ch) channelNumericId = ch.id;
    }
    const totalPointsCost = finalPointsCost * quantity;
    const totalPriceAmount = finalPrice * quantity;
    const deductions = [];
    const isGlobalProduct = !productChannelId;
    if (totalPointsCost > 0) {
      let ownChannelBalance = 0;
      if (productChannelId) {
        const channelRecords = await strapi.db.query(RECORD_UID).findMany({
          where: { user: userId, channel: productChannelId },
          select: ["points"]
        });
        ownChannelBalance = channelRecords.reduce((sum, r) => sum + (r.points || 0), 0);
      }
      let remaining = totalPointsCost;
      if (!isGlobalProduct && ownChannelBalance > 0 && remaining > 0) {
        const deduct = Math.min(ownChannelBalance, remaining);
        deductions.push({ channelId: productChannelId || null, amount: deduct });
        remaining -= deduct;
      }
      if (!isGlobalProduct && remaining > 0 && productAllowCrossChannel && rawSelectedChannels.length > 0) {
        const otherChannelIds = [];
        for (const chId of rawSelectedChannels) {
          if (typeof chId === "string" && isNaN(Number(chId))) {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { documentId: String(chId) },
              select: ["id", "name"]
            });
            if (ch) otherChannelIds.push(ch.id);
          } else {
            const numId = Number(chId);
            if (numId > 0 && numId !== productChannelId) otherChannelIds.push(numId);
          }
        }
        for (const chId of otherChannelIds) {
          if (remaining <= 0) break;
          const chRecords = await strapi.db.query(RECORD_UID).findMany({
            where: { user: userId, channel: chId },
            select: ["points"]
          });
          const chBalance = chRecords.reduce((sum, r) => sum + (r.points || 0), 0);
          if (chBalance > 0) {
            const deduct = Math.min(chBalance, remaining);
            const chInfo = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { id: chId },
              select: ["name"]
            });
            deductions.push({ channelId: chId, amount: deduct, channelName: chInfo?.name });
            remaining -= deduct;
          }
        }
      }
      if (remaining > 0 && (isGlobalProduct || productAllowGlobalPoints && useGlobalPoints)) {
        const globalRecords = await strapi.db.query(RECORD_UID).findMany({
          where: { user: userId, channel: null },
          select: ["points"]
        });
        const globalBalance = globalRecords.reduce((sum, r) => sum + (r.points || 0), 0);
        if (globalBalance > 0) {
          const deduct = Math.min(globalBalance, remaining);
          deductions.push({ channelId: null, amount: deduct });
          remaining -= deduct;
        }
      }
      if (remaining > 0) {
        const totalAvailable = deductions.reduce((s, d) => s + d.amount, 0) + (remaining > 0 ? 0 : 0);
        const hints = [];
        if (!productAllowCrossChannel) hints.push("商品不允许跨渠道积分");
        if (!productAllowGlobalPoints) hints.push("商品不允许全局积分");
        if (productAllowGlobalPoints && !useGlobalPoints && totalPointsCost > ownChannelBalance) {
          hints.push("可使用全局积分补足");
        }
        if (productAllowCrossChannel && rawSelectedChannels.length === 0 && totalPointsCost > ownChannelBalance) {
          hints.push("可选择其他渠道积分补足");
        }
        throwError("POINT_005", "兑换失败 - 积分不足", {
          required: totalPointsCost,
          available: totalAvailable,
          shortfall: remaining,
          hints
        });
      }
    }
    const result = await strapi.db.transaction(async () => {
      if (totalPointsCost > 0 && deductions.length > 0) {
        const pointService = strapi.plugin("zhao-point").service("point");
        const latestBalance = await pointService.getBalance(userId);
        let cumulativeDeduct = 0;
        for (const d of deductions) {
          cumulativeDeduct += d.amount;
          const isGlobal = d.channelId === null;
          const methodSuffix = isGlobal ? "（全局积分补足）" : d.channelId !== productChannelId ? `（${d.channelName || "渠道" + d.channelId}积分补足）` : "";
          await strapi.db.query(RECORD_UID).create({
            data: {
              user: userId,
              action: "redeem_gift",
              points: -d.amount,
              balance: latestBalance.balance - cumulativeDeduct,
              type: "decrease",
              source: "",
              method: `兑换: ${finalItemName} x${quantity}${methodSuffix}`,
              remark: remark || "",
              channel: d.channelId || void 0,
              createdAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      if (productId) {
        const product = await getProduct(productId);
        if (product.stock !== void 0 && product.stock !== null && product.stock >= 0) {
          await strapi.db.query(PRODUCT_UID).update({
            where: { id: product.id },
            data: { stock: product.stock - quantity }
          });
        }
      }
      const initialStatus = finalSalesMode === "purchase_only" ? "approved" : "pending";
      const redemption2 = await strapi.db.query(REDEMPTION_UID).create({
        data: {
          user: userId,
          product: productNumericId || void 0,
          itemName: finalItemName,
          pointsCost: finalPointsCost,
          quantity,
          totalCost: totalPointsCost,
          status: initialStatus,
          deliveryType: deliveryType || void 0,
          pickupCode: generatePickupCode(),
          pickupLocation: pickupLocationNumericId || void 0,
          salesMode: finalSalesMode,
          priceAmount: totalPriceAmount || void 0,
          pointsAmount: totalPointsCost || void 0,
          receiverName: receiverName || void 0,
          receiverPhone: receiverPhone || void 0,
          receiverAddress: receiverAddress || void 0,
          remark: remark || "",
          channel: channelNumericId || void 0,
          deductionDetail: deductions.length > 0 ? deductions : void 0,
          createdAt: /* @__PURE__ */ new Date()
        }
      });
      return redemption2;
    });
    return result;
  };
  const reviewRedemption = async (redemptionId, status, operatorId, extra) => {
    let numericRedemptionId = redemptionId;
    if (typeof redemptionId === "string" && isNaN(Number(redemptionId))) {
      const found = await strapi.db.query(REDEMPTION_UID).findOne({
        where: { documentId: redemptionId },
        select: ["id"]
      });
      if (!found) throwError("POINT_006", "兑换记录不存在", { redemptionId });
      numericRedemptionId = found.id;
    }
    const redemption2 = await strapi.db.query(REDEMPTION_UID).findOne({
      where: { id: numericRedemptionId },
      populate: { product: { select: ["id"] }, user: { select: ["id"] } }
    });
    if (!redemption2) {
      throwError("POINT_006", "兑换记录不存在", { redemptionId });
    }
    const validTransitions = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["shipped", "cancelled"],
      shipped: ["completed"]
    };
    const allowedNext = validTransitions[redemption2.status] || [];
    if (!allowedNext.includes(status)) {
      throwError("POINT_016", "兑换订单状态错误", {
        current: redemption2.status,
        target: status,
        allowed: allowedNext
      });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updateData = { status, operator: operatorId };
    if (status === "shipped" || status === "completed" || status === "approved") {
      updateData.completedAt = now;
    }
    if (extra?.expressCompany) updateData.expressCompany = extra.expressCompany;
    if (extra?.trackingNumber) updateData.trackingNumber = extra.trackingNumber;
    if (status === "rejected" || status === "cancelled") {
      if (redemption2.totalCost > 0) {
        const pointService = strapi.plugin("zhao-point").service("point");
        const { balance } = await pointService.getBalance(redemption2.user.id || redemption2.user);
        const refundUserId = redemption2.user.id || redemption2.user;
        const detail = redemption2.deductionDetail;
        if (detail && Array.isArray(detail) && detail.length > 0) {
          let cumulativeRefund = 0;
          for (const d of detail) {
            cumulativeRefund += d.amount;
            const isGlobal = d.channelId === null;
            const channelLabel = isGlobal ? "全局积分" : d.channelName || `渠道${d.channelId}`;
            await strapi.db.query("plugin::zhao-point.point-record").create({
              data: {
                user: refundUserId,
                action: "manual_adjust",
                points: d.amount,
                balance: balance + cumulativeRefund,
                type: "increase",
                method: status === "rejected" ? `兑换驳回退回${channelLabel}: ${redemption2.itemName}` : `兑换取消退回${channelLabel}: ${redemption2.itemName}`,
                operator: operatorId,
                remark: `兑换记录 #${redemptionId} ${status === "rejected" ? "被驳回" : "已取消"}，退回${channelLabel}`,
                channel: d.channelId || void 0,
                createdAt: /* @__PURE__ */ new Date()
              }
            });
          }
        } else {
          await strapi.db.query("plugin::zhao-point.point-record").create({
            data: {
              user: refundUserId,
              action: "manual_adjust",
              points: redemption2.totalCost,
              balance: balance + redemption2.totalCost,
              type: "increase",
              method: status === "rejected" ? `兑换驳回退回积分: ${redemption2.itemName}` : `兑换取消退回积分: ${redemption2.itemName}`,
              operator: operatorId,
              remark: `兑换记录 #${redemptionId} ${status === "rejected" ? "被驳回" : "已取消"}，退回积分`,
              createdAt: /* @__PURE__ */ new Date()
            }
          });
        }
      }
      if (redemption2.product) {
        const productId = redemption2.product.id || redemption2.product;
        const product = await strapi.db.query(PRODUCT_UID).findOne({ where: { id: productId, deletedAt: null } });
        if (product && product.stock !== void 0 && product.stock !== null && product.stock >= 0) {
          await strapi.db.query(PRODUCT_UID).update({
            where: { id: productId },
            data: { stock: product.stock + redemption2.quantity }
          });
        }
      }
    }
    return await strapi.db.query(REDEMPTION_UID).update({
      where: { id: numericRedemptionId },
      data: updateData
    });
  };
  const getRedemptions = async (filters) => {
    const { status, userId, deliveryType, page = 1, pageSize = 20, startDate, endDate, extraWhere } = filters || {};
    const where = { deletedAt: null };
    if (status) where.status = status;
    if (userId) where.user = userId;
    if (deliveryType) where.deliveryType = deliveryType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
    }
    const [records, total] = await Promise.all([
      strapi.db.query(REDEMPTION_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: {
          pickupLocation: { select: ["id", "documentId", "name", "address", "phone", "latitude", "longitude"] },
          product: { select: ["id", "documentId", "name"], populate: { coverImage: true } },
          user: { select: ["id", "documentId", "username"] }
        }
      }),
      strapi.db.query(REDEMPTION_UID).count({ where })
    ]);
    return { records, total, page, pageSize };
  };
  const getRedemption = async (id) => {
    const where = { deletedAt: null };
    if (typeof id === "string" && isNaN(Number(id))) {
      where.documentId = id;
    } else {
      where.id = id;
    }
    return await strapi.db.query(REDEMPTION_UID).findOne({
      where,
      populate: {
        pickupLocation: { select: ["id", "documentId", "name", "address", "phone", "latitude", "longitude"] },
        product: { select: ["id", "documentId", "name"] },
        user: { select: ["id", "documentId", "username", "name"] }
      }
    });
  };
  const getUserRedemptions = async (userId, filters) => {
    return await getRedemptions({ ...filters, userId });
  };
  const verifyRedemption = async (pickupCode, operatorId) => {
    if (!pickupCode) {
      throwError("POINT_020", "提货码不能为空");
    }
    const redemption2 = await strapi.db.query(REDEMPTION_UID).findOne({
      where: { pickupCode, deletedAt: null },
      populate: { pickupLocation: { select: ["id", "documentId", "name", "address", "phone", "latitude", "longitude"] } }
    });
    if (!redemption2) {
      throwError("POINT_023", "提货码无效，未找到对应兑换记录");
    }
    if (redemption2.status !== "approved") {
      throwError("POINT_025", "订单状态不允许核销", { currentStatus: redemption2.status });
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    return await strapi.db.query(REDEMPTION_UID).update({
      where: { id: redemption2.id },
      data: {
        status: "completed",
        operator: operatorId,
        completedAt: now
      }
    });
  };
  return {
    createProduct,
    updateProduct,
    deleteProduct,
    getProducts,
    getProduct,
    adjustStock,
    createRedemption,
    reviewRedemption,
    getRedemptions,
    getRedemption,
    getUserRedemptions,
    verifyRedemption
  };
};
const TEMPLATE_UID = "plugin::zhao-point.rule-template";
const ruleEngine = ({ strapi }) => {
  function throwErr(code, status, message) {
    const e = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }
  const validateAction = async (params) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const rule = await pointService.getMergedRule(params.action);
    if (!rule) {
      return { valid: false, rule: null, reason: "规则不存在" };
    }
    if (!rule.enabled) {
      return { valid: false, rule, reason: "规则未启用" };
    }
    if (rule.isOneTime) {
      const records = await strapi.db.query("plugin::zhao-point.point-record").findMany({
        where: { user: params.userId, action: params.action, type: "increase" },
        limit: 1
      });
      if (records.length > 0) {
        return { valid: false, rule, reason: "一次性奖励已领取" };
      }
    }
    if (rule.limitPerDay > 0) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const todayCount = await strapi.db.query("plugin::zhao-point.point-record").count({
        where: {
          user: params.userId,
          action: params.action,
          createdAt: { $gte: today.toISOString() }
        }
      });
      if (todayCount >= rule.limitPerDay) {
        return { valid: false, rule, reason: "已达每日上限", todayCount };
      }
    }
    if (rule.limitPerDayPerUser > 0) {
      const today = /* @__PURE__ */ new Date();
      today.setHours(0, 0, 0, 0);
      const userTodayCount = await strapi.db.query("plugin::zhao-point.point-record").count({
        where: {
          user: params.userId,
          action: params.action,
          createdAt: { $gte: today.toISOString() }
        }
      });
      if (userTodayCount >= rule.limitPerDayPerUser) {
        return { valid: false, rule, reason: "已达个人每日上限" };
      }
    }
    return { valid: true, rule };
  };
  const getEligibleActions = async (userId, channelId) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const allRules = await pointService.getRules({ category: "increase", enabled: true });
    const eligible = [];
    for (const rule of allRules) {
      const validation = await validateAction({ userId, action: rule.action });
      eligible.push({
        action: rule.action,
        description: rule.description,
        points: rule.points,
        limitPerDay: rule.limitPerDay,
        isOneTime: rule.isOneTime,
        canEarn: validation.valid,
        reason: validation.reason || null
      });
    }
    return eligible;
  };
  const getTemplates = async (filters) => {
    const where = {};
    if (filters?.category) where.category = filters.category;
    if (filters?.enabled !== void 0) where.enabled = filters.enabled;
    return await strapi.db.query(TEMPLATE_UID).findMany({
      where,
      orderBy: { name: "asc" }
    });
  };
  const createTemplate = async (data) => {
    return await strapi.db.query(TEMPLATE_UID).create({ data });
  };
  const updateTemplate = async (id, data) => {
    return await strapi.db.query(TEMPLATE_UID).update({ where: { id }, data });
  };
  const deleteTemplate = async (id) => {
    const template = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id } });
    if (template?.builtIn) {
      throwErr("RULE_001", 400, "内置模板不可删除");
    }
    return await strapi.db.query(TEMPLATE_UID).delete({ where: { id } });
  };
  const applyTemplate = async (templateId, targetAction) => {
    const template = await strapi.db.query(TEMPLATE_UID).findOne({ where: { id: templateId } });
    if (!template) {
      throwErr("RULE_002", 404, "模板不存在");
    }
    const pointService = strapi.plugin("zhao-point").service("point");
    return await pointService.upsertRule({
      action: targetAction,
      category: template.category,
      points: template.defaultPoints,
      limitPerDay: template.defaultLimitPerDay,
      isOneTime: template.defaultIsOneTime,
      description: template.description,
      enabled: true
    });
  };
  const batchEnableActions = async (actions, enabled) => {
    const pointService = strapi.plugin("zhao-point").service("point");
    const rules = await pointService.getDBRules();
    let count = 0;
    for (const action of actions) {
      if (rules[action]) {
        rules[action].enabled = enabled;
        count++;
      } else {
        const defaultConfig = pointService.getDefaultConfig();
        const defaultRule = defaultConfig.increaseRules[action] || defaultConfig.decreaseRules[action];
        if (defaultRule) {
          rules[action] = { ...defaultRule, enabled };
          count++;
        }
      }
    }
    const store = strapi.store({ type: "plugin", name: "zhao-point" });
    await store.set({ key: "rules", value: rules });
    return { updated: count };
  };
  return {
    validateAction,
    getEligibleActions,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    applyTemplate,
    batchEnableActions
  };
};
const VERIFICATION_UID = "plugin::zhao-point.channel-verification";
const verification = ({ strapi }) => {
  const throwError = (code, message, details) => {
    const err = new Error(message);
    err.code = code;
    err.details = details;
    throw err;
  };
  const generateQRCode = async (params) => {
    const { verifierId, channelId, direction } = params;
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 5 * 60 * 1e3);
    const verification2 = await strapi.db.query(VERIFICATION_UID).create({
      data: {
        verifier: verifierId,
        channel: channelId,
        direction,
        method: "qr_scan",
        status: "pending",
        qrCodeToken: token,
        qrCodeExpiresAt: expiresAt.toISOString(),
        createdAt: /* @__PURE__ */ new Date()
      }
    });
    return {
      token,
      qrCodeData: JSON.stringify({
        type: "point-verify",
        token,
        channelId,
        expiresAt: expiresAt.toISOString()
      }),
      expiresAt: expiresAt.toISOString(),
      verificationId: verification2.id
    };
  };
  const verifyByQRCode = async (params) => {
    const { token, verifiedUserId, verifierId, location } = params;
    const pending = await strapi.db.query(VERIFICATION_UID).findOne({
      where: { qrCodeToken: token, status: "pending" }
    });
    if (!pending) {
      throwError("POINT_017", "核销码无效或已过期");
    }
    if (pending.qrCodeExpiresAt && new Date(pending.qrCodeExpiresAt) < /* @__PURE__ */ new Date()) {
      await strapi.db.query(VERIFICATION_UID).update({
        where: { id: pending.id },
        data: { status: "rejected", remark: "核销码已过期" }
      });
      throwError("POINT_017", "核销码已过期");
    }
    const actualVerifier = verifierId || pending.verifier;
    const hierarchyCheck = await verifyChannelHierarchy({
      verifierId: actualVerifier,
      verifiedUserId,
      channelId: pending.channel
    });
    if (!hierarchyCheck.valid) {
      throwError("POINT_018", "渠道层级关系校验失败", hierarchyCheck);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const updated = await strapi.db.query(VERIFICATION_UID).update({
      where: { id: pending.id },
      data: {
        status: "approved",
        verifiedUser: verifiedUserId,
        verifier: actualVerifier,
        location: location || void 0,
        verifiedAt: now
      }
    });
    try {
      const pointService = strapi.plugin("zhao-point").service("point");
      await pointService.earnPoints({
        userId: verifiedUserId,
        action: "qr_scan_verify",
        source: "channel_verification",
        method: "扫码核销奖励",
        channelId: pending.channel
      });
    } catch {
    }
    return updated;
  };
  const manualVerify = async (params) => {
    const { verifierId, verifiedUserId, channelId, direction, remark } = params;
    const hierarchyCheck = await verifyChannelHierarchy({
      verifierId,
      verifiedUserId,
      channelId
    });
    if (!hierarchyCheck.valid) {
      throwError("POINT_018", "渠道层级关系校验失败", hierarchyCheck);
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const verification2 = await strapi.db.query(VERIFICATION_UID).create({
      data: {
        verifier: verifierId,
        verifiedUser: verifiedUserId,
        channel: channelId,
        direction,
        method: "manual",
        status: "approved",
        remark: remark || "",
        verifiedAt: now,
        createdAt: now
      }
    });
    return verification2;
  };
  const verifyChannelHierarchy = async (params) => {
    try {
      const channelService = strapi.plugin("zhao-channel").service("channel");
      if (channelService) {
        const result = await channelService.verifyHierarchy({
          userId1: params.verifierId,
          userId2: params.verifiedUserId,
          channelId: params.channelId
        });
        return result;
      }
    } catch {
    }
    return { valid: true, relationship: "unknown", path: [] };
  };
  const getVerificationLog = async (filters) => {
    const {
      verifierId,
      verifiedUserId,
      channelId,
      direction,
      status,
      method,
      startDate,
      endDate,
      page = 1,
      pageSize = 20,
      extraWhere
    } = filters || {};
    const where = {};
    if (verifierId) where.verifier = verifierId;
    if (verifiedUserId) where.verifiedUser = verifiedUserId;
    if (channelId) where.channel = channelId;
    if (direction) where.direction = direction;
    if (status) where.status = status;
    if (method) where.method = method;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }
    if (extraWhere && typeof extraWhere === "object" && !Array.isArray(extraWhere)) {
      Object.assign(where, extraWhere);
    }
    const [records, total] = await Promise.all([
      strapi.db.query(VERIFICATION_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize
      }),
      strapi.db.query(VERIFICATION_UID).count({ where })
    ]);
    return { records, total, page, pageSize };
  };
  const getVerificationStats = async (channelId) => {
    const baseWhere = {};
    if (channelId) baseWhere.channel = channelId;
    const allRecords = await strapi.db.query(VERIFICATION_UID).findMany({
      where: baseWhere
    });
    const stats = {
      totalVerifications: allRecords.length,
      approved: 0,
      rejected: 0,
      pending: 0,
      byDirection: {
        superiorToSubordinate: 0,
        subordinateToSuperior: 0
      }
    };
    allRecords.forEach((r) => {
      if (r.status === "approved") stats.approved++;
      else if (r.status === "rejected") stats.rejected++;
      else if (r.status === "pending") stats.pending++;
      if (r.direction === "superior_to_subordinate") stats.byDirection.superiorToSubordinate++;
      else stats.byDirection.subordinateToSuperior++;
    });
    return stats;
  };
  return {
    generateQRCode,
    verifyByQRCode,
    manualVerify,
    verifyChannelHierarchy,
    getVerificationLog,
    getVerificationStats
  };
};
const CONFIG_UID = "plugin::zhao-point.point-config";
const TYPE_UID = "plugin::zhao-point.point-type";
const configService = ({ strapi }) => {
  const getConfig = async () => {
    let config2 = await strapi.db.query(CONFIG_UID).findOne();
    if (!config2) {
      config2 = await strapi.db.query(CONFIG_UID).create({
        data: {
          moduleEnabled: true,
          earnEnabled: true,
          redeemEnabled: true,
          expiryEnabled: false,
          expiryDays: 365,
          expiryReminderDays: 7,
          minRedeemPoints: 0,
          maxDailyEarn: 0,
          defaultExchangeRate: 1,
          signInEnabled: true,
          tasksEnabled: true
        }
      });
    }
    return config2;
  };
  const updateConfig = async (data) => {
    let config2 = await strapi.db.query(CONFIG_UID).findOne();
    if (config2) {
      config2 = await strapi.db.query(CONFIG_UID).update({
        where: { id: config2.id },
        data
      });
    } else {
      config2 = await strapi.db.query(CONFIG_UID).create({ data });
    }
    return config2;
  };
  const isModuleEnabled = async (moduleName) => {
    try {
      const config2 = await getConfig();
      if (!config2.moduleEnabled) return false;
      if (moduleName === "earn" && !config2.earnEnabled) return false;
      if (moduleName === "redeem" && !config2.redeemEnabled) return false;
      return true;
    } catch {
      return true;
    }
  };
  const getDashboardStats = async () => {
    const RECORD_UID2 = "plugin::zhao-point.point-record";
    const REDEMPTION_UID2 = "plugin::zhao-point.point-redemption";
    const LOCATION_UID = "plugin::zhao-point.pickup-location";
    const now = /* @__PURE__ */ new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const increaseRecords = await strapi.db.query(RECORD_UID2).findMany({
      where: { type: "increase" },
      select: ["points", "user", "action", "createdAt"]
    });
    const decreaseRecords = await strapi.db.query(RECORD_UID2).findMany({
      where: { type: "decrease" },
      select: ["points"]
    });
    let totalPointsIssued = 0;
    let totalPointsSpent = 0;
    const activeUsersSet = /* @__PURE__ */ new Set();
    const todayActions = [];
    increaseRecords.forEach((r) => {
      totalPointsIssued += Math.abs(r.points);
      if (new Date(r.createdAt) >= startOfToday) {
        activeUsersSet.add(r.user?.id || r.user);
        todayActions.push(r);
      }
    });
    decreaseRecords.forEach((r) => {
      totalPointsSpent += Math.abs(r.points);
    });
    const pendingRedemptions = await strapi.db.query(REDEMPTION_UID2).count({
      where: { status: "pending", deletedAt: null }
    });
    const pendingPickups = await strapi.db.query(REDEMPTION_UID2).count({
      where: { status: "approved", deliveryType: "self_pickup", deletedAt: null }
    });
    const pickupLocationCount = await strapi.db.query(LOCATION_UID).count({
      where: { status: "active", deletedAt: null }
    });
    const config2 = await getConfig();
    let expiringSoonPoints = 0;
    if (config2?.expiryEnabled) {
      const reminderDate = /* @__PURE__ */ new Date();
      reminderDate.setDate(reminderDate.getDate() + (config2.expiryReminderDays || 7));
      const expiringRecords = await strapi.db.query(RECORD_UID2).findMany({
        where: {
          type: "increase",
          expiresAt: {
            $gte: (/* @__PURE__ */ new Date()).toISOString(),
            $lte: reminderDate.toISOString()
          },
          expiredAt: null
        }
      });
      expiringSoonPoints = expiringRecords.reduce((sum, r) => sum + Math.abs(r.points), 0);
    }
    const actionCounts = {};
    todayActions.forEach((r) => {
      if (!actionCounts[r.action]) {
        actionCounts[r.action] = { count: 0, totalPoints: 0 };
      }
      actionCounts[r.action].count++;
      actionCounts[r.action].totalPoints += Math.abs(r.points);
    });
    const topEarnActions = Object.entries(actionCounts).map(([action, data]) => ({ action, ...data })).sort((a, b) => b.totalPoints - a.totalPoints).slice(0, 10);
    return {
      totalUsers: activeUsersSet.size,
      activeUsersToday: activeUsersSet.size,
      activeUsers: activeUsersSet.size,
      totalPointsIssued,
      totalIssued: totalPointsIssued,
      totalPointsSpent,
      totalRedeemed: totalPointsSpent,
      totalBalance: totalPointsIssued - totalPointsSpent,
      pendingRedemptions,
      pendingPickups,
      pickupLocationCount,
      expiringSoonPoints,
      topEarnActions
    };
  };
  return {
    getConfig,
    updateConfig,
    isModuleEnabled,
    getDashboardStats,
    // Point-type CRUD
    findTypes: async (filters = {}) => strapi.documents(TYPE_UID).findMany({ filters }),
    findOneType: async (documentId) => strapi.documents(TYPE_UID).findOne({ documentId }),
    createType: async (data) => strapi.documents(TYPE_UID).create({ data }),
    updateType: async (documentId, data) => strapi.documents(TYPE_UID).update({ documentId, data }),
    deleteType: async (documentId) => strapi.documents(TYPE_UID).delete({ documentId })
  };
};
const SIGN_IN_UID = "plugin::zhao-point.sign-in-record";
const signIn = ({ strapi }) => {
  const signIn2 = async (userId) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: today }
    });
    if (todayRecord) {
      const e = new Error("今天已签到");
      e.code = "SIGN_001";
      e.status = 400;
      throw e;
    }
    const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
    const yesterdayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: yesterday }
    });
    const streakDays = yesterdayRecord ? (yesterdayRecord.streakDays || 0) + 1 : 1;
    const pointService = strapi.plugin("zhao-point").service("point");
    let totalEarned = 0;
    let fixedResult = null;
    try {
      fixedResult = await pointService.earnPoints({
        userId,
        action: "daily_sign_in"
      });
      totalEarned += fixedResult?.points || 0;
    } catch (e) {
      strapi.log.warn(`[sign-in] daily_sign_in 积分获取失败: ${e.message}`);
    }
    let isStreakReward = false;
    const streakRule = await pointService.getMergedRule("daily_sign_in_streak");
    if (streakRule?.enabled && streakRule.extraConfig) {
      let extraConfig = {};
      try {
        extraConfig = typeof streakRule.extraConfig === "string" ? JSON.parse(streakRule.extraConfig) : streakRule.extraConfig;
      } catch {
      }
      const milestones = Array.isArray(extraConfig.streakMilestones) ? extraConfig.streakMilestones : [];
      const bonusPoints = Array.isArray(extraConfig.streakBonusPoints) ? extraConfig.streakBonusPoints : [];
      const milestoneIdx = milestones.indexOf(streakDays);
      if (milestoneIdx !== -1 && bonusPoints[milestoneIdx]) {
        try {
          await pointService.earnCustomPoints({
            userId,
            action: "daily_sign_in_streak",
            points: bonusPoints[milestoneIdx],
            remark: `连续签到${streakDays}天奖励${bonusPoints[milestoneIdx]}积分`
          });
          totalEarned += bonusPoints[milestoneIdx];
          isStreakReward = true;
        } catch (e) {
          strapi.log.warn(`[sign-in] daily_sign_in_streak 积分获取失败: ${e.message}`);
        }
      }
    }
    await strapi.db.query(SIGN_IN_UID).create({
      data: {
        user: userId,
        signInDate: today,
        streakDays,
        pointsEarned: totalEarned,
        isStreakReward
      }
    });
    return { signInDate: today, streakDays, pointsEarned: totalEarned, isStreakReward };
  };
  const getSignInStatus = async (userId) => {
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId, signInDate: today }
    });
    const lastRecord = await strapi.db.query(SIGN_IN_UID).findOne({
      where: { user: userId },
      orderBy: { signInDate: "desc" }
    });
    let streakDays = 0;
    if (todayRecord) {
      streakDays = todayRecord.streakDays || 1;
    } else if (lastRecord) {
      const yesterday = new Date(Date.now() - 864e5).toISOString().slice(0, 10);
      if (lastRecord.signInDate === yesterday) {
        streakDays = lastRecord.streakDays || 0;
      }
    }
    const thirtyDaysAgo = new Date(Date.now() - 30 * 864e5).toISOString().slice(0, 10);
    const recentRecords = await strapi.db.query(SIGN_IN_UID).findMany({
      where: { user: userId, signInDate: { $gte: thirtyDaysAgo } },
      orderBy: { signInDate: "asc" }
    });
    return {
      isSignedInToday: !!todayRecord,
      streakDays: streakDays || 0,
      recentDates: recentRecords.map((r) => r.signInDate)
    };
  };
  return { signIn: signIn2, getSignInStatus };
};
const services = {
  point,
  redemption,
  "rule-engine": ruleEngine,
  verification,
  "config-service": configService,
  "sign-in": signIn
};
const publicRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false }
});
const userRoute = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"]
  }
});
const channelScopeRoute = (method, path, handler, permission) => ({
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
const contentApi = () => ({
  type: "content-api",
  routes: [
    // ===== 公开路由 =====
    publicRoute("GET", "/point/rules", "point.rules"),
    userRoute("GET", "/point/products", "point.listProducts"),
    userRoute("GET", "/point/products/:id", "point.getProduct"),
    publicRoute("GET", "/point/pickup-locations", "point.listPickupLocations"),
    publicRoute("GET", "/point/pickup-locations/:id", "point.getPickupLocation"),
    publicRoute("GET", "/point/exchange-rate", "point.getExchangeRate"),
    publicRoute("GET", "/point/feature-flags", "point.getFeatureFlags"),
    // ===== 注册用户路由 =====
    userRoute("GET", "/my/point/balance", "point.balance"),
    userRoute("GET", "/my/point/records", "point.records"),
    userRoute("GET", "/my/point/statistics", "point.statistics"),
    userRoute("POST", "/my/point/redeem", "point.redeem"),
    userRoute("GET", "/my/point/redeem/records", "point.redeemRecords"),
    userRoute("POST", "/my/point/verify/qrcode", "point.generateQRCode"),
    userRoute("POST", "/my/point/verify/scan", "point.verifyByQRCode"),
    userRoute("POST", "/my/point/verify/manual", "point.manualVerify"),
    userRoute("GET", "/my/point/verify/log", "point.getMyVerifications"),
    userRoute("GET", "/my/point/eligible-actions", "point.getEligibleActions"),
    userRoute("POST", "/my/point/sign-in", "point.signIn"),
    userRoute("GET", "/my/point/sign-in/status", "point.getSignInStatus"),
    userRoute("GET", "/my/point/tasks", "point.getTasks"),
    // ===== 管理员路由（需渠道作用域） =====
    channelScopeRoute("POST", "/point/earn", "point.earn", "point.grant"),
    channelScopeRoute("POST", "/point/deduct", "point.deduct", "point.grant"),
    // 积分类型
    channelScopeRoute("GET", "/point-types", "point-admin.findTypes", "point-type.read"),
    channelScopeRoute("GET", "/point-types/:documentId", "point-admin.findOneType", "point-type.read"),
    channelScopeRoute("POST", "/point-types", "point-admin.createType", "point-type.create"),
    channelScopeRoute("PUT", "/point-types/:documentId", "point-admin.updateType", "point-type.update"),
    channelScopeRoute("DELETE", "/point-types/:documentId", "point-admin.deleteType", "point-type.delete"),
    // 积分规则
    channelScopeRoute("GET", "/point-rules", "point-admin.findRules", "point-rule.read"),
    channelScopeRoute("GET", "/point-rules/:documentId", "point-admin.findOneRule", "point-rule.read"),
    channelScopeRoute("POST", "/point-rules", "point-admin.createRule", "point-rule.create"),
    channelScopeRoute("PUT", "/point-rules/:documentId", "point-admin.updateRule", "point-rule.update"),
    channelScopeRoute("DELETE", "/point-rules/:documentId", "point-admin.deleteRule", "point-rule.delete"),
    channelScopeRoute("POST", "/point-rules/batch-enable", "point-admin.batchEnableRules", "point-rule.update"),
    // 积分模板
    channelScopeRoute("GET", "/rule-templates", "point-admin.findTemplates", "point-template.read"),
    channelScopeRoute("POST", "/rule-templates", "point-admin.createTemplate", "point-template.create"),
    channelScopeRoute("PUT", "/rule-templates/:documentId", "point-admin.updateTemplate", "point-template.update"),
    channelScopeRoute("DELETE", "/rule-templates/:documentId", "point-admin.deleteTemplate", "point-template.delete"),
    channelScopeRoute("POST", "/rule-templates/:documentId/apply", "point-admin.applyTemplate", "point-template.create"),
    // 积分记录
    channelScopeRoute("GET", "/point-records", "point-admin.findRecords", "point-record.read"),
    channelScopeRoute("GET", "/point-records/:documentId", "point-admin.findOneRecord", "point-record.read"),
    channelScopeRoute("POST", "/point-records/admin-adjust", "point-admin.adminAdjust", "point-record.create"),
    channelScopeRoute("POST", "/point-records/batch-adjust", "point-admin.batchAdjust", "point-record.create"),
    channelScopeRoute("GET", "/point-records/statistics", "point-admin.getRecordStats", "point-record.read"),
    // 积分兑换
    channelScopeRoute("GET", "/point-redemptions", "point-admin.findRedemptions", "point-exchange.read"),
    channelScopeRoute("GET", "/point-redemptions/:documentId", "point-admin.findOneRedemption", "point-exchange.read"),
    channelScopeRoute("PUT", "/point-redemptions/:documentId", "point-admin.updateRedemption", "point-exchange.update"),
    channelScopeRoute("POST", "/point-redemptions/verify-pickup", "point.verifyPickup", "point-exchange.update"),
    // 自提点
    channelScopeRoute("GET", "/pickup-locations", "point-admin.findPickupLocations", "pickup-location.read"),
    channelScopeRoute("GET", "/pickup-locations/:documentId", "point-admin.findOnePickupLocation", "pickup-location.read"),
    channelScopeRoute("POST", "/pickup-locations", "point-admin.createPickupLocation", "pickup-location.create"),
    channelScopeRoute("PUT", "/pickup-locations/:documentId", "point-admin.updatePickupLocation", "pickup-location.update"),
    channelScopeRoute("DELETE", "/pickup-locations/:documentId", "point-admin.deletePickupLocation", "pickup-location.delete"),
    // 积分商品
    channelScopeRoute("GET", "/products", "point-admin.findProducts", "point-product.read"),
    channelScopeRoute("GET", "/products/:documentId", "point-admin.findOneProduct", "point-product.read"),
    channelScopeRoute("POST", "/products", "point-admin.createProduct", "point-product.create"),
    channelScopeRoute("PUT", "/products/:documentId", "point-admin.updateProduct", "point-product.update"),
    channelScopeRoute("DELETE", "/products/:documentId", "point-admin.deleteProduct", "point-product.delete"),
    channelScopeRoute("POST", "/products/:documentId/stock", "point-admin.adjustStock", "point-product.update"),
    // 积分配置
    channelScopeRoute("GET", "/config", "point-admin.getConfig", "point-config.read"),
    channelScopeRoute("PUT", "/config", "point-admin.updateConfig", "point-config.update"),
    // 核销
    channelScopeRoute("GET", "/verifications", "point-admin.findVerifications", "point-verification.read"),
    channelScopeRoute("GET", "/verifications/:documentId", "point-admin.findOneVerification", "point-verification.read"),
    channelScopeRoute("GET", "/verifications/stats", "point-admin.getVerificationStats", "point-verification.read"),
    // 签到记录
    channelScopeRoute("GET", "/sign-in-records", "point-admin.findSignInRecords", "point-record.read"),
    // 仪表盘
    channelScopeRoute("GET", "/dashboard", "point-admin.getDashboard", "point-dashboard.read")
  ]
});
const contentApiRoutes = contentApi();
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes
  }
};
const policies = {};
const middlewares = {};
const index = {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  contentTypes,
  services,
  routes,
  policies,
  middlewares
};
export {
  index as default
};
