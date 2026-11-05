import crypto, { randomUUID, createHmac } from "crypto";
import require$$0$1 from "child_process";
import require$$0$2 from "os";
import require$$0$4 from "path";
import require$$0$3 from "fs";
import require$$0$5 from "assert";
import require$$2 from "events";
import require$$0$7 from "buffer";
import require$$0$6 from "stream";
import require$$2$1 from "util";
import "node:stream";
import * as XLSX from "xlsx";
import jwt from "jsonwebtoken";
const actions = [
  { section: "plugins", pluginName: "zhao-tire", uid: "order.read", displayName: "读取订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.accept", displayName: "接单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.reject", displayName: "拒绝订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.update", displayName: "修改订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.inbound", displayName: "入库登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.outbound", displayName: "出库登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.payment", displayName: "收款登记" },
  { section: "plugins", pluginName: "zhao-tire", uid: "payment.read", displayName: "查看支付流水" },
  { section: "plugins", pluginName: "zhao-tire", uid: "order.export", displayName: "导出订单" },
  { section: "plugins", pluginName: "zhao-tire", uid: "package.manage", displayName: "管理套餐" },
  { section: "plugins", pluginName: "zhao-tire", uid: "config.manage", displayName: "管理站点配置" },
  { section: "plugins", pluginName: "zhao-tire", uid: "content.manage", displayName: "管理站点内容" },
  { section: "plugins", pluginName: "zhao-tire", uid: "customer.read", displayName: "查看客户" },
  { section: "plugins", pluginName: "zhao-tire", uid: "sms.manage", displayName: "管理短信通知" }
];
const register = ({ strapi: strapi2 }) => {
  strapi2.log.info("[zhao-tire] register");
  try {
    strapi2.admin.services.permission.actionProvider.registerMany(actions);
  } catch (err) {
    strapi2.log.warn(`[zhao-tire] permission actions register failed: ${err}`);
  }
};
const ORDER_UID$b = "plugin::zhao-tire.tire-order";
const TIMEZONE_OFFSET_MS$2 = 8 * 60 * 60 * 1e3;
const REMIND_OFFSETS = [
  { days: 7, type: "due_7" },
  { days: 3, type: "due_3" }
];
const dateAfter$1 = (offsetDays, now = /* @__PURE__ */ new Date()) => new Date(now.getTime() + TIMEZONE_OFFSET_MS$2 + offsetDays * 864e5).toISOString().slice(0, 10);
const runExpiryReminder = async ({ strapi: strapi2 }) => {
  const notify2 = strapi2.plugin("zhao-tire").service("notify");
  let total = 0;
  for (const target of REMIND_OFFSETS) {
    const expireAt = dateAfter$1(target.days);
    const orders = await strapi2.db.query(ORDER_UID$b).findMany({
      where: { status: "stored", expireAt }
    });
    for (const order2 of orders) {
      try {
        await notify2.enqueue(target.type, order2, {
          daysLeft: target.days,
          expireAt
        });
        total += 1;
      } catch (error2) {
        strapi2.log.warn(
          `[zhao-tire] ${target.type} 提醒生成失败（${order2?.orderNo}）：${error2}`
        );
      }
    }
  }
  strapi2.log.info(`[zhao-tire] 临期提醒扫描完成，共处理 ${total} 个订单`);
  return total;
};
const PACKAGE_UID$3 = "plugin::zhao-tire.tire-package";
const ADDON_UID$2 = "plugin::zhao-tire.tire-addon";
const FAQ_UID$2 = "plugin::zhao-tire.tire-faq";
const REVIEW_UID$1 = "plugin::zhao-tire.tire-review";
const CONFIG_UID$8 = "plugin::zhao-tire.tire-config";
const PACKAGES = [
  {
    name: "标准寄存",
    code: "standard",
    baseMonths: 6,
    storePrice: 3e3,
    pickupPrice: 3e3,
    extraMonthPrice: 3e3,
    overdueDayPrice: 3e3,
    durationText: "最长存至 2027-05-01",
    highlights: [
      "原价 80 元 / 6 个月，会员价 60 元 / 6 个月",
      "限时优惠 30 元 / 6 个月（即日起至 11 月 30 日）",
      "介绍 3 人存胎（达成交易）免费",
      "独立仓位，干燥避光",
      "入库拍照建档，出库核对",
      "到期前 7 天、3 天各提醒一次",
      "丢失按协议赔付"
    ],
    enabled: true,
    sort: 0
  }
];
const ADDONS = [
  {
    name: "精存（打油缠保鲜膜）",
    code: "valve-care",
    price: 6e3,
    unitText: "套",
    enabled: true,
    sort: 0
  }
];
const FAQS = [
  {
    question: "寄存从什么时候开始比较合适？",
    answer: "建议在换季降温后、第一场雪前完成寄存。当天取胎、当天入库，入库后可在订单详情查看仓位与实拍照片。"
  },
  {
    question: "上门取胎怎么约时间？",
    answer: "下单时选择「上门取胎」并选择上午或下午时段。每个时段有预约上限，约满后该时段会置灰，请改选其他日期或时段。"
  },
  {
    question: "轮胎入库后会做哪些记录？",
    answer: "仓库会对每套轮胎拍摄胎侧、花纹与套装照片，登记独立仓位编号与入库时间，照片长期保存在订单档案中。"
  },
  {
    question: "寄存到期了怎么办？",
    answer: "到期前 7 天和 3 天会短信提醒。可以线上续费延长存期，或提交出库申请；超期未取按天计收超期保管费，超过协议约定期限按无主轮胎处理。"
  },
  {
    question: "取回时需要带什么？",
    answer: "报订单号或手机号即可，仓库核对仓位编号与出库照片后交付，建议本人到场或提前告知代取人信息。"
  },
  {
    question: "轮胎丢失或损坏怎么赔付？",
    answer: "以入库照片与仓位记录为准。因仓库保管不当造成的丢失或损坏，按协议约定赔付；自然老化、原有损伤不在赔付范围。"
  }
];
const REVIEWS = [
  {
    nickname: "李女士",
    content: "上门取胎很准时，入库照片拍得清楚，仓位号也能查到，换季不用自己搬轮胎了。",
    rating: 5,
    showOnHome: true,
    sort: 0
  },
  {
    nickname: "王先生",
    content: "第二年续存直接在手机上操作，到期前有短信提醒，省心。",
    rating: 5,
    showOnHome: true,
    sort: 1
  },
  {
    nickname: "张先生",
    content: "仓库干燥，取胎时轮胎状态和入库照片一致，核对很仔细。",
    rating: 4,
    showOnHome: true,
    sort: 2
  }
];
const AGREEMENT_TEXT = `<h3>轮胎寄存须知及赔付协议</h3>
<p>一、寄存范围：本服务仅受理乘用车、SUV 与皮卡轮胎寄存，寄存前请确认轮胎无严重结构性损伤。</p>
<p>二、入库建档：仓库在入库时拍摄胎侧、花纹与套装照片并登记仓位编号，照片与仓位记录作为取回与赔付依据。</p>
<p>三、寄存期限：本季寄存最长至 2027 年 5 月 1 日。到期前 7 天、3 天通过短信提醒；超期未取按天计收超期保管费。</p>
<p>四、续费与出库：可在订单详情在线申请续费或提交出库申请，出库申请经商家审核后安排取回。</p>
<p>五、赔付约定：因仓库保管不当造成的丢失或损坏，按订单轮胎实际价值与协议约定赔付；自然老化、原有损伤、胎压异常等非保管原因不在赔付范围。</p>
<p>六、无主处理：超过约定寄存期限且经两次提醒仍未续费、未取回的轮胎，视为无主物品，商家可按约定自行处理。</p>
<p>七、其他：本协议未尽事宜由双方协商解决，商家对协议内容保留最终解释权。</p>`;
const DEFAULT_BANNER_TITLE = "雪地胎专业寄存";
const DEFAULT_BANNER_SUBTITLE = "恒温仓储 · 建档留痕 · 到期提醒";
const seed = async ({ strapi: strapi2 }) => {
  const logger = strapi2.log;
  try {
    const packageCount = await strapi2.documents(PACKAGE_UID$3).count({});
    if (packageCount === 0) {
      for (const data of PACKAGES) {
        await strapi2.documents(PACKAGE_UID$3).create({ data });
      }
      logger.info("[zhao-tire] seed: 套餐已创建");
    }
    const addonCount = await strapi2.documents(ADDON_UID$2).count({});
    if (addonCount === 0) {
      for (const data of ADDONS) {
        await strapi2.documents(ADDON_UID$2).create({ data });
      }
      logger.info("[zhao-tire] seed: 增值项已创建");
    }
    const faqCount = await strapi2.documents(FAQ_UID$2).count({});
    if (faqCount === 0) {
      for (const data of FAQS) {
        await strapi2.documents(FAQ_UID$2).create({ data });
      }
      logger.info("[zhao-tire] seed: FAQ 已创建");
    }
    const reviewCount = await strapi2.documents(REVIEW_UID$1).count({});
    if (reviewCount === 0) {
      for (const data of REVIEWS) {
        await strapi2.documents(REVIEW_UID$1).create({ data });
      }
      logger.info("[zhao-tire] seed: 评价已创建");
    }
    const config2 = await strapi2.documents(CONFIG_UID$8).findFirst({});
    if (config2 && !config2.bannerTitle) {
      await strapi2.documents(CONFIG_UID$8).update({
        documentId: config2.documentId,
        data: {
          bannerTitle: DEFAULT_BANNER_TITLE,
          bannerSubtitle: DEFAULT_BANNER_SUBTITLE,
          serviceIntro: `<p>净月本地雪地胎寄存服务，提供上门取胎、独立仓位、入库拍照建档与到期提醒。</p>`,
          warehouseConditions: "恒温恒湿独立仓位，避免日晒雨淋；每套轮胎独立编号，入库出库全程留痕；仓位定期巡检，支持预约查看。",
          guarantees: [
            "丢失按协议赔付",
            "入库/出库全程拍照留档",
            "到期前 7 天、3 天短信提醒",
            "独立仓位，不与散胎混放"
          ],
          serviceAreaText: "上门取送范围：长春净月开发区及周边 15 公里内；超出范围可到店送存或联系客服确认。",
          warehouseAddress: "长春市净月开发区福祉大路 588 号（轮胎寄存仓）",
          warehouseLat: 43.7833,
          warehouseLng: 125.4233,
          contactPhone: "0431-8888 6666",
          dailyPickupLimitMorning: 6,
          dailyPickupLimitAfternoon: 6,
          maxStorageDate: "2027-05-01",
          agreementText: AGREEMENT_TEXT,
          announcement: "限时优惠 30 元 / 6 个月（即日起至 11 月 30 日）；介绍 3 人存胎（达成交易）免费。",
          paymentOnlineEnabled: false,
          depositEnabled: false
        }
      });
      logger.info("[zhao-tire] seed: 站点配置已初始化");
    }
  } catch (error2) {
    logger.error(`[zhao-tire] seed failed: ${error2}`);
  }
};
const ADMIN_ROLES = [
  { code: "tire-admin", name: "轮胎管理员" },
  { code: "tire-warehouse", name: "仓库操作员" },
  { code: "tire-cashier", name: "门店收银员" }
];
const ALL_ACTIONS = [
  "order.read",
  "order.accept",
  "order.reject",
  "order.update",
  "order.inbound",
  "order.outbound",
  "order.payment",
  "order.export",
  "payment.read",
  "package.manage",
  "config.manage",
  "content.manage",
  "customer.read",
  "sms.manage"
];
const ROLE_ACTIONS = {
  "tire-admin": ALL_ACTIONS,
  "tire-warehouse": ["order.read", "order.inbound", "order.outbound"],
  // 门店收银：仅查看订单 + 收款登记/确认到账，不含出入库与退款
  "tire-cashier": ["order.read", "order.payment", "payment.read"]
};
const CONFIG_UID$7 = "plugin::zhao-tire.tire-config";
const bootstrap = async ({ strapi: strapi2 }) => {
  const logger = strapi2.log;
  const s = strapi2;
  logger.info("[zhao-tire] bootstrap");
  try {
    for (const role of ADMIN_ROLES) {
      let existing = await s.db.query("admin::role").findOne({ where: { code: role.code } });
      if (!existing) {
        existing = await s.admin.services.role.create(role);
        logger.info(`[zhao-tire] admin role created: ${role.code}`);
      }
      const actions2 = ROLE_ACTIONS[role.code] || [];
      await s.admin.services.role.assignPermissions(
        existing.id,
        actions2.map((uid) => ({ action: `plugin::zhao-tire.${uid}` }))
      );
      logger.info(
        `[zhao-tire] role permissions synced: ${role.code} (${actions2.length})`
      );
    }
  } catch (err) {
    logger.error(`[zhao-tire] admin role init failed: ${err}`);
  }
  try {
    const existing = await s.documents(CONFIG_UID$7).findFirst();
    if (!existing) {
      await s.documents(CONFIG_UID$7).create({ data: {} });
      logger.info("[zhao-tire] tire-config default record created");
    }
  } catch (err) {
    logger.error(`[zhao-tire] tire-config init failed: ${err}`);
  }
  try {
    const indexes = [
      "CREATE UNIQUE INDEX IF NOT EXISTS zhao_tire_payments_idem_uk ON zhao_tire_payments (idempotency_key)",
      "CREATE UNIQUE INDEX IF NOT EXISTS zhao_tire_payments_no_uk ON zhao_tire_payments (payment_no)",
      "CREATE UNIQUE INDEX IF NOT EXISTS zhao_tire_share_dedupe_uk ON zhao_tire_share_records (dedupe_key)",
      "CREATE UNIQUE INDEX IF NOT EXISTS zhao_tire_reward_no_uk ON zhao_tire_referral_rewards (reward_no)"
    ];
    for (const sql of indexes) {
      await s.db.connection.raw(sql);
    }
    logger.info("[zhao-tire] unique indexes ensured");
  } catch (err) {
    logger.error(`[zhao-tire] unique index init failed: ${err}`);
  }
  try {
    s.cron.add({
      "tire-expiry-reminder": {
        task: runExpiryReminder,
        options: { rule: "0 9 * * *", tz: "Asia/Shanghai" }
      }
    });
    logger.info("[zhao-tire] cron registered: tire-expiry-reminder");
  } catch (err) {
    logger.error(`[zhao-tire] cron register failed: ${err}`);
  }
  await seed({ strapi: strapi2 });
};
var commonjsGlobal = typeof globalThis !== "undefined" ? globalThis : typeof window !== "undefined" ? window : typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : {};
function getDefaultExportFromCjs(x) {
  return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, "default") ? x["default"] : x;
}
var lodash$1 = { exports: {} };
/**
 * @license
 * Lodash <https://lodash.com/>
 * Copyright OpenJS Foundation and other contributors <https://openjsf.org/>
 * Released under MIT license <https://lodash.com/license>
 * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
 * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 */
var lodash = lodash$1.exports;
var hasRequiredLodash;
function requireLodash() {
  if (hasRequiredLodash) return lodash$1.exports;
  hasRequiredLodash = 1;
  (function(module, exports) {
    (function() {
      var undefined$1;
      var VERSION = "4.18.1";
      var LARGE_ARRAY_SIZE = 200;
      var CORE_ERROR_TEXT = "Unsupported core-js use. Try https://npms.io/search?q=ponyfill.", FUNC_ERROR_TEXT = "Expected a function", INVALID_TEMPL_VAR_ERROR_TEXT = "Invalid `variable` option passed into `_.template`", INVALID_TEMPL_IMPORTS_ERROR_TEXT = "Invalid `imports` option passed into `_.template`";
      var HASH_UNDEFINED = "__lodash_hash_undefined__";
      var MAX_MEMOIZE_SIZE = 500;
      var PLACEHOLDER = "__lodash_placeholder__";
      var CLONE_DEEP_FLAG = 1, CLONE_FLAT_FLAG = 2, CLONE_SYMBOLS_FLAG = 4;
      var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
      var WRAP_BIND_FLAG = 1, WRAP_BIND_KEY_FLAG = 2, WRAP_CURRY_BOUND_FLAG = 4, WRAP_CURRY_FLAG = 8, WRAP_CURRY_RIGHT_FLAG = 16, WRAP_PARTIAL_FLAG = 32, WRAP_PARTIAL_RIGHT_FLAG = 64, WRAP_ARY_FLAG = 128, WRAP_REARG_FLAG = 256, WRAP_FLIP_FLAG = 512;
      var DEFAULT_TRUNC_LENGTH = 30, DEFAULT_TRUNC_OMISSION = "...";
      var HOT_COUNT = 800, HOT_SPAN = 16;
      var LAZY_FILTER_FLAG = 1, LAZY_MAP_FLAG = 2, LAZY_WHILE_FLAG = 3;
      var INFINITY = 1 / 0, MAX_SAFE_INTEGER = 9007199254740991, MAX_INTEGER = 17976931348623157e292, NAN = 0 / 0;
      var MAX_ARRAY_LENGTH = 4294967295, MAX_ARRAY_INDEX = MAX_ARRAY_LENGTH - 1, HALF_MAX_ARRAY_LENGTH = MAX_ARRAY_LENGTH >>> 1;
      var wrapFlags = [
        ["ary", WRAP_ARY_FLAG],
        ["bind", WRAP_BIND_FLAG],
        ["bindKey", WRAP_BIND_KEY_FLAG],
        ["curry", WRAP_CURRY_FLAG],
        ["curryRight", WRAP_CURRY_RIGHT_FLAG],
        ["flip", WRAP_FLIP_FLAG],
        ["partial", WRAP_PARTIAL_FLAG],
        ["partialRight", WRAP_PARTIAL_RIGHT_FLAG],
        ["rearg", WRAP_REARG_FLAG]
      ];
      var argsTag = "[object Arguments]", arrayTag = "[object Array]", asyncTag = "[object AsyncFunction]", boolTag = "[object Boolean]", dateTag = "[object Date]", domExcTag = "[object DOMException]", errorTag = "[object Error]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", mapTag = "[object Map]", numberTag = "[object Number]", nullTag = "[object Null]", objectTag = "[object Object]", promiseTag = "[object Promise]", proxyTag = "[object Proxy]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]", undefinedTag = "[object Undefined]", weakMapTag = "[object WeakMap]", weakSetTag = "[object WeakSet]";
      var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
      var reEmptyStringLeading = /\b__p \+= '';/g, reEmptyStringMiddle = /\b(__p \+=) '' \+/g, reEmptyStringTrailing = /(__e\(.*?\)|\b__t\)) \+\n'';/g;
      var reEscapedHtml = /&(?:amp|lt|gt|quot|#39);/g, reUnescapedHtml = /[&<>"']/g, reHasEscapedHtml = RegExp(reEscapedHtml.source), reHasUnescapedHtml = RegExp(reUnescapedHtml.source);
      var reEscape = /<%-([\s\S]+?)%>/g, reEvaluate = /<%([\s\S]+?)%>/g, reInterpolate = /<%=([\s\S]+?)%>/g;
      var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
      var reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reHasRegExpChar = RegExp(reRegExpChar.source);
      var reTrimStart = /^\s+/;
      var reWhitespace = /\s/;
      var reWrapComment = /\{(?:\n\/\* \[wrapped with .+\] \*\/)?\n?/, reWrapDetails = /\{\n\/\* \[wrapped with (.+)\] \*/, reSplitDetails = /,? & /;
      var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
      var reForbiddenIdentifierChars = /[()=,{}\[\]\/\s]/;
      var reEscapeChar = /\\(\\)?/g;
      var reEsTemplate = /\$\{([^\\}]*(?:\\.[^\\}]*)*)\}/g;
      var reFlags = /\w*$/;
      var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;
      var reIsBinary = /^0b[01]+$/i;
      var reIsHostCtor = /^\[object .+?Constructor\]$/;
      var reIsOctal = /^0o[0-7]+$/i;
      var reIsUint = /^(?:0|[1-9]\d*)$/;
      var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
      var reNoMatch = /($^)/;
      var reUnescapedString = /['\n\r\u2028\u2029\\]/g;
      var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
      var rsApos = "['’]", rsAstral = "[" + rsAstralRange + "]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
      var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
      var reApos = RegExp(rsApos, "g");
      var reComboMark = RegExp(rsCombo, "g");
      var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
      var reUnicodeWord = RegExp([
        rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
        rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
        rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
        rsUpper + "+" + rsOptContrUpper,
        rsOrdUpper,
        rsOrdLower,
        rsDigits,
        rsEmoji
      ].join("|"), "g");
      var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
      var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
      var contextProps = [
        "Array",
        "Buffer",
        "DataView",
        "Date",
        "Error",
        "Float32Array",
        "Float64Array",
        "Function",
        "Int8Array",
        "Int16Array",
        "Int32Array",
        "Map",
        "Math",
        "Object",
        "Promise",
        "RegExp",
        "Set",
        "String",
        "Symbol",
        "TypeError",
        "Uint8Array",
        "Uint8ClampedArray",
        "Uint16Array",
        "Uint32Array",
        "WeakMap",
        "_",
        "clearTimeout",
        "isFinite",
        "parseInt",
        "setTimeout"
      ];
      var templateCounter = -1;
      var typedArrayTags = {};
      typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
      typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
      var cloneableTags = {};
      cloneableTags[argsTag] = cloneableTags[arrayTag] = cloneableTags[arrayBufferTag] = cloneableTags[dataViewTag] = cloneableTags[boolTag] = cloneableTags[dateTag] = cloneableTags[float32Tag] = cloneableTags[float64Tag] = cloneableTags[int8Tag] = cloneableTags[int16Tag] = cloneableTags[int32Tag] = cloneableTags[mapTag] = cloneableTags[numberTag] = cloneableTags[objectTag] = cloneableTags[regexpTag] = cloneableTags[setTag] = cloneableTags[stringTag] = cloneableTags[symbolTag] = cloneableTags[uint8Tag] = cloneableTags[uint8ClampedTag] = cloneableTags[uint16Tag] = cloneableTags[uint32Tag] = true;
      cloneableTags[errorTag] = cloneableTags[funcTag] = cloneableTags[weakMapTag] = false;
      var deburredLetters = {
        // Latin-1 Supplement block.
        "À": "A",
        "Á": "A",
        "Â": "A",
        "Ã": "A",
        "Ä": "A",
        "Å": "A",
        "à": "a",
        "á": "a",
        "â": "a",
        "ã": "a",
        "ä": "a",
        "å": "a",
        "Ç": "C",
        "ç": "c",
        "Ð": "D",
        "ð": "d",
        "È": "E",
        "É": "E",
        "Ê": "E",
        "Ë": "E",
        "è": "e",
        "é": "e",
        "ê": "e",
        "ë": "e",
        "Ì": "I",
        "Í": "I",
        "Î": "I",
        "Ï": "I",
        "ì": "i",
        "í": "i",
        "î": "i",
        "ï": "i",
        "Ñ": "N",
        "ñ": "n",
        "Ò": "O",
        "Ó": "O",
        "Ô": "O",
        "Õ": "O",
        "Ö": "O",
        "Ø": "O",
        "ò": "o",
        "ó": "o",
        "ô": "o",
        "õ": "o",
        "ö": "o",
        "ø": "o",
        "Ù": "U",
        "Ú": "U",
        "Û": "U",
        "Ü": "U",
        "ù": "u",
        "ú": "u",
        "û": "u",
        "ü": "u",
        "Ý": "Y",
        "ý": "y",
        "ÿ": "y",
        "Æ": "Ae",
        "æ": "ae",
        "Þ": "Th",
        "þ": "th",
        "ß": "ss",
        // Latin Extended-A block.
        "Ā": "A",
        "Ă": "A",
        "Ą": "A",
        "ā": "a",
        "ă": "a",
        "ą": "a",
        "Ć": "C",
        "Ĉ": "C",
        "Ċ": "C",
        "Č": "C",
        "ć": "c",
        "ĉ": "c",
        "ċ": "c",
        "č": "c",
        "Ď": "D",
        "Đ": "D",
        "ď": "d",
        "đ": "d",
        "Ē": "E",
        "Ĕ": "E",
        "Ė": "E",
        "Ę": "E",
        "Ě": "E",
        "ē": "e",
        "ĕ": "e",
        "ė": "e",
        "ę": "e",
        "ě": "e",
        "Ĝ": "G",
        "Ğ": "G",
        "Ġ": "G",
        "Ģ": "G",
        "ĝ": "g",
        "ğ": "g",
        "ġ": "g",
        "ģ": "g",
        "Ĥ": "H",
        "Ħ": "H",
        "ĥ": "h",
        "ħ": "h",
        "Ĩ": "I",
        "Ī": "I",
        "Ĭ": "I",
        "Į": "I",
        "İ": "I",
        "ĩ": "i",
        "ī": "i",
        "ĭ": "i",
        "į": "i",
        "ı": "i",
        "Ĵ": "J",
        "ĵ": "j",
        "Ķ": "K",
        "ķ": "k",
        "ĸ": "k",
        "Ĺ": "L",
        "Ļ": "L",
        "Ľ": "L",
        "Ŀ": "L",
        "Ł": "L",
        "ĺ": "l",
        "ļ": "l",
        "ľ": "l",
        "ŀ": "l",
        "ł": "l",
        "Ń": "N",
        "Ņ": "N",
        "Ň": "N",
        "Ŋ": "N",
        "ń": "n",
        "ņ": "n",
        "ň": "n",
        "ŋ": "n",
        "Ō": "O",
        "Ŏ": "O",
        "Ő": "O",
        "ō": "o",
        "ŏ": "o",
        "ő": "o",
        "Ŕ": "R",
        "Ŗ": "R",
        "Ř": "R",
        "ŕ": "r",
        "ŗ": "r",
        "ř": "r",
        "Ś": "S",
        "Ŝ": "S",
        "Ş": "S",
        "Š": "S",
        "ś": "s",
        "ŝ": "s",
        "ş": "s",
        "š": "s",
        "Ţ": "T",
        "Ť": "T",
        "Ŧ": "T",
        "ţ": "t",
        "ť": "t",
        "ŧ": "t",
        "Ũ": "U",
        "Ū": "U",
        "Ŭ": "U",
        "Ů": "U",
        "Ű": "U",
        "Ų": "U",
        "ũ": "u",
        "ū": "u",
        "ŭ": "u",
        "ů": "u",
        "ű": "u",
        "ų": "u",
        "Ŵ": "W",
        "ŵ": "w",
        "Ŷ": "Y",
        "ŷ": "y",
        "Ÿ": "Y",
        "Ź": "Z",
        "Ż": "Z",
        "Ž": "Z",
        "ź": "z",
        "ż": "z",
        "ž": "z",
        "Ĳ": "IJ",
        "ĳ": "ij",
        "Œ": "Oe",
        "œ": "oe",
        "ŉ": "'n",
        "ſ": "s"
      };
      var htmlEscapes = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };
      var htmlUnescapes = {
        "&amp;": "&",
        "&lt;": "<",
        "&gt;": ">",
        "&quot;": '"',
        "&#39;": "'"
      };
      var stringEscapes = {
        "\\": "\\",
        "'": "'",
        "\n": "n",
        "\r": "r",
        "\u2028": "u2028",
        "\u2029": "u2029"
      };
      var freeParseFloat = parseFloat, freeParseInt = parseInt;
      var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
      var freeSelf = typeof self == "object" && self && self.Object === Object && self;
      var root = freeGlobal || freeSelf || Function("return this")();
      var freeExports = exports && !exports.nodeType && exports;
      var freeModule = freeExports && true && module && !module.nodeType && module;
      var moduleExports = freeModule && freeModule.exports === freeExports;
      var freeProcess = moduleExports && freeGlobal.process;
      var nodeUtil = (function() {
        try {
          var types = freeModule && freeModule.require && freeModule.require("util").types;
          if (types) {
            return types;
          }
          return freeProcess && freeProcess.binding && freeProcess.binding("util");
        } catch (e) {
        }
      })();
      var nodeIsArrayBuffer = nodeUtil && nodeUtil.isArrayBuffer, nodeIsDate = nodeUtil && nodeUtil.isDate, nodeIsMap = nodeUtil && nodeUtil.isMap, nodeIsRegExp = nodeUtil && nodeUtil.isRegExp, nodeIsSet = nodeUtil && nodeUtil.isSet, nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
      function apply(func, thisArg, args) {
        switch (args.length) {
          case 0:
            return func.call(thisArg);
          case 1:
            return func.call(thisArg, args[0]);
          case 2:
            return func.call(thisArg, args[0], args[1]);
          case 3:
            return func.call(thisArg, args[0], args[1], args[2]);
        }
        return func.apply(thisArg, args);
      }
      function arrayAggregator(array2, setter, iteratee, accumulator) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        while (++index2 < length) {
          var value = array2[index2];
          setter(accumulator, value, iteratee(value), array2);
        }
        return accumulator;
      }
      function arrayEach(array2, iteratee) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        while (++index2 < length) {
          if (iteratee(array2[index2], index2, array2) === false) {
            break;
          }
        }
        return array2;
      }
      function arrayEachRight(array2, iteratee) {
        var length = array2 == null ? 0 : array2.length;
        while (length--) {
          if (iteratee(array2[length], length, array2) === false) {
            break;
          }
        }
        return array2;
      }
      function arrayEvery(array2, predicate) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        while (++index2 < length) {
          if (!predicate(array2[index2], index2, array2)) {
            return false;
          }
        }
        return true;
      }
      function arrayFilter(array2, predicate) {
        var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result = [];
        while (++index2 < length) {
          var value = array2[index2];
          if (predicate(value, index2, array2)) {
            result[resIndex++] = value;
          }
        }
        return result;
      }
      function arrayIncludes(array2, value) {
        var length = array2 == null ? 0 : array2.length;
        return !!length && baseIndexOf(array2, value, 0) > -1;
      }
      function arrayIncludesWith(array2, value, comparator) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        while (++index2 < length) {
          if (comparator(value, array2[index2])) {
            return true;
          }
        }
        return false;
      }
      function arrayMap(array2, iteratee) {
        var index2 = -1, length = array2 == null ? 0 : array2.length, result = Array(length);
        while (++index2 < length) {
          result[index2] = iteratee(array2[index2], index2, array2);
        }
        return result;
      }
      function arrayPush(array2, values) {
        var index2 = -1, length = values.length, offset = array2.length;
        while (++index2 < length) {
          array2[offset + index2] = values[index2];
        }
        return array2;
      }
      function arrayReduce(array2, iteratee, accumulator, initAccum) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        if (initAccum && length) {
          accumulator = array2[++index2];
        }
        while (++index2 < length) {
          accumulator = iteratee(accumulator, array2[index2], index2, array2);
        }
        return accumulator;
      }
      function arrayReduceRight(array2, iteratee, accumulator, initAccum) {
        var length = array2 == null ? 0 : array2.length;
        if (initAccum && length) {
          accumulator = array2[--length];
        }
        while (length--) {
          accumulator = iteratee(accumulator, array2[length], length, array2);
        }
        return accumulator;
      }
      function arraySome(array2, predicate) {
        var index2 = -1, length = array2 == null ? 0 : array2.length;
        while (++index2 < length) {
          if (predicate(array2[index2], index2, array2)) {
            return true;
          }
        }
        return false;
      }
      var asciiSize = baseProperty("length");
      function asciiToArray(string2) {
        return string2.split("");
      }
      function asciiWords(string2) {
        return string2.match(reAsciiWord) || [];
      }
      function baseFindKey(collection, predicate, eachFunc) {
        var result;
        eachFunc(collection, function(value, key, collection2) {
          if (predicate(value, key, collection2)) {
            result = key;
            return false;
          }
        });
        return result;
      }
      function baseFindIndex(array2, predicate, fromIndex, fromRight) {
        var length = array2.length, index2 = fromIndex + (fromRight ? 1 : -1);
        while (fromRight ? index2-- : ++index2 < length) {
          if (predicate(array2[index2], index2, array2)) {
            return index2;
          }
        }
        return -1;
      }
      function baseIndexOf(array2, value, fromIndex) {
        return value === value ? strictIndexOf(array2, value, fromIndex) : baseFindIndex(array2, baseIsNaN, fromIndex);
      }
      function baseIndexOfWith(array2, value, fromIndex, comparator) {
        var index2 = fromIndex - 1, length = array2.length;
        while (++index2 < length) {
          if (comparator(array2[index2], value)) {
            return index2;
          }
        }
        return -1;
      }
      function baseIsNaN(value) {
        return value !== value;
      }
      function baseMean(array2, iteratee) {
        var length = array2 == null ? 0 : array2.length;
        return length ? baseSum(array2, iteratee) / length : NAN;
      }
      function baseProperty(key) {
        return function(object2) {
          return object2 == null ? undefined$1 : object2[key];
        };
      }
      function basePropertyOf(object2) {
        return function(key) {
          return object2 == null ? undefined$1 : object2[key];
        };
      }
      function baseReduce(collection, iteratee, accumulator, initAccum, eachFunc) {
        eachFunc(collection, function(value, index2, collection2) {
          accumulator = initAccum ? (initAccum = false, value) : iteratee(accumulator, value, index2, collection2);
        });
        return accumulator;
      }
      function baseSortBy(array2, comparer) {
        var length = array2.length;
        array2.sort(comparer);
        while (length--) {
          array2[length] = array2[length].value;
        }
        return array2;
      }
      function baseSum(array2, iteratee) {
        var result, index2 = -1, length = array2.length;
        while (++index2 < length) {
          var current = iteratee(array2[index2]);
          if (current !== undefined$1) {
            result = result === undefined$1 ? current : result + current;
          }
        }
        return result;
      }
      function baseTimes(n, iteratee) {
        var index2 = -1, result = Array(n);
        while (++index2 < n) {
          result[index2] = iteratee(index2);
        }
        return result;
      }
      function baseToPairs(object2, props) {
        return arrayMap(props, function(key) {
          return [key, object2[key]];
        });
      }
      function baseTrim(string2) {
        return string2 ? string2.slice(0, trimmedEndIndex(string2) + 1).replace(reTrimStart, "") : string2;
      }
      function baseUnary(func) {
        return function(value) {
          return func(value);
        };
      }
      function baseValues(object2, props) {
        return arrayMap(props, function(key) {
          return object2[key];
        });
      }
      function cacheHas(cache, key) {
        return cache.has(key);
      }
      function charsStartIndex(strSymbols, chrSymbols) {
        var index2 = -1, length = strSymbols.length;
        while (++index2 < length && baseIndexOf(chrSymbols, strSymbols[index2], 0) > -1) {
        }
        return index2;
      }
      function charsEndIndex(strSymbols, chrSymbols) {
        var index2 = strSymbols.length;
        while (index2-- && baseIndexOf(chrSymbols, strSymbols[index2], 0) > -1) {
        }
        return index2;
      }
      function countHolders(array2, placeholder) {
        var length = array2.length, result = 0;
        while (length--) {
          if (array2[length] === placeholder) {
            ++result;
          }
        }
        return result;
      }
      var deburrLetter = basePropertyOf(deburredLetters);
      var escapeHtmlChar = basePropertyOf(htmlEscapes);
      function escapeStringChar(chr) {
        return "\\" + stringEscapes[chr];
      }
      function getValue(object2, key) {
        return object2 == null ? undefined$1 : object2[key];
      }
      function hasUnicode(string2) {
        return reHasUnicode.test(string2);
      }
      function hasUnicodeWord(string2) {
        return reHasUnicodeWord.test(string2);
      }
      function iteratorToArray(iterator) {
        var data, result = [];
        while (!(data = iterator.next()).done) {
          result.push(data.value);
        }
        return result;
      }
      function mapToArray(map2) {
        var index2 = -1, result = Array(map2.size);
        map2.forEach(function(value, key) {
          result[++index2] = [key, value];
        });
        return result;
      }
      function overArg(func, transform2) {
        return function(arg) {
          return func(transform2(arg));
        };
      }
      function replaceHolders(array2, placeholder) {
        var index2 = -1, length = array2.length, resIndex = 0, result = [];
        while (++index2 < length) {
          var value = array2[index2];
          if (value === placeholder || value === PLACEHOLDER) {
            array2[index2] = PLACEHOLDER;
            result[resIndex++] = index2;
          }
        }
        return result;
      }
      function setToArray(set2) {
        var index2 = -1, result = Array(set2.size);
        set2.forEach(function(value) {
          result[++index2] = value;
        });
        return result;
      }
      function setToPairs(set2) {
        var index2 = -1, result = Array(set2.size);
        set2.forEach(function(value) {
          result[++index2] = [value, value];
        });
        return result;
      }
      function strictIndexOf(array2, value, fromIndex) {
        var index2 = fromIndex - 1, length = array2.length;
        while (++index2 < length) {
          if (array2[index2] === value) {
            return index2;
          }
        }
        return -1;
      }
      function strictLastIndexOf(array2, value, fromIndex) {
        var index2 = fromIndex + 1;
        while (index2--) {
          if (array2[index2] === value) {
            return index2;
          }
        }
        return index2;
      }
      function stringSize(string2) {
        return hasUnicode(string2) ? unicodeSize(string2) : asciiSize(string2);
      }
      function stringToArray(string2) {
        return hasUnicode(string2) ? unicodeToArray(string2) : asciiToArray(string2);
      }
      function trimmedEndIndex(string2) {
        var index2 = string2.length;
        while (index2-- && reWhitespace.test(string2.charAt(index2))) {
        }
        return index2;
      }
      var unescapeHtmlChar = basePropertyOf(htmlUnescapes);
      function unicodeSize(string2) {
        var result = reUnicode.lastIndex = 0;
        while (reUnicode.test(string2)) {
          ++result;
        }
        return result;
      }
      function unicodeToArray(string2) {
        return string2.match(reUnicode) || [];
      }
      function unicodeWords(string2) {
        return string2.match(reUnicodeWord) || [];
      }
      var runInContext = (function runInContext2(context) {
        context = context == null ? root : _2.defaults(root.Object(), context, _2.pick(root, contextProps));
        var Array2 = context.Array, Date2 = context.Date, Error2 = context.Error, Function2 = context.Function, Math2 = context.Math, Object2 = context.Object, RegExp2 = context.RegExp, String2 = context.String, TypeError2 = context.TypeError;
        var arrayProto = Array2.prototype, funcProto = Function2.prototype, objectProto = Object2.prototype;
        var coreJsData = context["__core-js_shared__"];
        var funcToString = funcProto.toString;
        var hasOwnProperty = objectProto.hasOwnProperty;
        var idCounter = 0;
        var maskSrcKey = (function() {
          var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
          return uid ? "Symbol(src)_1." + uid : "";
        })();
        var nativeObjectToString = objectProto.toString;
        var objectCtorString = funcToString.call(Object2);
        var oldDash = root._;
        var reIsNative = RegExp2(
          "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
        );
        var Buffer2 = moduleExports ? context.Buffer : undefined$1, Symbol2 = context.Symbol, Uint8Array = context.Uint8Array, allocUnsafe = Buffer2 ? Buffer2.allocUnsafe : undefined$1, getPrototype = overArg(Object2.getPrototypeOf, Object2), objectCreate = Object2.create, propertyIsEnumerable = objectProto.propertyIsEnumerable, splice = arrayProto.splice, spreadableSymbol = Symbol2 ? Symbol2.isConcatSpreadable : undefined$1, symIterator = Symbol2 ? Symbol2.iterator : undefined$1, symToStringTag = Symbol2 ? Symbol2.toStringTag : undefined$1;
        var defineProperty = (function() {
          try {
            var func = getNative(Object2, "defineProperty");
            func({}, "", {});
            return func;
          } catch (e) {
          }
        })();
        var ctxClearTimeout = context.clearTimeout !== root.clearTimeout && context.clearTimeout, ctxNow = Date2 && Date2.now !== root.Date.now && Date2.now, ctxSetTimeout = context.setTimeout !== root.setTimeout && context.setTimeout;
        var nativeCeil = Math2.ceil, nativeFloor = Math2.floor, nativeGetSymbols = Object2.getOwnPropertySymbols, nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : undefined$1, nativeIsFinite = context.isFinite, nativeJoin = arrayProto.join, nativeKeys = overArg(Object2.keys, Object2), nativeMax = Math2.max, nativeMin = Math2.min, nativeNow = Date2.now, nativeParseInt = context.parseInt, nativeRandom = Math2.random, nativeReverse = arrayProto.reverse;
        var DataView = getNative(context, "DataView"), Map2 = getNative(context, "Map"), Promise2 = getNative(context, "Promise"), Set2 = getNative(context, "Set"), WeakMap2 = getNative(context, "WeakMap"), nativeCreate = getNative(Object2, "create");
        var metaMap = WeakMap2 && new WeakMap2();
        var realNames = {};
        var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap2);
        var symbolProto = Symbol2 ? Symbol2.prototype : undefined$1, symbolValueOf = symbolProto ? symbolProto.valueOf : undefined$1, symbolToString2 = symbolProto ? symbolProto.toString : undefined$1;
        function lodash2(value) {
          if (isObjectLike(value) && !isArray(value) && !(value instanceof LazyWrapper)) {
            if (value instanceof LodashWrapper) {
              return value;
            }
            if (hasOwnProperty.call(value, "__wrapped__")) {
              return wrapperClone(value);
            }
          }
          return new LodashWrapper(value);
        }
        var baseCreate = /* @__PURE__ */ (function() {
          function object2() {
          }
          return function(proto) {
            if (!isObject2(proto)) {
              return {};
            }
            if (objectCreate) {
              return objectCreate(proto);
            }
            object2.prototype = proto;
            var result2 = new object2();
            object2.prototype = undefined$1;
            return result2;
          };
        })();
        function baseLodash() {
        }
        function LodashWrapper(value, chainAll) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__chain__ = !!chainAll;
          this.__index__ = 0;
          this.__values__ = undefined$1;
        }
        lodash2.templateSettings = {
          /**
           * Used to detect `data` property values to be HTML-escaped.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "escape": reEscape,
          /**
           * Used to detect code to be evaluated.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "evaluate": reEvaluate,
          /**
           * Used to detect `data` property values to inject.
           *
           * @memberOf _.templateSettings
           * @type {RegExp}
           */
          "interpolate": reInterpolate,
          /**
           * Used to reference the data object in the template text.
           *
           * @memberOf _.templateSettings
           * @type {string}
           */
          "variable": "",
          /**
           * Used to import variables into the compiled template.
           *
           * @memberOf _.templateSettings
           * @type {Object}
           */
          "imports": {
            /**
             * A reference to the `lodash` function.
             *
             * @memberOf _.templateSettings.imports
             * @type {Function}
             */
            "_": lodash2
          }
        };
        lodash2.prototype = baseLodash.prototype;
        lodash2.prototype.constructor = lodash2;
        LodashWrapper.prototype = baseCreate(baseLodash.prototype);
        LodashWrapper.prototype.constructor = LodashWrapper;
        function LazyWrapper(value) {
          this.__wrapped__ = value;
          this.__actions__ = [];
          this.__dir__ = 1;
          this.__filtered__ = false;
          this.__iteratees__ = [];
          this.__takeCount__ = MAX_ARRAY_LENGTH;
          this.__views__ = [];
        }
        function lazyClone() {
          var result2 = new LazyWrapper(this.__wrapped__);
          result2.__actions__ = copyArray(this.__actions__);
          result2.__dir__ = this.__dir__;
          result2.__filtered__ = this.__filtered__;
          result2.__iteratees__ = copyArray(this.__iteratees__);
          result2.__takeCount__ = this.__takeCount__;
          result2.__views__ = copyArray(this.__views__);
          return result2;
        }
        function lazyReverse() {
          if (this.__filtered__) {
            var result2 = new LazyWrapper(this);
            result2.__dir__ = -1;
            result2.__filtered__ = true;
          } else {
            result2 = this.clone();
            result2.__dir__ *= -1;
          }
          return result2;
        }
        function lazyValue() {
          var array2 = this.__wrapped__.value(), dir = this.__dir__, isArr = isArray(array2), isRight = dir < 0, arrLength = isArr ? array2.length : 0, view = getView(0, arrLength, this.__views__), start = view.start, end = view.end, length = end - start, index2 = isRight ? end : start - 1, iteratees = this.__iteratees__, iterLength = iteratees.length, resIndex = 0, takeCount = nativeMin(length, this.__takeCount__);
          if (!isArr || !isRight && arrLength == length && takeCount == length) {
            return baseWrapperValue(array2, this.__actions__);
          }
          var result2 = [];
          outer:
            while (length-- && resIndex < takeCount) {
              index2 += dir;
              var iterIndex = -1, value = array2[index2];
              while (++iterIndex < iterLength) {
                var data = iteratees[iterIndex], iteratee2 = data.iteratee, type = data.type, computed = iteratee2(value);
                if (type == LAZY_MAP_FLAG) {
                  value = computed;
                } else if (!computed) {
                  if (type == LAZY_FILTER_FLAG) {
                    continue outer;
                  } else {
                    break outer;
                  }
                }
              }
              result2[resIndex++] = value;
            }
          return result2;
        }
        LazyWrapper.prototype = baseCreate(baseLodash.prototype);
        LazyWrapper.prototype.constructor = LazyWrapper;
        function Hash(entries) {
          var index2 = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index2 < length) {
            var entry = entries[index2];
            this.set(entry[0], entry[1]);
          }
        }
        function hashClear() {
          this.__data__ = nativeCreate ? nativeCreate(null) : {};
          this.size = 0;
        }
        function hashDelete(key) {
          var result2 = this.has(key) && delete this.__data__[key];
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function hashGet(key) {
          var data = this.__data__;
          if (nativeCreate) {
            var result2 = data[key];
            return result2 === HASH_UNDEFINED ? undefined$1 : result2;
          }
          return hasOwnProperty.call(data, key) ? data[key] : undefined$1;
        }
        function hashHas(key) {
          var data = this.__data__;
          return nativeCreate ? data[key] !== undefined$1 : hasOwnProperty.call(data, key);
        }
        function hashSet(key, value) {
          var data = this.__data__;
          this.size += this.has(key) ? 0 : 1;
          data[key] = nativeCreate && value === undefined$1 ? HASH_UNDEFINED : value;
          return this;
        }
        Hash.prototype.clear = hashClear;
        Hash.prototype["delete"] = hashDelete;
        Hash.prototype.get = hashGet;
        Hash.prototype.has = hashHas;
        Hash.prototype.set = hashSet;
        function ListCache(entries) {
          var index2 = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index2 < length) {
            var entry = entries[index2];
            this.set(entry[0], entry[1]);
          }
        }
        function listCacheClear() {
          this.__data__ = [];
          this.size = 0;
        }
        function listCacheDelete(key) {
          var data = this.__data__, index2 = assocIndexOf(data, key);
          if (index2 < 0) {
            return false;
          }
          var lastIndex = data.length - 1;
          if (index2 == lastIndex) {
            data.pop();
          } else {
            splice.call(data, index2, 1);
          }
          --this.size;
          return true;
        }
        function listCacheGet(key) {
          var data = this.__data__, index2 = assocIndexOf(data, key);
          return index2 < 0 ? undefined$1 : data[index2][1];
        }
        function listCacheHas(key) {
          return assocIndexOf(this.__data__, key) > -1;
        }
        function listCacheSet(key, value) {
          var data = this.__data__, index2 = assocIndexOf(data, key);
          if (index2 < 0) {
            ++this.size;
            data.push([key, value]);
          } else {
            data[index2][1] = value;
          }
          return this;
        }
        ListCache.prototype.clear = listCacheClear;
        ListCache.prototype["delete"] = listCacheDelete;
        ListCache.prototype.get = listCacheGet;
        ListCache.prototype.has = listCacheHas;
        ListCache.prototype.set = listCacheSet;
        function MapCache(entries) {
          var index2 = -1, length = entries == null ? 0 : entries.length;
          this.clear();
          while (++index2 < length) {
            var entry = entries[index2];
            this.set(entry[0], entry[1]);
          }
        }
        function mapCacheClear() {
          this.size = 0;
          this.__data__ = {
            "hash": new Hash(),
            "map": new (Map2 || ListCache)(),
            "string": new Hash()
          };
        }
        function mapCacheDelete(key) {
          var result2 = getMapData(this, key)["delete"](key);
          this.size -= result2 ? 1 : 0;
          return result2;
        }
        function mapCacheGet(key) {
          return getMapData(this, key).get(key);
        }
        function mapCacheHas(key) {
          return getMapData(this, key).has(key);
        }
        function mapCacheSet(key, value) {
          var data = getMapData(this, key), size2 = data.size;
          data.set(key, value);
          this.size += data.size == size2 ? 0 : 1;
          return this;
        }
        MapCache.prototype.clear = mapCacheClear;
        MapCache.prototype["delete"] = mapCacheDelete;
        MapCache.prototype.get = mapCacheGet;
        MapCache.prototype.has = mapCacheHas;
        MapCache.prototype.set = mapCacheSet;
        function SetCache(values2) {
          var index2 = -1, length = values2 == null ? 0 : values2.length;
          this.__data__ = new MapCache();
          while (++index2 < length) {
            this.add(values2[index2]);
          }
        }
        function setCacheAdd(value) {
          this.__data__.set(value, HASH_UNDEFINED);
          return this;
        }
        function setCacheHas(value) {
          return this.__data__.has(value);
        }
        SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
        SetCache.prototype.has = setCacheHas;
        function Stack(entries) {
          var data = this.__data__ = new ListCache(entries);
          this.size = data.size;
        }
        function stackClear() {
          this.__data__ = new ListCache();
          this.size = 0;
        }
        function stackDelete(key) {
          var data = this.__data__, result2 = data["delete"](key);
          this.size = data.size;
          return result2;
        }
        function stackGet(key) {
          return this.__data__.get(key);
        }
        function stackHas(key) {
          return this.__data__.has(key);
        }
        function stackSet(key, value) {
          var data = this.__data__;
          if (data instanceof ListCache) {
            var pairs = data.__data__;
            if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
              pairs.push([key, value]);
              this.size = ++data.size;
              return this;
            }
            data = this.__data__ = new MapCache(pairs);
          }
          data.set(key, value);
          this.size = data.size;
          return this;
        }
        Stack.prototype.clear = stackClear;
        Stack.prototype["delete"] = stackDelete;
        Stack.prototype.get = stackGet;
        Stack.prototype.has = stackHas;
        Stack.prototype.set = stackSet;
        function arrayLikeKeys(value, inherited) {
          var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer2(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result2 = skipIndexes ? baseTimes(value.length, String2) : [], length = result2.length;
          for (var key in value) {
            if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
            (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
            isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
            isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
            isIndex(key, length)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function arraySample(array2) {
          var length = array2.length;
          return length ? array2[baseRandom(0, length - 1)] : undefined$1;
        }
        function arraySampleSize(array2, n) {
          return shuffleSelf(copyArray(array2), baseClamp(n, 0, array2.length));
        }
        function arrayShuffle(array2) {
          return shuffleSelf(copyArray(array2));
        }
        function assignMergeValue(object2, key, value) {
          if (value !== undefined$1 && !eq(object2[key], value) || value === undefined$1 && !(key in object2)) {
            baseAssignValue(object2, key, value);
          }
        }
        function assignValue(object2, key, value) {
          var objValue = object2[key];
          if (!(hasOwnProperty.call(object2, key) && eq(objValue, value)) || value === undefined$1 && !(key in object2)) {
            baseAssignValue(object2, key, value);
          }
        }
        function assocIndexOf(array2, key) {
          var length = array2.length;
          while (length--) {
            if (eq(array2[length][0], key)) {
              return length;
            }
          }
          return -1;
        }
        function baseAggregator(collection, setter, iteratee2, accumulator) {
          baseEach(collection, function(value, key, collection2) {
            setter(accumulator, value, iteratee2(value), collection2);
          });
          return accumulator;
        }
        function baseAssign(object2, source) {
          return object2 && copyObject(source, keys(source), object2);
        }
        function baseAssignIn(object2, source) {
          return object2 && copyObject(source, keysIn(source), object2);
        }
        function baseAssignValue(object2, key, value) {
          if (key == "__proto__" && defineProperty) {
            defineProperty(object2, key, {
              "configurable": true,
              "enumerable": true,
              "value": value,
              "writable": true
            });
          } else {
            object2[key] = value;
          }
        }
        function baseAt(object2, paths) {
          var index2 = -1, length = paths.length, result2 = Array2(length), skip = object2 == null;
          while (++index2 < length) {
            result2[index2] = skip ? undefined$1 : get(object2, paths[index2]);
          }
          return result2;
        }
        function baseClamp(number2, lower, upper) {
          if (number2 === number2) {
            if (upper !== undefined$1) {
              number2 = number2 <= upper ? number2 : upper;
            }
            if (lower !== undefined$1) {
              number2 = number2 >= lower ? number2 : lower;
            }
          }
          return number2;
        }
        function baseClone2(value, bitmask, customizer, key, object2, stack) {
          var result2, isDeep = bitmask & CLONE_DEEP_FLAG, isFlat = bitmask & CLONE_FLAT_FLAG, isFull = bitmask & CLONE_SYMBOLS_FLAG;
          if (customizer) {
            result2 = object2 ? customizer(value, key, object2, stack) : customizer(value);
          }
          if (result2 !== undefined$1) {
            return result2;
          }
          if (!isObject2(value)) {
            return value;
          }
          var isArr = isArray(value);
          if (isArr) {
            result2 = initCloneArray(value);
            if (!isDeep) {
              return copyArray(value, result2);
            }
          } else {
            var tag = getTag(value), isFunc = tag == funcTag || tag == genTag;
            if (isBuffer2(value)) {
              return cloneBuffer(value, isDeep);
            }
            if (tag == objectTag || tag == argsTag || isFunc && !object2) {
              result2 = isFlat || isFunc ? {} : initCloneObject(value);
              if (!isDeep) {
                return isFlat ? copySymbolsIn(value, baseAssignIn(result2, value)) : copySymbols(value, baseAssign(result2, value));
              }
            } else {
              if (!cloneableTags[tag]) {
                return object2 ? value : {};
              }
              result2 = initCloneByTag(value, tag, isDeep);
            }
          }
          stack || (stack = new Stack());
          var stacked = stack.get(value);
          if (stacked) {
            return stacked;
          }
          stack.set(value, result2);
          if (isSet(value)) {
            value.forEach(function(subValue) {
              result2.add(baseClone2(subValue, bitmask, customizer, subValue, value, stack));
            });
          } else if (isMap(value)) {
            value.forEach(function(subValue, key2) {
              result2.set(key2, baseClone2(subValue, bitmask, customizer, key2, value, stack));
            });
          }
          var keysFunc = isFull ? isFlat ? getAllKeysIn : getAllKeys : isFlat ? keysIn : keys;
          var props = isArr ? undefined$1 : keysFunc(value);
          arrayEach(props || value, function(subValue, key2) {
            if (props) {
              key2 = subValue;
              subValue = value[key2];
            }
            assignValue(result2, key2, baseClone2(subValue, bitmask, customizer, key2, value, stack));
          });
          return result2;
        }
        function baseConforms(source) {
          var props = keys(source);
          return function(object2) {
            return baseConformsTo(object2, source, props);
          };
        }
        function baseConformsTo(object2, source, props) {
          var length = props.length;
          if (object2 == null) {
            return !length;
          }
          object2 = Object2(object2);
          while (length--) {
            var key = props[length], predicate = source[key], value = object2[key];
            if (value === undefined$1 && !(key in object2) || !predicate(value)) {
              return false;
            }
          }
          return true;
        }
        function baseDelay(func, wait, args) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return setTimeout2(function() {
            func.apply(undefined$1, args);
          }, wait);
        }
        function baseDifference(array2, values2, iteratee2, comparator) {
          var index2 = -1, includes2 = arrayIncludes, isCommon = true, length = array2.length, result2 = [], valuesLength = values2.length;
          if (!length) {
            return result2;
          }
          if (iteratee2) {
            values2 = arrayMap(values2, baseUnary(iteratee2));
          }
          if (comparator) {
            includes2 = arrayIncludesWith;
            isCommon = false;
          } else if (values2.length >= LARGE_ARRAY_SIZE) {
            includes2 = cacheHas;
            isCommon = false;
            values2 = new SetCache(values2);
          }
          outer:
            while (++index2 < length) {
              var value = array2[index2], computed = iteratee2 == null ? value : iteratee2(value);
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var valuesIndex = valuesLength;
                while (valuesIndex--) {
                  if (values2[valuesIndex] === computed) {
                    continue outer;
                  }
                }
                result2.push(value);
              } else if (!includes2(values2, computed, comparator)) {
                result2.push(value);
              }
            }
          return result2;
        }
        var baseEach = createBaseEach(baseForOwn);
        var baseEachRight = createBaseEach(baseForOwnRight, true);
        function baseEvery(collection, predicate) {
          var result2 = true;
          baseEach(collection, function(value, index2, collection2) {
            result2 = !!predicate(value, index2, collection2);
            return result2;
          });
          return result2;
        }
        function baseExtremum(array2, iteratee2, comparator) {
          var index2 = -1, length = array2.length;
          while (++index2 < length) {
            var value = array2[index2], current = iteratee2(value);
            if (current != null && (computed === undefined$1 ? current === current && !isSymbol(current) : comparator(current, computed))) {
              var computed = current, result2 = value;
            }
          }
          return result2;
        }
        function baseFill(array2, value, start, end) {
          var length = array2.length;
          start = toInteger(start);
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end === undefined$1 || end > length ? length : toInteger(end);
          if (end < 0) {
            end += length;
          }
          end = start > end ? 0 : toLength(end);
          while (start < end) {
            array2[start++] = value;
          }
          return array2;
        }
        function baseFilter(collection, predicate) {
          var result2 = [];
          baseEach(collection, function(value, index2, collection2) {
            if (predicate(value, index2, collection2)) {
              result2.push(value);
            }
          });
          return result2;
        }
        function baseFlatten(array2, depth, predicate, isStrict, result2) {
          var index2 = -1, length = array2.length;
          predicate || (predicate = isFlattenable);
          result2 || (result2 = []);
          while (++index2 < length) {
            var value = array2[index2];
            if (depth > 0 && predicate(value)) {
              if (depth > 1) {
                baseFlatten(value, depth - 1, predicate, isStrict, result2);
              } else {
                arrayPush(result2, value);
              }
            } else if (!isStrict) {
              result2[result2.length] = value;
            }
          }
          return result2;
        }
        var baseFor = createBaseFor();
        var baseForRight = createBaseFor(true);
        function baseForOwn(object2, iteratee2) {
          return object2 && baseFor(object2, iteratee2, keys);
        }
        function baseForOwnRight(object2, iteratee2) {
          return object2 && baseForRight(object2, iteratee2, keys);
        }
        function baseFunctions(object2, props) {
          return arrayFilter(props, function(key) {
            return isFunction2(object2[key]);
          });
        }
        function baseGet(object2, path) {
          path = castPath(path, object2);
          var index2 = 0, length = path.length;
          while (object2 != null && index2 < length) {
            object2 = object2[toKey(path[index2++])];
          }
          return index2 && index2 == length ? object2 : undefined$1;
        }
        function baseGetAllKeys(object2, keysFunc, symbolsFunc) {
          var result2 = keysFunc(object2);
          return isArray(object2) ? result2 : arrayPush(result2, symbolsFunc(object2));
        }
        function baseGetTag(value) {
          if (value == null) {
            return value === undefined$1 ? undefinedTag : nullTag;
          }
          return symToStringTag && symToStringTag in Object2(value) ? getRawTag(value) : objectToString(value);
        }
        function baseGt(value, other) {
          return value > other;
        }
        function baseHas(object2, key) {
          return object2 != null && hasOwnProperty.call(object2, key);
        }
        function baseHasIn(object2, key) {
          return object2 != null && key in Object2(object2);
        }
        function baseInRange(number2, start, end) {
          return number2 >= nativeMin(start, end) && number2 < nativeMax(start, end);
        }
        function baseIntersection(arrays, iteratee2, comparator) {
          var includes2 = comparator ? arrayIncludesWith : arrayIncludes, length = arrays[0].length, othLength = arrays.length, othIndex = othLength, caches = Array2(othLength), maxLength = Infinity, result2 = [];
          while (othIndex--) {
            var array2 = arrays[othIndex];
            if (othIndex && iteratee2) {
              array2 = arrayMap(array2, baseUnary(iteratee2));
            }
            maxLength = nativeMin(array2.length, maxLength);
            caches[othIndex] = !comparator && (iteratee2 || length >= 120 && array2.length >= 120) ? new SetCache(othIndex && array2) : undefined$1;
          }
          array2 = arrays[0];
          var index2 = -1, seen = caches[0];
          outer:
            while (++index2 < length && result2.length < maxLength) {
              var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (!(seen ? cacheHas(seen, computed) : includes2(result2, computed, comparator))) {
                othIndex = othLength;
                while (--othIndex) {
                  var cache = caches[othIndex];
                  if (!(cache ? cacheHas(cache, computed) : includes2(arrays[othIndex], computed, comparator))) {
                    continue outer;
                  }
                }
                if (seen) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseInverter(object2, setter, iteratee2, accumulator) {
          baseForOwn(object2, function(value, key, object3) {
            setter(accumulator, iteratee2(value), key, object3);
          });
          return accumulator;
        }
        function baseInvoke(object2, path, args) {
          path = castPath(path, object2);
          object2 = parent(object2, path);
          var func = object2 == null ? object2 : object2[toKey(last(path))];
          return func == null ? undefined$1 : apply(func, object2, args);
        }
        function baseIsArguments(value) {
          return isObjectLike(value) && baseGetTag(value) == argsTag;
        }
        function baseIsArrayBuffer(value) {
          return isObjectLike(value) && baseGetTag(value) == arrayBufferTag;
        }
        function baseIsDate(value) {
          return isObjectLike(value) && baseGetTag(value) == dateTag;
        }
        function baseIsEqual(value, other, bitmask, customizer, stack) {
          if (value === other) {
            return true;
          }
          if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
            return value !== value && other !== other;
          }
          return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
        }
        function baseIsEqualDeep(object2, other, bitmask, customizer, equalFunc, stack) {
          var objIsArr = isArray(object2), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object2), othTag = othIsArr ? arrayTag : getTag(other);
          objTag = objTag == argsTag ? objectTag : objTag;
          othTag = othTag == argsTag ? objectTag : othTag;
          var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
          if (isSameTag && isBuffer2(object2)) {
            if (!isBuffer2(other)) {
              return false;
            }
            objIsArr = true;
            objIsObj = false;
          }
          if (isSameTag && !objIsObj) {
            stack || (stack = new Stack());
            return objIsArr || isTypedArray(object2) ? equalArrays(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag(object2, other, objTag, bitmask, customizer, equalFunc, stack);
          }
          if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
            var objIsWrapped = objIsObj && hasOwnProperty.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
            if (objIsWrapped || othIsWrapped) {
              var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
              stack || (stack = new Stack());
              return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
            }
          }
          if (!isSameTag) {
            return false;
          }
          stack || (stack = new Stack());
          return equalObjects(object2, other, bitmask, customizer, equalFunc, stack);
        }
        function baseIsMap(value) {
          return isObjectLike(value) && getTag(value) == mapTag;
        }
        function baseIsMatch(object2, source, matchData, customizer) {
          var index2 = matchData.length, length = index2, noCustomizer = !customizer;
          if (object2 == null) {
            return !length;
          }
          object2 = Object2(object2);
          while (index2--) {
            var data = matchData[index2];
            if (noCustomizer && data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
              return false;
            }
          }
          while (++index2 < length) {
            data = matchData[index2];
            var key = data[0], objValue = object2[key], srcValue = data[1];
            if (noCustomizer && data[2]) {
              if (objValue === undefined$1 && !(key in object2)) {
                return false;
              }
            } else {
              var stack = new Stack();
              if (customizer) {
                var result2 = customizer(objValue, srcValue, key, object2, source, stack);
              }
              if (!(result2 === undefined$1 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result2)) {
                return false;
              }
            }
          }
          return true;
        }
        function baseIsNative(value) {
          if (!isObject2(value) || isMasked(value)) {
            return false;
          }
          var pattern = isFunction2(value) ? reIsNative : reIsHostCtor;
          return pattern.test(toSource(value));
        }
        function baseIsRegExp(value) {
          return isObjectLike(value) && baseGetTag(value) == regexpTag;
        }
        function baseIsSet(value) {
          return isObjectLike(value) && getTag(value) == setTag;
        }
        function baseIsTypedArray(value) {
          return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
        }
        function baseIteratee(value) {
          if (typeof value == "function") {
            return value;
          }
          if (value == null) {
            return identity;
          }
          if (typeof value == "object") {
            return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
          }
          return property(value);
        }
        function baseKeys(object2) {
          if (!isPrototype(object2)) {
            return nativeKeys(object2);
          }
          var result2 = [];
          for (var key in Object2(object2)) {
            if (hasOwnProperty.call(object2, key) && key != "constructor") {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseKeysIn(object2) {
          if (!isObject2(object2)) {
            return nativeKeysIn(object2);
          }
          var isProto = isPrototype(object2), result2 = [];
          for (var key in object2) {
            if (!(key == "constructor" && (isProto || !hasOwnProperty.call(object2, key)))) {
              result2.push(key);
            }
          }
          return result2;
        }
        function baseLt(value, other) {
          return value < other;
        }
        function baseMap(collection, iteratee2) {
          var index2 = -1, result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value, key, collection2) {
            result2[++index2] = iteratee2(value, key, collection2);
          });
          return result2;
        }
        function baseMatches(source) {
          var matchData = getMatchData(source);
          if (matchData.length == 1 && matchData[0][2]) {
            return matchesStrictComparable(matchData[0][0], matchData[0][1]);
          }
          return function(object2) {
            return object2 === source || baseIsMatch(object2, source, matchData);
          };
        }
        function baseMatchesProperty(path, srcValue) {
          if (isKey(path) && isStrictComparable(srcValue)) {
            return matchesStrictComparable(toKey(path), srcValue);
          }
          return function(object2) {
            var objValue = get(object2, path);
            return objValue === undefined$1 && objValue === srcValue ? hasIn(object2, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
          };
        }
        function baseMerge(object2, source, srcIndex, customizer, stack) {
          if (object2 === source) {
            return;
          }
          baseFor(source, function(srcValue, key) {
            stack || (stack = new Stack());
            if (isObject2(srcValue)) {
              baseMergeDeep(object2, source, key, srcIndex, baseMerge, customizer, stack);
            } else {
              var newValue = customizer ? customizer(safeGet(object2, key), srcValue, key + "", object2, source, stack) : undefined$1;
              if (newValue === undefined$1) {
                newValue = srcValue;
              }
              assignMergeValue(object2, key, newValue);
            }
          }, keysIn);
        }
        function baseMergeDeep(object2, source, key, srcIndex, mergeFunc, customizer, stack) {
          var objValue = safeGet(object2, key), srcValue = safeGet(source, key), stacked = stack.get(srcValue);
          if (stacked) {
            assignMergeValue(object2, key, stacked);
            return;
          }
          var newValue = customizer ? customizer(objValue, srcValue, key + "", object2, source, stack) : undefined$1;
          var isCommon = newValue === undefined$1;
          if (isCommon) {
            var isArr = isArray(srcValue), isBuff = !isArr && isBuffer2(srcValue), isTyped = !isArr && !isBuff && isTypedArray(srcValue);
            newValue = srcValue;
            if (isArr || isBuff || isTyped) {
              if (isArray(objValue)) {
                newValue = objValue;
              } else if (isArrayLikeObject(objValue)) {
                newValue = copyArray(objValue);
              } else if (isBuff) {
                isCommon = false;
                newValue = cloneBuffer(srcValue, true);
              } else if (isTyped) {
                isCommon = false;
                newValue = cloneTypedArray(srcValue, true);
              } else {
                newValue = [];
              }
            } else if (isPlainObject2(srcValue) || isArguments(srcValue)) {
              newValue = objValue;
              if (isArguments(objValue)) {
                newValue = toPlainObject(objValue);
              } else if (!isObject2(objValue) || isFunction2(objValue)) {
                newValue = initCloneObject(srcValue);
              }
            } else {
              isCommon = false;
            }
          }
          if (isCommon) {
            stack.set(srcValue, newValue);
            mergeFunc(newValue, srcValue, srcIndex, customizer, stack);
            stack["delete"](srcValue);
          }
          assignMergeValue(object2, key, newValue);
        }
        function baseNth(array2, n) {
          var length = array2.length;
          if (!length) {
            return;
          }
          n += n < 0 ? length : 0;
          return isIndex(n, length) ? array2[n] : undefined$1;
        }
        function baseOrderBy(collection, iteratees, orders) {
          if (iteratees.length) {
            iteratees = arrayMap(iteratees, function(iteratee2) {
              if (isArray(iteratee2)) {
                return function(value) {
                  return baseGet(value, iteratee2.length === 1 ? iteratee2[0] : iteratee2);
                };
              }
              return iteratee2;
            });
          } else {
            iteratees = [identity];
          }
          var index2 = -1;
          iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
          var result2 = baseMap(collection, function(value, key, collection2) {
            var criteria = arrayMap(iteratees, function(iteratee2) {
              return iteratee2(value);
            });
            return { "criteria": criteria, "index": ++index2, "value": value };
          });
          return baseSortBy(result2, function(object2, other) {
            return compareMultiple(object2, other, orders);
          });
        }
        function basePick(object2, paths) {
          return basePickBy(object2, paths, function(value, path) {
            return hasIn(object2, path);
          });
        }
        function basePickBy(object2, paths, predicate) {
          var index2 = -1, length = paths.length, result2 = {};
          while (++index2 < length) {
            var path = paths[index2], value = baseGet(object2, path);
            if (predicate(value, path)) {
              baseSet(result2, castPath(path, object2), value);
            }
          }
          return result2;
        }
        function basePropertyDeep(path) {
          return function(object2) {
            return baseGet(object2, path);
          };
        }
        function basePullAll(array2, values2, iteratee2, comparator) {
          var indexOf2 = comparator ? baseIndexOfWith : baseIndexOf, index2 = -1, length = values2.length, seen = array2;
          if (array2 === values2) {
            values2 = copyArray(values2);
          }
          if (iteratee2) {
            seen = arrayMap(array2, baseUnary(iteratee2));
          }
          while (++index2 < length) {
            var fromIndex = 0, value = values2[index2], computed = iteratee2 ? iteratee2(value) : value;
            while ((fromIndex = indexOf2(seen, computed, fromIndex, comparator)) > -1) {
              if (seen !== array2) {
                splice.call(seen, fromIndex, 1);
              }
              splice.call(array2, fromIndex, 1);
            }
          }
          return array2;
        }
        function basePullAt(array2, indexes) {
          var length = array2 ? indexes.length : 0, lastIndex = length - 1;
          while (length--) {
            var index2 = indexes[length];
            if (length == lastIndex || index2 !== previous) {
              var previous = index2;
              if (isIndex(index2)) {
                splice.call(array2, index2, 1);
              } else {
                baseUnset(array2, index2);
              }
            }
          }
          return array2;
        }
        function baseRandom(lower, upper) {
          return lower + nativeFloor(nativeRandom() * (upper - lower + 1));
        }
        function baseRange(start, end, step, fromRight) {
          var index2 = -1, length = nativeMax(nativeCeil((end - start) / (step || 1)), 0), result2 = Array2(length);
          while (length--) {
            result2[fromRight ? length : ++index2] = start;
            start += step;
          }
          return result2;
        }
        function baseRepeat(string2, n) {
          var result2 = "";
          if (!string2 || n < 1 || n > MAX_SAFE_INTEGER) {
            return result2;
          }
          do {
            if (n % 2) {
              result2 += string2;
            }
            n = nativeFloor(n / 2);
            if (n) {
              string2 += string2;
            }
          } while (n);
          return result2;
        }
        function baseRest(func, start) {
          return setToString(overRest(func, start, identity), func + "");
        }
        function baseSample(collection) {
          return arraySample(values(collection));
        }
        function baseSampleSize(collection, n) {
          var array2 = values(collection);
          return shuffleSelf(array2, baseClamp(n, 0, array2.length));
        }
        function baseSet(object2, path, value, customizer) {
          if (!isObject2(object2)) {
            return object2;
          }
          path = castPath(path, object2);
          var index2 = -1, length = path.length, lastIndex = length - 1, nested = object2;
          while (nested != null && ++index2 < length) {
            var key = toKey(path[index2]), newValue = value;
            if (key === "__proto__" || key === "constructor" || key === "prototype") {
              return object2;
            }
            if (index2 != lastIndex) {
              var objValue = nested[key];
              newValue = customizer ? customizer(objValue, key, nested) : undefined$1;
              if (newValue === undefined$1) {
                newValue = isObject2(objValue) ? objValue : isIndex(path[index2 + 1]) ? [] : {};
              }
            }
            assignValue(nested, key, newValue);
            nested = nested[key];
          }
          return object2;
        }
        var baseSetData = !metaMap ? identity : function(func, data) {
          metaMap.set(func, data);
          return func;
        };
        var baseSetToString = !defineProperty ? identity : function(func, string2) {
          return defineProperty(func, "toString", {
            "configurable": true,
            "enumerable": false,
            "value": constant(string2),
            "writable": true
          });
        };
        function baseShuffle(collection) {
          return shuffleSelf(values(collection));
        }
        function baseSlice(array2, start, end) {
          var index2 = -1, length = array2.length;
          if (start < 0) {
            start = -start > length ? 0 : length + start;
          }
          end = end > length ? length : end;
          if (end < 0) {
            end += length;
          }
          length = start > end ? 0 : end - start >>> 0;
          start >>>= 0;
          var result2 = Array2(length);
          while (++index2 < length) {
            result2[index2] = array2[index2 + start];
          }
          return result2;
        }
        function baseSome(collection, predicate) {
          var result2;
          baseEach(collection, function(value, index2, collection2) {
            result2 = predicate(value, index2, collection2);
            return !result2;
          });
          return !!result2;
        }
        function baseSortedIndex(array2, value, retHighest) {
          var low = 0, high = array2 == null ? low : array2.length;
          if (typeof value == "number" && value === value && high <= HALF_MAX_ARRAY_LENGTH) {
            while (low < high) {
              var mid = low + high >>> 1, computed = array2[mid];
              if (computed !== null && !isSymbol(computed) && (retHighest ? computed <= value : computed < value)) {
                low = mid + 1;
              } else {
                high = mid;
              }
            }
            return high;
          }
          return baseSortedIndexBy(array2, value, identity, retHighest);
        }
        function baseSortedIndexBy(array2, value, iteratee2, retHighest) {
          var low = 0, high = array2 == null ? 0 : array2.length;
          if (high === 0) {
            return 0;
          }
          value = iteratee2(value);
          var valIsNaN = value !== value, valIsNull = value === null, valIsSymbol = isSymbol(value), valIsUndefined = value === undefined$1;
          while (low < high) {
            var mid = nativeFloor((low + high) / 2), computed = iteratee2(array2[mid]), othIsDefined = computed !== undefined$1, othIsNull = computed === null, othIsReflexive = computed === computed, othIsSymbol = isSymbol(computed);
            if (valIsNaN) {
              var setLow = retHighest || othIsReflexive;
            } else if (valIsUndefined) {
              setLow = othIsReflexive && (retHighest || othIsDefined);
            } else if (valIsNull) {
              setLow = othIsReflexive && othIsDefined && (retHighest || !othIsNull);
            } else if (valIsSymbol) {
              setLow = othIsReflexive && othIsDefined && !othIsNull && (retHighest || !othIsSymbol);
            } else if (othIsNull || othIsSymbol) {
              setLow = false;
            } else {
              setLow = retHighest ? computed <= value : computed < value;
            }
            if (setLow) {
              low = mid + 1;
            } else {
              high = mid;
            }
          }
          return nativeMin(high, MAX_ARRAY_INDEX);
        }
        function baseSortedUniq(array2, iteratee2) {
          var index2 = -1, length = array2.length, resIndex = 0, result2 = [];
          while (++index2 < length) {
            var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
            if (!index2 || !eq(computed, seen)) {
              var seen = computed;
              result2[resIndex++] = value === 0 ? 0 : value;
            }
          }
          return result2;
        }
        function baseToNumber(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          return +value;
        }
        function baseToString(value) {
          if (typeof value == "string") {
            return value;
          }
          if (isArray(value)) {
            return arrayMap(value, baseToString) + "";
          }
          if (isSymbol(value)) {
            return symbolToString2 ? symbolToString2.call(value) : "";
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function baseUniq(array2, iteratee2, comparator) {
          var index2 = -1, includes2 = arrayIncludes, length = array2.length, isCommon = true, result2 = [], seen = result2;
          if (comparator) {
            isCommon = false;
            includes2 = arrayIncludesWith;
          } else if (length >= LARGE_ARRAY_SIZE) {
            var set3 = iteratee2 ? null : createSet(array2);
            if (set3) {
              return setToArray(set3);
            }
            isCommon = false;
            includes2 = cacheHas;
            seen = new SetCache();
          } else {
            seen = iteratee2 ? [] : result2;
          }
          outer:
            while (++index2 < length) {
              var value = array2[index2], computed = iteratee2 ? iteratee2(value) : value;
              value = comparator || value !== 0 ? value : 0;
              if (isCommon && computed === computed) {
                var seenIndex = seen.length;
                while (seenIndex--) {
                  if (seen[seenIndex] === computed) {
                    continue outer;
                  }
                }
                if (iteratee2) {
                  seen.push(computed);
                }
                result2.push(value);
              } else if (!includes2(seen, computed, comparator)) {
                if (seen !== result2) {
                  seen.push(computed);
                }
                result2.push(value);
              }
            }
          return result2;
        }
        function baseUnset(object2, path) {
          path = castPath(path, object2);
          var index2 = -1, length = path.length;
          if (!length) {
            return true;
          }
          while (++index2 < length) {
            var key = toKey(path[index2]);
            if (key === "__proto__" && !hasOwnProperty.call(object2, "__proto__")) {
              return false;
            }
            if ((key === "constructor" || key === "prototype") && index2 < length - 1) {
              return false;
            }
          }
          var obj = parent(object2, path);
          return obj == null || delete obj[toKey(last(path))];
        }
        function baseUpdate(object2, path, updater, customizer) {
          return baseSet(object2, path, updater(baseGet(object2, path)), customizer);
        }
        function baseWhile(array2, predicate, isDrop, fromRight) {
          var length = array2.length, index2 = fromRight ? length : -1;
          while ((fromRight ? index2-- : ++index2 < length) && predicate(array2[index2], index2, array2)) {
          }
          return isDrop ? baseSlice(array2, fromRight ? 0 : index2, fromRight ? index2 + 1 : length) : baseSlice(array2, fromRight ? index2 + 1 : 0, fromRight ? length : index2);
        }
        function baseWrapperValue(value, actions2) {
          var result2 = value;
          if (result2 instanceof LazyWrapper) {
            result2 = result2.value();
          }
          return arrayReduce(actions2, function(result3, action) {
            return action.func.apply(action.thisArg, arrayPush([result3], action.args));
          }, result2);
        }
        function baseXor(arrays, iteratee2, comparator) {
          var length = arrays.length;
          if (length < 2) {
            return length ? baseUniq(arrays[0]) : [];
          }
          var index2 = -1, result2 = Array2(length);
          while (++index2 < length) {
            var array2 = arrays[index2], othIndex = -1;
            while (++othIndex < length) {
              if (othIndex != index2) {
                result2[index2] = baseDifference(result2[index2] || array2, arrays[othIndex], iteratee2, comparator);
              }
            }
          }
          return baseUniq(baseFlatten(result2, 1), iteratee2, comparator);
        }
        function baseZipObject(props, values2, assignFunc) {
          var index2 = -1, length = props.length, valsLength = values2.length, result2 = {};
          while (++index2 < length) {
            var value = index2 < valsLength ? values2[index2] : undefined$1;
            assignFunc(result2, props[index2], value);
          }
          return result2;
        }
        function castArrayLikeObject(value) {
          return isArrayLikeObject(value) ? value : [];
        }
        function castFunction(value) {
          return typeof value == "function" ? value : identity;
        }
        function castPath(value, object2) {
          if (isArray(value)) {
            return value;
          }
          return isKey(value, object2) ? [value] : stringToPath(toString2(value));
        }
        var castRest = baseRest;
        function castSlice(array2, start, end) {
          var length = array2.length;
          end = end === undefined$1 ? length : end;
          return !start && end >= length ? array2 : baseSlice(array2, start, end);
        }
        var clearTimeout2 = ctxClearTimeout || function(id) {
          return root.clearTimeout(id);
        };
        function cloneBuffer(buffer, isDeep) {
          if (isDeep) {
            return buffer.slice();
          }
          var length = buffer.length, result2 = allocUnsafe ? allocUnsafe(length) : new buffer.constructor(length);
          buffer.copy(result2);
          return result2;
        }
        function cloneArrayBuffer(arrayBuffer) {
          var result2 = new arrayBuffer.constructor(arrayBuffer.byteLength);
          new Uint8Array(result2).set(new Uint8Array(arrayBuffer));
          return result2;
        }
        function cloneDataView(dataView, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(dataView.buffer) : dataView.buffer;
          return new dataView.constructor(buffer, dataView.byteOffset, dataView.byteLength);
        }
        function cloneRegExp(regexp) {
          var result2 = new regexp.constructor(regexp.source, reFlags.exec(regexp));
          result2.lastIndex = regexp.lastIndex;
          return result2;
        }
        function cloneSymbol(symbol) {
          return symbolValueOf ? Object2(symbolValueOf.call(symbol)) : {};
        }
        function cloneTypedArray(typedArray, isDeep) {
          var buffer = isDeep ? cloneArrayBuffer(typedArray.buffer) : typedArray.buffer;
          return new typedArray.constructor(buffer, typedArray.byteOffset, typedArray.length);
        }
        function compareAscending(value, other) {
          if (value !== other) {
            var valIsDefined = value !== undefined$1, valIsNull = value === null, valIsReflexive = value === value, valIsSymbol = isSymbol(value);
            var othIsDefined = other !== undefined$1, othIsNull = other === null, othIsReflexive = other === other, othIsSymbol = isSymbol(other);
            if (!othIsNull && !othIsSymbol && !valIsSymbol && value > other || valIsSymbol && othIsDefined && othIsReflexive && !othIsNull && !othIsSymbol || valIsNull && othIsDefined && othIsReflexive || !valIsDefined && othIsReflexive || !valIsReflexive) {
              return 1;
            }
            if (!valIsNull && !valIsSymbol && !othIsSymbol && value < other || othIsSymbol && valIsDefined && valIsReflexive && !valIsNull && !valIsSymbol || othIsNull && valIsDefined && valIsReflexive || !othIsDefined && valIsReflexive || !othIsReflexive) {
              return -1;
            }
          }
          return 0;
        }
        function compareMultiple(object2, other, orders) {
          var index2 = -1, objCriteria = object2.criteria, othCriteria = other.criteria, length = objCriteria.length, ordersLength = orders.length;
          while (++index2 < length) {
            var result2 = compareAscending(objCriteria[index2], othCriteria[index2]);
            if (result2) {
              if (index2 >= ordersLength) {
                return result2;
              }
              var order2 = orders[index2];
              return result2 * (order2 == "desc" ? -1 : 1);
            }
          }
          return object2.index - other.index;
        }
        function composeArgs(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersLength = holders.length, leftIndex = -1, leftLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(leftLength + rangeLength), isUncurried = !isCurried;
          while (++leftIndex < leftLength) {
            result2[leftIndex] = partials[leftIndex];
          }
          while (++argsIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[holders[argsIndex]] = args[argsIndex];
            }
          }
          while (rangeLength--) {
            result2[leftIndex++] = args[argsIndex++];
          }
          return result2;
        }
        function composeArgsRight(args, partials, holders, isCurried) {
          var argsIndex = -1, argsLength = args.length, holdersIndex = -1, holdersLength = holders.length, rightIndex = -1, rightLength = partials.length, rangeLength = nativeMax(argsLength - holdersLength, 0), result2 = Array2(rangeLength + rightLength), isUncurried = !isCurried;
          while (++argsIndex < rangeLength) {
            result2[argsIndex] = args[argsIndex];
          }
          var offset = argsIndex;
          while (++rightIndex < rightLength) {
            result2[offset + rightIndex] = partials[rightIndex];
          }
          while (++holdersIndex < holdersLength) {
            if (isUncurried || argsIndex < argsLength) {
              result2[offset + holders[holdersIndex]] = args[argsIndex++];
            }
          }
          return result2;
        }
        function copyArray(source, array2) {
          var index2 = -1, length = source.length;
          array2 || (array2 = Array2(length));
          while (++index2 < length) {
            array2[index2] = source[index2];
          }
          return array2;
        }
        function copyObject(source, props, object2, customizer) {
          var isNew = !object2;
          object2 || (object2 = {});
          var index2 = -1, length = props.length;
          while (++index2 < length) {
            var key = props[index2];
            var newValue = customizer ? customizer(object2[key], source[key], key, object2, source) : undefined$1;
            if (newValue === undefined$1) {
              newValue = source[key];
            }
            if (isNew) {
              baseAssignValue(object2, key, newValue);
            } else {
              assignValue(object2, key, newValue);
            }
          }
          return object2;
        }
        function copySymbols(source, object2) {
          return copyObject(source, getSymbols(source), object2);
        }
        function copySymbolsIn(source, object2) {
          return copyObject(source, getSymbolsIn(source), object2);
        }
        function createAggregator(setter, initializer2) {
          return function(collection, iteratee2) {
            var func = isArray(collection) ? arrayAggregator : baseAggregator, accumulator = initializer2 ? initializer2() : {};
            return func(collection, setter, getIteratee(iteratee2, 2), accumulator);
          };
        }
        function createAssigner(assigner) {
          return baseRest(function(object2, sources) {
            var index2 = -1, length = sources.length, customizer = length > 1 ? sources[length - 1] : undefined$1, guard = length > 2 ? sources[2] : undefined$1;
            customizer = assigner.length > 3 && typeof customizer == "function" ? (length--, customizer) : undefined$1;
            if (guard && isIterateeCall(sources[0], sources[1], guard)) {
              customizer = length < 3 ? undefined$1 : customizer;
              length = 1;
            }
            object2 = Object2(object2);
            while (++index2 < length) {
              var source = sources[index2];
              if (source) {
                assigner(object2, source, index2, customizer);
              }
            }
            return object2;
          });
        }
        function createBaseEach(eachFunc, fromRight) {
          return function(collection, iteratee2) {
            if (collection == null) {
              return collection;
            }
            if (!isArrayLike(collection)) {
              return eachFunc(collection, iteratee2);
            }
            var length = collection.length, index2 = fromRight ? length : -1, iterable = Object2(collection);
            while (fromRight ? index2-- : ++index2 < length) {
              if (iteratee2(iterable[index2], index2, iterable) === false) {
                break;
              }
            }
            return collection;
          };
        }
        function createBaseFor(fromRight) {
          return function(object2, iteratee2, keysFunc) {
            var index2 = -1, iterable = Object2(object2), props = keysFunc(object2), length = props.length;
            while (length--) {
              var key = props[fromRight ? length : ++index2];
              if (iteratee2(iterable[key], key, iterable) === false) {
                break;
              }
            }
            return object2;
          };
        }
        function createBind(func, bitmask, thisArg) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return fn.apply(isBind ? thisArg : this, arguments);
          }
          return wrapper;
        }
        function createCaseFirst(methodName) {
          return function(string2) {
            string2 = toString2(string2);
            var strSymbols = hasUnicode(string2) ? stringToArray(string2) : undefined$1;
            var chr = strSymbols ? strSymbols[0] : string2.charAt(0);
            var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string2.slice(1);
            return chr[methodName]() + trailing;
          };
        }
        function createCompounder(callback) {
          return function(string2) {
            return arrayReduce(words(deburr(string2).replace(reApos, "")), callback, "");
          };
        }
        function createCtor(Ctor) {
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return new Ctor();
              case 1:
                return new Ctor(args[0]);
              case 2:
                return new Ctor(args[0], args[1]);
              case 3:
                return new Ctor(args[0], args[1], args[2]);
              case 4:
                return new Ctor(args[0], args[1], args[2], args[3]);
              case 5:
                return new Ctor(args[0], args[1], args[2], args[3], args[4]);
              case 6:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5]);
              case 7:
                return new Ctor(args[0], args[1], args[2], args[3], args[4], args[5], args[6]);
            }
            var thisBinding = baseCreate(Ctor.prototype), result2 = Ctor.apply(thisBinding, args);
            return isObject2(result2) ? result2 : thisBinding;
          };
        }
        function createCurry(func, bitmask, arity) {
          var Ctor = createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index2 = length, placeholder = getHolder(wrapper);
            while (index2--) {
              args[index2] = arguments[index2];
            }
            var holders = length < 3 && args[0] !== placeholder && args[length - 1] !== placeholder ? [] : replaceHolders(args, placeholder);
            length -= holders.length;
            if (length < arity) {
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                undefined$1,
                args,
                holders,
                undefined$1,
                undefined$1,
                arity - length
              );
            }
            var fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            return apply(fn, this, args);
          }
          return wrapper;
        }
        function createFind(findIndexFunc) {
          return function(collection, predicate, fromIndex) {
            var iterable = Object2(collection);
            if (!isArrayLike(collection)) {
              var iteratee2 = getIteratee(predicate, 3);
              collection = keys(collection);
              predicate = function(key) {
                return iteratee2(iterable[key], key, iterable);
              };
            }
            var index2 = findIndexFunc(collection, predicate, fromIndex);
            return index2 > -1 ? iterable[iteratee2 ? collection[index2] : index2] : undefined$1;
          };
        }
        function createFlow(fromRight) {
          return flatRest(function(funcs) {
            var length = funcs.length, index2 = length, prereq = LodashWrapper.prototype.thru;
            if (fromRight) {
              funcs.reverse();
            }
            while (index2--) {
              var func = funcs[index2];
              if (typeof func != "function") {
                throw new TypeError2(FUNC_ERROR_TEXT);
              }
              if (prereq && !wrapper && getFuncName(func) == "wrapper") {
                var wrapper = new LodashWrapper([], true);
              }
            }
            index2 = wrapper ? index2 : length;
            while (++index2 < length) {
              func = funcs[index2];
              var funcName = getFuncName(func), data = funcName == "wrapper" ? getData(func) : undefined$1;
              if (data && isLaziable(data[0]) && data[1] == (WRAP_ARY_FLAG | WRAP_CURRY_FLAG | WRAP_PARTIAL_FLAG | WRAP_REARG_FLAG) && !data[4].length && data[9] == 1) {
                wrapper = wrapper[getFuncName(data[0])].apply(wrapper, data[3]);
              } else {
                wrapper = func.length == 1 && isLaziable(func) ? wrapper[funcName]() : wrapper.thru(func);
              }
            }
            return function() {
              var args = arguments, value = args[0];
              if (wrapper && args.length == 1 && isArray(value)) {
                return wrapper.plant(value).value();
              }
              var index3 = 0, result2 = length ? funcs[index3].apply(this, args) : value;
              while (++index3 < length) {
                result2 = funcs[index3].call(this, result2);
              }
              return result2;
            };
          });
        }
        function createHybrid(func, bitmask, thisArg, partials, holders, partialsRight, holdersRight, argPos, ary2, arity) {
          var isAry = bitmask & WRAP_ARY_FLAG, isBind = bitmask & WRAP_BIND_FLAG, isBindKey = bitmask & WRAP_BIND_KEY_FLAG, isCurried = bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG), isFlip = bitmask & WRAP_FLIP_FLAG, Ctor = isBindKey ? undefined$1 : createCtor(func);
          function wrapper() {
            var length = arguments.length, args = Array2(length), index2 = length;
            while (index2--) {
              args[index2] = arguments[index2];
            }
            if (isCurried) {
              var placeholder = getHolder(wrapper), holdersCount = countHolders(args, placeholder);
            }
            if (partials) {
              args = composeArgs(args, partials, holders, isCurried);
            }
            if (partialsRight) {
              args = composeArgsRight(args, partialsRight, holdersRight, isCurried);
            }
            length -= holdersCount;
            if (isCurried && length < arity) {
              var newHolders = replaceHolders(args, placeholder);
              return createRecurry(
                func,
                bitmask,
                createHybrid,
                wrapper.placeholder,
                thisArg,
                args,
                newHolders,
                argPos,
                ary2,
                arity - length
              );
            }
            var thisBinding = isBind ? thisArg : this, fn = isBindKey ? thisBinding[func] : func;
            length = args.length;
            if (argPos) {
              args = reorder(args, argPos);
            } else if (isFlip && length > 1) {
              args.reverse();
            }
            if (isAry && ary2 < length) {
              args.length = ary2;
            }
            if (this && this !== root && this instanceof wrapper) {
              fn = Ctor || createCtor(fn);
            }
            return fn.apply(thisBinding, args);
          }
          return wrapper;
        }
        function createInverter(setter, toIteratee) {
          return function(object2, iteratee2) {
            return baseInverter(object2, setter, toIteratee(iteratee2), {});
          };
        }
        function createMathOperation(operator, defaultValue) {
          return function(value, other) {
            var result2;
            if (value === undefined$1 && other === undefined$1) {
              return defaultValue;
            }
            if (value !== undefined$1) {
              result2 = value;
            }
            if (other !== undefined$1) {
              if (result2 === undefined$1) {
                return other;
              }
              if (typeof value == "string" || typeof other == "string") {
                value = baseToString(value);
                other = baseToString(other);
              } else {
                value = baseToNumber(value);
                other = baseToNumber(other);
              }
              result2 = operator(value, other);
            }
            return result2;
          };
        }
        function createOver(arrayFunc) {
          return flatRest(function(iteratees) {
            iteratees = arrayMap(iteratees, baseUnary(getIteratee()));
            return baseRest(function(args) {
              var thisArg = this;
              return arrayFunc(iteratees, function(iteratee2) {
                return apply(iteratee2, thisArg, args);
              });
            });
          });
        }
        function createPadding(length, chars) {
          chars = chars === undefined$1 ? " " : baseToString(chars);
          var charsLength = chars.length;
          if (charsLength < 2) {
            return charsLength ? baseRepeat(chars, length) : chars;
          }
          var result2 = baseRepeat(chars, nativeCeil(length / stringSize(chars)));
          return hasUnicode(chars) ? castSlice(stringToArray(result2), 0, length).join("") : result2.slice(0, length);
        }
        function createPartial(func, bitmask, thisArg, partials) {
          var isBind = bitmask & WRAP_BIND_FLAG, Ctor = createCtor(func);
          function wrapper() {
            var argsIndex = -1, argsLength = arguments.length, leftIndex = -1, leftLength = partials.length, args = Array2(leftLength + argsLength), fn = this && this !== root && this instanceof wrapper ? Ctor : func;
            while (++leftIndex < leftLength) {
              args[leftIndex] = partials[leftIndex];
            }
            while (argsLength--) {
              args[leftIndex++] = arguments[++argsIndex];
            }
            return apply(fn, isBind ? thisArg : this, args);
          }
          return wrapper;
        }
        function createRange(fromRight) {
          return function(start, end, step) {
            if (step && typeof step != "number" && isIterateeCall(start, end, step)) {
              end = step = undefined$1;
            }
            start = toFinite(start);
            if (end === undefined$1) {
              end = start;
              start = 0;
            } else {
              end = toFinite(end);
            }
            step = step === undefined$1 ? start < end ? 1 : -1 : toFinite(step);
            return baseRange(start, end, step, fromRight);
          };
        }
        function createRelationalOperation(operator) {
          return function(value, other) {
            if (!(typeof value == "string" && typeof other == "string")) {
              value = toNumber2(value);
              other = toNumber2(other);
            }
            return operator(value, other);
          };
        }
        function createRecurry(func, bitmask, wrapFunc, placeholder, thisArg, partials, holders, argPos, ary2, arity) {
          var isCurry = bitmask & WRAP_CURRY_FLAG, newHolders = isCurry ? holders : undefined$1, newHoldersRight = isCurry ? undefined$1 : holders, newPartials = isCurry ? partials : undefined$1, newPartialsRight = isCurry ? undefined$1 : partials;
          bitmask |= isCurry ? WRAP_PARTIAL_FLAG : WRAP_PARTIAL_RIGHT_FLAG;
          bitmask &= ~(isCurry ? WRAP_PARTIAL_RIGHT_FLAG : WRAP_PARTIAL_FLAG);
          if (!(bitmask & WRAP_CURRY_BOUND_FLAG)) {
            bitmask &= -4;
          }
          var newData = [
            func,
            bitmask,
            thisArg,
            newPartials,
            newHolders,
            newPartialsRight,
            newHoldersRight,
            argPos,
            ary2,
            arity
          ];
          var result2 = wrapFunc.apply(undefined$1, newData);
          if (isLaziable(func)) {
            setData(result2, newData);
          }
          result2.placeholder = placeholder;
          return setWrapToString(result2, func, bitmask);
        }
        function createRound(methodName) {
          var func = Math2[methodName];
          return function(number2, precision) {
            number2 = toNumber2(number2);
            precision = precision == null ? 0 : nativeMin(toInteger(precision), 292);
            if (precision && nativeIsFinite(number2)) {
              var pair = (toString2(number2) + "e").split("e"), value = func(pair[0] + "e" + (+pair[1] + precision));
              pair = (toString2(value) + "e").split("e");
              return +(pair[0] + "e" + (+pair[1] - precision));
            }
            return func(number2);
          };
        }
        var createSet = !(Set2 && 1 / setToArray(new Set2([, -0]))[1] == INFINITY) ? noop : function(values2) {
          return new Set2(values2);
        };
        function createToPairs(keysFunc) {
          return function(object2) {
            var tag = getTag(object2);
            if (tag == mapTag) {
              return mapToArray(object2);
            }
            if (tag == setTag) {
              return setToPairs(object2);
            }
            return baseToPairs(object2, keysFunc(object2));
          };
        }
        function createWrap(func, bitmask, thisArg, partials, holders, argPos, ary2, arity) {
          var isBindKey = bitmask & WRAP_BIND_KEY_FLAG;
          if (!isBindKey && typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var length = partials ? partials.length : 0;
          if (!length) {
            bitmask &= -97;
            partials = holders = undefined$1;
          }
          ary2 = ary2 === undefined$1 ? ary2 : nativeMax(toInteger(ary2), 0);
          arity = arity === undefined$1 ? arity : toInteger(arity);
          length -= holders ? holders.length : 0;
          if (bitmask & WRAP_PARTIAL_RIGHT_FLAG) {
            var partialsRight = partials, holdersRight = holders;
            partials = holders = undefined$1;
          }
          var data = isBindKey ? undefined$1 : getData(func);
          var newData = [
            func,
            bitmask,
            thisArg,
            partials,
            holders,
            partialsRight,
            holdersRight,
            argPos,
            ary2,
            arity
          ];
          if (data) {
            mergeData(newData, data);
          }
          func = newData[0];
          bitmask = newData[1];
          thisArg = newData[2];
          partials = newData[3];
          holders = newData[4];
          arity = newData[9] = newData[9] === undefined$1 ? isBindKey ? 0 : func.length : nativeMax(newData[9] - length, 0);
          if (!arity && bitmask & (WRAP_CURRY_FLAG | WRAP_CURRY_RIGHT_FLAG)) {
            bitmask &= -25;
          }
          if (!bitmask || bitmask == WRAP_BIND_FLAG) {
            var result2 = createBind(func, bitmask, thisArg);
          } else if (bitmask == WRAP_CURRY_FLAG || bitmask == WRAP_CURRY_RIGHT_FLAG) {
            result2 = createCurry(func, bitmask, arity);
          } else if ((bitmask == WRAP_PARTIAL_FLAG || bitmask == (WRAP_BIND_FLAG | WRAP_PARTIAL_FLAG)) && !holders.length) {
            result2 = createPartial(func, bitmask, thisArg, partials);
          } else {
            result2 = createHybrid.apply(undefined$1, newData);
          }
          var setter = data ? baseSetData : setData;
          return setWrapToString(setter(result2, newData), func, bitmask);
        }
        function customDefaultsAssignIn(objValue, srcValue, key, object2) {
          if (objValue === undefined$1 || eq(objValue, objectProto[key]) && !hasOwnProperty.call(object2, key)) {
            return srcValue;
          }
          return objValue;
        }
        function customDefaultsMerge(objValue, srcValue, key, object2, source, stack) {
          if (isObject2(objValue) && isObject2(srcValue)) {
            stack.set(srcValue, objValue);
            baseMerge(objValue, srcValue, undefined$1, customDefaultsMerge, stack);
            stack["delete"](srcValue);
          }
          return objValue;
        }
        function customOmitClone(value) {
          return isPlainObject2(value) ? undefined$1 : value;
        }
        function equalArrays(array2, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array2.length, othLength = other.length;
          if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
            return false;
          }
          var arrStacked = stack.get(array2);
          var othStacked = stack.get(other);
          if (arrStacked && othStacked) {
            return arrStacked == other && othStacked == array2;
          }
          var index2 = -1, result2 = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : undefined$1;
          stack.set(array2, other);
          stack.set(other, array2);
          while (++index2 < arrLength) {
            var arrValue = array2[index2], othValue = other[index2];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, arrValue, index2, other, array2, stack) : customizer(arrValue, othValue, index2, array2, other, stack);
            }
            if (compared !== undefined$1) {
              if (compared) {
                continue;
              }
              result2 = false;
              break;
            }
            if (seen) {
              if (!arraySome(other, function(othValue2, othIndex) {
                if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
                  return seen.push(othIndex);
                }
              })) {
                result2 = false;
                break;
              }
            } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
              result2 = false;
              break;
            }
          }
          stack["delete"](array2);
          stack["delete"](other);
          return result2;
        }
        function equalByTag(object2, other, tag, bitmask, customizer, equalFunc, stack) {
          switch (tag) {
            case dataViewTag:
              if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
                return false;
              }
              object2 = object2.buffer;
              other = other.buffer;
            case arrayBufferTag:
              if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array(object2), new Uint8Array(other))) {
                return false;
              }
              return true;
            case boolTag:
            case dateTag:
            case numberTag:
              return eq(+object2, +other);
            case errorTag:
              return object2.name == other.name && object2.message == other.message;
            case regexpTag:
            case stringTag:
              return object2 == other + "";
            case mapTag:
              var convert = mapToArray;
            case setTag:
              var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
              convert || (convert = setToArray);
              if (object2.size != other.size && !isPartial) {
                return false;
              }
              var stacked = stack.get(object2);
              if (stacked) {
                return stacked == other;
              }
              bitmask |= COMPARE_UNORDERED_FLAG;
              stack.set(object2, other);
              var result2 = equalArrays(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
              stack["delete"](object2);
              return result2;
            case symbolTag:
              if (symbolValueOf) {
                return symbolValueOf.call(object2) == symbolValueOf.call(other);
              }
          }
          return false;
        }
        function equalObjects(object2, other, bitmask, customizer, equalFunc, stack) {
          var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object2), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
          if (objLength != othLength && !isPartial) {
            return false;
          }
          var index2 = objLength;
          while (index2--) {
            var key = objProps[index2];
            if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
              return false;
            }
          }
          var objStacked = stack.get(object2);
          var othStacked = stack.get(other);
          if (objStacked && othStacked) {
            return objStacked == other && othStacked == object2;
          }
          var result2 = true;
          stack.set(object2, other);
          stack.set(other, object2);
          var skipCtor = isPartial;
          while (++index2 < objLength) {
            key = objProps[index2];
            var objValue = object2[key], othValue = other[key];
            if (customizer) {
              var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
            }
            if (!(compared === undefined$1 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
              result2 = false;
              break;
            }
            skipCtor || (skipCtor = key == "constructor");
          }
          if (result2 && !skipCtor) {
            var objCtor = object2.constructor, othCtor = other.constructor;
            if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
              result2 = false;
            }
          }
          stack["delete"](object2);
          stack["delete"](other);
          return result2;
        }
        function flatRest(func) {
          return setToString(overRest(func, undefined$1, flatten), func + "");
        }
        function getAllKeys(object2) {
          return baseGetAllKeys(object2, keys, getSymbols);
        }
        function getAllKeysIn(object2) {
          return baseGetAllKeys(object2, keysIn, getSymbolsIn);
        }
        var getData = !metaMap ? noop : function(func) {
          return metaMap.get(func);
        };
        function getFuncName(func) {
          var result2 = func.name + "", array2 = realNames[result2], length = hasOwnProperty.call(realNames, result2) ? array2.length : 0;
          while (length--) {
            var data = array2[length], otherFunc = data.func;
            if (otherFunc == null || otherFunc == func) {
              return data.name;
            }
          }
          return result2;
        }
        function getHolder(func) {
          var object2 = hasOwnProperty.call(lodash2, "placeholder") ? lodash2 : func;
          return object2.placeholder;
        }
        function getIteratee() {
          var result2 = lodash2.iteratee || iteratee;
          result2 = result2 === iteratee ? baseIteratee : result2;
          return arguments.length ? result2(arguments[0], arguments[1]) : result2;
        }
        function getMapData(map3, key) {
          var data = map3.__data__;
          return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
        }
        function getMatchData(object2) {
          var result2 = keys(object2), length = result2.length;
          while (length--) {
            var key = result2[length], value = object2[key];
            result2[length] = [key, value, isStrictComparable(value)];
          }
          return result2;
        }
        function getNative(object2, key) {
          var value = getValue(object2, key);
          return baseIsNative(value) ? value : undefined$1;
        }
        function getRawTag(value) {
          var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
          try {
            value[symToStringTag] = undefined$1;
            var unmasked = true;
          } catch (e) {
          }
          var result2 = nativeObjectToString.call(value);
          if (unmasked) {
            if (isOwn) {
              value[symToStringTag] = tag;
            } else {
              delete value[symToStringTag];
            }
          }
          return result2;
        }
        var getSymbols = !nativeGetSymbols ? stubArray : function(object2) {
          if (object2 == null) {
            return [];
          }
          object2 = Object2(object2);
          return arrayFilter(nativeGetSymbols(object2), function(symbol) {
            return propertyIsEnumerable.call(object2, symbol);
          });
        };
        var getSymbolsIn = !nativeGetSymbols ? stubArray : function(object2) {
          var result2 = [];
          while (object2) {
            arrayPush(result2, getSymbols(object2));
            object2 = getPrototype(object2);
          }
          return result2;
        };
        var getTag = baseGetTag;
        if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap2 && getTag(new WeakMap2()) != weakMapTag) {
          getTag = function(value) {
            var result2 = baseGetTag(value), Ctor = result2 == objectTag ? value.constructor : undefined$1, ctorString = Ctor ? toSource(Ctor) : "";
            if (ctorString) {
              switch (ctorString) {
                case dataViewCtorString:
                  return dataViewTag;
                case mapCtorString:
                  return mapTag;
                case promiseCtorString:
                  return promiseTag;
                case setCtorString:
                  return setTag;
                case weakMapCtorString:
                  return weakMapTag;
              }
            }
            return result2;
          };
        }
        function getView(start, end, transforms) {
          var index2 = -1, length = transforms.length;
          while (++index2 < length) {
            var data = transforms[index2], size2 = data.size;
            switch (data.type) {
              case "drop":
                start += size2;
                break;
              case "dropRight":
                end -= size2;
                break;
              case "take":
                end = nativeMin(end, start + size2);
                break;
              case "takeRight":
                start = nativeMax(start, end - size2);
                break;
            }
          }
          return { "start": start, "end": end };
        }
        function getWrapDetails(source) {
          var match = source.match(reWrapDetails);
          return match ? match[1].split(reSplitDetails) : [];
        }
        function hasPath(object2, path, hasFunc) {
          path = castPath(path, object2);
          var index2 = -1, length = path.length, result2 = false;
          while (++index2 < length) {
            var key = toKey(path[index2]);
            if (!(result2 = object2 != null && hasFunc(object2, key))) {
              break;
            }
            object2 = object2[key];
          }
          if (result2 || ++index2 != length) {
            return result2;
          }
          length = object2 == null ? 0 : object2.length;
          return !!length && isLength(length) && isIndex(key, length) && (isArray(object2) || isArguments(object2));
        }
        function initCloneArray(array2) {
          var length = array2.length, result2 = new array2.constructor(length);
          if (length && typeof array2[0] == "string" && hasOwnProperty.call(array2, "index")) {
            result2.index = array2.index;
            result2.input = array2.input;
          }
          return result2;
        }
        function initCloneObject(object2) {
          return typeof object2.constructor == "function" && !isPrototype(object2) ? baseCreate(getPrototype(object2)) : {};
        }
        function initCloneByTag(object2, tag, isDeep) {
          var Ctor = object2.constructor;
          switch (tag) {
            case arrayBufferTag:
              return cloneArrayBuffer(object2);
            case boolTag:
            case dateTag:
              return new Ctor(+object2);
            case dataViewTag:
              return cloneDataView(object2, isDeep);
            case float32Tag:
            case float64Tag:
            case int8Tag:
            case int16Tag:
            case int32Tag:
            case uint8Tag:
            case uint8ClampedTag:
            case uint16Tag:
            case uint32Tag:
              return cloneTypedArray(object2, isDeep);
            case mapTag:
              return new Ctor();
            case numberTag:
            case stringTag:
              return new Ctor(object2);
            case regexpTag:
              return cloneRegExp(object2);
            case setTag:
              return new Ctor();
            case symbolTag:
              return cloneSymbol(object2);
          }
        }
        function insertWrapDetails(source, details) {
          var length = details.length;
          if (!length) {
            return source;
          }
          var lastIndex = length - 1;
          details[lastIndex] = (length > 1 ? "& " : "") + details[lastIndex];
          details = details.join(length > 2 ? ", " : " ");
          return source.replace(reWrapComment, "{\n/* [wrapped with " + details + "] */\n");
        }
        function isFlattenable(value) {
          return isArray(value) || isArguments(value) || !!(spreadableSymbol && value && value[spreadableSymbol]);
        }
        function isIndex(value, length) {
          var type = typeof value;
          length = length == null ? MAX_SAFE_INTEGER : length;
          return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
        }
        function isIterateeCall(value, index2, object2) {
          if (!isObject2(object2)) {
            return false;
          }
          var type = typeof index2;
          if (type == "number" ? isArrayLike(object2) && isIndex(index2, object2.length) : type == "string" && index2 in object2) {
            return eq(object2[index2], value);
          }
          return false;
        }
        function isKey(value, object2) {
          if (isArray(value)) {
            return false;
          }
          var type = typeof value;
          if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
            return true;
          }
          return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object2(object2);
        }
        function isKeyable(value) {
          var type = typeof value;
          return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
        }
        function isLaziable(func) {
          var funcName = getFuncName(func), other = lodash2[funcName];
          if (typeof other != "function" || !(funcName in LazyWrapper.prototype)) {
            return false;
          }
          if (func === other) {
            return true;
          }
          var data = getData(other);
          return !!data && func === data[0];
        }
        function isMasked(func) {
          return !!maskSrcKey && maskSrcKey in func;
        }
        var isMaskable = coreJsData ? isFunction2 : stubFalse;
        function isPrototype(value) {
          var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
          return value === proto;
        }
        function isStrictComparable(value) {
          return value === value && !isObject2(value);
        }
        function matchesStrictComparable(key, srcValue) {
          return function(object2) {
            if (object2 == null) {
              return false;
            }
            return object2[key] === srcValue && (srcValue !== undefined$1 || key in Object2(object2));
          };
        }
        function memoizeCapped(func) {
          var result2 = memoize(func, function(key) {
            if (cache.size === MAX_MEMOIZE_SIZE) {
              cache.clear();
            }
            return key;
          });
          var cache = result2.cache;
          return result2;
        }
        function mergeData(data, source) {
          var bitmask = data[1], srcBitmask = source[1], newBitmask = bitmask | srcBitmask, isCommon = newBitmask < (WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG | WRAP_ARY_FLAG);
          var isCombo = srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_CURRY_FLAG || srcBitmask == WRAP_ARY_FLAG && bitmask == WRAP_REARG_FLAG && data[7].length <= source[8] || srcBitmask == (WRAP_ARY_FLAG | WRAP_REARG_FLAG) && source[7].length <= source[8] && bitmask == WRAP_CURRY_FLAG;
          if (!(isCommon || isCombo)) {
            return data;
          }
          if (srcBitmask & WRAP_BIND_FLAG) {
            data[2] = source[2];
            newBitmask |= bitmask & WRAP_BIND_FLAG ? 0 : WRAP_CURRY_BOUND_FLAG;
          }
          var value = source[3];
          if (value) {
            var partials = data[3];
            data[3] = partials ? composeArgs(partials, value, source[4]) : value;
            data[4] = partials ? replaceHolders(data[3], PLACEHOLDER) : source[4];
          }
          value = source[5];
          if (value) {
            partials = data[5];
            data[5] = partials ? composeArgsRight(partials, value, source[6]) : value;
            data[6] = partials ? replaceHolders(data[5], PLACEHOLDER) : source[6];
          }
          value = source[7];
          if (value) {
            data[7] = value;
          }
          if (srcBitmask & WRAP_ARY_FLAG) {
            data[8] = data[8] == null ? source[8] : nativeMin(data[8], source[8]);
          }
          if (data[9] == null) {
            data[9] = source[9];
          }
          data[0] = source[0];
          data[1] = newBitmask;
          return data;
        }
        function nativeKeysIn(object2) {
          var result2 = [];
          if (object2 != null) {
            for (var key in Object2(object2)) {
              result2.push(key);
            }
          }
          return result2;
        }
        function objectToString(value) {
          return nativeObjectToString.call(value);
        }
        function overRest(func, start, transform3) {
          start = nativeMax(start === undefined$1 ? func.length - 1 : start, 0);
          return function() {
            var args = arguments, index2 = -1, length = nativeMax(args.length - start, 0), array2 = Array2(length);
            while (++index2 < length) {
              array2[index2] = args[start + index2];
            }
            index2 = -1;
            var otherArgs = Array2(start + 1);
            while (++index2 < start) {
              otherArgs[index2] = args[index2];
            }
            otherArgs[start] = transform3(array2);
            return apply(func, this, otherArgs);
          };
        }
        function parent(object2, path) {
          return path.length < 2 ? object2 : baseGet(object2, baseSlice(path, 0, -1));
        }
        function reorder(array2, indexes) {
          var arrLength = array2.length, length = nativeMin(indexes.length, arrLength), oldArray = copyArray(array2);
          while (length--) {
            var index2 = indexes[length];
            array2[length] = isIndex(index2, arrLength) ? oldArray[index2] : undefined$1;
          }
          return array2;
        }
        function safeGet(object2, key) {
          if (key === "constructor" && typeof object2[key] === "function") {
            return;
          }
          if (key == "__proto__") {
            return;
          }
          return object2[key];
        }
        var setData = shortOut(baseSetData);
        var setTimeout2 = ctxSetTimeout || function(func, wait) {
          return root.setTimeout(func, wait);
        };
        var setToString = shortOut(baseSetToString);
        function setWrapToString(wrapper, reference, bitmask) {
          var source = reference + "";
          return setToString(wrapper, insertWrapDetails(source, updateWrapDetails(getWrapDetails(source), bitmask)));
        }
        function shortOut(func) {
          var count = 0, lastCalled = 0;
          return function() {
            var stamp = nativeNow(), remaining = HOT_SPAN - (stamp - lastCalled);
            lastCalled = stamp;
            if (remaining > 0) {
              if (++count >= HOT_COUNT) {
                return arguments[0];
              }
            } else {
              count = 0;
            }
            return func.apply(undefined$1, arguments);
          };
        }
        function shuffleSelf(array2, size2) {
          var index2 = -1, length = array2.length, lastIndex = length - 1;
          size2 = size2 === undefined$1 ? length : size2;
          while (++index2 < size2) {
            var rand = baseRandom(index2, lastIndex), value = array2[rand];
            array2[rand] = array2[index2];
            array2[index2] = value;
          }
          array2.length = size2;
          return array2;
        }
        var stringToPath = memoizeCapped(function(string2) {
          var result2 = [];
          if (string2.charCodeAt(0) === 46) {
            result2.push("");
          }
          string2.replace(rePropName, function(match, number2, quote, subString) {
            result2.push(quote ? subString.replace(reEscapeChar, "$1") : number2 || match);
          });
          return result2;
        });
        function toKey(value) {
          if (typeof value == "string" || isSymbol(value)) {
            return value;
          }
          var result2 = value + "";
          return result2 == "0" && 1 / value == -INFINITY ? "-0" : result2;
        }
        function toSource(func) {
          if (func != null) {
            try {
              return funcToString.call(func);
            } catch (e) {
            }
            try {
              return func + "";
            } catch (e) {
            }
          }
          return "";
        }
        function updateWrapDetails(details, bitmask) {
          arrayEach(wrapFlags, function(pair) {
            var value = "_." + pair[0];
            if (bitmask & pair[1] && !arrayIncludes(details, value)) {
              details.push(value);
            }
          });
          return details.sort();
        }
        function wrapperClone(wrapper) {
          if (wrapper instanceof LazyWrapper) {
            return wrapper.clone();
          }
          var result2 = new LodashWrapper(wrapper.__wrapped__, wrapper.__chain__);
          result2.__actions__ = copyArray(wrapper.__actions__);
          result2.__index__ = wrapper.__index__;
          result2.__values__ = wrapper.__values__;
          return result2;
        }
        function chunk(array2, size2, guard) {
          if (guard ? isIterateeCall(array2, size2, guard) : size2 === undefined$1) {
            size2 = 1;
          } else {
            size2 = nativeMax(toInteger(size2), 0);
          }
          var length = array2 == null ? 0 : array2.length;
          if (!length || size2 < 1) {
            return [];
          }
          var index2 = 0, resIndex = 0, result2 = Array2(nativeCeil(length / size2));
          while (index2 < length) {
            result2[resIndex++] = baseSlice(array2, index2, index2 += size2);
          }
          return result2;
        }
        function compact2(array2) {
          var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result2 = [];
          while (++index2 < length) {
            var value = array2[index2];
            if (value) {
              result2[resIndex++] = value;
            }
          }
          return result2;
        }
        function concat() {
          var length = arguments.length;
          if (!length) {
            return [];
          }
          var args = Array2(length - 1), array2 = arguments[0], index2 = length;
          while (index2--) {
            args[index2 - 1] = arguments[index2];
          }
          return arrayPush(isArray(array2) ? copyArray(array2) : [array2], baseFlatten(args, 1));
        }
        var difference = baseRest(function(array2, values2) {
          return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true)) : [];
        });
        var differenceBy = baseRest(function(array2, values2) {
          var iteratee2 = last(values2);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined$1;
          }
          return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2)) : [];
        });
        var differenceWith = baseRest(function(array2, values2) {
          var comparator = last(values2);
          if (isArrayLikeObject(comparator)) {
            comparator = undefined$1;
          }
          return isArrayLikeObject(array2) ? baseDifference(array2, baseFlatten(values2, 1, isArrayLikeObject, true), undefined$1, comparator) : [];
        });
        function drop(array2, n, guard) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined$1 ? 1 : toInteger(n);
          return baseSlice(array2, n < 0 ? 0 : n, length);
        }
        function dropRight(array2, n, guard) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined$1 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array2, 0, n < 0 ? 0 : n);
        }
        function dropRightWhile(array2, predicate) {
          return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), true, true) : [];
        }
        function dropWhile(array2, predicate) {
          return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), true) : [];
        }
        function fill(array2, value, start, end) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          if (start && typeof start != "number" && isIterateeCall(array2, value, start)) {
            start = 0;
            end = length;
          }
          return baseFill(array2, value, start, end);
        }
        function findIndex2(array2, predicate, fromIndex) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return -1;
          }
          var index2 = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index2 < 0) {
            index2 = nativeMax(length + index2, 0);
          }
          return baseFindIndex(array2, getIteratee(predicate, 3), index2);
        }
        function findLastIndex(array2, predicate, fromIndex) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return -1;
          }
          var index2 = length - 1;
          if (fromIndex !== undefined$1) {
            index2 = toInteger(fromIndex);
            index2 = fromIndex < 0 ? nativeMax(length + index2, 0) : nativeMin(index2, length - 1);
          }
          return baseFindIndex(array2, getIteratee(predicate, 3), index2, true);
        }
        function flatten(array2) {
          var length = array2 == null ? 0 : array2.length;
          return length ? baseFlatten(array2, 1) : [];
        }
        function flattenDeep(array2) {
          var length = array2 == null ? 0 : array2.length;
          return length ? baseFlatten(array2, INFINITY) : [];
        }
        function flattenDepth(array2, depth) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          depth = depth === undefined$1 ? 1 : toInteger(depth);
          return baseFlatten(array2, depth);
        }
        function fromPairs(pairs) {
          var index2 = -1, length = pairs == null ? 0 : pairs.length, result2 = {};
          while (++index2 < length) {
            var pair = pairs[index2];
            baseAssignValue(result2, pair[0], pair[1]);
          }
          return result2;
        }
        function head(array2) {
          return array2 && array2.length ? array2[0] : undefined$1;
        }
        function indexOf(array2, value, fromIndex) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return -1;
          }
          var index2 = fromIndex == null ? 0 : toInteger(fromIndex);
          if (index2 < 0) {
            index2 = nativeMax(length + index2, 0);
          }
          return baseIndexOf(array2, value, index2);
        }
        function initial(array2) {
          var length = array2 == null ? 0 : array2.length;
          return length ? baseSlice(array2, 0, -1) : [];
        }
        var intersection2 = baseRest(function(arrays) {
          var mapped = arrayMap(arrays, castArrayLikeObject);
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped) : [];
        });
        var intersectionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          if (iteratee2 === last(mapped)) {
            iteratee2 = undefined$1;
          } else {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, getIteratee(iteratee2, 2)) : [];
        });
        var intersectionWith = baseRest(function(arrays) {
          var comparator = last(arrays), mapped = arrayMap(arrays, castArrayLikeObject);
          comparator = typeof comparator == "function" ? comparator : undefined$1;
          if (comparator) {
            mapped.pop();
          }
          return mapped.length && mapped[0] === arrays[0] ? baseIntersection(mapped, undefined$1, comparator) : [];
        });
        function join(array2, separator) {
          return array2 == null ? "" : nativeJoin.call(array2, separator);
        }
        function last(array2) {
          var length = array2 == null ? 0 : array2.length;
          return length ? array2[length - 1] : undefined$1;
        }
        function lastIndexOf(array2, value, fromIndex) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return -1;
          }
          var index2 = length;
          if (fromIndex !== undefined$1) {
            index2 = toInteger(fromIndex);
            index2 = index2 < 0 ? nativeMax(length + index2, 0) : nativeMin(index2, length - 1);
          }
          return value === value ? strictLastIndexOf(array2, value, index2) : baseFindIndex(array2, baseIsNaN, index2, true);
        }
        function nth(array2, n) {
          return array2 && array2.length ? baseNth(array2, toInteger(n)) : undefined$1;
        }
        var pull = baseRest(pullAll);
        function pullAll(array2, values2) {
          return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2) : array2;
        }
        function pullAllBy(array2, values2, iteratee2) {
          return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2, getIteratee(iteratee2, 2)) : array2;
        }
        function pullAllWith(array2, values2, comparator) {
          return array2 && array2.length && values2 && values2.length ? basePullAll(array2, values2, undefined$1, comparator) : array2;
        }
        var pullAt = flatRest(function(array2, indexes) {
          var length = array2 == null ? 0 : array2.length, result2 = baseAt(array2, indexes);
          basePullAt(array2, arrayMap(indexes, function(index2) {
            return isIndex(index2, length) ? +index2 : index2;
          }).sort(compareAscending));
          return result2;
        });
        function remove(array2, predicate) {
          var result2 = [];
          if (!(array2 && array2.length)) {
            return result2;
          }
          var index2 = -1, indexes = [], length = array2.length;
          predicate = getIteratee(predicate, 3);
          while (++index2 < length) {
            var value = array2[index2];
            if (predicate(value, index2, array2)) {
              result2.push(value);
              indexes.push(index2);
            }
          }
          basePullAt(array2, indexes);
          return result2;
        }
        function reverse(array2) {
          return array2 == null ? array2 : nativeReverse.call(array2);
        }
        function slice(array2, start, end) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          if (end && typeof end != "number" && isIterateeCall(array2, start, end)) {
            start = 0;
            end = length;
          } else {
            start = start == null ? 0 : toInteger(start);
            end = end === undefined$1 ? length : toInteger(end);
          }
          return baseSlice(array2, start, end);
        }
        function sortedIndex(array2, value) {
          return baseSortedIndex(array2, value);
        }
        function sortedIndexBy(array2, value, iteratee2) {
          return baseSortedIndexBy(array2, value, getIteratee(iteratee2, 2));
        }
        function sortedIndexOf(array2, value) {
          var length = array2 == null ? 0 : array2.length;
          if (length) {
            var index2 = baseSortedIndex(array2, value);
            if (index2 < length && eq(array2[index2], value)) {
              return index2;
            }
          }
          return -1;
        }
        function sortedLastIndex(array2, value) {
          return baseSortedIndex(array2, value, true);
        }
        function sortedLastIndexBy(array2, value, iteratee2) {
          return baseSortedIndexBy(array2, value, getIteratee(iteratee2, 2), true);
        }
        function sortedLastIndexOf(array2, value) {
          var length = array2 == null ? 0 : array2.length;
          if (length) {
            var index2 = baseSortedIndex(array2, value, true) - 1;
            if (eq(array2[index2], value)) {
              return index2;
            }
          }
          return -1;
        }
        function sortedUniq(array2) {
          return array2 && array2.length ? baseSortedUniq(array2) : [];
        }
        function sortedUniqBy(array2, iteratee2) {
          return array2 && array2.length ? baseSortedUniq(array2, getIteratee(iteratee2, 2)) : [];
        }
        function tail(array2) {
          var length = array2 == null ? 0 : array2.length;
          return length ? baseSlice(array2, 1, length) : [];
        }
        function take(array2, n, guard) {
          if (!(array2 && array2.length)) {
            return [];
          }
          n = guard || n === undefined$1 ? 1 : toInteger(n);
          return baseSlice(array2, 0, n < 0 ? 0 : n);
        }
        function takeRight(array2, n, guard) {
          var length = array2 == null ? 0 : array2.length;
          if (!length) {
            return [];
          }
          n = guard || n === undefined$1 ? 1 : toInteger(n);
          n = length - n;
          return baseSlice(array2, n < 0 ? 0 : n, length);
        }
        function takeRightWhile(array2, predicate) {
          return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3), false, true) : [];
        }
        function takeWhile(array2, predicate) {
          return array2 && array2.length ? baseWhile(array2, getIteratee(predicate, 3)) : [];
        }
        var union2 = baseRest(function(arrays) {
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true));
        });
        var unionBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined$1;
          }
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), getIteratee(iteratee2, 2));
        });
        var unionWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined$1;
          return baseUniq(baseFlatten(arrays, 1, isArrayLikeObject, true), undefined$1, comparator);
        });
        function uniq(array2) {
          return array2 && array2.length ? baseUniq(array2) : [];
        }
        function uniqBy(array2, iteratee2) {
          return array2 && array2.length ? baseUniq(array2, getIteratee(iteratee2, 2)) : [];
        }
        function uniqWith(array2, comparator) {
          comparator = typeof comparator == "function" ? comparator : undefined$1;
          return array2 && array2.length ? baseUniq(array2, undefined$1, comparator) : [];
        }
        function unzip(array2) {
          if (!(array2 && array2.length)) {
            return [];
          }
          var length = 0;
          array2 = arrayFilter(array2, function(group) {
            if (isArrayLikeObject(group)) {
              length = nativeMax(group.length, length);
              return true;
            }
          });
          return baseTimes(length, function(index2) {
            return arrayMap(array2, baseProperty(index2));
          });
        }
        function unzipWith(array2, iteratee2) {
          if (!(array2 && array2.length)) {
            return [];
          }
          var result2 = unzip(array2);
          if (iteratee2 == null) {
            return result2;
          }
          return arrayMap(result2, function(group) {
            return apply(iteratee2, undefined$1, group);
          });
        }
        var without = baseRest(function(array2, values2) {
          return isArrayLikeObject(array2) ? baseDifference(array2, values2) : [];
        });
        var xor = baseRest(function(arrays) {
          return baseXor(arrayFilter(arrays, isArrayLikeObject));
        });
        var xorBy = baseRest(function(arrays) {
          var iteratee2 = last(arrays);
          if (isArrayLikeObject(iteratee2)) {
            iteratee2 = undefined$1;
          }
          return baseXor(arrayFilter(arrays, isArrayLikeObject), getIteratee(iteratee2, 2));
        });
        var xorWith = baseRest(function(arrays) {
          var comparator = last(arrays);
          comparator = typeof comparator == "function" ? comparator : undefined$1;
          return baseXor(arrayFilter(arrays, isArrayLikeObject), undefined$1, comparator);
        });
        var zip = baseRest(unzip);
        function zipObject(props, values2) {
          return baseZipObject(props || [], values2 || [], assignValue);
        }
        function zipObjectDeep(props, values2) {
          return baseZipObject(props || [], values2 || [], baseSet);
        }
        var zipWith = baseRest(function(arrays) {
          var length = arrays.length, iteratee2 = length > 1 ? arrays[length - 1] : undefined$1;
          iteratee2 = typeof iteratee2 == "function" ? (arrays.pop(), iteratee2) : undefined$1;
          return unzipWith(arrays, iteratee2);
        });
        function chain(value) {
          var result2 = lodash2(value);
          result2.__chain__ = true;
          return result2;
        }
        function tap(value, interceptor) {
          interceptor(value);
          return value;
        }
        function thru(value, interceptor) {
          return interceptor(value);
        }
        var wrapperAt = flatRest(function(paths) {
          var length = paths.length, start = length ? paths[0] : 0, value = this.__wrapped__, interceptor = function(object2) {
            return baseAt(object2, paths);
          };
          if (length > 1 || this.__actions__.length || !(value instanceof LazyWrapper) || !isIndex(start)) {
            return this.thru(interceptor);
          }
          value = value.slice(start, +start + (length ? 1 : 0));
          value.__actions__.push({
            "func": thru,
            "args": [interceptor],
            "thisArg": undefined$1
          });
          return new LodashWrapper(value, this.__chain__).thru(function(array2) {
            if (length && !array2.length) {
              array2.push(undefined$1);
            }
            return array2;
          });
        });
        function wrapperChain() {
          return chain(this);
        }
        function wrapperCommit() {
          return new LodashWrapper(this.value(), this.__chain__);
        }
        function wrapperNext() {
          if (this.__values__ === undefined$1) {
            this.__values__ = toArray2(this.value());
          }
          var done = this.__index__ >= this.__values__.length, value = done ? undefined$1 : this.__values__[this.__index__++];
          return { "done": done, "value": value };
        }
        function wrapperToIterator() {
          return this;
        }
        function wrapperPlant(value) {
          var result2, parent2 = this;
          while (parent2 instanceof baseLodash) {
            var clone3 = wrapperClone(parent2);
            clone3.__index__ = 0;
            clone3.__values__ = undefined$1;
            if (result2) {
              previous.__wrapped__ = clone3;
            } else {
              result2 = clone3;
            }
            var previous = clone3;
            parent2 = parent2.__wrapped__;
          }
          previous.__wrapped__ = value;
          return result2;
        }
        function wrapperReverse() {
          var value = this.__wrapped__;
          if (value instanceof LazyWrapper) {
            var wrapped = value;
            if (this.__actions__.length) {
              wrapped = new LazyWrapper(this);
            }
            wrapped = wrapped.reverse();
            wrapped.__actions__.push({
              "func": thru,
              "args": [reverse],
              "thisArg": undefined$1
            });
            return new LodashWrapper(wrapped, this.__chain__);
          }
          return this.thru(reverse);
        }
        function wrapperValue() {
          return baseWrapperValue(this.__wrapped__, this.__actions__);
        }
        var countBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            ++result2[key];
          } else {
            baseAssignValue(result2, key, 1);
          }
        });
        function every(collection, predicate, guard) {
          var func = isArray(collection) ? arrayEvery : baseEvery;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined$1;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        function filter(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, getIteratee(predicate, 3));
        }
        var find = createFind(findIndex2);
        var findLast = createFind(findLastIndex);
        function flatMap(collection, iteratee2) {
          return baseFlatten(map2(collection, iteratee2), 1);
        }
        function flatMapDeep(collection, iteratee2) {
          return baseFlatten(map2(collection, iteratee2), INFINITY);
        }
        function flatMapDepth(collection, iteratee2, depth) {
          depth = depth === undefined$1 ? 1 : toInteger(depth);
          return baseFlatten(map2(collection, iteratee2), depth);
        }
        function forEach(collection, iteratee2) {
          var func = isArray(collection) ? arrayEach : baseEach;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function forEachRight(collection, iteratee2) {
          var func = isArray(collection) ? arrayEachRight : baseEachRight;
          return func(collection, getIteratee(iteratee2, 3));
        }
        var groupBy = createAggregator(function(result2, value, key) {
          if (hasOwnProperty.call(result2, key)) {
            result2[key].push(value);
          } else {
            baseAssignValue(result2, key, [value]);
          }
        });
        function includes(collection, value, fromIndex, guard) {
          collection = isArrayLike(collection) ? collection : values(collection);
          fromIndex = fromIndex && !guard ? toInteger(fromIndex) : 0;
          var length = collection.length;
          if (fromIndex < 0) {
            fromIndex = nativeMax(length + fromIndex, 0);
          }
          return isString(collection) ? fromIndex <= length && collection.indexOf(value, fromIndex) > -1 : !!length && baseIndexOf(collection, value, fromIndex) > -1;
        }
        var invokeMap = baseRest(function(collection, path, args) {
          var index2 = -1, isFunc = typeof path == "function", result2 = isArrayLike(collection) ? Array2(collection.length) : [];
          baseEach(collection, function(value) {
            result2[++index2] = isFunc ? apply(path, value, args) : baseInvoke(value, path, args);
          });
          return result2;
        });
        var keyBy = createAggregator(function(result2, value, key) {
          baseAssignValue(result2, key, value);
        });
        function map2(collection, iteratee2) {
          var func = isArray(collection) ? arrayMap : baseMap;
          return func(collection, getIteratee(iteratee2, 3));
        }
        function orderBy(collection, iteratees, orders, guard) {
          if (collection == null) {
            return [];
          }
          if (!isArray(iteratees)) {
            iteratees = iteratees == null ? [] : [iteratees];
          }
          orders = guard ? undefined$1 : orders;
          if (!isArray(orders)) {
            orders = orders == null ? [] : [orders];
          }
          return baseOrderBy(collection, iteratees, orders);
        }
        var partition = createAggregator(function(result2, value, key) {
          result2[key ? 0 : 1].push(value);
        }, function() {
          return [[], []];
        });
        function reduce(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduce : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEach);
        }
        function reduceRight(collection, iteratee2, accumulator) {
          var func = isArray(collection) ? arrayReduceRight : baseReduce, initAccum = arguments.length < 3;
          return func(collection, getIteratee(iteratee2, 4), accumulator, initAccum, baseEachRight);
        }
        function reject(collection, predicate) {
          var func = isArray(collection) ? arrayFilter : baseFilter;
          return func(collection, negate(getIteratee(predicate, 3)));
        }
        function sample(collection) {
          var func = isArray(collection) ? arraySample : baseSample;
          return func(collection);
        }
        function sampleSize(collection, n, guard) {
          if (guard ? isIterateeCall(collection, n, guard) : n === undefined$1) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          var func = isArray(collection) ? arraySampleSize : baseSampleSize;
          return func(collection, n);
        }
        function shuffle(collection) {
          var func = isArray(collection) ? arrayShuffle : baseShuffle;
          return func(collection);
        }
        function size(collection) {
          if (collection == null) {
            return 0;
          }
          if (isArrayLike(collection)) {
            return isString(collection) ? stringSize(collection) : collection.length;
          }
          var tag = getTag(collection);
          if (tag == mapTag || tag == setTag) {
            return collection.size;
          }
          return baseKeys(collection).length;
        }
        function some(collection, predicate, guard) {
          var func = isArray(collection) ? arraySome : baseSome;
          if (guard && isIterateeCall(collection, predicate, guard)) {
            predicate = undefined$1;
          }
          return func(collection, getIteratee(predicate, 3));
        }
        var sortBy = baseRest(function(collection, iteratees) {
          if (collection == null) {
            return [];
          }
          var length = iteratees.length;
          if (length > 1 && isIterateeCall(collection, iteratees[0], iteratees[1])) {
            iteratees = [];
          } else if (length > 2 && isIterateeCall(iteratees[0], iteratees[1], iteratees[2])) {
            iteratees = [iteratees[0]];
          }
          return baseOrderBy(collection, baseFlatten(iteratees, 1), []);
        });
        var now = ctxNow || function() {
          return root.Date.now();
        };
        function after(n, func) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n < 1) {
              return func.apply(this, arguments);
            }
          };
        }
        function ary(func, n, guard) {
          n = guard ? undefined$1 : n;
          n = func && n == null ? func.length : n;
          return createWrap(func, WRAP_ARY_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, n);
        }
        function before(n, func) {
          var result2;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          n = toInteger(n);
          return function() {
            if (--n > 0) {
              result2 = func.apply(this, arguments);
            }
            if (n <= 1) {
              func = undefined$1;
            }
            return result2;
          };
        }
        var bind = baseRest(function(func, thisArg, partials) {
          var bitmask = WRAP_BIND_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bind));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(func, bitmask, thisArg, partials, holders);
        });
        var bindKey = baseRest(function(object2, key, partials) {
          var bitmask = WRAP_BIND_FLAG | WRAP_BIND_KEY_FLAG;
          if (partials.length) {
            var holders = replaceHolders(partials, getHolder(bindKey));
            bitmask |= WRAP_PARTIAL_FLAG;
          }
          return createWrap(key, bitmask, object2, partials, holders);
        });
        function curry2(func, arity, guard) {
          arity = guard ? undefined$1 : arity;
          var result2 = createWrap(func, WRAP_CURRY_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, undefined$1, arity);
          result2.placeholder = curry2.placeholder;
          return result2;
        }
        function curryRight(func, arity, guard) {
          arity = guard ? undefined$1 : arity;
          var result2 = createWrap(func, WRAP_CURRY_RIGHT_FLAG, undefined$1, undefined$1, undefined$1, undefined$1, undefined$1, arity);
          result2.placeholder = curryRight.placeholder;
          return result2;
        }
        function debounce(func, wait, options2) {
          var lastArgs, lastThis, maxWait, result2, timerId, lastCallTime, lastInvokeTime = 0, leading = false, maxing = false, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          wait = toNumber2(wait) || 0;
          if (isObject2(options2)) {
            leading = !!options2.leading;
            maxing = "maxWait" in options2;
            maxWait = maxing ? nativeMax(toNumber2(options2.maxWait) || 0, wait) : maxWait;
            trailing = "trailing" in options2 ? !!options2.trailing : trailing;
          }
          function invokeFunc(time2) {
            var args = lastArgs, thisArg = lastThis;
            lastArgs = lastThis = undefined$1;
            lastInvokeTime = time2;
            result2 = func.apply(thisArg, args);
            return result2;
          }
          function leadingEdge(time2) {
            lastInvokeTime = time2;
            timerId = setTimeout2(timerExpired, wait);
            return leading ? invokeFunc(time2) : result2;
          }
          function remainingWait(time2) {
            var timeSinceLastCall = time2 - lastCallTime, timeSinceLastInvoke = time2 - lastInvokeTime, timeWaiting = wait - timeSinceLastCall;
            return maxing ? nativeMin(timeWaiting, maxWait - timeSinceLastInvoke) : timeWaiting;
          }
          function shouldInvoke(time2) {
            var timeSinceLastCall = time2 - lastCallTime, timeSinceLastInvoke = time2 - lastInvokeTime;
            return lastCallTime === undefined$1 || timeSinceLastCall >= wait || timeSinceLastCall < 0 || maxing && timeSinceLastInvoke >= maxWait;
          }
          function timerExpired() {
            var time2 = now();
            if (shouldInvoke(time2)) {
              return trailingEdge(time2);
            }
            timerId = setTimeout2(timerExpired, remainingWait(time2));
          }
          function trailingEdge(time2) {
            timerId = undefined$1;
            if (trailing && lastArgs) {
              return invokeFunc(time2);
            }
            lastArgs = lastThis = undefined$1;
            return result2;
          }
          function cancel() {
            if (timerId !== undefined$1) {
              clearTimeout2(timerId);
            }
            lastInvokeTime = 0;
            lastArgs = lastCallTime = lastThis = timerId = undefined$1;
          }
          function flush() {
            return timerId === undefined$1 ? result2 : trailingEdge(now());
          }
          function debounced() {
            var time2 = now(), isInvoking = shouldInvoke(time2);
            lastArgs = arguments;
            lastThis = this;
            lastCallTime = time2;
            if (isInvoking) {
              if (timerId === undefined$1) {
                return leadingEdge(lastCallTime);
              }
              if (maxing) {
                clearTimeout2(timerId);
                timerId = setTimeout2(timerExpired, wait);
                return invokeFunc(lastCallTime);
              }
            }
            if (timerId === undefined$1) {
              timerId = setTimeout2(timerExpired, wait);
            }
            return result2;
          }
          debounced.cancel = cancel;
          debounced.flush = flush;
          return debounced;
        }
        var defer = baseRest(function(func, args) {
          return baseDelay(func, 1, args);
        });
        var delay = baseRest(function(func, wait, args) {
          return baseDelay(func, toNumber2(wait) || 0, args);
        });
        function flip(func) {
          return createWrap(func, WRAP_FLIP_FLAG);
        }
        function memoize(func, resolver) {
          if (typeof func != "function" || resolver != null && typeof resolver != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          var memoized = function() {
            var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
            if (cache.has(key)) {
              return cache.get(key);
            }
            var result2 = func.apply(this, args);
            memoized.cache = cache.set(key, result2) || cache;
            return result2;
          };
          memoized.cache = new (memoize.Cache || MapCache)();
          return memoized;
        }
        memoize.Cache = MapCache;
        function negate(predicate) {
          if (typeof predicate != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          return function() {
            var args = arguments;
            switch (args.length) {
              case 0:
                return !predicate.call(this);
              case 1:
                return !predicate.call(this, args[0]);
              case 2:
                return !predicate.call(this, args[0], args[1]);
              case 3:
                return !predicate.call(this, args[0], args[1], args[2]);
            }
            return !predicate.apply(this, args);
          };
        }
        function once2(func) {
          return before(2, func);
        }
        var overArgs = castRest(function(func, transforms) {
          transforms = transforms.length == 1 && isArray(transforms[0]) ? arrayMap(transforms[0], baseUnary(getIteratee())) : arrayMap(baseFlatten(transforms, 1), baseUnary(getIteratee()));
          var funcsLength = transforms.length;
          return baseRest(function(args) {
            var index2 = -1, length = nativeMin(args.length, funcsLength);
            while (++index2 < length) {
              args[index2] = transforms[index2].call(this, args[index2]);
            }
            return apply(func, this, args);
          });
        });
        var partial2 = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partial2));
          return createWrap(func, WRAP_PARTIAL_FLAG, undefined$1, partials, holders);
        });
        var partialRight = baseRest(function(func, partials) {
          var holders = replaceHolders(partials, getHolder(partialRight));
          return createWrap(func, WRAP_PARTIAL_RIGHT_FLAG, undefined$1, partials, holders);
        });
        var rearg = flatRest(function(func, indexes) {
          return createWrap(func, WRAP_REARG_FLAG, undefined$1, undefined$1, undefined$1, indexes);
        });
        function rest(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start === undefined$1 ? start : toInteger(start);
          return baseRest(func, start);
        }
        function spread(func, start) {
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          start = start == null ? 0 : nativeMax(toInteger(start), 0);
          return baseRest(function(args) {
            var array2 = args[start], otherArgs = castSlice(args, 0, start);
            if (array2) {
              arrayPush(otherArgs, array2);
            }
            return apply(func, this, otherArgs);
          });
        }
        function throttle(func, wait, options2) {
          var leading = true, trailing = true;
          if (typeof func != "function") {
            throw new TypeError2(FUNC_ERROR_TEXT);
          }
          if (isObject2(options2)) {
            leading = "leading" in options2 ? !!options2.leading : leading;
            trailing = "trailing" in options2 ? !!options2.trailing : trailing;
          }
          return debounce(func, wait, {
            "leading": leading,
            "maxWait": wait,
            "trailing": trailing
          });
        }
        function unary(func) {
          return ary(func, 1);
        }
        function wrap(value, wrapper) {
          return partial2(castFunction(wrapper), value);
        }
        function castArray() {
          if (!arguments.length) {
            return [];
          }
          var value = arguments[0];
          return isArray(value) ? value : [value];
        }
        function clone2(value) {
          return baseClone2(value, CLONE_SYMBOLS_FLAG);
        }
        function cloneWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          return baseClone2(value, CLONE_SYMBOLS_FLAG, customizer);
        }
        function cloneDeep(value) {
          return baseClone2(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG);
        }
        function cloneDeepWith(value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          return baseClone2(value, CLONE_DEEP_FLAG | CLONE_SYMBOLS_FLAG, customizer);
        }
        function conformsTo(object2, source) {
          return source == null || baseConformsTo(object2, source, keys(source));
        }
        function eq(value, other) {
          return value === other || value !== value && other !== other;
        }
        var gt = createRelationalOperation(baseGt);
        var gte = createRelationalOperation(function(value, other) {
          return value >= other;
        });
        var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
          return arguments;
        })()) ? baseIsArguments : function(value) {
          return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
        };
        var isArray = Array2.isArray;
        var isArrayBuffer = nodeIsArrayBuffer ? baseUnary(nodeIsArrayBuffer) : baseIsArrayBuffer;
        function isArrayLike(value) {
          return value != null && isLength(value.length) && !isFunction2(value);
        }
        function isArrayLikeObject(value) {
          return isObjectLike(value) && isArrayLike(value);
        }
        function isBoolean(value) {
          return value === true || value === false || isObjectLike(value) && baseGetTag(value) == boolTag;
        }
        var isBuffer2 = nativeIsBuffer || stubFalse;
        var isDate2 = nodeIsDate ? baseUnary(nodeIsDate) : baseIsDate;
        function isElement(value) {
          return isObjectLike(value) && value.nodeType === 1 && !isPlainObject2(value);
        }
        function isEmpty(value) {
          if (value == null) {
            return true;
          }
          if (isArrayLike(value) && (isArray(value) || typeof value == "string" || typeof value.splice == "function" || isBuffer2(value) || isTypedArray(value) || isArguments(value))) {
            return !value.length;
          }
          var tag = getTag(value);
          if (tag == mapTag || tag == setTag) {
            return !value.size;
          }
          if (isPrototype(value)) {
            return !baseKeys(value).length;
          }
          for (var key in value) {
            if (hasOwnProperty.call(value, key)) {
              return false;
            }
          }
          return true;
        }
        function isEqual(value, other) {
          return baseIsEqual(value, other);
        }
        function isEqualWith(value, other, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          var result2 = customizer ? customizer(value, other) : undefined$1;
          return result2 === undefined$1 ? baseIsEqual(value, other, undefined$1, customizer) : !!result2;
        }
        function isError(value) {
          if (!isObjectLike(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == errorTag || tag == domExcTag || typeof value.message == "string" && typeof value.name == "string" && !isPlainObject2(value);
        }
        function isFinite(value) {
          return typeof value == "number" && nativeIsFinite(value);
        }
        function isFunction2(value) {
          if (!isObject2(value)) {
            return false;
          }
          var tag = baseGetTag(value);
          return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
        }
        function isInteger(value) {
          return typeof value == "number" && value == toInteger(value);
        }
        function isLength(value) {
          return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
        }
        function isObject2(value) {
          var type = typeof value;
          return value != null && (type == "object" || type == "function");
        }
        function isObjectLike(value) {
          return value != null && typeof value == "object";
        }
        var isMap = nodeIsMap ? baseUnary(nodeIsMap) : baseIsMap;
        function isMatch(object2, source) {
          return object2 === source || baseIsMatch(object2, source, getMatchData(source));
        }
        function isMatchWith(object2, source, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          return baseIsMatch(object2, source, getMatchData(source), customizer);
        }
        function isNaN2(value) {
          return isNumber(value) && value != +value;
        }
        function isNative(value) {
          if (isMaskable(value)) {
            throw new Error2(CORE_ERROR_TEXT);
          }
          return baseIsNative(value);
        }
        function isNull(value) {
          return value === null;
        }
        function isNil(value) {
          return value == null;
        }
        function isNumber(value) {
          return typeof value == "number" || isObjectLike(value) && baseGetTag(value) == numberTag;
        }
        function isPlainObject2(value) {
          if (!isObjectLike(value) || baseGetTag(value) != objectTag) {
            return false;
          }
          var proto = getPrototype(value);
          if (proto === null) {
            return true;
          }
          var Ctor = hasOwnProperty.call(proto, "constructor") && proto.constructor;
          return typeof Ctor == "function" && Ctor instanceof Ctor && funcToString.call(Ctor) == objectCtorString;
        }
        var isRegExp = nodeIsRegExp ? baseUnary(nodeIsRegExp) : baseIsRegExp;
        function isSafeInteger(value) {
          return isInteger(value) && value >= -MAX_SAFE_INTEGER && value <= MAX_SAFE_INTEGER;
        }
        var isSet = nodeIsSet ? baseUnary(nodeIsSet) : baseIsSet;
        function isString(value) {
          return typeof value == "string" || !isArray(value) && isObjectLike(value) && baseGetTag(value) == stringTag;
        }
        function isSymbol(value) {
          return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
        }
        var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
        function isUndefined(value) {
          return value === undefined$1;
        }
        function isWeakMap(value) {
          return isObjectLike(value) && getTag(value) == weakMapTag;
        }
        function isWeakSet(value) {
          return isObjectLike(value) && baseGetTag(value) == weakSetTag;
        }
        var lt = createRelationalOperation(baseLt);
        var lte = createRelationalOperation(function(value, other) {
          return value <= other;
        });
        function toArray2(value) {
          if (!value) {
            return [];
          }
          if (isArrayLike(value)) {
            return isString(value) ? stringToArray(value) : copyArray(value);
          }
          if (symIterator && value[symIterator]) {
            return iteratorToArray(value[symIterator]());
          }
          var tag = getTag(value), func = tag == mapTag ? mapToArray : tag == setTag ? setToArray : values;
          return func(value);
        }
        function toFinite(value) {
          if (!value) {
            return value === 0 ? value : 0;
          }
          value = toNumber2(value);
          if (value === INFINITY || value === -INFINITY) {
            var sign = value < 0 ? -1 : 1;
            return sign * MAX_INTEGER;
          }
          return value === value ? value : 0;
        }
        function toInteger(value) {
          var result2 = toFinite(value), remainder = result2 % 1;
          return result2 === result2 ? remainder ? result2 - remainder : result2 : 0;
        }
        function toLength(value) {
          return value ? baseClamp(toInteger(value), 0, MAX_ARRAY_LENGTH) : 0;
        }
        function toNumber2(value) {
          if (typeof value == "number") {
            return value;
          }
          if (isSymbol(value)) {
            return NAN;
          }
          if (isObject2(value)) {
            var other = typeof value.valueOf == "function" ? value.valueOf() : value;
            value = isObject2(other) ? other + "" : other;
          }
          if (typeof value != "string") {
            return value === 0 ? value : +value;
          }
          value = baseTrim(value);
          var isBinary = reIsBinary.test(value);
          return isBinary || reIsOctal.test(value) ? freeParseInt(value.slice(2), isBinary ? 2 : 8) : reIsBadHex.test(value) ? NAN : +value;
        }
        function toPlainObject(value) {
          return copyObject(value, keysIn(value));
        }
        function toSafeInteger(value) {
          return value ? baseClamp(toInteger(value), -MAX_SAFE_INTEGER, MAX_SAFE_INTEGER) : value === 0 ? value : 0;
        }
        function toString2(value) {
          return value == null ? "" : baseToString(value);
        }
        var assign = createAssigner(function(object2, source) {
          if (isPrototype(source) || isArrayLike(source)) {
            copyObject(source, keys(source), object2);
            return;
          }
          for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
              assignValue(object2, key, source[key]);
            }
          }
        });
        var assignIn = createAssigner(function(object2, source) {
          copyObject(source, keysIn(source), object2);
        });
        var assignInWith = createAssigner(function(object2, source, srcIndex, customizer) {
          copyObject(source, keysIn(source), object2, customizer);
        });
        var assignWith = createAssigner(function(object2, source, srcIndex, customizer) {
          copyObject(source, keys(source), object2, customizer);
        });
        var at = flatRest(baseAt);
        function create2(prototype, properties) {
          var result2 = baseCreate(prototype);
          return properties == null ? result2 : baseAssign(result2, properties);
        }
        var defaults = baseRest(function(object2, sources) {
          object2 = Object2(object2);
          var index2 = -1;
          var length = sources.length;
          var guard = length > 2 ? sources[2] : undefined$1;
          if (guard && isIterateeCall(sources[0], sources[1], guard)) {
            length = 1;
          }
          while (++index2 < length) {
            var source = sources[index2];
            var props = keysIn(source);
            var propsIndex = -1;
            var propsLength = props.length;
            while (++propsIndex < propsLength) {
              var key = props[propsIndex];
              var value = object2[key];
              if (value === undefined$1 || eq(value, objectProto[key]) && !hasOwnProperty.call(object2, key)) {
                object2[key] = source[key];
              }
            }
          }
          return object2;
        });
        var defaultsDeep = baseRest(function(args) {
          args.push(undefined$1, customDefaultsMerge);
          return apply(mergeWith, undefined$1, args);
        });
        function findKey(object2, predicate) {
          return baseFindKey(object2, getIteratee(predicate, 3), baseForOwn);
        }
        function findLastKey(object2, predicate) {
          return baseFindKey(object2, getIteratee(predicate, 3), baseForOwnRight);
        }
        function forIn(object2, iteratee2) {
          return object2 == null ? object2 : baseFor(object2, getIteratee(iteratee2, 3), keysIn);
        }
        function forInRight(object2, iteratee2) {
          return object2 == null ? object2 : baseForRight(object2, getIteratee(iteratee2, 3), keysIn);
        }
        function forOwn(object2, iteratee2) {
          return object2 && baseForOwn(object2, getIteratee(iteratee2, 3));
        }
        function forOwnRight(object2, iteratee2) {
          return object2 && baseForOwnRight(object2, getIteratee(iteratee2, 3));
        }
        function functions(object2) {
          return object2 == null ? [] : baseFunctions(object2, keys(object2));
        }
        function functionsIn(object2) {
          return object2 == null ? [] : baseFunctions(object2, keysIn(object2));
        }
        function get(object2, path, defaultValue) {
          var result2 = object2 == null ? undefined$1 : baseGet(object2, path);
          return result2 === undefined$1 ? defaultValue : result2;
        }
        function has2(object2, path) {
          return object2 != null && hasPath(object2, path, baseHas);
        }
        function hasIn(object2, path) {
          return object2 != null && hasPath(object2, path, baseHasIn);
        }
        var invert = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          result2[value] = key;
        }, constant(identity));
        var invertBy = createInverter(function(result2, value, key) {
          if (value != null && typeof value.toString != "function") {
            value = nativeObjectToString.call(value);
          }
          if (hasOwnProperty.call(result2, value)) {
            result2[value].push(key);
          } else {
            result2[value] = [key];
          }
        }, getIteratee);
        var invoke = baseRest(baseInvoke);
        function keys(object2) {
          return isArrayLike(object2) ? arrayLikeKeys(object2) : baseKeys(object2);
        }
        function keysIn(object2) {
          return isArrayLike(object2) ? arrayLikeKeys(object2, true) : baseKeysIn(object2);
        }
        function mapKeys2(object2, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object2, function(value, key, object3) {
            baseAssignValue(result2, iteratee2(value, key, object3), value);
          });
          return result2;
        }
        function mapValues2(object2, iteratee2) {
          var result2 = {};
          iteratee2 = getIteratee(iteratee2, 3);
          baseForOwn(object2, function(value, key, object3) {
            baseAssignValue(result2, key, iteratee2(value, key, object3));
          });
          return result2;
        }
        var merge2 = createAssigner(function(object2, source, srcIndex) {
          baseMerge(object2, source, srcIndex);
        });
        var mergeWith = createAssigner(function(object2, source, srcIndex, customizer) {
          baseMerge(object2, source, srcIndex, customizer);
        });
        var omit2 = flatRest(function(object2, paths) {
          var result2 = {};
          if (object2 == null) {
            return result2;
          }
          var isDeep = false;
          paths = arrayMap(paths, function(path) {
            path = castPath(path, object2);
            isDeep || (isDeep = path.length > 1);
            return path;
          });
          copyObject(object2, getAllKeysIn(object2), result2);
          if (isDeep) {
            result2 = baseClone2(result2, CLONE_DEEP_FLAG | CLONE_FLAT_FLAG | CLONE_SYMBOLS_FLAG, customOmitClone);
          }
          var length = paths.length;
          while (length--) {
            baseUnset(result2, paths[length]);
          }
          return result2;
        });
        function omitBy(object2, predicate) {
          return pickBy(object2, negate(getIteratee(predicate)));
        }
        var pick2 = flatRest(function(object2, paths) {
          return object2 == null ? {} : basePick(object2, paths);
        });
        function pickBy(object2, predicate) {
          if (object2 == null) {
            return {};
          }
          var props = arrayMap(getAllKeysIn(object2), function(prop) {
            return [prop];
          });
          predicate = getIteratee(predicate);
          return basePickBy(object2, props, function(value, path) {
            return predicate(value, path[0]);
          });
        }
        function result(object2, path, defaultValue) {
          path = castPath(path, object2);
          var index2 = -1, length = path.length;
          if (!length) {
            length = 1;
            object2 = undefined$1;
          }
          while (++index2 < length) {
            var value = object2 == null ? undefined$1 : object2[toKey(path[index2])];
            if (value === undefined$1) {
              index2 = length;
              value = defaultValue;
            }
            object2 = isFunction2(value) ? value.call(object2) : value;
          }
          return object2;
        }
        function set2(object2, path, value) {
          return object2 == null ? object2 : baseSet(object2, path, value);
        }
        function setWith(object2, path, value, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          return object2 == null ? object2 : baseSet(object2, path, value, customizer);
        }
        var toPairs = createToPairs(keys);
        var toPairsIn = createToPairs(keysIn);
        function transform2(object2, iteratee2, accumulator) {
          var isArr = isArray(object2), isArrLike = isArr || isBuffer2(object2) || isTypedArray(object2);
          iteratee2 = getIteratee(iteratee2, 4);
          if (accumulator == null) {
            var Ctor = object2 && object2.constructor;
            if (isArrLike) {
              accumulator = isArr ? new Ctor() : [];
            } else if (isObject2(object2)) {
              accumulator = isFunction2(Ctor) ? baseCreate(getPrototype(object2)) : {};
            } else {
              accumulator = {};
            }
          }
          (isArrLike ? arrayEach : baseForOwn)(object2, function(value, index2, object3) {
            return iteratee2(accumulator, value, index2, object3);
          });
          return accumulator;
        }
        function unset(object2, path) {
          return object2 == null ? true : baseUnset(object2, path);
        }
        function update(object2, path, updater) {
          return object2 == null ? object2 : baseUpdate(object2, path, castFunction(updater));
        }
        function updateWith(object2, path, updater, customizer) {
          customizer = typeof customizer == "function" ? customizer : undefined$1;
          return object2 == null ? object2 : baseUpdate(object2, path, castFunction(updater), customizer);
        }
        function values(object2) {
          return object2 == null ? [] : baseValues(object2, keys(object2));
        }
        function valuesIn(object2) {
          return object2 == null ? [] : baseValues(object2, keysIn(object2));
        }
        function clamp(number2, lower, upper) {
          if (upper === undefined$1) {
            upper = lower;
            lower = undefined$1;
          }
          if (upper !== undefined$1) {
            upper = toNumber2(upper);
            upper = upper === upper ? upper : 0;
          }
          if (lower !== undefined$1) {
            lower = toNumber2(lower);
            lower = lower === lower ? lower : 0;
          }
          return baseClamp(toNumber2(number2), lower, upper);
        }
        function inRange(number2, start, end) {
          start = toFinite(start);
          if (end === undefined$1) {
            end = start;
            start = 0;
          } else {
            end = toFinite(end);
          }
          number2 = toNumber2(number2);
          return baseInRange(number2, start, end);
        }
        function random(lower, upper, floating) {
          if (floating && typeof floating != "boolean" && isIterateeCall(lower, upper, floating)) {
            upper = floating = undefined$1;
          }
          if (floating === undefined$1) {
            if (typeof upper == "boolean") {
              floating = upper;
              upper = undefined$1;
            } else if (typeof lower == "boolean") {
              floating = lower;
              lower = undefined$1;
            }
          }
          if (lower === undefined$1 && upper === undefined$1) {
            lower = 0;
            upper = 1;
          } else {
            lower = toFinite(lower);
            if (upper === undefined$1) {
              upper = lower;
              lower = 0;
            } else {
              upper = toFinite(upper);
            }
          }
          if (lower > upper) {
            var temp = lower;
            lower = upper;
            upper = temp;
          }
          if (floating || lower % 1 || upper % 1) {
            var rand = nativeRandom();
            return nativeMin(lower + rand * (upper - lower + freeParseFloat("1e-" + ((rand + "").length - 1))), upper);
          }
          return baseRandom(lower, upper);
        }
        var camelCase2 = createCompounder(function(result2, word, index2) {
          word = word.toLowerCase();
          return result2 + (index2 ? capitalize(word) : word);
        });
        function capitalize(string2) {
          return upperFirst(toString2(string2).toLowerCase());
        }
        function deburr(string2) {
          string2 = toString2(string2);
          return string2 && string2.replace(reLatin, deburrLetter).replace(reComboMark, "");
        }
        function endsWith(string2, target, position) {
          string2 = toString2(string2);
          target = baseToString(target);
          var length = string2.length;
          position = position === undefined$1 ? length : baseClamp(toInteger(position), 0, length);
          var end = position;
          position -= target.length;
          return position >= 0 && string2.slice(position, end) == target;
        }
        function escape(string2) {
          string2 = toString2(string2);
          return string2 && reHasUnescapedHtml.test(string2) ? string2.replace(reUnescapedHtml, escapeHtmlChar) : string2;
        }
        function escapeRegExp(string2) {
          string2 = toString2(string2);
          return string2 && reHasRegExpChar.test(string2) ? string2.replace(reRegExpChar, "\\$&") : string2;
        }
        var kebabCase = createCompounder(function(result2, word, index2) {
          return result2 + (index2 ? "-" : "") + word.toLowerCase();
        });
        var lowerCase = createCompounder(function(result2, word, index2) {
          return result2 + (index2 ? " " : "") + word.toLowerCase();
        });
        var lowerFirst = createCaseFirst("toLowerCase");
        function pad(string2, length, chars) {
          string2 = toString2(string2);
          length = toInteger(length);
          var strLength = length ? stringSize(string2) : 0;
          if (!length || strLength >= length) {
            return string2;
          }
          var mid = (length - strLength) / 2;
          return createPadding(nativeFloor(mid), chars) + string2 + createPadding(nativeCeil(mid), chars);
        }
        function padEnd(string2, length, chars) {
          string2 = toString2(string2);
          length = toInteger(length);
          var strLength = length ? stringSize(string2) : 0;
          return length && strLength < length ? string2 + createPadding(length - strLength, chars) : string2;
        }
        function padStart(string2, length, chars) {
          string2 = toString2(string2);
          length = toInteger(length);
          var strLength = length ? stringSize(string2) : 0;
          return length && strLength < length ? createPadding(length - strLength, chars) + string2 : string2;
        }
        function parseInt2(string2, radix, guard) {
          if (guard || radix == null) {
            radix = 0;
          } else if (radix) {
            radix = +radix;
          }
          return nativeParseInt(toString2(string2).replace(reTrimStart, ""), radix || 0);
        }
        function repeat(string2, n, guard) {
          if (guard ? isIterateeCall(string2, n, guard) : n === undefined$1) {
            n = 1;
          } else {
            n = toInteger(n);
          }
          return baseRepeat(toString2(string2), n);
        }
        function replace() {
          var args = arguments, string2 = toString2(args[0]);
          return args.length < 3 ? string2 : string2.replace(args[1], args[2]);
        }
        var snakeCase2 = createCompounder(function(result2, word, index2) {
          return result2 + (index2 ? "_" : "") + word.toLowerCase();
        });
        function split(string2, separator, limit) {
          if (limit && typeof limit != "number" && isIterateeCall(string2, separator, limit)) {
            separator = limit = undefined$1;
          }
          limit = limit === undefined$1 ? MAX_ARRAY_LENGTH : limit >>> 0;
          if (!limit) {
            return [];
          }
          string2 = toString2(string2);
          if (string2 && (typeof separator == "string" || separator != null && !isRegExp(separator))) {
            separator = baseToString(separator);
            if (!separator && hasUnicode(string2)) {
              return castSlice(stringToArray(string2), 0, limit);
            }
          }
          return string2.split(separator, limit);
        }
        var startCase = createCompounder(function(result2, word, index2) {
          return result2 + (index2 ? " " : "") + upperFirst(word);
        });
        function startsWith(string2, target, position) {
          string2 = toString2(string2);
          position = position == null ? 0 : baseClamp(toInteger(position), 0, string2.length);
          target = baseToString(target);
          return string2.slice(position, position + target.length) == target;
        }
        function template(string2, options2, guard) {
          var settings = lodash2.templateSettings;
          if (guard && isIterateeCall(string2, options2, guard)) {
            options2 = undefined$1;
          }
          string2 = toString2(string2);
          options2 = assignWith({}, options2, settings, customDefaultsAssignIn);
          var imports = assignWith({}, options2.imports, settings.imports, customDefaultsAssignIn), importsKeys = keys(imports), importsValues = baseValues(imports, importsKeys);
          arrayEach(importsKeys, function(key) {
            if (reForbiddenIdentifierChars.test(key)) {
              throw new Error2(INVALID_TEMPL_IMPORTS_ERROR_TEXT);
            }
          });
          var isEscaping, isEvaluating, index2 = 0, interpolate = options2.interpolate || reNoMatch, source = "__p += '";
          var reDelimiters = RegExp2(
            (options2.escape || reNoMatch).source + "|" + interpolate.source + "|" + (interpolate === reInterpolate ? reEsTemplate : reNoMatch).source + "|" + (options2.evaluate || reNoMatch).source + "|$",
            "g"
          );
          var sourceURL = "//# sourceURL=" + (hasOwnProperty.call(options2, "sourceURL") ? (options2.sourceURL + "").replace(/\s/g, " ") : "lodash.templateSources[" + ++templateCounter + "]") + "\n";
          string2.replace(reDelimiters, function(match, escapeValue, interpolateValue, esTemplateValue, evaluateValue, offset) {
            interpolateValue || (interpolateValue = esTemplateValue);
            source += string2.slice(index2, offset).replace(reUnescapedString, escapeStringChar);
            if (escapeValue) {
              isEscaping = true;
              source += "' +\n__e(" + escapeValue + ") +\n'";
            }
            if (evaluateValue) {
              isEvaluating = true;
              source += "';\n" + evaluateValue + ";\n__p += '";
            }
            if (interpolateValue) {
              source += "' +\n((__t = (" + interpolateValue + ")) == null ? '' : __t) +\n'";
            }
            index2 = offset + match.length;
            return match;
          });
          source += "';\n";
          var variable = hasOwnProperty.call(options2, "variable") && options2.variable;
          if (!variable) {
            source = "with (obj) {\n" + source + "\n}\n";
          } else if (reForbiddenIdentifierChars.test(variable)) {
            throw new Error2(INVALID_TEMPL_VAR_ERROR_TEXT);
          }
          source = (isEvaluating ? source.replace(reEmptyStringLeading, "") : source).replace(reEmptyStringMiddle, "$1").replace(reEmptyStringTrailing, "$1;");
          source = "function(" + (variable || "obj") + ") {\n" + (variable ? "" : "obj || (obj = {});\n") + "var __t, __p = ''" + (isEscaping ? ", __e = _.escape" : "") + (isEvaluating ? ", __j = Array.prototype.join;\nfunction print() { __p += __j.call(arguments, '') }\n" : ";\n") + source + "return __p\n}";
          var result2 = attempt(function() {
            return Function2(importsKeys, sourceURL + "return " + source).apply(undefined$1, importsValues);
          });
          result2.source = source;
          if (isError(result2)) {
            throw result2;
          }
          return result2;
        }
        function toLower(value) {
          return toString2(value).toLowerCase();
        }
        function toUpper(value) {
          return toString2(value).toUpperCase();
        }
        function trim2(string2, chars, guard) {
          string2 = toString2(string2);
          if (string2 && (guard || chars === undefined$1)) {
            return baseTrim(string2);
          }
          if (!string2 || !(chars = baseToString(chars))) {
            return string2;
          }
          var strSymbols = stringToArray(string2), chrSymbols = stringToArray(chars), start = charsStartIndex(strSymbols, chrSymbols), end = charsEndIndex(strSymbols, chrSymbols) + 1;
          return castSlice(strSymbols, start, end).join("");
        }
        function trimEnd(string2, chars, guard) {
          string2 = toString2(string2);
          if (string2 && (guard || chars === undefined$1)) {
            return string2.slice(0, trimmedEndIndex(string2) + 1);
          }
          if (!string2 || !(chars = baseToString(chars))) {
            return string2;
          }
          var strSymbols = stringToArray(string2), end = charsEndIndex(strSymbols, stringToArray(chars)) + 1;
          return castSlice(strSymbols, 0, end).join("");
        }
        function trimStart(string2, chars, guard) {
          string2 = toString2(string2);
          if (string2 && (guard || chars === undefined$1)) {
            return string2.replace(reTrimStart, "");
          }
          if (!string2 || !(chars = baseToString(chars))) {
            return string2;
          }
          var strSymbols = stringToArray(string2), start = charsStartIndex(strSymbols, stringToArray(chars));
          return castSlice(strSymbols, start).join("");
        }
        function truncate(string2, options2) {
          var length = DEFAULT_TRUNC_LENGTH, omission = DEFAULT_TRUNC_OMISSION;
          if (isObject2(options2)) {
            var separator = "separator" in options2 ? options2.separator : separator;
            length = "length" in options2 ? toInteger(options2.length) : length;
            omission = "omission" in options2 ? baseToString(options2.omission) : omission;
          }
          string2 = toString2(string2);
          var strLength = string2.length;
          if (hasUnicode(string2)) {
            var strSymbols = stringToArray(string2);
            strLength = strSymbols.length;
          }
          if (length >= strLength) {
            return string2;
          }
          var end = length - stringSize(omission);
          if (end < 1) {
            return omission;
          }
          var result2 = strSymbols ? castSlice(strSymbols, 0, end).join("") : string2.slice(0, end);
          if (separator === undefined$1) {
            return result2 + omission;
          }
          if (strSymbols) {
            end += result2.length - end;
          }
          if (isRegExp(separator)) {
            if (string2.slice(end).search(separator)) {
              var match, substring = result2;
              if (!separator.global) {
                separator = RegExp2(separator.source, toString2(reFlags.exec(separator)) + "g");
              }
              separator.lastIndex = 0;
              while (match = separator.exec(substring)) {
                var newEnd = match.index;
              }
              result2 = result2.slice(0, newEnd === undefined$1 ? end : newEnd);
            }
          } else if (string2.indexOf(baseToString(separator), end) != end) {
            var index2 = result2.lastIndexOf(separator);
            if (index2 > -1) {
              result2 = result2.slice(0, index2);
            }
          }
          return result2 + omission;
        }
        function unescape(string2) {
          string2 = toString2(string2);
          return string2 && reHasEscapedHtml.test(string2) ? string2.replace(reEscapedHtml, unescapeHtmlChar) : string2;
        }
        var upperCase = createCompounder(function(result2, word, index2) {
          return result2 + (index2 ? " " : "") + word.toUpperCase();
        });
        var upperFirst = createCaseFirst("toUpperCase");
        function words(string2, pattern, guard) {
          string2 = toString2(string2);
          pattern = guard ? undefined$1 : pattern;
          if (pattern === undefined$1) {
            return hasUnicodeWord(string2) ? unicodeWords(string2) : asciiWords(string2);
          }
          return string2.match(pattern) || [];
        }
        var attempt = baseRest(function(func, args) {
          try {
            return apply(func, undefined$1, args);
          } catch (e) {
            return isError(e) ? e : new Error2(e);
          }
        });
        var bindAll = flatRest(function(object2, methodNames) {
          arrayEach(methodNames, function(key) {
            key = toKey(key);
            baseAssignValue(object2, key, bind(object2[key], object2));
          });
          return object2;
        });
        function cond(pairs) {
          var length = pairs == null ? 0 : pairs.length, toIteratee = getIteratee();
          pairs = !length ? [] : arrayMap(pairs, function(pair) {
            if (typeof pair[1] != "function") {
              throw new TypeError2(FUNC_ERROR_TEXT);
            }
            return [toIteratee(pair[0]), pair[1]];
          });
          return baseRest(function(args) {
            var index2 = -1;
            while (++index2 < length) {
              var pair = pairs[index2];
              if (apply(pair[0], this, args)) {
                return apply(pair[1], this, args);
              }
            }
          });
        }
        function conforms(source) {
          return baseConforms(baseClone2(source, CLONE_DEEP_FLAG));
        }
        function constant(value) {
          return function() {
            return value;
          };
        }
        function defaultTo(value, defaultValue) {
          return value == null || value !== value ? defaultValue : value;
        }
        var flow = createFlow();
        var flowRight = createFlow(true);
        function identity(value) {
          return value;
        }
        function iteratee(func) {
          return baseIteratee(typeof func == "function" ? func : baseClone2(func, CLONE_DEEP_FLAG));
        }
        function matches(source) {
          return baseMatches(baseClone2(source, CLONE_DEEP_FLAG));
        }
        function matchesProperty(path, srcValue) {
          return baseMatchesProperty(path, baseClone2(srcValue, CLONE_DEEP_FLAG));
        }
        var method = baseRest(function(path, args) {
          return function(object2) {
            return baseInvoke(object2, path, args);
          };
        });
        var methodOf = baseRest(function(object2, args) {
          return function(path) {
            return baseInvoke(object2, path, args);
          };
        });
        function mixin(object2, source, options2) {
          var props = keys(source), methodNames = baseFunctions(source, props);
          if (options2 == null && !(isObject2(source) && (methodNames.length || !props.length))) {
            options2 = source;
            source = object2;
            object2 = this;
            methodNames = baseFunctions(source, keys(source));
          }
          var chain2 = !(isObject2(options2) && "chain" in options2) || !!options2.chain, isFunc = isFunction2(object2);
          arrayEach(methodNames, function(methodName) {
            var func = source[methodName];
            object2[methodName] = func;
            if (isFunc) {
              object2.prototype[methodName] = function() {
                var chainAll = this.__chain__;
                if (chain2 || chainAll) {
                  var result2 = object2(this.__wrapped__), actions2 = result2.__actions__ = copyArray(this.__actions__);
                  actions2.push({ "func": func, "args": arguments, "thisArg": object2 });
                  result2.__chain__ = chainAll;
                  return result2;
                }
                return func.apply(object2, arrayPush([this.value()], arguments));
              };
            }
          });
          return object2;
        }
        function noConflict() {
          if (root._ === this) {
            root._ = oldDash;
          }
          return this;
        }
        function noop() {
        }
        function nthArg(n) {
          n = toInteger(n);
          return baseRest(function(args) {
            return baseNth(args, n);
          });
        }
        var over = createOver(arrayMap);
        var overEvery = createOver(arrayEvery);
        var overSome = createOver(arraySome);
        function property(path) {
          return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
        }
        function propertyOf(object2) {
          return function(path) {
            return object2 == null ? undefined$1 : baseGet(object2, path);
          };
        }
        var range = createRange();
        var rangeRight = createRange(true);
        function stubArray() {
          return [];
        }
        function stubFalse() {
          return false;
        }
        function stubObject() {
          return {};
        }
        function stubString() {
          return "";
        }
        function stubTrue() {
          return true;
        }
        function times(n, iteratee2) {
          n = toInteger(n);
          if (n < 1 || n > MAX_SAFE_INTEGER) {
            return [];
          }
          var index2 = MAX_ARRAY_LENGTH, length = nativeMin(n, MAX_ARRAY_LENGTH);
          iteratee2 = getIteratee(iteratee2);
          n -= MAX_ARRAY_LENGTH;
          var result2 = baseTimes(length, iteratee2);
          while (++index2 < n) {
            iteratee2(index2);
          }
          return result2;
        }
        function toPath(value) {
          if (isArray(value)) {
            return arrayMap(value, toKey);
          }
          return isSymbol(value) ? [value] : copyArray(stringToPath(toString2(value)));
        }
        function uniqueId(prefix) {
          var id = ++idCounter;
          return toString2(prefix) + id;
        }
        var add = createMathOperation(function(augend, addend) {
          return augend + addend;
        }, 0);
        var ceil = createRound("ceil");
        var divide = createMathOperation(function(dividend, divisor) {
          return dividend / divisor;
        }, 1);
        var floor = createRound("floor");
        function max(array2) {
          return array2 && array2.length ? baseExtremum(array2, identity, baseGt) : undefined$1;
        }
        function maxBy(array2, iteratee2) {
          return array2 && array2.length ? baseExtremum(array2, getIteratee(iteratee2, 2), baseGt) : undefined$1;
        }
        function mean(array2) {
          return baseMean(array2, identity);
        }
        function meanBy(array2, iteratee2) {
          return baseMean(array2, getIteratee(iteratee2, 2));
        }
        function min(array2) {
          return array2 && array2.length ? baseExtremum(array2, identity, baseLt) : undefined$1;
        }
        function minBy(array2, iteratee2) {
          return array2 && array2.length ? baseExtremum(array2, getIteratee(iteratee2, 2), baseLt) : undefined$1;
        }
        var multiply = createMathOperation(function(multiplier, multiplicand) {
          return multiplier * multiplicand;
        }, 1);
        var round = createRound("round");
        var subtract = createMathOperation(function(minuend, subtrahend) {
          return minuend - subtrahend;
        }, 0);
        function sum(array2) {
          return array2 && array2.length ? baseSum(array2, identity) : 0;
        }
        function sumBy(array2, iteratee2) {
          return array2 && array2.length ? baseSum(array2, getIteratee(iteratee2, 2)) : 0;
        }
        lodash2.after = after;
        lodash2.ary = ary;
        lodash2.assign = assign;
        lodash2.assignIn = assignIn;
        lodash2.assignInWith = assignInWith;
        lodash2.assignWith = assignWith;
        lodash2.at = at;
        lodash2.before = before;
        lodash2.bind = bind;
        lodash2.bindAll = bindAll;
        lodash2.bindKey = bindKey;
        lodash2.castArray = castArray;
        lodash2.chain = chain;
        lodash2.chunk = chunk;
        lodash2.compact = compact2;
        lodash2.concat = concat;
        lodash2.cond = cond;
        lodash2.conforms = conforms;
        lodash2.constant = constant;
        lodash2.countBy = countBy;
        lodash2.create = create2;
        lodash2.curry = curry2;
        lodash2.curryRight = curryRight;
        lodash2.debounce = debounce;
        lodash2.defaults = defaults;
        lodash2.defaultsDeep = defaultsDeep;
        lodash2.defer = defer;
        lodash2.delay = delay;
        lodash2.difference = difference;
        lodash2.differenceBy = differenceBy;
        lodash2.differenceWith = differenceWith;
        lodash2.drop = drop;
        lodash2.dropRight = dropRight;
        lodash2.dropRightWhile = dropRightWhile;
        lodash2.dropWhile = dropWhile;
        lodash2.fill = fill;
        lodash2.filter = filter;
        lodash2.flatMap = flatMap;
        lodash2.flatMapDeep = flatMapDeep;
        lodash2.flatMapDepth = flatMapDepth;
        lodash2.flatten = flatten;
        lodash2.flattenDeep = flattenDeep;
        lodash2.flattenDepth = flattenDepth;
        lodash2.flip = flip;
        lodash2.flow = flow;
        lodash2.flowRight = flowRight;
        lodash2.fromPairs = fromPairs;
        lodash2.functions = functions;
        lodash2.functionsIn = functionsIn;
        lodash2.groupBy = groupBy;
        lodash2.initial = initial;
        lodash2.intersection = intersection2;
        lodash2.intersectionBy = intersectionBy;
        lodash2.intersectionWith = intersectionWith;
        lodash2.invert = invert;
        lodash2.invertBy = invertBy;
        lodash2.invokeMap = invokeMap;
        lodash2.iteratee = iteratee;
        lodash2.keyBy = keyBy;
        lodash2.keys = keys;
        lodash2.keysIn = keysIn;
        lodash2.map = map2;
        lodash2.mapKeys = mapKeys2;
        lodash2.mapValues = mapValues2;
        lodash2.matches = matches;
        lodash2.matchesProperty = matchesProperty;
        lodash2.memoize = memoize;
        lodash2.merge = merge2;
        lodash2.mergeWith = mergeWith;
        lodash2.method = method;
        lodash2.methodOf = methodOf;
        lodash2.mixin = mixin;
        lodash2.negate = negate;
        lodash2.nthArg = nthArg;
        lodash2.omit = omit2;
        lodash2.omitBy = omitBy;
        lodash2.once = once2;
        lodash2.orderBy = orderBy;
        lodash2.over = over;
        lodash2.overArgs = overArgs;
        lodash2.overEvery = overEvery;
        lodash2.overSome = overSome;
        lodash2.partial = partial2;
        lodash2.partialRight = partialRight;
        lodash2.partition = partition;
        lodash2.pick = pick2;
        lodash2.pickBy = pickBy;
        lodash2.property = property;
        lodash2.propertyOf = propertyOf;
        lodash2.pull = pull;
        lodash2.pullAll = pullAll;
        lodash2.pullAllBy = pullAllBy;
        lodash2.pullAllWith = pullAllWith;
        lodash2.pullAt = pullAt;
        lodash2.range = range;
        lodash2.rangeRight = rangeRight;
        lodash2.rearg = rearg;
        lodash2.reject = reject;
        lodash2.remove = remove;
        lodash2.rest = rest;
        lodash2.reverse = reverse;
        lodash2.sampleSize = sampleSize;
        lodash2.set = set2;
        lodash2.setWith = setWith;
        lodash2.shuffle = shuffle;
        lodash2.slice = slice;
        lodash2.sortBy = sortBy;
        lodash2.sortedUniq = sortedUniq;
        lodash2.sortedUniqBy = sortedUniqBy;
        lodash2.split = split;
        lodash2.spread = spread;
        lodash2.tail = tail;
        lodash2.take = take;
        lodash2.takeRight = takeRight;
        lodash2.takeRightWhile = takeRightWhile;
        lodash2.takeWhile = takeWhile;
        lodash2.tap = tap;
        lodash2.throttle = throttle;
        lodash2.thru = thru;
        lodash2.toArray = toArray2;
        lodash2.toPairs = toPairs;
        lodash2.toPairsIn = toPairsIn;
        lodash2.toPath = toPath;
        lodash2.toPlainObject = toPlainObject;
        lodash2.transform = transform2;
        lodash2.unary = unary;
        lodash2.union = union2;
        lodash2.unionBy = unionBy;
        lodash2.unionWith = unionWith;
        lodash2.uniq = uniq;
        lodash2.uniqBy = uniqBy;
        lodash2.uniqWith = uniqWith;
        lodash2.unset = unset;
        lodash2.unzip = unzip;
        lodash2.unzipWith = unzipWith;
        lodash2.update = update;
        lodash2.updateWith = updateWith;
        lodash2.values = values;
        lodash2.valuesIn = valuesIn;
        lodash2.without = without;
        lodash2.words = words;
        lodash2.wrap = wrap;
        lodash2.xor = xor;
        lodash2.xorBy = xorBy;
        lodash2.xorWith = xorWith;
        lodash2.zip = zip;
        lodash2.zipObject = zipObject;
        lodash2.zipObjectDeep = zipObjectDeep;
        lodash2.zipWith = zipWith;
        lodash2.entries = toPairs;
        lodash2.entriesIn = toPairsIn;
        lodash2.extend = assignIn;
        lodash2.extendWith = assignInWith;
        mixin(lodash2, lodash2);
        lodash2.add = add;
        lodash2.attempt = attempt;
        lodash2.camelCase = camelCase2;
        lodash2.capitalize = capitalize;
        lodash2.ceil = ceil;
        lodash2.clamp = clamp;
        lodash2.clone = clone2;
        lodash2.cloneDeep = cloneDeep;
        lodash2.cloneDeepWith = cloneDeepWith;
        lodash2.cloneWith = cloneWith;
        lodash2.conformsTo = conformsTo;
        lodash2.deburr = deburr;
        lodash2.defaultTo = defaultTo;
        lodash2.divide = divide;
        lodash2.endsWith = endsWith;
        lodash2.eq = eq;
        lodash2.escape = escape;
        lodash2.escapeRegExp = escapeRegExp;
        lodash2.every = every;
        lodash2.find = find;
        lodash2.findIndex = findIndex2;
        lodash2.findKey = findKey;
        lodash2.findLast = findLast;
        lodash2.findLastIndex = findLastIndex;
        lodash2.findLastKey = findLastKey;
        lodash2.floor = floor;
        lodash2.forEach = forEach;
        lodash2.forEachRight = forEachRight;
        lodash2.forIn = forIn;
        lodash2.forInRight = forInRight;
        lodash2.forOwn = forOwn;
        lodash2.forOwnRight = forOwnRight;
        lodash2.get = get;
        lodash2.gt = gt;
        lodash2.gte = gte;
        lodash2.has = has2;
        lodash2.hasIn = hasIn;
        lodash2.head = head;
        lodash2.identity = identity;
        lodash2.includes = includes;
        lodash2.indexOf = indexOf;
        lodash2.inRange = inRange;
        lodash2.invoke = invoke;
        lodash2.isArguments = isArguments;
        lodash2.isArray = isArray;
        lodash2.isArrayBuffer = isArrayBuffer;
        lodash2.isArrayLike = isArrayLike;
        lodash2.isArrayLikeObject = isArrayLikeObject;
        lodash2.isBoolean = isBoolean;
        lodash2.isBuffer = isBuffer2;
        lodash2.isDate = isDate2;
        lodash2.isElement = isElement;
        lodash2.isEmpty = isEmpty;
        lodash2.isEqual = isEqual;
        lodash2.isEqualWith = isEqualWith;
        lodash2.isError = isError;
        lodash2.isFinite = isFinite;
        lodash2.isFunction = isFunction2;
        lodash2.isInteger = isInteger;
        lodash2.isLength = isLength;
        lodash2.isMap = isMap;
        lodash2.isMatch = isMatch;
        lodash2.isMatchWith = isMatchWith;
        lodash2.isNaN = isNaN2;
        lodash2.isNative = isNative;
        lodash2.isNil = isNil;
        lodash2.isNull = isNull;
        lodash2.isNumber = isNumber;
        lodash2.isObject = isObject2;
        lodash2.isObjectLike = isObjectLike;
        lodash2.isPlainObject = isPlainObject2;
        lodash2.isRegExp = isRegExp;
        lodash2.isSafeInteger = isSafeInteger;
        lodash2.isSet = isSet;
        lodash2.isString = isString;
        lodash2.isSymbol = isSymbol;
        lodash2.isTypedArray = isTypedArray;
        lodash2.isUndefined = isUndefined;
        lodash2.isWeakMap = isWeakMap;
        lodash2.isWeakSet = isWeakSet;
        lodash2.join = join;
        lodash2.kebabCase = kebabCase;
        lodash2.last = last;
        lodash2.lastIndexOf = lastIndexOf;
        lodash2.lowerCase = lowerCase;
        lodash2.lowerFirst = lowerFirst;
        lodash2.lt = lt;
        lodash2.lte = lte;
        lodash2.max = max;
        lodash2.maxBy = maxBy;
        lodash2.mean = mean;
        lodash2.meanBy = meanBy;
        lodash2.min = min;
        lodash2.minBy = minBy;
        lodash2.stubArray = stubArray;
        lodash2.stubFalse = stubFalse;
        lodash2.stubObject = stubObject;
        lodash2.stubString = stubString;
        lodash2.stubTrue = stubTrue;
        lodash2.multiply = multiply;
        lodash2.nth = nth;
        lodash2.noConflict = noConflict;
        lodash2.noop = noop;
        lodash2.now = now;
        lodash2.pad = pad;
        lodash2.padEnd = padEnd;
        lodash2.padStart = padStart;
        lodash2.parseInt = parseInt2;
        lodash2.random = random;
        lodash2.reduce = reduce;
        lodash2.reduceRight = reduceRight;
        lodash2.repeat = repeat;
        lodash2.replace = replace;
        lodash2.result = result;
        lodash2.round = round;
        lodash2.runInContext = runInContext2;
        lodash2.sample = sample;
        lodash2.size = size;
        lodash2.snakeCase = snakeCase2;
        lodash2.some = some;
        lodash2.sortedIndex = sortedIndex;
        lodash2.sortedIndexBy = sortedIndexBy;
        lodash2.sortedIndexOf = sortedIndexOf;
        lodash2.sortedLastIndex = sortedLastIndex;
        lodash2.sortedLastIndexBy = sortedLastIndexBy;
        lodash2.sortedLastIndexOf = sortedLastIndexOf;
        lodash2.startCase = startCase;
        lodash2.startsWith = startsWith;
        lodash2.subtract = subtract;
        lodash2.sum = sum;
        lodash2.sumBy = sumBy;
        lodash2.template = template;
        lodash2.times = times;
        lodash2.toFinite = toFinite;
        lodash2.toInteger = toInteger;
        lodash2.toLength = toLength;
        lodash2.toLower = toLower;
        lodash2.toNumber = toNumber2;
        lodash2.toSafeInteger = toSafeInteger;
        lodash2.toString = toString2;
        lodash2.toUpper = toUpper;
        lodash2.trim = trim2;
        lodash2.trimEnd = trimEnd;
        lodash2.trimStart = trimStart;
        lodash2.truncate = truncate;
        lodash2.unescape = unescape;
        lodash2.uniqueId = uniqueId;
        lodash2.upperCase = upperCase;
        lodash2.upperFirst = upperFirst;
        lodash2.each = forEach;
        lodash2.eachRight = forEachRight;
        lodash2.first = head;
        mixin(lodash2, (function() {
          var source = {};
          baseForOwn(lodash2, function(func, methodName) {
            if (!hasOwnProperty.call(lodash2.prototype, methodName)) {
              source[methodName] = func;
            }
          });
          return source;
        })(), { "chain": false });
        lodash2.VERSION = VERSION;
        arrayEach(["bind", "bindKey", "curry", "curryRight", "partial", "partialRight"], function(methodName) {
          lodash2[methodName].placeholder = lodash2;
        });
        arrayEach(["drop", "take"], function(methodName, index2) {
          LazyWrapper.prototype[methodName] = function(n) {
            n = n === undefined$1 ? 1 : nativeMax(toInteger(n), 0);
            var result2 = this.__filtered__ && !index2 ? new LazyWrapper(this) : this.clone();
            if (result2.__filtered__) {
              result2.__takeCount__ = nativeMin(n, result2.__takeCount__);
            } else {
              result2.__views__.push({
                "size": nativeMin(n, MAX_ARRAY_LENGTH),
                "type": methodName + (result2.__dir__ < 0 ? "Right" : "")
              });
            }
            return result2;
          };
          LazyWrapper.prototype[methodName + "Right"] = function(n) {
            return this.reverse()[methodName](n).reverse();
          };
        });
        arrayEach(["filter", "map", "takeWhile"], function(methodName, index2) {
          var type = index2 + 1, isFilter = type == LAZY_FILTER_FLAG || type == LAZY_WHILE_FLAG;
          LazyWrapper.prototype[methodName] = function(iteratee2) {
            var result2 = this.clone();
            result2.__iteratees__.push({
              "iteratee": getIteratee(iteratee2, 3),
              "type": type
            });
            result2.__filtered__ = result2.__filtered__ || isFilter;
            return result2;
          };
        });
        arrayEach(["head", "last"], function(methodName, index2) {
          var takeName = "take" + (index2 ? "Right" : "");
          LazyWrapper.prototype[methodName] = function() {
            return this[takeName](1).value()[0];
          };
        });
        arrayEach(["initial", "tail"], function(methodName, index2) {
          var dropName = "drop" + (index2 ? "" : "Right");
          LazyWrapper.prototype[methodName] = function() {
            return this.__filtered__ ? new LazyWrapper(this) : this[dropName](1);
          };
        });
        LazyWrapper.prototype.compact = function() {
          return this.filter(identity);
        };
        LazyWrapper.prototype.find = function(predicate) {
          return this.filter(predicate).head();
        };
        LazyWrapper.prototype.findLast = function(predicate) {
          return this.reverse().find(predicate);
        };
        LazyWrapper.prototype.invokeMap = baseRest(function(path, args) {
          if (typeof path == "function") {
            return new LazyWrapper(this);
          }
          return this.map(function(value) {
            return baseInvoke(value, path, args);
          });
        });
        LazyWrapper.prototype.reject = function(predicate) {
          return this.filter(negate(getIteratee(predicate)));
        };
        LazyWrapper.prototype.slice = function(start, end) {
          start = toInteger(start);
          var result2 = this;
          if (result2.__filtered__ && (start > 0 || end < 0)) {
            return new LazyWrapper(result2);
          }
          if (start < 0) {
            result2 = result2.takeRight(-start);
          } else if (start) {
            result2 = result2.drop(start);
          }
          if (end !== undefined$1) {
            end = toInteger(end);
            result2 = end < 0 ? result2.dropRight(-end) : result2.take(end - start);
          }
          return result2;
        };
        LazyWrapper.prototype.takeRightWhile = function(predicate) {
          return this.reverse().takeWhile(predicate).reverse();
        };
        LazyWrapper.prototype.toArray = function() {
          return this.take(MAX_ARRAY_LENGTH);
        };
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var checkIteratee = /^(?:filter|find|map|reject)|While$/.test(methodName), isTaker = /^(?:head|last)$/.test(methodName), lodashFunc = lodash2[isTaker ? "take" + (methodName == "last" ? "Right" : "") : methodName], retUnwrapped = isTaker || /^find/.test(methodName);
          if (!lodashFunc) {
            return;
          }
          lodash2.prototype[methodName] = function() {
            var value = this.__wrapped__, args = isTaker ? [1] : arguments, isLazy = value instanceof LazyWrapper, iteratee2 = args[0], useLazy = isLazy || isArray(value);
            var interceptor = function(value2) {
              var result3 = lodashFunc.apply(lodash2, arrayPush([value2], args));
              return isTaker && chainAll ? result3[0] : result3;
            };
            if (useLazy && checkIteratee && typeof iteratee2 == "function" && iteratee2.length != 1) {
              isLazy = useLazy = false;
            }
            var chainAll = this.__chain__, isHybrid = !!this.__actions__.length, isUnwrapped = retUnwrapped && !chainAll, onlyLazy = isLazy && !isHybrid;
            if (!retUnwrapped && useLazy) {
              value = onlyLazy ? value : new LazyWrapper(this);
              var result2 = func.apply(value, args);
              result2.__actions__.push({ "func": thru, "args": [interceptor], "thisArg": undefined$1 });
              return new LodashWrapper(result2, chainAll);
            }
            if (isUnwrapped && onlyLazy) {
              return func.apply(this, args);
            }
            result2 = this.thru(interceptor);
            return isUnwrapped ? isTaker ? result2.value()[0] : result2.value() : result2;
          };
        });
        arrayEach(["pop", "push", "shift", "sort", "splice", "unshift"], function(methodName) {
          var func = arrayProto[methodName], chainName = /^(?:push|sort|unshift)$/.test(methodName) ? "tap" : "thru", retUnwrapped = /^(?:pop|shift)$/.test(methodName);
          lodash2.prototype[methodName] = function() {
            var args = arguments;
            if (retUnwrapped && !this.__chain__) {
              var value = this.value();
              return func.apply(isArray(value) ? value : [], args);
            }
            return this[chainName](function(value2) {
              return func.apply(isArray(value2) ? value2 : [], args);
            });
          };
        });
        baseForOwn(LazyWrapper.prototype, function(func, methodName) {
          var lodashFunc = lodash2[methodName];
          if (lodashFunc) {
            var key = lodashFunc.name + "";
            if (!hasOwnProperty.call(realNames, key)) {
              realNames[key] = [];
            }
            realNames[key].push({ "name": methodName, "func": lodashFunc });
          }
        });
        realNames[createHybrid(undefined$1, WRAP_BIND_KEY_FLAG).name] = [{
          "name": "wrapper",
          "func": undefined$1
        }];
        LazyWrapper.prototype.clone = lazyClone;
        LazyWrapper.prototype.reverse = lazyReverse;
        LazyWrapper.prototype.value = lazyValue;
        lodash2.prototype.at = wrapperAt;
        lodash2.prototype.chain = wrapperChain;
        lodash2.prototype.commit = wrapperCommit;
        lodash2.prototype.next = wrapperNext;
        lodash2.prototype.plant = wrapperPlant;
        lodash2.prototype.reverse = wrapperReverse;
        lodash2.prototype.toJSON = lodash2.prototype.valueOf = lodash2.prototype.value = wrapperValue;
        lodash2.prototype.first = lodash2.prototype.head;
        if (symIterator) {
          lodash2.prototype[symIterator] = wrapperToIterator;
        }
        return lodash2;
      });
      var _2 = runInContext();
      if (freeModule) {
        (freeModule.exports = _2)._ = _2;
        freeExports._ = _2;
      } else {
        root._ = _2;
      }
    }).call(lodash);
  })(lodash$1, lodash$1.exports);
  return lodash$1.exports;
}
var lodashExports = requireLodash();
const _ = /* @__PURE__ */ getDefaultExportFromCjs(lodashExports);
const TRUTHY_INPUTS = /* @__PURE__ */ new Set([
  "true",
  "t",
  "1",
  1
]);
const FALSY_INPUTS = /* @__PURE__ */ new Set([
  "false",
  "f",
  "0",
  0
]);
const isBooleanLike = (value) => {
  if (typeof value === "boolean") {
    return true;
  }
  if (typeof value === "string" || typeof value === "number") {
    return TRUTHY_INPUTS.has(value) || FALSY_INPUTS.has(value);
  }
  return false;
};
function envFn(key, defaultValue) {
  return _.has(process.env, key) ? process.env[key] : defaultValue;
}
function getKey(key) {
  return process.env[key] ?? "";
}
function int$1(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  return parseInt(getKey(key), 10);
}
function float(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  return parseFloat(getKey(key));
}
function bool(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  return getKey(key) === "true";
}
function json(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  try {
    return JSON.parse(getKey(key));
  } catch (error2) {
    if (error2 instanceof Error) {
      throw new Error(`Invalid json environment variable ${key}: ${error2.message}`);
    }
    throw error2;
  }
}
function array$2(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  let value = getKey(key);
  if (value.startsWith("[") && value.endsWith("]")) {
    value = value.substring(1, value.length - 1);
  }
  return value.split(",").map((v) => {
    return _.trim(_.trim(v, " "), '"');
  });
}
function date$3(key, defaultValue) {
  if (!_.has(process.env, key)) {
    return defaultValue;
  }
  return new Date(getKey(key));
}
function oneOf(key, expectedValues, defaultValue) {
  if (!expectedValues) {
    throw new Error(`env.oneOf requires expectedValues`);
  }
  if (defaultValue && !expectedValues.includes(defaultValue)) {
    throw new Error(`env.oneOf requires defaultValue to be included in expectedValues`);
  }
  const rawValue = env(key, defaultValue);
  if (rawValue !== void 0 && expectedValues.includes(rawValue)) {
    return rawValue;
  }
  return defaultValue;
}
const utils = {
  int: int$1,
  float,
  bool,
  json,
  array: array$2,
  date: date$3,
  oneOf
};
const env = Object.assign(envFn, utils);
const ID_ATTRIBUTE$2 = "id";
const DOC_ID_ATTRIBUTE$2 = "documentId";
const constants = {
  ID_ATTRIBUTE: ID_ATTRIBUTE$2,
  DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$2
};
const storedPrivateAttributesCache = /* @__PURE__ */ new WeakMap();
const computeStoredPrivateAttributes = (model) => new Set(lodashExports.union(lodashExports.get(model, "options.privateAttributes", []), strapi?.config?.get("api.responses.privateAttributes", []) ?? []));
const getStoredPrivateAttributesSet = (model) => {
  const cacheable = typeof model === "object" && model !== null && strapi?.config != null;
  if (!cacheable) {
    return computeStoredPrivateAttributes(model);
  }
  let cached2 = storedPrivateAttributesCache.get(model);
  if (cached2 === void 0) {
    cached2 = computeStoredPrivateAttributes(model);
    storedPrivateAttributesCache.set(model, cached2);
  }
  return cached2;
};
const isPrivateAttribute = (model, attributeName) => {
  if (model?.attributes?.[attributeName]?.private === true) {
    return true;
  }
  const storedPrivateAttributes = getStoredPrivateAttributesSet(model);
  return storedPrivateAttributes.size !== 0 && storedPrivateAttributes.has(attributeName);
};
const isScalarAttribute = (attribute) => {
  return attribute && ![
    "media",
    "component",
    "relation",
    "dynamiczone"
  ].includes(attribute.type);
};
const isMediaAttribute = (attribute) => attribute?.type === "media";
const isRelationalAttribute = (attribute) => attribute?.type === "relation";
const isDynamicZoneAttribute = (attribute) => !!attribute && attribute.type === "dynamiczone";
const isMorphToRelationalAttribute = (attribute) => {
  return !!attribute && isRelationalAttribute(attribute) && attribute.relation?.startsWith?.("morphTo");
};
const curry = (fn, arity = fn.length) => {
  const curried = (...args) => {
    if (args.length >= arity) {
      return fn(...args);
    }
    return (...rest) => curried(...args, ...rest);
  };
  return curried;
};
const parallelWithOrderedErrors = async (promises) => {
  const results = await Promise.allSettled(promises);
  for (let i = 0; i < results.length; i += 1) {
    const result = results[i];
    if (result.status === "rejected") {
      throw result.reason;
    }
  }
  return results.map((r) => r.value);
};
const traverseEntity$1 = async (visitor2, options2, entity) => {
  const { path = {
    raw: null,
    attribute: null,
    rawWithIndices: null
  }, schema, getModel, allowedExtraRootKeys } = options2;
  let parent = options2.parent;
  const traverseMorphRelationTarget = async (visitor3, path2, entry) => {
    const targetSchema = getModel(entry.__type);
    const traverseOptions = {
      schema: targetSchema,
      path: path2,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    return traverseEntity$1(visitor3, traverseOptions, entry);
  };
  const traverseRelationTarget = (schema2) => async (visitor3, path2, entry) => {
    const traverseOptions = {
      schema: schema2,
      path: path2,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    return traverseEntity$1(visitor3, traverseOptions, entry);
  };
  const traverseMediaTarget = async (visitor3, path2, entry) => {
    const targetSchemaUID = "plugin::upload.file";
    const targetSchema = getModel(targetSchemaUID);
    const traverseOptions = {
      schema: targetSchema,
      path: path2,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    return traverseEntity$1(visitor3, traverseOptions, entry);
  };
  const traverseComponent = async (visitor3, path2, schema2, entry) => {
    const traverseOptions = {
      schema: schema2,
      path: path2,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    return traverseEntity$1(visitor3, traverseOptions, entry);
  };
  const visitDynamicZoneEntry = async (visitor3, path2, entry) => {
    if (entry == null) {
      return entry;
    }
    const targetSchema = getModel(entry.__component);
    const traverseOptions = {
      schema: targetSchema,
      path: path2,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    return traverseEntity$1(visitor3, traverseOptions, entry);
  };
  if (!lodashExports.isObject(entity) || schema == null) {
    return entity;
  }
  const copy = lodashExports.clone(entity);
  const visitorUtils = createVisitorUtils({
    data: copy
  });
  const keys = Object.keys(copy);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const attribute = schema.attributes[key];
    const newPath = {
      ...path
    };
    newPath.raw = path.raw == null ? key : `${path.raw}.${key}`;
    newPath.rawWithIndices = path.rawWithIndices == null ? key : `${path.rawWithIndices}.${key}`;
    if (attribute != null) {
      newPath.attribute = path.attribute == null ? key : `${path.attribute}.${key}`;
    }
    const visitorOptions = {
      data: copy,
      schema,
      key,
      value: copy[key],
      attribute,
      path: newPath,
      getModel,
      parent,
      allowedExtraRootKeys
    };
    const visited = visitor2(visitorOptions, visitorUtils);
    if (visited != null && typeof visited.then === "function") {
      await visited;
    }
    const value = copy[key];
    if (value == null || attribute == null) {
      continue;
    }
    if (isRelationalAttribute(attribute)) {
      parent = {
        schema,
        key,
        attribute,
        path: newPath
      };
      const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
      const method = isMorphRelation ? traverseMorphRelationTarget : traverseRelationTarget(getModel(attribute.target));
      if (Array.isArray(value)) {
        copy[key] = await parallelWithOrderedErrors(value.map((item, i2) => {
          const arrayPath = {
            ...newPath,
            rawWithIndices: newPath.rawWithIndices == null ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          return method(visitor2, arrayPath, item);
        }));
      } else {
        copy[key] = await method(visitor2, newPath, value);
      }
      continue;
    }
    if (isMediaAttribute(attribute)) {
      parent = {
        schema,
        key,
        attribute,
        path: newPath
      };
      if (Array.isArray(value)) {
        copy[key] = await parallelWithOrderedErrors(value.map((item, i2) => {
          const arrayPath = {
            ...newPath,
            rawWithIndices: newPath.rawWithIndices == null ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          return traverseMediaTarget(visitor2, arrayPath, item);
        }));
      } else {
        copy[key] = await traverseMediaTarget(visitor2, newPath, value);
      }
      continue;
    }
    if (attribute.type === "component") {
      parent = {
        schema,
        key,
        attribute,
        path: newPath
      };
      const targetSchema = getModel(attribute.component);
      if (Array.isArray(value)) {
        copy[key] = await parallelWithOrderedErrors(value.map((item, i2) => {
          const arrayPath = {
            ...newPath,
            rawWithIndices: newPath.rawWithIndices == null ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
          };
          return traverseComponent(visitor2, arrayPath, targetSchema, item);
        }));
      } else {
        copy[key] = await traverseComponent(visitor2, newPath, targetSchema, value);
      }
      continue;
    }
    if (attribute.type === "dynamiczone" && Array.isArray(value)) {
      parent = {
        schema,
        key,
        attribute,
        path: newPath
      };
      copy[key] = await parallelWithOrderedErrors(value.map((item, i2) => {
        const arrayPath = {
          ...newPath,
          rawWithIndices: newPath.rawWithIndices == null ? `${i2}` : `${newPath.rawWithIndices}.${i2}`
        };
        return visitDynamicZoneEntry(visitor2, arrayPath, item);
      }));
      continue;
    }
  }
  return copy;
};
const createVisitorUtils = ({ data }) => ({
  remove(key) {
    delete data[key];
  },
  set(key, value) {
    data[key] = value;
  }
});
curry(traverseEntity$1);
var dist$1 = { exports: {} };
var dist = dist$1.exports;
var hasRequiredDist;
function requireDist() {
  if (hasRequiredDist) return dist$1.exports;
  hasRequiredDist = 1;
  (function(module, exports) {
    !(function(t, n) {
      module.exports = n(require$$0$1, crypto);
    })(dist, function(t, n) {
      return (function(t2) {
        function n2(e) {
          if (r[e]) return r[e].exports;
          var o = r[e] = { exports: {}, id: e, loaded: false };
          return t2[e].call(o.exports, o, o.exports, n2), o.loaded = true, o.exports;
        }
        var r = {};
        return n2.m = t2, n2.c = r, n2.p = "", n2(0);
      })([function(t2, n2, r) {
        t2.exports = r(34);
      }, function(t2, n2, r) {
        var e = r(29)("wks"), o = r(33), i = r(2).Symbol, c = "function" == typeof i, u = t2.exports = function(t3) {
          return e[t3] || (e[t3] = c && i[t3] || (c ? i : o)("Symbol." + t3));
        };
        u.store = e;
      }, function(t2, n2) {
        var r = t2.exports = "undefined" != typeof window && window.Math == Math ? window : "undefined" != typeof self && self.Math == Math ? self : Function("return this")();
        "number" == typeof __g && (__g = r);
      }, function(t2, n2, r) {
        var e = r(9);
        t2.exports = function(t3) {
          if (!e(t3)) throw TypeError(t3 + " is not an object!");
          return t3;
        };
      }, function(t2, n2, r) {
        t2.exports = !r(24)(function() {
          return 7 != Object.defineProperty({}, "a", { get: function() {
            return 7;
          } }).a;
        });
      }, function(t2, n2, r) {
        var e = r(12), o = r(17);
        t2.exports = r(4) ? function(t3, n3, r2) {
          return e.f(t3, n3, o(1, r2));
        } : function(t3, n3, r2) {
          return t3[n3] = r2, t3;
        };
      }, function(t2, n2) {
        var r = t2.exports = { version: "2.4.0" };
        "number" == typeof __e && (__e = r);
      }, function(t2, n2, r) {
        var e = r(14);
        t2.exports = function(t3, n3, r2) {
          if (e(t3), void 0 === n3) return t3;
          switch (r2) {
            case 1:
              return function(r3) {
                return t3.call(n3, r3);
              };
            case 2:
              return function(r3, e2) {
                return t3.call(n3, r3, e2);
              };
            case 3:
              return function(r3, e2, o) {
                return t3.call(n3, r3, e2, o);
              };
          }
          return function() {
            return t3.apply(n3, arguments);
          };
        };
      }, function(t2, n2) {
        var r = {}.hasOwnProperty;
        t2.exports = function(t3, n3) {
          return r.call(t3, n3);
        };
      }, function(t2, n2) {
        t2.exports = function(t3) {
          return "object" == typeof t3 ? null !== t3 : "function" == typeof t3;
        };
      }, function(t2, n2) {
        t2.exports = {};
      }, function(t2, n2) {
        var r = {}.toString;
        t2.exports = function(t3) {
          return r.call(t3).slice(8, -1);
        };
      }, function(t2, n2, r) {
        var e = r(3), o = r(26), i = r(32), c = Object.defineProperty;
        n2.f = r(4) ? Object.defineProperty : function(t3, n3, r2) {
          if (e(t3), n3 = i(n3, true), e(r2), o) try {
            return c(t3, n3, r2);
          } catch (t4) {
          }
          if ("get" in r2 || "set" in r2) throw TypeError("Accessors not supported!");
          return "value" in r2 && (t3[n3] = r2.value), t3;
        };
      }, function(t2, n2, r) {
        var e = r(42), o = r(15);
        t2.exports = function(t3) {
          return e(o(t3));
        };
      }, function(t2, n2) {
        t2.exports = function(t3) {
          if ("function" != typeof t3) throw TypeError(t3 + " is not a function!");
          return t3;
        };
      }, function(t2, n2) {
        t2.exports = function(t3) {
          if (void 0 == t3) throw TypeError("Can't call method on  " + t3);
          return t3;
        };
      }, function(t2, n2, r) {
        var e = r(9), o = r(2).document, i = e(o) && e(o.createElement);
        t2.exports = function(t3) {
          return i ? o.createElement(t3) : {};
        };
      }, function(t2, n2) {
        t2.exports = function(t3, n3) {
          return { enumerable: !(1 & t3), configurable: !(2 & t3), writable: !(4 & t3), value: n3 };
        };
      }, function(t2, n2, r) {
        var e = r(12).f, o = r(8), i = r(1)("toStringTag");
        t2.exports = function(t3, n3, r2) {
          t3 && !o(t3 = r2 ? t3 : t3.prototype, i) && e(t3, i, { configurable: true, value: n3 });
        };
      }, function(t2, n2, r) {
        var e = r(29)("keys"), o = r(33);
        t2.exports = function(t3) {
          return e[t3] || (e[t3] = o(t3));
        };
      }, function(t2, n2) {
        var r = Math.ceil, e = Math.floor;
        t2.exports = function(t3) {
          return isNaN(t3 = +t3) ? 0 : (t3 > 0 ? e : r)(t3);
        };
      }, function(t2, n2, r) {
        var e = r(11), o = r(1)("toStringTag"), i = "Arguments" == e(/* @__PURE__ */ (function() {
          return arguments;
        })()), c = function(t3, n3) {
          try {
            return t3[n3];
          } catch (t4) {
          }
        };
        t2.exports = function(t3) {
          var n3, r2, u;
          return void 0 === t3 ? "Undefined" : null === t3 ? "Null" : "string" == typeof (r2 = c(n3 = Object(t3), o)) ? r2 : i ? e(n3) : "Object" == (u = e(n3)) && "function" == typeof n3.callee ? "Arguments" : u;
        };
      }, function(t2, n2) {
        t2.exports = "constructor,hasOwnProperty,isPrototypeOf,propertyIsEnumerable,toLocaleString,toString,valueOf".split(",");
      }, function(t2, n2, r) {
        var e = r(2), o = r(6), i = r(7), c = r(5), u = "prototype", s = function(t3, n3, r2) {
          var f, a, p, l = t3 & s.F, v = t3 & s.G, h = t3 & s.S, d = t3 & s.P, y = t3 & s.B, _2 = t3 & s.W, x = v ? o : o[n3] || (o[n3] = {}), m = x[u], w = v ? e : h ? e[n3] : (e[n3] || {})[u];
          v && (r2 = n3);
          for (f in r2) a = !l && w && void 0 !== w[f], a && f in x || (p = a ? w[f] : r2[f], x[f] = v && "function" != typeof w[f] ? r2[f] : y && a ? i(p, e) : _2 && w[f] == p ? (function(t4) {
            var n4 = function(n5, r3, e2) {
              if (this instanceof t4) {
                switch (arguments.length) {
                  case 0:
                    return new t4();
                  case 1:
                    return new t4(n5);
                  case 2:
                    return new t4(n5, r3);
                }
                return new t4(n5, r3, e2);
              }
              return t4.apply(this, arguments);
            };
            return n4[u] = t4[u], n4;
          })(p) : d && "function" == typeof p ? i(Function.call, p) : p, d && ((x.virtual || (x.virtual = {}))[f] = p, t3 & s.R && m && !m[f] && c(m, f, p)));
        };
        s.F = 1, s.G = 2, s.S = 4, s.P = 8, s.B = 16, s.W = 32, s.U = 64, s.R = 128, t2.exports = s;
      }, function(t2, n2) {
        t2.exports = function(t3) {
          try {
            return !!t3();
          } catch (t4) {
            return true;
          }
        };
      }, function(t2, n2, r) {
        t2.exports = r(2).document && document.documentElement;
      }, function(t2, n2, r) {
        t2.exports = !r(4) && !r(24)(function() {
          return 7 != Object.defineProperty(r(16)("div"), "a", { get: function() {
            return 7;
          } }).a;
        });
      }, function(t2, n2, r) {
        var e = r(28), o = r(23), i = r(57), c = r(5), u = r(8), s = r(10), f = r(45), a = r(18), p = r(52), l = r(1)("iterator"), v = !([].keys && "next" in [].keys()), h = "@@iterator", d = "keys", y = "values", _2 = function() {
          return this;
        };
        t2.exports = function(t3, n3, r2, x, m, w, g) {
          f(r2, n3, x);
          var b, O, j, S = function(t4) {
            if (!v && t4 in T) return T[t4];
            switch (t4) {
              case d:
                return function() {
                  return new r2(this, t4);
                };
              case y:
                return function() {
                  return new r2(this, t4);
                };
            }
            return function() {
              return new r2(this, t4);
            };
          }, E = n3 + " Iterator", P = m == y, M = false, T = t3.prototype, A = T[l] || T[h] || m && T[m], k = A || S(m), C = m ? P ? S("entries") : k : void 0, I = "Array" == n3 ? T.entries || A : A;
          if (I && (j = p(I.call(new t3())), j !== Object.prototype && (a(j, E, true), e || u(j, l) || c(j, l, _2))), P && A && A.name !== y && (M = true, k = function() {
            return A.call(this);
          }), e && !g || !v && !M && T[l] || c(T, l, k), s[n3] = k, s[E] = _2, m) if (b = { values: P ? k : S(y), keys: w ? k : S(d), entries: C }, g) for (O in b) O in T || i(T, O, b[O]);
          else o(o.P + o.F * (v || M), n3, b);
          return b;
        };
      }, function(t2, n2) {
        t2.exports = true;
      }, function(t2, n2, r) {
        var e = r(2), o = "__core-js_shared__", i = e[o] || (e[o] = {});
        t2.exports = function(t3) {
          return i[t3] || (i[t3] = {});
        };
      }, function(t2, n2, r) {
        var e, o, i, c = r(7), u = r(41), s = r(25), f = r(16), a = r(2), p = a.process, l = a.setImmediate, v = a.clearImmediate, h = a.MessageChannel, d = 0, y = {}, _2 = "onreadystatechange", x = function() {
          var t3 = +this;
          if (y.hasOwnProperty(t3)) {
            var n3 = y[t3];
            delete y[t3], n3();
          }
        }, m = function(t3) {
          x.call(t3.data);
        };
        l && v || (l = function(t3) {
          for (var n3 = [], r2 = 1; arguments.length > r2; ) n3.push(arguments[r2++]);
          return y[++d] = function() {
            u("function" == typeof t3 ? t3 : Function(t3), n3);
          }, e(d), d;
        }, v = function(t3) {
          delete y[t3];
        }, "process" == r(11)(p) ? e = function(t3) {
          p.nextTick(c(x, t3, 1));
        } : h ? (o = new h(), i = o.port2, o.port1.onmessage = m, e = c(i.postMessage, i, 1)) : a.addEventListener && "function" == typeof postMessage && !a.importScripts ? (e = function(t3) {
          a.postMessage(t3 + "", "*");
        }, a.addEventListener("message", m, false)) : e = _2 in f("script") ? function(t3) {
          s.appendChild(f("script"))[_2] = function() {
            s.removeChild(this), x.call(t3);
          };
        } : function(t3) {
          setTimeout(c(x, t3, 1), 0);
        }), t2.exports = { set: l, clear: v };
      }, function(t2, n2, r) {
        var e = r(20), o = Math.min;
        t2.exports = function(t3) {
          return t3 > 0 ? o(e(t3), 9007199254740991) : 0;
        };
      }, function(t2, n2, r) {
        var e = r(9);
        t2.exports = function(t3, n3) {
          if (!e(t3)) return t3;
          var r2, o;
          if (n3 && "function" == typeof (r2 = t3.toString) && !e(o = r2.call(t3))) return o;
          if ("function" == typeof (r2 = t3.valueOf) && !e(o = r2.call(t3))) return o;
          if (!n3 && "function" == typeof (r2 = t3.toString) && !e(o = r2.call(t3))) return o;
          throw TypeError("Can't convert object to primitive value");
        };
      }, function(t2, n2) {
        var r = 0, e = Math.random();
        t2.exports = function(t3) {
          return "Symbol(".concat(void 0 === t3 ? "" : t3, ")_", (++r + e).toString(36));
        };
      }, function(t2, n2, r) {
        function e(t3) {
          return t3 && t3.__esModule ? t3 : { default: t3 };
        }
        function o() {
          return "win32" !== process.platform ? "" : "ia32" === process.arch && process.env.hasOwnProperty("PROCESSOR_ARCHITEW6432") ? "mixed" : "native";
        }
        function i(t3) {
          return (0, l.createHash)("sha256").update(t3).digest("hex");
        }
        function c(t3) {
          switch (h) {
            case "darwin":
              return t3.split("IOPlatformUUID")[1].split("\n")[0].replace(/\=|\s+|\"/gi, "").toLowerCase();
            case "win32":
              return t3.toString().split("REG_SZ")[1].replace(/\r+|\n+|\s+/gi, "").toLowerCase();
            case "linux":
              return t3.toString().replace(/\r+|\n+|\s+/gi, "").toLowerCase();
            case "freebsd":
              return t3.toString().replace(/\r+|\n+|\s+/gi, "").toLowerCase();
            default:
              throw new Error("Unsupported platform: " + process.platform);
          }
        }
        function u(t3) {
          var n3 = c((0, p.execSync)(y[h]).toString());
          return t3 ? n3 : i(n3);
        }
        function s(t3) {
          return new a.default(function(n3, r2) {
            return (0, p.exec)(y[h], {}, function(e2, o2, u2) {
              if (e2) return r2(new Error("Error while obtaining machine id: " + e2.stack));
              var s2 = c(o2.toString());
              return n3(t3 ? s2 : i(s2));
            });
          });
        }
        Object.defineProperty(n2, "__esModule", { value: true });
        var f = r(35), a = e(f);
        n2.machineIdSync = u, n2.machineId = s;
        var p = r(70), l = r(71), v = process, h = v.platform, d = { native: "%windir%\\System32", mixed: "%windir%\\sysnative\\cmd.exe /c %windir%\\System32" }, y = { darwin: "ioreg -rd1 -c IOPlatformExpertDevice", win32: d[o()] + "\\REG.exe QUERY HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Cryptography /v MachineGuid", linux: "( cat /var/lib/dbus/machine-id /etc/machine-id 2> /dev/null || hostname ) | head -n 1 || :", freebsd: "kenv -q smbios.system.uuid || sysctl -n kern.hostuuid" };
      }, function(t2, n2, r) {
        t2.exports = { default: r(36), __esModule: true };
      }, function(t2, n2, r) {
        r(66), r(68), r(69), r(67), t2.exports = r(6).Promise;
      }, function(t2, n2) {
        t2.exports = function() {
        };
      }, function(t2, n2) {
        t2.exports = function(t3, n3, r, e) {
          if (!(t3 instanceof n3) || void 0 !== e && e in t3) throw TypeError(r + ": incorrect invocation!");
          return t3;
        };
      }, function(t2, n2, r) {
        var e = r(13), o = r(31), i = r(62);
        t2.exports = function(t3) {
          return function(n3, r2, c) {
            var u, s = e(n3), f = o(s.length), a = i(c, f);
            if (t3 && r2 != r2) {
              for (; f > a; ) if (u = s[a++], u != u) return true;
            } else for (; f > a; a++) if ((t3 || a in s) && s[a] === r2) return t3 || a || 0;
            return !t3 && -1;
          };
        };
      }, function(t2, n2, r) {
        var e = r(7), o = r(44), i = r(43), c = r(3), u = r(31), s = r(64), f = {}, a = {}, n2 = t2.exports = function(t3, n3, r2, p, l) {
          var v, h, d, y, _2 = l ? function() {
            return t3;
          } : s(t3), x = e(r2, p, n3 ? 2 : 1), m = 0;
          if ("function" != typeof _2) throw TypeError(t3 + " is not iterable!");
          if (i(_2)) {
            for (v = u(t3.length); v > m; m++) if (y = n3 ? x(c(h = t3[m])[0], h[1]) : x(t3[m]), y === f || y === a) return y;
          } else for (d = _2.call(t3); !(h = d.next()).done; ) if (y = o(d, x, h.value, n3), y === f || y === a) return y;
        };
        n2.BREAK = f, n2.RETURN = a;
      }, function(t2, n2) {
        t2.exports = function(t3, n3, r) {
          var e = void 0 === r;
          switch (n3.length) {
            case 0:
              return e ? t3() : t3.call(r);
            case 1:
              return e ? t3(n3[0]) : t3.call(r, n3[0]);
            case 2:
              return e ? t3(n3[0], n3[1]) : t3.call(r, n3[0], n3[1]);
            case 3:
              return e ? t3(n3[0], n3[1], n3[2]) : t3.call(r, n3[0], n3[1], n3[2]);
            case 4:
              return e ? t3(n3[0], n3[1], n3[2], n3[3]) : t3.call(r, n3[0], n3[1], n3[2], n3[3]);
          }
          return t3.apply(r, n3);
        };
      }, function(t2, n2, r) {
        var e = r(11);
        t2.exports = Object("z").propertyIsEnumerable(0) ? Object : function(t3) {
          return "String" == e(t3) ? t3.split("") : Object(t3);
        };
      }, function(t2, n2, r) {
        var e = r(10), o = r(1)("iterator"), i = Array.prototype;
        t2.exports = function(t3) {
          return void 0 !== t3 && (e.Array === t3 || i[o] === t3);
        };
      }, function(t2, n2, r) {
        var e = r(3);
        t2.exports = function(t3, n3, r2, o) {
          try {
            return o ? n3(e(r2)[0], r2[1]) : n3(r2);
          } catch (n4) {
            var i = t3.return;
            throw void 0 !== i && e(i.call(t3)), n4;
          }
        };
      }, function(t2, n2, r) {
        var e = r(49), o = r(17), i = r(18), c = {};
        r(5)(c, r(1)("iterator"), function() {
          return this;
        }), t2.exports = function(t3, n3, r2) {
          t3.prototype = e(c, { next: o(1, r2) }), i(t3, n3 + " Iterator");
        };
      }, function(t2, n2, r) {
        var e = r(1)("iterator"), o = false;
        try {
          var i = [7][e]();
          i.return = function() {
            o = true;
          }, Array.from(i, function() {
            throw 2;
          });
        } catch (t3) {
        }
        t2.exports = function(t3, n3) {
          if (!n3 && !o) return false;
          var r2 = false;
          try {
            var i2 = [7], c = i2[e]();
            c.next = function() {
              return { done: r2 = true };
            }, i2[e] = function() {
              return c;
            }, t3(i2);
          } catch (t4) {
          }
          return r2;
        };
      }, function(t2, n2) {
        t2.exports = function(t3, n3) {
          return { value: n3, done: !!t3 };
        };
      }, function(t2, n2, r) {
        var e = r(2), o = r(30).set, i = e.MutationObserver || e.WebKitMutationObserver, c = e.process, u = e.Promise, s = "process" == r(11)(c);
        t2.exports = function() {
          var t3, n3, r2, f = function() {
            var e2, o2;
            for (s && (e2 = c.domain) && e2.exit(); t3; ) {
              o2 = t3.fn, t3 = t3.next;
              try {
                o2();
              } catch (e3) {
                throw t3 ? r2() : n3 = void 0, e3;
              }
            }
            n3 = void 0, e2 && e2.enter();
          };
          if (s) r2 = function() {
            c.nextTick(f);
          };
          else if (i) {
            var a = true, p = document.createTextNode("");
            new i(f).observe(p, { characterData: true }), r2 = function() {
              p.data = a = !a;
            };
          } else if (u && u.resolve) {
            var l = u.resolve();
            r2 = function() {
              l.then(f);
            };
          } else r2 = function() {
            o.call(e, f);
          };
          return function(e2) {
            var o2 = { fn: e2, next: void 0 };
            n3 && (n3.next = o2), t3 || (t3 = o2, r2()), n3 = o2;
          };
        };
      }, function(t2, n2, r) {
        var e = r(3), o = r(50), i = r(22), c = r(19)("IE_PROTO"), u = function() {
        }, s = "prototype", f = function() {
          var t3, n3 = r(16)("iframe"), e2 = i.length, o2 = ">";
          for (n3.style.display = "none", r(25).appendChild(n3), n3.src = "javascript:", t3 = n3.contentWindow.document, t3.open(), t3.write("<script>document.F=Object<\/script" + o2), t3.close(), f = t3.F; e2--; ) delete f[s][i[e2]];
          return f();
        };
        t2.exports = Object.create || function(t3, n3) {
          var r2;
          return null !== t3 ? (u[s] = e(t3), r2 = new u(), u[s] = null, r2[c] = t3) : r2 = f(), void 0 === n3 ? r2 : o(r2, n3);
        };
      }, function(t2, n2, r) {
        var e = r(12), o = r(3), i = r(54);
        t2.exports = r(4) ? Object.defineProperties : function(t3, n3) {
          o(t3);
          for (var r2, c = i(n3), u = c.length, s = 0; u > s; ) e.f(t3, r2 = c[s++], n3[r2]);
          return t3;
        };
      }, function(t2, n2, r) {
        var e = r(55), o = r(17), i = r(13), c = r(32), u = r(8), s = r(26), f = Object.getOwnPropertyDescriptor;
        n2.f = r(4) ? f : function(t3, n3) {
          if (t3 = i(t3), n3 = c(n3, true), s) try {
            return f(t3, n3);
          } catch (t4) {
          }
          if (u(t3, n3)) return o(!e.f.call(t3, n3), t3[n3]);
        };
      }, function(t2, n2, r) {
        var e = r(8), o = r(63), i = r(19)("IE_PROTO"), c = Object.prototype;
        t2.exports = Object.getPrototypeOf || function(t3) {
          return t3 = o(t3), e(t3, i) ? t3[i] : "function" == typeof t3.constructor && t3 instanceof t3.constructor ? t3.constructor.prototype : t3 instanceof Object ? c : null;
        };
      }, function(t2, n2, r) {
        var e = r(8), o = r(13), i = r(39)(false), c = r(19)("IE_PROTO");
        t2.exports = function(t3, n3) {
          var r2, u = o(t3), s = 0, f = [];
          for (r2 in u) r2 != c && e(u, r2) && f.push(r2);
          for (; n3.length > s; ) e(u, r2 = n3[s++]) && (~i(f, r2) || f.push(r2));
          return f;
        };
      }, function(t2, n2, r) {
        var e = r(53), o = r(22);
        t2.exports = Object.keys || function(t3) {
          return e(t3, o);
        };
      }, function(t2, n2) {
        n2.f = {}.propertyIsEnumerable;
      }, function(t2, n2, r) {
        var e = r(5);
        t2.exports = function(t3, n3, r2) {
          for (var o in n3) r2 && t3[o] ? t3[o] = n3[o] : e(t3, o, n3[o]);
          return t3;
        };
      }, function(t2, n2, r) {
        t2.exports = r(5);
      }, function(t2, n2, r) {
        var e = r(9), o = r(3), i = function(t3, n3) {
          if (o(t3), !e(n3) && null !== n3) throw TypeError(n3 + ": can't set as prototype!");
        };
        t2.exports = { set: Object.setPrototypeOf || ("__proto__" in {} ? (function(t3, n3, e2) {
          try {
            e2 = r(7)(Function.call, r(51).f(Object.prototype, "__proto__").set, 2), e2(t3, []), n3 = !(t3 instanceof Array);
          } catch (t4) {
            n3 = true;
          }
          return function(t4, r2) {
            return i(t4, r2), n3 ? t4.__proto__ = r2 : e2(t4, r2), t4;
          };
        })({}, false) : void 0), check: i };
      }, function(t2, n2, r) {
        var e = r(2), o = r(6), i = r(12), c = r(4), u = r(1)("species");
        t2.exports = function(t3) {
          var n3 = "function" == typeof o[t3] ? o[t3] : e[t3];
          c && n3 && !n3[u] && i.f(n3, u, { configurable: true, get: function() {
            return this;
          } });
        };
      }, function(t2, n2, r) {
        var e = r(3), o = r(14), i = r(1)("species");
        t2.exports = function(t3, n3) {
          var r2, c = e(t3).constructor;
          return void 0 === c || void 0 == (r2 = e(c)[i]) ? n3 : o(r2);
        };
      }, function(t2, n2, r) {
        var e = r(20), o = r(15);
        t2.exports = function(t3) {
          return function(n3, r2) {
            var i, c, u = String(o(n3)), s = e(r2), f = u.length;
            return s < 0 || s >= f ? t3 ? "" : void 0 : (i = u.charCodeAt(s), i < 55296 || i > 56319 || s + 1 === f || (c = u.charCodeAt(s + 1)) < 56320 || c > 57343 ? t3 ? u.charAt(s) : i : t3 ? u.slice(s, s + 2) : (i - 55296 << 10) + (c - 56320) + 65536);
          };
        };
      }, function(t2, n2, r) {
        var e = r(20), o = Math.max, i = Math.min;
        t2.exports = function(t3, n3) {
          return t3 = e(t3), t3 < 0 ? o(t3 + n3, 0) : i(t3, n3);
        };
      }, function(t2, n2, r) {
        var e = r(15);
        t2.exports = function(t3) {
          return Object(e(t3));
        };
      }, function(t2, n2, r) {
        var e = r(21), o = r(1)("iterator"), i = r(10);
        t2.exports = r(6).getIteratorMethod = function(t3) {
          if (void 0 != t3) return t3[o] || t3["@@iterator"] || i[e(t3)];
        };
      }, function(t2, n2, r) {
        var e = r(37), o = r(47), i = r(10), c = r(13);
        t2.exports = r(27)(Array, "Array", function(t3, n3) {
          this._t = c(t3), this._i = 0, this._k = n3;
        }, function() {
          var t3 = this._t, n3 = this._k, r2 = this._i++;
          return !t3 || r2 >= t3.length ? (this._t = void 0, o(1)) : "keys" == n3 ? o(0, r2) : "values" == n3 ? o(0, t3[r2]) : o(0, [r2, t3[r2]]);
        }, "values"), i.Arguments = i.Array, e("keys"), e("values"), e("entries");
      }, function(t2, n2) {
      }, function(t2, n2, r) {
        var e, o, i, c = r(28), u = r(2), s = r(7), f = r(21), a = r(23), p = r(9), l = (r(3), r(14)), v = r(38), h = r(40), d = (r(58).set, r(60)), y = r(30).set, _2 = r(48)(), x = "Promise", m = u.TypeError, w = u.process, g = u[x], w = u.process, b = "process" == f(w), O = function() {
        }, j = !!(function() {
          try {
            var t3 = g.resolve(1), n3 = (t3.constructor = {})[r(1)("species")] = function(t4) {
              t4(O, O);
            };
            return (b || "function" == typeof PromiseRejectionEvent) && t3.then(O) instanceof n3;
          } catch (t4) {
          }
        })(), S = function(t3, n3) {
          return t3 === n3 || t3 === g && n3 === i;
        }, E = function(t3) {
          var n3;
          return !(!p(t3) || "function" != typeof (n3 = t3.then)) && n3;
        }, P = function(t3) {
          return S(g, t3) ? new M(t3) : new o(t3);
        }, M = o = function(t3) {
          var n3, r2;
          this.promise = new t3(function(t4, e2) {
            if (void 0 !== n3 || void 0 !== r2) throw m("Bad Promise constructor");
            n3 = t4, r2 = e2;
          }), this.resolve = l(n3), this.reject = l(r2);
        }, T = function(t3) {
          try {
            t3();
          } catch (t4) {
            return { error: t4 };
          }
        }, A = function(t3, n3) {
          if (!t3._n) {
            t3._n = true;
            var r2 = t3._c;
            _2(function() {
              for (var e2 = t3._v, o2 = 1 == t3._s, i2 = 0, c2 = function(n4) {
                var r3, i3, c3 = o2 ? n4.ok : n4.fail, u2 = n4.resolve, s2 = n4.reject, f2 = n4.domain;
                try {
                  c3 ? (o2 || (2 == t3._h && I(t3), t3._h = 1), c3 === true ? r3 = e2 : (f2 && f2.enter(), r3 = c3(e2), f2 && f2.exit()), r3 === n4.promise ? s2(m("Promise-chain cycle")) : (i3 = E(r3)) ? i3.call(r3, u2, s2) : u2(r3)) : s2(e2);
                } catch (t4) {
                  s2(t4);
                }
              }; r2.length > i2; ) c2(r2[i2++]);
              t3._c = [], t3._n = false, n3 && !t3._h && k(t3);
            });
          }
        }, k = function(t3) {
          y.call(u, function() {
            var n3, r2, e2, o2 = t3._v;
            if (C(t3) && (n3 = T(function() {
              b ? w.emit("unhandledRejection", o2, t3) : (r2 = u.onunhandledrejection) ? r2({ promise: t3, reason: o2 }) : (e2 = u.console) && e2.error && e2.error("Unhandled promise rejection", o2);
            }), t3._h = b || C(t3) ? 2 : 1), t3._a = void 0, n3) throw n3.error;
          });
        }, C = function(t3) {
          if (1 == t3._h) return false;
          for (var n3, r2 = t3._a || t3._c, e2 = 0; r2.length > e2; ) if (n3 = r2[e2++], n3.fail || !C(n3.promise)) return false;
          return true;
        }, I = function(t3) {
          y.call(u, function() {
            var n3;
            b ? w.emit("rejectionHandled", t3) : (n3 = u.onrejectionhandled) && n3({ promise: t3, reason: t3._v });
          });
        }, R = function(t3) {
          var n3 = this;
          n3._d || (n3._d = true, n3 = n3._w || n3, n3._v = t3, n3._s = 2, n3._a || (n3._a = n3._c.slice()), A(n3, true));
        }, F = function(t3) {
          var n3, r2 = this;
          if (!r2._d) {
            r2._d = true, r2 = r2._w || r2;
            try {
              if (r2 === t3) throw m("Promise can't be resolved itself");
              (n3 = E(t3)) ? _2(function() {
                var e2 = { _w: r2, _d: false };
                try {
                  n3.call(t3, s(F, e2, 1), s(R, e2, 1));
                } catch (t4) {
                  R.call(e2, t4);
                }
              }) : (r2._v = t3, r2._s = 1, A(r2, false));
            } catch (t4) {
              R.call({ _w: r2, _d: false }, t4);
            }
          }
        };
        j || (g = function(t3) {
          v(this, g, x, "_h"), l(t3), e.call(this);
          try {
            t3(s(F, this, 1), s(R, this, 1));
          } catch (t4) {
            R.call(this, t4);
          }
        }, e = function(t3) {
          this._c = [], this._a = void 0, this._s = 0, this._d = false, this._v = void 0, this._h = 0, this._n = false;
        }, e.prototype = r(56)(g.prototype, { then: function(t3, n3) {
          var r2 = P(d(this, g));
          return r2.ok = "function" != typeof t3 || t3, r2.fail = "function" == typeof n3 && n3, r2.domain = b ? w.domain : void 0, this._c.push(r2), this._a && this._a.push(r2), this._s && A(this, false), r2.promise;
        }, catch: function(t3) {
          return this.then(void 0, t3);
        } }), M = function() {
          var t3 = new e();
          this.promise = t3, this.resolve = s(F, t3, 1), this.reject = s(R, t3, 1);
        }), a(a.G + a.W + a.F * !j, { Promise: g }), r(18)(g, x), r(59)(x), i = r(6)[x], a(a.S + a.F * !j, x, { reject: function(t3) {
          var n3 = P(this), r2 = n3.reject;
          return r2(t3), n3.promise;
        } }), a(a.S + a.F * (c || !j), x, { resolve: function(t3) {
          if (t3 instanceof g && S(t3.constructor, this)) return t3;
          var n3 = P(this), r2 = n3.resolve;
          return r2(t3), n3.promise;
        } }), a(a.S + a.F * !(j && r(46)(function(t3) {
          g.all(t3).catch(O);
        })), x, { all: function(t3) {
          var n3 = this, r2 = P(n3), e2 = r2.resolve, o2 = r2.reject, i2 = T(function() {
            var r3 = [], i3 = 0, c2 = 1;
            h(t3, false, function(t4) {
              var u2 = i3++, s2 = false;
              r3.push(void 0), c2++, n3.resolve(t4).then(function(t5) {
                s2 || (s2 = true, r3[u2] = t5, --c2 || e2(r3));
              }, o2);
            }), --c2 || e2(r3);
          });
          return i2 && o2(i2.error), r2.promise;
        }, race: function(t3) {
          var n3 = this, r2 = P(n3), e2 = r2.reject, o2 = T(function() {
            h(t3, false, function(t4) {
              n3.resolve(t4).then(r2.resolve, e2);
            });
          });
          return o2 && e2(o2.error), r2.promise;
        } });
      }, function(t2, n2, r) {
        var e = r(61)(true);
        r(27)(String, "String", function(t3) {
          this._t = String(t3), this._i = 0;
        }, function() {
          var t3, n3 = this._t, r2 = this._i;
          return r2 >= n3.length ? { value: void 0, done: true } : (t3 = e(n3, r2), this._i += t3.length, { value: t3, done: false });
        });
      }, function(t2, n2, r) {
        r(65);
        for (var e = r(2), o = r(5), i = r(10), c = r(1)("toStringTag"), u = ["NodeList", "DOMTokenList", "MediaList", "StyleSheetList", "CSSRuleList"], s = 0; s < 5; s++) {
          var f = u[s], a = e[f], p = a && a.prototype;
          p && !p[c] && o(p, c, f), i[f] = i.Array;
        }
      }, function(t2, n2) {
        t2.exports = require$$0$1;
      }, function(t2, n2) {
        t2.exports = crypto;
      }]);
    });
  })(dist$1);
  return dist$1.exports;
}
requireDist();
var map;
try {
  map = Map;
} catch (_2) {
}
var set;
try {
  set = Set;
} catch (_2) {
}
function baseClone(src, circulars, clones) {
  if (!src || typeof src !== "object" || typeof src === "function") {
    return src;
  }
  if (src.nodeType && "cloneNode" in src) {
    return src.cloneNode(true);
  }
  if (src instanceof Date) {
    return new Date(src.getTime());
  }
  if (src instanceof RegExp) {
    return new RegExp(src);
  }
  if (Array.isArray(src)) {
    return src.map(clone$1);
  }
  if (map && src instanceof map) {
    return new Map(Array.from(src.entries()));
  }
  if (set && src instanceof set) {
    return new Set(Array.from(src.values()));
  }
  if (src instanceof Object) {
    circulars.push(src);
    var obj = Object.create(src);
    clones.push(obj);
    for (var key in src) {
      var idx = circulars.findIndex(function(i) {
        return i === src[key];
      });
      obj[key] = idx > -1 ? clones[idx] : baseClone(src[key], circulars, clones);
    }
    return obj;
  }
  return src;
}
function clone$1(src) {
  return baseClone(src, [], []);
}
const toString$1 = Object.prototype.toString;
const errorToString$1 = Error.prototype.toString;
const regExpToString$1 = RegExp.prototype.toString;
const symbolToString$1 = typeof Symbol !== "undefined" ? Symbol.prototype.toString : () => "";
const SYMBOL_REGEXP$1 = /^Symbol\((.*)\)(.*)$/;
function printNumber$1(val) {
  if (val != +val) return "NaN";
  const isNegativeZero = val === 0 && 1 / val < 0;
  return isNegativeZero ? "-0" : "" + val;
}
function printSimpleValue$1(val, quoteStrings = false) {
  if (val == null || val === true || val === false) return "" + val;
  const typeOf = typeof val;
  if (typeOf === "number") return printNumber$1(val);
  if (typeOf === "string") return quoteStrings ? `"${val}"` : val;
  if (typeOf === "function") return "[Function " + (val.name || "anonymous") + "]";
  if (typeOf === "symbol") return symbolToString$1.call(val).replace(SYMBOL_REGEXP$1, "Symbol($1)");
  const tag = toString$1.call(val).slice(8, -1);
  if (tag === "Date") return isNaN(val.getTime()) ? "" + val : val.toISOString(val);
  if (tag === "Error" || val instanceof Error) return "[" + errorToString$1.call(val) + "]";
  if (tag === "RegExp") return regExpToString$1.call(val);
  return null;
}
function printValue$1(value, quoteStrings) {
  let result = printSimpleValue$1(value, quoteStrings);
  if (result !== null) return result;
  return JSON.stringify(value, function(key, value2) {
    let result2 = printSimpleValue$1(this[key], quoteStrings);
    if (result2 !== null) return result2;
    return value2;
  }, 2);
}
let mixed = {
  default: "${path} is invalid",
  required: "${path} is a required field",
  oneOf: "${path} must be one of the following values: ${values}",
  notOneOf: "${path} must not be one of the following values: ${values}",
  notType: ({
    path,
    type,
    value,
    originalValue
  }) => {
    let isCast = originalValue != null && originalValue !== value;
    let msg = `${path} must be a \`${type}\` type, but the final value was: \`${printValue$1(value, true)}\`` + (isCast ? ` (cast from the value \`${printValue$1(originalValue, true)}\`).` : ".");
    if (value === null) {
      msg += `
 If "null" is intended as an empty value be sure to mark the schema as \`.nullable()\``;
    }
    return msg;
  },
  defined: "${path} must be defined"
};
let string$2 = {
  length: "${path} must be exactly ${length} characters",
  min: "${path} must be at least ${min} characters",
  max: "${path} must be at most ${max} characters",
  matches: '${path} must match the following: "${regex}"',
  email: "${path} must be a valid email",
  url: "${path} must be a valid URL",
  uuid: "${path} must be a valid UUID",
  trim: "${path} must be a trimmed string",
  lowercase: "${path} must be a lowercase string",
  uppercase: "${path} must be a upper case string"
};
let number$2 = {
  min: "${path} must be greater than or equal to ${min}",
  max: "${path} must be less than or equal to ${max}",
  lessThan: "${path} must be less than ${less}",
  moreThan: "${path} must be greater than ${more}",
  positive: "${path} must be a positive number",
  negative: "${path} must be a negative number",
  integer: "${path} must be an integer"
};
let date$2 = {
  min: "${path} field must be later than ${min}",
  max: "${path} field must be at earlier than ${max}"
};
let boolean$2 = {
  isValue: "${path} field must be ${value}"
};
let object$1 = {
  noUnknown: "${path} field has unspecified keys: ${unknown}"
};
let array$1 = {
  min: "${path} field must have at least ${min} items",
  max: "${path} field must have less than or equal to ${max} items",
  length: "${path} must be have ${length} items"
};
const locale = Object.assign(/* @__PURE__ */ Object.create(null), {
  mixed,
  string: string$2,
  number: number$2,
  date: date$2,
  object: object$1,
  array: array$1,
  boolean: boolean$2
});
var _baseHas;
var hasRequired_baseHas;
function require_baseHas() {
  if (hasRequired_baseHas) return _baseHas;
  hasRequired_baseHas = 1;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function baseHas(object2, key) {
    return object2 != null && hasOwnProperty.call(object2, key);
  }
  _baseHas = baseHas;
  return _baseHas;
}
var isArray_1;
var hasRequiredIsArray;
function requireIsArray() {
  if (hasRequiredIsArray) return isArray_1;
  hasRequiredIsArray = 1;
  var isArray = Array.isArray;
  isArray_1 = isArray;
  return isArray_1;
}
var _freeGlobal;
var hasRequired_freeGlobal;
function require_freeGlobal() {
  if (hasRequired_freeGlobal) return _freeGlobal;
  hasRequired_freeGlobal = 1;
  var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
  _freeGlobal = freeGlobal;
  return _freeGlobal;
}
var _root;
var hasRequired_root;
function require_root() {
  if (hasRequired_root) return _root;
  hasRequired_root = 1;
  var freeGlobal = require_freeGlobal();
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  _root = root;
  return _root;
}
var _Symbol;
var hasRequired_Symbol;
function require_Symbol() {
  if (hasRequired_Symbol) return _Symbol;
  hasRequired_Symbol = 1;
  var root = require_root();
  var Symbol2 = root.Symbol;
  _Symbol = Symbol2;
  return _Symbol;
}
var _getRawTag;
var hasRequired_getRawTag;
function require_getRawTag() {
  if (hasRequired_getRawTag) return _getRawTag;
  hasRequired_getRawTag = 1;
  var Symbol2 = require_Symbol();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var nativeObjectToString = objectProto.toString;
  var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
  function getRawTag(value) {
    var isOwn = hasOwnProperty.call(value, symToStringTag), tag = value[symToStringTag];
    try {
      value[symToStringTag] = void 0;
      var unmasked = true;
    } catch (e) {
    }
    var result = nativeObjectToString.call(value);
    if (unmasked) {
      if (isOwn) {
        value[symToStringTag] = tag;
      } else {
        delete value[symToStringTag];
      }
    }
    return result;
  }
  _getRawTag = getRawTag;
  return _getRawTag;
}
var _objectToString;
var hasRequired_objectToString;
function require_objectToString() {
  if (hasRequired_objectToString) return _objectToString;
  hasRequired_objectToString = 1;
  var objectProto = Object.prototype;
  var nativeObjectToString = objectProto.toString;
  function objectToString(value) {
    return nativeObjectToString.call(value);
  }
  _objectToString = objectToString;
  return _objectToString;
}
var _baseGetTag;
var hasRequired_baseGetTag;
function require_baseGetTag() {
  if (hasRequired_baseGetTag) return _baseGetTag;
  hasRequired_baseGetTag = 1;
  var Symbol2 = require_Symbol(), getRawTag = require_getRawTag(), objectToString = require_objectToString();
  var nullTag = "[object Null]", undefinedTag = "[object Undefined]";
  var symToStringTag = Symbol2 ? Symbol2.toStringTag : void 0;
  function baseGetTag(value) {
    if (value == null) {
      return value === void 0 ? undefinedTag : nullTag;
    }
    return symToStringTag && symToStringTag in Object(value) ? getRawTag(value) : objectToString(value);
  }
  _baseGetTag = baseGetTag;
  return _baseGetTag;
}
var isObjectLike_1;
var hasRequiredIsObjectLike;
function requireIsObjectLike() {
  if (hasRequiredIsObjectLike) return isObjectLike_1;
  hasRequiredIsObjectLike = 1;
  function isObjectLike(value) {
    return value != null && typeof value == "object";
  }
  isObjectLike_1 = isObjectLike;
  return isObjectLike_1;
}
var isSymbol_1;
var hasRequiredIsSymbol;
function requireIsSymbol() {
  if (hasRequiredIsSymbol) return isSymbol_1;
  hasRequiredIsSymbol = 1;
  var baseGetTag = require_baseGetTag(), isObjectLike = requireIsObjectLike();
  var symbolTag = "[object Symbol]";
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && baseGetTag(value) == symbolTag;
  }
  isSymbol_1 = isSymbol;
  return isSymbol_1;
}
var _isKey;
var hasRequired_isKey;
function require_isKey() {
  if (hasRequired_isKey) return _isKey;
  hasRequired_isKey = 1;
  var isArray = requireIsArray(), isSymbol = requireIsSymbol();
  var reIsDeepProp = /\.|\[(?:[^[\]]*|(["'])(?:(?!\1)[^\\]|\\.)*?\1)\]/, reIsPlainProp = /^\w*$/;
  function isKey(value, object2) {
    if (isArray(value)) {
      return false;
    }
    var type = typeof value;
    if (type == "number" || type == "symbol" || type == "boolean" || value == null || isSymbol(value)) {
      return true;
    }
    return reIsPlainProp.test(value) || !reIsDeepProp.test(value) || object2 != null && value in Object(object2);
  }
  _isKey = isKey;
  return _isKey;
}
var isObject_1;
var hasRequiredIsObject;
function requireIsObject() {
  if (hasRequiredIsObject) return isObject_1;
  hasRequiredIsObject = 1;
  function isObject2(value) {
    var type = typeof value;
    return value != null && (type == "object" || type == "function");
  }
  isObject_1 = isObject2;
  return isObject_1;
}
var isFunction_1;
var hasRequiredIsFunction;
function requireIsFunction() {
  if (hasRequiredIsFunction) return isFunction_1;
  hasRequiredIsFunction = 1;
  var baseGetTag = require_baseGetTag(), isObject2 = requireIsObject();
  var asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
  function isFunction2(value) {
    if (!isObject2(value)) {
      return false;
    }
    var tag = baseGetTag(value);
    return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
  }
  isFunction_1 = isFunction2;
  return isFunction_1;
}
var _coreJsData;
var hasRequired_coreJsData;
function require_coreJsData() {
  if (hasRequired_coreJsData) return _coreJsData;
  hasRequired_coreJsData = 1;
  var root = require_root();
  var coreJsData = root["__core-js_shared__"];
  _coreJsData = coreJsData;
  return _coreJsData;
}
var _isMasked;
var hasRequired_isMasked;
function require_isMasked() {
  if (hasRequired_isMasked) return _isMasked;
  hasRequired_isMasked = 1;
  var coreJsData = require_coreJsData();
  var maskSrcKey = (function() {
    var uid = /[^.]+$/.exec(coreJsData && coreJsData.keys && coreJsData.keys.IE_PROTO || "");
    return uid ? "Symbol(src)_1." + uid : "";
  })();
  function isMasked(func) {
    return !!maskSrcKey && maskSrcKey in func;
  }
  _isMasked = isMasked;
  return _isMasked;
}
var _toSource;
var hasRequired_toSource;
function require_toSource() {
  if (hasRequired_toSource) return _toSource;
  hasRequired_toSource = 1;
  var funcProto = Function.prototype;
  var funcToString = funcProto.toString;
  function toSource(func) {
    if (func != null) {
      try {
        return funcToString.call(func);
      } catch (e) {
      }
      try {
        return func + "";
      } catch (e) {
      }
    }
    return "";
  }
  _toSource = toSource;
  return _toSource;
}
var _baseIsNative;
var hasRequired_baseIsNative;
function require_baseIsNative() {
  if (hasRequired_baseIsNative) return _baseIsNative;
  hasRequired_baseIsNative = 1;
  var isFunction2 = requireIsFunction(), isMasked = require_isMasked(), isObject2 = requireIsObject(), toSource = require_toSource();
  var reRegExpChar = /[\\^$.*+?()[\]{}|]/g;
  var reIsHostCtor = /^\[object .+?Constructor\]$/;
  var funcProto = Function.prototype, objectProto = Object.prototype;
  var funcToString = funcProto.toString;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var reIsNative = RegExp(
    "^" + funcToString.call(hasOwnProperty).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
  );
  function baseIsNative(value) {
    if (!isObject2(value) || isMasked(value)) {
      return false;
    }
    var pattern = isFunction2(value) ? reIsNative : reIsHostCtor;
    return pattern.test(toSource(value));
  }
  _baseIsNative = baseIsNative;
  return _baseIsNative;
}
var _getValue;
var hasRequired_getValue;
function require_getValue() {
  if (hasRequired_getValue) return _getValue;
  hasRequired_getValue = 1;
  function getValue(object2, key) {
    return object2 == null ? void 0 : object2[key];
  }
  _getValue = getValue;
  return _getValue;
}
var _getNative;
var hasRequired_getNative;
function require_getNative() {
  if (hasRequired_getNative) return _getNative;
  hasRequired_getNative = 1;
  var baseIsNative = require_baseIsNative(), getValue = require_getValue();
  function getNative(object2, key) {
    var value = getValue(object2, key);
    return baseIsNative(value) ? value : void 0;
  }
  _getNative = getNative;
  return _getNative;
}
var _nativeCreate;
var hasRequired_nativeCreate;
function require_nativeCreate() {
  if (hasRequired_nativeCreate) return _nativeCreate;
  hasRequired_nativeCreate = 1;
  var getNative = require_getNative();
  var nativeCreate = getNative(Object, "create");
  _nativeCreate = nativeCreate;
  return _nativeCreate;
}
var _hashClear;
var hasRequired_hashClear;
function require_hashClear() {
  if (hasRequired_hashClear) return _hashClear;
  hasRequired_hashClear = 1;
  var nativeCreate = require_nativeCreate();
  function hashClear() {
    this.__data__ = nativeCreate ? nativeCreate(null) : {};
    this.size = 0;
  }
  _hashClear = hashClear;
  return _hashClear;
}
var _hashDelete;
var hasRequired_hashDelete;
function require_hashDelete() {
  if (hasRequired_hashDelete) return _hashDelete;
  hasRequired_hashDelete = 1;
  function hashDelete(key) {
    var result = this.has(key) && delete this.__data__[key];
    this.size -= result ? 1 : 0;
    return result;
  }
  _hashDelete = hashDelete;
  return _hashDelete;
}
var _hashGet;
var hasRequired_hashGet;
function require_hashGet() {
  if (hasRequired_hashGet) return _hashGet;
  hasRequired_hashGet = 1;
  var nativeCreate = require_nativeCreate();
  var HASH_UNDEFINED = "__lodash_hash_undefined__";
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function hashGet(key) {
    var data = this.__data__;
    if (nativeCreate) {
      var result = data[key];
      return result === HASH_UNDEFINED ? void 0 : result;
    }
    return hasOwnProperty.call(data, key) ? data[key] : void 0;
  }
  _hashGet = hashGet;
  return _hashGet;
}
var _hashHas;
var hasRequired_hashHas;
function require_hashHas() {
  if (hasRequired_hashHas) return _hashHas;
  hasRequired_hashHas = 1;
  var nativeCreate = require_nativeCreate();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function hashHas(key) {
    var data = this.__data__;
    return nativeCreate ? data[key] !== void 0 : hasOwnProperty.call(data, key);
  }
  _hashHas = hashHas;
  return _hashHas;
}
var _hashSet;
var hasRequired_hashSet;
function require_hashSet() {
  if (hasRequired_hashSet) return _hashSet;
  hasRequired_hashSet = 1;
  var nativeCreate = require_nativeCreate();
  var HASH_UNDEFINED = "__lodash_hash_undefined__";
  function hashSet(key, value) {
    var data = this.__data__;
    this.size += this.has(key) ? 0 : 1;
    data[key] = nativeCreate && value === void 0 ? HASH_UNDEFINED : value;
    return this;
  }
  _hashSet = hashSet;
  return _hashSet;
}
var _Hash;
var hasRequired_Hash;
function require_Hash() {
  if (hasRequired_Hash) return _Hash;
  hasRequired_Hash = 1;
  var hashClear = require_hashClear(), hashDelete = require_hashDelete(), hashGet = require_hashGet(), hashHas = require_hashHas(), hashSet = require_hashSet();
  function Hash(entries) {
    var index2 = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index2 < length) {
      var entry = entries[index2];
      this.set(entry[0], entry[1]);
    }
  }
  Hash.prototype.clear = hashClear;
  Hash.prototype["delete"] = hashDelete;
  Hash.prototype.get = hashGet;
  Hash.prototype.has = hashHas;
  Hash.prototype.set = hashSet;
  _Hash = Hash;
  return _Hash;
}
var _listCacheClear;
var hasRequired_listCacheClear;
function require_listCacheClear() {
  if (hasRequired_listCacheClear) return _listCacheClear;
  hasRequired_listCacheClear = 1;
  function listCacheClear() {
    this.__data__ = [];
    this.size = 0;
  }
  _listCacheClear = listCacheClear;
  return _listCacheClear;
}
var eq_1;
var hasRequiredEq;
function requireEq() {
  if (hasRequiredEq) return eq_1;
  hasRequiredEq = 1;
  function eq(value, other) {
    return value === other || value !== value && other !== other;
  }
  eq_1 = eq;
  return eq_1;
}
var _assocIndexOf;
var hasRequired_assocIndexOf;
function require_assocIndexOf() {
  if (hasRequired_assocIndexOf) return _assocIndexOf;
  hasRequired_assocIndexOf = 1;
  var eq = requireEq();
  function assocIndexOf(array2, key) {
    var length = array2.length;
    while (length--) {
      if (eq(array2[length][0], key)) {
        return length;
      }
    }
    return -1;
  }
  _assocIndexOf = assocIndexOf;
  return _assocIndexOf;
}
var _listCacheDelete;
var hasRequired_listCacheDelete;
function require_listCacheDelete() {
  if (hasRequired_listCacheDelete) return _listCacheDelete;
  hasRequired_listCacheDelete = 1;
  var assocIndexOf = require_assocIndexOf();
  var arrayProto = Array.prototype;
  var splice = arrayProto.splice;
  function listCacheDelete(key) {
    var data = this.__data__, index2 = assocIndexOf(data, key);
    if (index2 < 0) {
      return false;
    }
    var lastIndex = data.length - 1;
    if (index2 == lastIndex) {
      data.pop();
    } else {
      splice.call(data, index2, 1);
    }
    --this.size;
    return true;
  }
  _listCacheDelete = listCacheDelete;
  return _listCacheDelete;
}
var _listCacheGet;
var hasRequired_listCacheGet;
function require_listCacheGet() {
  if (hasRequired_listCacheGet) return _listCacheGet;
  hasRequired_listCacheGet = 1;
  var assocIndexOf = require_assocIndexOf();
  function listCacheGet(key) {
    var data = this.__data__, index2 = assocIndexOf(data, key);
    return index2 < 0 ? void 0 : data[index2][1];
  }
  _listCacheGet = listCacheGet;
  return _listCacheGet;
}
var _listCacheHas;
var hasRequired_listCacheHas;
function require_listCacheHas() {
  if (hasRequired_listCacheHas) return _listCacheHas;
  hasRequired_listCacheHas = 1;
  var assocIndexOf = require_assocIndexOf();
  function listCacheHas(key) {
    return assocIndexOf(this.__data__, key) > -1;
  }
  _listCacheHas = listCacheHas;
  return _listCacheHas;
}
var _listCacheSet;
var hasRequired_listCacheSet;
function require_listCacheSet() {
  if (hasRequired_listCacheSet) return _listCacheSet;
  hasRequired_listCacheSet = 1;
  var assocIndexOf = require_assocIndexOf();
  function listCacheSet(key, value) {
    var data = this.__data__, index2 = assocIndexOf(data, key);
    if (index2 < 0) {
      ++this.size;
      data.push([key, value]);
    } else {
      data[index2][1] = value;
    }
    return this;
  }
  _listCacheSet = listCacheSet;
  return _listCacheSet;
}
var _ListCache;
var hasRequired_ListCache;
function require_ListCache() {
  if (hasRequired_ListCache) return _ListCache;
  hasRequired_ListCache = 1;
  var listCacheClear = require_listCacheClear(), listCacheDelete = require_listCacheDelete(), listCacheGet = require_listCacheGet(), listCacheHas = require_listCacheHas(), listCacheSet = require_listCacheSet();
  function ListCache(entries) {
    var index2 = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index2 < length) {
      var entry = entries[index2];
      this.set(entry[0], entry[1]);
    }
  }
  ListCache.prototype.clear = listCacheClear;
  ListCache.prototype["delete"] = listCacheDelete;
  ListCache.prototype.get = listCacheGet;
  ListCache.prototype.has = listCacheHas;
  ListCache.prototype.set = listCacheSet;
  _ListCache = ListCache;
  return _ListCache;
}
var _Map;
var hasRequired_Map;
function require_Map() {
  if (hasRequired_Map) return _Map;
  hasRequired_Map = 1;
  var getNative = require_getNative(), root = require_root();
  var Map2 = getNative(root, "Map");
  _Map = Map2;
  return _Map;
}
var _mapCacheClear;
var hasRequired_mapCacheClear;
function require_mapCacheClear() {
  if (hasRequired_mapCacheClear) return _mapCacheClear;
  hasRequired_mapCacheClear = 1;
  var Hash = require_Hash(), ListCache = require_ListCache(), Map2 = require_Map();
  function mapCacheClear() {
    this.size = 0;
    this.__data__ = {
      "hash": new Hash(),
      "map": new (Map2 || ListCache)(),
      "string": new Hash()
    };
  }
  _mapCacheClear = mapCacheClear;
  return _mapCacheClear;
}
var _isKeyable;
var hasRequired_isKeyable;
function require_isKeyable() {
  if (hasRequired_isKeyable) return _isKeyable;
  hasRequired_isKeyable = 1;
  function isKeyable(value) {
    var type = typeof value;
    return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value !== "__proto__" : value === null;
  }
  _isKeyable = isKeyable;
  return _isKeyable;
}
var _getMapData;
var hasRequired_getMapData;
function require_getMapData() {
  if (hasRequired_getMapData) return _getMapData;
  hasRequired_getMapData = 1;
  var isKeyable = require_isKeyable();
  function getMapData(map2, key) {
    var data = map2.__data__;
    return isKeyable(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
  }
  _getMapData = getMapData;
  return _getMapData;
}
var _mapCacheDelete;
var hasRequired_mapCacheDelete;
function require_mapCacheDelete() {
  if (hasRequired_mapCacheDelete) return _mapCacheDelete;
  hasRequired_mapCacheDelete = 1;
  var getMapData = require_getMapData();
  function mapCacheDelete(key) {
    var result = getMapData(this, key)["delete"](key);
    this.size -= result ? 1 : 0;
    return result;
  }
  _mapCacheDelete = mapCacheDelete;
  return _mapCacheDelete;
}
var _mapCacheGet;
var hasRequired_mapCacheGet;
function require_mapCacheGet() {
  if (hasRequired_mapCacheGet) return _mapCacheGet;
  hasRequired_mapCacheGet = 1;
  var getMapData = require_getMapData();
  function mapCacheGet(key) {
    return getMapData(this, key).get(key);
  }
  _mapCacheGet = mapCacheGet;
  return _mapCacheGet;
}
var _mapCacheHas;
var hasRequired_mapCacheHas;
function require_mapCacheHas() {
  if (hasRequired_mapCacheHas) return _mapCacheHas;
  hasRequired_mapCacheHas = 1;
  var getMapData = require_getMapData();
  function mapCacheHas(key) {
    return getMapData(this, key).has(key);
  }
  _mapCacheHas = mapCacheHas;
  return _mapCacheHas;
}
var _mapCacheSet;
var hasRequired_mapCacheSet;
function require_mapCacheSet() {
  if (hasRequired_mapCacheSet) return _mapCacheSet;
  hasRequired_mapCacheSet = 1;
  var getMapData = require_getMapData();
  function mapCacheSet(key, value) {
    var data = getMapData(this, key), size = data.size;
    data.set(key, value);
    this.size += data.size == size ? 0 : 1;
    return this;
  }
  _mapCacheSet = mapCacheSet;
  return _mapCacheSet;
}
var _MapCache;
var hasRequired_MapCache;
function require_MapCache() {
  if (hasRequired_MapCache) return _MapCache;
  hasRequired_MapCache = 1;
  var mapCacheClear = require_mapCacheClear(), mapCacheDelete = require_mapCacheDelete(), mapCacheGet = require_mapCacheGet(), mapCacheHas = require_mapCacheHas(), mapCacheSet = require_mapCacheSet();
  function MapCache(entries) {
    var index2 = -1, length = entries == null ? 0 : entries.length;
    this.clear();
    while (++index2 < length) {
      var entry = entries[index2];
      this.set(entry[0], entry[1]);
    }
  }
  MapCache.prototype.clear = mapCacheClear;
  MapCache.prototype["delete"] = mapCacheDelete;
  MapCache.prototype.get = mapCacheGet;
  MapCache.prototype.has = mapCacheHas;
  MapCache.prototype.set = mapCacheSet;
  _MapCache = MapCache;
  return _MapCache;
}
var memoize_1;
var hasRequiredMemoize;
function requireMemoize() {
  if (hasRequiredMemoize) return memoize_1;
  hasRequiredMemoize = 1;
  var MapCache = require_MapCache();
  var FUNC_ERROR_TEXT = "Expected a function";
  function memoize(func, resolver) {
    if (typeof func != "function" || resolver != null && typeof resolver != "function") {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    var memoized = function() {
      var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
      if (cache.has(key)) {
        return cache.get(key);
      }
      var result = func.apply(this, args);
      memoized.cache = cache.set(key, result) || cache;
      return result;
    };
    memoized.cache = new (memoize.Cache || MapCache)();
    return memoized;
  }
  memoize.Cache = MapCache;
  memoize_1 = memoize;
  return memoize_1;
}
var _memoizeCapped;
var hasRequired_memoizeCapped;
function require_memoizeCapped() {
  if (hasRequired_memoizeCapped) return _memoizeCapped;
  hasRequired_memoizeCapped = 1;
  var memoize = requireMemoize();
  var MAX_MEMOIZE_SIZE = 500;
  function memoizeCapped(func) {
    var result = memoize(func, function(key) {
      if (cache.size === MAX_MEMOIZE_SIZE) {
        cache.clear();
      }
      return key;
    });
    var cache = result.cache;
    return result;
  }
  _memoizeCapped = memoizeCapped;
  return _memoizeCapped;
}
var _stringToPath;
var hasRequired_stringToPath;
function require_stringToPath() {
  if (hasRequired_stringToPath) return _stringToPath;
  hasRequired_stringToPath = 1;
  var memoizeCapped = require_memoizeCapped();
  var rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g;
  var reEscapeChar = /\\(\\)?/g;
  var stringToPath = memoizeCapped(function(string2) {
    var result = [];
    if (string2.charCodeAt(0) === 46) {
      result.push("");
    }
    string2.replace(rePropName, function(match, number2, quote, subString) {
      result.push(quote ? subString.replace(reEscapeChar, "$1") : number2 || match);
    });
    return result;
  });
  _stringToPath = stringToPath;
  return _stringToPath;
}
var _arrayMap;
var hasRequired_arrayMap;
function require_arrayMap() {
  if (hasRequired_arrayMap) return _arrayMap;
  hasRequired_arrayMap = 1;
  function arrayMap(array2, iteratee) {
    var index2 = -1, length = array2 == null ? 0 : array2.length, result = Array(length);
    while (++index2 < length) {
      result[index2] = iteratee(array2[index2], index2, array2);
    }
    return result;
  }
  _arrayMap = arrayMap;
  return _arrayMap;
}
var _baseToString;
var hasRequired_baseToString;
function require_baseToString() {
  if (hasRequired_baseToString) return _baseToString;
  hasRequired_baseToString = 1;
  var Symbol2 = require_Symbol(), arrayMap = require_arrayMap(), isArray = requireIsArray(), isSymbol = requireIsSymbol();
  var symbolProto = Symbol2 ? Symbol2.prototype : void 0, symbolToString2 = symbolProto ? symbolProto.toString : void 0;
  function baseToString(value) {
    if (typeof value == "string") {
      return value;
    }
    if (isArray(value)) {
      return arrayMap(value, baseToString) + "";
    }
    if (isSymbol(value)) {
      return symbolToString2 ? symbolToString2.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  _baseToString = baseToString;
  return _baseToString;
}
var toString_1;
var hasRequiredToString;
function requireToString() {
  if (hasRequiredToString) return toString_1;
  hasRequiredToString = 1;
  var baseToString = require_baseToString();
  function toString2(value) {
    return value == null ? "" : baseToString(value);
  }
  toString_1 = toString2;
  return toString_1;
}
var _castPath;
var hasRequired_castPath;
function require_castPath() {
  if (hasRequired_castPath) return _castPath;
  hasRequired_castPath = 1;
  var isArray = requireIsArray(), isKey = require_isKey(), stringToPath = require_stringToPath(), toString2 = requireToString();
  function castPath(value, object2) {
    if (isArray(value)) {
      return value;
    }
    return isKey(value, object2) ? [value] : stringToPath(toString2(value));
  }
  _castPath = castPath;
  return _castPath;
}
var _baseIsArguments;
var hasRequired_baseIsArguments;
function require_baseIsArguments() {
  if (hasRequired_baseIsArguments) return _baseIsArguments;
  hasRequired_baseIsArguments = 1;
  var baseGetTag = require_baseGetTag(), isObjectLike = requireIsObjectLike();
  var argsTag = "[object Arguments]";
  function baseIsArguments(value) {
    return isObjectLike(value) && baseGetTag(value) == argsTag;
  }
  _baseIsArguments = baseIsArguments;
  return _baseIsArguments;
}
var isArguments_1;
var hasRequiredIsArguments;
function requireIsArguments() {
  if (hasRequiredIsArguments) return isArguments_1;
  hasRequiredIsArguments = 1;
  var baseIsArguments = require_baseIsArguments(), isObjectLike = requireIsObjectLike();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  var isArguments = baseIsArguments(/* @__PURE__ */ (function() {
    return arguments;
  })()) ? baseIsArguments : function(value) {
    return isObjectLike(value) && hasOwnProperty.call(value, "callee") && !propertyIsEnumerable.call(value, "callee");
  };
  isArguments_1 = isArguments;
  return isArguments_1;
}
var _isIndex;
var hasRequired_isIndex;
function require_isIndex() {
  if (hasRequired_isIndex) return _isIndex;
  hasRequired_isIndex = 1;
  var MAX_SAFE_INTEGER = 9007199254740991;
  var reIsUint = /^(?:0|[1-9]\d*)$/;
  function isIndex(value, length) {
    var type = typeof value;
    length = length == null ? MAX_SAFE_INTEGER : length;
    return !!length && (type == "number" || type != "symbol" && reIsUint.test(value)) && (value > -1 && value % 1 == 0 && value < length);
  }
  _isIndex = isIndex;
  return _isIndex;
}
var isLength_1;
var hasRequiredIsLength;
function requireIsLength() {
  if (hasRequiredIsLength) return isLength_1;
  hasRequiredIsLength = 1;
  var MAX_SAFE_INTEGER = 9007199254740991;
  function isLength(value) {
    return typeof value == "number" && value > -1 && value % 1 == 0 && value <= MAX_SAFE_INTEGER;
  }
  isLength_1 = isLength;
  return isLength_1;
}
var _toKey;
var hasRequired_toKey;
function require_toKey() {
  if (hasRequired_toKey) return _toKey;
  hasRequired_toKey = 1;
  var isSymbol = requireIsSymbol();
  function toKey(value) {
    if (typeof value == "string" || isSymbol(value)) {
      return value;
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  _toKey = toKey;
  return _toKey;
}
var _hasPath;
var hasRequired_hasPath;
function require_hasPath() {
  if (hasRequired_hasPath) return _hasPath;
  hasRequired_hasPath = 1;
  var castPath = require_castPath(), isArguments = requireIsArguments(), isArray = requireIsArray(), isIndex = require_isIndex(), isLength = requireIsLength(), toKey = require_toKey();
  function hasPath(object2, path, hasFunc) {
    path = castPath(path, object2);
    var index2 = -1, length = path.length, result = false;
    while (++index2 < length) {
      var key = toKey(path[index2]);
      if (!(result = object2 != null && hasFunc(object2, key))) {
        break;
      }
      object2 = object2[key];
    }
    if (result || ++index2 != length) {
      return result;
    }
    length = object2 == null ? 0 : object2.length;
    return !!length && isLength(length) && isIndex(key, length) && (isArray(object2) || isArguments(object2));
  }
  _hasPath = hasPath;
  return _hasPath;
}
var has_1;
var hasRequiredHas;
function requireHas() {
  if (hasRequiredHas) return has_1;
  hasRequiredHas = 1;
  var baseHas = require_baseHas(), hasPath = require_hasPath();
  function has2(object2, path) {
    return object2 != null && hasPath(object2, path, baseHas);
  }
  has_1 = has2;
  return has_1;
}
var hasExports = requireHas();
const has = /* @__PURE__ */ getDefaultExportFromCjs(hasExports);
const isSchema = ((obj) => obj && obj.__isYupSchema__);
class Condition {
  constructor(refs, options2) {
    this.refs = refs;
    this.refs = refs;
    if (typeof options2 === "function") {
      this.fn = options2;
      return;
    }
    if (!has(options2, "is")) throw new TypeError("`is:` is required for `when()` conditions");
    if (!options2.then && !options2.otherwise) throw new TypeError("either `then:` or `otherwise:` is required for `when()` conditions");
    let {
      is,
      then,
      otherwise
    } = options2;
    let check = typeof is === "function" ? is : (...values) => values.every((value) => value === is);
    this.fn = function(...args) {
      let options3 = args.pop();
      let schema = args.pop();
      let branch = check(...args) ? then : otherwise;
      if (!branch) return void 0;
      if (typeof branch === "function") return branch(schema);
      return schema.concat(branch.resolve(options3));
    };
  }
  resolve(base, options2) {
    let values = this.refs.map((ref) => ref.getValue(options2 == null ? void 0 : options2.value, options2 == null ? void 0 : options2.parent, options2 == null ? void 0 : options2.context));
    let schema = this.fn.apply(base, values.concat(base, options2));
    if (schema === void 0 || schema === base) return base;
    if (!isSchema(schema)) throw new TypeError("conditions must return a schema object");
    return schema.resolve(options2);
  }
}
function toArray(value) {
  return value == null ? [] : [].concat(value);
}
function _extends$4() {
  _extends$4 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$4.apply(this, arguments);
}
let strReg = /\$\{\s*(\w+)\s*\}/g;
let ValidationError$1 = class ValidationError extends Error {
  static formatError(message, params) {
    const path = params.label || params.path || "this";
    if (path !== params.path) params = _extends$4({}, params, {
      path
    });
    if (typeof message === "string") return message.replace(strReg, (_2, key) => printValue$1(params[key]));
    if (typeof message === "function") return message(params);
    return message;
  }
  static isError(err) {
    return err && err.name === "ValidationError";
  }
  constructor(errorOrErrors, value, field, type) {
    super();
    this.name = "ValidationError";
    this.value = value;
    this.path = field;
    this.type = type;
    this.errors = [];
    this.inner = [];
    toArray(errorOrErrors).forEach((err) => {
      if (ValidationError.isError(err)) {
        this.errors.push(...err.errors);
        this.inner = this.inner.concat(err.inner.length ? err.inner : err);
      } else {
        this.errors.push(err);
      }
    });
    this.message = this.errors.length > 1 ? `${this.errors.length} errors occurred` : this.errors[0];
    if (Error.captureStackTrace) Error.captureStackTrace(this, ValidationError);
  }
};
const once = (cb) => {
  let fired = false;
  return (...args) => {
    if (fired) return;
    fired = true;
    cb(...args);
  };
};
function runTests(options2, cb) {
  let {
    endEarly,
    tests,
    args,
    value,
    errors,
    sort: sort2,
    path
  } = options2;
  let callback = once(cb);
  let count = tests.length;
  const nestedErrors = [];
  errors = errors ? errors : [];
  if (!count) return errors.length ? callback(new ValidationError$1(errors, value, path)) : callback(null, value);
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    test(args, function finishTestRun(err) {
      if (err) {
        if (!ValidationError$1.isError(err)) {
          return callback(err, value);
        }
        if (endEarly) {
          err.value = value;
          return callback(err, value);
        }
        nestedErrors.push(err);
      }
      if (--count <= 0) {
        if (nestedErrors.length) {
          if (sort2) nestedErrors.sort(sort2);
          if (errors.length) nestedErrors.push(...errors);
          errors = nestedErrors;
        }
        if (errors.length) {
          callback(new ValidationError$1(errors, value, path), value);
          return;
        }
        callback(null, value);
      }
    });
  }
}
var _defineProperty;
var hasRequired_defineProperty;
function require_defineProperty() {
  if (hasRequired_defineProperty) return _defineProperty;
  hasRequired_defineProperty = 1;
  var getNative = require_getNative();
  var defineProperty = (function() {
    try {
      var func = getNative(Object, "defineProperty");
      func({}, "", {});
      return func;
    } catch (e) {
    }
  })();
  _defineProperty = defineProperty;
  return _defineProperty;
}
var _baseAssignValue;
var hasRequired_baseAssignValue;
function require_baseAssignValue() {
  if (hasRequired_baseAssignValue) return _baseAssignValue;
  hasRequired_baseAssignValue = 1;
  var defineProperty = require_defineProperty();
  function baseAssignValue(object2, key, value) {
    if (key == "__proto__" && defineProperty) {
      defineProperty(object2, key, {
        "configurable": true,
        "enumerable": true,
        "value": value,
        "writable": true
      });
    } else {
      object2[key] = value;
    }
  }
  _baseAssignValue = baseAssignValue;
  return _baseAssignValue;
}
var _createBaseFor;
var hasRequired_createBaseFor;
function require_createBaseFor() {
  if (hasRequired_createBaseFor) return _createBaseFor;
  hasRequired_createBaseFor = 1;
  function createBaseFor(fromRight) {
    return function(object2, iteratee, keysFunc) {
      var index2 = -1, iterable = Object(object2), props = keysFunc(object2), length = props.length;
      while (length--) {
        var key = props[fromRight ? length : ++index2];
        if (iteratee(iterable[key], key, iterable) === false) {
          break;
        }
      }
      return object2;
    };
  }
  _createBaseFor = createBaseFor;
  return _createBaseFor;
}
var _baseFor;
var hasRequired_baseFor;
function require_baseFor() {
  if (hasRequired_baseFor) return _baseFor;
  hasRequired_baseFor = 1;
  var createBaseFor = require_createBaseFor();
  var baseFor = createBaseFor();
  _baseFor = baseFor;
  return _baseFor;
}
var _baseTimes;
var hasRequired_baseTimes;
function require_baseTimes() {
  if (hasRequired_baseTimes) return _baseTimes;
  hasRequired_baseTimes = 1;
  function baseTimes(n, iteratee) {
    var index2 = -1, result = Array(n);
    while (++index2 < n) {
      result[index2] = iteratee(index2);
    }
    return result;
  }
  _baseTimes = baseTimes;
  return _baseTimes;
}
var isBuffer = { exports: {} };
var stubFalse_1;
var hasRequiredStubFalse;
function requireStubFalse() {
  if (hasRequiredStubFalse) return stubFalse_1;
  hasRequiredStubFalse = 1;
  function stubFalse() {
    return false;
  }
  stubFalse_1 = stubFalse;
  return stubFalse_1;
}
isBuffer.exports;
var hasRequiredIsBuffer;
function requireIsBuffer() {
  if (hasRequiredIsBuffer) return isBuffer.exports;
  hasRequiredIsBuffer = 1;
  (function(module, exports) {
    var root = require_root(), stubFalse = requireStubFalse();
    var freeExports = exports && !exports.nodeType && exports;
    var freeModule = freeExports && true && module && !module.nodeType && module;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var Buffer2 = moduleExports ? root.Buffer : void 0;
    var nativeIsBuffer = Buffer2 ? Buffer2.isBuffer : void 0;
    var isBuffer2 = nativeIsBuffer || stubFalse;
    module.exports = isBuffer2;
  })(isBuffer, isBuffer.exports);
  return isBuffer.exports;
}
var _baseIsTypedArray;
var hasRequired_baseIsTypedArray;
function require_baseIsTypedArray() {
  if (hasRequired_baseIsTypedArray) return _baseIsTypedArray;
  hasRequired_baseIsTypedArray = 1;
  var baseGetTag = require_baseGetTag(), isLength = requireIsLength(), isObjectLike = requireIsObjectLike();
  var argsTag = "[object Arguments]", arrayTag = "[object Array]", boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", funcTag = "[object Function]", mapTag = "[object Map]", numberTag = "[object Number]", objectTag = "[object Object]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", weakMapTag = "[object WeakMap]";
  var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]", float32Tag = "[object Float32Array]", float64Tag = "[object Float64Array]", int8Tag = "[object Int8Array]", int16Tag = "[object Int16Array]", int32Tag = "[object Int32Array]", uint8Tag = "[object Uint8Array]", uint8ClampedTag = "[object Uint8ClampedArray]", uint16Tag = "[object Uint16Array]", uint32Tag = "[object Uint32Array]";
  var typedArrayTags = {};
  typedArrayTags[float32Tag] = typedArrayTags[float64Tag] = typedArrayTags[int8Tag] = typedArrayTags[int16Tag] = typedArrayTags[int32Tag] = typedArrayTags[uint8Tag] = typedArrayTags[uint8ClampedTag] = typedArrayTags[uint16Tag] = typedArrayTags[uint32Tag] = true;
  typedArrayTags[argsTag] = typedArrayTags[arrayTag] = typedArrayTags[arrayBufferTag] = typedArrayTags[boolTag] = typedArrayTags[dataViewTag] = typedArrayTags[dateTag] = typedArrayTags[errorTag] = typedArrayTags[funcTag] = typedArrayTags[mapTag] = typedArrayTags[numberTag] = typedArrayTags[objectTag] = typedArrayTags[regexpTag] = typedArrayTags[setTag] = typedArrayTags[stringTag] = typedArrayTags[weakMapTag] = false;
  function baseIsTypedArray(value) {
    return isObjectLike(value) && isLength(value.length) && !!typedArrayTags[baseGetTag(value)];
  }
  _baseIsTypedArray = baseIsTypedArray;
  return _baseIsTypedArray;
}
var _baseUnary;
var hasRequired_baseUnary;
function require_baseUnary() {
  if (hasRequired_baseUnary) return _baseUnary;
  hasRequired_baseUnary = 1;
  function baseUnary(func) {
    return function(value) {
      return func(value);
    };
  }
  _baseUnary = baseUnary;
  return _baseUnary;
}
var _nodeUtil = { exports: {} };
_nodeUtil.exports;
var hasRequired_nodeUtil;
function require_nodeUtil() {
  if (hasRequired_nodeUtil) return _nodeUtil.exports;
  hasRequired_nodeUtil = 1;
  (function(module, exports) {
    var freeGlobal = require_freeGlobal();
    var freeExports = exports && !exports.nodeType && exports;
    var freeModule = freeExports && true && module && !module.nodeType && module;
    var moduleExports = freeModule && freeModule.exports === freeExports;
    var freeProcess = moduleExports && freeGlobal.process;
    var nodeUtil = (function() {
      try {
        var types = freeModule && freeModule.require && freeModule.require("util").types;
        if (types) {
          return types;
        }
        return freeProcess && freeProcess.binding && freeProcess.binding("util");
      } catch (e) {
      }
    })();
    module.exports = nodeUtil;
  })(_nodeUtil, _nodeUtil.exports);
  return _nodeUtil.exports;
}
var isTypedArray_1;
var hasRequiredIsTypedArray;
function requireIsTypedArray() {
  if (hasRequiredIsTypedArray) return isTypedArray_1;
  hasRequiredIsTypedArray = 1;
  var baseIsTypedArray = require_baseIsTypedArray(), baseUnary = require_baseUnary(), nodeUtil = require_nodeUtil();
  var nodeIsTypedArray = nodeUtil && nodeUtil.isTypedArray;
  var isTypedArray = nodeIsTypedArray ? baseUnary(nodeIsTypedArray) : baseIsTypedArray;
  isTypedArray_1 = isTypedArray;
  return isTypedArray_1;
}
var _arrayLikeKeys;
var hasRequired_arrayLikeKeys;
function require_arrayLikeKeys() {
  if (hasRequired_arrayLikeKeys) return _arrayLikeKeys;
  hasRequired_arrayLikeKeys = 1;
  var baseTimes = require_baseTimes(), isArguments = requireIsArguments(), isArray = requireIsArray(), isBuffer2 = requireIsBuffer(), isIndex = require_isIndex(), isTypedArray = requireIsTypedArray();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function arrayLikeKeys(value, inherited) {
    var isArr = isArray(value), isArg = !isArr && isArguments(value), isBuff = !isArr && !isArg && isBuffer2(value), isType = !isArr && !isArg && !isBuff && isTypedArray(value), skipIndexes = isArr || isArg || isBuff || isType, result = skipIndexes ? baseTimes(value.length, String) : [], length = result.length;
    for (var key in value) {
      if ((inherited || hasOwnProperty.call(value, key)) && !(skipIndexes && // Safari 9 has enumerable `arguments.length` in strict mode.
      (key == "length" || // Node.js 0.10 has enumerable non-index properties on buffers.
      isBuff && (key == "offset" || key == "parent") || // PhantomJS 2 has enumerable non-index properties on typed arrays.
      isType && (key == "buffer" || key == "byteLength" || key == "byteOffset") || // Skip index properties.
      isIndex(key, length)))) {
        result.push(key);
      }
    }
    return result;
  }
  _arrayLikeKeys = arrayLikeKeys;
  return _arrayLikeKeys;
}
var _isPrototype;
var hasRequired_isPrototype;
function require_isPrototype() {
  if (hasRequired_isPrototype) return _isPrototype;
  hasRequired_isPrototype = 1;
  var objectProto = Object.prototype;
  function isPrototype(value) {
    var Ctor = value && value.constructor, proto = typeof Ctor == "function" && Ctor.prototype || objectProto;
    return value === proto;
  }
  _isPrototype = isPrototype;
  return _isPrototype;
}
var _overArg;
var hasRequired_overArg;
function require_overArg() {
  if (hasRequired_overArg) return _overArg;
  hasRequired_overArg = 1;
  function overArg(func, transform2) {
    return function(arg) {
      return func(transform2(arg));
    };
  }
  _overArg = overArg;
  return _overArg;
}
var _nativeKeys;
var hasRequired_nativeKeys;
function require_nativeKeys() {
  if (hasRequired_nativeKeys) return _nativeKeys;
  hasRequired_nativeKeys = 1;
  var overArg = require_overArg();
  var nativeKeys = overArg(Object.keys, Object);
  _nativeKeys = nativeKeys;
  return _nativeKeys;
}
var _baseKeys;
var hasRequired_baseKeys;
function require_baseKeys() {
  if (hasRequired_baseKeys) return _baseKeys;
  hasRequired_baseKeys = 1;
  var isPrototype = require_isPrototype(), nativeKeys = require_nativeKeys();
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function baseKeys(object2) {
    if (!isPrototype(object2)) {
      return nativeKeys(object2);
    }
    var result = [];
    for (var key in Object(object2)) {
      if (hasOwnProperty.call(object2, key) && key != "constructor") {
        result.push(key);
      }
    }
    return result;
  }
  _baseKeys = baseKeys;
  return _baseKeys;
}
var isArrayLike_1;
var hasRequiredIsArrayLike;
function requireIsArrayLike() {
  if (hasRequiredIsArrayLike) return isArrayLike_1;
  hasRequiredIsArrayLike = 1;
  var isFunction2 = requireIsFunction(), isLength = requireIsLength();
  function isArrayLike(value) {
    return value != null && isLength(value.length) && !isFunction2(value);
  }
  isArrayLike_1 = isArrayLike;
  return isArrayLike_1;
}
var keys_1;
var hasRequiredKeys;
function requireKeys() {
  if (hasRequiredKeys) return keys_1;
  hasRequiredKeys = 1;
  var arrayLikeKeys = require_arrayLikeKeys(), baseKeys = require_baseKeys(), isArrayLike = requireIsArrayLike();
  function keys(object2) {
    return isArrayLike(object2) ? arrayLikeKeys(object2) : baseKeys(object2);
  }
  keys_1 = keys;
  return keys_1;
}
var _baseForOwn;
var hasRequired_baseForOwn;
function require_baseForOwn() {
  if (hasRequired_baseForOwn) return _baseForOwn;
  hasRequired_baseForOwn = 1;
  var baseFor = require_baseFor(), keys = requireKeys();
  function baseForOwn(object2, iteratee) {
    return object2 && baseFor(object2, iteratee, keys);
  }
  _baseForOwn = baseForOwn;
  return _baseForOwn;
}
var _stackClear;
var hasRequired_stackClear;
function require_stackClear() {
  if (hasRequired_stackClear) return _stackClear;
  hasRequired_stackClear = 1;
  var ListCache = require_ListCache();
  function stackClear() {
    this.__data__ = new ListCache();
    this.size = 0;
  }
  _stackClear = stackClear;
  return _stackClear;
}
var _stackDelete;
var hasRequired_stackDelete;
function require_stackDelete() {
  if (hasRequired_stackDelete) return _stackDelete;
  hasRequired_stackDelete = 1;
  function stackDelete(key) {
    var data = this.__data__, result = data["delete"](key);
    this.size = data.size;
    return result;
  }
  _stackDelete = stackDelete;
  return _stackDelete;
}
var _stackGet;
var hasRequired_stackGet;
function require_stackGet() {
  if (hasRequired_stackGet) return _stackGet;
  hasRequired_stackGet = 1;
  function stackGet(key) {
    return this.__data__.get(key);
  }
  _stackGet = stackGet;
  return _stackGet;
}
var _stackHas;
var hasRequired_stackHas;
function require_stackHas() {
  if (hasRequired_stackHas) return _stackHas;
  hasRequired_stackHas = 1;
  function stackHas(key) {
    return this.__data__.has(key);
  }
  _stackHas = stackHas;
  return _stackHas;
}
var _stackSet;
var hasRequired_stackSet;
function require_stackSet() {
  if (hasRequired_stackSet) return _stackSet;
  hasRequired_stackSet = 1;
  var ListCache = require_ListCache(), Map2 = require_Map(), MapCache = require_MapCache();
  var LARGE_ARRAY_SIZE = 200;
  function stackSet(key, value) {
    var data = this.__data__;
    if (data instanceof ListCache) {
      var pairs = data.__data__;
      if (!Map2 || pairs.length < LARGE_ARRAY_SIZE - 1) {
        pairs.push([key, value]);
        this.size = ++data.size;
        return this;
      }
      data = this.__data__ = new MapCache(pairs);
    }
    data.set(key, value);
    this.size = data.size;
    return this;
  }
  _stackSet = stackSet;
  return _stackSet;
}
var _Stack;
var hasRequired_Stack;
function require_Stack() {
  if (hasRequired_Stack) return _Stack;
  hasRequired_Stack = 1;
  var ListCache = require_ListCache(), stackClear = require_stackClear(), stackDelete = require_stackDelete(), stackGet = require_stackGet(), stackHas = require_stackHas(), stackSet = require_stackSet();
  function Stack(entries) {
    var data = this.__data__ = new ListCache(entries);
    this.size = data.size;
  }
  Stack.prototype.clear = stackClear;
  Stack.prototype["delete"] = stackDelete;
  Stack.prototype.get = stackGet;
  Stack.prototype.has = stackHas;
  Stack.prototype.set = stackSet;
  _Stack = Stack;
  return _Stack;
}
var _setCacheAdd;
var hasRequired_setCacheAdd;
function require_setCacheAdd() {
  if (hasRequired_setCacheAdd) return _setCacheAdd;
  hasRequired_setCacheAdd = 1;
  var HASH_UNDEFINED = "__lodash_hash_undefined__";
  function setCacheAdd(value) {
    this.__data__.set(value, HASH_UNDEFINED);
    return this;
  }
  _setCacheAdd = setCacheAdd;
  return _setCacheAdd;
}
var _setCacheHas;
var hasRequired_setCacheHas;
function require_setCacheHas() {
  if (hasRequired_setCacheHas) return _setCacheHas;
  hasRequired_setCacheHas = 1;
  function setCacheHas(value) {
    return this.__data__.has(value);
  }
  _setCacheHas = setCacheHas;
  return _setCacheHas;
}
var _SetCache;
var hasRequired_SetCache;
function require_SetCache() {
  if (hasRequired_SetCache) return _SetCache;
  hasRequired_SetCache = 1;
  var MapCache = require_MapCache(), setCacheAdd = require_setCacheAdd(), setCacheHas = require_setCacheHas();
  function SetCache(values) {
    var index2 = -1, length = values == null ? 0 : values.length;
    this.__data__ = new MapCache();
    while (++index2 < length) {
      this.add(values[index2]);
    }
  }
  SetCache.prototype.add = SetCache.prototype.push = setCacheAdd;
  SetCache.prototype.has = setCacheHas;
  _SetCache = SetCache;
  return _SetCache;
}
var _arraySome;
var hasRequired_arraySome;
function require_arraySome() {
  if (hasRequired_arraySome) return _arraySome;
  hasRequired_arraySome = 1;
  function arraySome(array2, predicate) {
    var index2 = -1, length = array2 == null ? 0 : array2.length;
    while (++index2 < length) {
      if (predicate(array2[index2], index2, array2)) {
        return true;
      }
    }
    return false;
  }
  _arraySome = arraySome;
  return _arraySome;
}
var _cacheHas;
var hasRequired_cacheHas;
function require_cacheHas() {
  if (hasRequired_cacheHas) return _cacheHas;
  hasRequired_cacheHas = 1;
  function cacheHas(cache, key) {
    return cache.has(key);
  }
  _cacheHas = cacheHas;
  return _cacheHas;
}
var _equalArrays;
var hasRequired_equalArrays;
function require_equalArrays() {
  if (hasRequired_equalArrays) return _equalArrays;
  hasRequired_equalArrays = 1;
  var SetCache = require_SetCache(), arraySome = require_arraySome(), cacheHas = require_cacheHas();
  var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
  function equalArrays(array2, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG, arrLength = array2.length, othLength = other.length;
    if (arrLength != othLength && !(isPartial && othLength > arrLength)) {
      return false;
    }
    var arrStacked = stack.get(array2);
    var othStacked = stack.get(other);
    if (arrStacked && othStacked) {
      return arrStacked == other && othStacked == array2;
    }
    var index2 = -1, result = true, seen = bitmask & COMPARE_UNORDERED_FLAG ? new SetCache() : void 0;
    stack.set(array2, other);
    stack.set(other, array2);
    while (++index2 < arrLength) {
      var arrValue = array2[index2], othValue = other[index2];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, arrValue, index2, other, array2, stack) : customizer(arrValue, othValue, index2, array2, other, stack);
      }
      if (compared !== void 0) {
        if (compared) {
          continue;
        }
        result = false;
        break;
      }
      if (seen) {
        if (!arraySome(other, function(othValue2, othIndex) {
          if (!cacheHas(seen, othIndex) && (arrValue === othValue2 || equalFunc(arrValue, othValue2, bitmask, customizer, stack))) {
            return seen.push(othIndex);
          }
        })) {
          result = false;
          break;
        }
      } else if (!(arrValue === othValue || equalFunc(arrValue, othValue, bitmask, customizer, stack))) {
        result = false;
        break;
      }
    }
    stack["delete"](array2);
    stack["delete"](other);
    return result;
  }
  _equalArrays = equalArrays;
  return _equalArrays;
}
var _Uint8Array;
var hasRequired_Uint8Array;
function require_Uint8Array() {
  if (hasRequired_Uint8Array) return _Uint8Array;
  hasRequired_Uint8Array = 1;
  var root = require_root();
  var Uint8Array = root.Uint8Array;
  _Uint8Array = Uint8Array;
  return _Uint8Array;
}
var _mapToArray;
var hasRequired_mapToArray;
function require_mapToArray() {
  if (hasRequired_mapToArray) return _mapToArray;
  hasRequired_mapToArray = 1;
  function mapToArray(map2) {
    var index2 = -1, result = Array(map2.size);
    map2.forEach(function(value, key) {
      result[++index2] = [key, value];
    });
    return result;
  }
  _mapToArray = mapToArray;
  return _mapToArray;
}
var _setToArray;
var hasRequired_setToArray;
function require_setToArray() {
  if (hasRequired_setToArray) return _setToArray;
  hasRequired_setToArray = 1;
  function setToArray(set2) {
    var index2 = -1, result = Array(set2.size);
    set2.forEach(function(value) {
      result[++index2] = value;
    });
    return result;
  }
  _setToArray = setToArray;
  return _setToArray;
}
var _equalByTag;
var hasRequired_equalByTag;
function require_equalByTag() {
  if (hasRequired_equalByTag) return _equalByTag;
  hasRequired_equalByTag = 1;
  var Symbol2 = require_Symbol(), Uint8Array = require_Uint8Array(), eq = requireEq(), equalArrays = require_equalArrays(), mapToArray = require_mapToArray(), setToArray = require_setToArray();
  var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
  var boolTag = "[object Boolean]", dateTag = "[object Date]", errorTag = "[object Error]", mapTag = "[object Map]", numberTag = "[object Number]", regexpTag = "[object RegExp]", setTag = "[object Set]", stringTag = "[object String]", symbolTag = "[object Symbol]";
  var arrayBufferTag = "[object ArrayBuffer]", dataViewTag = "[object DataView]";
  var symbolProto = Symbol2 ? Symbol2.prototype : void 0, symbolValueOf = symbolProto ? symbolProto.valueOf : void 0;
  function equalByTag(object2, other, tag, bitmask, customizer, equalFunc, stack) {
    switch (tag) {
      case dataViewTag:
        if (object2.byteLength != other.byteLength || object2.byteOffset != other.byteOffset) {
          return false;
        }
        object2 = object2.buffer;
        other = other.buffer;
      case arrayBufferTag:
        if (object2.byteLength != other.byteLength || !equalFunc(new Uint8Array(object2), new Uint8Array(other))) {
          return false;
        }
        return true;
      case boolTag:
      case dateTag:
      case numberTag:
        return eq(+object2, +other);
      case errorTag:
        return object2.name == other.name && object2.message == other.message;
      case regexpTag:
      case stringTag:
        return object2 == other + "";
      case mapTag:
        var convert = mapToArray;
      case setTag:
        var isPartial = bitmask & COMPARE_PARTIAL_FLAG;
        convert || (convert = setToArray);
        if (object2.size != other.size && !isPartial) {
          return false;
        }
        var stacked = stack.get(object2);
        if (stacked) {
          return stacked == other;
        }
        bitmask |= COMPARE_UNORDERED_FLAG;
        stack.set(object2, other);
        var result = equalArrays(convert(object2), convert(other), bitmask, customizer, equalFunc, stack);
        stack["delete"](object2);
        return result;
      case symbolTag:
        if (symbolValueOf) {
          return symbolValueOf.call(object2) == symbolValueOf.call(other);
        }
    }
    return false;
  }
  _equalByTag = equalByTag;
  return _equalByTag;
}
var _arrayPush;
var hasRequired_arrayPush;
function require_arrayPush() {
  if (hasRequired_arrayPush) return _arrayPush;
  hasRequired_arrayPush = 1;
  function arrayPush(array2, values) {
    var index2 = -1, length = values.length, offset = array2.length;
    while (++index2 < length) {
      array2[offset + index2] = values[index2];
    }
    return array2;
  }
  _arrayPush = arrayPush;
  return _arrayPush;
}
var _baseGetAllKeys;
var hasRequired_baseGetAllKeys;
function require_baseGetAllKeys() {
  if (hasRequired_baseGetAllKeys) return _baseGetAllKeys;
  hasRequired_baseGetAllKeys = 1;
  var arrayPush = require_arrayPush(), isArray = requireIsArray();
  function baseGetAllKeys(object2, keysFunc, symbolsFunc) {
    var result = keysFunc(object2);
    return isArray(object2) ? result : arrayPush(result, symbolsFunc(object2));
  }
  _baseGetAllKeys = baseGetAllKeys;
  return _baseGetAllKeys;
}
var _arrayFilter;
var hasRequired_arrayFilter;
function require_arrayFilter() {
  if (hasRequired_arrayFilter) return _arrayFilter;
  hasRequired_arrayFilter = 1;
  function arrayFilter(array2, predicate) {
    var index2 = -1, length = array2 == null ? 0 : array2.length, resIndex = 0, result = [];
    while (++index2 < length) {
      var value = array2[index2];
      if (predicate(value, index2, array2)) {
        result[resIndex++] = value;
      }
    }
    return result;
  }
  _arrayFilter = arrayFilter;
  return _arrayFilter;
}
var stubArray_1;
var hasRequiredStubArray;
function requireStubArray() {
  if (hasRequiredStubArray) return stubArray_1;
  hasRequiredStubArray = 1;
  function stubArray() {
    return [];
  }
  stubArray_1 = stubArray;
  return stubArray_1;
}
var _getSymbols;
var hasRequired_getSymbols;
function require_getSymbols() {
  if (hasRequired_getSymbols) return _getSymbols;
  hasRequired_getSymbols = 1;
  var arrayFilter = require_arrayFilter(), stubArray = requireStubArray();
  var objectProto = Object.prototype;
  var propertyIsEnumerable = objectProto.propertyIsEnumerable;
  var nativeGetSymbols = Object.getOwnPropertySymbols;
  var getSymbols = !nativeGetSymbols ? stubArray : function(object2) {
    if (object2 == null) {
      return [];
    }
    object2 = Object(object2);
    return arrayFilter(nativeGetSymbols(object2), function(symbol) {
      return propertyIsEnumerable.call(object2, symbol);
    });
  };
  _getSymbols = getSymbols;
  return _getSymbols;
}
var _getAllKeys;
var hasRequired_getAllKeys;
function require_getAllKeys() {
  if (hasRequired_getAllKeys) return _getAllKeys;
  hasRequired_getAllKeys = 1;
  var baseGetAllKeys = require_baseGetAllKeys(), getSymbols = require_getSymbols(), keys = requireKeys();
  function getAllKeys(object2) {
    return baseGetAllKeys(object2, keys, getSymbols);
  }
  _getAllKeys = getAllKeys;
  return _getAllKeys;
}
var _equalObjects;
var hasRequired_equalObjects;
function require_equalObjects() {
  if (hasRequired_equalObjects) return _equalObjects;
  hasRequired_equalObjects = 1;
  var getAllKeys = require_getAllKeys();
  var COMPARE_PARTIAL_FLAG = 1;
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function equalObjects(object2, other, bitmask, customizer, equalFunc, stack) {
    var isPartial = bitmask & COMPARE_PARTIAL_FLAG, objProps = getAllKeys(object2), objLength = objProps.length, othProps = getAllKeys(other), othLength = othProps.length;
    if (objLength != othLength && !isPartial) {
      return false;
    }
    var index2 = objLength;
    while (index2--) {
      var key = objProps[index2];
      if (!(isPartial ? key in other : hasOwnProperty.call(other, key))) {
        return false;
      }
    }
    var objStacked = stack.get(object2);
    var othStacked = stack.get(other);
    if (objStacked && othStacked) {
      return objStacked == other && othStacked == object2;
    }
    var result = true;
    stack.set(object2, other);
    stack.set(other, object2);
    var skipCtor = isPartial;
    while (++index2 < objLength) {
      key = objProps[index2];
      var objValue = object2[key], othValue = other[key];
      if (customizer) {
        var compared = isPartial ? customizer(othValue, objValue, key, other, object2, stack) : customizer(objValue, othValue, key, object2, other, stack);
      }
      if (!(compared === void 0 ? objValue === othValue || equalFunc(objValue, othValue, bitmask, customizer, stack) : compared)) {
        result = false;
        break;
      }
      skipCtor || (skipCtor = key == "constructor");
    }
    if (result && !skipCtor) {
      var objCtor = object2.constructor, othCtor = other.constructor;
      if (objCtor != othCtor && ("constructor" in object2 && "constructor" in other) && !(typeof objCtor == "function" && objCtor instanceof objCtor && typeof othCtor == "function" && othCtor instanceof othCtor)) {
        result = false;
      }
    }
    stack["delete"](object2);
    stack["delete"](other);
    return result;
  }
  _equalObjects = equalObjects;
  return _equalObjects;
}
var _DataView;
var hasRequired_DataView;
function require_DataView() {
  if (hasRequired_DataView) return _DataView;
  hasRequired_DataView = 1;
  var getNative = require_getNative(), root = require_root();
  var DataView = getNative(root, "DataView");
  _DataView = DataView;
  return _DataView;
}
var _Promise;
var hasRequired_Promise;
function require_Promise() {
  if (hasRequired_Promise) return _Promise;
  hasRequired_Promise = 1;
  var getNative = require_getNative(), root = require_root();
  var Promise2 = getNative(root, "Promise");
  _Promise = Promise2;
  return _Promise;
}
var _Set;
var hasRequired_Set;
function require_Set() {
  if (hasRequired_Set) return _Set;
  hasRequired_Set = 1;
  var getNative = require_getNative(), root = require_root();
  var Set2 = getNative(root, "Set");
  _Set = Set2;
  return _Set;
}
var _WeakMap;
var hasRequired_WeakMap;
function require_WeakMap() {
  if (hasRequired_WeakMap) return _WeakMap;
  hasRequired_WeakMap = 1;
  var getNative = require_getNative(), root = require_root();
  var WeakMap2 = getNative(root, "WeakMap");
  _WeakMap = WeakMap2;
  return _WeakMap;
}
var _getTag;
var hasRequired_getTag;
function require_getTag() {
  if (hasRequired_getTag) return _getTag;
  hasRequired_getTag = 1;
  var DataView = require_DataView(), Map2 = require_Map(), Promise2 = require_Promise(), Set2 = require_Set(), WeakMap2 = require_WeakMap(), baseGetTag = require_baseGetTag(), toSource = require_toSource();
  var mapTag = "[object Map]", objectTag = "[object Object]", promiseTag = "[object Promise]", setTag = "[object Set]", weakMapTag = "[object WeakMap]";
  var dataViewTag = "[object DataView]";
  var dataViewCtorString = toSource(DataView), mapCtorString = toSource(Map2), promiseCtorString = toSource(Promise2), setCtorString = toSource(Set2), weakMapCtorString = toSource(WeakMap2);
  var getTag = baseGetTag;
  if (DataView && getTag(new DataView(new ArrayBuffer(1))) != dataViewTag || Map2 && getTag(new Map2()) != mapTag || Promise2 && getTag(Promise2.resolve()) != promiseTag || Set2 && getTag(new Set2()) != setTag || WeakMap2 && getTag(new WeakMap2()) != weakMapTag) {
    getTag = function(value) {
      var result = baseGetTag(value), Ctor = result == objectTag ? value.constructor : void 0, ctorString = Ctor ? toSource(Ctor) : "";
      if (ctorString) {
        switch (ctorString) {
          case dataViewCtorString:
            return dataViewTag;
          case mapCtorString:
            return mapTag;
          case promiseCtorString:
            return promiseTag;
          case setCtorString:
            return setTag;
          case weakMapCtorString:
            return weakMapTag;
        }
      }
      return result;
    };
  }
  _getTag = getTag;
  return _getTag;
}
var _baseIsEqualDeep;
var hasRequired_baseIsEqualDeep;
function require_baseIsEqualDeep() {
  if (hasRequired_baseIsEqualDeep) return _baseIsEqualDeep;
  hasRequired_baseIsEqualDeep = 1;
  var Stack = require_Stack(), equalArrays = require_equalArrays(), equalByTag = require_equalByTag(), equalObjects = require_equalObjects(), getTag = require_getTag(), isArray = requireIsArray(), isBuffer2 = requireIsBuffer(), isTypedArray = requireIsTypedArray();
  var COMPARE_PARTIAL_FLAG = 1;
  var argsTag = "[object Arguments]", arrayTag = "[object Array]", objectTag = "[object Object]";
  var objectProto = Object.prototype;
  var hasOwnProperty = objectProto.hasOwnProperty;
  function baseIsEqualDeep(object2, other, bitmask, customizer, equalFunc, stack) {
    var objIsArr = isArray(object2), othIsArr = isArray(other), objTag = objIsArr ? arrayTag : getTag(object2), othTag = othIsArr ? arrayTag : getTag(other);
    objTag = objTag == argsTag ? objectTag : objTag;
    othTag = othTag == argsTag ? objectTag : othTag;
    var objIsObj = objTag == objectTag, othIsObj = othTag == objectTag, isSameTag = objTag == othTag;
    if (isSameTag && isBuffer2(object2)) {
      if (!isBuffer2(other)) {
        return false;
      }
      objIsArr = true;
      objIsObj = false;
    }
    if (isSameTag && !objIsObj) {
      stack || (stack = new Stack());
      return objIsArr || isTypedArray(object2) ? equalArrays(object2, other, bitmask, customizer, equalFunc, stack) : equalByTag(object2, other, objTag, bitmask, customizer, equalFunc, stack);
    }
    if (!(bitmask & COMPARE_PARTIAL_FLAG)) {
      var objIsWrapped = objIsObj && hasOwnProperty.call(object2, "__wrapped__"), othIsWrapped = othIsObj && hasOwnProperty.call(other, "__wrapped__");
      if (objIsWrapped || othIsWrapped) {
        var objUnwrapped = objIsWrapped ? object2.value() : object2, othUnwrapped = othIsWrapped ? other.value() : other;
        stack || (stack = new Stack());
        return equalFunc(objUnwrapped, othUnwrapped, bitmask, customizer, stack);
      }
    }
    if (!isSameTag) {
      return false;
    }
    stack || (stack = new Stack());
    return equalObjects(object2, other, bitmask, customizer, equalFunc, stack);
  }
  _baseIsEqualDeep = baseIsEqualDeep;
  return _baseIsEqualDeep;
}
var _baseIsEqual;
var hasRequired_baseIsEqual;
function require_baseIsEqual() {
  if (hasRequired_baseIsEqual) return _baseIsEqual;
  hasRequired_baseIsEqual = 1;
  var baseIsEqualDeep = require_baseIsEqualDeep(), isObjectLike = requireIsObjectLike();
  function baseIsEqual(value, other, bitmask, customizer, stack) {
    if (value === other) {
      return true;
    }
    if (value == null || other == null || !isObjectLike(value) && !isObjectLike(other)) {
      return value !== value && other !== other;
    }
    return baseIsEqualDeep(value, other, bitmask, customizer, baseIsEqual, stack);
  }
  _baseIsEqual = baseIsEqual;
  return _baseIsEqual;
}
var _baseIsMatch;
var hasRequired_baseIsMatch;
function require_baseIsMatch() {
  if (hasRequired_baseIsMatch) return _baseIsMatch;
  hasRequired_baseIsMatch = 1;
  var Stack = require_Stack(), baseIsEqual = require_baseIsEqual();
  var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
  function baseIsMatch(object2, source, matchData, customizer) {
    var index2 = matchData.length, length = index2, noCustomizer = !customizer;
    if (object2 == null) {
      return !length;
    }
    object2 = Object(object2);
    while (index2--) {
      var data = matchData[index2];
      if (noCustomizer && data[2] ? data[1] !== object2[data[0]] : !(data[0] in object2)) {
        return false;
      }
    }
    while (++index2 < length) {
      data = matchData[index2];
      var key = data[0], objValue = object2[key], srcValue = data[1];
      if (noCustomizer && data[2]) {
        if (objValue === void 0 && !(key in object2)) {
          return false;
        }
      } else {
        var stack = new Stack();
        if (customizer) {
          var result = customizer(objValue, srcValue, key, object2, source, stack);
        }
        if (!(result === void 0 ? baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG, customizer, stack) : result)) {
          return false;
        }
      }
    }
    return true;
  }
  _baseIsMatch = baseIsMatch;
  return _baseIsMatch;
}
var _isStrictComparable;
var hasRequired_isStrictComparable;
function require_isStrictComparable() {
  if (hasRequired_isStrictComparable) return _isStrictComparable;
  hasRequired_isStrictComparable = 1;
  var isObject2 = requireIsObject();
  function isStrictComparable(value) {
    return value === value && !isObject2(value);
  }
  _isStrictComparable = isStrictComparable;
  return _isStrictComparable;
}
var _getMatchData;
var hasRequired_getMatchData;
function require_getMatchData() {
  if (hasRequired_getMatchData) return _getMatchData;
  hasRequired_getMatchData = 1;
  var isStrictComparable = require_isStrictComparable(), keys = requireKeys();
  function getMatchData(object2) {
    var result = keys(object2), length = result.length;
    while (length--) {
      var key = result[length], value = object2[key];
      result[length] = [key, value, isStrictComparable(value)];
    }
    return result;
  }
  _getMatchData = getMatchData;
  return _getMatchData;
}
var _matchesStrictComparable;
var hasRequired_matchesStrictComparable;
function require_matchesStrictComparable() {
  if (hasRequired_matchesStrictComparable) return _matchesStrictComparable;
  hasRequired_matchesStrictComparable = 1;
  function matchesStrictComparable(key, srcValue) {
    return function(object2) {
      if (object2 == null) {
        return false;
      }
      return object2[key] === srcValue && (srcValue !== void 0 || key in Object(object2));
    };
  }
  _matchesStrictComparable = matchesStrictComparable;
  return _matchesStrictComparable;
}
var _baseMatches;
var hasRequired_baseMatches;
function require_baseMatches() {
  if (hasRequired_baseMatches) return _baseMatches;
  hasRequired_baseMatches = 1;
  var baseIsMatch = require_baseIsMatch(), getMatchData = require_getMatchData(), matchesStrictComparable = require_matchesStrictComparable();
  function baseMatches(source) {
    var matchData = getMatchData(source);
    if (matchData.length == 1 && matchData[0][2]) {
      return matchesStrictComparable(matchData[0][0], matchData[0][1]);
    }
    return function(object2) {
      return object2 === source || baseIsMatch(object2, source, matchData);
    };
  }
  _baseMatches = baseMatches;
  return _baseMatches;
}
var _baseGet;
var hasRequired_baseGet;
function require_baseGet() {
  if (hasRequired_baseGet) return _baseGet;
  hasRequired_baseGet = 1;
  var castPath = require_castPath(), toKey = require_toKey();
  function baseGet(object2, path) {
    path = castPath(path, object2);
    var index2 = 0, length = path.length;
    while (object2 != null && index2 < length) {
      object2 = object2[toKey(path[index2++])];
    }
    return index2 && index2 == length ? object2 : void 0;
  }
  _baseGet = baseGet;
  return _baseGet;
}
var get_1;
var hasRequiredGet;
function requireGet() {
  if (hasRequiredGet) return get_1;
  hasRequiredGet = 1;
  var baseGet = require_baseGet();
  function get(object2, path, defaultValue) {
    var result = object2 == null ? void 0 : baseGet(object2, path);
    return result === void 0 ? defaultValue : result;
  }
  get_1 = get;
  return get_1;
}
var _baseHasIn;
var hasRequired_baseHasIn;
function require_baseHasIn() {
  if (hasRequired_baseHasIn) return _baseHasIn;
  hasRequired_baseHasIn = 1;
  function baseHasIn(object2, key) {
    return object2 != null && key in Object(object2);
  }
  _baseHasIn = baseHasIn;
  return _baseHasIn;
}
var hasIn_1;
var hasRequiredHasIn;
function requireHasIn() {
  if (hasRequiredHasIn) return hasIn_1;
  hasRequiredHasIn = 1;
  var baseHasIn = require_baseHasIn(), hasPath = require_hasPath();
  function hasIn(object2, path) {
    return object2 != null && hasPath(object2, path, baseHasIn);
  }
  hasIn_1 = hasIn;
  return hasIn_1;
}
var _baseMatchesProperty;
var hasRequired_baseMatchesProperty;
function require_baseMatchesProperty() {
  if (hasRequired_baseMatchesProperty) return _baseMatchesProperty;
  hasRequired_baseMatchesProperty = 1;
  var baseIsEqual = require_baseIsEqual(), get = requireGet(), hasIn = requireHasIn(), isKey = require_isKey(), isStrictComparable = require_isStrictComparable(), matchesStrictComparable = require_matchesStrictComparable(), toKey = require_toKey();
  var COMPARE_PARTIAL_FLAG = 1, COMPARE_UNORDERED_FLAG = 2;
  function baseMatchesProperty(path, srcValue) {
    if (isKey(path) && isStrictComparable(srcValue)) {
      return matchesStrictComparable(toKey(path), srcValue);
    }
    return function(object2) {
      var objValue = get(object2, path);
      return objValue === void 0 && objValue === srcValue ? hasIn(object2, path) : baseIsEqual(srcValue, objValue, COMPARE_PARTIAL_FLAG | COMPARE_UNORDERED_FLAG);
    };
  }
  _baseMatchesProperty = baseMatchesProperty;
  return _baseMatchesProperty;
}
var identity_1;
var hasRequiredIdentity;
function requireIdentity() {
  if (hasRequiredIdentity) return identity_1;
  hasRequiredIdentity = 1;
  function identity(value) {
    return value;
  }
  identity_1 = identity;
  return identity_1;
}
var _baseProperty;
var hasRequired_baseProperty;
function require_baseProperty() {
  if (hasRequired_baseProperty) return _baseProperty;
  hasRequired_baseProperty = 1;
  function baseProperty(key) {
    return function(object2) {
      return object2 == null ? void 0 : object2[key];
    };
  }
  _baseProperty = baseProperty;
  return _baseProperty;
}
var _basePropertyDeep;
var hasRequired_basePropertyDeep;
function require_basePropertyDeep() {
  if (hasRequired_basePropertyDeep) return _basePropertyDeep;
  hasRequired_basePropertyDeep = 1;
  var baseGet = require_baseGet();
  function basePropertyDeep(path) {
    return function(object2) {
      return baseGet(object2, path);
    };
  }
  _basePropertyDeep = basePropertyDeep;
  return _basePropertyDeep;
}
var property_1;
var hasRequiredProperty;
function requireProperty() {
  if (hasRequiredProperty) return property_1;
  hasRequiredProperty = 1;
  var baseProperty = require_baseProperty(), basePropertyDeep = require_basePropertyDeep(), isKey = require_isKey(), toKey = require_toKey();
  function property(path) {
    return isKey(path) ? baseProperty(toKey(path)) : basePropertyDeep(path);
  }
  property_1 = property;
  return property_1;
}
var _baseIteratee;
var hasRequired_baseIteratee;
function require_baseIteratee() {
  if (hasRequired_baseIteratee) return _baseIteratee;
  hasRequired_baseIteratee = 1;
  var baseMatches = require_baseMatches(), baseMatchesProperty = require_baseMatchesProperty(), identity = requireIdentity(), isArray = requireIsArray(), property = requireProperty();
  function baseIteratee(value) {
    if (typeof value == "function") {
      return value;
    }
    if (value == null) {
      return identity;
    }
    if (typeof value == "object") {
      return isArray(value) ? baseMatchesProperty(value[0], value[1]) : baseMatches(value);
    }
    return property(value);
  }
  _baseIteratee = baseIteratee;
  return _baseIteratee;
}
var mapValues_1;
var hasRequiredMapValues;
function requireMapValues() {
  if (hasRequiredMapValues) return mapValues_1;
  hasRequiredMapValues = 1;
  var baseAssignValue = require_baseAssignValue(), baseForOwn = require_baseForOwn(), baseIteratee = require_baseIteratee();
  function mapValues2(object2, iteratee) {
    var result = {};
    iteratee = baseIteratee(iteratee, 3);
    baseForOwn(object2, function(value, key, object3) {
      baseAssignValue(result, key, iteratee(value, key, object3));
    });
    return result;
  }
  mapValues_1 = mapValues2;
  return mapValues_1;
}
var mapValuesExports = requireMapValues();
const mapValues = /* @__PURE__ */ getDefaultExportFromCjs(mapValuesExports);
var propertyExpr;
var hasRequiredPropertyExpr;
function requirePropertyExpr() {
  if (hasRequiredPropertyExpr) return propertyExpr;
  hasRequiredPropertyExpr = 1;
  function Cache(maxSize) {
    this._maxSize = maxSize;
    this.clear();
  }
  Cache.prototype.clear = function() {
    this._size = 0;
    this._values = /* @__PURE__ */ Object.create(null);
  };
  Cache.prototype.get = function(key) {
    return this._values[key];
  };
  Cache.prototype.set = function(key, value) {
    this._size >= this._maxSize && this.clear();
    if (!(key in this._values)) this._size++;
    return this._values[key] = value;
  };
  var SPLIT_REGEX = /[^.^\]^[]+|(?=\[\]|\.\.)/g, DIGIT_REGEX = /^\d+$/, LEAD_DIGIT_REGEX = /^\d/, SPEC_CHAR_REGEX = /[~`!#$%\^&*+=\-\[\]\\';,/{}|\\":<>\?]/g, CLEAN_QUOTES_REGEX = /^\s*(['"]?)(.*?)(\1)\s*$/, MAX_CACHE_SIZE = 512;
  var pathCache = new Cache(MAX_CACHE_SIZE), setCache = new Cache(MAX_CACHE_SIZE), getCache = new Cache(MAX_CACHE_SIZE);
  propertyExpr = {
    Cache,
    split,
    normalizePath,
    setter: function(path) {
      var parts = normalizePath(path);
      return setCache.get(path) || setCache.set(path, function setter(obj, value) {
        var index2 = 0;
        var len = parts.length;
        var data = obj;
        while (index2 < len - 1) {
          var part = parts[index2];
          if (part === "__proto__" || part === "constructor" || part === "prototype") {
            return obj;
          }
          data = data[parts[index2++]];
        }
        data[parts[index2]] = value;
      });
    },
    getter: function(path, safe) {
      var parts = normalizePath(path);
      return getCache.get(path) || getCache.set(path, function getter(data) {
        var index2 = 0, len = parts.length;
        while (index2 < len) {
          if (data != null || !safe) data = data[parts[index2++]];
          else return;
        }
        return data;
      });
    },
    join: function(segments) {
      return segments.reduce(function(path, part) {
        return path + (isQuoted(part) || DIGIT_REGEX.test(part) ? "[" + part + "]" : (path ? "." : "") + part);
      }, "");
    },
    forEach: function(path, cb, thisArg) {
      forEach(Array.isArray(path) ? path : split(path), cb, thisArg);
    }
  };
  function normalizePath(path) {
    return pathCache.get(path) || pathCache.set(
      path,
      split(path).map(function(part) {
        return part.replace(CLEAN_QUOTES_REGEX, "$2");
      })
    );
  }
  function split(path) {
    return path.match(SPLIT_REGEX) || [""];
  }
  function forEach(parts, iter, thisArg) {
    var len = parts.length, part, idx, isArray, isBracket;
    for (idx = 0; idx < len; idx++) {
      part = parts[idx];
      if (part) {
        if (shouldBeQuoted(part)) {
          part = '"' + part + '"';
        }
        isBracket = isQuoted(part);
        isArray = !isBracket && /^\d+$/.test(part);
        iter.call(thisArg, part, isBracket, isArray, idx, parts);
      }
    }
  }
  function isQuoted(str) {
    return typeof str === "string" && str && ["'", '"'].indexOf(str.charAt(0)) !== -1;
  }
  function hasLeadingNumber(part) {
    return part.match(LEAD_DIGIT_REGEX) && !part.match(DIGIT_REGEX);
  }
  function hasSpecialChars(part) {
    return SPEC_CHAR_REGEX.test(part);
  }
  function shouldBeQuoted(part) {
    return !isQuoted(part) && (hasLeadingNumber(part) || hasSpecialChars(part));
  }
  return propertyExpr;
}
var propertyExprExports = requirePropertyExpr();
const prefixes = {
  context: "$",
  value: "."
};
class Reference {
  constructor(key, options2 = {}) {
    if (typeof key !== "string") throw new TypeError("ref must be a string, got: " + key);
    this.key = key.trim();
    if (key === "") throw new TypeError("ref must be a non-empty string");
    this.isContext = this.key[0] === prefixes.context;
    this.isValue = this.key[0] === prefixes.value;
    this.isSibling = !this.isContext && !this.isValue;
    let prefix = this.isContext ? prefixes.context : this.isValue ? prefixes.value : "";
    this.path = this.key.slice(prefix.length);
    this.getter = this.path && propertyExprExports.getter(this.path, true);
    this.map = options2.map;
  }
  getValue(value, parent, context) {
    let result = this.isContext ? context : this.isValue ? value : parent;
    if (this.getter) result = this.getter(result || {});
    if (this.map) result = this.map(result);
    return result;
  }
  /**
   *
   * @param {*} value
   * @param {Object} options
   * @param {Object=} options.context
   * @param {Object=} options.parent
   */
  cast(value, options2) {
    return this.getValue(value, options2 == null ? void 0 : options2.parent, options2 == null ? void 0 : options2.context);
  }
  resolve() {
    return this;
  }
  describe() {
    return {
      type: "ref",
      key: this.key
    };
  }
  toString() {
    return `Ref(${this.key})`;
  }
  static isRef(value) {
    return value && value.__isYupRef;
  }
}
Reference.prototype.__isYupRef = true;
function _extends$3() {
  _extends$3 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$3.apply(this, arguments);
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {};
  var sourceKeys = Object.keys(source);
  var key, i;
  for (i = 0; i < sourceKeys.length; i++) {
    key = sourceKeys[i];
    if (excluded.indexOf(key) >= 0) continue;
    target[key] = source[key];
  }
  return target;
}
function createValidation(config2) {
  function validate(_ref, cb) {
    let {
      value,
      path = "",
      label,
      options: options2,
      originalValue,
      sync
    } = _ref, rest = _objectWithoutPropertiesLoose(_ref, ["value", "path", "label", "options", "originalValue", "sync"]);
    const {
      name,
      test,
      params,
      message
    } = config2;
    let {
      parent,
      context
    } = options2;
    function resolve(item) {
      return Reference.isRef(item) ? item.getValue(value, parent, context) : item;
    }
    function createError2(overrides = {}) {
      const nextParams = mapValues(_extends$3({
        value,
        originalValue,
        label,
        path: overrides.path || path
      }, params, overrides.params), resolve);
      const error2 = new ValidationError$1(ValidationError$1.formatError(overrides.message || message, nextParams), value, nextParams.path, overrides.type || name);
      error2.params = nextParams;
      return error2;
    }
    let ctx = _extends$3({
      path,
      parent,
      type: name,
      createError: createError2,
      resolve,
      options: options2,
      originalValue
    }, rest);
    if (!sync) {
      try {
        Promise.resolve(test.call(ctx, value, ctx)).then((validOrError) => {
          if (ValidationError$1.isError(validOrError)) cb(validOrError);
          else if (!validOrError) cb(createError2());
          else cb(null, validOrError);
        });
      } catch (err) {
        cb(err);
      }
      return;
    }
    let result;
    try {
      var _ref2;
      result = test.call(ctx, value, ctx);
      if (typeof ((_ref2 = result) == null ? void 0 : _ref2.then) === "function") {
        throw new Error(`Validation test of type: "${ctx.type}" returned a Promise during a synchronous validate. This test will finish after the validate call has returned`);
      }
    } catch (err) {
      cb(err);
      return;
    }
    if (ValidationError$1.isError(result)) cb(result);
    else if (!result) cb(createError2());
    else cb(null, result);
  }
  validate.OPTIONS = config2;
  return validate;
}
let trim = (part) => part.substr(0, part.length - 1).substr(1);
function getIn(schema, path, value, context = value) {
  let parent, lastPart, lastPartDebug;
  if (!path) return {
    parent,
    parentPath: path,
    schema
  };
  propertyExprExports.forEach(path, (_part, isBracket, isArray) => {
    let part = isBracket ? trim(_part) : _part;
    schema = schema.resolve({
      context,
      parent,
      value
    });
    if (schema.innerType) {
      let idx = isArray ? parseInt(part, 10) : 0;
      if (value && idx >= value.length) {
        throw new Error(`Yup.reach cannot resolve an array item at index: ${_part}, in the path: ${path}. because there is no value at that index. `);
      }
      parent = value;
      value = value && value[idx];
      schema = schema.innerType;
    }
    if (!isArray) {
      if (!schema.fields || !schema.fields[part]) throw new Error(`The schema does not contain the path: ${path}. (failed at: ${lastPartDebug} which is a type: "${schema._type}")`);
      parent = value;
      value = value && value[part];
      schema = schema.fields[part];
    }
    lastPart = part;
    lastPartDebug = isBracket ? "[" + _part + "]" : "." + _part;
  });
  return {
    schema,
    parent,
    parentPath: lastPart
  };
}
class ReferenceSet {
  constructor() {
    this.list = /* @__PURE__ */ new Set();
    this.refs = /* @__PURE__ */ new Map();
  }
  get size() {
    return this.list.size + this.refs.size;
  }
  describe() {
    const description = [];
    for (const item of this.list) description.push(item);
    for (const [, ref] of this.refs) description.push(ref.describe());
    return description;
  }
  toArray() {
    return Array.from(this.list).concat(Array.from(this.refs.values()));
  }
  add(value) {
    Reference.isRef(value) ? this.refs.set(value.key, value) : this.list.add(value);
  }
  delete(value) {
    Reference.isRef(value) ? this.refs.delete(value.key) : this.list.delete(value);
  }
  has(value, resolve) {
    if (this.list.has(value)) return true;
    let item, values = this.refs.values();
    while (item = values.next(), !item.done) if (resolve(item.value) === value) return true;
    return false;
  }
  clone() {
    const next = new ReferenceSet();
    next.list = new Set(this.list);
    next.refs = new Map(this.refs);
    return next;
  }
  merge(newItems, removeItems) {
    const next = this.clone();
    newItems.list.forEach((value) => next.add(value));
    newItems.refs.forEach((value) => next.add(value));
    removeItems.list.forEach((value) => next.delete(value));
    removeItems.refs.forEach((value) => next.delete(value));
    return next;
  }
}
function _extends$2() {
  _extends$2 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$2.apply(this, arguments);
}
class BaseSchema {
  constructor(options2) {
    this.deps = [];
    this.conditions = [];
    this._whitelist = new ReferenceSet();
    this._blacklist = new ReferenceSet();
    this.exclusiveTests = /* @__PURE__ */ Object.create(null);
    this.tests = [];
    this.transforms = [];
    this.withMutation(() => {
      this.typeError(mixed.notType);
    });
    this.type = (options2 == null ? void 0 : options2.type) || "mixed";
    this.spec = _extends$2({
      strip: false,
      strict: false,
      abortEarly: true,
      recursive: true,
      nullable: false,
      presence: "optional"
    }, options2 == null ? void 0 : options2.spec);
  }
  // TODO: remove
  get _type() {
    return this.type;
  }
  _typeCheck(_value) {
    return true;
  }
  clone(spec) {
    if (this._mutate) {
      if (spec) Object.assign(this.spec, spec);
      return this;
    }
    const next = Object.create(Object.getPrototypeOf(this));
    next.type = this.type;
    next._typeError = this._typeError;
    next._whitelistError = this._whitelistError;
    next._blacklistError = this._blacklistError;
    next._whitelist = this._whitelist.clone();
    next._blacklist = this._blacklist.clone();
    next.exclusiveTests = _extends$2({}, this.exclusiveTests);
    next.deps = [...this.deps];
    next.conditions = [...this.conditions];
    next.tests = [...this.tests];
    next.transforms = [...this.transforms];
    next.spec = clone$1(_extends$2({}, this.spec, spec));
    return next;
  }
  label(label) {
    var next = this.clone();
    next.spec.label = label;
    return next;
  }
  meta(...args) {
    if (args.length === 0) return this.spec.meta;
    let next = this.clone();
    next.spec.meta = Object.assign(next.spec.meta || {}, args[0]);
    return next;
  }
  // withContext<TContext extends AnyObject>(): BaseSchema<
  //   TCast,
  //   TContext,
  //   TOutput
  // > {
  //   return this as any;
  // }
  withMutation(fn) {
    let before = this._mutate;
    this._mutate = true;
    let result = fn(this);
    this._mutate = before;
    return result;
  }
  concat(schema) {
    if (!schema || schema === this) return this;
    if (schema.type !== this.type && this.type !== "mixed") throw new TypeError(`You cannot \`concat()\` schema's of different types: ${this.type} and ${schema.type}`);
    let base = this;
    let combined = schema.clone();
    const mergedSpec = _extends$2({}, base.spec, combined.spec);
    combined.spec = mergedSpec;
    combined._typeError || (combined._typeError = base._typeError);
    combined._whitelistError || (combined._whitelistError = base._whitelistError);
    combined._blacklistError || (combined._blacklistError = base._blacklistError);
    combined._whitelist = base._whitelist.merge(schema._whitelist, schema._blacklist);
    combined._blacklist = base._blacklist.merge(schema._blacklist, schema._whitelist);
    combined.tests = base.tests;
    combined.exclusiveTests = base.exclusiveTests;
    combined.withMutation((next) => {
      schema.tests.forEach((fn) => {
        next.test(fn.OPTIONS);
      });
    });
    return combined;
  }
  isType(v) {
    if (this.spec.nullable && v === null) return true;
    return this._typeCheck(v);
  }
  resolve(options2) {
    let schema = this;
    if (schema.conditions.length) {
      let conditions = schema.conditions;
      schema = schema.clone();
      schema.conditions = [];
      schema = conditions.reduce((schema2, condition) => condition.resolve(schema2, options2), schema);
      schema = schema.resolve(options2);
    }
    return schema;
  }
  /**
   *
   * @param {*} value
   * @param {Object} options
   * @param {*=} options.parent
   * @param {*=} options.context
   */
  cast(value, options2 = {}) {
    let resolvedSchema = this.resolve(_extends$2({
      value
    }, options2));
    let result = resolvedSchema._cast(value, options2);
    if (value !== void 0 && options2.assert !== false && resolvedSchema.isType(result) !== true) {
      let formattedValue = printValue$1(value);
      let formattedResult = printValue$1(result);
      throw new TypeError(`The value of ${options2.path || "field"} could not be cast to a value that satisfies the schema type: "${resolvedSchema._type}". 

attempted value: ${formattedValue} 
` + (formattedResult !== formattedValue ? `result of cast: ${formattedResult}` : ""));
    }
    return result;
  }
  _cast(rawValue, _options) {
    let value = rawValue === void 0 ? rawValue : this.transforms.reduce((value2, fn) => fn.call(this, value2, rawValue, this), rawValue);
    if (value === void 0) {
      value = this.getDefault();
    }
    return value;
  }
  _validate(_value, options2 = {}, cb) {
    let {
      sync,
      path,
      from = [],
      originalValue = _value,
      strict = this.spec.strict,
      abortEarly = this.spec.abortEarly
    } = options2;
    let value = _value;
    if (!strict) {
      value = this._cast(value, _extends$2({
        assert: false
      }, options2));
    }
    let args = {
      value,
      path,
      options: options2,
      originalValue,
      schema: this,
      label: this.spec.label,
      sync,
      from
    };
    let initialTests = [];
    if (this._typeError) initialTests.push(this._typeError);
    if (this._whitelistError) initialTests.push(this._whitelistError);
    if (this._blacklistError) initialTests.push(this._blacklistError);
    runTests({
      args,
      value,
      path,
      tests: initialTests,
      endEarly: abortEarly
    }, (err) => {
      if (err) return void cb(err, value);
      runTests({
        tests: this.tests,
        args,
        path,
        sync,
        value,
        endEarly: abortEarly
      }, cb);
    });
  }
  validate(value, options2, maybeCb) {
    let schema = this.resolve(_extends$2({}, options2, {
      value
    }));
    return typeof maybeCb === "function" ? schema._validate(value, options2, maybeCb) : new Promise((resolve, reject) => schema._validate(value, options2, (err, value2) => {
      if (err) reject(err);
      else resolve(value2);
    }));
  }
  validateSync(value, options2) {
    let schema = this.resolve(_extends$2({}, options2, {
      value
    }));
    let result;
    schema._validate(value, _extends$2({}, options2, {
      sync: true
    }), (err, value2) => {
      if (err) throw err;
      result = value2;
    });
    return result;
  }
  isValid(value, options2) {
    return this.validate(value, options2).then(() => true, (err) => {
      if (ValidationError$1.isError(err)) return false;
      throw err;
    });
  }
  isValidSync(value, options2) {
    try {
      this.validateSync(value, options2);
      return true;
    } catch (err) {
      if (ValidationError$1.isError(err)) return false;
      throw err;
    }
  }
  _getDefault() {
    let defaultValue = this.spec.default;
    if (defaultValue == null) {
      return defaultValue;
    }
    return typeof defaultValue === "function" ? defaultValue.call(this) : clone$1(defaultValue);
  }
  getDefault(options2) {
    let schema = this.resolve(options2 || {});
    return schema._getDefault();
  }
  default(def) {
    if (arguments.length === 0) {
      return this._getDefault();
    }
    let next = this.clone({
      default: def
    });
    return next;
  }
  strict(isStrict = true) {
    var next = this.clone();
    next.spec.strict = isStrict;
    return next;
  }
  _isPresent(value) {
    return value != null;
  }
  defined(message = mixed.defined) {
    return this.test({
      message,
      name: "defined",
      exclusive: true,
      test(value) {
        return value !== void 0;
      }
    });
  }
  required(message = mixed.required) {
    return this.clone({
      presence: "required"
    }).withMutation((s) => s.test({
      message,
      name: "required",
      exclusive: true,
      test(value) {
        return this.schema._isPresent(value);
      }
    }));
  }
  notRequired() {
    var next = this.clone({
      presence: "optional"
    });
    next.tests = next.tests.filter((test) => test.OPTIONS.name !== "required");
    return next;
  }
  nullable(isNullable = true) {
    var next = this.clone({
      nullable: isNullable !== false
    });
    return next;
  }
  transform(fn) {
    var next = this.clone();
    next.transforms.push(fn);
    return next;
  }
  /**
   * Adds a test function to the schema's queue of tests.
   * tests can be exclusive or non-exclusive.
   *
   * - exclusive tests, will replace any existing tests of the same name.
   * - non-exclusive: can be stacked
   *
   * If a non-exclusive test is added to a schema with an exclusive test of the same name
   * the exclusive test is removed and further tests of the same name will be stacked.
   *
   * If an exclusive test is added to a schema with non-exclusive tests of the same name
   * the previous tests are removed and further tests of the same name will replace each other.
   */
  test(...args) {
    let opts;
    if (args.length === 1) {
      if (typeof args[0] === "function") {
        opts = {
          test: args[0]
        };
      } else {
        opts = args[0];
      }
    } else if (args.length === 2) {
      opts = {
        name: args[0],
        test: args[1]
      };
    } else {
      opts = {
        name: args[0],
        message: args[1],
        test: args[2]
      };
    }
    if (opts.message === void 0) opts.message = mixed.default;
    if (typeof opts.test !== "function") throw new TypeError("`test` is a required parameters");
    let next = this.clone();
    let validate = createValidation(opts);
    let isExclusive = opts.exclusive || opts.name && next.exclusiveTests[opts.name] === true;
    if (opts.exclusive) {
      if (!opts.name) throw new TypeError("Exclusive tests must provide a unique `name` identifying the test");
    }
    if (opts.name) next.exclusiveTests[opts.name] = !!opts.exclusive;
    next.tests = next.tests.filter((fn) => {
      if (fn.OPTIONS.name === opts.name) {
        if (isExclusive) return false;
        if (fn.OPTIONS.test === validate.OPTIONS.test) return false;
      }
      return true;
    });
    next.tests.push(validate);
    return next;
  }
  when(keys, options2) {
    if (!Array.isArray(keys) && typeof keys !== "string") {
      options2 = keys;
      keys = ".";
    }
    let next = this.clone();
    let deps = toArray(keys).map((key) => new Reference(key));
    deps.forEach((dep) => {
      if (dep.isSibling) next.deps.push(dep.key);
    });
    next.conditions.push(new Condition(deps, options2));
    return next;
  }
  typeError(message) {
    var next = this.clone();
    next._typeError = createValidation({
      message,
      name: "typeError",
      test(value) {
        if (value !== void 0 && !this.schema.isType(value)) return this.createError({
          params: {
            type: this.schema._type
          }
        });
        return true;
      }
    });
    return next;
  }
  oneOf(enums, message = mixed.oneOf) {
    var next = this.clone();
    enums.forEach((val) => {
      next._whitelist.add(val);
      next._blacklist.delete(val);
    });
    next._whitelistError = createValidation({
      message,
      name: "oneOf",
      test(value) {
        if (value === void 0) return true;
        let valids = this.schema._whitelist;
        return valids.has(value, this.resolve) ? true : this.createError({
          params: {
            values: valids.toArray().join(", ")
          }
        });
      }
    });
    return next;
  }
  notOneOf(enums, message = mixed.notOneOf) {
    var next = this.clone();
    enums.forEach((val) => {
      next._blacklist.add(val);
      next._whitelist.delete(val);
    });
    next._blacklistError = createValidation({
      message,
      name: "notOneOf",
      test(value) {
        let invalids = this.schema._blacklist;
        if (invalids.has(value, this.resolve)) return this.createError({
          params: {
            values: invalids.toArray().join(", ")
          }
        });
        return true;
      }
    });
    return next;
  }
  strip(strip = true) {
    let next = this.clone();
    next.spec.strip = strip;
    return next;
  }
  describe() {
    const next = this.clone();
    const {
      label,
      meta
    } = next.spec;
    const description = {
      meta,
      label,
      type: next.type,
      oneOf: next._whitelist.describe(),
      notOneOf: next._blacklist.describe(),
      tests: next.tests.map((fn) => ({
        name: fn.OPTIONS.name,
        params: fn.OPTIONS.params
      })).filter((n, idx, list) => list.findIndex((c) => c.name === n.name) === idx)
    };
    return description;
  }
}
BaseSchema.prototype.__isYupSchema__ = true;
for (const method of ["validate", "validateSync"]) BaseSchema.prototype[`${method}At`] = function(path, value, options2 = {}) {
  const {
    parent,
    parentPath,
    schema
  } = getIn(this, path, value, options2.context);
  return schema[method](parent && parent[parentPath], _extends$2({}, options2, {
    parent,
    path
  }));
};
for (const alias of ["equals", "is"]) BaseSchema.prototype[alias] = BaseSchema.prototype.oneOf;
for (const alias of ["not", "nope"]) BaseSchema.prototype[alias] = BaseSchema.prototype.notOneOf;
BaseSchema.prototype.optional = BaseSchema.prototype.notRequired;
const Mixed = BaseSchema;
function create$3() {
  return new Mixed();
}
create$3.prototype = Mixed.prototype;
const isAbsent = ((value) => value == null);
let rEmail = /^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))$/i;
let rUrl = /^((https?|ftp):)?\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?(((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?)(:\d*)?)(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)?(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i;
let rUUID = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
let isTrimmed = (value) => isAbsent(value) || value === value.trim();
let objStringTag = {}.toString();
function create$2() {
  return new StringSchema();
}
class StringSchema extends BaseSchema {
  constructor() {
    super({
      type: "string"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        if (this.isType(value)) return value;
        if (Array.isArray(value)) return value;
        const strValue = value != null && value.toString ? value.toString() : value;
        if (strValue === objStringTag) return value;
        return strValue;
      });
    });
  }
  _typeCheck(value) {
    if (value instanceof String) value = value.valueOf();
    return typeof value === "string";
  }
  _isPresent(value) {
    return super._isPresent(value) && !!value.length;
  }
  length(length, message = string$2.length) {
    return this.test({
      message,
      name: "length",
      exclusive: true,
      params: {
        length
      },
      test(value) {
        return isAbsent(value) || value.length === this.resolve(length);
      }
    });
  }
  min(min, message = string$2.min) {
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      test(value) {
        return isAbsent(value) || value.length >= this.resolve(min);
      }
    });
  }
  max(max, message = string$2.max) {
    return this.test({
      name: "max",
      exclusive: true,
      message,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value.length <= this.resolve(max);
      }
    });
  }
  matches(regex, options2) {
    let excludeEmptyString = false;
    let message;
    let name;
    if (options2) {
      if (typeof options2 === "object") {
        ({
          excludeEmptyString = false,
          message,
          name
        } = options2);
      } else {
        message = options2;
      }
    }
    return this.test({
      name: name || "matches",
      message: message || string$2.matches,
      params: {
        regex
      },
      test: (value) => isAbsent(value) || value === "" && excludeEmptyString || value.search(regex) !== -1
    });
  }
  email(message = string$2.email) {
    return this.matches(rEmail, {
      name: "email",
      message,
      excludeEmptyString: true
    });
  }
  url(message = string$2.url) {
    return this.matches(rUrl, {
      name: "url",
      message,
      excludeEmptyString: true
    });
  }
  uuid(message = string$2.uuid) {
    return this.matches(rUUID, {
      name: "uuid",
      message,
      excludeEmptyString: false
    });
  }
  //-- transforms --
  ensure() {
    return this.default("").transform((val) => val === null ? "" : val);
  }
  trim(message = string$2.trim) {
    return this.transform((val) => val != null ? val.trim() : val).test({
      message,
      name: "trim",
      test: isTrimmed
    });
  }
  lowercase(message = string$2.lowercase) {
    return this.transform((value) => !isAbsent(value) ? value.toLowerCase() : value).test({
      message,
      name: "string_case",
      exclusive: true,
      test: (value) => isAbsent(value) || value === value.toLowerCase()
    });
  }
  uppercase(message = string$2.uppercase) {
    return this.transform((value) => !isAbsent(value) ? value.toUpperCase() : value).test({
      message,
      name: "string_case",
      exclusive: true,
      test: (value) => isAbsent(value) || value === value.toUpperCase()
    });
  }
}
create$2.prototype = StringSchema.prototype;
var isoReg = /^(\d{4}|[+\-]\d{6})(?:-?(\d{2})(?:-?(\d{2}))?)?(?:[ T]?(\d{2}):?(\d{2})(?::?(\d{2})(?:[,\.](\d{1,}))?)?(?:(Z)|([+\-])(\d{2})(?::?(\d{2}))?)?)?$/;
function parseIsoDate(date2) {
  var numericKeys = [1, 4, 5, 6, 7, 10, 11], minutesOffset = 0, timestamp, struct;
  if (struct = isoReg.exec(date2)) {
    for (var i = 0, k; k = numericKeys[i]; ++i) struct[k] = +struct[k] || 0;
    struct[2] = (+struct[2] || 1) - 1;
    struct[3] = +struct[3] || 1;
    struct[7] = struct[7] ? String(struct[7]).substr(0, 3) : 0;
    if ((struct[8] === void 0 || struct[8] === "") && (struct[9] === void 0 || struct[9] === "")) timestamp = +new Date(struct[1], struct[2], struct[3], struct[4], struct[5], struct[6], struct[7]);
    else {
      if (struct[8] !== "Z" && struct[9] !== void 0) {
        minutesOffset = struct[10] * 60 + struct[11];
        if (struct[9] === "+") minutesOffset = 0 - minutesOffset;
      }
      timestamp = Date.UTC(struct[1], struct[2], struct[3], struct[4], struct[5] + minutesOffset, struct[6], struct[7]);
    }
  } else timestamp = Date.parse ? Date.parse(date2) : NaN;
  return timestamp;
}
let invalidDate = /* @__PURE__ */ new Date("");
let isDate = (obj) => Object.prototype.toString.call(obj) === "[object Date]";
class DateSchema extends BaseSchema {
  constructor() {
    super({
      type: "date"
    });
    this.withMutation(() => {
      this.transform(function(value) {
        if (this.isType(value)) return value;
        value = parseIsoDate(value);
        return !isNaN(value) ? new Date(value) : invalidDate;
      });
    });
  }
  _typeCheck(v) {
    return isDate(v) && !isNaN(v.getTime());
  }
  prepareParam(ref, name) {
    let param;
    if (!Reference.isRef(ref)) {
      let cast = this.cast(ref);
      if (!this._typeCheck(cast)) throw new TypeError(`\`${name}\` must be a Date or a value that can be \`cast()\` to a Date`);
      param = cast;
    } else {
      param = ref;
    }
    return param;
  }
  min(min, message = date$2.min) {
    let limit = this.prepareParam(min, "min");
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      test(value) {
        return isAbsent(value) || value >= this.resolve(limit);
      }
    });
  }
  max(max, message = date$2.max) {
    var limit = this.prepareParam(max, "max");
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value <= this.resolve(limit);
      }
    });
  }
}
DateSchema.INVALID_DATE = invalidDate;
var _arrayReduce;
var hasRequired_arrayReduce;
function require_arrayReduce() {
  if (hasRequired_arrayReduce) return _arrayReduce;
  hasRequired_arrayReduce = 1;
  function arrayReduce(array2, iteratee, accumulator, initAccum) {
    var index2 = -1, length = array2 == null ? 0 : array2.length;
    if (initAccum && length) {
      accumulator = array2[++index2];
    }
    while (++index2 < length) {
      accumulator = iteratee(accumulator, array2[index2], index2, array2);
    }
    return accumulator;
  }
  _arrayReduce = arrayReduce;
  return _arrayReduce;
}
var _basePropertyOf;
var hasRequired_basePropertyOf;
function require_basePropertyOf() {
  if (hasRequired_basePropertyOf) return _basePropertyOf;
  hasRequired_basePropertyOf = 1;
  function basePropertyOf(object2) {
    return function(key) {
      return object2 == null ? void 0 : object2[key];
    };
  }
  _basePropertyOf = basePropertyOf;
  return _basePropertyOf;
}
var _deburrLetter;
var hasRequired_deburrLetter;
function require_deburrLetter() {
  if (hasRequired_deburrLetter) return _deburrLetter;
  hasRequired_deburrLetter = 1;
  var basePropertyOf = require_basePropertyOf();
  var deburredLetters = {
    // Latin-1 Supplement block.
    "À": "A",
    "Á": "A",
    "Â": "A",
    "Ã": "A",
    "Ä": "A",
    "Å": "A",
    "à": "a",
    "á": "a",
    "â": "a",
    "ã": "a",
    "ä": "a",
    "å": "a",
    "Ç": "C",
    "ç": "c",
    "Ð": "D",
    "ð": "d",
    "È": "E",
    "É": "E",
    "Ê": "E",
    "Ë": "E",
    "è": "e",
    "é": "e",
    "ê": "e",
    "ë": "e",
    "Ì": "I",
    "Í": "I",
    "Î": "I",
    "Ï": "I",
    "ì": "i",
    "í": "i",
    "î": "i",
    "ï": "i",
    "Ñ": "N",
    "ñ": "n",
    "Ò": "O",
    "Ó": "O",
    "Ô": "O",
    "Õ": "O",
    "Ö": "O",
    "Ø": "O",
    "ò": "o",
    "ó": "o",
    "ô": "o",
    "õ": "o",
    "ö": "o",
    "ø": "o",
    "Ù": "U",
    "Ú": "U",
    "Û": "U",
    "Ü": "U",
    "ù": "u",
    "ú": "u",
    "û": "u",
    "ü": "u",
    "Ý": "Y",
    "ý": "y",
    "ÿ": "y",
    "Æ": "Ae",
    "æ": "ae",
    "Þ": "Th",
    "þ": "th",
    "ß": "ss",
    // Latin Extended-A block.
    "Ā": "A",
    "Ă": "A",
    "Ą": "A",
    "ā": "a",
    "ă": "a",
    "ą": "a",
    "Ć": "C",
    "Ĉ": "C",
    "Ċ": "C",
    "Č": "C",
    "ć": "c",
    "ĉ": "c",
    "ċ": "c",
    "č": "c",
    "Ď": "D",
    "Đ": "D",
    "ď": "d",
    "đ": "d",
    "Ē": "E",
    "Ĕ": "E",
    "Ė": "E",
    "Ę": "E",
    "Ě": "E",
    "ē": "e",
    "ĕ": "e",
    "ė": "e",
    "ę": "e",
    "ě": "e",
    "Ĝ": "G",
    "Ğ": "G",
    "Ġ": "G",
    "Ģ": "G",
    "ĝ": "g",
    "ğ": "g",
    "ġ": "g",
    "ģ": "g",
    "Ĥ": "H",
    "Ħ": "H",
    "ĥ": "h",
    "ħ": "h",
    "Ĩ": "I",
    "Ī": "I",
    "Ĭ": "I",
    "Į": "I",
    "İ": "I",
    "ĩ": "i",
    "ī": "i",
    "ĭ": "i",
    "į": "i",
    "ı": "i",
    "Ĵ": "J",
    "ĵ": "j",
    "Ķ": "K",
    "ķ": "k",
    "ĸ": "k",
    "Ĺ": "L",
    "Ļ": "L",
    "Ľ": "L",
    "Ŀ": "L",
    "Ł": "L",
    "ĺ": "l",
    "ļ": "l",
    "ľ": "l",
    "ŀ": "l",
    "ł": "l",
    "Ń": "N",
    "Ņ": "N",
    "Ň": "N",
    "Ŋ": "N",
    "ń": "n",
    "ņ": "n",
    "ň": "n",
    "ŋ": "n",
    "Ō": "O",
    "Ŏ": "O",
    "Ő": "O",
    "ō": "o",
    "ŏ": "o",
    "ő": "o",
    "Ŕ": "R",
    "Ŗ": "R",
    "Ř": "R",
    "ŕ": "r",
    "ŗ": "r",
    "ř": "r",
    "Ś": "S",
    "Ŝ": "S",
    "Ş": "S",
    "Š": "S",
    "ś": "s",
    "ŝ": "s",
    "ş": "s",
    "š": "s",
    "Ţ": "T",
    "Ť": "T",
    "Ŧ": "T",
    "ţ": "t",
    "ť": "t",
    "ŧ": "t",
    "Ũ": "U",
    "Ū": "U",
    "Ŭ": "U",
    "Ů": "U",
    "Ű": "U",
    "Ų": "U",
    "ũ": "u",
    "ū": "u",
    "ŭ": "u",
    "ů": "u",
    "ű": "u",
    "ų": "u",
    "Ŵ": "W",
    "ŵ": "w",
    "Ŷ": "Y",
    "ŷ": "y",
    "Ÿ": "Y",
    "Ź": "Z",
    "Ż": "Z",
    "Ž": "Z",
    "ź": "z",
    "ż": "z",
    "ž": "z",
    "Ĳ": "IJ",
    "ĳ": "ij",
    "Œ": "Oe",
    "œ": "oe",
    "ŉ": "'n",
    "ſ": "s"
  };
  var deburrLetter = basePropertyOf(deburredLetters);
  _deburrLetter = deburrLetter;
  return _deburrLetter;
}
var deburr_1;
var hasRequiredDeburr;
function requireDeburr() {
  if (hasRequiredDeburr) return deburr_1;
  hasRequiredDeburr = 1;
  var deburrLetter = require_deburrLetter(), toString2 = requireToString();
  var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
  var rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange;
  var rsCombo = "[" + rsComboRange + "]";
  var reComboMark = RegExp(rsCombo, "g");
  function deburr(string2) {
    string2 = toString2(string2);
    return string2 && string2.replace(reLatin, deburrLetter).replace(reComboMark, "");
  }
  deburr_1 = deburr;
  return deburr_1;
}
var _asciiWords;
var hasRequired_asciiWords;
function require_asciiWords() {
  if (hasRequired_asciiWords) return _asciiWords;
  hasRequired_asciiWords = 1;
  var reAsciiWord = /[^\x00-\x2f\x3a-\x40\x5b-\x60\x7b-\x7f]+/g;
  function asciiWords(string2) {
    return string2.match(reAsciiWord) || [];
  }
  _asciiWords = asciiWords;
  return _asciiWords;
}
var _hasUnicodeWord;
var hasRequired_hasUnicodeWord;
function require_hasUnicodeWord() {
  if (hasRequired_hasUnicodeWord) return _hasUnicodeWord;
  hasRequired_hasUnicodeWord = 1;
  var reHasUnicodeWord = /[a-z][A-Z]|[A-Z]{2}[a-z]|[0-9][a-zA-Z]|[a-zA-Z][0-9]|[^a-zA-Z0-9 ]/;
  function hasUnicodeWord(string2) {
    return reHasUnicodeWord.test(string2);
  }
  _hasUnicodeWord = hasUnicodeWord;
  return _hasUnicodeWord;
}
var _unicodeWords;
var hasRequired_unicodeWords;
function require_unicodeWords() {
  if (hasRequired_unicodeWords) return _unicodeWords;
  hasRequired_unicodeWords = 1;
  var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsDingbatRange = "\\u2700-\\u27bf", rsLowerRange = "a-z\\xdf-\\xf6\\xf8-\\xff", rsMathOpRange = "\\xac\\xb1\\xd7\\xf7", rsNonCharRange = "\\x00-\\x2f\\x3a-\\x40\\x5b-\\x60\\x7b-\\xbf", rsPunctuationRange = "\\u2000-\\u206f", rsSpaceRange = " \\t\\x0b\\f\\xa0\\ufeff\\n\\r\\u2028\\u2029\\u1680\\u180e\\u2000\\u2001\\u2002\\u2003\\u2004\\u2005\\u2006\\u2007\\u2008\\u2009\\u200a\\u202f\\u205f\\u3000", rsUpperRange = "A-Z\\xc0-\\xd6\\xd8-\\xde", rsVarRange = "\\ufe0e\\ufe0f", rsBreakRange = rsMathOpRange + rsNonCharRange + rsPunctuationRange + rsSpaceRange;
  var rsApos = "['’]", rsBreak = "[" + rsBreakRange + "]", rsCombo = "[" + rsComboRange + "]", rsDigits = "\\d+", rsDingbat = "[" + rsDingbatRange + "]", rsLower = "[" + rsLowerRange + "]", rsMisc = "[^" + rsAstralRange + rsBreakRange + rsDigits + rsDingbatRange + rsLowerRange + rsUpperRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsUpper = "[" + rsUpperRange + "]", rsZWJ = "\\u200d";
  var rsMiscLower = "(?:" + rsLower + "|" + rsMisc + ")", rsMiscUpper = "(?:" + rsUpper + "|" + rsMisc + ")", rsOptContrLower = "(?:" + rsApos + "(?:d|ll|m|re|s|t|ve))?", rsOptContrUpper = "(?:" + rsApos + "(?:D|LL|M|RE|S|T|VE))?", reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsOrdLower = "\\d*(?:1st|2nd|3rd|(?![123])\\dth)(?=\\b|[A-Z_])", rsOrdUpper = "\\d*(?:1ST|2ND|3RD|(?![123])\\dTH)(?=\\b|[a-z_])", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsEmoji = "(?:" + [rsDingbat, rsRegional, rsSurrPair].join("|") + ")" + rsSeq;
  var reUnicodeWord = RegExp([
    rsUpper + "?" + rsLower + "+" + rsOptContrLower + "(?=" + [rsBreak, rsUpper, "$"].join("|") + ")",
    rsMiscUpper + "+" + rsOptContrUpper + "(?=" + [rsBreak, rsUpper + rsMiscLower, "$"].join("|") + ")",
    rsUpper + "?" + rsMiscLower + "+" + rsOptContrLower,
    rsUpper + "+" + rsOptContrUpper,
    rsOrdUpper,
    rsOrdLower,
    rsDigits,
    rsEmoji
  ].join("|"), "g");
  function unicodeWords(string2) {
    return string2.match(reUnicodeWord) || [];
  }
  _unicodeWords = unicodeWords;
  return _unicodeWords;
}
var words_1;
var hasRequiredWords;
function requireWords() {
  if (hasRequiredWords) return words_1;
  hasRequiredWords = 1;
  var asciiWords = require_asciiWords(), hasUnicodeWord = require_hasUnicodeWord(), toString2 = requireToString(), unicodeWords = require_unicodeWords();
  function words(string2, pattern, guard) {
    string2 = toString2(string2);
    pattern = guard ? void 0 : pattern;
    if (pattern === void 0) {
      return hasUnicodeWord(string2) ? unicodeWords(string2) : asciiWords(string2);
    }
    return string2.match(pattern) || [];
  }
  words_1 = words;
  return words_1;
}
var _createCompounder;
var hasRequired_createCompounder;
function require_createCompounder() {
  if (hasRequired_createCompounder) return _createCompounder;
  hasRequired_createCompounder = 1;
  var arrayReduce = require_arrayReduce(), deburr = requireDeburr(), words = requireWords();
  var rsApos = "['’]";
  var reApos = RegExp(rsApos, "g");
  function createCompounder(callback) {
    return function(string2) {
      return arrayReduce(words(deburr(string2).replace(reApos, "")), callback, "");
    };
  }
  _createCompounder = createCompounder;
  return _createCompounder;
}
var snakeCase_1;
var hasRequiredSnakeCase;
function requireSnakeCase() {
  if (hasRequiredSnakeCase) return snakeCase_1;
  hasRequiredSnakeCase = 1;
  var createCompounder = require_createCompounder();
  var snakeCase2 = createCompounder(function(result, word, index2) {
    return result + (index2 ? "_" : "") + word.toLowerCase();
  });
  snakeCase_1 = snakeCase2;
  return snakeCase_1;
}
var snakeCaseExports = requireSnakeCase();
const snakeCase = /* @__PURE__ */ getDefaultExportFromCjs(snakeCaseExports);
var _baseSlice;
var hasRequired_baseSlice;
function require_baseSlice() {
  if (hasRequired_baseSlice) return _baseSlice;
  hasRequired_baseSlice = 1;
  function baseSlice(array2, start, end) {
    var index2 = -1, length = array2.length;
    if (start < 0) {
      start = -start > length ? 0 : length + start;
    }
    end = end > length ? length : end;
    if (end < 0) {
      end += length;
    }
    length = start > end ? 0 : end - start >>> 0;
    start >>>= 0;
    var result = Array(length);
    while (++index2 < length) {
      result[index2] = array2[index2 + start];
    }
    return result;
  }
  _baseSlice = baseSlice;
  return _baseSlice;
}
var _castSlice;
var hasRequired_castSlice;
function require_castSlice() {
  if (hasRequired_castSlice) return _castSlice;
  hasRequired_castSlice = 1;
  var baseSlice = require_baseSlice();
  function castSlice(array2, start, end) {
    var length = array2.length;
    end = end === void 0 ? length : end;
    return !start && end >= length ? array2 : baseSlice(array2, start, end);
  }
  _castSlice = castSlice;
  return _castSlice;
}
var _hasUnicode;
var hasRequired_hasUnicode;
function require_hasUnicode() {
  if (hasRequired_hasUnicode) return _hasUnicode;
  hasRequired_hasUnicode = 1;
  var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsVarRange = "\\ufe0e\\ufe0f";
  var rsZWJ = "\\u200d";
  var reHasUnicode = RegExp("[" + rsZWJ + rsAstralRange + rsComboRange + rsVarRange + "]");
  function hasUnicode(string2) {
    return reHasUnicode.test(string2);
  }
  _hasUnicode = hasUnicode;
  return _hasUnicode;
}
var _asciiToArray;
var hasRequired_asciiToArray;
function require_asciiToArray() {
  if (hasRequired_asciiToArray) return _asciiToArray;
  hasRequired_asciiToArray = 1;
  function asciiToArray(string2) {
    return string2.split("");
  }
  _asciiToArray = asciiToArray;
  return _asciiToArray;
}
var _unicodeToArray;
var hasRequired_unicodeToArray;
function require_unicodeToArray() {
  if (hasRequired_unicodeToArray) return _unicodeToArray;
  hasRequired_unicodeToArray = 1;
  var rsAstralRange = "\\ud800-\\udfff", rsComboMarksRange = "\\u0300-\\u036f", reComboHalfMarksRange = "\\ufe20-\\ufe2f", rsComboSymbolsRange = "\\u20d0-\\u20ff", rsComboRange = rsComboMarksRange + reComboHalfMarksRange + rsComboSymbolsRange, rsVarRange = "\\ufe0e\\ufe0f";
  var rsAstral = "[" + rsAstralRange + "]", rsCombo = "[" + rsComboRange + "]", rsFitz = "\\ud83c[\\udffb-\\udfff]", rsModifier = "(?:" + rsCombo + "|" + rsFitz + ")", rsNonAstral = "[^" + rsAstralRange + "]", rsRegional = "(?:\\ud83c[\\udde6-\\uddff]){2}", rsSurrPair = "[\\ud800-\\udbff][\\udc00-\\udfff]", rsZWJ = "\\u200d";
  var reOptMod = rsModifier + "?", rsOptVar = "[" + rsVarRange + "]?", rsOptJoin = "(?:" + rsZWJ + "(?:" + [rsNonAstral, rsRegional, rsSurrPair].join("|") + ")" + rsOptVar + reOptMod + ")*", rsSeq = rsOptVar + reOptMod + rsOptJoin, rsSymbol = "(?:" + [rsNonAstral + rsCombo + "?", rsCombo, rsRegional, rsSurrPair, rsAstral].join("|") + ")";
  var reUnicode = RegExp(rsFitz + "(?=" + rsFitz + ")|" + rsSymbol + rsSeq, "g");
  function unicodeToArray(string2) {
    return string2.match(reUnicode) || [];
  }
  _unicodeToArray = unicodeToArray;
  return _unicodeToArray;
}
var _stringToArray;
var hasRequired_stringToArray;
function require_stringToArray() {
  if (hasRequired_stringToArray) return _stringToArray;
  hasRequired_stringToArray = 1;
  var asciiToArray = require_asciiToArray(), hasUnicode = require_hasUnicode(), unicodeToArray = require_unicodeToArray();
  function stringToArray(string2) {
    return hasUnicode(string2) ? unicodeToArray(string2) : asciiToArray(string2);
  }
  _stringToArray = stringToArray;
  return _stringToArray;
}
var _createCaseFirst;
var hasRequired_createCaseFirst;
function require_createCaseFirst() {
  if (hasRequired_createCaseFirst) return _createCaseFirst;
  hasRequired_createCaseFirst = 1;
  var castSlice = require_castSlice(), hasUnicode = require_hasUnicode(), stringToArray = require_stringToArray(), toString2 = requireToString();
  function createCaseFirst(methodName) {
    return function(string2) {
      string2 = toString2(string2);
      var strSymbols = hasUnicode(string2) ? stringToArray(string2) : void 0;
      var chr = strSymbols ? strSymbols[0] : string2.charAt(0);
      var trailing = strSymbols ? castSlice(strSymbols, 1).join("") : string2.slice(1);
      return chr[methodName]() + trailing;
    };
  }
  _createCaseFirst = createCaseFirst;
  return _createCaseFirst;
}
var upperFirst_1;
var hasRequiredUpperFirst;
function requireUpperFirst() {
  if (hasRequiredUpperFirst) return upperFirst_1;
  hasRequiredUpperFirst = 1;
  var createCaseFirst = require_createCaseFirst();
  var upperFirst = createCaseFirst("toUpperCase");
  upperFirst_1 = upperFirst;
  return upperFirst_1;
}
var capitalize_1;
var hasRequiredCapitalize;
function requireCapitalize() {
  if (hasRequiredCapitalize) return capitalize_1;
  hasRequiredCapitalize = 1;
  var toString2 = requireToString(), upperFirst = requireUpperFirst();
  function capitalize(string2) {
    return upperFirst(toString2(string2).toLowerCase());
  }
  capitalize_1 = capitalize;
  return capitalize_1;
}
var camelCase_1;
var hasRequiredCamelCase;
function requireCamelCase() {
  if (hasRequiredCamelCase) return camelCase_1;
  hasRequiredCamelCase = 1;
  var capitalize = requireCapitalize(), createCompounder = require_createCompounder();
  var camelCase2 = createCompounder(function(result, word, index2) {
    word = word.toLowerCase();
    return result + (index2 ? capitalize(word) : word);
  });
  camelCase_1 = camelCase2;
  return camelCase_1;
}
var camelCaseExports = requireCamelCase();
const camelCase = /* @__PURE__ */ getDefaultExportFromCjs(camelCaseExports);
var mapKeys_1;
var hasRequiredMapKeys;
function requireMapKeys() {
  if (hasRequiredMapKeys) return mapKeys_1;
  hasRequiredMapKeys = 1;
  var baseAssignValue = require_baseAssignValue(), baseForOwn = require_baseForOwn(), baseIteratee = require_baseIteratee();
  function mapKeys2(object2, iteratee) {
    var result = {};
    iteratee = baseIteratee(iteratee, 3);
    baseForOwn(object2, function(value, key, object3) {
      baseAssignValue(result, iteratee(value, key, object3), value);
    });
    return result;
  }
  mapKeys_1 = mapKeys2;
  return mapKeys_1;
}
var mapKeysExports = requireMapKeys();
const mapKeys = /* @__PURE__ */ getDefaultExportFromCjs(mapKeysExports);
var toposort$1 = { exports: {} };
var hasRequiredToposort;
function requireToposort() {
  if (hasRequiredToposort) return toposort$1.exports;
  hasRequiredToposort = 1;
  toposort$1.exports = function(edges) {
    return toposort2(uniqueNodes(edges), edges);
  };
  toposort$1.exports.array = toposort2;
  function toposort2(nodes, edges) {
    var cursor = nodes.length, sorted = new Array(cursor), visited = {}, i = cursor, outgoingEdges = makeOutgoingEdges(edges), nodesHash = makeNodesHash(nodes);
    edges.forEach(function(edge) {
      if (!nodesHash.has(edge[0]) || !nodesHash.has(edge[1])) {
        throw new Error("Unknown node. There is an unknown node in the supplied edges.");
      }
    });
    while (i--) {
      if (!visited[i]) visit(nodes[i], i, /* @__PURE__ */ new Set());
    }
    return sorted;
    function visit(node, i2, predecessors) {
      if (predecessors.has(node)) {
        var nodeRep;
        try {
          nodeRep = ", node was:" + JSON.stringify(node);
        } catch (e) {
          nodeRep = "";
        }
        throw new Error("Cyclic dependency" + nodeRep);
      }
      if (!nodesHash.has(node)) {
        throw new Error("Found unknown node. Make sure to provided all involved nodes. Unknown node: " + JSON.stringify(node));
      }
      if (visited[i2]) return;
      visited[i2] = true;
      var outgoing = outgoingEdges.get(node) || /* @__PURE__ */ new Set();
      outgoing = Array.from(outgoing);
      if (i2 = outgoing.length) {
        predecessors.add(node);
        do {
          var child = outgoing[--i2];
          visit(child, nodesHash.get(child), predecessors);
        } while (i2);
        predecessors.delete(node);
      }
      sorted[--cursor] = node;
    }
  }
  function uniqueNodes(arr) {
    var res = /* @__PURE__ */ new Set();
    for (var i = 0, len = arr.length; i < len; i++) {
      var edge = arr[i];
      res.add(edge[0]);
      res.add(edge[1]);
    }
    return Array.from(res);
  }
  function makeOutgoingEdges(arr) {
    var edges = /* @__PURE__ */ new Map();
    for (var i = 0, len = arr.length; i < len; i++) {
      var edge = arr[i];
      if (!edges.has(edge[0])) edges.set(edge[0], /* @__PURE__ */ new Set());
      if (!edges.has(edge[1])) edges.set(edge[1], /* @__PURE__ */ new Set());
      edges.get(edge[0]).add(edge[1]);
    }
    return edges;
  }
  function makeNodesHash(arr) {
    var res = /* @__PURE__ */ new Map();
    for (var i = 0, len = arr.length; i < len; i++) {
      res.set(arr[i], i);
    }
    return res;
  }
  return toposort$1.exports;
}
var toposortExports = requireToposort();
const toposort = /* @__PURE__ */ getDefaultExportFromCjs(toposortExports);
function sortFields(fields2, excludes = []) {
  let edges = [];
  let nodes = [];
  function addNode(depPath, key) {
    var node = propertyExprExports.split(depPath)[0];
    if (!~nodes.indexOf(node)) nodes.push(node);
    if (!~excludes.indexOf(`${key}-${node}`)) edges.push([key, node]);
  }
  for (const key in fields2) if (has(fields2, key)) {
    let value = fields2[key];
    if (!~nodes.indexOf(key)) nodes.push(key);
    if (Reference.isRef(value) && value.isSibling) addNode(value.path, key);
    else if (isSchema(value) && "deps" in value) value.deps.forEach((path) => addNode(path, key));
  }
  return toposort.array(nodes, edges).reverse();
}
function findIndex(arr, err) {
  let idx = Infinity;
  arr.some((key, ii) => {
    var _err$path;
    if (((_err$path = err.path) == null ? void 0 : _err$path.indexOf(key)) !== -1) {
      idx = ii;
      return true;
    }
  });
  return idx;
}
function sortByKeyOrder(keys) {
  return (a, b) => {
    return findIndex(keys, a) - findIndex(keys, b);
  };
}
function _extends$1() {
  _extends$1 = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends$1.apply(this, arguments);
}
let isObject$1 = (obj) => Object.prototype.toString.call(obj) === "[object Object]";
function unknown$1(ctx, value) {
  let known = Object.keys(ctx.fields);
  return Object.keys(value).filter((key) => known.indexOf(key) === -1);
}
const defaultSort = sortByKeyOrder([]);
class ObjectSchema extends BaseSchema {
  constructor(spec) {
    super({
      type: "object"
    });
    this.fields = /* @__PURE__ */ Object.create(null);
    this._sortErrors = defaultSort;
    this._nodes = [];
    this._excludedEdges = [];
    this.withMutation(() => {
      this.transform(function coerce(value) {
        if (typeof value === "string") {
          try {
            value = JSON.parse(value);
          } catch (err) {
            value = null;
          }
        }
        if (this.isType(value)) return value;
        return null;
      });
      if (spec) {
        this.shape(spec);
      }
    });
  }
  _typeCheck(value) {
    return isObject$1(value) || typeof value === "function";
  }
  _cast(_value, options2 = {}) {
    var _options$stripUnknown;
    let value = super._cast(_value, options2);
    if (value === void 0) return this.getDefault();
    if (!this._typeCheck(value)) return value;
    let fields2 = this.fields;
    let strip = (_options$stripUnknown = options2.stripUnknown) != null ? _options$stripUnknown : this.spec.noUnknown;
    let props = this._nodes.concat(Object.keys(value).filter((v) => this._nodes.indexOf(v) === -1));
    let intermediateValue = {};
    let innerOptions = _extends$1({}, options2, {
      parent: intermediateValue,
      __validating: options2.__validating || false
    });
    let isChanged = false;
    for (const prop of props) {
      let field = fields2[prop];
      let exists = has(value, prop);
      if (field) {
        let fieldValue;
        let inputValue = value[prop];
        innerOptions.path = (options2.path ? `${options2.path}.` : "") + prop;
        field = field.resolve({
          value: inputValue,
          context: options2.context,
          parent: intermediateValue
        });
        let fieldSpec = "spec" in field ? field.spec : void 0;
        let strict = fieldSpec == null ? void 0 : fieldSpec.strict;
        if (fieldSpec == null ? void 0 : fieldSpec.strip) {
          isChanged = isChanged || prop in value;
          continue;
        }
        fieldValue = !options2.__validating || !strict ? (
          // TODO: use _cast, this is double resolving
          field.cast(value[prop], innerOptions)
        ) : value[prop];
        if (fieldValue !== void 0) {
          intermediateValue[prop] = fieldValue;
        }
      } else if (exists && !strip) {
        intermediateValue[prop] = value[prop];
      }
      if (intermediateValue[prop] !== value[prop]) {
        isChanged = true;
      }
    }
    return isChanged ? intermediateValue : value;
  }
  _validate(_value, opts = {}, callback) {
    let errors = [];
    let {
      sync,
      from = [],
      originalValue = _value,
      abortEarly = this.spec.abortEarly,
      recursive = this.spec.recursive
    } = opts;
    from = [{
      schema: this,
      value: originalValue
    }, ...from];
    opts.__validating = true;
    opts.originalValue = originalValue;
    opts.from = from;
    super._validate(_value, opts, (err, value) => {
      if (err) {
        if (!ValidationError$1.isError(err) || abortEarly) {
          return void callback(err, value);
        }
        errors.push(err);
      }
      if (!recursive || !isObject$1(value)) {
        callback(errors[0] || null, value);
        return;
      }
      originalValue = originalValue || value;
      let tests = this._nodes.map((key) => (_2, cb) => {
        let path = key.indexOf(".") === -1 ? (opts.path ? `${opts.path}.` : "") + key : `${opts.path || ""}["${key}"]`;
        let field = this.fields[key];
        if (field && "validate" in field) {
          field.validate(value[key], _extends$1({}, opts, {
            // @ts-ignore
            path,
            from,
            // inner fields are always strict:
            // 1. this isn't strict so the casting will also have cast inner values
            // 2. this is strict in which case the nested values weren't cast either
            strict: true,
            parent: value,
            originalValue: originalValue[key]
          }), cb);
          return;
        }
        cb(null);
      });
      runTests({
        tests,
        value,
        errors,
        endEarly: abortEarly,
        sort: this._sortErrors,
        path: opts.path
      }, callback);
    });
  }
  clone(spec) {
    const next = super.clone(spec);
    next.fields = _extends$1({}, this.fields);
    next._nodes = this._nodes;
    next._excludedEdges = this._excludedEdges;
    next._sortErrors = this._sortErrors;
    return next;
  }
  concat(schema) {
    let next = super.concat(schema);
    let nextFields = next.fields;
    for (let [field, schemaOrRef] of Object.entries(this.fields)) {
      const target = nextFields[field];
      if (target === void 0) {
        nextFields[field] = schemaOrRef;
      } else if (target instanceof BaseSchema && schemaOrRef instanceof BaseSchema) {
        nextFields[field] = schemaOrRef.concat(target);
      }
    }
    return next.withMutation(() => next.shape(nextFields));
  }
  getDefaultFromShape() {
    let dft = {};
    this._nodes.forEach((key) => {
      const field = this.fields[key];
      dft[key] = "default" in field ? field.getDefault() : void 0;
    });
    return dft;
  }
  _getDefault() {
    if ("default" in this.spec) {
      return super._getDefault();
    }
    if (!this._nodes.length) {
      return void 0;
    }
    return this.getDefaultFromShape();
  }
  shape(additions, excludes = []) {
    let next = this.clone();
    let fields2 = Object.assign(next.fields, additions);
    next.fields = fields2;
    next._sortErrors = sortByKeyOrder(Object.keys(fields2));
    if (excludes.length) {
      if (!Array.isArray(excludes[0])) excludes = [excludes];
      let keys = excludes.map(([first, second]) => `${first}-${second}`);
      next._excludedEdges = next._excludedEdges.concat(keys);
    }
    next._nodes = sortFields(fields2, next._excludedEdges);
    return next;
  }
  pick(keys) {
    const picked = {};
    for (const key of keys) {
      if (this.fields[key]) picked[key] = this.fields[key];
    }
    return this.clone().withMutation((next) => {
      next.fields = {};
      return next.shape(picked);
    });
  }
  omit(keys) {
    const next = this.clone();
    const fields2 = next.fields;
    next.fields = {};
    for (const key of keys) {
      delete fields2[key];
    }
    return next.withMutation(() => next.shape(fields2));
  }
  from(from, to, alias) {
    let fromGetter = propertyExprExports.getter(from, true);
    return this.transform((obj) => {
      if (obj == null) return obj;
      let newObj = obj;
      if (has(obj, from)) {
        newObj = _extends$1({}, obj);
        if (!alias) delete newObj[from];
        newObj[to] = fromGetter(obj);
      }
      return newObj;
    });
  }
  noUnknown(noAllow = true, message = object$1.noUnknown) {
    if (typeof noAllow === "string") {
      message = noAllow;
      noAllow = true;
    }
    let next = this.test({
      name: "noUnknown",
      exclusive: true,
      message,
      test(value) {
        if (value == null) return true;
        const unknownKeys = unknown$1(this.schema, value);
        return !noAllow || unknownKeys.length === 0 || this.createError({
          params: {
            unknown: unknownKeys.join(", ")
          }
        });
      }
    });
    next.spec.noUnknown = noAllow;
    return next;
  }
  unknown(allow = true, message = object$1.noUnknown) {
    return this.noUnknown(!allow, message);
  }
  transformKeys(fn) {
    return this.transform((obj) => obj && mapKeys(obj, (_2, key) => fn(key)));
  }
  camelCase() {
    return this.transformKeys(camelCase);
  }
  snakeCase() {
    return this.transformKeys(snakeCase);
  }
  constantCase() {
    return this.transformKeys((key) => snakeCase(key).toUpperCase());
  }
  describe() {
    let base = super.describe();
    base.fields = mapValues(this.fields, (value) => value.describe());
    return base;
  }
}
function create$1(spec) {
  return new ObjectSchema(spec);
}
create$1.prototype = ObjectSchema.prototype;
function _extends() {
  _extends = Object.assign || function(target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i];
      for (var key in source) {
        if (Object.prototype.hasOwnProperty.call(source, key)) {
          target[key] = source[key];
        }
      }
    }
    return target;
  };
  return _extends.apply(this, arguments);
}
function create(type) {
  return new ArraySchema(type);
}
class ArraySchema extends BaseSchema {
  constructor(type) {
    super({
      type: "array"
    });
    this.innerType = type;
    this.withMutation(() => {
      this.transform(function(values) {
        if (typeof values === "string") try {
          values = JSON.parse(values);
        } catch (err) {
          values = null;
        }
        return this.isType(values) ? values : null;
      });
    });
  }
  _typeCheck(v) {
    return Array.isArray(v);
  }
  get _subType() {
    return this.innerType;
  }
  _cast(_value, _opts) {
    const value = super._cast(_value, _opts);
    if (!this._typeCheck(value) || !this.innerType) return value;
    let isChanged = false;
    const castArray = value.map((v, idx) => {
      const castElement = this.innerType.cast(v, _extends({}, _opts, {
        path: `${_opts.path || ""}[${idx}]`
      }));
      if (castElement !== v) {
        isChanged = true;
      }
      return castElement;
    });
    return isChanged ? castArray : value;
  }
  _validate(_value, options2 = {}, callback) {
    var _options$abortEarly, _options$recursive;
    let errors = [];
    options2.sync;
    let path = options2.path;
    let innerType = this.innerType;
    let endEarly = (_options$abortEarly = options2.abortEarly) != null ? _options$abortEarly : this.spec.abortEarly;
    let recursive = (_options$recursive = options2.recursive) != null ? _options$recursive : this.spec.recursive;
    let originalValue = options2.originalValue != null ? options2.originalValue : _value;
    super._validate(_value, options2, (err, value) => {
      if (err) {
        if (!ValidationError$1.isError(err) || endEarly) {
          return void callback(err, value);
        }
        errors.push(err);
      }
      if (!recursive || !innerType || !this._typeCheck(value)) {
        callback(errors[0] || null, value);
        return;
      }
      originalValue = originalValue || value;
      let tests = new Array(value.length);
      for (let idx = 0; idx < value.length; idx++) {
        let item = value[idx];
        let path2 = `${options2.path || ""}[${idx}]`;
        let innerOptions = _extends({}, options2, {
          path: path2,
          strict: true,
          parent: value,
          index: idx,
          originalValue: originalValue[idx]
        });
        tests[idx] = (_2, cb) => innerType.validate(item, innerOptions, cb);
      }
      runTests({
        path,
        value,
        errors,
        endEarly,
        tests
      }, callback);
    });
  }
  clone(spec) {
    const next = super.clone(spec);
    next.innerType = this.innerType;
    return next;
  }
  concat(schema) {
    let next = super.concat(schema);
    next.innerType = this.innerType;
    if (schema.innerType) next.innerType = next.innerType ? (
      // @ts-expect-error Lazy doesn't have concat()
      next.innerType.concat(schema.innerType)
    ) : schema.innerType;
    return next;
  }
  of(schema) {
    let next = this.clone();
    if (!isSchema(schema)) throw new TypeError("`array.of()` sub-schema must be a valid yup schema not: " + printValue$1(schema));
    next.innerType = schema;
    return next;
  }
  length(length, message = array$1.length) {
    return this.test({
      message,
      name: "length",
      exclusive: true,
      params: {
        length
      },
      test(value) {
        return isAbsent(value) || value.length === this.resolve(length);
      }
    });
  }
  min(min, message) {
    message = message || array$1.min;
    return this.test({
      message,
      name: "min",
      exclusive: true,
      params: {
        min
      },
      // FIXME(ts): Array<typeof T>
      test(value) {
        return isAbsent(value) || value.length >= this.resolve(min);
      }
    });
  }
  max(max, message) {
    message = message || array$1.max;
    return this.test({
      message,
      name: "max",
      exclusive: true,
      params: {
        max
      },
      test(value) {
        return isAbsent(value) || value.length <= this.resolve(max);
      }
    });
  }
  ensure() {
    return this.default(() => []).transform((val, original) => {
      if (this._typeCheck(val)) return val;
      return original == null ? [] : [].concat(original);
    });
  }
  compact(rejector) {
    let reject = !rejector ? (v) => !!v : (v, i, a) => !rejector(v, i, a);
    return this.transform((values) => values != null ? values.filter(reject) : values);
  }
  describe() {
    let base = super.describe();
    if (this.innerType) base.innerType = this.innerType.describe();
    return base;
  }
  nullable(isNullable = true) {
    return super.nullable(isNullable);
  }
  defined() {
    return super.defined();
  }
  required(msg) {
    return super.required(msg);
  }
}
create.prototype = ArraySchema.prototype;
function setLocale(custom) {
  Object.keys(custom).forEach((type) => {
    Object.keys(custom[type]).forEach((method) => {
      locale[type][method] = custom[type][method];
    });
  });
}
function addMethod(schemaType, name, fn) {
  if (!schemaType || !isSchema(schemaType.prototype)) throw new TypeError("You must provide a yup schema constructor function");
  if (typeof name !== "string") throw new TypeError("A Method name must be provided");
  if (typeof fn !== "function") throw new TypeError("Method function must be provided");
  schemaType.prototype[name] = fn;
}
var httpErrors = { exports: {} };
/*!
 * depd
 * Copyright(c) 2015 Douglas Christopher Wilson
 * MIT Licensed
 */
var browser;
var hasRequiredBrowser;
function requireBrowser() {
  if (hasRequiredBrowser) return browser;
  hasRequiredBrowser = 1;
  browser = depd;
  function depd(namespace) {
    if (!namespace) {
      throw new TypeError("argument namespace is required");
    }
    function deprecate(message) {
    }
    deprecate._file = void 0;
    deprecate._ignored = true;
    deprecate._namespace = namespace;
    deprecate._traced = false;
    deprecate._warned = /* @__PURE__ */ Object.create(null);
    deprecate.function = wrapfunction;
    deprecate.property = wrapproperty;
    return deprecate;
  }
  function wrapfunction(fn, message) {
    if (typeof fn !== "function") {
      throw new TypeError("argument fn must be a function");
    }
    return fn;
  }
  function wrapproperty(obj, prop, message) {
    if (!obj || typeof obj !== "object" && typeof obj !== "function") {
      throw new TypeError("argument obj must be object");
    }
    var descriptor = Object.getOwnPropertyDescriptor(obj, prop);
    if (!descriptor) {
      throw new TypeError("must call property on owner object");
    }
    if (!descriptor.configurable) {
      throw new TypeError("property must be configurable");
    }
  }
  return browser;
}
var setprototypeof;
var hasRequiredSetprototypeof;
function requireSetprototypeof() {
  if (hasRequiredSetprototypeof) return setprototypeof;
  hasRequiredSetprototypeof = 1;
  setprototypeof = Object.setPrototypeOf || ({ __proto__: [] } instanceof Array ? setProtoOf : mixinProperties);
  function setProtoOf(obj, proto) {
    obj.__proto__ = proto;
    return obj;
  }
  function mixinProperties(obj, proto) {
    for (var prop in proto) {
      if (!Object.prototype.hasOwnProperty.call(obj, prop)) {
        obj[prop] = proto[prop];
      }
    }
    return obj;
  }
  return setprototypeof;
}
const require$$0 = {
  "100": "Continue",
  "101": "Switching Protocols",
  "102": "Processing",
  "103": "Early Hints",
  "200": "OK",
  "201": "Created",
  "202": "Accepted",
  "203": "Non-Authoritative Information",
  "204": "No Content",
  "205": "Reset Content",
  "206": "Partial Content",
  "207": "Multi-Status",
  "208": "Already Reported",
  "226": "IM Used",
  "300": "Multiple Choices",
  "301": "Moved Permanently",
  "302": "Found",
  "303": "See Other",
  "304": "Not Modified",
  "305": "Use Proxy",
  "307": "Temporary Redirect",
  "308": "Permanent Redirect",
  "400": "Bad Request",
  "401": "Unauthorized",
  "402": "Payment Required",
  "403": "Forbidden",
  "404": "Not Found",
  "405": "Method Not Allowed",
  "406": "Not Acceptable",
  "407": "Proxy Authentication Required",
  "408": "Request Timeout",
  "409": "Conflict",
  "410": "Gone",
  "411": "Length Required",
  "412": "Precondition Failed",
  "413": "Payload Too Large",
  "414": "URI Too Long",
  "415": "Unsupported Media Type",
  "416": "Range Not Satisfiable",
  "417": "Expectation Failed",
  "418": "I'm a Teapot",
  "421": "Misdirected Request",
  "422": "Unprocessable Entity",
  "423": "Locked",
  "424": "Failed Dependency",
  "425": "Too Early",
  "426": "Upgrade Required",
  "428": "Precondition Required",
  "429": "Too Many Requests",
  "431": "Request Header Fields Too Large",
  "451": "Unavailable For Legal Reasons",
  "500": "Internal Server Error",
  "501": "Not Implemented",
  "502": "Bad Gateway",
  "503": "Service Unavailable",
  "504": "Gateway Timeout",
  "505": "HTTP Version Not Supported",
  "506": "Variant Also Negotiates",
  "507": "Insufficient Storage",
  "508": "Loop Detected",
  "509": "Bandwidth Limit Exceeded",
  "510": "Not Extended",
  "511": "Network Authentication Required"
};
/*!
 * statuses
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
var statuses;
var hasRequiredStatuses;
function requireStatuses() {
  if (hasRequiredStatuses) return statuses;
  hasRequiredStatuses = 1;
  var codes = require$$0;
  statuses = status;
  status.message = codes;
  status.code = createMessageToStatusCodeMap(codes);
  status.codes = createStatusCodeList(codes);
  status.redirect = {
    300: true,
    301: true,
    302: true,
    303: true,
    305: true,
    307: true,
    308: true
  };
  status.empty = {
    204: true,
    205: true,
    304: true
  };
  status.retry = {
    502: true,
    503: true,
    504: true
  };
  function createMessageToStatusCodeMap(codes2) {
    var map2 = {};
    Object.keys(codes2).forEach(function forEachCode(code) {
      var message = codes2[code];
      var status2 = Number(code);
      map2[message.toLowerCase()] = status2;
    });
    return map2;
  }
  function createStatusCodeList(codes2) {
    return Object.keys(codes2).map(function mapCode(code) {
      return Number(code);
    });
  }
  function getStatusCode(message) {
    var msg = message.toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(status.code, msg)) {
      throw new Error('invalid status message: "' + message + '"');
    }
    return status.code[msg];
  }
  function getStatusMessage(code) {
    if (!Object.prototype.hasOwnProperty.call(status.message, code)) {
      throw new Error("invalid status code: " + code);
    }
    return status.message[code];
  }
  function status(code) {
    if (typeof code === "number") {
      return getStatusMessage(code);
    }
    if (typeof code !== "string") {
      throw new TypeError("code must be a number or string");
    }
    var n = parseInt(code, 10);
    if (!isNaN(n)) {
      return getStatusMessage(n);
    }
    return getStatusCode(code);
  }
  return statuses;
}
var inherits_browser = { exports: {} };
var hasRequiredInherits_browser;
function requireInherits_browser() {
  if (hasRequiredInherits_browser) return inherits_browser.exports;
  hasRequiredInherits_browser = 1;
  if (typeof Object.create === "function") {
    inherits_browser.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        ctor.prototype = Object.create(superCtor.prototype, {
          constructor: {
            value: ctor,
            enumerable: false,
            writable: true,
            configurable: true
          }
        });
      }
    };
  } else {
    inherits_browser.exports = function inherits(ctor, superCtor) {
      if (superCtor) {
        ctor.super_ = superCtor;
        var TempCtor = function() {
        };
        TempCtor.prototype = superCtor.prototype;
        ctor.prototype = new TempCtor();
        ctor.prototype.constructor = ctor;
      }
    };
  }
  return inherits_browser.exports;
}
/*!
 * toidentifier
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
var toidentifier;
var hasRequiredToidentifier;
function requireToidentifier() {
  if (hasRequiredToidentifier) return toidentifier;
  hasRequiredToidentifier = 1;
  toidentifier = toIdentifier;
  function toIdentifier(str) {
    return str.split(" ").map(function(token) {
      return token.slice(0, 1).toUpperCase() + token.slice(1);
    }).join("").replace(/[^ _0-9a-z]/gi, "");
  }
  return toidentifier;
}
/*!
 * http-errors
 * Copyright(c) 2014 Jonathan Ong
 * Copyright(c) 2016 Douglas Christopher Wilson
 * MIT Licensed
 */
var hasRequiredHttpErrors;
function requireHttpErrors() {
  if (hasRequiredHttpErrors) return httpErrors.exports;
  hasRequiredHttpErrors = 1;
  (function(module) {
    var deprecate = requireBrowser()("http-errors");
    var setPrototypeOf = requireSetprototypeof();
    var statuses2 = requireStatuses();
    var inherits = requireInherits_browser();
    var toIdentifier = requireToidentifier();
    module.exports = createError2;
    module.exports.HttpError = createHttpErrorConstructor();
    module.exports.isHttpError = createIsHttpErrorFunction(module.exports.HttpError);
    populateConstructorExports(module.exports, statuses2.codes, module.exports.HttpError);
    function codeClass(status) {
      return Number(String(status).charAt(0) + "00");
    }
    function createError2() {
      var err;
      var msg;
      var status = 500;
      var props = {};
      for (var i = 0; i < arguments.length; i++) {
        var arg = arguments[i];
        var type = typeof arg;
        if (type === "object" && arg instanceof Error) {
          err = arg;
          status = err.status || err.statusCode || status;
        } else if (type === "number" && i === 0) {
          status = arg;
        } else if (type === "string") {
          msg = arg;
        } else if (type === "object") {
          props = arg;
        } else {
          throw new TypeError("argument #" + (i + 1) + " unsupported type " + type);
        }
      }
      if (typeof status === "number" && (status < 400 || status >= 600)) {
        deprecate("non-error status code; use only 4xx or 5xx status codes");
      }
      if (typeof status !== "number" || !statuses2.message[status] && (status < 400 || status >= 600)) {
        status = 500;
      }
      var HttpError = createError2[status] || createError2[codeClass(status)];
      if (!err) {
        err = HttpError ? new HttpError(msg) : new Error(msg || statuses2.message[status]);
        Error.captureStackTrace(err, createError2);
      }
      if (!HttpError || !(err instanceof HttpError) || err.status !== status) {
        err.expose = status < 500;
        err.status = err.statusCode = status;
      }
      for (var key in props) {
        if (key !== "status" && key !== "statusCode") {
          err[key] = props[key];
        }
      }
      return err;
    }
    function createHttpErrorConstructor() {
      function HttpError() {
        throw new TypeError("cannot construct abstract class");
      }
      inherits(HttpError, Error);
      return HttpError;
    }
    function createClientErrorConstructor(HttpError, name, code) {
      var className = toClassName(name);
      function ClientError(message) {
        var msg = message != null ? message : statuses2.message[code];
        var err = new Error(msg);
        Error.captureStackTrace(err, ClientError);
        setPrototypeOf(err, ClientError.prototype);
        Object.defineProperty(err, "message", {
          enumerable: true,
          configurable: true,
          value: msg,
          writable: true
        });
        Object.defineProperty(err, "name", {
          enumerable: false,
          configurable: true,
          value: className,
          writable: true
        });
        return err;
      }
      inherits(ClientError, HttpError);
      nameFunc(ClientError, className);
      ClientError.prototype.status = code;
      ClientError.prototype.statusCode = code;
      ClientError.prototype.expose = true;
      return ClientError;
    }
    function createIsHttpErrorFunction(HttpError) {
      return function isHttpError(val) {
        if (!val || typeof val !== "object") {
          return false;
        }
        if (val instanceof HttpError) {
          return true;
        }
        return val instanceof Error && typeof val.expose === "boolean" && typeof val.statusCode === "number" && val.status === val.statusCode;
      };
    }
    function createServerErrorConstructor(HttpError, name, code) {
      var className = toClassName(name);
      function ServerError(message) {
        var msg = message != null ? message : statuses2.message[code];
        var err = new Error(msg);
        Error.captureStackTrace(err, ServerError);
        setPrototypeOf(err, ServerError.prototype);
        Object.defineProperty(err, "message", {
          enumerable: true,
          configurable: true,
          value: msg,
          writable: true
        });
        Object.defineProperty(err, "name", {
          enumerable: false,
          configurable: true,
          value: className,
          writable: true
        });
        return err;
      }
      inherits(ServerError, HttpError);
      nameFunc(ServerError, className);
      ServerError.prototype.status = code;
      ServerError.prototype.statusCode = code;
      ServerError.prototype.expose = false;
      return ServerError;
    }
    function nameFunc(func, name) {
      var desc = Object.getOwnPropertyDescriptor(func, "name");
      if (desc && desc.configurable) {
        desc.value = name;
        Object.defineProperty(func, "name", desc);
      }
    }
    function populateConstructorExports(exports, codes, HttpError) {
      codes.forEach(function forEachCode(code) {
        var CodeError;
        var name = toIdentifier(statuses2.message[code]);
        switch (codeClass(code)) {
          case 400:
            CodeError = createClientErrorConstructor(HttpError, name, code);
            break;
          case 500:
            CodeError = createServerErrorConstructor(HttpError, name, code);
            break;
        }
        if (CodeError) {
          exports[code] = CodeError;
          exports[name] = CodeError;
        }
      });
    }
    function toClassName(name) {
      return name.substr(-5) !== "Error" ? name + "Error" : name;
    }
  })(httpErrors);
  return httpErrors.exports;
}
requireHttpErrors();
class ApplicationError extends Error {
  constructor(message = "An application error occurred", details = {}) {
    super();
    this.name = "ApplicationError";
    this.message = message;
    this.details = details;
  }
}
class ValidationError2 extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = "ValidationError";
  }
}
const GROUP_OPERATORS = [
  "$and",
  "$or"
];
const WHERE_OPERATORS = [
  "$not",
  "$in",
  "$notIn",
  "$eq",
  "$eqi",
  "$ne",
  "$nei",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$null",
  "$notNull",
  "$between",
  "$startsWith",
  "$endsWith",
  "$startsWithi",
  "$endsWithi",
  "$contains",
  "$notContains",
  "$containsi",
  "$notContainsi",
  // Experimental, only for internal use
  "$jsonSupersetOf"
];
const CAST_OPERATORS = [
  "$not",
  "$in",
  "$notIn",
  "$eq",
  "$ne",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$between"
];
const ARRAY_OPERATORS = [
  "$in",
  "$notIn",
  "$between"
];
const OPERATORS = {
  where: WHERE_OPERATORS,
  cast: CAST_OPERATORS,
  group: GROUP_OPERATORS,
  array: ARRAY_OPERATORS
};
const OPERATORS_LOWERCASE = Object.fromEntries(Object.entries(OPERATORS).map(([key, values]) => [
  key,
  values.map((value) => value.toLowerCase())
]));
const isObjKey = (key, obj) => {
  return key in obj;
};
const isOperatorOfType = (type, key, ignoreCase = false) => {
  if (ignoreCase) {
    return OPERATORS_LOWERCASE[type]?.includes(key.toLowerCase()) ?? false;
  }
  if (isObjKey(type, OPERATORS)) {
    return OPERATORS[type]?.includes(key) ?? false;
  }
  return false;
};
const isOperator = (key, ignoreCase = false) => {
  return Object.keys(OPERATORS).some((type) => isOperatorOfType(type, key, ignoreCase));
};
const isPlainObject$1 = (value) => _.isPlainObject(value);
function getMeaningfulSortSegments(sort2) {
  return sort2.split(",").map((segment) => segment.trim()).filter((segment) => {
    if (segment.length === 0) {
      return false;
    }
    const [field] = segment.split(":");
    return field.trim().length > 0;
  });
}
function hasMeaningfulSortObject(sort2) {
  return Object.keys(sort2).some((key) => {
    const order2 = sort2[key];
    if (typeof order2 === "string") {
      return order2.length > 0;
    }
    if (isPlainObject$1(order2)) {
      return hasMeaningfulSortObject(order2);
    }
    return false;
  });
}
function hasMeaningfulStringSort(sort2) {
  return getMeaningfulSortSegments(sort2).length > 0;
}
function hasSort(sort2) {
  if (sort2 === void 0 || sort2 === null) {
    return false;
  }
  if (typeof sort2 === "string") {
    return hasMeaningfulStringSort(sort2);
  }
  if (Array.isArray(sort2)) {
    if (sort2.length === 0) {
      return false;
    }
    return sort2.some((item) => {
      if (typeof item === "string") {
        return hasMeaningfulStringSort(item);
      }
      if (isPlainObject$1(item)) {
        return hasMeaningfulSortObject(item);
      }
      return false;
    });
  }
  if (isPlainObject$1(sort2)) {
    return hasMeaningfulSortObject(sort2);
  }
  return false;
}
var indentString;
var hasRequiredIndentString;
function requireIndentString() {
  if (hasRequiredIndentString) return indentString;
  hasRequiredIndentString = 1;
  indentString = (string2, count = 1, options2) => {
    options2 = {
      indent: " ",
      includeEmptyLines: false,
      ...options2
    };
    if (typeof string2 !== "string") {
      throw new TypeError(
        `Expected \`input\` to be a \`string\`, got \`${typeof string2}\``
      );
    }
    if (typeof count !== "number") {
      throw new TypeError(
        `Expected \`count\` to be a \`number\`, got \`${typeof count}\``
      );
    }
    if (typeof options2.indent !== "string") {
      throw new TypeError(
        `Expected \`options.indent\` to be a \`string\`, got \`${typeof options2.indent}\``
      );
    }
    if (count === 0) {
      return string2;
    }
    const regex = options2.includeEmptyLines ? /^/gm : /^(?!\s*$)/gm;
    return string2.replace(regex, options2.indent.repeat(count));
  };
  return indentString;
}
var cleanStack;
var hasRequiredCleanStack;
function requireCleanStack() {
  if (hasRequiredCleanStack) return cleanStack;
  hasRequiredCleanStack = 1;
  const os = require$$0$2;
  const extractPathRegex = /\s+at.*(?:\(|\s)(.*)\)?/;
  const pathRegex = /^(?:(?:(?:node|(?:internal\/[\w/]*|.*node_modules\/(?:babel-polyfill|pirates)\/.*)?\w+)\.js:\d+:\d+)|native)/;
  const homeDir = typeof os.homedir === "undefined" ? "" : os.homedir();
  cleanStack = (stack, options2) => {
    options2 = Object.assign({ pretty: false }, options2);
    return stack.replace(/\\/g, "/").split("\n").filter((line) => {
      const pathMatches = line.match(extractPathRegex);
      if (pathMatches === null || !pathMatches[1]) {
        return true;
      }
      const match = pathMatches[1];
      if (match.includes(".app/Contents/Resources/electron.asar") || match.includes(".app/Contents/Resources/default_app.asar")) {
        return false;
      }
      return !pathRegex.test(match);
    }).filter((line) => line.trim() !== "").map((line) => {
      if (options2.pretty) {
        return line.replace(extractPathRegex, (m, p1) => m.replace(p1, p1.replace(homeDir, "~")));
      }
      return line;
    }).join("\n");
  };
  return cleanStack;
}
var aggregateError;
var hasRequiredAggregateError;
function requireAggregateError() {
  if (hasRequiredAggregateError) return aggregateError;
  hasRequiredAggregateError = 1;
  const indentString2 = requireIndentString();
  const cleanStack2 = requireCleanStack();
  const cleanInternalStack = (stack) => stack.replace(/\s+at .*aggregate-error\/index.js:\d+:\d+\)?/g, "");
  class AggregateError extends Error {
    constructor(errors) {
      if (!Array.isArray(errors)) {
        throw new TypeError(`Expected input to be an Array, got ${typeof errors}`);
      }
      errors = [...errors].map((error2) => {
        if (error2 instanceof Error) {
          return error2;
        }
        if (error2 !== null && typeof error2 === "object") {
          return Object.assign(new Error(error2.message), error2);
        }
        return new Error(error2);
      });
      let message = errors.map((error2) => {
        return typeof error2.stack === "string" ? cleanInternalStack(cleanStack2(error2.stack)) : String(error2);
      }).join("\n");
      message = "\n" + indentString2(message, 4);
      super(message);
      this.name = "AggregateError";
      Object.defineProperty(this, "_errors", { value: errors });
    }
    *[Symbol.iterator]() {
      for (const error2 of this._errors) {
        yield error2;
      }
    }
  }
  aggregateError = AggregateError;
  return aggregateError;
}
var pMap$1;
var hasRequiredPMap;
function requirePMap() {
  if (hasRequiredPMap) return pMap$1;
  hasRequiredPMap = 1;
  const AggregateError = requireAggregateError();
  pMap$1 = async (iterable, mapper, {
    concurrency = Infinity,
    stopOnError = true
  } = {}) => {
    return new Promise((resolve, reject) => {
      if (typeof mapper !== "function") {
        throw new TypeError("Mapper function is required");
      }
      if (!((Number.isSafeInteger(concurrency) || concurrency === Infinity) && concurrency >= 1)) {
        throw new TypeError(`Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`);
      }
      const result = [];
      const errors = [];
      const iterator = iterable[Symbol.iterator]();
      let isRejected = false;
      let isIterableDone = false;
      let resolvingCount = 0;
      let currentIndex = 0;
      const next = () => {
        if (isRejected) {
          return;
        }
        const nextItem = iterator.next();
        const index2 = currentIndex;
        currentIndex++;
        if (nextItem.done) {
          isIterableDone = true;
          if (resolvingCount === 0) {
            if (!stopOnError && errors.length !== 0) {
              reject(new AggregateError(errors));
            } else {
              resolve(result);
            }
          }
          return;
        }
        resolvingCount++;
        (async () => {
          try {
            const element = await nextItem.value;
            result[index2] = await mapper(element, index2);
            resolvingCount--;
            next();
          } catch (error2) {
            if (stopOnError) {
              isRejected = true;
              reject(error2);
            } else {
              errors.push(error2);
              resolvingCount--;
              next();
            }
          }
        })();
      };
      for (let i = 0; i < concurrency; i++) {
        next();
        if (isIterableDone) {
          break;
        }
      }
    });
  };
  return pMap$1;
}
var pMapExports = requirePMap();
const pMap = /* @__PURE__ */ getDefaultExportFromCjs(pMapExports);
function pipe$1(...fns) {
  const [firstFn, ...fnRest] = fns;
  return async (...args) => {
    let res = await firstFn.apply(firstFn, args);
    for (let i = 0; i < fnRest.length; i += 1) {
      res = await fnRest[i](res);
    }
    return res;
  };
}
curry(pMap);
const visitor$8 = ({ key, attribute }, { remove }) => {
  if (attribute?.type === "password") {
    remove(key);
  }
};
const visitor$7 = ({ schema, key, attribute }, { remove }) => {
  if (!attribute) {
    return;
  }
  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);
  if (isPrivate) {
    remove(key);
  }
};
const visitor$6 = ({ key, attribute }, { remove }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    remove(key);
  }
};
const visitor$5 = ({ key, attribute }, { remove }) => {
  if (isDynamicZoneAttribute(attribute)) {
    remove(key);
  }
};
const visitor$4 = ({ schema, key, value }, { set: set2 }) => {
  if (key === "" && value === "*") {
    const { attributes: attributes2 } = schema;
    const newPopulateQuery = Object.entries(attributes2).filter(([, attribute]) => [
      "relation",
      "component",
      "media",
      "dynamiczone"
    ].includes(attribute.type)).reduce((acc, [key2]) => ({
      ...acc,
      [key2]: true
    }), {});
    set2("", newPopulateQuery);
  }
};
const DEFAULT_PATH = {
  raw: null,
  attribute: null
};
var traverseFactory = (() => {
  const state = {
    parsers: [],
    interceptors: [],
    ignore: [],
    handlers: {
      attributes: [],
      common: []
    }
  };
  const traverse = async (visitor2, options2, data) => {
    const { path = DEFAULT_PATH, parent, schema, getModel } = options2 ?? {};
    for (const { predicate, handler } of state.interceptors) {
      if (predicate(data)) {
        return handler(visitor2, options2, data, {
          recurse: traverse
        });
      }
    }
    const parser = state.parsers.find((parser2) => parser2.predicate(data))?.parser;
    const utils2 = parser?.(data);
    if (!utils2) {
      return data;
    }
    let out = utils2.transform(data);
    const keys = utils2.keys(out);
    const handlers = [
      ...state.handlers.common,
      ...state.handlers.attributes
    ];
    const transformUtils = {
      remove(key) {
        out = utils2.remove(key, out);
      },
      set(key, value) {
        out = utils2.set(key, value, out);
      },
      recurse: traverse
    };
    const visitorUtils = {
      remove: transformUtils.remove,
      set: transformUtils.set
    };
    const handlerUtils = {
      set: transformUtils.set,
      recurse: transformUtils.recurse
    };
    for (const key of keys) {
      const attribute = schema?.attributes?.[key];
      let attributePath = path.attribute;
      if (attribute != null) {
        attributePath = path.attribute == null ? key : `${path.attribute}.${key}`;
      }
      const newPath = {
        raw: path.raw == null ? key : `${path.raw}.${key}`,
        attribute: attributePath
      };
      const visitorOptions = {
        key,
        value: utils2.get(key, out),
        attribute,
        schema,
        path: newPath,
        data: out,
        getModel,
        parent
      };
      await visitor2(visitorOptions, visitorUtils);
      const value = utils2.get(key, out);
      const createContext = () => ({
        key,
        value,
        attribute,
        schema,
        path: newPath,
        data: out,
        visitor: visitor2,
        getModel,
        parent
      });
      const ignoreCtx = createContext();
      const shouldIgnore = state.ignore.some((predicate) => predicate(ignoreCtx));
      if (shouldIgnore) {
        continue;
      }
      for (const handler of handlers) {
        const ctx = createContext();
        const predicated = handler.predicate(ctx);
        const pass = predicated != null && typeof predicated.then === "function" ? await predicated : predicated;
        if (pass) {
          const handled = handler.handler(ctx, handlerUtils);
          if (handled != null && typeof handled.then === "function") {
            await handled;
          }
        }
      }
    }
    return out;
  };
  return {
    traverse,
    intercept(predicate, handler) {
      state.interceptors.push({
        predicate,
        handler
      });
      return this;
    },
    parse(predicate, parser) {
      state.parsers.push({
        predicate,
        parser
      });
      return this;
    },
    ignore(predicate) {
      state.ignore.push(predicate);
      return this;
    },
    on(predicate, handler) {
      state.handlers.common.push({
        predicate,
        handler
      });
      return this;
    },
    onAttribute(predicate, handler) {
      state.handlers.attributes.push({
        predicate,
        handler
      });
      return this;
    },
    onRelation(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "relation", handler);
    },
    onMedia(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "media", handler);
    },
    onComponent(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "component", handler);
    },
    onDynamicZone(handler) {
      return this.onAttribute(({ attribute }) => attribute?.type === "dynamiczone", handler);
    }
  };
});
const isObj$2 = (value) => lodashExports.isObject(value);
const isFilterLikeObject = (value, schema) => Object.keys(value).some((k) => isOperator(k) || Boolean(schema?.attributes?.[k]));
const filters = traverseFactory().intercept(
  // Intercept filters arrays and apply the traversal to each one individually
  Array.isArray,
  async (visitor2, options2, filters2, { recurse }) => {
    return Promise.all(filters2.map((filter, i) => {
      const newPath = options2.path ? {
        ...options2.path,
        raw: `${options2.path.raw}[${i}]`
      } : options2.path;
      return recurse(visitor2, {
        ...options2,
        path: newPath
      }, filter);
    })).then((res) => res.filter((val) => !(lodashExports.isObject(val) && lodashExports.isEmpty(val))));
  }
).intercept(
  // Ignore non object filters and return the value as-is
  (filters2) => !lodashExports.isObject(filters2),
  (_2, __, filters2) => {
    return filters2;
  }
).parse(isObj$2, () => ({
  transform: lodashExports.cloneDeep,
  remove(key, data) {
    return lodashExports.omit(data, key);
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).ignore(({ value }) => value == null).on(({ attribute }) => attribute == null, async ({ key, visitor: visitor2, path, value, schema, getModel, attribute }, { set: set2, recurse }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  if (isOperator(key) && key !== "$not" && isObj$2(value) && !Array.isArray(value) && !isFilterLikeObject(value, schema)) {
    set2(key, value);
    return;
  }
  set2(key, await recurse(visitor2, {
    schema,
    path,
    getModel,
    parent
  }, value));
}).onRelation(async ({ key, attribute, visitor: visitor2, path, value, schema, getModel }, { set: set2, recurse }) => {
  const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
  if (isMorphRelation) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, attribute, visitor: visitor2, path, schema, value, getModel }, { set: set2, recurse }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, visitor: visitor2, path, schema, attribute, value, getModel }, { set: set2, recurse }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onAttribute(({ attribute, value }) => Boolean(isScalarAttribute(attribute)) && isObj$2(value) && !Array.isArray(value), async ({ key, visitor: visitor2, path, value, schema, getModel, attribute }, { set: set2, recurse }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  set2(key, await recurse(visitor2, {
    schema,
    path,
    getModel,
    parent
  }, value));
});
var traverseQueryFilters = curry(filters.traverse);
const ORDERS = {
  asc: "asc",
  desc: "desc"
};
const ORDER_VALUES = Object.values(ORDERS);
const isSortOrder = (value) => ORDER_VALUES.includes(value.toLowerCase());
const isStringArray$2 = (value) => Array.isArray(value) && value.every(lodashExports.isString);
const isObjectArray = (value) => Array.isArray(value) && value.every(lodashExports.isObject);
const isNestedSorts = (value) => lodashExports.isString(value) && value.split(",").length > 1;
const isObj$1 = (value) => lodashExports.isObject(value);
const isMeaninglessSortArray = (value) => Array.isArray(value) && !hasSort(value);
const sort = traverseFactory().intercept(isMeaninglessSortArray, async (_visitor, _options, sort2) => sort2).intercept(
  // String with chained sorts (foo,bar,foobar) => split, map(recurse), then recompose
  isNestedSorts,
  async (visitor2, options2, sort2, { recurse }) => {
    return Promise.all(sort2.split(",").map((value) => value.trim()).map((nestedSort) => recurse(visitor2, options2, nestedSort))).then((res) => res.filter((part) => !lodashExports.isEmpty(part)).join(","));
  }
).intercept(
  // Array of strings ['foo', 'foo,bar'] => map(recurse), then filter out empty items
  isStringArray$2,
  async (visitor2, options2, sort2, { recurse }) => {
    return Promise.all(sort2.map((nestedSort) => recurse(visitor2, options2, nestedSort))).then((res) => res.filter((nestedSort) => !lodashExports.isEmpty(nestedSort)));
  }
).intercept(
  // Array of objects [{ foo: 'asc' }, { bar: 'desc', baz: 'asc' }] => map(recurse), then filter out empty items
  isObjectArray,
  async (visitor2, options2, sort2, { recurse }) => {
    return Promise.all(sort2.map((nestedSort) => recurse(visitor2, options2, nestedSort))).then((res) => res.filter((nestedSort) => !lodashExports.isEmpty(nestedSort)));
  }
).parse(lodashExports.isString, () => {
  const tokenize = (value) => (value ?? "").split(".").flatMap((part) => part.split(":"));
  const recompose = (parts) => {
    if (parts.length === 0) {
      return void 0;
    }
    return parts.reduce((acc, part) => {
      if (lodashExports.isEmpty(part)) {
        return acc;
      }
      if (acc === "") {
        return part;
      }
      return isSortOrder(part) ? `${acc}:${part}` : `${acc}.${part}`;
    }, "");
  };
  return {
    transform: (value) => value.trim(),
    remove(key, data) {
      const [root] = tokenize(data);
      return root === key ? void 0 : data;
    },
    set(key, value, data) {
      const [root] = tokenize(data);
      if (root !== key) {
        return data;
      }
      return value == null ? root : `${root}.${value}`;
    },
    keys(data) {
      const v = tokenize(data)[0];
      return v ? [
        v
      ] : [];
    },
    get(key, data) {
      const [root, ...rest] = tokenize(data);
      return key === root ? recompose(rest) : void 0;
    }
  };
}).parse(isObj$1, () => ({
  transform: lodashExports.cloneDeep,
  remove(key, data) {
    const { [key]: ignored, ...rest } = data;
    return rest;
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).onRelation(async ({ key, value, attribute, visitor: visitor2, path, getModel, schema }, { set: set2, recurse }) => {
  const isMorphRelation = attribute.relation.toLowerCase().startsWith("morph");
  if (isMorphRelation) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, path, schema, attribute, visitor: visitor2, value, getModel }, { recurse, set: set2 }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, value, visitor: visitor2, path, schema, attribute, getModel }, { recurse, set: set2 }) => {
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
});
var traverseQuerySort = curry(sort.traverse);
const DEFAULT_QS_ARRAY_LIMIT = 100;
const isQsArrayLimitPopulateObject = (value) => {
  if (!lodashExports.isObject(value) || Array.isArray(value)) {
    return false;
  }
  const keys = Object.keys(value);
  if (keys.length === 0 || keys.length <= DEFAULT_QS_ARRAY_LIMIT) {
    return false;
  }
  const hasConsecutiveNumericKeys = keys.every((key, index2) => key === String(index2));
  if (!hasConsecutiveNumericKeys) {
    return false;
  }
  return Object.values(value).every((entry) => typeof entry === "string");
};
const throwQsArrayLimitPopulateError = (entryCount) => {
  throw new ValidationError2(`Too many populate entries (${entryCount}). The maximum number of populate entries when using array notation is ${DEFAULT_QS_ARRAY_LIMIT}. Consider using object notation (populate[field]=true), nested population, or reducing the number of fields.`);
};
const isKeyword = (keyword) => {
  return ({ key, attribute }) => {
    return !attribute && keyword === key;
  };
};
const isWildcard = (value) => value === "*";
const isPopulateString = (value) => {
  return lodashExports.isString(value) && !isWildcard(value);
};
const isStringArray$1 = (value) => Array.isArray(value) && value.every(lodashExports.isString);
const isObj = (value) => lodashExports.isObject(value);
const populate = traverseFactory().intercept(isPopulateString, async (visitor2, options2, populate2, { recurse }) => {
  const populateObject = pathsToObjectPopulate([
    populate2
  ]);
  const traversedPopulate = await recurse(visitor2, options2, populateObject);
  const paths = objectPopulateToPaths(traversedPopulate);
  return paths ? paths[0] : traversedPopulate;
}).intercept(isStringArray$1, async (visitor2, options2, populate2, { recurse }) => {
  const populateObject = pathsToObjectPopulate(populate2);
  const traversedPopulate = await recurse(visitor2, options2, populateObject);
  const paths = objectPopulateToPaths(traversedPopulate);
  return paths ?? traversedPopulate;
}).intercept(isQsArrayLimitPopulateObject, async (_visitor, _options, populate2) => {
  throwQsArrayLimitPopulateError(Object.keys(populate2).length);
}).parse(isWildcard, () => ({
  /**
  * Since value is '*', we don't need to transform it
  */
  transform: lodashExports.identity,
  /**
  * '*' isn't a key/value structure, so regardless
  *  of the given key, it returns the data ('*')
  */
  get: (_key, data) => data,
  /**
  * '*' isn't a key/value structure, so regardless
  * of the given `key`, use `value` as the new `data`
  */
  set: (_key, value) => value,
  /**
  * '*' isn't a key/value structure, but we need to simulate at least one to enable
  * the data traversal. We're using '' since it represents a falsy string value
  */
  keys: lodashExports.constant([
    ""
  ]),
  /**
  * Removing '*' means setting it to undefined, regardless of the given key
  */
  remove: lodashExports.constant(void 0)
})).parse(lodashExports.isString, () => {
  const tokenize = (value) => value.split(".");
  const recompose = (parts) => parts.join(".");
  return {
    transform: (value) => value.trim(),
    remove(key, data) {
      const [root] = tokenize(data);
      return root === key ? void 0 : data;
    },
    set(key, value, data) {
      const [root] = tokenize(data);
      if (root !== key) {
        return data;
      }
      return value == null || lodashExports.isEmpty(value) ? root : `${root}.${value}`;
    },
    keys(data) {
      const v = tokenize(data)[0];
      return v ? [
        v
      ] : [];
    },
    get(key, data) {
      const [root, ...rest] = tokenize(data);
      return key === root ? recompose(rest) : void 0;
    }
  };
}).parse(isObj, () => ({
  transform: lodashExports.cloneDeep,
  remove(key, data) {
    const { [key]: ignored, ...rest } = data;
    return rest;
  },
  set(key, value, data) {
    return {
      ...data,
      [key]: value
    };
  },
  keys(data) {
    return Object.keys(data);
  },
  get(key, data) {
    return data[key];
  }
})).ignore(({ key, attribute, parent }) => {
  return [
    "sort",
    "filters",
    "fields"
  ].includes(key) && (!attribute || !!parent?.attribute);
}).on(
  // Handle recursion on populate."populate"
  isKeyword("populate"),
  async ({ key, visitor: visitor2, path, value, schema, getModel, attribute }, { set: set2, recurse }) => {
    const parent = {
      key,
      path,
      schema,
      attribute
    };
    const newValue = await recurse(visitor2, {
      schema,
      path,
      getModel,
      parent
    }, value);
    set2(key, newValue);
  }
).on(isKeyword("on"), async ({ key, visitor: visitor2, path, value, getModel, parent }, { set: set2, recurse }) => {
  const newOn = {};
  if (!isObj(value)) {
    return;
  }
  for (const [uid, subPopulate] of Object.entries(value)) {
    const model = getModel(uid);
    const newPath = {
      ...path,
      raw: `${path.raw}[${uid}]`
    };
    newOn[uid] = await recurse(visitor2, {
      schema: model,
      path: newPath,
      getModel,
      parent
    }, subPopulate);
  }
  set2(key, newOn);
}).onRelation(async ({ key, value, attribute, visitor: visitor2, path, schema, getModel }, { set: set2, recurse }) => {
  if (value == null) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  if (isMorphToRelationalAttribute(attribute)) {
    if (!lodashExports.isObject(value) || !("on" in value && lodashExports.isObject(value?.on))) {
      return;
    }
    const newValue2 = await recurse(visitor2, {
      schema,
      path,
      getModel,
      parent
    }, {
      on: value?.on
    });
    set2(key, {
      ...value,
      ...newValue2
    });
    return;
  }
  const targetSchemaUID = attribute.target;
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onMedia(async ({ key, path, schema, attribute, visitor: visitor2, value, getModel }, { recurse, set: set2 }) => {
  if (value == null) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchemaUID = "plugin::upload.file";
  const targetSchema = getModel(targetSchemaUID);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onComponent(async ({ key, value, schema, visitor: visitor2, path, attribute, getModel }, { recurse, set: set2 }) => {
  if (value == null) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  const targetSchema = getModel(attribute.component);
  const newValue = await recurse(visitor2, {
    schema: targetSchema,
    path,
    getModel,
    parent
  }, value);
  set2(key, newValue);
}).onDynamicZone(async ({ key, value, schema, visitor: visitor2, path, attribute, getModel }, { set: set2, recurse }) => {
  if (value == null || !lodashExports.isObject(value)) {
    return;
  }
  const parent = {
    key,
    path,
    schema,
    attribute
  };
  if ("on" in value && value.on) {
    const newOn = await recurse(visitor2, {
      schema,
      path,
      getModel,
      parent
    }, {
      on: value.on
    });
    set2(key, newOn);
  }
});
var traverseQueryPopulate = curry(populate.traverse);
const objectPopulateToPaths = (input) => {
  const paths = [];
  function traverse(currentObj, parentPath) {
    for (const [key, value] of Object.entries(currentObj)) {
      const currentPath = parentPath ? `${parentPath}.${key}` : key;
      if (value === true) {
        paths.push(currentPath);
      } else {
        const nestedPopulate = value.populate;
        if (!nestedPopulate || !traverse(nestedPopulate, currentPath)) {
          return false;
        }
      }
    }
    return true;
  }
  if (!traverse(input, "")) {
    return void 0;
  }
  return paths;
};
const pathsToObjectPopulate = (input) => {
  const result = {};
  function traverse(object2, keys) {
    const [first, ...rest] = keys;
    if (rest.length === 0) {
      object2[first] = true;
    } else {
      if (!object2[first] || typeof object2[first] === "boolean") {
        object2[first] = {
          populate: {}
        };
      }
      traverse(object2[first].populate, rest);
    }
  }
  input.forEach((clause) => traverse(result, clause.split(".")));
  return result;
};
const isStringArray = (value) => {
  return Array.isArray(value) && value.every(lodashExports.isString);
};
const fields = traverseFactory().intercept(isStringArray, async (visitor2, options2, fields2, { recurse }) => {
  return Promise.all(fields2.map((field) => recurse(visitor2, options2, field)));
}).intercept((value) => lodashExports.isString(value) && value.includes(","), (visitor2, options2, fields2, { recurse }) => {
  return Promise.all(fields2.split(",").map((field) => recurse(visitor2, options2, field)));
}).intercept((value) => lodashExports.eq("*", value), lodashExports.constant("*")).parse(lodashExports.isString, () => ({
  transform: (value) => value.trim(),
  remove(key, data) {
    return data === key ? void 0 : data;
  },
  set(_key, _value, data) {
    return data;
  },
  keys(data) {
    return [
      data
    ];
  },
  get(key, data) {
    return key === data ? data : void 0;
  }
}));
var traverseQueryFields = curry(fields.traverse);
const { ID_ATTRIBUTE: ID_ATTRIBUTE$1, DOC_ID_ATTRIBUTE: DOC_ID_ATTRIBUTE$1 } = constants;
const defaultSanitizeFilters = curry((ctx, filters2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeFilters");
  }
  return pipe$1(
    // Remove keys that are not attributes or valid operators
    traverseQueryFilters(({ key, attribute }, { remove }) => {
      const isAttribute = !!attribute;
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (!isAttribute && !isOperator(key)) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from filters
    traverseQueryFilters(visitor$5, ctx),
    // Remove morpTo relations from filters
    traverseQueryFilters(visitor$6, ctx),
    // Remove passwords from filters
    traverseQueryFilters(visitor$8, ctx),
    // Remove private from filters
    traverseQueryFilters(visitor$7, ctx),
    // Remove empty plain objects and empty arrays. Do not use lodash isObject+isEmpty: built-ins with no
    // enumerable keys (Date, RegExp, boxed primitives, etc.) are "empty" and would wrongly drop valid operands.
    traverseQueryFilters(({ key, value }, { remove }) => {
      const isEmptyPlainObject = lodashExports.isPlainObject(value) && lodashExports.isEmpty(value);
      const isEmptyArrayOperand = Array.isArray(value) && value.length === 0;
      if (isEmptyPlainObject || isEmptyArrayOperand) {
        remove(key);
      }
    }, ctx)
  )(filters2);
});
const defaultSanitizeSort = curry((ctx, sort2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeSort");
  }
  return pipe$1(
    // Remove non attribute keys
    traverseQuerySort(({ key, attribute }, { remove }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (!attribute) {
        remove(key);
      }
    }, ctx),
    // Remove dynamic zones from sort
    traverseQuerySort(visitor$5, ctx),
    // Remove morpTo relations from sort
    traverseQuerySort(visitor$6, ctx),
    // Remove private from sort
    traverseQuerySort(visitor$7, ctx),
    // Remove passwords from filters
    traverseQuerySort(visitor$8, ctx),
    // Remove keys for empty non-scalar values
    traverseQuerySort(({ key, attribute, value }, { remove }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (!isScalarAttribute(attribute) && lodashExports.isEmpty(value)) {
        remove(key);
      }
    }, ctx)
  )(sort2);
});
const defaultSanitizeFields = curry((ctx, fields2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizeFields");
  }
  return pipe$1(
    // Only keep scalar attributes
    traverseQueryFields(({ key, attribute }, { remove }) => {
      if ([
        ID_ATTRIBUTE$1,
        DOC_ID_ATTRIBUTE$1
      ].includes(key)) {
        return;
      }
      if (attribute == null || !isScalarAttribute(attribute)) {
        remove(key);
      }
    }, ctx),
    // Remove private fields
    traverseQueryFields(visitor$7, ctx),
    // Remove password fields
    traverseQueryFields(visitor$8, ctx),
    // Remove nil values from fields array
    (value) => Array.isArray(value) ? value.filter((field) => field != null) : value
  )(fields2);
});
const defaultSanitizePopulate = curry((ctx, populate2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultSanitizePopulate");
  }
  return pipe$1(
    traverseQueryPopulate(visitor$4, ctx),
    traverseQueryPopulate(async ({ key, value, schema, attribute, getModel, path }, { set: set2 }) => {
      if (attribute) {
        return;
      }
      const parent = {
        key,
        path,
        schema,
        attribute
      };
      if (key === "sort") {
        set2(key, await defaultSanitizeSort({
          schema,
          getModel,
          parent
        }, value));
      }
      if (key === "filters") {
        set2(key, await defaultSanitizeFilters({
          schema,
          getModel,
          parent
        }, value));
      }
      if (key === "fields") {
        set2(key, await defaultSanitizeFields({
          schema,
          getModel,
          parent
        }, value));
      }
      if (key === "populate") {
        set2(key, await defaultSanitizePopulate({
          schema,
          getModel,
          parent
        }, value));
      }
    }, ctx),
    // Remove private fields
    traverseQueryPopulate(visitor$7, ctx)
  )(populate2);
});
const throwInvalidKey = ({ key, path, reason }) => {
  const location = path && path !== key ? `Invalid key ${key} at ${path}` : `Invalid key ${key}`;
  const msg = reason ? `${location}: ${reason}` : location;
  throw new ValidationError2(msg, {
    key,
    path
  });
};
const asyncCurry = (fn) => curry(fn);
const visitor$3 = ({ key, attribute, path }) => {
  if (attribute?.type === "password") {
    throwInvalidKey({
      key,
      path: path.attribute
    });
  }
};
const visitor$2 = ({ schema, key, attribute, path }) => {
  if (!attribute) {
    return;
  }
  const isPrivate = attribute.private === true || isPrivateAttribute(schema, key);
  if (isPrivate) {
    throwInvalidKey({
      key,
      path: path.attribute
    });
  }
};
const visitor$1 = ({ key, attribute, path }) => {
  if (isMorphToRelationalAttribute(attribute)) {
    throwInvalidKey({
      key,
      path: path.attribute
    });
  }
};
const visitor = ({ key, attribute, path }) => {
  if (isDynamicZoneAttribute(attribute)) {
    throwInvalidKey({
      key,
      path: path.attribute
    });
  }
};
const { ID_ATTRIBUTE, DOC_ID_ATTRIBUTE } = constants;
const FILTER_TRAVERSALS = [
  "nonAttributesOperators",
  "dynamicZones",
  "morphRelations",
  "passwords",
  "private"
];
const validateFilters = asyncCurry(async (ctx, filters2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateFilters");
  }
  const functionsToApply = [];
  if (include.includes("nonAttributesOperators")) {
    functionsToApply.push(traverseQueryFilters(({ key, attribute, path }) => {
      if ([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE
      ].includes(key)) {
        return;
      }
      const isAttribute = !!attribute;
      if (!isAttribute && !isOperator(key)) {
        throwInvalidKey({
          key,
          path: path.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("dynamicZones")) {
    functionsToApply.push(traverseQueryFilters(visitor, ctx));
  }
  if (include.includes("morphRelations")) {
    functionsToApply.push(traverseQueryFilters(visitor$1, ctx));
  }
  if (include.includes("passwords")) {
    functionsToApply.push(traverseQueryFilters(visitor$3, ctx));
  }
  if (include.includes("private")) {
    functionsToApply.push(traverseQueryFilters(visitor$2, ctx));
  }
  if (functionsToApply.length === 0) {
    return filters2;
  }
  return pipe$1(...functionsToApply)(filters2);
});
asyncCurry(async (ctx, filters2) => {
  return validateFilters(ctx, filters2, FILTER_TRAVERSALS);
});
const SORT_TRAVERSALS = [
  "nonAttributesOperators",
  "dynamicZones",
  "morphRelations",
  "passwords",
  "private",
  "nonScalarEmptyKeys"
];
const validateSort = asyncCurry(async (ctx, sort2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateSort");
  }
  const functionsToApply = [];
  if (include.includes("nonAttributesOperators")) {
    functionsToApply.push(traverseQuerySort(({ key, attribute, path }) => {
      if ([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE
      ].includes(key)) {
        return;
      }
      if (key === "status" && ctx.schema?.options?.draftAndPublish) {
        return;
      }
      if (!attribute) {
        throwInvalidKey({
          key,
          path: path.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("dynamicZones")) {
    functionsToApply.push(traverseQuerySort(visitor, ctx));
  }
  if (include.includes("morphRelations")) {
    functionsToApply.push(traverseQuerySort(visitor$1, ctx));
  }
  if (include.includes("passwords")) {
    functionsToApply.push(traverseQuerySort(visitor$3, ctx));
  }
  if (include.includes("private")) {
    functionsToApply.push(traverseQuerySort(visitor$2, ctx));
  }
  if (include.includes("nonScalarEmptyKeys")) {
    functionsToApply.push(traverseQuerySort(({ key, attribute, value, path }) => {
      if ([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE
      ].includes(key)) {
        return;
      }
      if (!isScalarAttribute(attribute) && lodashExports.isEmpty(value)) {
        throwInvalidKey({
          key,
          path: path.attribute
        });
      }
    }, ctx));
  }
  if (functionsToApply.length === 0) {
    return sort2;
  }
  return pipe$1(...functionsToApply)(sort2);
});
asyncCurry(async (ctx, sort2) => {
  return validateSort(ctx, sort2, SORT_TRAVERSALS);
});
const FIELDS_TRAVERSALS = [
  "scalarAttributes",
  "privateFields",
  "passwordFields"
];
const validateFields = asyncCurry(async (ctx, fields2, include) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidateFields");
  }
  const functionsToApply = [];
  if (include.includes("scalarAttributes")) {
    functionsToApply.push(traverseQueryFields(({ key, attribute, path }) => {
      if ([
        ID_ATTRIBUTE,
        DOC_ID_ATTRIBUTE
      ].includes(key)) {
        return;
      }
      if (attribute == null || !isScalarAttribute(attribute)) {
        throwInvalidKey({
          key,
          path: path.attribute
        });
      }
    }, ctx));
  }
  if (include.includes("privateFields")) {
    functionsToApply.push(traverseQueryFields(visitor$2, ctx));
  }
  if (include.includes("passwordFields")) {
    functionsToApply.push(traverseQueryFields(visitor$3, ctx));
  }
  if (functionsToApply.length === 0) {
    return fields2;
  }
  return pipe$1(...functionsToApply)(fields2);
});
asyncCurry(async (ctx, fields2) => {
  return validateFields(ctx, fields2, FIELDS_TRAVERSALS);
});
const isMorphLikeAttribute = (attribute) => isDynamicZoneAttribute(attribute) || isMorphToRelationalAttribute(attribute);
const isPopulatableAttribute = (attribute) => !!attribute && [
  "relation",
  "dynamiczone",
  "component",
  "media"
].includes(attribute.type);
const isDotNotationPopulate = (populate2) => {
  if (populate2 === "*") {
    return false;
  }
  if (typeof populate2 === "string") {
    return true;
  }
  return Array.isArray(populate2) && populate2.length > 0 && populate2.every((p) => typeof p === "string");
};
const flattenDotPopulatePaths = (populate2) => {
  const items = Array.isArray(populate2) ? populate2 : [
    populate2
  ];
  return items.flatMap((item) => item.split(",").map((segment) => segment.trim()).filter(Boolean));
};
const validatePopulateDotPathSegments = ({ schema, getModel }, segments, pathPrefix) => {
  if (!segments.length) {
    return;
  }
  const [head, ...tail] = segments;
  const fullPath = pathPrefix ? `${pathPrefix}.${head}` : head;
  const attribute = schema.attributes[head];
  if (!attribute || !isPopulatableAttribute(attribute)) {
    throwInvalidKey({
      key: head,
      path: fullPath
    });
  }
  if (!tail.length) {
    return;
  }
  if (attribute.type === "component") {
    if (!attribute.component) {
      throwInvalidKey({
        key: head,
        path: fullPath
      });
    }
    validatePopulateDotPathSegments({
      schema: getModel(attribute.component),
      getModel
    }, tail, fullPath);
    return;
  }
  if (attribute.type === "relation") {
    if (isMorphLikeAttribute(attribute)) {
      throwInvalidKey({
        key: head,
        path: fullPath
      });
    }
    if (!attribute.target) {
      throwInvalidKey({
        key: head,
        path: fullPath
      });
    }
    validatePopulateDotPathSegments({
      schema: getModel(attribute.target),
      getModel
    }, tail, fullPath);
    return;
  }
  if (attribute.type === "media") {
    throwInvalidKey({
      key: head,
      path: fullPath
    });
  }
  if (attribute.type === "dynamiczone") {
    const [nextSegment, ...rest] = tail;
    const nextPath = `${fullPath}.${nextSegment}`;
    const candidates = (attribute.components ?? []).map((uid) => getModel(uid)).filter((model) => model?.attributes?.[nextSegment]);
    if (!candidates.length) {
      throwInvalidKey({
        key: nextSegment,
        path: nextPath
      });
    }
    let validated = false;
    for (const componentSchema of candidates) {
      const nestedAttribute = componentSchema.attributes[nextSegment];
      try {
        if (!rest.length) {
          if (nestedAttribute) {
            validated = true;
            break;
          }
        } else if (nestedAttribute?.type === "component" && nestedAttribute.component) {
          validatePopulateDotPathSegments({
            schema: getModel(nestedAttribute.component),
            getModel
          }, rest, nextPath);
          validated = true;
          break;
        } else if (nestedAttribute?.type === "relation" && !isMorphLikeAttribute(nestedAttribute) && nestedAttribute.target) {
          validatePopulateDotPathSegments({
            schema: getModel(nestedAttribute.target),
            getModel
          }, rest, nextPath);
          validated = true;
          break;
        }
      } catch {
      }
    }
    if (!validated) {
      throwInvalidKey({
        key: nextSegment,
        path: nextPath
      });
    }
  }
};
const validatePopulateDotPaths = (ctx, populate2) => {
  for (const path of flattenDotPopulatePaths(populate2)) {
    const segments = path.split(".").map((segment) => segment.trim()).filter(Boolean);
    validatePopulateDotPathSegments(ctx, segments, "");
  }
};
const validateMorphLikeNestedPopulate = (populateValue, { path }) => {
  if (populateValue != null && populateValue !== "*") {
    throwInvalidKey({
      key: "populate",
      path
    });
  }
};
const POPULATE_TRAVERSALS = [
  "nonAttributesOperators",
  "private"
];
const ROOT_ONLY_QUERY_PARAMS = [
  "status",
  "publicationFilter",
  "hasPublishedVersion"
];
const validatePopulate = asyncCurry(async (ctx, populate2, includes) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidatePopulate");
  }
  if (isDotNotationPopulate(populate2)) {
    validatePopulateDotPaths({
      schema: ctx.schema,
      getModel: ctx.getModel
    }, populate2);
    if (includes?.populate?.includes("private")) {
      return traverseQueryPopulate(visitor$2, ctx)(populate2);
    }
    return populate2;
  }
  const functionsToApply = [];
  functionsToApply.push(traverseQueryPopulate(async ({ key, path, value, schema, attribute, getModel, parent }, { set: set2 }) => {
    if (!parent?.attribute && attribute) {
      const isPopulatableAttribute2 = [
        "relation",
        "dynamiczone",
        "component",
        "media"
      ].includes(attribute.type);
      if (isMorphLikeAttribute(attribute) && lodashExports.isObject(value) && "populate" in value) {
        validateMorphLikeNestedPopulate(value.populate, {
          path: path.raw
        });
      }
      if (!isPopulatableAttribute2) {
        throwInvalidKey({
          key,
          path: path.raw
        });
      }
      return;
    }
    if (key === "on") {
      if (!lodashExports.isObject(value)) {
        return throwInvalidKey({
          key,
          path: path.raw
        });
      }
      const targets = Object.keys(value);
      for (const target of targets) {
        const model = getModel(target);
        if (!model) {
          throwInvalidKey({
            key: target,
            path: `${path.raw}.${target}`
          });
        }
      }
      return;
    }
    if (key === "" && value === "*") {
      return;
    }
    if (key === "count") {
      if (isBooleanLike(value)) {
        return;
      }
      throwInvalidKey({
        key,
        path: path.attribute
      });
    }
    if (isBooleanLike(key)) {
      return;
    }
    if (key === "sort") {
      set2(key, await validateSort({
        schema,
        getModel
      }, value, includes?.sort || SORT_TRAVERSALS));
      return;
    }
    if (key === "filters") {
      set2(key, await validateFilters({
        schema,
        getModel
      }, value, includes?.filters || FILTER_TRAVERSALS));
      return;
    }
    if (key === "fields") {
      set2(key, await validateFields({
        schema,
        getModel
      }, value, includes?.fields || FIELDS_TRAVERSALS));
      return;
    }
    if (key === "populate") {
      set2(key, await validatePopulate(
        {
          schema,
          getModel,
          parent: {
            key,
            path,
            schema,
            attribute
          },
          path
        },
        value,
        includes
        // pass down the same includes object
      ));
      return;
    }
    if (includes?.populate?.includes("nonAttributesOperators")) {
      throwInvalidKey({
        key,
        path: path.attribute,
        reason: ROOT_ONLY_QUERY_PARAMS.some((param) => param === key) ? `${key} is only accepted at the root of the query, and it also applies to populated relations` : void 0
      });
    }
  }, ctx));
  if (includes?.populate?.includes("private")) {
    functionsToApply.push(traverseQueryPopulate(visitor$2, ctx));
  }
  if (functionsToApply.length === 0) {
    return populate2;
  }
  return pipe$1(...functionsToApply)(populate2);
});
asyncCurry(async (ctx, populate2) => {
  if (!ctx.schema) {
    throw new Error("Missing schema in defaultValidatePopulate");
  }
  return validatePopulate(ctx, populate2, {
    filters: FILTER_TRAVERSALS,
    sort: SORT_TRAVERSALS,
    fields: FIELDS_TRAVERSALS,
    populate: POPULATE_TRAVERSALS
  });
});
var execa = { exports: {} };
var crossSpawn = { exports: {} };
var windows;
var hasRequiredWindows;
function requireWindows() {
  if (hasRequiredWindows) return windows;
  hasRequiredWindows = 1;
  windows = isexe;
  isexe.sync = sync;
  var fs = require$$0$3;
  function checkPathExt(path, options2) {
    var pathext = options2.pathExt !== void 0 ? options2.pathExt : process.env.PATHEXT;
    if (!pathext) {
      return true;
    }
    pathext = pathext.split(";");
    if (pathext.indexOf("") !== -1) {
      return true;
    }
    for (var i = 0; i < pathext.length; i++) {
      var p = pathext[i].toLowerCase();
      if (p && path.substr(-p.length).toLowerCase() === p) {
        return true;
      }
    }
    return false;
  }
  function checkStat(stat, path, options2) {
    if (!stat.isSymbolicLink() && !stat.isFile()) {
      return false;
    }
    return checkPathExt(path, options2);
  }
  function isexe(path, options2, cb) {
    fs.stat(path, function(er, stat) {
      cb(er, er ? false : checkStat(stat, path, options2));
    });
  }
  function sync(path, options2) {
    return checkStat(fs.statSync(path), path, options2);
  }
  return windows;
}
var mode;
var hasRequiredMode;
function requireMode() {
  if (hasRequiredMode) return mode;
  hasRequiredMode = 1;
  mode = isexe;
  isexe.sync = sync;
  var fs = require$$0$3;
  function isexe(path, options2, cb) {
    fs.stat(path, function(er, stat) {
      cb(er, er ? false : checkStat(stat, options2));
    });
  }
  function sync(path, options2) {
    return checkStat(fs.statSync(path), options2);
  }
  function checkStat(stat, options2) {
    return stat.isFile() && checkMode(stat, options2);
  }
  function checkMode(stat, options2) {
    var mod = stat.mode;
    var uid = stat.uid;
    var gid = stat.gid;
    var myUid = options2.uid !== void 0 ? options2.uid : process.getuid && process.getuid();
    var myGid = options2.gid !== void 0 ? options2.gid : process.getgid && process.getgid();
    var u = parseInt("100", 8);
    var g = parseInt("010", 8);
    var o = parseInt("001", 8);
    var ug = u | g;
    var ret = mod & o || mod & g && gid === myGid || mod & u && uid === myUid || mod & ug && myUid === 0;
    return ret;
  }
  return mode;
}
var isexe_1;
var hasRequiredIsexe;
function requireIsexe() {
  if (hasRequiredIsexe) return isexe_1;
  hasRequiredIsexe = 1;
  var core2;
  if (process.platform === "win32" || commonjsGlobal.TESTING_WINDOWS) {
    core2 = requireWindows();
  } else {
    core2 = requireMode();
  }
  isexe_1 = isexe;
  isexe.sync = sync;
  function isexe(path, options2, cb) {
    if (typeof options2 === "function") {
      cb = options2;
      options2 = {};
    }
    if (!cb) {
      if (typeof Promise !== "function") {
        throw new TypeError("callback not provided");
      }
      return new Promise(function(resolve, reject) {
        isexe(path, options2 || {}, function(er, is) {
          if (er) {
            reject(er);
          } else {
            resolve(is);
          }
        });
      });
    }
    core2(path, options2 || {}, function(er, is) {
      if (er) {
        if (er.code === "EACCES" || options2 && options2.ignoreErrors) {
          er = null;
          is = false;
        }
      }
      cb(er, is);
    });
  }
  function sync(path, options2) {
    try {
      return core2.sync(path, options2 || {});
    } catch (er) {
      if (options2 && options2.ignoreErrors || er.code === "EACCES") {
        return false;
      } else {
        throw er;
      }
    }
  }
  return isexe_1;
}
var which_1;
var hasRequiredWhich;
function requireWhich() {
  if (hasRequiredWhich) return which_1;
  hasRequiredWhich = 1;
  const isWindows = process.platform === "win32" || process.env.OSTYPE === "cygwin" || process.env.OSTYPE === "msys";
  const path = require$$0$4;
  const COLON = isWindows ? ";" : ":";
  const isexe = requireIsexe();
  const getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
  const getPathInfo = (cmd, opt) => {
    const colon = opt.colon || COLON;
    const pathEnv = cmd.match(/\//) || isWindows && cmd.match(/\\/) ? [""] : [
      // windows always checks the cwd first
      ...isWindows ? [process.cwd()] : [],
      ...(opt.path || process.env.PATH || /* istanbul ignore next: very unusual */
      "").split(colon)
    ];
    const pathExtExe = isWindows ? opt.pathExt || process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM" : "";
    const pathExt = isWindows ? pathExtExe.split(colon) : [""];
    if (isWindows) {
      if (cmd.indexOf(".") !== -1 && pathExt[0] !== "")
        pathExt.unshift("");
    }
    return {
      pathEnv,
      pathExt,
      pathExtExe
    };
  };
  const which = (cmd, opt, cb) => {
    if (typeof opt === "function") {
      cb = opt;
      opt = {};
    }
    if (!opt)
      opt = {};
    const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
    const found = [];
    const step = (i) => new Promise((resolve, reject) => {
      if (i === pathEnv.length)
        return opt.all && found.length ? resolve(found) : reject(getNotFoundError(cmd));
      const ppRaw = pathEnv[i];
      const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
      const pCmd = path.join(pathPart, cmd);
      const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
      resolve(subStep(p, i, 0));
    });
    const subStep = (p, i, ii) => new Promise((resolve, reject) => {
      if (ii === pathExt.length)
        return resolve(step(i + 1));
      const ext = pathExt[ii];
      isexe(p + ext, { pathExt: pathExtExe }, (er, is) => {
        if (!er && is) {
          if (opt.all)
            found.push(p + ext);
          else
            return resolve(p + ext);
        }
        return resolve(subStep(p, i, ii + 1));
      });
    });
    return cb ? step(0).then((res) => cb(null, res), cb) : step(0);
  };
  const whichSync = (cmd, opt) => {
    opt = opt || {};
    const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
    const found = [];
    for (let i = 0; i < pathEnv.length; i++) {
      const ppRaw = pathEnv[i];
      const pathPart = /^".*"$/.test(ppRaw) ? ppRaw.slice(1, -1) : ppRaw;
      const pCmd = path.join(pathPart, cmd);
      const p = !pathPart && /^\.[\\\/]/.test(cmd) ? cmd.slice(0, 2) + pCmd : pCmd;
      for (let j = 0; j < pathExt.length; j++) {
        const cur = p + pathExt[j];
        try {
          const is = isexe.sync(cur, { pathExt: pathExtExe });
          if (is) {
            if (opt.all)
              found.push(cur);
            else
              return cur;
          }
        } catch (ex) {
        }
      }
    }
    if (opt.all && found.length)
      return found;
    if (opt.nothrow)
      return null;
    throw getNotFoundError(cmd);
  };
  which_1 = which;
  which.sync = whichSync;
  return which_1;
}
var pathKey = { exports: {} };
var hasRequiredPathKey;
function requirePathKey() {
  if (hasRequiredPathKey) return pathKey.exports;
  hasRequiredPathKey = 1;
  const pathKey$1 = (options2 = {}) => {
    const environment = options2.env || process.env;
    const platform = options2.platform || process.platform;
    if (platform !== "win32") {
      return "PATH";
    }
    return Object.keys(environment).reverse().find((key) => key.toUpperCase() === "PATH") || "Path";
  };
  pathKey.exports = pathKey$1;
  pathKey.exports.default = pathKey$1;
  return pathKey.exports;
}
var resolveCommand_1;
var hasRequiredResolveCommand;
function requireResolveCommand() {
  if (hasRequiredResolveCommand) return resolveCommand_1;
  hasRequiredResolveCommand = 1;
  const path = require$$0$4;
  const which = requireWhich();
  const getPathKey = requirePathKey();
  function resolveCommandAttempt(parsed, withoutPathExt) {
    const env2 = parsed.options.env || process.env;
    const cwd = process.cwd();
    const hasCustomCwd = parsed.options.cwd != null;
    const shouldSwitchCwd = hasCustomCwd && process.chdir !== void 0 && !process.chdir.disabled;
    if (shouldSwitchCwd) {
      try {
        process.chdir(parsed.options.cwd);
      } catch (err) {
      }
    }
    let resolved;
    try {
      resolved = which.sync(parsed.command, {
        path: env2[getPathKey({ env: env2 })],
        pathExt: withoutPathExt ? path.delimiter : void 0
      });
    } catch (e) {
    } finally {
      if (shouldSwitchCwd) {
        process.chdir(cwd);
      }
    }
    if (resolved) {
      resolved = path.resolve(hasCustomCwd ? parsed.options.cwd : "", resolved);
    }
    return resolved;
  }
  function resolveCommand(parsed) {
    return resolveCommandAttempt(parsed) || resolveCommandAttempt(parsed, true);
  }
  resolveCommand_1 = resolveCommand;
  return resolveCommand_1;
}
var _escape = {};
var hasRequired_escape;
function require_escape() {
  if (hasRequired_escape) return _escape;
  hasRequired_escape = 1;
  const metaCharsRegExp = /([()\][%!^"`<>&|;, *?])/g;
  function escapeCommand(arg) {
    arg = arg.replace(metaCharsRegExp, "^$1");
    return arg;
  }
  function escapeArgument(arg, doubleEscapeMetaChars) {
    arg = `${arg}`;
    arg = arg.replace(/(?=(\\+?)?)\1"/g, '$1$1\\"');
    arg = arg.replace(/(?=(\\+?)?)\1$/, "$1$1");
    arg = `"${arg}"`;
    arg = arg.replace(metaCharsRegExp, "^$1");
    if (doubleEscapeMetaChars) {
      arg = arg.replace(metaCharsRegExp, "^$1");
    }
    return arg;
  }
  _escape.command = escapeCommand;
  _escape.argument = escapeArgument;
  return _escape;
}
var shebangRegex;
var hasRequiredShebangRegex;
function requireShebangRegex() {
  if (hasRequiredShebangRegex) return shebangRegex;
  hasRequiredShebangRegex = 1;
  shebangRegex = /^#!(.*)/;
  return shebangRegex;
}
var shebangCommand;
var hasRequiredShebangCommand;
function requireShebangCommand() {
  if (hasRequiredShebangCommand) return shebangCommand;
  hasRequiredShebangCommand = 1;
  const shebangRegex2 = requireShebangRegex();
  shebangCommand = (string2 = "") => {
    const match = string2.match(shebangRegex2);
    if (!match) {
      return null;
    }
    const [path, argument] = match[0].replace(/#! ?/, "").split(" ");
    const binary = path.split("/").pop();
    if (binary === "env") {
      return argument;
    }
    return argument ? `${binary} ${argument}` : binary;
  };
  return shebangCommand;
}
var readShebang_1;
var hasRequiredReadShebang;
function requireReadShebang() {
  if (hasRequiredReadShebang) return readShebang_1;
  hasRequiredReadShebang = 1;
  const fs = require$$0$3;
  const shebangCommand2 = requireShebangCommand();
  function readShebang(command2) {
    const size = 150;
    const buffer = Buffer.alloc(size);
    let fd;
    try {
      fd = fs.openSync(command2, "r");
      fs.readSync(fd, buffer, 0, size, 0);
      fs.closeSync(fd);
    } catch (e) {
    }
    return shebangCommand2(buffer.toString());
  }
  readShebang_1 = readShebang;
  return readShebang_1;
}
var parse_1;
var hasRequiredParse;
function requireParse() {
  if (hasRequiredParse) return parse_1;
  hasRequiredParse = 1;
  const path = require$$0$4;
  const resolveCommand = requireResolveCommand();
  const escape = require_escape();
  const readShebang = requireReadShebang();
  const isWin = process.platform === "win32";
  const isExecutableRegExp = /\.(?:com|exe)$/i;
  const isCmdShimRegExp = /node_modules[\\/].bin[\\/][^\\/]+\.cmd$/i;
  function detectShebang(parsed) {
    parsed.file = resolveCommand(parsed);
    const shebang = parsed.file && readShebang(parsed.file);
    if (shebang) {
      parsed.args.unshift(parsed.file);
      parsed.command = shebang;
      return resolveCommand(parsed);
    }
    return parsed.file;
  }
  function parseNonShell(parsed) {
    if (!isWin) {
      return parsed;
    }
    const commandFile = detectShebang(parsed);
    const needsShell = !isExecutableRegExp.test(commandFile);
    if (parsed.options.forceShell || needsShell) {
      const needsDoubleEscapeMetaChars = isCmdShimRegExp.test(commandFile);
      parsed.command = path.normalize(parsed.command);
      parsed.command = escape.command(parsed.command);
      parsed.args = parsed.args.map((arg) => escape.argument(arg, needsDoubleEscapeMetaChars));
      const shellCommand = [parsed.command].concat(parsed.args).join(" ");
      parsed.args = ["/d", "/s", "/c", `"${shellCommand}"`];
      parsed.command = process.env.comspec || "cmd.exe";
      parsed.options.windowsVerbatimArguments = true;
    }
    return parsed;
  }
  function parse2(command2, args, options2) {
    if (args && !Array.isArray(args)) {
      options2 = args;
      args = null;
    }
    args = args ? args.slice(0) : [];
    options2 = Object.assign({}, options2);
    const parsed = {
      command: command2,
      args,
      options: options2,
      file: void 0,
      original: {
        command: command2,
        args
      }
    };
    return options2.shell ? parsed : parseNonShell(parsed);
  }
  parse_1 = parse2;
  return parse_1;
}
var enoent;
var hasRequiredEnoent;
function requireEnoent() {
  if (hasRequiredEnoent) return enoent;
  hasRequiredEnoent = 1;
  const isWin = process.platform === "win32";
  function notFoundError(original, syscall) {
    return Object.assign(new Error(`${syscall} ${original.command} ENOENT`), {
      code: "ENOENT",
      errno: "ENOENT",
      syscall: `${syscall} ${original.command}`,
      path: original.command,
      spawnargs: original.args
    });
  }
  function hookChildProcess(cp, parsed) {
    if (!isWin) {
      return;
    }
    const originalEmit = cp.emit;
    cp.emit = function(name, arg1) {
      if (name === "exit") {
        const err = verifyENOENT(arg1, parsed);
        if (err) {
          return originalEmit.call(cp, "error", err);
        }
      }
      return originalEmit.apply(cp, arguments);
    };
  }
  function verifyENOENT(status, parsed) {
    if (isWin && status === 1 && !parsed.file) {
      return notFoundError(parsed.original, "spawn");
    }
    return null;
  }
  function verifyENOENTSync(status, parsed) {
    if (isWin && status === 1 && !parsed.file) {
      return notFoundError(parsed.original, "spawnSync");
    }
    return null;
  }
  enoent = {
    hookChildProcess,
    verifyENOENT,
    verifyENOENTSync,
    notFoundError
  };
  return enoent;
}
var hasRequiredCrossSpawn;
function requireCrossSpawn() {
  if (hasRequiredCrossSpawn) return crossSpawn.exports;
  hasRequiredCrossSpawn = 1;
  const cp = require$$0$1;
  const parse2 = requireParse();
  const enoent2 = requireEnoent();
  function spawn(command2, args, options2) {
    const parsed = parse2(command2, args, options2);
    const spawned = cp.spawn(parsed.command, parsed.args, parsed.options);
    enoent2.hookChildProcess(spawned, parsed);
    return spawned;
  }
  function spawnSync(command2, args, options2) {
    const parsed = parse2(command2, args, options2);
    const result = cp.spawnSync(parsed.command, parsed.args, parsed.options);
    result.error = result.error || enoent2.verifyENOENTSync(result.status, parsed);
    return result;
  }
  crossSpawn.exports = spawn;
  crossSpawn.exports.spawn = spawn;
  crossSpawn.exports.sync = spawnSync;
  crossSpawn.exports._parse = parse2;
  crossSpawn.exports._enoent = enoent2;
  return crossSpawn.exports;
}
var stripFinalNewline;
var hasRequiredStripFinalNewline;
function requireStripFinalNewline() {
  if (hasRequiredStripFinalNewline) return stripFinalNewline;
  hasRequiredStripFinalNewline = 1;
  stripFinalNewline = (input) => {
    const LF = typeof input === "string" ? "\n" : "\n".charCodeAt();
    const CR = typeof input === "string" ? "\r" : "\r".charCodeAt();
    if (input[input.length - 1] === LF) {
      input = input.slice(0, input.length - 1);
    }
    if (input[input.length - 1] === CR) {
      input = input.slice(0, input.length - 1);
    }
    return input;
  };
  return stripFinalNewline;
}
var npmRunPath = { exports: {} };
npmRunPath.exports;
var hasRequiredNpmRunPath;
function requireNpmRunPath() {
  if (hasRequiredNpmRunPath) return npmRunPath.exports;
  hasRequiredNpmRunPath = 1;
  (function(module) {
    const path = require$$0$4;
    const pathKey2 = requirePathKey();
    const npmRunPath2 = (options2) => {
      options2 = {
        cwd: process.cwd(),
        path: process.env[pathKey2()],
        execPath: process.execPath,
        ...options2
      };
      let previous;
      let cwdPath = path.resolve(options2.cwd);
      const result = [];
      while (previous !== cwdPath) {
        result.push(path.join(cwdPath, "node_modules/.bin"));
        previous = cwdPath;
        cwdPath = path.resolve(cwdPath, "..");
      }
      const execPathDir = path.resolve(options2.cwd, options2.execPath, "..");
      result.push(execPathDir);
      return result.concat(options2.path).join(path.delimiter);
    };
    module.exports = npmRunPath2;
    module.exports.default = npmRunPath2;
    module.exports.env = (options2) => {
      options2 = {
        env: process.env,
        ...options2
      };
      const env2 = { ...options2.env };
      const path2 = pathKey2({ env: env2 });
      options2.path = env2[path2];
      env2[path2] = module.exports(options2);
      return env2;
    };
  })(npmRunPath);
  return npmRunPath.exports;
}
var onetime = { exports: {} };
var mimicFn = { exports: {} };
var hasRequiredMimicFn;
function requireMimicFn() {
  if (hasRequiredMimicFn) return mimicFn.exports;
  hasRequiredMimicFn = 1;
  const mimicFn$1 = (to, from) => {
    for (const prop of Reflect.ownKeys(from)) {
      Object.defineProperty(to, prop, Object.getOwnPropertyDescriptor(from, prop));
    }
    return to;
  };
  mimicFn.exports = mimicFn$1;
  mimicFn.exports.default = mimicFn$1;
  return mimicFn.exports;
}
var hasRequiredOnetime;
function requireOnetime() {
  if (hasRequiredOnetime) return onetime.exports;
  hasRequiredOnetime = 1;
  const mimicFn2 = requireMimicFn();
  const calledFunctions = /* @__PURE__ */ new WeakMap();
  const onetime$1 = (function_, options2 = {}) => {
    if (typeof function_ !== "function") {
      throw new TypeError("Expected a function");
    }
    let returnValue;
    let callCount = 0;
    const functionName = function_.displayName || function_.name || "<anonymous>";
    const onetime2 = function(...arguments_) {
      calledFunctions.set(onetime2, ++callCount);
      if (callCount === 1) {
        returnValue = function_.apply(this, arguments_);
        function_ = null;
      } else if (options2.throw === true) {
        throw new Error(`Function \`${functionName}\` can only be called once`);
      }
      return returnValue;
    };
    mimicFn2(onetime2, function_);
    calledFunctions.set(onetime2, callCount);
    return onetime2;
  };
  onetime.exports = onetime$1;
  onetime.exports.default = onetime$1;
  onetime.exports.callCount = (function_) => {
    if (!calledFunctions.has(function_)) {
      throw new Error(`The given function \`${function_.name}\` is not wrapped by the \`onetime\` package`);
    }
    return calledFunctions.get(function_);
  };
  return onetime.exports;
}
var main = {};
var signals$1 = {};
var core = {};
var hasRequiredCore;
function requireCore() {
  if (hasRequiredCore) return core;
  hasRequiredCore = 1;
  Object.defineProperty(core, "__esModule", { value: true });
  core.SIGNALS = void 0;
  const SIGNALS = [
    {
      name: "SIGHUP",
      number: 1,
      action: "terminate",
      description: "Terminal closed",
      standard: "posix"
    },
    {
      name: "SIGINT",
      number: 2,
      action: "terminate",
      description: "User interruption with CTRL-C",
      standard: "ansi"
    },
    {
      name: "SIGQUIT",
      number: 3,
      action: "core",
      description: "User interruption with CTRL-\\",
      standard: "posix"
    },
    {
      name: "SIGILL",
      number: 4,
      action: "core",
      description: "Invalid machine instruction",
      standard: "ansi"
    },
    {
      name: "SIGTRAP",
      number: 5,
      action: "core",
      description: "Debugger breakpoint",
      standard: "posix"
    },
    {
      name: "SIGABRT",
      number: 6,
      action: "core",
      description: "Aborted",
      standard: "ansi"
    },
    {
      name: "SIGIOT",
      number: 6,
      action: "core",
      description: "Aborted",
      standard: "bsd"
    },
    {
      name: "SIGBUS",
      number: 7,
      action: "core",
      description: "Bus error due to misaligned, non-existing address or paging error",
      standard: "bsd"
    },
    {
      name: "SIGEMT",
      number: 7,
      action: "terminate",
      description: "Command should be emulated but is not implemented",
      standard: "other"
    },
    {
      name: "SIGFPE",
      number: 8,
      action: "core",
      description: "Floating point arithmetic error",
      standard: "ansi"
    },
    {
      name: "SIGKILL",
      number: 9,
      action: "terminate",
      description: "Forced termination",
      standard: "posix",
      forced: true
    },
    {
      name: "SIGUSR1",
      number: 10,
      action: "terminate",
      description: "Application-specific signal",
      standard: "posix"
    },
    {
      name: "SIGSEGV",
      number: 11,
      action: "core",
      description: "Segmentation fault",
      standard: "ansi"
    },
    {
      name: "SIGUSR2",
      number: 12,
      action: "terminate",
      description: "Application-specific signal",
      standard: "posix"
    },
    {
      name: "SIGPIPE",
      number: 13,
      action: "terminate",
      description: "Broken pipe or socket",
      standard: "posix"
    },
    {
      name: "SIGALRM",
      number: 14,
      action: "terminate",
      description: "Timeout or timer",
      standard: "posix"
    },
    {
      name: "SIGTERM",
      number: 15,
      action: "terminate",
      description: "Termination",
      standard: "ansi"
    },
    {
      name: "SIGSTKFLT",
      number: 16,
      action: "terminate",
      description: "Stack is empty or overflowed",
      standard: "other"
    },
    {
      name: "SIGCHLD",
      number: 17,
      action: "ignore",
      description: "Child process terminated, paused or unpaused",
      standard: "posix"
    },
    {
      name: "SIGCLD",
      number: 17,
      action: "ignore",
      description: "Child process terminated, paused or unpaused",
      standard: "other"
    },
    {
      name: "SIGCONT",
      number: 18,
      action: "unpause",
      description: "Unpaused",
      standard: "posix",
      forced: true
    },
    {
      name: "SIGSTOP",
      number: 19,
      action: "pause",
      description: "Paused",
      standard: "posix",
      forced: true
    },
    {
      name: "SIGTSTP",
      number: 20,
      action: "pause",
      description: 'Paused using CTRL-Z or "suspend"',
      standard: "posix"
    },
    {
      name: "SIGTTIN",
      number: 21,
      action: "pause",
      description: "Background process cannot read terminal input",
      standard: "posix"
    },
    {
      name: "SIGBREAK",
      number: 21,
      action: "terminate",
      description: "User interruption with CTRL-BREAK",
      standard: "other"
    },
    {
      name: "SIGTTOU",
      number: 22,
      action: "pause",
      description: "Background process cannot write to terminal output",
      standard: "posix"
    },
    {
      name: "SIGURG",
      number: 23,
      action: "ignore",
      description: "Socket received out-of-band data",
      standard: "bsd"
    },
    {
      name: "SIGXCPU",
      number: 24,
      action: "core",
      description: "Process timed out",
      standard: "bsd"
    },
    {
      name: "SIGXFSZ",
      number: 25,
      action: "core",
      description: "File too big",
      standard: "bsd"
    },
    {
      name: "SIGVTALRM",
      number: 26,
      action: "terminate",
      description: "Timeout or timer",
      standard: "bsd"
    },
    {
      name: "SIGPROF",
      number: 27,
      action: "terminate",
      description: "Timeout or timer",
      standard: "bsd"
    },
    {
      name: "SIGWINCH",
      number: 28,
      action: "ignore",
      description: "Terminal window size changed",
      standard: "bsd"
    },
    {
      name: "SIGIO",
      number: 29,
      action: "terminate",
      description: "I/O is available",
      standard: "other"
    },
    {
      name: "SIGPOLL",
      number: 29,
      action: "terminate",
      description: "Watched event",
      standard: "other"
    },
    {
      name: "SIGINFO",
      number: 29,
      action: "ignore",
      description: "Request for process information",
      standard: "other"
    },
    {
      name: "SIGPWR",
      number: 30,
      action: "terminate",
      description: "Device running out of power",
      standard: "systemv"
    },
    {
      name: "SIGSYS",
      number: 31,
      action: "core",
      description: "Invalid system call",
      standard: "other"
    },
    {
      name: "SIGUNUSED",
      number: 31,
      action: "terminate",
      description: "Invalid system call",
      standard: "other"
    }
  ];
  core.SIGNALS = SIGNALS;
  return core;
}
var realtime = {};
var hasRequiredRealtime;
function requireRealtime() {
  if (hasRequiredRealtime) return realtime;
  hasRequiredRealtime = 1;
  Object.defineProperty(realtime, "__esModule", { value: true });
  realtime.SIGRTMAX = realtime.getRealtimeSignals = void 0;
  const getRealtimeSignals = function() {
    const length = SIGRTMAX - SIGRTMIN + 1;
    return Array.from({ length }, getRealtimeSignal);
  };
  realtime.getRealtimeSignals = getRealtimeSignals;
  const getRealtimeSignal = function(value, index2) {
    return {
      name: `SIGRT${index2 + 1}`,
      number: SIGRTMIN + index2,
      action: "terminate",
      description: "Application-specific signal (realtime)",
      standard: "posix"
    };
  };
  const SIGRTMIN = 34;
  const SIGRTMAX = 64;
  realtime.SIGRTMAX = SIGRTMAX;
  return realtime;
}
var hasRequiredSignals$1;
function requireSignals$1() {
  if (hasRequiredSignals$1) return signals$1;
  hasRequiredSignals$1 = 1;
  Object.defineProperty(signals$1, "__esModule", { value: true });
  signals$1.getSignals = void 0;
  var _os = require$$0$2;
  var _core = requireCore();
  var _realtime = requireRealtime();
  const getSignals = function() {
    const realtimeSignals = (0, _realtime.getRealtimeSignals)();
    const signals2 = [..._core.SIGNALS, ...realtimeSignals].map(normalizeSignal);
    return signals2;
  };
  signals$1.getSignals = getSignals;
  const normalizeSignal = function({
    name,
    number: defaultNumber,
    description,
    action,
    forced = false,
    standard
  }) {
    const {
      signals: { [name]: constantSignal }
    } = _os.constants;
    const supported = constantSignal !== void 0;
    const number2 = supported ? constantSignal : defaultNumber;
    return { name, number: number2, description, supported, action, forced, standard };
  };
  return signals$1;
}
var hasRequiredMain;
function requireMain() {
  if (hasRequiredMain) return main;
  hasRequiredMain = 1;
  Object.defineProperty(main, "__esModule", { value: true });
  main.signalsByNumber = main.signalsByName = void 0;
  var _os = require$$0$2;
  var _signals = requireSignals$1();
  var _realtime = requireRealtime();
  const getSignalsByName = function() {
    const signals2 = (0, _signals.getSignals)();
    return signals2.reduce(getSignalByName, {});
  };
  const getSignalByName = function(signalByNameMemo, { name, number: number2, description, supported, action, forced, standard }) {
    return {
      ...signalByNameMemo,
      [name]: { name, number: number2, description, supported, action, forced, standard }
    };
  };
  const signalsByName = getSignalsByName();
  main.signalsByName = signalsByName;
  const getSignalsByNumber = function() {
    const signals2 = (0, _signals.getSignals)();
    const length = _realtime.SIGRTMAX + 1;
    const signalsA = Array.from({ length }, (value, number2) => getSignalByNumber(number2, signals2));
    return Object.assign({}, ...signalsA);
  };
  const getSignalByNumber = function(number2, signals2) {
    const signal = findSignalByNumber(number2, signals2);
    if (signal === void 0) {
      return {};
    }
    const { name, description, supported, action, forced, standard } = signal;
    return {
      [number2]: {
        name,
        number: number2,
        description,
        supported,
        action,
        forced,
        standard
      }
    };
  };
  const findSignalByNumber = function(number2, signals2) {
    const signal = signals2.find(({ name }) => _os.constants.signals[name] === number2);
    if (signal !== void 0) {
      return signal;
    }
    return signals2.find((signalA) => signalA.number === number2);
  };
  const signalsByNumber = getSignalsByNumber();
  main.signalsByNumber = signalsByNumber;
  return main;
}
var error;
var hasRequiredError;
function requireError() {
  if (hasRequiredError) return error;
  hasRequiredError = 1;
  const { signalsByName } = requireMain();
  const getErrorPrefix = ({ timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled }) => {
    if (timedOut) {
      return `timed out after ${timeout} milliseconds`;
    }
    if (isCanceled) {
      return "was canceled";
    }
    if (errorCode !== void 0) {
      return `failed with ${errorCode}`;
    }
    if (signal !== void 0) {
      return `was killed with ${signal} (${signalDescription})`;
    }
    if (exitCode !== void 0) {
      return `failed with exit code ${exitCode}`;
    }
    return "failed";
  };
  const makeError = ({
    stdout,
    stderr,
    all,
    error: error2,
    signal,
    exitCode,
    command: command2,
    escapedCommand,
    timedOut,
    isCanceled,
    killed,
    parsed: { options: { timeout } }
  }) => {
    exitCode = exitCode === null ? void 0 : exitCode;
    signal = signal === null ? void 0 : signal;
    const signalDescription = signal === void 0 ? void 0 : signalsByName[signal].description;
    const errorCode = error2 && error2.code;
    const prefix = getErrorPrefix({ timedOut, timeout, errorCode, signal, signalDescription, exitCode, isCanceled });
    const execaMessage = `Command ${prefix}: ${command2}`;
    const isError = Object.prototype.toString.call(error2) === "[object Error]";
    const shortMessage = isError ? `${execaMessage}
${error2.message}` : execaMessage;
    const message = [shortMessage, stderr, stdout].filter(Boolean).join("\n");
    if (isError) {
      error2.originalMessage = error2.message;
      error2.message = message;
    } else {
      error2 = new Error(message);
    }
    error2.shortMessage = shortMessage;
    error2.command = command2;
    error2.escapedCommand = escapedCommand;
    error2.exitCode = exitCode;
    error2.signal = signal;
    error2.signalDescription = signalDescription;
    error2.stdout = stdout;
    error2.stderr = stderr;
    if (all !== void 0) {
      error2.all = all;
    }
    if ("bufferedData" in error2) {
      delete error2.bufferedData;
    }
    error2.failed = true;
    error2.timedOut = Boolean(timedOut);
    error2.isCanceled = isCanceled;
    error2.killed = killed && !timedOut;
    return error2;
  };
  error = makeError;
  return error;
}
var stdio = { exports: {} };
var hasRequiredStdio;
function requireStdio() {
  if (hasRequiredStdio) return stdio.exports;
  hasRequiredStdio = 1;
  const aliases = ["stdin", "stdout", "stderr"];
  const hasAlias = (options2) => aliases.some((alias) => options2[alias] !== void 0);
  const normalizeStdio = (options2) => {
    if (!options2) {
      return;
    }
    const { stdio: stdio2 } = options2;
    if (stdio2 === void 0) {
      return aliases.map((alias) => options2[alias]);
    }
    if (hasAlias(options2)) {
      throw new Error(`It's not possible to provide \`stdio\` in combination with one of ${aliases.map((alias) => `\`${alias}\``).join(", ")}`);
    }
    if (typeof stdio2 === "string") {
      return stdio2;
    }
    if (!Array.isArray(stdio2)) {
      throw new TypeError(`Expected \`stdio\` to be of type \`string\` or \`Array\`, got \`${typeof stdio2}\``);
    }
    const length = Math.max(stdio2.length, aliases.length);
    return Array.from({ length }, (value, index2) => stdio2[index2]);
  };
  stdio.exports = normalizeStdio;
  stdio.exports.node = (options2) => {
    const stdio2 = normalizeStdio(options2);
    if (stdio2 === "ipc") {
      return "ipc";
    }
    if (stdio2 === void 0 || typeof stdio2 === "string") {
      return [stdio2, stdio2, stdio2, "ipc"];
    }
    if (stdio2.includes("ipc")) {
      return stdio2;
    }
    return [...stdio2, "ipc"];
  };
  return stdio.exports;
}
var signalExit = { exports: {} };
var signals = { exports: {} };
var hasRequiredSignals;
function requireSignals() {
  if (hasRequiredSignals) return signals.exports;
  hasRequiredSignals = 1;
  (function(module) {
    module.exports = [
      "SIGABRT",
      "SIGALRM",
      "SIGHUP",
      "SIGINT",
      "SIGTERM"
    ];
    if (process.platform !== "win32") {
      module.exports.push(
        "SIGVTALRM",
        "SIGXCPU",
        "SIGXFSZ",
        "SIGUSR2",
        "SIGTRAP",
        "SIGSYS",
        "SIGQUIT",
        "SIGIOT"
        // should detect profiler and enable/disable accordingly.
        // see #21
        // 'SIGPROF'
      );
    }
    if (process.platform === "linux") {
      module.exports.push(
        "SIGIO",
        "SIGPOLL",
        "SIGPWR",
        "SIGSTKFLT",
        "SIGUNUSED"
      );
    }
  })(signals);
  return signals.exports;
}
var hasRequiredSignalExit;
function requireSignalExit() {
  if (hasRequiredSignalExit) return signalExit.exports;
  hasRequiredSignalExit = 1;
  var process2 = commonjsGlobal.process;
  const processOk = function(process3) {
    return process3 && typeof process3 === "object" && typeof process3.removeListener === "function" && typeof process3.emit === "function" && typeof process3.reallyExit === "function" && typeof process3.listeners === "function" && typeof process3.kill === "function" && typeof process3.pid === "number" && typeof process3.on === "function";
  };
  if (!processOk(process2)) {
    signalExit.exports = function() {
      return function() {
      };
    };
  } else {
    var assert = require$$0$5;
    var signals2 = requireSignals();
    var isWin = /^win/i.test(process2.platform);
    var EE = require$$2;
    if (typeof EE !== "function") {
      EE = EE.EventEmitter;
    }
    var emitter;
    if (process2.__signal_exit_emitter__) {
      emitter = process2.__signal_exit_emitter__;
    } else {
      emitter = process2.__signal_exit_emitter__ = new EE();
      emitter.count = 0;
      emitter.emitted = {};
    }
    if (!emitter.infinite) {
      emitter.setMaxListeners(Infinity);
      emitter.infinite = true;
    }
    signalExit.exports = function(cb, opts) {
      if (!processOk(commonjsGlobal.process)) {
        return function() {
        };
      }
      assert.equal(typeof cb, "function", "a callback must be provided for exit handler");
      if (loaded === false) {
        load();
      }
      var ev = "exit";
      if (opts && opts.alwaysLast) {
        ev = "afterexit";
      }
      var remove = function() {
        emitter.removeListener(ev, cb);
        if (emitter.listeners("exit").length === 0 && emitter.listeners("afterexit").length === 0) {
          unload();
        }
      };
      emitter.on(ev, cb);
      return remove;
    };
    var unload = function unload2() {
      if (!loaded || !processOk(commonjsGlobal.process)) {
        return;
      }
      loaded = false;
      signals2.forEach(function(sig) {
        try {
          process2.removeListener(sig, sigListeners[sig]);
        } catch (er) {
        }
      });
      process2.emit = originalProcessEmit;
      process2.reallyExit = originalProcessReallyExit;
      emitter.count -= 1;
    };
    signalExit.exports.unload = unload;
    var emit = function emit2(event, code, signal) {
      if (emitter.emitted[event]) {
        return;
      }
      emitter.emitted[event] = true;
      emitter.emit(event, code, signal);
    };
    var sigListeners = {};
    signals2.forEach(function(sig) {
      sigListeners[sig] = function listener() {
        if (!processOk(commonjsGlobal.process)) {
          return;
        }
        var listeners = process2.listeners(sig);
        if (listeners.length === emitter.count) {
          unload();
          emit("exit", null, sig);
          emit("afterexit", null, sig);
          if (isWin && sig === "SIGHUP") {
            sig = "SIGINT";
          }
          process2.kill(process2.pid, sig);
        }
      };
    });
    signalExit.exports.signals = function() {
      return signals2;
    };
    var loaded = false;
    var load = function load2() {
      if (loaded || !processOk(commonjsGlobal.process)) {
        return;
      }
      loaded = true;
      emitter.count += 1;
      signals2 = signals2.filter(function(sig) {
        try {
          process2.on(sig, sigListeners[sig]);
          return true;
        } catch (er) {
          return false;
        }
      });
      process2.emit = processEmit;
      process2.reallyExit = processReallyExit;
    };
    signalExit.exports.load = load;
    var originalProcessReallyExit = process2.reallyExit;
    var processReallyExit = function processReallyExit2(code) {
      if (!processOk(commonjsGlobal.process)) {
        return;
      }
      process2.exitCode = code || /* istanbul ignore next */
      0;
      emit("exit", process2.exitCode, null);
      emit("afterexit", process2.exitCode, null);
      originalProcessReallyExit.call(process2, process2.exitCode);
    };
    var originalProcessEmit = process2.emit;
    var processEmit = function processEmit2(ev, arg) {
      if (ev === "exit" && processOk(commonjsGlobal.process)) {
        if (arg !== void 0) {
          process2.exitCode = arg;
        }
        var ret = originalProcessEmit.apply(this, arguments);
        emit("exit", process2.exitCode, null);
        emit("afterexit", process2.exitCode, null);
        return ret;
      } else {
        return originalProcessEmit.apply(this, arguments);
      }
    };
  }
  return signalExit.exports;
}
var kill;
var hasRequiredKill;
function requireKill() {
  if (hasRequiredKill) return kill;
  hasRequiredKill = 1;
  const os = require$$0$2;
  const onExit = requireSignalExit();
  const DEFAULT_FORCE_KILL_TIMEOUT = 1e3 * 5;
  const spawnedKill = (kill2, signal = "SIGTERM", options2 = {}) => {
    const killResult = kill2(signal);
    setKillTimeout(kill2, signal, options2, killResult);
    return killResult;
  };
  const setKillTimeout = (kill2, signal, options2, killResult) => {
    if (!shouldForceKill(signal, options2, killResult)) {
      return;
    }
    const timeout = getForceKillAfterTimeout(options2);
    const t = setTimeout(() => {
      kill2("SIGKILL");
    }, timeout);
    if (t.unref) {
      t.unref();
    }
  };
  const shouldForceKill = (signal, { forceKillAfterTimeout }, killResult) => {
    return isSigterm(signal) && forceKillAfterTimeout !== false && killResult;
  };
  const isSigterm = (signal) => {
    return signal === os.constants.signals.SIGTERM || typeof signal === "string" && signal.toUpperCase() === "SIGTERM";
  };
  const getForceKillAfterTimeout = ({ forceKillAfterTimeout = true }) => {
    if (forceKillAfterTimeout === true) {
      return DEFAULT_FORCE_KILL_TIMEOUT;
    }
    if (!Number.isFinite(forceKillAfterTimeout) || forceKillAfterTimeout < 0) {
      throw new TypeError(`Expected the \`forceKillAfterTimeout\` option to be a non-negative integer, got \`${forceKillAfterTimeout}\` (${typeof forceKillAfterTimeout})`);
    }
    return forceKillAfterTimeout;
  };
  const spawnedCancel = (spawned, context) => {
    const killResult = spawned.kill();
    if (killResult) {
      context.isCanceled = true;
    }
  };
  const timeoutKill = (spawned, signal, reject) => {
    spawned.kill(signal);
    reject(Object.assign(new Error("Timed out"), { timedOut: true, signal }));
  };
  const setupTimeout = (spawned, { timeout, killSignal = "SIGTERM" }, spawnedPromise) => {
    if (timeout === 0 || timeout === void 0) {
      return spawnedPromise;
    }
    let timeoutId;
    const timeoutPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(() => {
        timeoutKill(spawned, killSignal, reject);
      }, timeout);
    });
    const safeSpawnedPromise = spawnedPromise.finally(() => {
      clearTimeout(timeoutId);
    });
    return Promise.race([timeoutPromise, safeSpawnedPromise]);
  };
  const validateTimeout = ({ timeout }) => {
    if (timeout !== void 0 && (!Number.isFinite(timeout) || timeout < 0)) {
      throw new TypeError(`Expected the \`timeout\` option to be a non-negative integer, got \`${timeout}\` (${typeof timeout})`);
    }
  };
  const setExitHandler = async (spawned, { cleanup, detached }, timedPromise) => {
    if (!cleanup || detached) {
      return timedPromise;
    }
    const removeExitHandler = onExit(() => {
      spawned.kill();
    });
    return timedPromise.finally(() => {
      removeExitHandler();
    });
  };
  kill = {
    spawnedKill,
    spawnedCancel,
    setupTimeout,
    validateTimeout,
    setExitHandler
  };
  return kill;
}
var isStream_1;
var hasRequiredIsStream;
function requireIsStream() {
  if (hasRequiredIsStream) return isStream_1;
  hasRequiredIsStream = 1;
  const isStream = (stream2) => stream2 !== null && typeof stream2 === "object" && typeof stream2.pipe === "function";
  isStream.writable = (stream2) => isStream(stream2) && stream2.writable !== false && typeof stream2._write === "function" && typeof stream2._writableState === "object";
  isStream.readable = (stream2) => isStream(stream2) && stream2.readable !== false && typeof stream2._read === "function" && typeof stream2._readableState === "object";
  isStream.duplex = (stream2) => isStream.writable(stream2) && isStream.readable(stream2);
  isStream.transform = (stream2) => isStream.duplex(stream2) && typeof stream2._transform === "function";
  isStream_1 = isStream;
  return isStream_1;
}
var getStream = { exports: {} };
var bufferStream;
var hasRequiredBufferStream;
function requireBufferStream() {
  if (hasRequiredBufferStream) return bufferStream;
  hasRequiredBufferStream = 1;
  const { PassThrough: PassThroughStream } = require$$0$6;
  bufferStream = (options2) => {
    options2 = { ...options2 };
    const { array: array2 } = options2;
    let { encoding } = options2;
    const isBuffer2 = encoding === "buffer";
    let objectMode = false;
    if (array2) {
      objectMode = !(encoding || isBuffer2);
    } else {
      encoding = encoding || "utf8";
    }
    if (isBuffer2) {
      encoding = null;
    }
    const stream2 = new PassThroughStream({ objectMode });
    if (encoding) {
      stream2.setEncoding(encoding);
    }
    let length = 0;
    const chunks = [];
    stream2.on("data", (chunk) => {
      chunks.push(chunk);
      if (objectMode) {
        length = chunks.length;
      } else {
        length += chunk.length;
      }
    });
    stream2.getBufferedValue = () => {
      if (array2) {
        return chunks;
      }
      return isBuffer2 ? Buffer.concat(chunks, length) : chunks.join("");
    };
    stream2.getBufferedLength = () => length;
    return stream2;
  };
  return bufferStream;
}
var hasRequiredGetStream;
function requireGetStream() {
  if (hasRequiredGetStream) return getStream.exports;
  hasRequiredGetStream = 1;
  const { constants: BufferConstants } = require$$0$7;
  const stream2 = require$$0$6;
  const { promisify } = require$$2$1;
  const bufferStream2 = requireBufferStream();
  const streamPipelinePromisified = promisify(stream2.pipeline);
  class MaxBufferError extends Error {
    constructor() {
      super("maxBuffer exceeded");
      this.name = "MaxBufferError";
    }
  }
  async function getStream$1(inputStream, options2) {
    if (!inputStream) {
      throw new Error("Expected a stream");
    }
    options2 = {
      maxBuffer: Infinity,
      ...options2
    };
    const { maxBuffer } = options2;
    const stream3 = bufferStream2(options2);
    await new Promise((resolve, reject) => {
      const rejectPromise = (error2) => {
        if (error2 && stream3.getBufferedLength() <= BufferConstants.MAX_LENGTH) {
          error2.bufferedData = stream3.getBufferedValue();
        }
        reject(error2);
      };
      (async () => {
        try {
          await streamPipelinePromisified(inputStream, stream3);
          resolve();
        } catch (error2) {
          rejectPromise(error2);
        }
      })();
      stream3.on("data", () => {
        if (stream3.getBufferedLength() > maxBuffer) {
          rejectPromise(new MaxBufferError());
        }
      });
    });
    return stream3.getBufferedValue();
  }
  getStream.exports = getStream$1;
  getStream.exports.buffer = (stream3, options2) => getStream$1(stream3, { ...options2, encoding: "buffer" });
  getStream.exports.array = (stream3, options2) => getStream$1(stream3, { ...options2, array: true });
  getStream.exports.MaxBufferError = MaxBufferError;
  return getStream.exports;
}
var mergeStream;
var hasRequiredMergeStream;
function requireMergeStream() {
  if (hasRequiredMergeStream) return mergeStream;
  hasRequiredMergeStream = 1;
  const { PassThrough } = require$$0$6;
  mergeStream = function() {
    var sources = [];
    var output = new PassThrough({ objectMode: true });
    output.setMaxListeners(0);
    output.add = add;
    output.isEmpty = isEmpty;
    output.on("unpipe", remove);
    Array.prototype.slice.call(arguments).forEach(add);
    return output;
    function add(source) {
      if (Array.isArray(source)) {
        source.forEach(add);
        return this;
      }
      sources.push(source);
      source.once("end", remove.bind(null, source));
      source.once("error", output.emit.bind(output, "error"));
      source.pipe(output, { end: false });
      return this;
    }
    function isEmpty() {
      return sources.length == 0;
    }
    function remove(source) {
      sources = sources.filter(function(it) {
        return it !== source;
      });
      if (!sources.length && output.readable) {
        output.end();
      }
    }
  };
  return mergeStream;
}
var stream;
var hasRequiredStream;
function requireStream() {
  if (hasRequiredStream) return stream;
  hasRequiredStream = 1;
  const isStream = requireIsStream();
  const getStream2 = requireGetStream();
  const mergeStream2 = requireMergeStream();
  const handleInput = (spawned, input) => {
    if (input === void 0 || spawned.stdin === void 0) {
      return;
    }
    if (isStream(input)) {
      input.pipe(spawned.stdin);
    } else {
      spawned.stdin.end(input);
    }
  };
  const makeAllStream = (spawned, { all }) => {
    if (!all || !spawned.stdout && !spawned.stderr) {
      return;
    }
    const mixed2 = mergeStream2();
    if (spawned.stdout) {
      mixed2.add(spawned.stdout);
    }
    if (spawned.stderr) {
      mixed2.add(spawned.stderr);
    }
    return mixed2;
  };
  const getBufferedData = async (stream2, streamPromise) => {
    if (!stream2) {
      return;
    }
    stream2.destroy();
    try {
      return await streamPromise;
    } catch (error2) {
      return error2.bufferedData;
    }
  };
  const getStreamPromise = (stream2, { encoding, buffer, maxBuffer }) => {
    if (!stream2 || !buffer) {
      return;
    }
    if (encoding) {
      return getStream2(stream2, { encoding, maxBuffer });
    }
    return getStream2.buffer(stream2, { maxBuffer });
  };
  const getSpawnedResult = async ({ stdout, stderr, all }, { encoding, buffer, maxBuffer }, processDone) => {
    const stdoutPromise = getStreamPromise(stdout, { encoding, buffer, maxBuffer });
    const stderrPromise = getStreamPromise(stderr, { encoding, buffer, maxBuffer });
    const allPromise = getStreamPromise(all, { encoding, buffer, maxBuffer: maxBuffer * 2 });
    try {
      return await Promise.all([processDone, stdoutPromise, stderrPromise, allPromise]);
    } catch (error2) {
      return Promise.all([
        { error: error2, signal: error2.signal, timedOut: error2.timedOut },
        getBufferedData(stdout, stdoutPromise),
        getBufferedData(stderr, stderrPromise),
        getBufferedData(all, allPromise)
      ]);
    }
  };
  const validateInputSync = ({ input }) => {
    if (isStream(input)) {
      throw new TypeError("The `input` option cannot be a stream in sync mode");
    }
  };
  stream = {
    handleInput,
    makeAllStream,
    getSpawnedResult,
    validateInputSync
  };
  return stream;
}
var promise;
var hasRequiredPromise;
function requirePromise() {
  if (hasRequiredPromise) return promise;
  hasRequiredPromise = 1;
  const nativePromisePrototype = (async () => {
  })().constructor.prototype;
  const descriptors = ["then", "catch", "finally"].map((property) => [
    property,
    Reflect.getOwnPropertyDescriptor(nativePromisePrototype, property)
  ]);
  const mergePromise = (spawned, promise2) => {
    for (const [property, descriptor] of descriptors) {
      const value = typeof promise2 === "function" ? (...args) => Reflect.apply(descriptor.value, promise2(), args) : descriptor.value.bind(promise2);
      Reflect.defineProperty(spawned, property, { ...descriptor, value });
    }
    return spawned;
  };
  const getSpawnedPromise = (spawned) => {
    return new Promise((resolve, reject) => {
      spawned.on("exit", (exitCode, signal) => {
        resolve({ exitCode, signal });
      });
      spawned.on("error", (error2) => {
        reject(error2);
      });
      if (spawned.stdin) {
        spawned.stdin.on("error", (error2) => {
          reject(error2);
        });
      }
    });
  };
  promise = {
    mergePromise,
    getSpawnedPromise
  };
  return promise;
}
var command;
var hasRequiredCommand;
function requireCommand() {
  if (hasRequiredCommand) return command;
  hasRequiredCommand = 1;
  const normalizeArgs = (file, args = []) => {
    if (!Array.isArray(args)) {
      return [file];
    }
    return [file, ...args];
  };
  const NO_ESCAPE_REGEXP = /^[\w.-]+$/;
  const DOUBLE_QUOTES_REGEXP = /"/g;
  const escapeArg = (arg) => {
    if (typeof arg !== "string" || NO_ESCAPE_REGEXP.test(arg)) {
      return arg;
    }
    return `"${arg.replace(DOUBLE_QUOTES_REGEXP, '\\"')}"`;
  };
  const joinCommand = (file, args) => {
    return normalizeArgs(file, args).join(" ");
  };
  const getEscapedCommand = (file, args) => {
    return normalizeArgs(file, args).map((arg) => escapeArg(arg)).join(" ");
  };
  const SPACES_REGEXP = / +/g;
  const parseCommand = (command2) => {
    const tokens = [];
    for (const token of command2.trim().split(SPACES_REGEXP)) {
      const previousToken = tokens[tokens.length - 1];
      if (previousToken && previousToken.endsWith("\\")) {
        tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
      } else {
        tokens.push(token);
      }
    }
    return tokens;
  };
  command = {
    joinCommand,
    getEscapedCommand,
    parseCommand
  };
  return command;
}
var hasRequiredExeca;
function requireExeca() {
  if (hasRequiredExeca) return execa.exports;
  hasRequiredExeca = 1;
  const path = require$$0$4;
  const childProcess = require$$0$1;
  const crossSpawn2 = requireCrossSpawn();
  const stripFinalNewline2 = requireStripFinalNewline();
  const npmRunPath2 = requireNpmRunPath();
  const onetime2 = requireOnetime();
  const makeError = requireError();
  const normalizeStdio = requireStdio();
  const { spawnedKill, spawnedCancel, setupTimeout, validateTimeout, setExitHandler } = requireKill();
  const { handleInput, getSpawnedResult, makeAllStream, validateInputSync } = requireStream();
  const { mergePromise, getSpawnedPromise } = requirePromise();
  const { joinCommand, parseCommand, getEscapedCommand } = requireCommand();
  const DEFAULT_MAX_BUFFER = 1e3 * 1e3 * 100;
  const getEnv = ({ env: envOption, extendEnv, preferLocal, localDir, execPath }) => {
    const env2 = extendEnv ? { ...process.env, ...envOption } : envOption;
    if (preferLocal) {
      return npmRunPath2.env({ env: env2, cwd: localDir, execPath });
    }
    return env2;
  };
  const handleArguments = (file, args, options2 = {}) => {
    const parsed = crossSpawn2._parse(file, args, options2);
    file = parsed.command;
    args = parsed.args;
    options2 = parsed.options;
    options2 = {
      maxBuffer: DEFAULT_MAX_BUFFER,
      buffer: true,
      stripFinalNewline: true,
      extendEnv: true,
      preferLocal: false,
      localDir: options2.cwd || process.cwd(),
      execPath: process.execPath,
      encoding: "utf8",
      reject: true,
      cleanup: true,
      all: false,
      windowsHide: true,
      ...options2
    };
    options2.env = getEnv(options2);
    options2.stdio = normalizeStdio(options2);
    if (process.platform === "win32" && path.basename(file, ".exe") === "cmd") {
      args.unshift("/q");
    }
    return { file, args, options: options2, parsed };
  };
  const handleOutput = (options2, value, error2) => {
    if (typeof value !== "string" && !Buffer.isBuffer(value)) {
      return error2 === void 0 ? void 0 : "";
    }
    if (options2.stripFinalNewline) {
      return stripFinalNewline2(value);
    }
    return value;
  };
  const execa$1 = (file, args, options2) => {
    const parsed = handleArguments(file, args, options2);
    const command2 = joinCommand(file, args);
    const escapedCommand = getEscapedCommand(file, args);
    validateTimeout(parsed.options);
    let spawned;
    try {
      spawned = childProcess.spawn(parsed.file, parsed.args, parsed.options);
    } catch (error2) {
      const dummySpawned = new childProcess.ChildProcess();
      const errorPromise = Promise.reject(makeError({
        error: error2,
        stdout: "",
        stderr: "",
        all: "",
        command: command2,
        escapedCommand,
        parsed,
        timedOut: false,
        isCanceled: false,
        killed: false
      }));
      return mergePromise(dummySpawned, errorPromise);
    }
    const spawnedPromise = getSpawnedPromise(spawned);
    const timedPromise = setupTimeout(spawned, parsed.options, spawnedPromise);
    const processDone = setExitHandler(spawned, parsed.options, timedPromise);
    const context = { isCanceled: false };
    spawned.kill = spawnedKill.bind(null, spawned.kill.bind(spawned));
    spawned.cancel = spawnedCancel.bind(null, spawned, context);
    const handlePromise = async () => {
      const [{ error: error2, exitCode, signal, timedOut }, stdoutResult, stderrResult, allResult] = await getSpawnedResult(spawned, parsed.options, processDone);
      const stdout = handleOutput(parsed.options, stdoutResult);
      const stderr = handleOutput(parsed.options, stderrResult);
      const all = handleOutput(parsed.options, allResult);
      if (error2 || exitCode !== 0 || signal !== null) {
        const returnedError = makeError({
          error: error2,
          exitCode,
          signal,
          stdout,
          stderr,
          all,
          command: command2,
          escapedCommand,
          parsed,
          timedOut,
          isCanceled: context.isCanceled,
          killed: spawned.killed
        });
        if (!parsed.options.reject) {
          return returnedError;
        }
        throw returnedError;
      }
      return {
        command: command2,
        escapedCommand,
        exitCode: 0,
        stdout,
        stderr,
        all,
        failed: false,
        timedOut: false,
        isCanceled: false,
        killed: false
      };
    };
    const handlePromiseOnce = onetime2(handlePromise);
    handleInput(spawned, parsed.options.input);
    spawned.all = makeAllStream(spawned, parsed.options);
    return mergePromise(spawned, handlePromiseOnce);
  };
  execa.exports = execa$1;
  execa.exports.sync = (file, args, options2) => {
    const parsed = handleArguments(file, args, options2);
    const command2 = joinCommand(file, args);
    const escapedCommand = getEscapedCommand(file, args);
    validateInputSync(parsed.options);
    let result;
    try {
      result = childProcess.spawnSync(parsed.file, parsed.args, parsed.options);
    } catch (error2) {
      throw makeError({
        error: error2,
        stdout: "",
        stderr: "",
        all: "",
        command: command2,
        escapedCommand,
        parsed,
        timedOut: false,
        isCanceled: false,
        killed: false
      });
    }
    const stdout = handleOutput(parsed.options, result.stdout, result.error);
    const stderr = handleOutput(parsed.options, result.stderr, result.error);
    if (result.error || result.status !== 0 || result.signal !== null) {
      const error2 = makeError({
        stdout,
        stderr,
        error: result.error,
        signal: result.signal,
        exitCode: result.status,
        command: command2,
        escapedCommand,
        parsed,
        timedOut: result.error && result.error.code === "ETIMEDOUT",
        isCanceled: false,
        killed: result.signal !== null
      });
      if (!parsed.options.reject) {
        return error2;
      }
      throw error2;
    }
    return {
      command: command2,
      escapedCommand,
      exitCode: 0,
      stdout,
      stderr,
      failed: false,
      timedOut: false,
      isCanceled: false,
      killed: false
    };
  };
  execa.exports.command = (command2, options2) => {
    const [file, ...args] = parseCommand(command2);
    return execa$1(file, args, options2);
  };
  execa.exports.commandSync = (command2, options2) => {
    const [file, ...args] = parseCommand(command2);
    return execa$1.sync(file, args, options2);
  };
  execa.exports.node = (scriptPath, args, options2 = {}) => {
    if (args && !Array.isArray(args) && typeof args === "object") {
      options2 = args;
      args = [];
    }
    const stdio2 = normalizeStdio.node(options2);
    const defaultExecArgv = process.execArgv.filter((arg) => !arg.startsWith("--inspect"));
    const {
      nodePath = process.execPath,
      nodeOptions = defaultExecArgv
    } = options2;
    return execa$1(
      nodePath,
      [
        ...nodeOptions,
        scriptPath,
        ...Array.isArray(args) ? args : []
      ],
      {
        ...options2,
        stdin: void 0,
        stdout: void 0,
        stderr: void 0,
        stdio: stdio2,
        shell: false
      }
    );
  };
  return execa.exports;
}
requireExeca();
var slugify$1 = { exports: {} };
var escapeStringRegexp$1;
var hasRequiredEscapeStringRegexp$1;
function requireEscapeStringRegexp$1() {
  if (hasRequiredEscapeStringRegexp$1) return escapeStringRegexp$1;
  hasRequiredEscapeStringRegexp$1 = 1;
  escapeStringRegexp$1 = (string2) => {
    if (typeof string2 !== "string") {
      throw new TypeError("Expected a string");
    }
    return string2.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
  };
  return escapeStringRegexp$1;
}
var lodash_deburr;
var hasRequiredLodash_deburr;
function requireLodash_deburr() {
  if (hasRequiredLodash_deburr) return lodash_deburr;
  hasRequiredLodash_deburr = 1;
  var symbolTag = "[object Symbol]";
  var reLatin = /[\xc0-\xd6\xd8-\xf6\xf8-\xff\u0100-\u017f]/g;
  var rsComboMarksRange = "\\u0300-\\u036f\\ufe20-\\ufe23", rsComboSymbolsRange = "\\u20d0-\\u20f0";
  var rsCombo = "[" + rsComboMarksRange + rsComboSymbolsRange + "]";
  var reComboMark = RegExp(rsCombo, "g");
  var deburredLetters = {
    // Latin-1 Supplement block.
    "À": "A",
    "Á": "A",
    "Â": "A",
    "Ã": "A",
    "Ä": "A",
    "Å": "A",
    "à": "a",
    "á": "a",
    "â": "a",
    "ã": "a",
    "ä": "a",
    "å": "a",
    "Ç": "C",
    "ç": "c",
    "Ð": "D",
    "ð": "d",
    "È": "E",
    "É": "E",
    "Ê": "E",
    "Ë": "E",
    "è": "e",
    "é": "e",
    "ê": "e",
    "ë": "e",
    "Ì": "I",
    "Í": "I",
    "Î": "I",
    "Ï": "I",
    "ì": "i",
    "í": "i",
    "î": "i",
    "ï": "i",
    "Ñ": "N",
    "ñ": "n",
    "Ò": "O",
    "Ó": "O",
    "Ô": "O",
    "Õ": "O",
    "Ö": "O",
    "Ø": "O",
    "ò": "o",
    "ó": "o",
    "ô": "o",
    "õ": "o",
    "ö": "o",
    "ø": "o",
    "Ù": "U",
    "Ú": "U",
    "Û": "U",
    "Ü": "U",
    "ù": "u",
    "ú": "u",
    "û": "u",
    "ü": "u",
    "Ý": "Y",
    "ý": "y",
    "ÿ": "y",
    "Æ": "Ae",
    "æ": "ae",
    "Þ": "Th",
    "þ": "th",
    "ß": "ss",
    // Latin Extended-A block.
    "Ā": "A",
    "Ă": "A",
    "Ą": "A",
    "ā": "a",
    "ă": "a",
    "ą": "a",
    "Ć": "C",
    "Ĉ": "C",
    "Ċ": "C",
    "Č": "C",
    "ć": "c",
    "ĉ": "c",
    "ċ": "c",
    "č": "c",
    "Ď": "D",
    "Đ": "D",
    "ď": "d",
    "đ": "d",
    "Ē": "E",
    "Ĕ": "E",
    "Ė": "E",
    "Ę": "E",
    "Ě": "E",
    "ē": "e",
    "ĕ": "e",
    "ė": "e",
    "ę": "e",
    "ě": "e",
    "Ĝ": "G",
    "Ğ": "G",
    "Ġ": "G",
    "Ģ": "G",
    "ĝ": "g",
    "ğ": "g",
    "ġ": "g",
    "ģ": "g",
    "Ĥ": "H",
    "Ħ": "H",
    "ĥ": "h",
    "ħ": "h",
    "Ĩ": "I",
    "Ī": "I",
    "Ĭ": "I",
    "Į": "I",
    "İ": "I",
    "ĩ": "i",
    "ī": "i",
    "ĭ": "i",
    "į": "i",
    "ı": "i",
    "Ĵ": "J",
    "ĵ": "j",
    "Ķ": "K",
    "ķ": "k",
    "ĸ": "k",
    "Ĺ": "L",
    "Ļ": "L",
    "Ľ": "L",
    "Ŀ": "L",
    "Ł": "L",
    "ĺ": "l",
    "ļ": "l",
    "ľ": "l",
    "ŀ": "l",
    "ł": "l",
    "Ń": "N",
    "Ņ": "N",
    "Ň": "N",
    "Ŋ": "N",
    "ń": "n",
    "ņ": "n",
    "ň": "n",
    "ŋ": "n",
    "Ō": "O",
    "Ŏ": "O",
    "Ő": "O",
    "ō": "o",
    "ŏ": "o",
    "ő": "o",
    "Ŕ": "R",
    "Ŗ": "R",
    "Ř": "R",
    "ŕ": "r",
    "ŗ": "r",
    "ř": "r",
    "Ś": "S",
    "Ŝ": "S",
    "Ş": "S",
    "Š": "S",
    "ś": "s",
    "ŝ": "s",
    "ş": "s",
    "š": "s",
    "Ţ": "T",
    "Ť": "T",
    "Ŧ": "T",
    "ţ": "t",
    "ť": "t",
    "ŧ": "t",
    "Ũ": "U",
    "Ū": "U",
    "Ŭ": "U",
    "Ů": "U",
    "Ű": "U",
    "Ų": "U",
    "ũ": "u",
    "ū": "u",
    "ŭ": "u",
    "ů": "u",
    "ű": "u",
    "ų": "u",
    "Ŵ": "W",
    "ŵ": "w",
    "Ŷ": "Y",
    "ŷ": "y",
    "Ÿ": "Y",
    "Ź": "Z",
    "Ż": "Z",
    "Ž": "Z",
    "ź": "z",
    "ż": "z",
    "ž": "z",
    "Ĳ": "IJ",
    "ĳ": "ij",
    "Œ": "Oe",
    "œ": "oe",
    "ŉ": "'n",
    "ſ": "ss"
  };
  var freeGlobal = typeof commonjsGlobal == "object" && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;
  var freeSelf = typeof self == "object" && self && self.Object === Object && self;
  var root = freeGlobal || freeSelf || Function("return this")();
  function basePropertyOf(object2) {
    return function(key) {
      return object2 == null ? void 0 : object2[key];
    };
  }
  var deburrLetter = basePropertyOf(deburredLetters);
  var objectProto = Object.prototype;
  var objectToString = objectProto.toString;
  var Symbol2 = root.Symbol;
  var symbolProto = Symbol2 ? Symbol2.prototype : void 0, symbolToString2 = symbolProto ? symbolProto.toString : void 0;
  function baseToString(value) {
    if (typeof value == "string") {
      return value;
    }
    if (isSymbol(value)) {
      return symbolToString2 ? symbolToString2.call(value) : "";
    }
    var result = value + "";
    return result == "0" && 1 / value == -Infinity ? "-0" : result;
  }
  function isObjectLike(value) {
    return !!value && typeof value == "object";
  }
  function isSymbol(value) {
    return typeof value == "symbol" || isObjectLike(value) && objectToString.call(value) == symbolTag;
  }
  function toString2(value) {
    return value == null ? "" : baseToString(value);
  }
  function deburr(string2) {
    string2 = toString2(string2);
    return string2 && string2.replace(reLatin, deburrLetter).replace(reComboMark, "");
  }
  lodash_deburr = deburr;
  return lodash_deburr;
}
var escapeStringRegexp;
var hasRequiredEscapeStringRegexp;
function requireEscapeStringRegexp() {
  if (hasRequiredEscapeStringRegexp) return escapeStringRegexp;
  hasRequiredEscapeStringRegexp = 1;
  const matchOperatorsRegex = /[|\\{}()[\]^$+*?.-]/g;
  escapeStringRegexp = (string2) => {
    if (typeof string2 !== "string") {
      throw new TypeError("Expected a string");
    }
    return string2.replace(matchOperatorsRegex, "\\$&");
  };
  return escapeStringRegexp;
}
var replacements;
var hasRequiredReplacements;
function requireReplacements() {
  if (hasRequiredReplacements) return replacements;
  hasRequiredReplacements = 1;
  replacements = [
    // German umlauts
    ["ß", "ss"],
    ["ä", "ae"],
    ["Ä", "Ae"],
    ["ö", "oe"],
    ["Ö", "Oe"],
    ["ü", "ue"],
    ["Ü", "Ue"],
    // Latin
    ["À", "A"],
    ["Á", "A"],
    ["Â", "A"],
    ["Ã", "A"],
    ["Ä", "Ae"],
    ["Å", "A"],
    ["Æ", "AE"],
    ["Ç", "C"],
    ["È", "E"],
    ["É", "E"],
    ["Ê", "E"],
    ["Ë", "E"],
    ["Ì", "I"],
    ["Í", "I"],
    ["Î", "I"],
    ["Ï", "I"],
    ["Ð", "D"],
    ["Ñ", "N"],
    ["Ò", "O"],
    ["Ó", "O"],
    ["Ô", "O"],
    ["Õ", "O"],
    ["Ö", "Oe"],
    ["Ő", "O"],
    ["Ø", "O"],
    ["Ù", "U"],
    ["Ú", "U"],
    ["Û", "U"],
    ["Ü", "Ue"],
    ["Ű", "U"],
    ["Ý", "Y"],
    ["Þ", "TH"],
    ["ß", "ss"],
    ["à", "a"],
    ["á", "a"],
    ["â", "a"],
    ["ã", "a"],
    ["ä", "ae"],
    ["å", "a"],
    ["æ", "ae"],
    ["ç", "c"],
    ["è", "e"],
    ["é", "e"],
    ["ê", "e"],
    ["ë", "e"],
    ["ì", "i"],
    ["í", "i"],
    ["î", "i"],
    ["ï", "i"],
    ["ð", "d"],
    ["ñ", "n"],
    ["ò", "o"],
    ["ó", "o"],
    ["ô", "o"],
    ["õ", "o"],
    ["ö", "oe"],
    ["ő", "o"],
    ["ø", "o"],
    ["ù", "u"],
    ["ú", "u"],
    ["û", "u"],
    ["ü", "ue"],
    ["ű", "u"],
    ["ý", "y"],
    ["þ", "th"],
    ["ÿ", "y"],
    ["ẞ", "SS"],
    // Vietnamese
    ["à", "a"],
    ["À", "A"],
    ["á", "a"],
    ["Á", "A"],
    ["â", "a"],
    ["Â", "A"],
    ["ã", "a"],
    ["Ã", "A"],
    ["è", "e"],
    ["È", "E"],
    ["é", "e"],
    ["É", "E"],
    ["ê", "e"],
    ["Ê", "E"],
    ["ì", "i"],
    ["Ì", "I"],
    ["í", "i"],
    ["Í", "I"],
    ["ò", "o"],
    ["Ò", "O"],
    ["ó", "o"],
    ["Ó", "O"],
    ["ô", "o"],
    ["Ô", "O"],
    ["õ", "o"],
    ["Õ", "O"],
    ["ù", "u"],
    ["Ù", "U"],
    ["ú", "u"],
    ["Ú", "U"],
    ["ý", "y"],
    ["Ý", "Y"],
    ["ă", "a"],
    ["Ă", "A"],
    ["Đ", "D"],
    ["đ", "d"],
    ["ĩ", "i"],
    ["Ĩ", "I"],
    ["ũ", "u"],
    ["Ũ", "U"],
    ["ơ", "o"],
    ["Ơ", "O"],
    ["ư", "u"],
    ["Ư", "U"],
    ["ạ", "a"],
    ["Ạ", "A"],
    ["ả", "a"],
    ["Ả", "A"],
    ["ấ", "a"],
    ["Ấ", "A"],
    ["ầ", "a"],
    ["Ầ", "A"],
    ["ẩ", "a"],
    ["Ẩ", "A"],
    ["ẫ", "a"],
    ["Ẫ", "A"],
    ["ậ", "a"],
    ["Ậ", "A"],
    ["ắ", "a"],
    ["Ắ", "A"],
    ["ằ", "a"],
    ["Ằ", "A"],
    ["ẳ", "a"],
    ["Ẳ", "A"],
    ["ẵ", "a"],
    ["Ẵ", "A"],
    ["ặ", "a"],
    ["Ặ", "A"],
    ["ẹ", "e"],
    ["Ẹ", "E"],
    ["ẻ", "e"],
    ["Ẻ", "E"],
    ["ẽ", "e"],
    ["Ẽ", "E"],
    ["ế", "e"],
    ["Ế", "E"],
    ["ề", "e"],
    ["Ề", "E"],
    ["ể", "e"],
    ["Ể", "E"],
    ["ễ", "e"],
    ["Ễ", "E"],
    ["ệ", "e"],
    ["Ệ", "E"],
    ["ỉ", "i"],
    ["Ỉ", "I"],
    ["ị", "i"],
    ["Ị", "I"],
    ["ọ", "o"],
    ["Ọ", "O"],
    ["ỏ", "o"],
    ["Ỏ", "O"],
    ["ố", "o"],
    ["Ố", "O"],
    ["ồ", "o"],
    ["Ồ", "O"],
    ["ổ", "o"],
    ["Ổ", "O"],
    ["ỗ", "o"],
    ["Ỗ", "O"],
    ["ộ", "o"],
    ["Ộ", "O"],
    ["ớ", "o"],
    ["Ớ", "O"],
    ["ờ", "o"],
    ["Ờ", "O"],
    ["ở", "o"],
    ["Ở", "O"],
    ["ỡ", "o"],
    ["Ỡ", "O"],
    ["ợ", "o"],
    ["Ợ", "O"],
    ["ụ", "u"],
    ["Ụ", "U"],
    ["ủ", "u"],
    ["Ủ", "U"],
    ["ứ", "u"],
    ["Ứ", "U"],
    ["ừ", "u"],
    ["Ừ", "U"],
    ["ử", "u"],
    ["Ử", "U"],
    ["ữ", "u"],
    ["Ữ", "U"],
    ["ự", "u"],
    ["Ự", "U"],
    ["ỳ", "y"],
    ["Ỳ", "Y"],
    ["ỵ", "y"],
    ["Ỵ", "Y"],
    ["ỷ", "y"],
    ["Ỷ", "Y"],
    ["ỹ", "y"],
    ["Ỹ", "Y"],
    // Arabic
    ["ء", "e"],
    ["آ", "a"],
    ["أ", "a"],
    ["ؤ", "w"],
    ["إ", "i"],
    ["ئ", "y"],
    ["ا", "a"],
    ["ب", "b"],
    ["ة", "t"],
    ["ت", "t"],
    ["ث", "th"],
    ["ج", "j"],
    ["ح", "h"],
    ["خ", "kh"],
    ["د", "d"],
    ["ذ", "dh"],
    ["ر", "r"],
    ["ز", "z"],
    ["س", "s"],
    ["ش", "sh"],
    ["ص", "s"],
    ["ض", "d"],
    ["ط", "t"],
    ["ظ", "z"],
    ["ع", "e"],
    ["غ", "gh"],
    ["ـ", "_"],
    ["ف", "f"],
    ["ق", "q"],
    ["ك", "k"],
    ["ل", "l"],
    ["م", "m"],
    ["ن", "n"],
    ["ه", "h"],
    ["و", "w"],
    ["ى", "a"],
    ["ي", "y"],
    ["َ‎", "a"],
    ["ُ", "u"],
    ["ِ‎", "i"],
    ["٠", "0"],
    ["١", "1"],
    ["٢", "2"],
    ["٣", "3"],
    ["٤", "4"],
    ["٥", "5"],
    ["٦", "6"],
    ["٧", "7"],
    ["٨", "8"],
    ["٩", "9"],
    // Persian / Farsi
    ["چ", "ch"],
    ["ک", "k"],
    ["گ", "g"],
    ["پ", "p"],
    ["ژ", "zh"],
    ["ی", "y"],
    ["۰", "0"],
    ["۱", "1"],
    ["۲", "2"],
    ["۳", "3"],
    ["۴", "4"],
    ["۵", "5"],
    ["۶", "6"],
    ["۷", "7"],
    ["۸", "8"],
    ["۹", "9"],
    // Pashto
    ["ټ", "p"],
    ["ځ", "z"],
    ["څ", "c"],
    ["ډ", "d"],
    ["ﺫ", "d"],
    ["ﺭ", "r"],
    ["ړ", "r"],
    ["ﺯ", "z"],
    ["ږ", "g"],
    ["ښ", "x"],
    ["ګ", "g"],
    ["ڼ", "n"],
    ["ۀ", "e"],
    ["ې", "e"],
    ["ۍ", "ai"],
    // Urdu
    ["ٹ", "t"],
    ["ڈ", "d"],
    ["ڑ", "r"],
    ["ں", "n"],
    ["ہ", "h"],
    ["ھ", "h"],
    ["ے", "e"],
    // Russian
    ["А", "A"],
    ["а", "a"],
    ["Б", "B"],
    ["б", "b"],
    ["В", "V"],
    ["в", "v"],
    ["Г", "G"],
    ["г", "g"],
    ["Д", "D"],
    ["д", "d"],
    ["Е", "E"],
    ["е", "e"],
    ["Ж", "Zh"],
    ["ж", "zh"],
    ["З", "Z"],
    ["з", "z"],
    ["И", "I"],
    ["и", "i"],
    ["Й", "J"],
    ["й", "j"],
    ["К", "K"],
    ["к", "k"],
    ["Л", "L"],
    ["л", "l"],
    ["М", "M"],
    ["м", "m"],
    ["Н", "N"],
    ["н", "n"],
    ["О", "O"],
    ["о", "o"],
    ["П", "P"],
    ["п", "p"],
    ["Р", "R"],
    ["р", "r"],
    ["С", "S"],
    ["с", "s"],
    ["Т", "T"],
    ["т", "t"],
    ["У", "U"],
    ["у", "u"],
    ["Ф", "F"],
    ["ф", "f"],
    ["Х", "H"],
    ["х", "h"],
    ["Ц", "Cz"],
    ["ц", "cz"],
    ["Ч", "Ch"],
    ["ч", "ch"],
    ["Ш", "Sh"],
    ["ш", "sh"],
    ["Щ", "Shh"],
    ["щ", "shh"],
    ["Ъ", ""],
    ["ъ", ""],
    ["Ы", "Y"],
    ["ы", "y"],
    ["Ь", ""],
    ["ь", ""],
    ["Э", "E"],
    ["э", "e"],
    ["Ю", "Yu"],
    ["ю", "yu"],
    ["Я", "Ya"],
    ["я", "ya"],
    ["Ё", "Yo"],
    ["ё", "yo"],
    // Romanian
    ["ă", "a"],
    ["Ă", "A"],
    ["ș", "s"],
    ["Ș", "S"],
    ["ț", "t"],
    ["Ț", "T"],
    ["ţ", "t"],
    ["Ţ", "T"],
    // Turkish
    ["ş", "s"],
    ["Ş", "S"],
    ["ç", "c"],
    ["Ç", "C"],
    ["ğ", "g"],
    ["Ğ", "G"],
    ["ı", "i"],
    ["İ", "I"],
    // Armenian
    ["ա", "a"],
    ["Ա", "A"],
    ["բ", "b"],
    ["Բ", "B"],
    ["գ", "g"],
    ["Գ", "G"],
    ["դ", "d"],
    ["Դ", "D"],
    ["ե", "ye"],
    ["Ե", "Ye"],
    ["զ", "z"],
    ["Զ", "Z"],
    ["է", "e"],
    ["Է", "E"],
    ["ը", "y"],
    ["Ը", "Y"],
    ["թ", "t"],
    ["Թ", "T"],
    ["ժ", "zh"],
    ["Ժ", "Zh"],
    ["ի", "i"],
    ["Ի", "I"],
    ["լ", "l"],
    ["Լ", "L"],
    ["խ", "kh"],
    ["Խ", "Kh"],
    ["ծ", "ts"],
    ["Ծ", "Ts"],
    ["կ", "k"],
    ["Կ", "K"],
    ["հ", "h"],
    ["Հ", "H"],
    ["ձ", "dz"],
    ["Ձ", "Dz"],
    ["ղ", "gh"],
    ["Ղ", "Gh"],
    ["ճ", "tch"],
    ["Ճ", "Tch"],
    ["մ", "m"],
    ["Մ", "M"],
    ["յ", "y"],
    ["Յ", "Y"],
    ["ն", "n"],
    ["Ն", "N"],
    ["շ", "sh"],
    ["Շ", "Sh"],
    ["ո", "vo"],
    ["Ո", "Vo"],
    ["չ", "ch"],
    ["Չ", "Ch"],
    ["պ", "p"],
    ["Պ", "P"],
    ["ջ", "j"],
    ["Ջ", "J"],
    ["ռ", "r"],
    ["Ռ", "R"],
    ["ս", "s"],
    ["Ս", "S"],
    ["վ", "v"],
    ["Վ", "V"],
    ["տ", "t"],
    ["Տ", "T"],
    ["ր", "r"],
    ["Ր", "R"],
    ["ց", "c"],
    ["Ց", "C"],
    ["ու", "u"],
    ["ՈՒ", "U"],
    ["Ու", "U"],
    ["փ", "p"],
    ["Փ", "P"],
    ["ք", "q"],
    ["Ք", "Q"],
    ["օ", "o"],
    ["Օ", "O"],
    ["ֆ", "f"],
    ["Ֆ", "F"],
    ["և", "yev"],
    // Georgian
    ["ა", "a"],
    ["ბ", "b"],
    ["გ", "g"],
    ["დ", "d"],
    ["ე", "e"],
    ["ვ", "v"],
    ["ზ", "z"],
    ["თ", "t"],
    ["ი", "i"],
    ["კ", "k"],
    ["ლ", "l"],
    ["მ", "m"],
    ["ნ", "n"],
    ["ო", "o"],
    ["პ", "p"],
    ["ჟ", "zh"],
    ["რ", "r"],
    ["ს", "s"],
    ["ტ", "t"],
    ["უ", "u"],
    ["ფ", "ph"],
    ["ქ", "q"],
    ["ღ", "gh"],
    ["ყ", "k"],
    ["შ", "sh"],
    ["ჩ", "ch"],
    ["ც", "ts"],
    ["ძ", "dz"],
    ["წ", "ts"],
    ["ჭ", "tch"],
    ["ხ", "kh"],
    ["ჯ", "j"],
    ["ჰ", "h"],
    // Czech
    ["č", "c"],
    ["ď", "d"],
    ["ě", "e"],
    ["ň", "n"],
    ["ř", "r"],
    ["š", "s"],
    ["ť", "t"],
    ["ů", "u"],
    ["ž", "z"],
    ["Č", "C"],
    ["Ď", "D"],
    ["Ě", "E"],
    ["Ň", "N"],
    ["Ř", "R"],
    ["Š", "S"],
    ["Ť", "T"],
    ["Ů", "U"],
    ["Ž", "Z"],
    // Dhivehi
    ["ހ", "h"],
    ["ށ", "sh"],
    ["ނ", "n"],
    ["ރ", "r"],
    ["ބ", "b"],
    ["ޅ", "lh"],
    ["ކ", "k"],
    ["އ", "a"],
    ["ވ", "v"],
    ["މ", "m"],
    ["ފ", "f"],
    ["ދ", "dh"],
    ["ތ", "th"],
    ["ލ", "l"],
    ["ގ", "g"],
    ["ޏ", "gn"],
    ["ސ", "s"],
    ["ޑ", "d"],
    ["ޒ", "z"],
    ["ޓ", "t"],
    ["ޔ", "y"],
    ["ޕ", "p"],
    ["ޖ", "j"],
    ["ޗ", "ch"],
    ["ޘ", "tt"],
    ["ޙ", "hh"],
    ["ޚ", "kh"],
    ["ޛ", "th"],
    ["ޜ", "z"],
    ["ޝ", "sh"],
    ["ޞ", "s"],
    ["ޟ", "d"],
    ["ޠ", "t"],
    ["ޡ", "z"],
    ["ޢ", "a"],
    ["ޣ", "gh"],
    ["ޤ", "q"],
    ["ޥ", "w"],
    ["ަ", "a"],
    ["ާ", "aa"],
    ["ި", "i"],
    ["ީ", "ee"],
    ["ު", "u"],
    ["ޫ", "oo"],
    ["ެ", "e"],
    ["ޭ", "ey"],
    ["ޮ", "o"],
    ["ޯ", "oa"],
    ["ް", ""],
    // Greek
    ["α", "a"],
    ["β", "v"],
    ["γ", "g"],
    ["δ", "d"],
    ["ε", "e"],
    ["ζ", "z"],
    ["η", "i"],
    ["θ", "th"],
    ["ι", "i"],
    ["κ", "k"],
    ["λ", "l"],
    ["μ", "m"],
    ["ν", "n"],
    ["ξ", "ks"],
    ["ο", "o"],
    ["π", "p"],
    ["ρ", "r"],
    ["σ", "s"],
    ["τ", "t"],
    ["υ", "y"],
    ["φ", "f"],
    ["χ", "x"],
    ["ψ", "ps"],
    ["ω", "o"],
    ["ά", "a"],
    ["έ", "e"],
    ["ί", "i"],
    ["ό", "o"],
    ["ύ", "y"],
    ["ή", "i"],
    ["ώ", "o"],
    ["ς", "s"],
    ["ϊ", "i"],
    ["ΰ", "y"],
    ["ϋ", "y"],
    ["ΐ", "i"],
    ["Α", "A"],
    ["Β", "B"],
    ["Γ", "G"],
    ["Δ", "D"],
    ["Ε", "E"],
    ["Ζ", "Z"],
    ["Η", "I"],
    ["Θ", "TH"],
    ["Ι", "I"],
    ["Κ", "K"],
    ["Λ", "L"],
    ["Μ", "M"],
    ["Ν", "N"],
    ["Ξ", "KS"],
    ["Ο", "O"],
    ["Π", "P"],
    ["Ρ", "R"],
    ["Σ", "S"],
    ["Τ", "T"],
    ["Υ", "Y"],
    ["Φ", "F"],
    ["Χ", "X"],
    ["Ψ", "PS"],
    ["Ω", "O"],
    ["Ά", "A"],
    ["Έ", "E"],
    ["Ί", "I"],
    ["Ό", "O"],
    ["Ύ", "Y"],
    ["Ή", "I"],
    ["Ώ", "O"],
    ["Ϊ", "I"],
    ["Ϋ", "Y"],
    // Disabled as it conflicts with German and Latin.
    // Hungarian
    // ['ä', 'a'],
    // ['Ä', 'A'],
    // ['ö', 'o'],
    // ['Ö', 'O'],
    // ['ü', 'u'],
    // ['Ü', 'U'],
    // ['ű', 'u'],
    // ['Ű', 'U'],
    // Latvian
    ["ā", "a"],
    ["ē", "e"],
    ["ģ", "g"],
    ["ī", "i"],
    ["ķ", "k"],
    ["ļ", "l"],
    ["ņ", "n"],
    ["ū", "u"],
    ["Ā", "A"],
    ["Ē", "E"],
    ["Ģ", "G"],
    ["Ī", "I"],
    ["Ķ", "K"],
    ["Ļ", "L"],
    ["Ņ", "N"],
    ["Ū", "U"],
    ["č", "c"],
    ["š", "s"],
    ["ž", "z"],
    ["Č", "C"],
    ["Š", "S"],
    ["Ž", "Z"],
    // Lithuanian
    ["ą", "a"],
    ["č", "c"],
    ["ę", "e"],
    ["ė", "e"],
    ["į", "i"],
    ["š", "s"],
    ["ų", "u"],
    ["ū", "u"],
    ["ž", "z"],
    ["Ą", "A"],
    ["Č", "C"],
    ["Ę", "E"],
    ["Ė", "E"],
    ["Į", "I"],
    ["Š", "S"],
    ["Ų", "U"],
    ["Ū", "U"],
    // Macedonian
    ["Ќ", "Kj"],
    ["ќ", "kj"],
    ["Љ", "Lj"],
    ["љ", "lj"],
    ["Њ", "Nj"],
    ["њ", "nj"],
    ["Тс", "Ts"],
    ["тс", "ts"],
    // Polish
    ["ą", "a"],
    ["ć", "c"],
    ["ę", "e"],
    ["ł", "l"],
    ["ń", "n"],
    ["ś", "s"],
    ["ź", "z"],
    ["ż", "z"],
    ["Ą", "A"],
    ["Ć", "C"],
    ["Ę", "E"],
    ["Ł", "L"],
    ["Ń", "N"],
    ["Ś", "S"],
    ["Ź", "Z"],
    ["Ż", "Z"],
    // Disabled as it conflicts with Vietnamese.
    // Serbian
    // ['љ', 'lj'],
    // ['њ', 'nj'],
    // ['Љ', 'Lj'],
    // ['Њ', 'Nj'],
    // ['đ', 'dj'],
    // ['Đ', 'Dj'],
    // ['ђ', 'dj'],
    // ['ј', 'j'],
    // ['ћ', 'c'],
    // ['џ', 'dz'],
    // ['Ђ', 'Dj'],
    // ['Ј', 'j'],
    // ['Ћ', 'C'],
    // ['Џ', 'Dz'],
    // Disabled as it conflicts with German and Latin.
    // Slovak
    // ['ä', 'a'],
    // ['Ä', 'A'],
    // ['ľ', 'l'],
    // ['ĺ', 'l'],
    // ['ŕ', 'r'],
    // ['Ľ', 'L'],
    // ['Ĺ', 'L'],
    // ['Ŕ', 'R'],
    // Disabled as it conflicts with German and Latin.
    // Swedish
    // ['å', 'o'],
    // ['Å', 'o'],
    // ['ä', 'a'],
    // ['Ä', 'A'],
    // ['ë', 'e'],
    // ['Ë', 'E'],
    // ['ö', 'o'],
    // ['Ö', 'O'],
    // Ukrainian
    ["Є", "Ye"],
    ["І", "I"],
    ["Ї", "Yi"],
    ["Ґ", "G"],
    ["є", "ye"],
    ["і", "i"],
    ["ї", "yi"],
    ["ґ", "g"]
    // Danish
    // ['Æ', 'Ae'],
    // ['Ø', 'Oe'],
    // ['Å', 'Aa'],
    // ['æ', 'ae'],
    // ['ø', 'oe'],
    // ['å', 'aa']
  ];
  return replacements;
}
var transliterate;
var hasRequiredTransliterate;
function requireTransliterate() {
  if (hasRequiredTransliterate) return transliterate;
  hasRequiredTransliterate = 1;
  const deburr = requireLodash_deburr();
  const escapeStringRegexp2 = requireEscapeStringRegexp();
  const builtinReplacements = requireReplacements();
  const doCustomReplacements = (string2, replacements2) => {
    for (const [key, value] of replacements2) {
      string2 = string2.replace(new RegExp(escapeStringRegexp2(key), "g"), value);
    }
    return string2;
  };
  transliterate = (string2, options2) => {
    if (typeof string2 !== "string") {
      throw new TypeError(`Expected a string, got \`${typeof string2}\``);
    }
    options2 = {
      customReplacements: [],
      ...options2
    };
    const customReplacements = new Map([
      ...builtinReplacements,
      ...options2.customReplacements
    ]);
    string2 = string2.normalize();
    string2 = doCustomReplacements(string2, customReplacements);
    string2 = deburr(string2);
    return string2;
  };
  return transliterate;
}
var overridableReplacements;
var hasRequiredOverridableReplacements;
function requireOverridableReplacements() {
  if (hasRequiredOverridableReplacements) return overridableReplacements;
  hasRequiredOverridableReplacements = 1;
  overridableReplacements = [
    ["&", " and "],
    ["🦄", " unicorn "],
    ["♥", " love "]
  ];
  return overridableReplacements;
}
var hasRequiredSlugify;
function requireSlugify() {
  if (hasRequiredSlugify) return slugify$1.exports;
  hasRequiredSlugify = 1;
  const escapeStringRegexp2 = requireEscapeStringRegexp$1();
  const transliterate2 = requireTransliterate();
  const builtinOverridableReplacements = requireOverridableReplacements();
  const decamelize = (string2) => {
    return string2.replace(/([A-Z]{2,})(\d+)/g, "$1 $2").replace(/([a-z\d]+)([A-Z]{2,})/g, "$1 $2").replace(/([a-z\d])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z\d]+)/g, "$1 $2");
  };
  const removeMootSeparators = (string2, separator) => {
    const escapedSeparator = escapeStringRegexp2(separator);
    return string2.replace(new RegExp(`${escapedSeparator}{2,}`, "g"), separator).replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, "g"), "");
  };
  const slugify2 = (string2, options2) => {
    if (typeof string2 !== "string") {
      throw new TypeError(`Expected a string, got \`${typeof string2}\``);
    }
    options2 = {
      separator: "-",
      lowercase: true,
      decamelize: true,
      customReplacements: [],
      preserveLeadingUnderscore: false,
      ...options2
    };
    const shouldPrependUnderscore = options2.preserveLeadingUnderscore && string2.startsWith("_");
    const customReplacements = new Map([
      ...builtinOverridableReplacements,
      ...options2.customReplacements
    ]);
    string2 = transliterate2(string2, { customReplacements });
    if (options2.decamelize) {
      string2 = decamelize(string2);
    }
    let patternSlug = /[^a-zA-Z\d]+/g;
    if (options2.lowercase) {
      string2 = string2.toLowerCase();
      patternSlug = /[^a-z\d]+/g;
    }
    string2 = string2.replace(patternSlug, options2.separator);
    string2 = string2.replace(/\\/g, "");
    if (options2.separator) {
      string2 = removeMootSeparators(string2, options2.separator);
    }
    if (shouldPrependUnderscore) {
      string2 = `_${string2}`;
    }
    return string2;
  };
  const counter = () => {
    const occurrences = /* @__PURE__ */ new Map();
    const countable = (string2, options2) => {
      string2 = slugify2(string2, options2);
      if (!string2) {
        return "";
      }
      const stringLower = string2.toLowerCase();
      const numberless = occurrences.get(stringLower.replace(/(?:-\d+?)+?$/, "")) || 0;
      const counter2 = occurrences.get(stringLower);
      occurrences.set(stringLower, typeof counter2 === "number" ? counter2 + 1 : 1);
      const newCounter = occurrences.get(stringLower) || 2;
      if (newCounter >= 2 || numberless > 2) {
        string2 = `${string2}-${newCounter}`;
      }
      return string2;
    };
    countable.reset = () => {
      occurrences.clear();
    };
    return countable;
  };
  slugify$1.exports = slugify2;
  slugify$1.exports.counter = counter;
  return slugify$1.exports;
}
requireSlugify();
const isCamelCase = (value) => /^[a-z][a-zA-Z0-9]+$/.test(value);
const isKebabCase = (value) => /^([a-z][a-z0-9]*)(-[a-z0-9]+)*$/.test(value);
const { toString } = Object.prototype;
const errorToString = Error.prototype.toString;
const regExpToString = RegExp.prototype.toString;
const symbolToString = typeof Symbol !== "undefined" ? Symbol.prototype.toString : () => "";
const SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/;
function printNumber(val) {
  if (val != +val) return "NaN";
  const isNegativeZero = val === 0 && 1 / val < 0;
  return isNegativeZero ? "-0" : `${val}`;
}
function printSimpleValue(val, quoteStrings = false) {
  if (val == null || val === true || val === false) return `${val}`;
  if (typeof val === "number") return printNumber(val);
  if (typeof val === "string") return quoteStrings ? `"${val}"` : val;
  if (typeof val === "function") return `[Function ${val.name || "anonymous"}]`;
  if (typeof val === "symbol") return symbolToString.call(val).replace(SYMBOL_REGEXP, "Symbol($1)");
  const tag = toString.call(val).slice(8, -1);
  if (tag === "Date") {
    const v = val;
    return Number.isNaN(v.getTime()) ? `${v}` : v.toISOString();
  }
  if (tag === "Error" || val instanceof Error) return `[${errorToString.call(val)}]`;
  if (tag === "RegExp") return regExpToString.call(val);
  return null;
}
function printValue(value, quoteStrings) {
  const result = printSimpleValue(value, quoteStrings);
  if (result !== null) return result;
  return JSON.stringify(value, function replacer(key, value2) {
    const result2 = printSimpleValue(this[key], quoteStrings);
    if (result2 !== null) return result2;
    return value2;
  }, 2);
}
const isNotNilTest = (value) => !_.isNil(value);
const isNotNullTest = (value) => !_.isNull(value);
addMethod(create$3, "notNil", function isNotNill(msg = "${path} must be defined.") {
  return this.test("defined", msg, isNotNilTest);
});
addMethod(create$3, "notNull", function isNotNull(msg = "${path} cannot be null.") {
  return this.test("defined", msg, isNotNullTest);
});
addMethod(create$3, "isFunction", function isFunction(message = "${path} is not a function") {
  return this.test("is a function", message, (value) => _.isUndefined(value) || _.isFunction(value));
});
addMethod(create$2, "isCamelCase", function isCamelCase$1(message = "${path} is not in camel case (anExampleOfCamelCase)") {
  return this.test("is in camelCase", message, (value) => value ? isCamelCase(value) : true);
});
addMethod(create$2, "isKebabCase", function isKebabCase$1(message = "${path} is not in kebab case (an-example-of-kebab-case)") {
  return this.test("is in kebab-case", message, (value) => value ? isKebabCase(value) : true);
});
addMethod(create$1, "onlyContainsFunctions", function onlyContainsFunctions(message = "${path} contains values that are not functions") {
  return this.test("only contains functions", message, (value) => _.isUndefined(value) || value && Object.values(value).every(_.isFunction));
});
addMethod(create, "uniqueProperty", function uniqueProperty(propertyName, message) {
  return this.test("unique", message, function unique(list) {
    const errors = [];
    list?.forEach((element, index2) => {
      const sameElements = list.filter((e) => lodashExports.get(e, propertyName) === lodashExports.get(element, propertyName));
      if (sameElements.length > 1) {
        errors.push(this.createError({
          path: `${this.path}[${index2}].${propertyName}`,
          message
        }));
      }
    });
    if (errors.length) {
      throw new ValidationError$1(errors);
    }
    return true;
  });
});
setLocale({
  mixed: {
    notType(options2) {
      const { path, type, value, originalValue } = options2;
      const isCast = originalValue != null && originalValue !== value;
      const msg = `${path} must be a \`${type}\` type, but the final value was: \`${printValue(value, true)}\`${isCast ? ` (cast from the value \`${printValue(originalValue, true)}\`).` : "."}`;
      return msg;
    }
  }
});
var _a$1;
function $constructor(name, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _2,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    const proto = _2.prototype;
    const keys = Object.keys(proto);
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _2(def) {
    var _a2;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    for (const fn of inst._zod.deferred) {
      fn();
    }
    return inst;
  }
  Object.defineProperty(_2, "init", { value: init });
  Object.defineProperty(_2, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_2, "name", { value: name });
  return _2;
}
class $ZodAsyncError extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
}
class $ZodEncodeError extends Error {
  constructor(name) {
    super(`Encountered unidirectional transform during encode: ${name}`);
    this.name = "ZodEncodeError";
  }
}
(_a$1 = globalThis).__zod_globalConfig ?? (_a$1.__zod_globalConfig = {});
const globalConfig = globalThis.__zod_globalConfig;
function config$1(newConfig) {
  return globalConfig;
}
function getEnumValues(entries) {
  const numericValues = Object.values(entries).filter((v) => typeof v === "number");
  const values = Object.entries(entries).filter(([k, _2]) => numericValues.indexOf(+k) === -1).map(([_2, v]) => v);
  return values;
}
function jsonStringifyReplacer(_2, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  return {
    get value() {
      {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source) {
  const start = source.startsWith("^") ? 1 : 0;
  const end = source.endsWith("$") ? source.length - 1 : source.length;
  return source.slice(start, end);
}
function floatSafeRemainder(val, step) {
  const ratio = val / step;
  const roundedRatio = Math.round(ratio);
  const tolerance = Number.EPSILON * Math.max(Math.abs(ratio), 1);
  if (Math.abs(ratio - roundedRatio) < tolerance)
    return 0;
  return ratio - roundedRatio;
}
const EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key, getter) {
  let value = void 0;
  Object.defineProperty(object2, key, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
function assignProp(target, prop, value) {
  Object.defineProperty(target, prop, {
    value,
    writable: true,
    enumerable: true,
    configurable: true
  });
}
function mergeDefs(...defs) {
  const mergedDescriptors = {};
  for (const def of defs) {
    const descriptors = Object.getOwnPropertyDescriptors(def);
    Object.assign(mergedDescriptors, descriptors);
  }
  return Object.defineProperties({}, mergedDescriptors);
}
function esc(str) {
  return JSON.stringify(str);
}
function slugify(input) {
  return input.toLowerCase().trim().replace(/[^\w\s-]/g, "").replace(/[\s_-]+/g, "-").replace(/^-+|-+$/g, "");
}
const captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
const allowsEval = /* @__PURE__ */ cached(() => {
  if (globalConfig.jitless) {
    return false;
  }
  if (typeof navigator !== "undefined" && navigator?.userAgent?.includes("Cloudflare")) {
    return false;
  }
  try {
    const F = Function;
    new F("");
    return true;
  } catch (_2) {
    return false;
  }
});
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function shallowClone(o) {
  if (isPlainObject(o))
    return { ...o };
  if (Array.isArray(o))
    return [...o];
  if (o instanceof Map)
    return new Map(o);
  if (o instanceof Set)
    return new Set(o);
  return o;
}
const propertyKeyTypes = /* @__PURE__ */ new Set(["string", "number", "symbol"]);
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
const NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function pick(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".pick() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = {};
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        newShape[key] = currDef.shape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function omit(schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".omit() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const newShape = { ...schema._zod.def.shape };
      for (const key in mask) {
        if (!(key in currDef.shape)) {
          throw new Error(`Unrecognized key: "${key}"`);
        }
        if (!mask[key])
          continue;
        delete newShape[key];
      }
      assignProp(this, "shape", newShape);
      return newShape;
    },
    checks: []
  });
  return clone(schema, def);
}
function extend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to extend: expected a plain object");
  }
  const checks = schema._zod.def.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    const existingShape = schema._zod.def.shape;
    for (const key in shape) {
      if (Object.getOwnPropertyDescriptor(existingShape, key) !== void 0) {
        throw new Error("Cannot overwrite keys on object schemas containing refinements. Use `.safeExtend()` instead.");
      }
    }
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function safeExtend(schema, shape) {
  if (!isPlainObject(shape)) {
    throw new Error("Invalid input to safeExtend: expected a plain object");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const _shape = { ...schema._zod.def.shape, ...shape };
      assignProp(this, "shape", _shape);
      return _shape;
    }
  });
  return clone(schema, def);
}
function merge(a, b) {
  if (a._zod.def.checks?.length) {
    throw new Error(".merge() cannot be used on object schemas containing refinements. Use .safeExtend() instead.");
  }
  const def = mergeDefs(a._zod.def, {
    get shape() {
      const _shape = { ...a._zod.def.shape, ...b._zod.def.shape };
      assignProp(this, "shape", _shape);
      return _shape;
    },
    get catchall() {
      return b._zod.def.catchall;
    },
    checks: b._zod.def.checks ?? []
  });
  return clone(a, def);
}
function partial(Class, schema, mask) {
  const currDef = schema._zod.def;
  const checks = currDef.checks;
  const hasChecks = checks && checks.length > 0;
  if (hasChecks) {
    throw new Error(".partial() cannot be used on object schemas containing refinements");
  }
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in oldShape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      } else {
        for (const key in oldShape) {
          shape[key] = Class ? new Class({
            type: "optional",
            innerType: oldShape[key]
          }) : oldShape[key];
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    },
    checks: []
  });
  return clone(schema, def);
}
function required(Class, schema, mask) {
  const def = mergeDefs(schema._zod.def, {
    get shape() {
      const oldShape = schema._zod.def.shape;
      const shape = { ...oldShape };
      if (mask) {
        for (const key in mask) {
          if (!(key in shape)) {
            throw new Error(`Unrecognized key: "${key}"`);
          }
          if (!mask[key])
            continue;
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      } else {
        for (const key in oldShape) {
          shape[key] = new Class({
            type: "nonoptional",
            innerType: oldShape[key]
          });
        }
      }
      assignProp(this, "shape", shape);
      return shape;
    }
  });
  return clone(schema, def);
}
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a2;
    (_a2 = iss).path ?? (_a2.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}
function issue(...args) {
  const [iss, input, inst] = args;
  if (typeof iss === "string") {
    return {
      message: iss,
      code: "custom",
      input,
      inst
    };
  }
  return { ...iss };
}
const initializer$1 = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
const $ZodError = $constructor("$ZodError", initializer$1);
const $ZodRealError = $constructor("$ZodError", initializer$1, { Parent: Error });
function flattenError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = {};
  const formErrors = [];
  for (const sub of error2.issues) {
    if (sub.path.length > 0) {
      fieldErrors[sub.path[0]] = fieldErrors[sub.path[0]] || [];
      fieldErrors[sub.path[0]].push(mapper(sub));
    } else {
      formErrors.push(mapper(sub));
    }
  }
  return { formErrors, fieldErrors };
}
function formatError(error2, mapper = (issue2) => issue2.message) {
  const fieldErrors = { _errors: [] };
  const processError = (error3, path = []) => {
    for (const issue2 of error3.issues) {
      if (issue2.code === "invalid_union" && issue2.errors.length) {
        issue2.errors.map((issues) => processError({ issues }, [...path, ...issue2.path]));
      } else if (issue2.code === "invalid_key") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else if (issue2.code === "invalid_element") {
        processError({ issues: issue2.issues }, [...path, ...issue2.path]);
      } else {
        const fullpath = [...path, ...issue2.path];
        if (fullpath.length === 0) {
          fieldErrors._errors.push(mapper(issue2));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            const el = fullpath[i];
            const terminal = i === fullpath.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue2));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    }
  };
  processError(error2);
  return fieldErrors;
}
const _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config$1())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
const _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config$1())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
const _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config$1())))
  } : { success: true, data: result.value };
};
const safeParse$1 = /* @__PURE__ */ _safeParse($ZodRealError);
const _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config$1())))
  } : { success: true, data: result.value };
};
const safeParseAsync$1 = /* @__PURE__ */ _safeParseAsync($ZodRealError);
const _encode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parse(_Err)(schema, value, ctx);
};
const _decode = (_Err) => (schema, value, _ctx) => {
  return _parse(_Err)(schema, value, _ctx);
};
const _encodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _parseAsync(_Err)(schema, value, ctx);
};
const _decodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _parseAsync(_Err)(schema, value, _ctx);
};
const _safeEncode = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParse(_Err)(schema, value, ctx);
};
const _safeDecode = (_Err) => (schema, value, _ctx) => {
  return _safeParse(_Err)(schema, value, _ctx);
};
const _safeEncodeAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, direction: "backward" } : { direction: "backward" };
  return _safeParseAsync(_Err)(schema, value, ctx);
};
const _safeDecodeAsync = (_Err) => async (schema, value, _ctx) => {
  return _safeParseAsync(_Err)(schema, value, _ctx);
};
const cuid = /^[cC][0-9a-z]{6,}$/;
const cuid2 = /^[0-9a-z]+$/;
const ulid = /^[0-9A-HJKMNP-TV-Za-hjkmnp-tv-z]{26}$/;
const xid = /^[0-9a-vA-V]{20}$/;
const ksuid = /^[A-Za-z0-9]{27}$/;
const nanoid = /^[a-zA-Z0-9_-]{21}$/;
const duration$1 = /^P(?:(\d+W)|(?!.*W)(?=\d|T\d)(\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+([.,]\d+)?S)?)?)$/;
const guid = /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;
const uuid = (version2) => {
  if (!version2)
    return /^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$/;
  return new RegExp(`^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-${version2}[0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12})$`);
};
const email = /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-\.]*)[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9\-]*\.)+[A-Za-z]{2,}$/;
const _emoji$1 = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
function emoji() {
  return new RegExp(_emoji$1, "u");
}
const ipv4 = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
const ipv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:))$/;
const cidrv4 = /^((25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/([0-9]|[1-2][0-9]|3[0-2])$/;
const cidrv6 = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|::|([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:?){0,6})\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
const base64 = /^$|^(?:[0-9a-zA-Z+/]{4})*(?:(?:[0-9a-zA-Z+/]{2}==)|(?:[0-9a-zA-Z+/]{3}=))?$/;
const base64url = /^[A-Za-z0-9_-]*$/;
const httpProtocol = /^https?$/;
const e164 = /^\+[1-9]\d{6,14}$/;
const dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
const date$1 = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
function timeSource(args) {
  const hhmm = `(?:[01]\\d|2[0-3]):[0-5]\\d`;
  const regex = typeof args.precision === "number" ? args.precision === -1 ? `${hhmm}` : args.precision === 0 ? `${hhmm}:[0-5]\\d` : `${hhmm}:[0-5]\\d\\.\\d{${args.precision}}` : `${hhmm}(?::[0-5]\\d(?:\\.\\d+)?)?`;
  return regex;
}
function time$1(args) {
  return new RegExp(`^${timeSource(args)}$`);
}
function datetime$1(args) {
  const time2 = timeSource({ precision: args.precision });
  const opts = ["Z"];
  if (args.local)
    opts.push("");
  if (args.offset)
    opts.push(`([+-](?:[01]\\d|2[0-3]):[0-5]\\d)`);
  const timeRegex = `${time2}(?:${opts.join("|")})`;
  return new RegExp(`^${dateSource}T(?:${timeRegex})$`);
}
const string$1 = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
const integer = /^-?\d+$/;
const number$1 = /^-?\d+(?:\.\d+)?$/;
const boolean$1 = /^(?:true|false)$/i;
const lowercase = /^[^A-Z]*$/;
const uppercase = /^[^a-z]*$/;
const $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a2;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a2 = inst._zod).onattach ?? (_a2.onattach = []);
});
const numericOriginMap = {
  number: "number",
  bigint: "bigint",
  object: "date"
};
const $ZodCheckLessThan = /* @__PURE__ */ $constructor("$ZodCheckLessThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.maximum : bag.exclusiveMaximum) ?? Number.POSITIVE_INFINITY;
    if (def.value < curr) {
      if (def.inclusive)
        bag.maximum = def.value;
      else
        bag.exclusiveMaximum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value <= def.value : payload.value < def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckGreaterThan = /* @__PURE__ */ $constructor("$ZodCheckGreaterThan", (inst, def) => {
  $ZodCheck.init(inst, def);
  const origin = numericOriginMap[typeof def.value];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    const curr = (def.inclusive ? bag.minimum : bag.exclusiveMinimum) ?? Number.NEGATIVE_INFINITY;
    if (def.value > curr) {
      if (def.inclusive)
        bag.minimum = def.value;
      else
        bag.exclusiveMinimum = def.value;
    }
  });
  inst._zod.check = (payload) => {
    if (def.inclusive ? payload.value >= def.value : payload.value > def.value) {
      return;
    }
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: typeof def.value === "object" ? def.value.getTime() : def.value,
      input: payload.value,
      inclusive: def.inclusive,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMultipleOf = /* @__PURE__ */ $constructor("$ZodCheckMultipleOf", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    var _a2;
    (_a2 = inst2._zod.bag).multipleOf ?? (_a2.multipleOf = def.value);
  });
  inst._zod.check = (payload) => {
    if (typeof payload.value !== typeof def.value)
      throw new Error("Cannot mix number and bigint in multiple_of check.");
    const isMultiple = typeof payload.value === "bigint" ? payload.value % def.value === BigInt(0) : floatSafeRemainder(payload.value, def.value) === 0;
    if (isMultiple)
      return;
    payload.issues.push({
      origin: typeof payload.value,
      code: "not_multiple_of",
      divisor: def.value,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckNumberFormat = /* @__PURE__ */ $constructor("$ZodCheckNumberFormat", (inst, def) => {
  $ZodCheck.init(inst, def);
  def.format = def.format || "float64";
  const isInt = def.format?.includes("int");
  const origin = isInt ? "int" : "number";
  const [minimum, maximum] = NUMBER_FORMAT_RANGES[def.format];
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    bag.minimum = minimum;
    bag.maximum = maximum;
    if (isInt)
      bag.pattern = integer;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    if (isInt) {
      if (!Number.isInteger(input)) {
        payload.issues.push({
          expected: origin,
          format: def.format,
          code: "invalid_type",
          continue: false,
          input,
          inst
        });
        return;
      }
      if (!Number.isSafeInteger(input)) {
        if (input > 0) {
          payload.issues.push({
            input,
            code: "too_big",
            maximum: Number.MAX_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        } else {
          payload.issues.push({
            input,
            code: "too_small",
            minimum: Number.MIN_SAFE_INTEGER,
            note: "Integers must be within the safe integer range.",
            inst,
            origin,
            inclusive: true,
            continue: !def.abort
          });
        }
        return;
      }
    }
    if (input < minimum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_small",
        minimum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
    if (input > maximum) {
      payload.issues.push({
        origin: "number",
        input,
        code: "too_big",
        maximum,
        inclusive: true,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLengthEquals = /* @__PURE__ */ $constructor("$ZodCheckLengthEquals", (inst, def) => {
  var _a2;
  $ZodCheck.init(inst, def);
  (_a2 = inst._zod.def).when ?? (_a2.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.minimum = def.length;
    bag.maximum = def.length;
    bag.length = def.length;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length === def.length)
      return;
    const origin = getLengthableOrigin(input);
    const tooBig = length > def.length;
    payload.issues.push({
      origin,
      ...tooBig ? { code: "too_big", maximum: def.length } : { code: "too_small", minimum: def.length },
      inclusive: true,
      exact: true,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a2, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a2 = inst._zod).check ?? (_a2.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
const $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckLowerCase = /* @__PURE__ */ $constructor("$ZodCheckLowerCase", (inst, def) => {
  def.pattern ?? (def.pattern = lowercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckUpperCase = /* @__PURE__ */ $constructor("$ZodCheckUpperCase", (inst, def) => {
  def.pattern ?? (def.pattern = uppercase);
  $ZodCheckStringFormat.init(inst, def);
});
const $ZodCheckIncludes = /* @__PURE__ */ $constructor("$ZodCheckIncludes", (inst, def) => {
  $ZodCheck.init(inst, def);
  const escapedRegex = escapeRegex(def.includes);
  const pattern = new RegExp(typeof def.position === "number" ? `^.{${def.position}}${escapedRegex}` : escapedRegex);
  def.pattern = pattern;
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.includes(def.includes, def.position))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "includes",
      includes: def.includes,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckStartsWith = /* @__PURE__ */ $constructor("$ZodCheckStartsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`^${escapeRegex(def.prefix)}.*`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.startsWith(def.prefix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "starts_with",
      prefix: def.prefix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckEndsWith = /* @__PURE__ */ $constructor("$ZodCheckEndsWith", (inst, def) => {
  $ZodCheck.init(inst, def);
  const pattern = new RegExp(`.*${escapeRegex(def.suffix)}$`);
  def.pattern ?? (def.pattern = pattern);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
    bag.patterns.add(pattern);
  });
  inst._zod.check = (payload) => {
    if (payload.value.endsWith(def.suffix))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "ends_with",
      suffix: def.suffix,
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodCheckOverwrite = /* @__PURE__ */ $constructor("$ZodCheckOverwrite", (inst, def) => {
  $ZodCheck.init(inst, def);
  inst._zod.check = (payload) => {
    payload.value = def.tx(payload.value);
  };
});
class Doc {
  constructor(args = []) {
    this.content = [];
    this.indent = 0;
    if (this)
      this.args = args;
  }
  indented(fn) {
    this.indent += 1;
    fn(this);
    this.indent -= 1;
  }
  write(arg) {
    if (typeof arg === "function") {
      arg(this, { execution: "sync" });
      arg(this, { execution: "async" });
      return;
    }
    const content2 = arg;
    const lines = content2.split("\n").filter((x) => x);
    const minIndent = Math.min(...lines.map((x) => x.length - x.trimStart().length));
    const dedented = lines.map((x) => x.slice(minIndent)).map((x) => " ".repeat(this.indent * 2) + x);
    for (const line of dedented) {
      this.content.push(line);
    }
  }
  compile() {
    const F = Function;
    const args = this?.args;
    const content2 = this?.content ?? [``];
    const lines = [...content2.map((x) => `  ${x}`)];
    return new F(...args, lines.join("\n"));
  }
}
const version = {
  major: 4,
  minor: 4,
  patch: 3
};
const $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a2;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn of ch._zod.onattach) {
      fn(inst);
    }
  }
  if (checks.length === 0) {
    (_a2 = inst._zod).deferred ?? (_a2.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _2 = ch._zod.check(payload);
        if (_2 instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _2 instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _2;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse$1(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_2) {
        return safeParseAsync$1(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
const $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string$1(inst._zod.bag);
  inst._zod.parse = (payload, _2) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_3) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
const $ZodStringFormat = /* @__PURE__ */ $constructor("$ZodStringFormat", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  $ZodString.init(inst, def);
});
const $ZodGUID = /* @__PURE__ */ $constructor("$ZodGUID", (inst, def) => {
  def.pattern ?? (def.pattern = guid);
  $ZodStringFormat.init(inst, def);
});
const $ZodUUID = /* @__PURE__ */ $constructor("$ZodUUID", (inst, def) => {
  if (def.version) {
    const versionMap = {
      v1: 1,
      v2: 2,
      v3: 3,
      v4: 4,
      v5: 5,
      v6: 6,
      v7: 7,
      v8: 8
    };
    const v = versionMap[def.version];
    if (v === void 0)
      throw new Error(`Invalid UUID version: "${def.version}"`);
    def.pattern ?? (def.pattern = uuid(v));
  } else
    def.pattern ?? (def.pattern = uuid());
  $ZodStringFormat.init(inst, def);
});
const $ZodEmail = /* @__PURE__ */ $constructor("$ZodEmail", (inst, def) => {
  def.pattern ?? (def.pattern = email);
  $ZodStringFormat.init(inst, def);
});
const $ZodURL = /* @__PURE__ */ $constructor("$ZodURL", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    try {
      const trimmed = payload.value.trim();
      if (!def.normalize && def.protocol?.source === httpProtocol.source) {
        if (!/^https?:\/\//i.test(trimmed)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid URL format",
            input: payload.value,
            inst,
            continue: !def.abort
          });
          return;
        }
      }
      const url = new URL(trimmed);
      if (def.hostname) {
        def.hostname.lastIndex = 0;
        if (!def.hostname.test(url.hostname)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid hostname",
            pattern: def.hostname.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.protocol) {
        def.protocol.lastIndex = 0;
        if (!def.protocol.test(url.protocol.endsWith(":") ? url.protocol.slice(0, -1) : url.protocol)) {
          payload.issues.push({
            code: "invalid_format",
            format: "url",
            note: "Invalid protocol",
            pattern: def.protocol.source,
            input: payload.value,
            inst,
            continue: !def.abort
          });
        }
      }
      if (def.normalize) {
        payload.value = url.href;
      } else {
        payload.value = trimmed;
      }
      return;
    } catch (_2) {
      payload.issues.push({
        code: "invalid_format",
        format: "url",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodEmoji = /* @__PURE__ */ $constructor("$ZodEmoji", (inst, def) => {
  def.pattern ?? (def.pattern = emoji());
  $ZodStringFormat.init(inst, def);
});
const $ZodNanoID = /* @__PURE__ */ $constructor("$ZodNanoID", (inst, def) => {
  def.pattern ?? (def.pattern = nanoid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID = /* @__PURE__ */ $constructor("$ZodCUID", (inst, def) => {
  def.pattern ?? (def.pattern = cuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodCUID2 = /* @__PURE__ */ $constructor("$ZodCUID2", (inst, def) => {
  def.pattern ?? (def.pattern = cuid2);
  $ZodStringFormat.init(inst, def);
});
const $ZodULID = /* @__PURE__ */ $constructor("$ZodULID", (inst, def) => {
  def.pattern ?? (def.pattern = ulid);
  $ZodStringFormat.init(inst, def);
});
const $ZodXID = /* @__PURE__ */ $constructor("$ZodXID", (inst, def) => {
  def.pattern ?? (def.pattern = xid);
  $ZodStringFormat.init(inst, def);
});
const $ZodKSUID = /* @__PURE__ */ $constructor("$ZodKSUID", (inst, def) => {
  def.pattern ?? (def.pattern = ksuid);
  $ZodStringFormat.init(inst, def);
});
const $ZodISODateTime = /* @__PURE__ */ $constructor("$ZodISODateTime", (inst, def) => {
  def.pattern ?? (def.pattern = datetime$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODate = /* @__PURE__ */ $constructor("$ZodISODate", (inst, def) => {
  def.pattern ?? (def.pattern = date$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodISOTime = /* @__PURE__ */ $constructor("$ZodISOTime", (inst, def) => {
  def.pattern ?? (def.pattern = time$1(def));
  $ZodStringFormat.init(inst, def);
});
const $ZodISODuration = /* @__PURE__ */ $constructor("$ZodISODuration", (inst, def) => {
  def.pattern ?? (def.pattern = duration$1);
  $ZodStringFormat.init(inst, def);
});
const $ZodIPv4 = /* @__PURE__ */ $constructor("$ZodIPv4", (inst, def) => {
  def.pattern ?? (def.pattern = ipv4);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv4`;
});
const $ZodIPv6 = /* @__PURE__ */ $constructor("$ZodIPv6", (inst, def) => {
  def.pattern ?? (def.pattern = ipv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.format = `ipv6`;
  inst._zod.check = (payload) => {
    try {
      new URL(`http://[${payload.value}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "ipv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
const $ZodCIDRv4 = /* @__PURE__ */ $constructor("$ZodCIDRv4", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv4);
  $ZodStringFormat.init(inst, def);
});
const $ZodCIDRv6 = /* @__PURE__ */ $constructor("$ZodCIDRv6", (inst, def) => {
  def.pattern ?? (def.pattern = cidrv6);
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    const parts = payload.value.split("/");
    try {
      if (parts.length !== 2)
        throw new Error();
      const [address, prefix] = parts;
      if (!prefix)
        throw new Error();
      const prefixNum = Number(prefix);
      if (`${prefixNum}` !== prefix)
        throw new Error();
      if (prefixNum < 0 || prefixNum > 128)
        throw new Error();
      new URL(`http://[${address}]`);
    } catch {
      payload.issues.push({
        code: "invalid_format",
        format: "cidrv6",
        input: payload.value,
        inst,
        continue: !def.abort
      });
    }
  };
});
function isValidBase64(data) {
  if (data === "")
    return true;
  if (/\s/.test(data))
    return false;
  if (data.length % 4 !== 0)
    return false;
  try {
    atob(data);
    return true;
  } catch {
    return false;
  }
}
const $ZodBase64 = /* @__PURE__ */ $constructor("$ZodBase64", (inst, def) => {
  def.pattern ?? (def.pattern = base64);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64";
  inst._zod.check = (payload) => {
    if (isValidBase64(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
function isValidBase64URL(data) {
  if (!base64url.test(data))
    return false;
  const base642 = data.replace(/[-_]/g, (c) => c === "-" ? "+" : "/");
  const padded = base642.padEnd(Math.ceil(base642.length / 4) * 4, "=");
  return isValidBase64(padded);
}
const $ZodBase64URL = /* @__PURE__ */ $constructor("$ZodBase64URL", (inst, def) => {
  def.pattern ?? (def.pattern = base64url);
  $ZodStringFormat.init(inst, def);
  inst._zod.bag.contentEncoding = "base64url";
  inst._zod.check = (payload) => {
    if (isValidBase64URL(payload.value))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "base64url",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodE164 = /* @__PURE__ */ $constructor("$ZodE164", (inst, def) => {
  def.pattern ?? (def.pattern = e164);
  $ZodStringFormat.init(inst, def);
});
function isValidJWT(token, algorithm = null) {
  try {
    const tokensParts = token.split(".");
    if (tokensParts.length !== 3)
      return false;
    const [header] = tokensParts;
    if (!header)
      return false;
    const parsedHeader = JSON.parse(atob(header));
    if ("typ" in parsedHeader && parsedHeader?.typ !== "JWT")
      return false;
    if (!parsedHeader.alg)
      return false;
    if (algorithm && (!("alg" in parsedHeader) || parsedHeader.alg !== algorithm))
      return false;
    return true;
  } catch {
    return false;
  }
}
const $ZodJWT = /* @__PURE__ */ $constructor("$ZodJWT", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    if (isValidJWT(payload.value, def.alg))
      return;
    payload.issues.push({
      code: "invalid_format",
      format: "jwt",
      input: payload.value,
      inst,
      continue: !def.abort
    });
  };
});
const $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_2) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
const $ZodNumberFormat = /* @__PURE__ */ $constructor("$ZodNumberFormat", (inst, def) => {
  $ZodCheckNumberFormat.init(inst, def);
  $ZodNumber.init(inst, def);
});
const $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean$1;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_2) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
const $ZodAny = /* @__PURE__ */ $constructor("$ZodAny", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
const $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index2) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index2, result.issues));
  }
  final.value[index2] = result.value;
}
const $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key, input, isOptionalIn, isOptionalOut) {
  const isPresent = key in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key] = void 0;
    }
  } else {
    final.value[key] = result.value;
  }
}
function normalizeDef(def) {
  const keys = Object.keys(def.shape);
  for (const k of keys) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys,
    keySet: new Set(keys),
    numKeys: keys.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key in input) {
    if (key === "__proto__")
      continue;
    if (keySet.has(key))
      continue;
    if (t === "never") {
      unrecognized.push(key);
      continue;
    }
    const r = _catchall.run({ value: input[key], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
const $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key in shape) {
      const field = shape[key]._zod;
      if (field.values) {
        propValues[key] ?? (propValues[key] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key].add(v);
      }
    }
    return propValues;
  });
  const isObject$12 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$12(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key of value.keys) {
      const el = shape[key];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
const $ZodObjectJIT = /* @__PURE__ */ $constructor("$ZodObjectJIT", (inst, def) => {
  $ZodObject.init(inst, def);
  const superParse = inst._zod.parse;
  const _normalized = cached(() => normalizeDef(def));
  const generateFastpass = (shape) => {
    const doc = new Doc(["shape", "payload", "ctx"]);
    const normalized = _normalized.value;
    const parseStr = (key) => {
      const k = esc(key);
      return `shape[${k}]._zod.run({ value: input[${k}], issues: [] }, ctx)`;
    };
    doc.write(`const input = payload.value;`);
    const ids = /* @__PURE__ */ Object.create(null);
    let counter = 0;
    for (const key of normalized.keys) {
      ids[key] = `key_${counter++}`;
    }
    doc.write(`const newResult = {};`);
    for (const key of normalized.keys) {
      const id = ids[key];
      const k = esc(key);
      const schema = shape[key];
      const isOptionalIn = schema?._zod?.optin === "optional";
      const isOptionalOut = schema?._zod?.optout === "optional";
      doc.write(`const ${id} = ${parseStr(key)};`);
      if (isOptionalIn && isOptionalOut) {
        doc.write(`
        if (${id}.issues.length) {
          if (${k} in input) {
            payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
              ...iss,
              path: iss.path ? [${k}, ...iss.path] : [${k}]
            })));
          }
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      } else if (!isOptionalIn) {
        doc.write(`
        const ${id}_present = ${k} in input;
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        if (!${id}_present && !${id}.issues.length) {
          payload.issues.push({
            code: "invalid_type",
            expected: "nonoptional",
            input: undefined,
            path: [${k}]
          });
        }

        if (${id}_present) {
          if (${id}.value === undefined) {
            newResult[${k}] = undefined;
          } else {
            newResult[${k}] = ${id}.value;
          }
        }

      `);
      } else {
        doc.write(`
        if (${id}.issues.length) {
          payload.issues = payload.issues.concat(${id}.issues.map(iss => ({
            ...iss,
            path: iss.path ? [${k}, ...iss.path] : [${k}]
          })));
        }
        
        if (${id}.value === undefined) {
          if (${k} in input) {
            newResult[${k}] = undefined;
          }
        } else {
          newResult[${k}] = ${id}.value;
        }
        
      `);
      }
    }
    doc.write(`payload.value = newResult;`);
    doc.write(`return payload;`);
    const fn = doc.compile();
    return (payload, ctx) => fn(shape, payload, ctx);
  };
  let fastpass;
  const isObject$12 = isObject;
  const jit = !globalConfig.jitless;
  const allowsEval$1 = allowsEval;
  const fastEnabled = jit && allowsEval$1.value;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject$12(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    if (jit && fastEnabled && ctx?.async === false && ctx.jitless !== true) {
      if (!fastpass)
        fastpass = generateFastpass(def.shape);
      payload = fastpass(payload, ctx);
      if (!catchall)
        return payload;
      return handleCatchall([], input, payload, ctx, value, inst);
    }
    return superParse(payload, ctx);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config$1())))
  });
  return final;
}
const $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
const $ZodIntersection = /* @__PURE__ */ $constructor("$ZodIntersection", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    const left = def.left._zod.run({ value: input, issues: [] }, ctx);
    const right = def.right._zod.run({ value: input, issues: [] }, ctx);
    const async = left instanceof Promise || right instanceof Promise;
    if (async) {
      return Promise.all([left, right]).then(([left2, right2]) => {
        return handleIntersectionResults(payload, left2, right2);
      });
    }
    return handleIntersectionResults(payload, left, right);
  };
});
function mergeValues(a, b) {
  if (a === b) {
    return { valid: true, data: a };
  }
  if (a instanceof Date && b instanceof Date && +a === +b) {
    return { valid: true, data: a };
  }
  if (isPlainObject(a) && isPlainObject(b)) {
    const bKeys = Object.keys(b);
    const sharedKeys = Object.keys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [key, ...sharedValue.mergeErrorPath]
        };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return { valid: false, mergeErrorPath: [] };
    }
    const newArray = [];
    for (let index2 = 0; index2 < a.length; index2++) {
      const itemA = a[index2];
      const itemB = b[index2];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return {
          valid: false,
          mergeErrorPath: [index2, ...sharedValue.mergeErrorPath]
        };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  }
  return { valid: false, mergeErrorPath: [] };
}
function handleIntersectionResults(result, left, right) {
  const unrecKeys = /* @__PURE__ */ new Map();
  let unrecIssue;
  for (const iss of left.issues) {
    if (iss.code === "unrecognized_keys") {
      unrecIssue ?? (unrecIssue = iss);
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).l = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  for (const iss of right.issues) {
    if (iss.code === "unrecognized_keys") {
      for (const k of iss.keys) {
        if (!unrecKeys.has(k))
          unrecKeys.set(k, {});
        unrecKeys.get(k).r = true;
      }
    } else {
      result.issues.push(iss);
    }
  }
  const bothKeys = [...unrecKeys].filter(([, f]) => f.l && f.r).map(([k]) => k);
  if (bothKeys.length && unrecIssue) {
    result.issues.push({ ...unrecIssue, keys: bothKeys });
  }
  if (aborted(result))
    return result;
  const merged = mergeValues(left.value, right.value);
  if (!merged.valid) {
    throw new Error(`Unmergable intersection. Error path: ${JSON.stringify(merged.mergeErrorPath)}`);
  }
  result.value = merged.data;
  return result;
}
const $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key of values) {
        if (typeof key === "string" || typeof key === "number" || typeof key === "symbol") {
          recordKeys.add(typeof key === "number" ? key.toString() : key);
          const keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config$1())),
              input: key,
              path: [key],
              inst
            });
            continue;
          }
          const outKey = keyResult.value;
          const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key, result2.issues));
              }
              payload.value[outKey] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key in input) {
        if (!recordKeys.has(key)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key of Reflect.ownKeys(input)) {
        if (key === "__proto__")
          continue;
        if (!Object.prototype.propertyIsEnumerable.call(input, key))
          continue;
        let keyResult = def.keyType._zod.run({ value: key, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key === "string" && number$1.test(key) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key] = input[key];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config$1())),
              input: key,
              path: [key],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
const $ZodEnum = /* @__PURE__ */ $constructor("$ZodEnum", (inst, def) => {
  $ZodType.init(inst, def);
  const values = getEnumValues(def.entries);
  const valuesSet = new Set(values);
  inst._zod.values = valuesSet;
  inst._zod.pattern = new RegExp(`^(${values.filter((k) => propertyKeyTypes.has(typeof k)).map((o) => typeof o === "string" ? escapeRegex(o) : o.toString()).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (valuesSet.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodLiteral = /* @__PURE__ */ $constructor("$ZodLiteral", (inst, def) => {
  $ZodType.init(inst, def);
  if (def.values.length === 0) {
    throw new Error("Cannot create literal schema with no valid values");
  }
  const values = new Set(def.values);
  inst._zod.values = values;
  inst._zod.pattern = new RegExp(`^(${def.values.map((o) => typeof o === "string" ? escapeRegex(o) : o ? escapeRegex(o.toString()) : String(o)).join("|")})$`);
  inst._zod.parse = (payload, _ctx) => {
    const input = payload.value;
    if (values.has(input)) {
      return payload;
    }
    payload.issues.push({
      code: "invalid_value",
      values: def.values,
      input,
      inst
    });
    return payload;
  };
});
const $ZodTransform = /* @__PURE__ */ $constructor("$ZodTransform", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    const _out = def.transform(payload.value, payload);
    if (ctx.async) {
      const output = _out instanceof Promise ? _out : Promise.resolve(_out);
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    if (_out instanceof Promise) {
      throw new $ZodAsyncError();
    }
    payload.value = _out;
    payload.fallback = true;
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
const $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodExactOptional = /* @__PURE__ */ $constructor("$ZodExactOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "pattern", () => def.innerType._zod.pattern);
  inst._zod.parse = (payload, ctx) => {
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNullable = /* @__PURE__ */ $constructor("$ZodNullable", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.innerType._zod.optin);
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)}|null)$`) : void 0;
  });
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, null]) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (payload.value === null)
      return payload;
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodDefault = /* @__PURE__ */ $constructor("$ZodDefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
      return payload;
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleDefaultResult(result2, def));
    }
    return handleDefaultResult(result, def);
  };
});
function handleDefaultResult(payload, def) {
  if (payload.value === void 0) {
    payload.value = def.defaultValue;
  }
  return payload;
}
const $ZodPrefault = /* @__PURE__ */ $constructor("$ZodPrefault", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    if (payload.value === void 0) {
      payload.value = def.defaultValue;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});
const $ZodNonOptional = /* @__PURE__ */ $constructor("$ZodNonOptional", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => {
    const v = def.innerType._zod.values;
    return v ? new Set([...v].filter((x) => x !== void 0)) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => handleNonOptionalResult(result2, inst));
    }
    return handleNonOptionalResult(result, inst);
  };
});
function handleNonOptionalResult(payload, inst) {
  if (!payload.issues.length && payload.value === void 0) {
    payload.issues.push({
      code: "invalid_type",
      expected: "nonoptional",
      input: payload.value,
      inst
    });
  }
  return payload;
}
const $ZodCatch = /* @__PURE__ */ $constructor("$ZodCatch", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  defineLazy(inst._zod, "optout", () => def.innerType._zod.optout);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then((result2) => {
        payload.value = result2.value;
        if (result2.issues.length) {
          payload.value = def.catchValue({
            ...payload,
            error: {
              issues: result2.issues.map((iss) => finalizeIssue(iss, ctx, config$1()))
            },
            input: payload.value
          });
          payload.issues = [];
          payload.fallback = true;
        }
        return payload;
      });
    }
    payload.value = result.value;
    if (result.issues.length) {
      payload.value = def.catchValue({
        ...payload,
        error: {
          issues: result.issues.map((iss) => finalizeIssue(iss, ctx, config$1()))
        },
        input: payload.value
      });
      payload.issues = [];
      payload.fallback = true;
    }
    return payload;
  };
});
const $ZodPipe = /* @__PURE__ */ $constructor("$ZodPipe", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "values", () => def.in._zod.values);
  defineLazy(inst._zod, "optin", () => def.in._zod.optin);
  defineLazy(inst._zod, "optout", () => def.out._zod.optout);
  defineLazy(inst._zod, "propValues", () => def.in._zod.propValues);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      const right = def.out._zod.run(payload, ctx);
      if (right instanceof Promise) {
        return right.then((right2) => handlePipeResult(right2, def.in, ctx));
      }
      return handlePipeResult(right, def.in, ctx);
    }
    const left = def.in._zod.run(payload, ctx);
    if (left instanceof Promise) {
      return left.then((left2) => handlePipeResult(left2, def.out, ctx));
    }
    return handlePipeResult(left, def.out, ctx);
  };
});
function handlePipeResult(left, next, ctx) {
  if (left.issues.length) {
    left.aborted = true;
    return left;
  }
  return next._zod.run({ value: left.value, issues: left.issues, fallback: left.fallback }, ctx);
}
const $ZodReadonly = /* @__PURE__ */ $constructor("$ZodReadonly", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "propValues", () => def.innerType._zod.propValues);
  defineLazy(inst._zod, "values", () => def.innerType._zod.values);
  defineLazy(inst._zod, "optin", () => def.innerType?._zod?.optin);
  defineLazy(inst._zod, "optout", () => def.innerType?._zod?.optout);
  inst._zod.parse = (payload, ctx) => {
    if (ctx.direction === "backward") {
      return def.innerType._zod.run(payload, ctx);
    }
    const result = def.innerType._zod.run(payload, ctx);
    if (result instanceof Promise) {
      return result.then(handleReadonlyResult);
    }
    return handleReadonlyResult(result);
  };
});
function handleReadonlyResult(payload) {
  payload.value = Object.freeze(payload.value);
  return payload;
}
const $ZodCustom = /* @__PURE__ */ $constructor("$ZodCustom", (inst, def) => {
  $ZodCheck.init(inst, def);
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _2) => {
    return payload;
  };
  inst._zod.check = (payload) => {
    const input = payload.value;
    const r = def.fn(input);
    if (r instanceof Promise) {
      return r.then((r2) => handleRefineResult(r2, payload, input, inst));
    }
    handleRefineResult(r, payload, input, inst);
    return;
  };
});
function handleRefineResult(result, payload, input, inst) {
  if (!result) {
    const _iss = {
      code: "custom",
      input,
      inst,
      // incorporates params.error into issue reporting
      path: [...inst._zod.def.path ?? []],
      // incorporates params.error into issue reporting
      continue: !inst._zod.def.abort
      // params: inst._zod.def.params,
    };
    if (inst._zod.def.params)
      _iss.params = inst._zod.def.params;
    payload.issues.push(issue(_iss));
  }
}
var _a;
class $ZodRegistry {
  constructor() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
  }
  add(schema, ..._meta) {
    const meta = _meta[0];
    this._map.set(schema, meta);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.set(meta.id, schema);
    }
    return this;
  }
  clear() {
    this._map = /* @__PURE__ */ new WeakMap();
    this._idmap = /* @__PURE__ */ new Map();
    return this;
  }
  remove(schema) {
    const meta = this._map.get(schema);
    if (meta && typeof meta === "object" && "id" in meta) {
      this._idmap.delete(meta.id);
    }
    this._map.delete(schema);
    return this;
  }
  get(schema) {
    const p = schema._zod.parent;
    if (p) {
      const pm = { ...this.get(p) ?? {} };
      delete pm.id;
      const f = { ...pm, ...this._map.get(schema) };
      return Object.keys(f).length ? f : void 0;
    }
    return this._map.get(schema);
  }
  has(schema) {
    return this._map.has(schema);
  }
}
function registry() {
  return new $ZodRegistry();
}
(_a = globalThis).__zod_globalRegistry ?? (_a.__zod_globalRegistry = registry());
const globalRegistry = globalThis.__zod_globalRegistry;
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _email(Class, params) {
  return new Class({
    type: "string",
    format: "email",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _guid(Class, params) {
  return new Class({
    type: "string",
    format: "guid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuid(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv4(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v4",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv6(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v6",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uuidv7(Class, params) {
  return new Class({
    type: "string",
    format: "uuid",
    check: "string_format",
    abort: false,
    version: "v7",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _url(Class, params) {
  return new Class({
    type: "string",
    format: "url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _emoji(Class, params) {
  return new Class({
    type: "string",
    format: "emoji",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _nanoid(Class, params) {
  return new Class({
    type: "string",
    format: "nanoid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid(Class, params) {
  return new Class({
    type: "string",
    format: "cuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cuid2(Class, params) {
  return new Class({
    type: "string",
    format: "cuid2",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ulid(Class, params) {
  return new Class({
    type: "string",
    format: "ulid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _xid(Class, params) {
  return new Class({
    type: "string",
    format: "xid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ksuid(Class, params) {
  return new Class({
    type: "string",
    format: "ksuid",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv4(Class, params) {
  return new Class({
    type: "string",
    format: "ipv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _ipv6(Class, params) {
  return new Class({
    type: "string",
    format: "ipv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv4(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv4",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _cidrv6(Class, params) {
  return new Class({
    type: "string",
    format: "cidrv6",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64(Class, params) {
  return new Class({
    type: "string",
    format: "base64",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _base64url(Class, params) {
  return new Class({
    type: "string",
    format: "base64url",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _e164(Class, params) {
  return new Class({
    type: "string",
    format: "e164",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _jwt(Class, params) {
  return new Class({
    type: "string",
    format: "jwt",
    check: "string_format",
    abort: false,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDateTime(Class, params) {
  return new Class({
    type: "string",
    format: "datetime",
    check: "string_format",
    offset: false,
    local: false,
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDate(Class, params) {
  return new Class({
    type: "string",
    format: "date",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoTime(Class, params) {
  return new Class({
    type: "string",
    format: "time",
    check: "string_format",
    precision: null,
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _isoDuration(Class, params) {
  return new Class({
    type: "string",
    format: "duration",
    check: "string_format",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _int(Class, params) {
  return new Class({
    type: "number",
    check: "number_format",
    abort: false,
    format: "safeint",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _any(Class) {
  return new Class({
    type: "any"
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _lt(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _lte(value, params) {
  return new $ZodCheckLessThan({
    check: "less_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _gt(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: false
  });
}
// @__NO_SIDE_EFFECTS__
function _gte(value, params) {
  return new $ZodCheckGreaterThan({
    check: "greater_than",
    ...normalizeParams(params),
    value,
    inclusive: true
  });
}
// @__NO_SIDE_EFFECTS__
function _multipleOf(value, params) {
  return new $ZodCheckMultipleOf({
    check: "multiple_of",
    ...normalizeParams(params),
    value
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _length(length, params) {
  return new $ZodCheckLengthEquals({
    check: "length_equals",
    ...normalizeParams(params),
    length
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}
// @__NO_SIDE_EFFECTS__
function _lowercase(params) {
  return new $ZodCheckLowerCase({
    check: "string_format",
    format: "lowercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _uppercase(params) {
  return new $ZodCheckUpperCase({
    check: "string_format",
    format: "uppercase",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _includes(includes, params) {
  return new $ZodCheckIncludes({
    check: "string_format",
    format: "includes",
    ...normalizeParams(params),
    includes
  });
}
// @__NO_SIDE_EFFECTS__
function _startsWith(prefix, params) {
  return new $ZodCheckStartsWith({
    check: "string_format",
    format: "starts_with",
    ...normalizeParams(params),
    prefix
  });
}
// @__NO_SIDE_EFFECTS__
function _endsWith(suffix, params) {
  return new $ZodCheckEndsWith({
    check: "string_format",
    format: "ends_with",
    ...normalizeParams(params),
    suffix
  });
}
// @__NO_SIDE_EFFECTS__
function _overwrite(tx) {
  return new $ZodCheckOverwrite({
    check: "overwrite",
    tx
  });
}
// @__NO_SIDE_EFFECTS__
function _normalize(form) {
  return /* @__PURE__ */ _overwrite((input) => input.normalize(form));
}
// @__NO_SIDE_EFFECTS__
function _trim() {
  return /* @__PURE__ */ _overwrite((input) => input.trim());
}
// @__NO_SIDE_EFFECTS__
function _toLowerCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toLowerCase());
}
// @__NO_SIDE_EFFECTS__
function _toUpperCase() {
  return /* @__PURE__ */ _overwrite((input) => input.toUpperCase());
}
// @__NO_SIDE_EFFECTS__
function _slugify() {
  return /* @__PURE__ */ _overwrite((input) => slugify(input));
}
// @__NO_SIDE_EFFECTS__
function _array(Class, element, params) {
  return new Class({
    type: "array",
    element,
    // get element() {
    //   return element;
    // },
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _refine(Class, fn, _params) {
  const schema = new Class({
    type: "custom",
    check: "custom",
    fn,
    ...normalizeParams(_params)
  });
  return schema;
}
// @__NO_SIDE_EFFECTS__
function _superRefine(fn, params) {
  const ch = /* @__PURE__ */ _check((payload) => {
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, ch._zod.def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = ch);
        _issue.continue ?? (_issue.continue = !ch._zod.def.abort);
        payload.issues.push(issue(_issue));
      }
    };
    return fn(payload.value, payload);
  }, params);
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _check(fn, params) {
  const ch = new $ZodCheck({
    check: "custom",
    ...normalizeParams(params)
  });
  ch._zod.check = fn;
  return ch;
}
function initializeContext(params) {
  let target = params?.target ?? "draft-2020-12";
  if (target === "draft-4")
    target = "draft-04";
  if (target === "draft-7")
    target = "draft-07";
  return {
    processors: params.processors ?? {},
    metadataRegistry: params?.metadata ?? globalRegistry,
    target,
    unrepresentable: params?.unrepresentable ?? "throw",
    override: params?.override ?? (() => {
    }),
    io: params?.io ?? "output",
    counter: 0,
    seen: /* @__PURE__ */ new Map(),
    cycles: params?.cycles ?? "ref",
    reused: params?.reused ?? "inline",
    external: params?.external ?? void 0
  };
}
function process$1(schema, ctx, _params = { path: [], schemaPath: [] }) {
  var _a2;
  const def = schema._zod.def;
  const seen = ctx.seen.get(schema);
  if (seen) {
    seen.count++;
    const isCycle = _params.schemaPath.includes(schema);
    if (isCycle) {
      seen.cycle = _params.path;
    }
    return seen.schema;
  }
  const result = { schema: {}, count: 1, cycle: void 0, path: _params.path };
  ctx.seen.set(schema, result);
  const overrideSchema = schema._zod.toJSONSchema?.();
  if (overrideSchema) {
    result.schema = overrideSchema;
  } else {
    const params = {
      ..._params,
      schemaPath: [..._params.schemaPath, schema],
      path: _params.path
    };
    if (schema._zod.processJSONSchema) {
      schema._zod.processJSONSchema(ctx, result.schema, params);
    } else {
      const _json = result.schema;
      const processor = ctx.processors[def.type];
      if (!processor) {
        throw new Error(`[toJSONSchema]: Non-representable type encountered: ${def.type}`);
      }
      processor(schema, ctx, _json, params);
    }
    const parent = schema._zod.parent;
    if (parent) {
      if (!result.ref)
        result.ref = parent;
      process$1(parent, ctx, params);
      ctx.seen.get(parent).isParent = true;
    }
  }
  const meta = ctx.metadataRegistry.get(schema);
  if (meta)
    Object.assign(result.schema, meta);
  if (ctx.io === "input" && isTransforming(schema)) {
    delete result.schema.examples;
    delete result.schema.default;
  }
  if (ctx.io === "input" && "_prefault" in result.schema)
    (_a2 = result.schema).default ?? (_a2.default = result.schema._prefault);
  delete result.schema._prefault;
  const _result = ctx.seen.get(schema);
  return _result.schema;
}
function extractDefs(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const idToSchema = /* @__PURE__ */ new Map();
  for (const entry of ctx.seen.entries()) {
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      const existing = idToSchema.get(id);
      if (existing && existing !== entry[0]) {
        throw new Error(`Duplicate schema id "${id}" detected during JSON Schema conversion. Two different schemas cannot share the same id when converted together.`);
      }
      idToSchema.set(id, entry[0]);
    }
  }
  const makeURI = (entry) => {
    const defsSegment = ctx.target === "draft-2020-12" ? "$defs" : "definitions";
    if (ctx.external) {
      const externalId = ctx.external.registry.get(entry[0])?.id;
      const uriGenerator = ctx.external.uri ?? ((id2) => id2);
      if (externalId) {
        return { ref: uriGenerator(externalId) };
      }
      const id = entry[1].defId ?? entry[1].schema.id ?? `schema${ctx.counter++}`;
      entry[1].defId = id;
      return { defId: id, ref: `${uriGenerator("__shared")}#/${defsSegment}/${id}` };
    }
    if (entry[1] === root) {
      return { ref: "#" };
    }
    const uriPrefix = `#`;
    const defUriPrefix = `${uriPrefix}/${defsSegment}/`;
    const defId = entry[1].schema.id ?? `__schema${ctx.counter++}`;
    return { defId, ref: defUriPrefix + defId };
  };
  const extractToDef = (entry) => {
    if (entry[1].schema.$ref) {
      return;
    }
    const seen = entry[1];
    const { ref, defId } = makeURI(entry);
    seen.def = { ...seen.schema };
    if (defId)
      seen.defId = defId;
    const schema2 = seen.schema;
    for (const key in schema2) {
      delete schema2[key];
    }
    schema2.$ref = ref;
  };
  if (ctx.cycles === "throw") {
    for (const entry of ctx.seen.entries()) {
      const seen = entry[1];
      if (seen.cycle) {
        throw new Error(`Cycle detected: #/${seen.cycle?.join("/")}/<root>

Set the \`cycles\` parameter to \`"ref"\` to resolve cyclical schemas with defs.`);
      }
    }
  }
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (schema === entry[0]) {
      extractToDef(entry);
      continue;
    }
    if (ctx.external) {
      const ext = ctx.external.registry.get(entry[0])?.id;
      if (schema !== entry[0] && ext) {
        extractToDef(entry);
        continue;
      }
    }
    const id = ctx.metadataRegistry.get(entry[0])?.id;
    if (id) {
      extractToDef(entry);
      continue;
    }
    if (seen.cycle) {
      extractToDef(entry);
      continue;
    }
    if (seen.count > 1) {
      if (ctx.reused === "ref") {
        extractToDef(entry);
        continue;
      }
    }
  }
}
function finalize(ctx, schema) {
  const root = ctx.seen.get(schema);
  if (!root)
    throw new Error("Unprocessed schema. This is a bug in Zod.");
  const flattenRef = (zodSchema) => {
    const seen = ctx.seen.get(zodSchema);
    if (seen.ref === null)
      return;
    const schema2 = seen.def ?? seen.schema;
    const _cached = { ...schema2 };
    const ref = seen.ref;
    seen.ref = null;
    if (ref) {
      flattenRef(ref);
      const refSeen = ctx.seen.get(ref);
      const refSchema = refSeen.schema;
      if (refSchema.$ref && (ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0")) {
        schema2.allOf = schema2.allOf ?? [];
        schema2.allOf.push(refSchema);
      } else {
        Object.assign(schema2, refSchema);
      }
      Object.assign(schema2, _cached);
      const isParentRef = zodSchema._zod.parent === ref;
      if (isParentRef) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (!(key in _cached)) {
            delete schema2[key];
          }
        }
      }
      if (refSchema.$ref && refSeen.def) {
        for (const key in schema2) {
          if (key === "$ref" || key === "allOf")
            continue;
          if (key in refSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(refSeen.def[key])) {
            delete schema2[key];
          }
        }
      }
    }
    const parent = zodSchema._zod.parent;
    if (parent && parent !== ref) {
      flattenRef(parent);
      const parentSeen = ctx.seen.get(parent);
      if (parentSeen?.schema.$ref) {
        schema2.$ref = parentSeen.schema.$ref;
        if (parentSeen.def) {
          for (const key in schema2) {
            if (key === "$ref" || key === "allOf")
              continue;
            if (key in parentSeen.def && JSON.stringify(schema2[key]) === JSON.stringify(parentSeen.def[key])) {
              delete schema2[key];
            }
          }
        }
      }
    }
    ctx.override({
      zodSchema,
      jsonSchema: schema2,
      path: seen.path ?? []
    });
  };
  for (const entry of [...ctx.seen.entries()].reverse()) {
    flattenRef(entry[0]);
  }
  const result = {};
  if (ctx.target === "draft-2020-12") {
    result.$schema = "https://json-schema.org/draft/2020-12/schema";
  } else if (ctx.target === "draft-07") {
    result.$schema = "http://json-schema.org/draft-07/schema#";
  } else if (ctx.target === "draft-04") {
    result.$schema = "http://json-schema.org/draft-04/schema#";
  } else if (ctx.target === "openapi-3.0") ;
  else ;
  if (ctx.external?.uri) {
    const id = ctx.external.registry.get(schema)?.id;
    if (!id)
      throw new Error("Schema is missing an `id` property");
    result.$id = ctx.external.uri(id);
  }
  Object.assign(result, root.def ?? root.schema);
  const rootMetaId = ctx.metadataRegistry.get(schema)?.id;
  if (rootMetaId !== void 0 && result.id === rootMetaId)
    delete result.id;
  const defs = ctx.external?.defs ?? {};
  for (const entry of ctx.seen.entries()) {
    const seen = entry[1];
    if (seen.def && seen.defId) {
      if (seen.def.id === seen.defId)
        delete seen.def.id;
      defs[seen.defId] = seen.def;
    }
  }
  if (ctx.external) ;
  else {
    if (Object.keys(defs).length > 0) {
      if (ctx.target === "draft-2020-12") {
        result.$defs = defs;
      } else {
        result.definitions = defs;
      }
    }
  }
  try {
    const finalized = JSON.parse(JSON.stringify(result));
    Object.defineProperty(finalized, "~standard", {
      value: {
        ...schema["~standard"],
        jsonSchema: {
          input: createStandardJSONSchemaMethod(schema, "input", ctx.processors),
          output: createStandardJSONSchemaMethod(schema, "output", ctx.processors)
        }
      },
      enumerable: false,
      writable: false
    });
    return finalized;
  } catch (_err) {
    throw new Error("Error converting schema to JSON.");
  }
}
function isTransforming(_schema, _ctx) {
  const ctx = _ctx ?? { seen: /* @__PURE__ */ new Set() };
  if (ctx.seen.has(_schema))
    return false;
  ctx.seen.add(_schema);
  const def = _schema._zod.def;
  if (def.type === "transform")
    return true;
  if (def.type === "array")
    return isTransforming(def.element, ctx);
  if (def.type === "set")
    return isTransforming(def.valueType, ctx);
  if (def.type === "lazy")
    return isTransforming(def.getter(), ctx);
  if (def.type === "promise" || def.type === "optional" || def.type === "nonoptional" || def.type === "nullable" || def.type === "readonly" || def.type === "default" || def.type === "prefault") {
    return isTransforming(def.innerType, ctx);
  }
  if (def.type === "intersection") {
    return isTransforming(def.left, ctx) || isTransforming(def.right, ctx);
  }
  if (def.type === "record" || def.type === "map") {
    return isTransforming(def.keyType, ctx) || isTransforming(def.valueType, ctx);
  }
  if (def.type === "pipe") {
    if (_schema._zod.traits.has("$ZodCodec"))
      return true;
    return isTransforming(def.in, ctx) || isTransforming(def.out, ctx);
  }
  if (def.type === "object") {
    for (const key in def.shape) {
      if (isTransforming(def.shape[key], ctx))
        return true;
    }
    return false;
  }
  if (def.type === "union") {
    for (const option of def.options) {
      if (isTransforming(option, ctx))
        return true;
    }
    return false;
  }
  if (def.type === "tuple") {
    for (const item of def.items) {
      if (isTransforming(item, ctx))
        return true;
    }
    if (def.rest && isTransforming(def.rest, ctx))
      return true;
    return false;
  }
  return false;
}
const createToJSONSchemaMethod = (schema, processors = {}) => (params) => {
  const ctx = initializeContext({ ...params, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const createStandardJSONSchemaMethod = (schema, io, processors = {}) => (params) => {
  const { libraryOptions, target } = params ?? {};
  const ctx = initializeContext({ ...libraryOptions ?? {}, target, io, processors });
  process$1(schema, ctx);
  extractDefs(ctx, schema);
  return finalize(ctx, schema);
};
const formatMap = {
  guid: "uuid",
  url: "uri",
  datetime: "date-time",
  json_string: "json-string",
  regex: ""
  // do not set
};
const stringProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  json2.type = "string";
  const { minimum, maximum, format, patterns, contentEncoding } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minLength = minimum;
  if (typeof maximum === "number")
    json2.maxLength = maximum;
  if (format) {
    json2.format = formatMap[format] ?? format;
    if (json2.format === "")
      delete json2.format;
    if (format === "time") {
      delete json2.format;
    }
  }
  if (contentEncoding)
    json2.contentEncoding = contentEncoding;
  if (patterns && patterns.size > 0) {
    const regexes = [...patterns];
    if (regexes.length === 1)
      json2.pattern = regexes[0].source;
    else if (regexes.length > 1) {
      json2.allOf = [
        ...regexes.map((regex) => ({
          ...ctx.target === "draft-07" || ctx.target === "draft-04" || ctx.target === "openapi-3.0" ? { type: "string" } : {},
          pattern: regex.source
        }))
      ];
    }
  }
};
const numberProcessor = (schema, ctx, _json, _params) => {
  const json2 = _json;
  const { minimum, maximum, format, multipleOf, exclusiveMaximum, exclusiveMinimum } = schema._zod.bag;
  if (typeof format === "string" && format.includes("int"))
    json2.type = "integer";
  else
    json2.type = "number";
  const exMin = typeof exclusiveMinimum === "number" && exclusiveMinimum >= (minimum ?? Number.NEGATIVE_INFINITY);
  const exMax = typeof exclusiveMaximum === "number" && exclusiveMaximum <= (maximum ?? Number.POSITIVE_INFINITY);
  const legacy = ctx.target === "draft-04" || ctx.target === "openapi-3.0";
  if (exMin) {
    if (legacy) {
      json2.minimum = exclusiveMinimum;
      json2.exclusiveMinimum = true;
    } else {
      json2.exclusiveMinimum = exclusiveMinimum;
    }
  } else if (typeof minimum === "number") {
    json2.minimum = minimum;
  }
  if (exMax) {
    if (legacy) {
      json2.maximum = exclusiveMaximum;
      json2.exclusiveMaximum = true;
    } else {
      json2.exclusiveMaximum = exclusiveMaximum;
    }
  } else if (typeof maximum === "number") {
    json2.maximum = maximum;
  }
  if (typeof multipleOf === "number")
    json2.multipleOf = multipleOf;
};
const booleanProcessor = (_schema, _ctx, json2, _params) => {
  json2.type = "boolean";
};
const neverProcessor = (_schema, _ctx, json2, _params) => {
  json2.not = {};
};
const anyProcessor = (_schema, _ctx, _json, _params) => {
};
const unknownProcessor = (_schema, _ctx, _json, _params) => {
};
const enumProcessor = (schema, _ctx, json2, _params) => {
  const def = schema._zod.def;
  const values = getEnumValues(def.entries);
  if (values.every((v) => typeof v === "number"))
    json2.type = "number";
  if (values.every((v) => typeof v === "string"))
    json2.type = "string";
  json2.enum = values;
};
const literalProcessor = (schema, ctx, json2, _params) => {
  const def = schema._zod.def;
  const vals = [];
  for (const val of def.values) {
    if (val === void 0) {
      if (ctx.unrepresentable === "throw") {
        throw new Error("Literal `undefined` cannot be represented in JSON Schema");
      }
    } else if (typeof val === "bigint") {
      if (ctx.unrepresentable === "throw") {
        throw new Error("BigInt literals cannot be represented in JSON Schema");
      } else {
        vals.push(Number(val));
      }
    } else {
      vals.push(val);
    }
  }
  if (vals.length === 0) ;
  else if (vals.length === 1) {
    const val = vals[0];
    json2.type = val === null ? "null" : typeof val;
    if (ctx.target === "draft-04" || ctx.target === "openapi-3.0") {
      json2.enum = [val];
    } else {
      json2.const = val;
    }
  } else {
    if (vals.every((v) => typeof v === "number"))
      json2.type = "number";
    if (vals.every((v) => typeof v === "string"))
      json2.type = "string";
    if (vals.every((v) => typeof v === "boolean"))
      json2.type = "boolean";
    if (vals.every((v) => v === null))
      json2.type = "null";
    json2.enum = vals;
  }
};
const customProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Custom types cannot be represented in JSON Schema");
  }
};
const transformProcessor = (_schema, ctx, _json, _params) => {
  if (ctx.unrepresentable === "throw") {
    throw new Error("Transforms cannot be represented in JSON Schema");
  }
};
const arrayProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  const { minimum, maximum } = schema._zod.bag;
  if (typeof minimum === "number")
    json2.minItems = minimum;
  if (typeof maximum === "number")
    json2.maxItems = maximum;
  json2.type = "array";
  json2.items = process$1(def.element, ctx, {
    ...params,
    path: [...params.path, "items"]
  });
};
const objectProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  json2.properties = {};
  const shape = def.shape;
  for (const key in shape) {
    json2.properties[key] = process$1(shape[key], ctx, {
      ...params,
      path: [...params.path, "properties", key]
    });
  }
  const allKeys = new Set(Object.keys(shape));
  const requiredKeys = new Set([...allKeys].filter((key) => {
    const v = def.shape[key]._zod;
    if (ctx.io === "input") {
      return v.optin === void 0;
    } else {
      return v.optout === void 0;
    }
  }));
  if (requiredKeys.size > 0) {
    json2.required = Array.from(requiredKeys);
  }
  if (def.catchall?._zod.def.type === "never") {
    json2.additionalProperties = false;
  } else if (!def.catchall) {
    if (ctx.io === "output")
      json2.additionalProperties = false;
  } else if (def.catchall) {
    json2.additionalProperties = process$1(def.catchall, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
};
const unionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const isExclusive = def.inclusive === false;
  const options2 = def.options.map((x, i) => process$1(x, ctx, {
    ...params,
    path: [...params.path, isExclusive ? "oneOf" : "anyOf", i]
  }));
  if (isExclusive) {
    json2.oneOf = options2;
  } else {
    json2.anyOf = options2;
  }
};
const intersectionProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const a = process$1(def.left, ctx, {
    ...params,
    path: [...params.path, "allOf", 0]
  });
  const b = process$1(def.right, ctx, {
    ...params,
    path: [...params.path, "allOf", 1]
  });
  const isSimpleIntersection = (val) => "allOf" in val && Object.keys(val).length === 1;
  const allOf = [
    ...isSimpleIntersection(a) ? a.allOf : [a],
    ...isSimpleIntersection(b) ? b.allOf : [b]
  ];
  json2.allOf = allOf;
};
const recordProcessor = (schema, ctx, _json, params) => {
  const json2 = _json;
  const def = schema._zod.def;
  json2.type = "object";
  const keyType = def.keyType;
  const keyBag = keyType._zod.bag;
  const patterns = keyBag?.patterns;
  if (def.mode === "loose" && patterns && patterns.size > 0) {
    const valueSchema = process$1(def.valueType, ctx, {
      ...params,
      path: [...params.path, "patternProperties", "*"]
    });
    json2.patternProperties = {};
    for (const pattern of patterns) {
      json2.patternProperties[pattern.source] = valueSchema;
    }
  } else {
    if (ctx.target === "draft-07" || ctx.target === "draft-2020-12") {
      json2.propertyNames = process$1(def.keyType, ctx, {
        ...params,
        path: [...params.path, "propertyNames"]
      });
    }
    json2.additionalProperties = process$1(def.valueType, ctx, {
      ...params,
      path: [...params.path, "additionalProperties"]
    });
  }
  const keyValues = keyType._zod.values;
  if (keyValues) {
    const validKeyValues = [...keyValues].filter((v) => typeof v === "string" || typeof v === "number");
    if (validKeyValues.length > 0) {
      json2.required = validKeyValues;
    }
  }
};
const nullableProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  const inner = process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  if (ctx.target === "openapi-3.0") {
    seen.ref = def.innerType;
    json2.nullable = true;
  } else {
    json2.anyOf = [inner, { type: "null" }];
  }
};
const nonoptionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const defaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.default = JSON.parse(JSON.stringify(def.defaultValue));
};
const prefaultProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  if (ctx.io === "input")
    json2._prefault = JSON.parse(JSON.stringify(def.defaultValue));
};
const catchProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  let catchValue;
  try {
    catchValue = def.catchValue(void 0);
  } catch {
    throw new Error("Dynamic catch values are not supported in JSON Schema");
  }
  json2.default = catchValue;
};
const pipeProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  const inIsTransform = def.in._zod.traits.has("$ZodTransform");
  const innerType = ctx.io === "input" ? inIsTransform ? def.out : def.in : def.out;
  process$1(innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = innerType;
};
const readonlyProcessor = (schema, ctx, json2, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
  json2.readOnly = true;
};
const optionalProcessor = (schema, ctx, _json, params) => {
  const def = schema._zod.def;
  process$1(def.innerType, ctx, params);
  const seen = ctx.seen.get(schema);
  seen.ref = def.innerType;
};
const ZodISODateTime = /* @__PURE__ */ $constructor("ZodISODateTime", (inst, def) => {
  $ZodISODateTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function datetime(params) {
  return /* @__PURE__ */ _isoDateTime(ZodISODateTime, params);
}
const ZodISODate = /* @__PURE__ */ $constructor("ZodISODate", (inst, def) => {
  $ZodISODate.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function date(params) {
  return /* @__PURE__ */ _isoDate(ZodISODate, params);
}
const ZodISOTime = /* @__PURE__ */ $constructor("ZodISOTime", (inst, def) => {
  $ZodISOTime.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function time(params) {
  return /* @__PURE__ */ _isoTime(ZodISOTime, params);
}
const ZodISODuration = /* @__PURE__ */ $constructor("ZodISODuration", (inst, def) => {
  $ZodISODuration.init(inst, def);
  ZodStringFormat.init(inst, def);
});
function duration(params) {
  return /* @__PURE__ */ _isoDuration(ZodISODuration, params);
}
const initializer = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  Object.defineProperties(inst, {
    format: {
      value: (mapper) => formatError(inst, mapper)
      // enumerable: false,
    },
    flatten: {
      value: (mapper) => flattenError(inst, mapper)
      // enumerable: false,
    },
    addIssue: {
      value: (issue2) => {
        inst.issues.push(issue2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    addIssues: {
      value: (issues2) => {
        inst.issues.push(...issues2);
        inst.message = JSON.stringify(inst.issues, jsonStringifyReplacer, 2);
      }
      // enumerable: false,
    },
    isEmpty: {
      get() {
        return inst.issues.length === 0;
      }
      // enumerable: false,
    }
  });
};
const ZodRealError = /* @__PURE__ */ $constructor("ZodError", initializer, {
  Parent: Error
});
const parse = /* @__PURE__ */ _parse(ZodRealError);
const parseAsync = /* @__PURE__ */ _parseAsync(ZodRealError);
const safeParse = /* @__PURE__ */ _safeParse(ZodRealError);
const safeParseAsync = /* @__PURE__ */ _safeParseAsync(ZodRealError);
const encode = /* @__PURE__ */ _encode(ZodRealError);
const decode = /* @__PURE__ */ _decode(ZodRealError);
const encodeAsync = /* @__PURE__ */ _encodeAsync(ZodRealError);
const decodeAsync = /* @__PURE__ */ _decodeAsync(ZodRealError);
const safeEncode = /* @__PURE__ */ _safeEncode(ZodRealError);
const safeDecode = /* @__PURE__ */ _safeDecode(ZodRealError);
const safeEncodeAsync = /* @__PURE__ */ _safeEncodeAsync(ZodRealError);
const safeDecodeAsync = /* @__PURE__ */ _safeDecodeAsync(ZodRealError);
const _installedGroups = /* @__PURE__ */ new WeakMap();
function _installLazyMethods(inst, group, methods) {
  const proto = Object.getPrototypeOf(inst);
  let installed = _installedGroups.get(proto);
  if (!installed) {
    installed = /* @__PURE__ */ new Set();
    _installedGroups.set(proto, installed);
  }
  if (installed.has(group))
    return;
  installed.add(group);
  for (const key in methods) {
    const fn = methods[key];
    Object.defineProperty(proto, key, {
      configurable: true,
      enumerable: false,
      get() {
        const bound = fn.bind(this);
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: bound
        });
        return bound;
      },
      set(v) {
        Object.defineProperty(this, key, {
          configurable: true,
          writable: true,
          enumerable: true,
          value: v
        });
      }
    });
  }
}
const ZodType = /* @__PURE__ */ $constructor("ZodType", (inst, def) => {
  $ZodType.init(inst, def);
  Object.assign(inst["~standard"], {
    jsonSchema: {
      input: createStandardJSONSchemaMethod(inst, "input"),
      output: createStandardJSONSchemaMethod(inst, "output")
    }
  });
  inst.toJSONSchema = createToJSONSchemaMethod(inst, {});
  inst.def = def;
  inst.type = def.type;
  Object.defineProperty(inst, "_def", { value: def });
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.spa = inst.safeParseAsync;
  inst.encode = (data, params) => encode(inst, data, params);
  inst.decode = (data, params) => decode(inst, data, params);
  inst.encodeAsync = async (data, params) => encodeAsync(inst, data, params);
  inst.decodeAsync = async (data, params) => decodeAsync(inst, data, params);
  inst.safeEncode = (data, params) => safeEncode(inst, data, params);
  inst.safeDecode = (data, params) => safeDecode(inst, data, params);
  inst.safeEncodeAsync = async (data, params) => safeEncodeAsync(inst, data, params);
  inst.safeDecodeAsync = async (data, params) => safeDecodeAsync(inst, data, params);
  _installLazyMethods(inst, "ZodType", {
    check(...chks) {
      const def2 = this.def;
      return this.clone(mergeDefs(def2, {
        checks: [
          ...def2.checks ?? [],
          ...chks.map((ch) => typeof ch === "function" ? { _zod: { check: ch, def: { check: "custom" }, onattach: [] } } : ch)
        ]
      }), { parent: true });
    },
    with(...chks) {
      return this.check(...chks);
    },
    clone(def2, params) {
      return clone(this, def2, params);
    },
    brand() {
      return this;
    },
    register(reg, meta) {
      reg.add(this, meta);
      return this;
    },
    refine(check, params) {
      return this.check(refine(check, params));
    },
    superRefine(refinement, params) {
      return this.check(superRefine(refinement, params));
    },
    overwrite(fn) {
      return this.check(/* @__PURE__ */ _overwrite(fn));
    },
    optional() {
      return optional(this);
    },
    exactOptional() {
      return exactOptional(this);
    },
    nullable() {
      return nullable(this);
    },
    nullish() {
      return optional(nullable(this));
    },
    nonoptional(params) {
      return nonoptional(this, params);
    },
    array() {
      return array(this);
    },
    or(arg) {
      return union([this, arg]);
    },
    and(arg) {
      return intersection(this, arg);
    },
    transform(tx) {
      return pipe(this, transform(tx));
    },
    default(d) {
      return _default(this, d);
    },
    prefault(d) {
      return prefault(this, d);
    },
    catch(params) {
      return _catch(this, params);
    },
    pipe(target) {
      return pipe(this, target);
    },
    readonly() {
      return readonly(this);
    },
    describe(description) {
      const cl = this.clone();
      globalRegistry.add(cl, { description });
      return cl;
    },
    meta(...args) {
      if (args.length === 0)
        return globalRegistry.get(this);
      const cl = this.clone();
      globalRegistry.add(cl, args[0]);
      return cl;
    },
    isOptional() {
      return this.safeParse(void 0).success;
    },
    isNullable() {
      return this.safeParse(null).success;
    },
    apply(fn) {
      return fn(this);
    }
  });
  Object.defineProperty(inst, "description", {
    get() {
      return globalRegistry.get(inst)?.description;
    },
    configurable: true
  });
  return inst;
});
const _ZodString = /* @__PURE__ */ $constructor("_ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => stringProcessor(inst, ctx, json2);
  const bag = inst._zod.bag;
  inst.format = bag.format ?? null;
  inst.minLength = bag.minimum ?? null;
  inst.maxLength = bag.maximum ?? null;
  _installLazyMethods(inst, "_ZodString", {
    regex(...args) {
      return this.check(/* @__PURE__ */ _regex(...args));
    },
    includes(...args) {
      return this.check(/* @__PURE__ */ _includes(...args));
    },
    startsWith(...args) {
      return this.check(/* @__PURE__ */ _startsWith(...args));
    },
    endsWith(...args) {
      return this.check(/* @__PURE__ */ _endsWith(...args));
    },
    min(...args) {
      return this.check(/* @__PURE__ */ _minLength(...args));
    },
    max(...args) {
      return this.check(/* @__PURE__ */ _maxLength(...args));
    },
    length(...args) {
      return this.check(/* @__PURE__ */ _length(...args));
    },
    nonempty(...args) {
      return this.check(/* @__PURE__ */ _minLength(1, ...args));
    },
    lowercase(params) {
      return this.check(/* @__PURE__ */ _lowercase(params));
    },
    uppercase(params) {
      return this.check(/* @__PURE__ */ _uppercase(params));
    },
    trim() {
      return this.check(/* @__PURE__ */ _trim());
    },
    normalize(...args) {
      return this.check(/* @__PURE__ */ _normalize(...args));
    },
    toLowerCase() {
      return this.check(/* @__PURE__ */ _toLowerCase());
    },
    toUpperCase() {
      return this.check(/* @__PURE__ */ _toUpperCase());
    },
    slugify() {
      return this.check(/* @__PURE__ */ _slugify());
    }
  });
});
const ZodString = /* @__PURE__ */ $constructor("ZodString", (inst, def) => {
  $ZodString.init(inst, def);
  _ZodString.init(inst, def);
  inst.email = (params) => inst.check(/* @__PURE__ */ _email(ZodEmail, params));
  inst.url = (params) => inst.check(/* @__PURE__ */ _url(ZodURL, params));
  inst.jwt = (params) => inst.check(/* @__PURE__ */ _jwt(ZodJWT, params));
  inst.emoji = (params) => inst.check(/* @__PURE__ */ _emoji(ZodEmoji, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.uuid = (params) => inst.check(/* @__PURE__ */ _uuid(ZodUUID, params));
  inst.uuidv4 = (params) => inst.check(/* @__PURE__ */ _uuidv4(ZodUUID, params));
  inst.uuidv6 = (params) => inst.check(/* @__PURE__ */ _uuidv6(ZodUUID, params));
  inst.uuidv7 = (params) => inst.check(/* @__PURE__ */ _uuidv7(ZodUUID, params));
  inst.nanoid = (params) => inst.check(/* @__PURE__ */ _nanoid(ZodNanoID, params));
  inst.guid = (params) => inst.check(/* @__PURE__ */ _guid(ZodGUID, params));
  inst.cuid = (params) => inst.check(/* @__PURE__ */ _cuid(ZodCUID, params));
  inst.cuid2 = (params) => inst.check(/* @__PURE__ */ _cuid2(ZodCUID2, params));
  inst.ulid = (params) => inst.check(/* @__PURE__ */ _ulid(ZodULID, params));
  inst.base64 = (params) => inst.check(/* @__PURE__ */ _base64(ZodBase64, params));
  inst.base64url = (params) => inst.check(/* @__PURE__ */ _base64url(ZodBase64URL, params));
  inst.xid = (params) => inst.check(/* @__PURE__ */ _xid(ZodXID, params));
  inst.ksuid = (params) => inst.check(/* @__PURE__ */ _ksuid(ZodKSUID, params));
  inst.ipv4 = (params) => inst.check(/* @__PURE__ */ _ipv4(ZodIPv4, params));
  inst.ipv6 = (params) => inst.check(/* @__PURE__ */ _ipv6(ZodIPv6, params));
  inst.cidrv4 = (params) => inst.check(/* @__PURE__ */ _cidrv4(ZodCIDRv4, params));
  inst.cidrv6 = (params) => inst.check(/* @__PURE__ */ _cidrv6(ZodCIDRv6, params));
  inst.e164 = (params) => inst.check(/* @__PURE__ */ _e164(ZodE164, params));
  inst.datetime = (params) => inst.check(datetime(params));
  inst.date = (params) => inst.check(date(params));
  inst.time = (params) => inst.check(time(params));
  inst.duration = (params) => inst.check(duration(params));
});
function string(params) {
  return /* @__PURE__ */ _string(ZodString, params);
}
const ZodStringFormat = /* @__PURE__ */ $constructor("ZodStringFormat", (inst, def) => {
  $ZodStringFormat.init(inst, def);
  _ZodString.init(inst, def);
});
const ZodEmail = /* @__PURE__ */ $constructor("ZodEmail", (inst, def) => {
  $ZodEmail.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodGUID = /* @__PURE__ */ $constructor("ZodGUID", (inst, def) => {
  $ZodGUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodUUID = /* @__PURE__ */ $constructor("ZodUUID", (inst, def) => {
  $ZodUUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodURL = /* @__PURE__ */ $constructor("ZodURL", (inst, def) => {
  $ZodURL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodEmoji = /* @__PURE__ */ $constructor("ZodEmoji", (inst, def) => {
  $ZodEmoji.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNanoID = /* @__PURE__ */ $constructor("ZodNanoID", (inst, def) => {
  $ZodNanoID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID = /* @__PURE__ */ $constructor("ZodCUID", (inst, def) => {
  $ZodCUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCUID2 = /* @__PURE__ */ $constructor("ZodCUID2", (inst, def) => {
  $ZodCUID2.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodULID = /* @__PURE__ */ $constructor("ZodULID", (inst, def) => {
  $ZodULID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodXID = /* @__PURE__ */ $constructor("ZodXID", (inst, def) => {
  $ZodXID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodKSUID = /* @__PURE__ */ $constructor("ZodKSUID", (inst, def) => {
  $ZodKSUID.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv4 = /* @__PURE__ */ $constructor("ZodIPv4", (inst, def) => {
  $ZodIPv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodIPv6 = /* @__PURE__ */ $constructor("ZodIPv6", (inst, def) => {
  $ZodIPv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv4 = /* @__PURE__ */ $constructor("ZodCIDRv4", (inst, def) => {
  $ZodCIDRv4.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodCIDRv6 = /* @__PURE__ */ $constructor("ZodCIDRv6", (inst, def) => {
  $ZodCIDRv6.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64 = /* @__PURE__ */ $constructor("ZodBase64", (inst, def) => {
  $ZodBase64.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodBase64URL = /* @__PURE__ */ $constructor("ZodBase64URL", (inst, def) => {
  $ZodBase64URL.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodE164 = /* @__PURE__ */ $constructor("ZodE164", (inst, def) => {
  $ZodE164.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodJWT = /* @__PURE__ */ $constructor("ZodJWT", (inst, def) => {
  $ZodJWT.init(inst, def);
  ZodStringFormat.init(inst, def);
});
const ZodNumber = /* @__PURE__ */ $constructor("ZodNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => numberProcessor(inst, ctx, json2);
  _installLazyMethods(inst, "ZodNumber", {
    gt(value, params) {
      return this.check(/* @__PURE__ */ _gt(value, params));
    },
    gte(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    min(value, params) {
      return this.check(/* @__PURE__ */ _gte(value, params));
    },
    lt(value, params) {
      return this.check(/* @__PURE__ */ _lt(value, params));
    },
    lte(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    max(value, params) {
      return this.check(/* @__PURE__ */ _lte(value, params));
    },
    int(params) {
      return this.check(int(params));
    },
    safe(params) {
      return this.check(int(params));
    },
    positive(params) {
      return this.check(/* @__PURE__ */ _gt(0, params));
    },
    nonnegative(params) {
      return this.check(/* @__PURE__ */ _gte(0, params));
    },
    negative(params) {
      return this.check(/* @__PURE__ */ _lt(0, params));
    },
    nonpositive(params) {
      return this.check(/* @__PURE__ */ _lte(0, params));
    },
    multipleOf(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    step(value, params) {
      return this.check(/* @__PURE__ */ _multipleOf(value, params));
    },
    finite() {
      return this;
    }
  });
  const bag = inst._zod.bag;
  inst.minValue = Math.max(bag.minimum ?? Number.NEGATIVE_INFINITY, bag.exclusiveMinimum ?? Number.NEGATIVE_INFINITY) ?? null;
  inst.maxValue = Math.min(bag.maximum ?? Number.POSITIVE_INFINITY, bag.exclusiveMaximum ?? Number.POSITIVE_INFINITY) ?? null;
  inst.isInt = (bag.format ?? "").includes("int") || Number.isSafeInteger(bag.multipleOf ?? 0.5);
  inst.isFinite = true;
  inst.format = bag.format ?? null;
});
function number(params) {
  return /* @__PURE__ */ _number(ZodNumber, params);
}
const ZodNumberFormat = /* @__PURE__ */ $constructor("ZodNumberFormat", (inst, def) => {
  $ZodNumberFormat.init(inst, def);
  ZodNumber.init(inst, def);
});
function int(params) {
  return /* @__PURE__ */ _int(ZodNumberFormat, params);
}
const ZodBoolean = /* @__PURE__ */ $constructor("ZodBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => booleanProcessor(inst, ctx, json2);
});
function boolean(params) {
  return /* @__PURE__ */ _boolean(ZodBoolean, params);
}
const ZodAny = /* @__PURE__ */ $constructor("ZodAny", (inst, def) => {
  $ZodAny.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => anyProcessor();
});
function any() {
  return /* @__PURE__ */ _any(ZodAny);
}
const ZodUnknown = /* @__PURE__ */ $constructor("ZodUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unknownProcessor();
});
function unknown() {
  return /* @__PURE__ */ _unknown(ZodUnknown);
}
const ZodNever = /* @__PURE__ */ $constructor("ZodNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => neverProcessor(inst, ctx, json2);
});
function never(params) {
  return /* @__PURE__ */ _never(ZodNever, params);
}
const ZodArray = /* @__PURE__ */ $constructor("ZodArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => arrayProcessor(inst, ctx, json2, params);
  inst.element = def.element;
  _installLazyMethods(inst, "ZodArray", {
    min(n, params) {
      return this.check(/* @__PURE__ */ _minLength(n, params));
    },
    nonempty(params) {
      return this.check(/* @__PURE__ */ _minLength(1, params));
    },
    max(n, params) {
      return this.check(/* @__PURE__ */ _maxLength(n, params));
    },
    length(n, params) {
      return this.check(/* @__PURE__ */ _length(n, params));
    },
    unwrap() {
      return this.element;
    }
  });
});
function array(element, params) {
  return /* @__PURE__ */ _array(ZodArray, element, params);
}
const ZodObject = /* @__PURE__ */ $constructor("ZodObject", (inst, def) => {
  $ZodObjectJIT.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => objectProcessor(inst, ctx, json2, params);
  defineLazy(inst, "shape", () => {
    return def.shape;
  });
  _installLazyMethods(inst, "ZodObject", {
    keyof() {
      return _enum(Object.keys(this._zod.def.shape));
    },
    catchall(catchall) {
      return this.clone({ ...this._zod.def, catchall });
    },
    passthrough() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    loose() {
      return this.clone({ ...this._zod.def, catchall: unknown() });
    },
    strict() {
      return this.clone({ ...this._zod.def, catchall: never() });
    },
    strip() {
      return this.clone({ ...this._zod.def, catchall: void 0 });
    },
    extend(incoming) {
      return extend(this, incoming);
    },
    safeExtend(incoming) {
      return safeExtend(this, incoming);
    },
    merge(other) {
      return merge(this, other);
    },
    pick(mask) {
      return pick(this, mask);
    },
    omit(mask) {
      return omit(this, mask);
    },
    partial(...args) {
      return partial(ZodOptional, this, args[0]);
    },
    required(...args) {
      return required(ZodNonOptional, this, args[0]);
    }
  });
});
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodObject(def);
}
const ZodUnion = /* @__PURE__ */ $constructor("ZodUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => unionProcessor(inst, ctx, json2, params);
  inst.options = def.options;
});
function union(options2, params) {
  return new ZodUnion({
    type: "union",
    options: options2,
    ...normalizeParams(params)
  });
}
const ZodIntersection = /* @__PURE__ */ $constructor("ZodIntersection", (inst, def) => {
  $ZodIntersection.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => intersectionProcessor(inst, ctx, json2, params);
});
function intersection(left, right) {
  return new ZodIntersection({
    type: "intersection",
    left,
    right
  });
}
const ZodRecord = /* @__PURE__ */ $constructor("ZodRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => recordProcessor(inst, ctx, json2, params);
  inst.keyType = def.keyType;
  inst.valueType = def.valueType;
});
function record(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodRecord({
      type: "record",
      keyType: string(),
      valueType: keyType,
      ...normalizeParams(valueType)
    });
  }
  return new ZodRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
const ZodEnum = /* @__PURE__ */ $constructor("ZodEnum", (inst, def) => {
  $ZodEnum.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => enumProcessor(inst, ctx, json2);
  inst.enum = def.entries;
  inst.options = Object.values(def.entries);
  const keys = new Set(Object.keys(def.entries));
  inst.extract = (values, params) => {
    const newEntries = {};
    for (const value of values) {
      if (keys.has(value)) {
        newEntries[value] = def.entries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
  inst.exclude = (values, params) => {
    const newEntries = { ...def.entries };
    for (const value of values) {
      if (keys.has(value)) {
        delete newEntries[value];
      } else
        throw new Error(`Key ${value} not found in enum`);
    }
    return new ZodEnum({
      ...def,
      checks: [],
      ...normalizeParams(params),
      entries: newEntries
    });
  };
});
function _enum(values, params) {
  const entries = Array.isArray(values) ? Object.fromEntries(values.map((v) => [v, v])) : values;
  return new ZodEnum({
    type: "enum",
    entries,
    ...normalizeParams(params)
  });
}
const ZodLiteral = /* @__PURE__ */ $constructor("ZodLiteral", (inst, def) => {
  $ZodLiteral.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => literalProcessor(inst, ctx, json2);
  inst.values = new Set(def.values);
  Object.defineProperty(inst, "value", {
    get() {
      if (def.values.length > 1) {
        throw new Error("This schema contains multiple valid literal values. Use `.values` instead.");
      }
      return def.values[0];
    }
  });
});
function literal(value, params) {
  return new ZodLiteral({
    type: "literal",
    values: Array.isArray(value) ? value : [value],
    ...normalizeParams(params)
  });
}
const ZodTransform = /* @__PURE__ */ $constructor("ZodTransform", (inst, def) => {
  $ZodTransform.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => transformProcessor(inst, ctx);
  inst._zod.parse = (payload, _ctx) => {
    if (_ctx.direction === "backward") {
      throw new $ZodEncodeError(inst.constructor.name);
    }
    payload.addIssue = (issue$1) => {
      if (typeof issue$1 === "string") {
        payload.issues.push(issue(issue$1, payload.value, def));
      } else {
        const _issue = issue$1;
        if (_issue.fatal)
          _issue.continue = false;
        _issue.code ?? (_issue.code = "custom");
        _issue.input ?? (_issue.input = payload.value);
        _issue.inst ?? (_issue.inst = inst);
        payload.issues.push(issue(_issue));
      }
    };
    const output = def.transform(payload.value, payload);
    if (output instanceof Promise) {
      return output.then((output2) => {
        payload.value = output2;
        payload.fallback = true;
        return payload;
      });
    }
    payload.value = output;
    payload.fallback = true;
    return payload;
  };
});
function transform(fn) {
  return new ZodTransform({
    type: "transform",
    transform: fn
  });
}
const ZodOptional = /* @__PURE__ */ $constructor("ZodOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function optional(innerType) {
  return new ZodOptional({
    type: "optional",
    innerType
  });
}
const ZodExactOptional = /* @__PURE__ */ $constructor("ZodExactOptional", (inst, def) => {
  $ZodExactOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => optionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function exactOptional(innerType) {
  return new ZodExactOptional({
    type: "optional",
    innerType
  });
}
const ZodNullable = /* @__PURE__ */ $constructor("ZodNullable", (inst, def) => {
  $ZodNullable.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nullableProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nullable(innerType) {
  return new ZodNullable({
    type: "nullable",
    innerType
  });
}
const ZodDefault = /* @__PURE__ */ $constructor("ZodDefault", (inst, def) => {
  $ZodDefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => defaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeDefault = inst.unwrap;
});
function _default(innerType, defaultValue) {
  return new ZodDefault({
    type: "default",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodPrefault = /* @__PURE__ */ $constructor("ZodPrefault", (inst, def) => {
  $ZodPrefault.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => prefaultProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function prefault(innerType, defaultValue) {
  return new ZodPrefault({
    type: "prefault",
    innerType,
    get defaultValue() {
      return typeof defaultValue === "function" ? defaultValue() : shallowClone(defaultValue);
    }
  });
}
const ZodNonOptional = /* @__PURE__ */ $constructor("ZodNonOptional", (inst, def) => {
  $ZodNonOptional.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => nonoptionalProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function nonoptional(innerType, params) {
  return new ZodNonOptional({
    type: "nonoptional",
    innerType,
    ...normalizeParams(params)
  });
}
const ZodCatch = /* @__PURE__ */ $constructor("ZodCatch", (inst, def) => {
  $ZodCatch.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => catchProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
  inst.removeCatch = inst.unwrap;
});
function _catch(innerType, catchValue) {
  return new ZodCatch({
    type: "catch",
    innerType,
    catchValue: typeof catchValue === "function" ? catchValue : () => catchValue
  });
}
const ZodPipe = /* @__PURE__ */ $constructor("ZodPipe", (inst, def) => {
  $ZodPipe.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => pipeProcessor(inst, ctx, json2, params);
  inst.in = def.in;
  inst.out = def.out;
});
function pipe(in_, out) {
  return new ZodPipe({
    type: "pipe",
    in: in_,
    out
    // ...util.normalizeParams(params),
  });
}
const ZodReadonly = /* @__PURE__ */ $constructor("ZodReadonly", (inst, def) => {
  $ZodReadonly.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => readonlyProcessor(inst, ctx, json2, params);
  inst.unwrap = () => inst._zod.def.innerType;
});
function readonly(innerType) {
  return new ZodReadonly({
    type: "readonly",
    innerType
  });
}
const ZodCustom = /* @__PURE__ */ $constructor("ZodCustom", (inst, def) => {
  $ZodCustom.init(inst, def);
  ZodType.init(inst, def);
  inst._zod.processJSONSchema = (ctx, json2, params) => customProcessor(inst, ctx);
});
function refine(fn, _params = {}) {
  return /* @__PURE__ */ _refine(ZodCustom, fn, _params);
}
function superRefine(fn, params) {
  return /* @__PURE__ */ _superRefine(fn, params);
}
union([
  string(),
  array(string())
]).describe("Select specific fields to return in the response");
union([
  literal("*"),
  string(),
  array(string()),
  record(string(), any())
]).describe("Specify which relations to populate in the response");
union([
  string(),
  array(string()),
  record(string(), _enum([
    "asc",
    "desc"
  ])),
  array(record(string(), _enum([
    "asc",
    "desc"
  ])))
]).describe("Sort the results by specified fields");
intersection(object({
  withCount: boolean().optional().describe("Include total count in response")
}), union([
  object({
    page: number().int().positive().describe("Page number (1-based)"),
    pageSize: number().int().positive().describe("Number of entries per page")
  }).describe("Page-based pagination"),
  object({
    start: number().int().min(0).describe("Number of entries to skip"),
    limit: number().int().positive().describe("Maximum number of entries to return")
  }).describe("Offset-based pagination")
])).describe("Pagination parameters");
record(string(), any()).describe("Apply filters to the query");
string().describe("Specify the locale for localized content");
_enum([
  "draft",
  "published"
]).describe("Filter by publication status");
string().describe("Search query string");
const config = {
  default: {
    timezone: env("TIRE_TIMEZONE", "Asia/Shanghai"),
    smsProvider: env("SMS_PROVIDER", "queue")
  }
};
const kind$b = "collectionType";
const collectionName$b = "zhao_tire_packages";
const info$b = { "singularName": "tire-package", "pluralName": "tire-packages", "displayName": "寄存套餐" };
const options$b = { "draftAndPublish": false };
const pluginOptions$b = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$b = { "name": { "type": "string", "required": true }, "code": { "type": "uid", "targetField": "name", "required": true }, "baseMonths": { "type": "integer", "default": 6 }, "storePrice": { "type": "integer" }, "pickupPrice": { "type": "integer" }, "extraMonthPrice": { "type": "integer" }, "overdueDayPrice": { "type": "integer" }, "durationText": { "type": "string" }, "highlights": { "type": "json" }, "enabled": { "type": "boolean", "default": true }, "sort": { "type": "integer", "default": 0 } };
const tirePackage = {
  kind: kind$b,
  collectionName: collectionName$b,
  info: info$b,
  options: options$b,
  pluginOptions: pluginOptions$b,
  attributes: attributes$b
};
const kind$a = "collectionType";
const collectionName$a = "zhao_tire_addons";
const info$a = { "singularName": "tire-addon", "pluralName": "tire-addons", "displayName": "增值项" };
const options$a = { "draftAndPublish": false };
const pluginOptions$a = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$a = { "name": { "type": "string", "required": true }, "code": { "type": "uid", "targetField": "name", "required": true }, "price": { "type": "integer" }, "unitText": { "type": "string" }, "enabled": { "type": "boolean", "default": true }, "sort": { "type": "integer", "default": 0 } };
const tireAddon = {
  kind: kind$a,
  collectionName: collectionName$a,
  info: info$a,
  options: options$a,
  pluginOptions: pluginOptions$a,
  attributes: attributes$a
};
const kind$9 = "collectionType";
const collectionName$9 = "zhao_tire_orders";
const info$9 = { "singularName": "tire-order", "pluralName": "tire-orders", "displayName": "寄存订单" };
const options$9 = { "draftAndPublish": false };
const pluginOptions$9 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$9 = { "orderNo": { "type": "string", "required": true, "unique": true }, "clientToken": { "type": "string", "required": true, "unique": true }, "source": { "type": "enumeration", "enum": ["h5"], "default": "h5" }, "customerName": { "type": "string", "required": true }, "phone": { "type": "string", "required": true }, "plateNo": { "type": "string" }, "carType": { "type": "enumeration", "enum": ["sedan", "suv", "pickup"] }, "tireSpec": { "type": "string" }, "withWheelRim": { "type": "boolean", "default": false }, "serviceType": { "type": "enumeration", "enum": ["store", "pickup"], "required": true }, "returnMethod": { "type": "enumeration", "enum": ["pickup_delivery"] }, "pickupDate": { "type": "date" }, "pickupSlot": { "type": "enumeration", "enum": ["morning", "afternoon"] }, "storageStartDate": { "type": "date", "required": true }, "expectedReturnDate": { "type": "date", "required": true }, "expireAt": { "type": "date" }, "months": { "type": "integer" }, "packageSnapshot": { "type": "json" }, "addons": { "type": "json" }, "amountPackage": { "type": "integer", "default": 0 }, "amountAddon": { "type": "integer", "default": 0 }, "amountTotal": { "type": "integer", "default": 0 }, "paymentMethod": { "type": "enumeration", "enum": ["store_pay", "pickup_pay", "wechat", "deposit", "full"], "default": "store_pay" }, "paymentStatus": { "type": "enumeration", "enum": ["unpaid", "deposit_paid", "paid"], "default": "unpaid" }, "paidAmount": { "type": "integer", "default": 0 }, "rewardNo": { "type": "string", "maxLength": 40 }, "rewardAmount": { "type": "integer", "default": 0 }, "redemptionCode": { "type": "string", "maxLength": 16 }, "redemptionCodeUsedAt": { "type": "datetime" }, "status": { "type": "enumeration", "enum": ["pending_accept", "accepted", "stored", "pending_outbound", "completed", "rejected", "canceled"], "default": "pending_accept" }, "outboundRequestStatus": { "type": "enumeration", "enum": ["none", "pending", "approved", "rejected"], "default": "none" }, "outboundRequestedAt": { "type": "datetime" }, "outboundNote": { "type": "text" }, "inboundPhotos": { "type": "media", "multiple": true, "allowedTypes": ["images"] }, "outboundPhotos": { "type": "media", "multiple": true, "allowedTypes": ["images"] }, "locationCode": { "type": "string" }, "inboundAt": { "type": "datetime" }, "outboundAt": { "type": "datetime" }, "storageOperator": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "note": { "type": "text" }, "agreementAcceptedAt": { "type": "datetime" }, "referralCode": { "type": "string", "maxLength": 12 }, "referrerPhone": { "type": "string" }, "wechatOpenid": { "type": "string", "maxLength": 64, "private": true }, "isFree": { "type": "boolean", "default": false }, "freeReason": { "type": "enumeration", "enum": ["referral_3", "manual"] }, "renewals": { "type": "json" }, "timeline": { "type": "json" } };
const tireOrder = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  pluginOptions: pluginOptions$9,
  attributes: attributes$9
};
const kind$8 = "collectionType";
const collectionName$8 = "zhao_tire_sms_logs";
const info$8 = { "singularName": "tire-sms-log", "pluralName": "tire-sms-logs", "displayName": "短信通知" };
const options$8 = { "draftAndPublish": false };
const pluginOptions$8 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$8 = { "order": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-tire.tire-order" }, "type": { "type": "enumeration", "enum": ["order_created", "accepted", "inbound", "due_7", "due_3", "outbound_done", "manual"] }, "phone": { "type": "string" }, "content": { "type": "text" }, "status": { "type": "enumeration", "enum": ["pending", "sent", "skipped"], "default": "pending" }, "sentAt": { "type": "datetime" }, "operator": { "type": "relation", "relation": "manyToOne", "target": "admin::user" } };
const tireSmsLog = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  pluginOptions: pluginOptions$8,
  attributes: attributes$8
};
const kind$7 = "collectionType";
const collectionName$7 = "zhao_tire_faqs";
const info$7 = { "singularName": "tire-faq", "pluralName": "tire-faqs", "displayName": "常见问答" };
const options$7 = { "draftAndPublish": false };
const pluginOptions$7 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$7 = { "question": { "type": "text", "required": true }, "answer": { "type": "text", "required": true }, "sort": { "type": "integer", "default": 0 }, "enabled": { "type": "boolean", "default": true } };
const tireFaq = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  pluginOptions: pluginOptions$7,
  attributes: attributes$7
};
const kind$6 = "collectionType";
const collectionName$6 = "zhao_tire_reviews";
const info$6 = { "singularName": "tire-review", "pluralName": "tire-reviews", "displayName": "用户评价" };
const options$6 = { "draftAndPublish": false };
const pluginOptions$6 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$6 = { "nickname": { "type": "string" }, "content": { "type": "text" }, "rating": { "type": "integer" }, "showOnHome": { "type": "boolean", "default": false }, "sort": { "type": "integer", "default": 0 } };
const tireReview = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  pluginOptions: pluginOptions$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "zhao_tire_galleries";
const info$5 = { "singularName": "tire-gallery", "pluralName": "tire-galleries", "displayName": "实拍相册" };
const options$5 = { "draftAndPublish": false };
const pluginOptions$5 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$5 = { "image": { "type": "media", "multiple": false, "allowedTypes": ["images"] }, "caption": { "type": "string" }, "sort": { "type": "integer", "default": 0 } };
const tireGallery = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  pluginOptions: pluginOptions$5,
  attributes: attributes$5
};
const kind$4 = "singleType";
const collectionName$4 = "zhao_tire_config";
const info$4 = { "singularName": "tire-config", "pluralName": "tire-configs", "displayName": "站点配置" };
const options$4 = { "draftAndPublish": false };
const pluginOptions$4 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$4 = { "bannerTitle": { "type": "string" }, "bannerSubtitle": { "type": "string" }, "bannerImage": { "type": "media", "multiple": false, "allowedTypes": ["images"] }, "serviceIntro": { "type": "richtext" }, "warehouseConditions": { "type": "text" }, "guarantees": { "type": "json" }, "serviceAreaText": { "type": "text" }, "warehouseAddress": { "type": "string" }, "warehouseLat": { "type": "float" }, "warehouseLng": { "type": "float" }, "mapUrl": { "type": "string" }, "contactPhone": { "type": "string" }, "wechatQr": { "type": "media", "multiple": false, "allowedTypes": ["images"] }, "dailyPickupLimitMorning": { "type": "integer", "default": 6 }, "dailyPickupLimitAfternoon": { "type": "integer", "default": 6 }, "paymentOnlineEnabled": { "type": "boolean", "default": false }, "depositEnabled": { "type": "boolean", "default": false }, "depositRatio": { "type": "integer", "default": 30 }, "referralRewardCap": { "type": "integer", "default": 6900 }, "referralRewardValidDays": { "type": "integer", "default": 365 }, "referralRewardYearLimit": { "type": "integer", "default": 4 }, "referralDailyBindLimit": { "type": "integer", "default": 5 }, "redemptionCodeEnabled": { "type": "boolean", "default": true }, "agreementText": { "type": "richtext" }, "maxStorageDate": { "type": "date" }, "announcement": { "type": "string" }, "smsTemplateOverride": { "type": "json" } };
const tireConfig = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  pluginOptions: pluginOptions$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "zhao_tire_referral_codes";
const info$3 = { "singularName": "tire-referral-code", "pluralName": "tire-referral-codes", "displayName": "邀请码" };
const options$3 = { "draftAndPublish": false };
const pluginOptions$3 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$3 = { "code": { "type": "string", "required": true, "unique": true, "maxLength": 12 }, "phone": { "type": "string", "required": true, "unique": true }, "nickname": { "type": "string", "maxLength": 64 }, "usedCount": { "type": "integer", "default": 0 }, "completedCount": { "type": "integer", "default": 0 }, "pendingFreeCount": { "type": "integer", "default": 0 }, "totalFreeCount": { "type": "integer", "default": 0 }, "debtCount": { "type": "integer", "default": 0 } };
const tireReferralCode = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  pluginOptions: pluginOptions$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "zhao_tire_payments";
const info$2 = { "singularName": "tire-payment", "pluralName": "tire-payments", "displayName": "支付流水" };
const options$2 = { "draftAndPublish": false };
const pluginOptions$2 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$2 = { "paymentNo": { "type": "string", "required": true, "unique": true, "maxLength": 40 }, "orderNo": { "type": "string", "required": true, "maxLength": 40 }, "orderId": { "type": "integer" }, "channel": { "type": "enumeration", "enum": ["wechat", "store_pay", "pickup_pay", "deposit", "full", "mock"], "default": "store_pay" }, "amount": { "type": "integer", "required": true }, "status": { "type": "enumeration", "enum": ["pending", "paid", "failed", "canceled", "refunded"], "default": "pending" }, "externalNo": { "type": "string", "maxLength": 64 }, "idempotencyKey": { "type": "string", "required": true, "unique": true, "maxLength": 128 }, "provider": { "type": "string", "maxLength": 32 }, "payerOpenid": { "type": "string", "maxLength": 64, "private": true }, "operator": { "type": "relation", "relation": "manyToOne", "target": "admin::user" }, "operatorName": { "type": "string", "maxLength": 64 }, "paidAt": { "type": "datetime" }, "note": { "type": "text" }, "raw": { "type": "json" }, "refundedAmount": { "type": "integer", "default": 0 }, "refundNote": { "type": "text" } };
const tirePayment = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  pluginOptions: pluginOptions$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "zhao_tire_share_records";
const info$1 = { "singularName": "tire-share-record", "pluralName": "tire-share-records", "displayName": "分享邀请记录" };
const options$1 = { "draftAndPublish": false };
const pluginOptions$1 = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes$1 = { "shareCode": { "type": "string", "required": true, "maxLength": 12 }, "referrerPhone": { "type": "string", "required": true }, "inviteePhone": { "type": "string" }, "inviteeOpenid": { "type": "string", "maxLength": 128 }, "deviceId": { "type": "string", "maxLength": 128 }, "ip": { "type": "string", "maxLength": 64 }, "orderNo": { "type": "string", "maxLength": 40 }, "orderId": { "type": "integer" }, "status": { "type": "enumeration", "enum": ["bound", "valid", "pending_review", "invalid", "rolled_back"], "default": "bound" }, "dedupeKey": { "type": "string", "required": true, "unique": true, "maxLength": 160 }, "riskReason": { "type": "string", "maxLength": 255 }, "boundAt": { "type": "datetime" }, "validAt": { "type": "datetime" } };
const tireShareRecord = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  pluginOptions: pluginOptions$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "zhao_tire_referral_rewards";
const info = { "singularName": "tire-referral-reward", "pluralName": "tire-referral-rewards", "displayName": "邀请奖励券" };
const options = { "draftAndPublish": false };
const pluginOptions = { "content-manager": { "visible": true }, "content-type-builder": { "visible": false } };
const attributes = { "rewardNo": { "type": "string", "required": true, "unique": true, "maxLength": 40 }, "phone": { "type": "string", "required": true }, "amount": { "type": "integer", "default": 0 }, "source": { "type": "enumeration", "enum": ["referral_3", "manual", "debt"], "default": "referral_3" }, "status": { "type": "enumeration", "enum": ["available", "reserved", "used", "expired", "void"], "default": "available" }, "issuedAt": { "type": "datetime" }, "expiresAt": { "type": "datetime" }, "usedOrderNo": { "type": "string", "maxLength": 40 }, "usedAt": { "type": "datetime" }, "note": { "type": "string", "maxLength": 255 } };
const tireReferralReward = {
  kind,
  collectionName,
  info,
  options,
  pluginOptions,
  attributes
};
const contentTypes = {
  "tire-package": { schema: tirePackage },
  "tire-addon": { schema: tireAddon },
  "tire-order": { schema: tireOrder },
  "tire-sms-log": { schema: tireSmsLog },
  "tire-faq": { schema: tireFaq },
  "tire-review": { schema: tireReview },
  "tire-gallery": { schema: tireGallery },
  "tire-config": { schema: tireConfig },
  "tire-referral-code": { schema: tireReferralCode },
  "tire-payment": { schema: tirePayment },
  "tire-share-record": { schema: tireShareRecord },
  "tire-referral-reward": { schema: tireReferralReward }
};
const createError = (code, status, message, details) => {
  const error2 = new Error(message);
  error2.code = code;
  error2.status = status;
  if (details !== void 0) error2.details = details;
  return error2;
};
const sendError = (ctx, error2) => {
  const status = Number(error2?.status) || 500;
  if (status >= 500) {
    try {
      strapi.log.error(`[zhao-tire] ${error2?.stack || error2}`);
    } catch {
    }
  }
  ctx.status = status;
  ctx.body = {
    code: error2?.code || "INTERNAL_ERROR",
    message: error2?.message || "服务异常",
    ...error2?.details !== void 0 ? { details: error2.details } : {}
  };
};
const site$1 = {
  async get(ctx) {
    try {
      ctx.body = await strapi.plugin("zhao-tire").service("site").get();
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const calcPrice = ({ serviceType, months, packageDoc, addons }) => {
  const base = serviceType === "store" ? Number(packageDoc.storePrice) || 0 : Number(packageDoc.pickupPrice) || 0;
  const baseMonths = Number(packageDoc.baseMonths) || 0;
  const extraMonths = Math.max(0, Number(months || 0) - baseMonths);
  const amountPackage = base + extraMonths * (Number(packageDoc.extraMonthPrice) || 0);
  const amountAddon = (addons || []).reduce(
    (sum, addon) => sum + (Number(addon?.price) || 0),
    0
  );
  return { amountPackage, amountAddon, amountTotal: amountPackage + amountAddon };
};
const pricing = () => ({ calcPrice });
const ORDER_UID$a = "plugin::zhao-tire.tire-order";
const PACKAGE_UID$2 = "plugin::zhao-tire.tire-package";
const ADDON_UID$1 = "plugin::zhao-tire.tire-addon";
const CONFIG_UID$6 = "plugin::zhao-tire.tire-config";
const TIMEZONE$1 = "Asia/Shanghai";
const DEFAULT_MAX_STORAGE_DATE = "2027-05-01";
const MAX_ORDER_NO_ATTEMPTS = 3;
const PHONE_PATTERN$2 = /^1[3-9]\d{9}$/;
const RENEWABLE_STATUS = ["stored", "pending_outbound"];
const generateRedemptionCode = async (strapi2) => {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const code = String(Math.floor(1e5 + Math.random() * 9e5));
    const exists = await strapi2.db.query(ORDER_UID$a).findOne({
      where: { redemptionCode: code }
    });
    if (!exists) return code;
  }
  throw createError("INTERNAL_ERROR", 500, "核销码生成失败，请重试");
};
const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE$1,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const pad2 = (value) => String(value).padStart(2, "0");
const todayDateString = () => {
  const parts = DATE_FORMATTER.formatToParts(/* @__PURE__ */ new Date());
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  return `${get("year")}-${get("month")}-${get("day")}`;
};
const normalizeDate = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const probe = new Date(Date.UTC(year, month - 1, day));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) {
    return null;
  }
  return `${match[1]}-${match[2]}-${match[3]}`;
};
const addMonths = (date2, months) => {
  const [year, month, day] = date2.split("-").map(Number);
  const targetIndex = month - 1 + months;
  const targetYear = year + Math.floor(targetIndex / 12);
  const targetMonth = (targetIndex % 12 + 12) % 12;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const targetDay = Math.min(day, lastDay);
  return `${targetYear}-${pad2(targetMonth + 1)}-${pad2(targetDay)}`;
};
const monthsBetween = (start, end) => {
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = end.split("-").map(Number);
  let months = (ey - sy) * 12 + (em - sm);
  if (ed > sd) months += 1;
  return Math.max(1, months);
};
const maskPhone = (phone) => {
  const text = String(phone || "");
  if (!text) return "";
  if (text.length >= 7) {
    const head = text.slice(0, 3);
    const tail = text.slice(-4);
    return `${head}****${tail}`;
  }
  return text.replace(/./g, "*");
};
const daysDiff = (from, to) => {
  const fromDate = Date.parse(`${from}T00:00:00Z`);
  const toDate2 = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(fromDate) || Number.isNaN(toDate2)) return 0;
  return Math.round((toDate2 - fromDate) / 864e5);
};
const toDateOnly$2 = (value) => {
  if (!value) return "";
  const text = String(value);
  return text.slice(0, 10);
};
const compact = (data) => {
  const result = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) result[key] = value;
  }
  return result;
};
const isUniqueViolation = (error2) => {
  const text = `${error2?.code || ""} ${error2?.message || ""} ${error2?.details || ""}`.toLowerCase();
  return error2?.code === "23505" || text.includes("unique") || text.includes("duplicate");
};
const appendTimeline = (order2, event, detail, operatorId2) => [
  ...order2.timeline || [],
  {
    at: (/* @__PURE__ */ new Date()).toISOString(),
    event,
    ...operatorId2 ? { operatorId: operatorId2 } : {},
    ...detail ? { detail } : {}
  }
];
const getConfig = async (strapi2) => {
  return await strapi2.documents(CONFIG_UID$6).findFirst({}) || {};
};
const findOrder = async (strapi2, orderNo2, populate2) => {
  if (!orderNo2) return null;
  return strapi2.db.query(ORDER_UID$a).findOne({
    where: { orderNo: String(orderNo2) },
    ...populate2 ? { populate: populate2 } : {}
  });
};
const requireOrder = async (strapi2, orderNo2, populate2) => {
  const order2 = await findOrder(strapi2, orderNo2, populate2);
  if (!order2) {
    throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
  }
  return order2;
};
const assertStatus = (order2, allowed, message) => {
  if (!allowed.includes(order2.status)) {
    throw createError("STATE_INVALID", 400, message);
  }
};
const photoIds = (photos) => {
  if (!Array.isArray(photos)) return [];
  return photos.map(
    (photo) => typeof photo === "number" ? photo : Number(photo?.id)
  ).filter((id) => Number.isInteger(id) && id > 0);
};
const notFoundPackage = () => createError("VALIDATION_FAILED", 400, "暂无可用的寄存套餐");
const notifySafely = async (strapi2, type, order2, extra) => {
  try {
    const notify2 = strapi2.plugin("zhao-tire").service("notify");
    if (notify2 && typeof notify2.enqueue === "function") {
      await notify2.enqueue(type, order2, extra);
    }
  } catch (error2) {
    strapi2.log.warn(`[zhao-tire] ${type} notify skipped: ${error2}`);
  }
};
const dayStartIso$1 = (value) => {
  const date2 = normalizeDate(value);
  if (!date2) return null;
  return (/* @__PURE__ */ new Date(`${date2}T00:00:00+08:00`)).toISOString();
};
const dayEndIso = (value) => {
  const date2 = normalizeDate(value);
  if (!date2) return null;
  return (/* @__PURE__ */ new Date(`${date2}T23:59:59.999+08:00`)).toISOString();
};
const buildOrderWhere = (query = {}) => {
  const where = {};
  const rawStatus = query?.status;
  if (rawStatus) {
    if (Array.isArray(rawStatus)) {
      where.status = { $in: rawStatus.map((item) => String(item)) };
    } else if (String(rawStatus).includes(",")) {
      where.status = {
        $in: String(rawStatus).split(",").map((item) => item.trim()).filter(Boolean)
      };
    } else {
      where.status = String(rawStatus);
    }
  }
  const serviceType = String(query?.serviceType || "").trim();
  if (["store", "pickup"].includes(serviceType)) {
    where.serviceType = serviceType;
  }
  const keyword = String(query?.keyword || "").trim();
  if (keyword) {
    where.$or = [
      { orderNo: { $containsi: keyword } },
      { phone: { $containsi: keyword } },
      { plateNo: { $containsi: keyword } },
      { customerName: { $containsi: keyword } }
    ];
  }
  const from = dayStartIso$1(query?.dateFrom);
  const to = dayEndIso(query?.dateTo);
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.$gte = from;
    if (to) where.createdAt.$lte = to;
  }
  return where;
};
const order$1 = ({ strapi: strapi2 }) => ({
  async create(input) {
    const payload = input || {};
    const clientToken = String(payload.clientToken || "").trim();
    const customerName = String(payload.customerName || "").trim();
    const phone = String(payload.phone || "").trim();
    const carType = String(payload.carType || "").trim();
    const serviceType = String(payload.serviceType || "").trim();
    if (!clientToken) {
      throw createError("VALIDATION_FAILED", 400, "缺少提交令牌 clientToken");
    }
    if (!customerName) {
      throw createError("VALIDATION_FAILED", 400, "请填写姓名");
    }
    if (!PHONE_PATTERN$2.test(phone)) {
      throw createError("VALIDATION_FAILED", 400, "请填写正确的手机号");
    }
    if (!["sedan", "suv", "pickup"].includes(carType)) {
      throw createError("VALIDATION_FAILED", 400, "请选择车型");
    }
    if (!["store", "pickup"].includes(serviceType)) {
      throw createError("VALIDATION_FAILED", 400, "请选择服务类型");
    }
    if (payload.agreementAccepted !== true) {
      throw createError("VALIDATION_FAILED", 400, "请先阅读并同意寄存协议");
    }
    const storageStartDate = normalizeDate(payload.storageStartDate);
    if (!storageStartDate) {
      throw createError("VALIDATION_FAILED", 400, "寄存开始日期不合法");
    }
    const expectedReturnDate = normalizeDate(payload.expectedReturnDate);
    if (!expectedReturnDate) {
      throw createError("VALIDATION_FAILED", 400, "预估取回日期不合法");
    }
    const today = todayDateString();
    if (storageStartDate < today) {
      throw createError("VALIDATION_FAILED", 400, "寄存开始日期不能早于今天");
    }
    const config2 = await getConfig(strapi2);
    const maxStorageDate = normalizeDate(config2.maxStorageDate) || DEFAULT_MAX_STORAGE_DATE;
    if (expectedReturnDate <= storageStartDate) {
      throw createError(
        "VALIDATION_FAILED",
        400,
        "预估取回日期必须晚于寄存开始日期"
      );
    }
    if (expectedReturnDate > maxStorageDate) {
      throw createError(
        "VALIDATION_FAILED",
        400,
        `预估取回日期不能晚于 ${maxStorageDate}`
      );
    }
    let pickupDate = null;
    let pickupSlot = null;
    if (serviceType === "pickup") {
      pickupDate = normalizeDate(payload.pickupDate);
      pickupSlot = String(payload.pickupSlot || "").trim() || null;
      if (!pickupDate) {
        throw createError("VALIDATION_FAILED", 400, "请选择上门取胎日期");
      }
      if (pickupDate < storageStartDate) {
        throw createError(
          "VALIDATION_FAILED",
          400,
          "上门日期不能早于寄存开始日期"
        );
      }
      if (!pickupSlot || !["morning", "afternoon"].includes(pickupSlot)) {
        throw createError("VALIDATION_FAILED", 400, "请选择上门时段");
      }
    }
    const existing = await strapi2.db.query(ORDER_UID$a).findOne({
      where: { clientToken }
    });
    if (existing) {
      return {
        orderNo: existing.orderNo,
        amountTotal: existing.amountTotal,
        status: existing.status,
        duplicated: true
      };
    }
    if (serviceType === "pickup") {
      const slotService = strapi2.plugin("zhao-tire").service("slot");
      await slotService.assertAvailable(pickupDate, pickupSlot);
    }
    const addonCodes = Array.isArray(payload.addonCodes) ? payload.addonCodes.map((code) => String(code)).filter(Boolean) : [];
    let addonDocs = [];
    if (addonCodes.length > 0) {
      addonDocs = await strapi2.db.query(ADDON_UID$1).findMany({
        where: { code: { $in: addonCodes }, enabled: true }
      });
      const foundCodes = new Set(addonDocs.map((doc) => doc.code));
      if (foundCodes.size !== new Set(addonCodes).size || !addonCodes.every((code) => foundCodes.has(code))) {
        throw createError("VALIDATION_FAILED", 400, "所选增值项不可用");
      }
    }
    const packages = await strapi2.db.query(PACKAGE_UID$2).findMany({
      where: { enabled: true },
      orderBy: { sort: "ASC" }
    });
    const priceField = serviceType === "store" ? "storePrice" : "pickupPrice";
    const packageDoc = packages.find((item) => item[priceField] != null) || packages[0];
    if (!packageDoc) throw notFoundPackage();
    const months = monthsBetween(storageStartDate, expectedReturnDate);
    const addons = addonDocs.map((doc) => ({
      code: doc.code,
      name: doc.name,
      price: Number(doc.price) || 0,
      unitText: doc.unitText || ""
    }));
    const { amountPackage, amountAddon, amountTotal } = calcPrice({
      serviceType,
      months,
      packageDoc: {
        baseMonths: Number(packageDoc.baseMonths) || 0,
        storePrice: Number(packageDoc.storePrice) || 0,
        pickupPrice: Number(packageDoc.pickupPrice) || 0,
        extraMonthPrice: Number(packageDoc.extraMonthPrice) || 0
      },
      addons
    });
    const paymentMethods = ["wechat", "store_pay", "pickup_pay", "deposit", "full"];
    const paymentMethod = paymentMethods.includes(String(payload.paymentMethod)) ? String(payload.paymentMethod) : serviceType === "pickup" ? "pickup_pay" : "store_pay";
    const referralService = strapi2.plugin("zhao-tire").service("referral");
    let rewardInfo = null;
    let finalAmountPackage = amountPackage;
    let isFree = false;
    let freeReason = void 0;
    if (payload.useFreeReward === true) {
      rewardInfo = await referralService.reserveReward(phone, amountPackage);
      if (rewardInfo) {
        finalAmountPackage = Math.max(0, amountPackage - rewardInfo.discount);
        isFree = finalAmountPackage + amountAddon <= 0;
        freeReason = "referral_3";
      }
    }
    const finalAmountTotal = finalAmountPackage + amountAddon;
    const referralCode = String(payload.referralCode || "").trim().toUpperCase();
    let referrerPhone = void 0;
    if (referralCode) {
      const rc = await referralService.validate(referralCode);
      if (rc.phone === phone) {
        throw createError("VALIDATION_FAILED", 400, "不能使用自己的邀请码");
      }
      referrerPhone = rc.phone;
    }
    const packageSnapshot = {
      id: packageDoc.id,
      name: packageDoc.name,
      code: packageDoc.code,
      baseMonths: Number(packageDoc.baseMonths) || 0,
      storePrice: Number(packageDoc.storePrice) || 0,
      pickupPrice: Number(packageDoc.pickupPrice) || 0,
      extraMonthPrice: Number(packageDoc.extraMonthPrice) || 0,
      overdueDayPrice: Number(packageDoc.overdueDayPrice) || 0,
      durationText: packageDoc.durationText || ""
    };
    const expireAt = expectedReturnDate;
    const now = (/* @__PURE__ */ new Date()).toISOString();
    const timelineEvents = [
      {
        at: now,
        event: "created",
        detail: `订单已提交（${serviceType === "store" ? "到店送存" : "上门取送"}）`
      }
    ];
    if (rewardInfo) {
      timelineEvents.push({
        at: now,
        event: "free_applied",
        detail: `邀请奖励抵扣基础套餐费 ${rewardInfo.discount} 分（券 ${rewardInfo.rewardNo}）`
      });
    } else if (isFree) {
      timelineEvents.push({
        at: now,
        event: "free_applied",
        detail: "免单生效"
      });
    }
    if (referralCode) {
      timelineEvents.push({
        at: now,
        event: "referral_applied",
        detail: `使用邀请码 ${referralCode}`
      });
    }
    const baseData = compact({
      clientToken,
      source: "h5",
      customerName,
      phone,
      plateNo: String(payload.plateNo || "").trim() || void 0,
      carType,
      tireSpec: String(payload.tireSpec || "").trim() || void 0,
      withWheelRim: Boolean(payload.withWheelRim),
      serviceType,
      returnMethod: serviceType === "pickup" ? "pickup_delivery" : void 0,
      pickupDate: pickupDate || void 0,
      pickupSlot: pickupSlot || void 0,
      storageStartDate,
      expectedReturnDate,
      expireAt,
      months,
      packageSnapshot,
      addons,
      amountPackage: finalAmountPackage,
      amountAddon,
      amountTotal: finalAmountTotal,
      paymentMethod: isFree ? "full" : paymentMethod,
      paymentStatus: isFree ? "paid" : "unpaid",
      paidAmount: isFree ? finalAmountTotal : 0,
      rewardNo: rewardInfo?.rewardNo || void 0,
      rewardAmount: rewardInfo?.discount || 0,
      status: "pending_accept",
      outboundRequestStatus: "none",
      note: String(payload.note || "").trim() || void 0,
      agreementAcceptedAt: now,
      referralCode: referralCode || void 0,
      referrerPhone,
      isFree,
      freeReason,
      renewals: [],
      timeline: timelineEvents
    });
    const orderNoService = strapi2.plugin("zhao-tire").service("order-no");
    let created = null;
    let lastError = null;
    for (let attempt = 0; attempt < MAX_ORDER_NO_ATTEMPTS; attempt += 1) {
      const orderNo2 = await orderNoService.generate();
      try {
        created = await strapi2.db.query(ORDER_UID$a).create({
          data: { ...baseData, orderNo: orderNo2 }
        });
        break;
      } catch (error2) {
        lastError = error2;
        const duplicated = await strapi2.db.query(ORDER_UID$a).findOne({
          where: { clientToken }
        });
        if (duplicated) {
          if (rewardInfo?.rewardNo) {
            await referralService.releaseReward(rewardInfo.rewardNo);
          }
          return {
            orderNo: duplicated.orderNo,
            amountTotal: duplicated.amountTotal,
            status: duplicated.status,
            duplicated: true
          };
        }
        if (isUniqueViolation(error2) && attempt < MAX_ORDER_NO_ATTEMPTS - 1) {
          continue;
        }
        if (isUniqueViolation(error2)) {
          throw createError(
            "DUPLICATE_REQUEST",
            409,
            "订单号生成冲突，请重试"
          );
        }
        throw error2;
      }
    }
    if (!created) {
      throw lastError || createError("DUPLICATE_REQUEST", 409, "订单创建失败");
    }
    if (rewardInfo?.rewardNo) {
      const bound = await referralService.bindReward(rewardInfo.rewardNo, created.orderNo);
      if (!bound) {
        strapi2.log.warn(
          `[zhao-tire] reward ${rewardInfo.rewardNo} 绑定订单 ${created.orderNo} 失败`
        );
      }
    }
    if (referralCode) {
      try {
        await referralService.attachReferral(created, referralCode, {
          openid: payload.openid,
          deviceId: payload.deviceId,
          ip: payload.ip
        });
      } catch (error2) {
        strapi2.log.warn(`[zhao-tire] attachReferral skipped: ${error2}`);
      }
    }
    await notifySafely(strapi2, "order_created", created);
    return {
      orderNo: created.orderNo,
      amountTotal: created.amountTotal,
      status: created.status,
      isFree: created.isFree,
      freeReason: created.freeReason || null,
      referralCode: created.referralCode || null,
      paymentMethod: created.paymentMethod,
      rewardNo: created.rewardNo || null,
      rewardAmount: Number(created.rewardAmount) || 0
    };
  },
  async detail(orderNo2, phone) {
    const order2 = await requireOrder(strapi2, orderNo2, {
      inboundPhotos: true
    });
    if (!phone || String(phone).trim() !== order2.phone) {
      throw createError("PHONE_MISMATCH", 403, "手机号与订单不匹配");
    }
    const snapshot = order2.packageSnapshot || {};
    const expireAt = toDateOnly$2(order2.expireAt) || toDateOnly$2(order2.expectedReturnDate);
    const today = todayDateString();
    const diff = expireAt ? daysDiff(today, expireAt) : 0;
    const remainingDays2 = Math.max(0, diff);
    const overdueDays = Math.max(0, -diff);
    const overdueDayPrice = Number(snapshot.overdueDayPrice) || 0;
    const inboundPhotos = (order2.inboundPhotos || []).map((file) => ({
      id: file.id,
      name: file.name,
      url: file.url,
      width: file.width,
      height: file.height
    }));
    const canRenew = RENEWABLE_STATUS.includes(order2.status);
    const canRequestOutbound = order2.status === "stored" && (order2.outboundRequestStatus || "none") === "none";
    return {
      orderNo: order2.orderNo,
      status: order2.status,
      customerName: order2.customerName,
      phone: maskPhone(order2.phone),
      plateNo: order2.plateNo || "",
      carType: order2.carType,
      tireSpec: order2.tireSpec || "",
      withWheelRim: Boolean(order2.withWheelRim),
      serviceType: order2.serviceType,
      returnMethod: order2.returnMethod || null,
      pickupDate: toDateOnly$2(order2.pickupDate) || null,
      pickupSlot: order2.pickupSlot || null,
      storageStartDate: toDateOnly$2(order2.storageStartDate),
      expectedReturnDate: toDateOnly$2(order2.expectedReturnDate),
      expireAt,
      months: Number(order2.months) || 0,
      packageSnapshot: snapshot,
      addons: order2.addons || [],
      amountPackage: Number(order2.amountPackage) || 0,
      amountAddon: Number(order2.amountAddon) || 0,
      amountTotal: Number(order2.amountTotal) || 0,
      paymentMethod: order2.paymentMethod,
      paymentStatus: order2.paymentStatus,
      paidAmount: Number(order2.paidAmount) || 0,
      outstandingAmount: Math.max(
        0,
        (Number(order2.amountTotal) || 0) - (Number(order2.paidAmount) || 0)
      ),
      canPayOnline: order2.paymentStatus !== "paid" && order2.paymentMethod === "wechat" && order2.status !== "canceled" && order2.status !== "rejected",
      rewardNo: order2.rewardNo || null,
      rewardAmount: Number(order2.rewardAmount) || 0,
      redemptionCode: order2.status === "stored" || order2.status === "pending_outbound" ? order2.redemptionCode || null : null,
      redemptionCodeUsedAt: order2.redemptionCodeUsedAt || null,
      referralCode: order2.referralCode || null,
      referrerPhone: order2.referrerPhone ? maskPhone(order2.referrerPhone) : null,
      isFree: Boolean(order2.isFree),
      freeReason: order2.freeReason || null,
      outboundRequestStatus: order2.outboundRequestStatus || "none",
      outboundRequestedAt: order2.outboundRequestedAt || null,
      outboundNote: order2.outboundNote || "",
      note: order2.note || "",
      renewals: order2.renewals || [],
      timeline: order2.timeline || [],
      locationCode: order2.locationCode || "",
      inboundAt: order2.inboundAt || null,
      inboundPhotos,
      remainingDays: remainingDays2,
      overdueDays,
      overdueFeeEstimate: overdueDays * overdueDayPrice,
      canRenew,
      canRequestOutbound,
      createdAt: order2.createdAt
    };
  },
  async renew(orderNo2, months, paymentMethod) {
    const order2 = await requireOrder(strapi2, orderNo2);
    const extendMonths = Number(months);
    if (!Number.isInteger(extendMonths) || extendMonths < 1) {
      throw createError("VALIDATION_FAILED", 400, "续费月数不合法");
    }
    assertStatus(order2, RENEWABLE_STATUS, "当前订单状态不可续费");
    const snapshot = order2.packageSnapshot || {};
    const basePrice = order2.serviceType === "store" ? snapshot.storePrice : snapshot.pickupPrice;
    const baseMonths = Number(snapshot.baseMonths) || Number(order2.months) || 6;
    const unitPrice = Number(snapshot.extraMonthPrice) || Math.round((Number(basePrice) || 0) / baseMonths);
    const amount = unitPrice * extendMonths;
    const fromDate = toDateOnly$2(order2.expireAt) || toDateOnly$2(order2.expectedReturnDate) || todayDateString();
    const newExpireAt = addMonths(fromDate, extendMonths);
    const renewals = [
      ...order2.renewals || [],
      {
        months: extendMonths,
        amount,
        paymentMethod: paymentMethod || "store_pay",
        paidAt: null,
        newExpireAt,
        operatorId: null
      }
    ];
    const timeline = appendTimeline(
      order2,
      "renewed",
      `续费 ${extendMonths} 个月，应付 ${amount} 分`
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: { expireAt: newExpireAt, renewals, timeline }
    });
    await notifySafely(strapi2, "manual", { ...order2, expireAt: newExpireAt }, {
      content: `{name}您好，订单 {orderNo} 已续费 ${extendMonths} 个月，新的到期日为 {expireAt}。`
    });
    return {
      orderNo: order2.orderNo,
      months: extendMonths,
      amount,
      previousExpireAt: fromDate,
      expireAt: newExpireAt
    };
  },
  async requestOutbound(orderNo2, note) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["stored"], "当前订单状态不可申请出库");
    if ((order2.outboundRequestStatus || "none") !== "none") {
      throw createError("STATE_INVALID", 400, "出库申请已提交，请等待审核");
    }
    const outboundRequestedAt = (/* @__PURE__ */ new Date()).toISOString();
    const outboundNote = String(note || "").trim();
    const timeline = appendTimeline(
      order2,
      "outbound_requested",
      outboundNote ? `出库申请：${outboundNote}` : "出库申请"
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: {
        outboundRequestStatus: "pending",
        outboundRequestedAt,
        outboundNote,
        timeline
      }
    });
    return {
      orderNo: order2.orderNo,
      outboundRequestStatus: "pending",
      outboundRequestedAt
    };
  },
  async accept(orderNo2, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["pending_accept"], "当前订单状态不可接单");
    const timeline = appendTimeline(
      order2,
      "accepted",
      "商家已接单",
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: { status: "accepted", timeline }
    });
    await notifySafely(strapi2, "accepted", { ...order2, status: "accepted" });
    return { orderNo: order2.orderNo, status: "accepted" };
  },
  async reject(orderNo2, reason, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["pending_accept"], "当前订单状态不可拒绝");
    const timeline = appendTimeline(
      order2,
      "rejected",
      reason ? `拒绝原因：${reason}` : "商家已拒绝",
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: { status: "rejected", timeline }
    });
    return { orderNo: order2.orderNo, status: "rejected" };
  },
  async cancel(orderNo2, reason, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["pending_accept"], "当前订单状态不可取消");
    const timeline = appendTimeline(
      order2,
      "canceled",
      reason ? `取消原因：${reason}` : "订单已取消",
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: { status: "canceled", timeline }
    });
    return { orderNo: order2.orderNo, status: "canceled" };
  },
  async inbound(orderNo2, payload = {}) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["accepted"], "当前订单状态不可入库");
    const locationCode = String(payload.locationCode || "").trim();
    if (!locationCode) {
      throw createError("VALIDATION_FAILED", 400, "请填写仓位编号");
    }
    const ids = photoIds(payload.photos);
    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请至少上传一张入库照片");
    }
    const inboundAt = (/* @__PURE__ */ new Date()).toISOString();
    const config2 = await getConfig(strapi2);
    const redemptionCode = config2.redemptionCodeEnabled === false ? void 0 : await generateRedemptionCode(strapi2);
    const timeline = appendTimeline(
      order2,
      "inbound",
      `入库完成，仓位 ${locationCode}`,
      payload.operatorId
    );
    const data = compact({
      status: "stored",
      inboundAt,
      locationCode,
      redemptionCode,
      inboundPhotos: ids.map((id) => ({ id })),
      storageOperator: payload.operatorId ? { id: payload.operatorId } : void 0,
      timeline
    });
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data
    });
    try {
      const referralService = strapi2.plugin("zhao-tire").service("referral");
      const result = await referralService.markValidOnInbound(orderNo2);
      if (result?.rewarded) {
        strapi2.log.info(
          `[zhao-tire] referral milestone: ${result.referrerPhone} 满 3 个有效邀请，已发放奖励 ${result.reward?.reward?.rewardNo || ""}`
        );
      }
    } catch (error2) {
      strapi2.log.warn(`[zhao-tire] markValidOnInbound skipped: ${error2}`);
    }
    await notifySafely(strapi2, "inbound", {
      ...order2,
      status: "stored",
      locationCode
    });
    return {
      orderNo: order2.orderNo,
      status: "stored",
      inboundAt,
      locationCode,
      redemptionCode: redemptionCode || null
    };
  },
  async outbound(orderNo2, payload = {}) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["pending_outbound"], "当前订单状态不可出库");
    if (order2.redemptionCodeUsedAt) {
      throw createError("STATE_INVALID", 400, "该订单已核销出库，请勿重复操作");
    }
    const total = Number(order2.amountTotal) || 0;
    const paid = Number(order2.paidAmount) || 0;
    const outstanding = Math.max(0, total - paid);
    if (order2.isFree !== true && outstanding > 0) {
      const snapshot = order2.packageSnapshot || {};
      const expireAt = toDateOnly$2(order2.expireAt) || toDateOnly$2(order2.expectedReturnDate);
      const overdueDays = expireAt ? Math.max(0, -daysDiff(todayDateString(), expireAt)) : 0;
      const overdueFee = overdueDays * (Number(snapshot.overdueDayPrice) || 0);
      if (overdueFee > 0) {
        strapi2.log.warn(
          `[zhao-tire] order ${orderNo2} overdue fee hook: ${overdueDays} day(s), ${overdueFee} fen (not enforced)`
        );
      }
      throw createError("PAYMENT_REQUIRED", 400, "订单尚未结清，请先完成收款", {
        amountTotal: total,
        paidAmount: paid,
        outstanding,
        overdueFee
      });
    }
    const config2 = await getConfig(strapi2);
    if (config2.redemptionCodeEnabled !== false && order2.redemptionCode) {
      const provided = String(payload.redemptionCode || "").replace(/\s/g, "").trim();
      if (!provided) {
        throw createError("REDEMPTION_CODE_REQUIRED", 400, "请扫描或输入出库核销码");
      }
      if (provided !== String(order2.redemptionCode)) {
        throw createError("REDEMPTION_CODE_INVALID", 400, "核销码不正确");
      }
    }
    const ids = photoIds(payload.photos);
    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请至少上传一张出库照片");
    }
    const outboundAt = (/* @__PURE__ */ new Date()).toISOString();
    const timeline = appendTimeline(
      order2,
      "outbound_done",
      "轮胎已出库（核销码已验证），订单完成",
      payload.operatorId
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: {
        status: "completed",
        outboundAt,
        outboundPhotos: ids.map((id) => ({ id })),
        redemptionCodeUsedAt: outboundAt,
        timeline
      }
    });
    await notifySafely(strapi2, "outbound_done", {
      ...order2,
      status: "completed"
    });
    return { orderNo: order2.orderNo, status: "completed", outboundAt };
  },
  async complete(orderNo2, payload = {}) {
    return this.outbound(orderNo2, payload);
  },
  async approveOutbound(orderNo2, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["stored"], "当前订单状态不可审核出库申请");
    if ((order2.outboundRequestStatus || "none") !== "pending") {
      throw createError("STATE_INVALID", 400, "没有待审核的出库申请");
    }
    const timeline = appendTimeline(
      order2,
      "outbound_approved",
      "出库申请已通过",
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: {
        status: "pending_outbound",
        outboundRequestStatus: "approved",
        timeline
      }
    });
    return {
      orderNo: order2.orderNo,
      status: "pending_outbound",
      outboundRequestStatus: "approved"
    };
  },
  async rejectOutbound(orderNo2, reason, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    assertStatus(order2, ["stored"], "当前订单状态不可审核出库申请");
    if ((order2.outboundRequestStatus || "none") !== "pending") {
      throw createError("STATE_INVALID", 400, "没有待审核的出库申请");
    }
    const timeline = appendTimeline(
      order2,
      "outbound_rejected",
      reason ? `出库申请驳回：${reason}` : "出库申请已驳回",
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: {
        outboundRequestStatus: "none",
        timeline
      }
    });
    return {
      orderNo: order2.orderNo,
      status: order2.status,
      outboundRequestStatus: "none"
    };
  },
  /** 后台改单：客户 / 车辆 / 日期 / 备注等可编辑字段 */
  async updateDetails(orderNo2, payload = {}, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    const data = {};
    for (const key of ["customerName", "plateNo", "tireSpec", "note"]) {
      if (payload[key] !== void 0) {
        data[key] = String(payload[key] ?? "").trim();
      }
    }
    if (data.customerName !== void 0 && !data.customerName) {
      throw createError("VALIDATION_FAILED", 400, "客户姓名不能为空");
    }
    if (payload.phone !== void 0) {
      const phone = String(payload.phone || "").trim();
      if (!PHONE_PATTERN$2.test(phone)) {
        throw createError("VALIDATION_FAILED", 400, "请填写正确的手机号");
      }
      data.phone = phone;
    }
    if (payload.carType !== void 0) {
      const carType = String(payload.carType || "").trim();
      if (!["sedan", "suv", "pickup"].includes(carType)) {
        throw createError("VALIDATION_FAILED", 400, "车型不合法");
      }
      data.carType = carType;
    }
    if (payload.withWheelRim !== void 0) {
      data.withWheelRim = Boolean(payload.withWheelRim);
    }
    if (payload.serviceType !== void 0) {
      const serviceType = String(payload.serviceType || "").trim();
      if (!["store", "pickup"].includes(serviceType)) {
        throw createError("VALIDATION_FAILED", 400, "服务类型不合法");
      }
      data.serviceType = serviceType;
    }
    for (const key of ["pickupDate", "storageStartDate", "expectedReturnDate"]) {
      if (payload[key] === void 0) continue;
      const value = normalizeDate(payload[key]);
      if (!value) {
        throw createError("VALIDATION_FAILED", 400, "日期格式不合法");
      }
      data[key] = value;
    }
    if (payload.expireAt !== void 0) {
      data.expireAt = normalizeDate(payload.expireAt);
    }
    if (payload.pickupSlot !== void 0) {
      const slot2 = String(payload.pickupSlot || "").trim();
      if (slot2 && !["morning", "afternoon"].includes(slot2)) {
        throw createError("VALIDATION_FAILED", 400, "上门时段不合法");
      }
      data.pickupSlot = slot2 || null;
    }
    if (payload.months !== void 0) {
      const months = Number(payload.months);
      if (!Number.isInteger(months) || months < 1) {
        throw createError("VALIDATION_FAILED", 400, "寄存月数不合法");
      }
      data.months = months;
    }
    if (payload.locationCode !== void 0) {
      data.locationCode = String(payload.locationCode || "").trim() || null;
    }
    const updatedFields = Object.keys(data);
    if (updatedFields.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }
    data.timeline = appendTimeline(
      order2,
      "updated",
      `后台修改：${updatedFields.join(", ")}`,
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data
    });
    return { orderNo: order2.orderNo, updated: updatedFields };
  },
  /** 后台收款登记：所有到账统一落 tire-payment 流水 */
  async registerPayment(orderNo2, payload = {}, operatorId2) {
    const order2 = await requireOrder(strapi2, orderNo2);
    const amount = Number(payload?.amount);
    if (!Number.isInteger(amount) || amount <= 0) {
      throw createError("VALIDATION_FAILED", 400, "收款金额不合法（单位：分）");
    }
    const method = String(
      payload?.paymentMethod || payload?.method || order2.paymentMethod || "store_pay"
    );
    if (!["store_pay", "pickup_pay", "wechat", "deposit", "full"].includes(method)) {
      throw createError("VALIDATION_FAILED", 400, "支付方式不合法");
    }
    const paymentService2 = strapi2.plugin("zhao-tire").service("payment");
    const result = await paymentService2.recordManual({
      order: order2,
      amount,
      channel: method,
      idempotencyKey: payload?.idempotencyKey || payload?.clientToken,
      operatorId: operatorId2,
      operatorName: payload?.operatorName,
      note: payload?.note,
      status: payload?.status === "pending" ? "pending" : "paid"
    });
    const paymentStatus = result.order?.paymentStatus || order2.paymentStatus;
    const paidAmount = result.order?.paidAmount ?? (Number(order2.paidAmount) || 0);
    const timeline = appendTimeline(
      order2,
      "payment",
      result.pending ? `收款登记待确认 ${amount} 分（${method}，流水 ${result.payment.paymentNo}）` : `收款到账 ${amount} 分（${method}，流水 ${result.payment.paymentNo}），累计 ${paidAmount} 分`,
      operatorId2
    );
    await strapi2.db.query(ORDER_UID$a).update({
      where: { id: order2.id },
      data: { paymentMethod: method, paymentStatus, paidAmount, timeline }
    });
    return {
      orderNo: order2.orderNo,
      paymentMethod: method,
      paymentStatus,
      paidAmount,
      paymentNo: result.payment?.paymentNo,
      pending: Boolean(result.pending),
      duplicated: Boolean(result.duplicated)
    };
  }
});
const orderService$1 = () => strapi.plugin("zhao-tire").service("order");
const order = {
  async slots(ctx) {
    try {
      const requested = ctx.query?.date;
      const date2 = normalizeDate(requested) || todayDateString();
      const slotService = strapi.plugin("zhao-tire").service("slot");
      const [morning, afternoon] = await Promise.all([
        slotService.usage(date2, "morning"),
        slotService.usage(date2, "afternoon")
      ]);
      ctx.body = { date: date2, morning, afternoon };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async create(ctx) {
    try {
      const result = await orderService$1().create(ctx.request.body || {});
      ctx.body = result;
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async detail(ctx) {
    try {
      ctx.body = await orderService$1().detail(
        ctx.params.orderNo,
        ctx.query?.phone
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async renew(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await orderService$1().renew(
        ctx.params.orderNo,
        body.months,
        body.paymentMethod
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async requestOutbound(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await orderService$1().requestOutbound(
        ctx.params.orderNo,
        body.note
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const CONFIG_UID$5 = "plugin::zhao-tire.tire-config";
const FAQ_UID$1 = "plugin::zhao-tire.tire-faq";
const content = {
  async agreement(ctx) {
    try {
      const config2 = await strapi.documents(CONFIG_UID$5).findFirst({}) || {};
      ctx.body = { agreementText: config2.agreementText || "" };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async faqs(ctx) {
    try {
      const faqs = await strapi.db.query(FAQ_UID$1).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" }
      });
      ctx.body = { faqs };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const ORDER_UID$9 = "plugin::zhao-tire.tire-order";
const SHARE_UID$2 = "plugin::zhao-tire.tire-share-record";
const PHONE_PATTERN$1 = /^1[3-9]\d{9}$/;
const dateOnly = (value) => {
  if (!value) return "";
  const text = value instanceof Date ? value.toISOString() : String(value);
  return text.slice(0, 10);
};
async function requireUser(ctx) {
  const match = String(ctx.request.headers?.authorization || "").match(
    /^Bearer\s+(.+)$/i
  );
  if (!match) throw createError("UNAUTHORIZED", 401, "请先登录");
  const service = strapi.plugin("zhao-sso")?.service?.("sso-auth");
  if (!service?.verifyToken) {
    throw createError("UNAUTHORIZED", 401, "统一登录服务不可用");
  }
  let verified;
  try {
    verified = await service.verifyToken(match[1].trim());
  } catch (error2) {
    const status = Number(error2?.status);
    if (status && status < 500) throw error2;
    throw createError("UNAUTHORIZED", 401, "登录已失效，请重新登录");
  }
  const user = verified?.user;
  const phone = String(user?.mobile || "").trim();
  if (!PHONE_PATTERN$1.test(phone)) {
    throw createError("UNAUTHORIZED", 401, "账号未绑定手机号");
  }
  return { phone, nickname: String(user?.nickname || "") };
}
const toSummary = (order2) => ({
  orderNo: order2.orderNo,
  status: order2.status,
  serviceType: order2.serviceType,
  customerName: order2.customerName,
  plateNo: order2.plateNo || "",
  tireSpec: order2.tireSpec || "",
  storageStartDate: dateOnly(order2.storageStartDate),
  expectedReturnDate: dateOnly(order2.expectedReturnDate),
  expireAt: dateOnly(order2.expireAt),
  months: Number(order2.months) || 0,
  amountTotal: Number(order2.amountTotal) || 0,
  paymentStatus: order2.paymentStatus,
  createdAt: order2.createdAt
});
const my = {
  async me(ctx) {
    try {
      ctx.body = await requireUser(ctx);
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async orders(ctx) {
    try {
      const user = await requireUser(ctx);
      const rows = await strapi.db.query(ORDER_UID$9).findMany({ where: { phone: user.phone }, orderBy: { createdAt: "DESC" } });
      ctx.body = { ...user, orders: rows.map(toSummary) };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async referral(ctx) {
    try {
      const user = await requireUser(ctx);
      const referralService = strapi.plugin("zhao-tire").service("referral");
      const rc = await referralService.ensureForPhone(user.phone, user.nickname);
      const REFERRAL_THRESHOLD2 = 3;
      const completed = Number(rc.completedCount) || 0;
      const progress = completed % REFERRAL_THRESHOLD2;
      ctx.body = {
        code: rc.code,
        phone: rc.phone,
        nickname: rc.nickname || user.nickname || "",
        usedCount: Number(rc.usedCount) || 0,
        completedCount: completed,
        pendingFreeCount: Number(rc.pendingFreeCount) || 0,
        totalFreeCount: Number(rc.totalFreeCount) || 0,
        threshold: REFERRAL_THRESHOLD2,
        progress,
        progressNextIn: REFERRAL_THRESHOLD2 - progress
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async rewards(ctx) {
    try {
      const user = await requireUser(ctx);
      const referralService = strapi.plugin("zhao-tire").service("referral");
      ctx.body = await referralService.listRewards(user.phone);
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 我的邀请明细（仅本人作为分享人的记录），服务端分页 */
  async shareRecords(ctx) {
    try {
      const user = await requireUser(ctx);
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(50, Math.max(1, Number(query.pageSize) || 10));
      const where = { referrerPhone: user.phone };
      if (query.status) where.status = String(query.status);
      if (query.from || query.to) {
        where.boundAt = {};
        if (query.from) where.boundAt.$gte = `${String(query.from).slice(0, 10)}T00:00:00.000Z`;
        if (query.to) where.boundAt.$lte = `${String(query.to).slice(0, 10)}T23:59:59.999Z`;
      }
      const [rows, total] = await Promise.all([
        strapi.db.query(SHARE_UID$2).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize
        }),
        strapi.db.query(SHARE_UID$2).count({ where })
      ]);
      ctx.body = {
        data: (rows || []).map((row) => ({
          id: row.id,
          inviteePhone: row.inviteePhone ? `${String(row.inviteePhone).slice(0, 3)}****${String(row.inviteePhone).slice(-4)}` : "",
          orderNo: row.orderNo || "",
          status: row.status,
          boundAt: row.boundAt || null,
          validAt: row.validAt || null
        })),
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const referral$1 = {
  async preview(ctx) {
    try {
      const code = String(ctx.params?.code || "").trim().toUpperCase();
      if (!code || code.length !== 6) {
        ctx.status = 400;
        ctx.body = { code: "REFERRAL_CODE_INVALID", message: "邀请码格式错误" };
        return;
      }
      const referralService = strapi.plugin("zhao-tire").service("referral");
      const rc = await referralService.validate(code);
      const phone = String(rc.phone || "");
      const maskedPhone = phone.length >= 7 ? `${phone.slice(0, 3)}****${phone.slice(-4)}` : phone;
      ctx.body = {
        code: rc.code,
        nickname: rc.nickname || maskedPhone,
        phoneMasked: maskedPhone
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const payService = () => strapi.plugin("zhao-tire").service("pay");
const pay$1 = {
  async prepay(ctx) {
    try {
      ctx.body = await payService().prepay(ctx.request.body || {});
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async notify(ctx) {
    try {
      const signature = ctx.get?.("x-mock-sign") || ctx.request?.headers?.["x-mock-sign"] || "";
      const rawBody = ctx.request?.rawBody;
      ctx.body = await payService().notify(
        ctx.request.body || {},
        signature,
        typeof rawBody === "string" ? rawBody : void 0,
        ctx.request?.headers || {}
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async mockPay(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = await payService().mockPay(String(body.paymentNo || ""));
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const ORDER_UID$8 = "plugin::zhao-tire.tire-order";
const orderService = () => strapi.plugin("zhao-tire").service("order");
const readBody$1 = (ctx) => {
  const body = ctx.request?.body;
  if (!body || typeof body !== "object") return {};
  return body.data && typeof body.data === "object" ? body.data : body;
};
const requireId$2 = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError("VALIDATION_FAILED", 400, "订单 id 不合法");
  }
  return id;
};
const operatorId$2 = (ctx) => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : void 0;
};
const findOrderById = async (rawId) => {
  const id = requireId$2(rawId);
  const order2 = await strapi.db.query(ORDER_UID$8).findOne({ where: { id } });
  if (!order2) {
    throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
  }
  return order2;
};
const parsePhotoIds = (raw) => {
  if (raw === void 0 || raw === null || raw === "") return [];
  let value = raw;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      value = JSON.parse(text);
    } catch {
      value = text.split(",").map((item) => item.trim());
    }
  }
  const list = Array.isArray(value) ? value : [value];
  return list.map(
    (item) => item && typeof item === "object" ? item.id : item
  ).map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0);
};
const bodyPhotoIds = (body) => {
  const values = [
    body?.photoIds,
    body?.["photoIds[]"],
    body?.photos,
    body?.["photos[]"]
  ];
  return Array.from(new Set(values.flatMap(parsePhotoIds)));
};
const collectUploadedFiles = (ctx) => {
  const files = ctx.request?.files;
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);
  const list = [];
  for (const value of Object.values(files)) {
    if (Array.isArray(value)) list.push(...value.filter(Boolean));
    else if (value) list.push(value);
  }
  return list;
};
const uploadPhotos = async (orderId, field, files) => {
  if (files.length === 0) return [];
  for (const file of files) {
    const mime = String(file?.mimetype || "");
    if (mime && !mime.startsWith("image/")) {
      throw createError("VALIDATION_FAILED", 400, "仅支持上传图片文件");
    }
  }
  const uploadService = strapi.plugin("upload").service("upload");
  const uploaded = await uploadService.upload({
    data: { refId: orderId, ref: ORDER_UID$8, field },
    files
  });
  return (uploaded || []).map((file) => Number(file?.id)).filter((id) => Number.isInteger(id) && id > 0);
};
const adminOrder = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number(query.pageSize) || 20)
      );
      const where = buildOrderWhere(query);
      const [data, total] = await Promise.all([
        strapi.db.query(ORDER_UID$8).findMany({
          where,
          orderBy: { createdAt: "DESC" },
          populate: { inboundPhotos: true, outboundPhotos: true },
          limit: pageSize,
          offset: (page - 1) * pageSize
        }),
        strapi.db.query(ORDER_UID$8).count({ where })
      ]);
      ctx.body = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async findOne(ctx) {
    try {
      const order2 = await strapi.db.query(ORDER_UID$8).findOne({
        where: { id: requireId$2(ctx.params.id) },
        populate: {
          inboundPhotos: true,
          outboundPhotos: true,
          storageOperator: true
        }
      });
      if (!order2) {
        throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
      }
      ctx.body = { data: order2 };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async update(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      const result = await orderService().updateDetails(
        order2.orderNo,
        readBody$1(ctx),
        operatorId$2(ctx)
      );
      ctx.body = result;
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async accept(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      ctx.body = await orderService().accept(order2.orderNo, operatorId$2(ctx));
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async reject(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      const reason = String(readBody$1(ctx)?.reason || "").trim();
      ctx.body = await orderService().reject(
        order2.orderNo,
        reason,
        operatorId$2(ctx)
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async approveOutbound(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      ctx.body = await orderService().approveOutbound(
        order2.orderNo,
        operatorId$2(ctx)
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async rejectOutbound(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      const reason = String(readBody$1(ctx)?.reason || "").trim();
      ctx.body = await orderService().rejectOutbound(
        order2.orderNo,
        reason,
        operatorId$2(ctx)
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async inbound(ctx) {
    try {
      const id = requireId$2(ctx.params.id);
      const order2 = await findOrderById(id);
      const body = readBody$1(ctx);
      const files = collectUploadedFiles(ctx);
      const photoIds2 = Array.from(
        /* @__PURE__ */ new Set([
          ...await uploadPhotos(id, "inboundPhotos", files),
          ...bodyPhotoIds(body)
        ])
      );
      const locationCode = String(
        body?.locationCode || body?.location_code || ""
      ).trim();
      if (!locationCode) {
        throw createError("VALIDATION_FAILED", 400, "请填写仓位编号");
      }
      const result = await orderService().inbound(order2.orderNo, {
        photos: photoIds2,
        locationCode,
        operatorId: operatorId$2(ctx)
      });
      ctx.body = { ...result, photos: photoIds2 };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async outbound(ctx) {
    try {
      const id = requireId$2(ctx.params.id);
      const order2 = await findOrderById(id);
      const body = readBody$1(ctx);
      const photoIds2 = Array.from(
        /* @__PURE__ */ new Set([
          ...await uploadPhotos(
            id,
            "outboundPhotos",
            collectUploadedFiles(ctx)
          ),
          ...bodyPhotoIds(body)
        ])
      );
      ctx.body = await orderService().outbound(order2.orderNo, {
        photos: photoIds2,
        operatorId: operatorId$2(ctx),
        redemptionCode: body?.redemptionCode || body?.code || body?.redeemCode
      });
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async payment(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      ctx.body = await orderService().registerPayment(
        order2.orderNo,
        readBody$1(ctx),
        operatorId$2(ctx)
      );
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async refund(ctx) {
    try {
      const order2 = await findOrderById(ctx.params.id);
      const body = readBody$1(ctx);
      const paymentService2 = strapi.plugin("zhao-tire").service("payment");
      const user = ctx.state?.user;
      ctx.body = await paymentService2.refund({
        order: order2,
        amount: Number(body?.amount) || 0,
        note: body?.note,
        operatorId: operatorId$2(ctx),
        operatorName: user ? String(user.username || user.email || user.id || "") : void 0
      });
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async exportExcel(ctx) {
    try {
      const exportService2 = strapi.plugin("zhao-tire").service("export");
      const { buffer, filename } = await exportService2.ordersExcel(
        ctx.query || {}
      );
      ctx.set(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      ctx.set(
        "Content-Disposition",
        `attachment; filename="tire-orders.xlsx"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      ctx.body = buffer;
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const inventoryService = () => strapi.plugin("zhao-tire").service("inventory");
const operatorId$1 = (ctx) => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : void 0;
};
const adminInventory = {
  async find(ctx) {
    try {
      ctx.body = await inventoryService().list(ctx.query || {});
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async expiring(ctx) {
    try {
      ctx.body = await inventoryService().expiring(ctx.query || {});
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async remind(ctx) {
    try {
      const body = ctx.request.body && typeof ctx.request.body === "object" ? ctx.request.body : {};
      ctx.body = await inventoryService().remind(body, operatorId$1(ctx));
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const catalogService = () => strapi.plugin("zhao-tire").service("catalog");
const buildCollectionCrud = (name) => ({
  async list(ctx) {
    try {
      ctx.body = { data: await catalogService().list(name) };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async create(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = { data: await catalogService().create(name, body) };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async update(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = {
        data: await catalogService().update(name, ctx.params.id, body)
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async remove(ctx) {
    try {
      ctx.body = await catalogService().remove(name, ctx.params.id);
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
});
const prefixHandlers = (prefix, handlers) => {
  const result = {};
  for (const [key, handler] of Object.entries(handlers)) {
    result[`${prefix}${key.charAt(0).toUpperCase()}${key.slice(1)}`] = handler;
  }
  return result;
};
const adminCatalog = {
  ...prefixHandlers("package", buildCollectionCrud("packages")),
  ...prefixHandlers("addon", buildCollectionCrud("addons")),
  async getConfig(ctx) {
    try {
      ctx.body = { data: await catalogService().getConfig() };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async updateConfig(ctx) {
    try {
      const body = ctx.request.body || {};
      ctx.body = { data: await catalogService().updateConfig(body) };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const adminCustomer = {
  async find(ctx) {
    try {
      const service = strapi.plugin("zhao-tire").service("customer");
      ctx.body = await service.list(ctx.query || {});
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const notifyService = () => strapi.plugin("zhao-tire").service("notify");
const operatorId = (ctx) => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : void 0;
};
const adminSms = {
  async find(ctx) {
    try {
      ctx.body = await notifyService().list(ctx.query || {});
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  async update(ctx) {
    try {
      const body = ctx.request.body && typeof ctx.request.body === "object" ? ctx.request.body : {};
      ctx.body = {
        data: await notifyService().update(
          ctx.params.id,
          body,
          operatorId(ctx)
        )
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const adminContent = {
  ...prefixHandlers("faq", buildCollectionCrud("faqs")),
  ...prefixHandlers("review", buildCollectionCrud("reviews")),
  ...prefixHandlers("gallery", buildCollectionCrud("gallery"))
};
const adminMe = {
  async find(ctx) {
    try {
      const user = ctx.state?.user || {};
      const roleCodes = (user.roles || []).map((role) => String(role?.code || "")).filter(Boolean);
      ctx.body = {
        data: {
          id: Number(user.id) || 0,
          roleCodes
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const RC_UID$1 = "plugin::zhao-tire.tire-referral-code";
const SHARE_UID$1 = "plugin::zhao-tire.tire-share-record";
const REWARD_UID$1 = "plugin::zhao-tire.tire-referral-reward";
const SHARE_STATUSES = ["bound", "valid", "pending_review", "invalid", "rolled_back"];
const pageParams = (query) => {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
  return { page, pageSize };
};
const buildShareWhere = (query) => {
  const where = {};
  if (query.status && SHARE_STATUSES.includes(String(query.status))) {
    where.status = String(query.status);
  }
  if (query.referrerPhone) {
    where.referrerPhone = { $like: `%${String(query.referrerPhone).trim()}%` };
  }
  if (query.inviteePhone) {
    where.inviteePhone = { $like: `%${String(query.inviteePhone).trim()}%` };
  }
  if (query.orderNo) {
    where.orderNo = { $like: `%${String(query.orderNo).trim()}%` };
  }
  const from = String(query.from || "").trim();
  const to = String(query.to || "").trim();
  if (from || to) {
    where.boundAt = {};
    if (from) where.boundAt.$gte = `${from}T00:00:00.000Z`;
    if (to) where.boundAt.$lte = `${to}T23:59:59.999Z`;
  }
  return where;
};
const rewardSummary = async (phones) => {
  const unique = Array.from(new Set(phones.filter(Boolean)));
  if (unique.length === 0) return /* @__PURE__ */ new Map();
  const rows = await strapi.db.query(REWARD_UID$1).findMany({
    where: { phone: { $in: unique } },
    orderBy: { id: "DESC" }
  });
  const map2 = /* @__PURE__ */ new Map();
  for (const phone of unique) {
    const list = (rows || []).filter((row) => row.phone === phone);
    const latest = list[0];
    map2.set(phone, {
      issued: list.length,
      available: list.filter((row) => row.status === "available").length,
      used: list.filter((row) => row.status === "used").length,
      latestStatus: latest ? latest.status : null,
      latestRewardNo: latest ? latest.rewardNo : null
    });
  }
  return map2;
};
const csvCell = (value) => {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
};
const readBody = (ctx) => {
  const body = ctx.request?.body;
  if (!body || typeof body !== "object") return {};
  return body.data && typeof body.data === "object" ? body.data : body;
};
const requireId$1 = (value) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError("VALIDATION_FAILED", 400, "邀请码 id 不合法");
  }
  return id;
};
const adminReferral = {
  /** 列表查询：GET /admin/referral-codes?code=&phone=&page=&pageSize= */
  async find(ctx) {
    try {
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number(query.pageSize) || 20)
      );
      const where = {};
      if (query.code) {
        where.code = { $like: `%${String(query.code).toUpperCase()}%` };
      }
      if (query.phone) {
        where.phone = { $like: `%${String(query.phone).trim()}%` };
      }
      const [data, total] = await Promise.all([
        strapi.db.query(RC_UID$1).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize
        }),
        strapi.db.query(RC_UID$1).count({ where })
      ]);
      ctx.body = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 更新基础信息：PATCH /admin/referral-codes/:id */
  async update(ctx) {
    try {
      const id = requireId$1(ctx.params.id);
      const body = readBody(ctx);
      const allowed = ["nickname"];
      const data = {};
      for (const key of allowed) {
        if (body[key] !== void 0) data[key] = body[key];
      }
      if (Object.keys(data).length === 0) {
        throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
      }
      const updated = await strapi.db.query(RC_UID$1).update({
        where: { id },
        data
      });
      if (!updated) throw createError("REFERRAL_NOT_FOUND", 404, "邀请码不存在");
      ctx.body = { data: updated };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 手动发放免单次数：POST /admin/referral-codes/:id/grant-free */
  async grantFree(ctx) {
    try {
      const id = requireId$1(ctx.params.id);
      const body = readBody(ctx);
      const count = Math.max(1, Math.min(100, Number(body.count) || 1));
      const row = await strapi.db.query(RC_UID$1).findOne({ where: { id } });
      if (!row) throw createError("REFERRAL_NOT_FOUND", 404, "邀请码不存在");
      const pending = (Number(row.pendingFreeCount) || 0) + count;
      const total = (Number(row.totalFreeCount) || 0) + count;
      const updated = await strapi.db.query(RC_UID$1).update({
        where: { id },
        data: { pendingFreeCount: pending, totalFreeCount: total }
      });
      const referralService = strapi.plugin("zhao-tire").service("referral");
      const issued = await referralService.issueReward(updated, {
        source: "manual",
        note: `后台手动发放（操作人 ${ctx.state?.user?.username || "admin"}）`,
        force: true
      });
      ctx.body = {
        data: updated,
        granted: count,
        rewardNo: issued?.reward?.rewardNo || null,
        message: `已为 ${row.nickname || row.phone} 发放 ${count} 次免单额度`
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 邀请记录明细：直接查 tire-share-record，服务端分页与筛选 */
  async shareRecords(ctx) {
    try {
      const query = ctx.query || {};
      const { page, pageSize } = pageParams(query);
      const where = buildShareWhere(query);
      const [rows, total] = await Promise.all([
        strapi.db.query(SHARE_UID$1).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize
        }),
        strapi.db.query(SHARE_UID$1).count({ where })
      ]);
      const summary = await rewardSummary(
        (rows || []).map((row) => row.referrerPhone)
      );
      ctx.body = {
        data: (rows || []).map((row) => ({
          ...row,
          reward: summary.get(row.referrerPhone) || {
            issued: 0,
            available: 0,
            used: 0,
            latestStatus: null,
            latestRewardNo: null
          }
        })),
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 邀请记录导出 CSV（服务端筛选，最多 5000 行） */
  async exportShareRecords(ctx) {
    try {
      const query = ctx.query || {};
      const where = buildShareWhere(query);
      const rows = await strapi.db.query(SHARE_UID$1).findMany({
        where,
        orderBy: { id: "DESC" },
        limit: 5e3
      });
      const summary = await rewardSummary(
        (rows || []).map((row) => row.referrerPhone)
      );
      const header = [
        "分享人",
        "被邀请人",
        "邀请码",
        "订单号",
        "绑定时间",
        "是否入库生效",
        "状态",
        "奖励发放",
        "奖励可用",
        "奖励已用",
        "最近奖励单号",
        "风险原因"
      ];
      const lines = [header.map(csvCell).join(",")];
      for (const row of rows || []) {
        const reward = summary.get(row.referrerPhone) || {};
        lines.push(
          [
            row.referrerPhone,
            row.inviteePhone || "",
            row.shareCode,
            row.orderNo || "",
            row.boundAt || "",
            row.status === "valid" ? "是" : "否",
            row.status,
            reward.issued || 0,
            reward.available || 0,
            reward.used || 0,
            reward.latestRewardNo || "",
            row.riskReason || ""
          ].map(csvCell).join(",")
        );
      }
      const filename = `tire-share-records-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.csv`;
      ctx.set("Content-Type", "text/csv; charset=utf-8");
      ctx.set(
        "Content-Disposition",
        `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(
          filename
        )}`
      );
      ctx.body = `\uFEFF${lines.join("\r\n")}`;
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 奖励券台账（tire-referral-reward 直查） */
  async rewards(ctx) {
    try {
      const query = ctx.query || {};
      const { page, pageSize } = pageParams(query);
      const where = {};
      if (query.phone) where.phone = { $like: `%${String(query.phone).trim()}%` };
      if (query.status) where.status = String(query.status);
      if (query.rewardNo) where.rewardNo = String(query.rewardNo).trim();
      const [rows, total] = await Promise.all([
        strapi.db.query(REWARD_UID$1).findMany({
          where,
          orderBy: { id: "DESC" },
          limit: pageSize,
          offset: (page - 1) * pageSize
        }),
        strapi.db.query(REWARD_UID$1).count({ where })
      ]);
      ctx.body = {
        data: rows,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize)
        }
      };
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const PAYMENT_UID$1 = "plugin::zhao-tire.tire-payment";
const paymentService = () => strapi.plugin("zhao-tire").service("payment");
const operatorName = (ctx) => {
  const user = ctx.state?.user;
  if (!user) return void 0;
  return String(
    user.username || user.email || user.firstname || user.id || ""
  ) || void 0;
};
const adminPayment = {
  async find(ctx) {
    try {
      const query = ctx.query || {};
      ctx.body = await paymentService().list({
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        orderNo: query.orderNo,
        channel: query.channel
      });
    } catch (error2) {
      sendError(ctx, error2);
    }
  },
  /** 确认到账：把 pending 流水置为 paid */
  async confirm(ctx) {
    try {
      const id = Number(ctx.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        throw createError("VALIDATION_FAILED", 400, "流水 id 不合法");
      }
      const payment2 = await strapi.db.query(PAYMENT_UID$1).findOne({
        where: { id }
      });
      if (!payment2) throw createError("PAYMENT_NOT_FOUND", 404, "支付流水不存在");
      const result = await paymentService().settle(payment2.paymentNo, {
        externalNo: `ADMIN-CONFIRM-${payment2.paymentNo}`,
        raw: { source: "admin-confirm", operator: operatorName(ctx) }
      });
      ctx.body = result;
    } catch (error2) {
      sendError(ctx, error2);
    }
  }
};
const controllers = {
  site: site$1,
  order,
  content,
  my,
  referral: referral$1,
  pay: pay$1,
  "admin-order": adminOrder,
  "admin-inventory": adminInventory,
  "admin-catalog": adminCatalog,
  "admin-customer": adminCustomer,
  "admin-sms": adminSms,
  "admin-content": adminContent,
  "admin-me": adminMe,
  "admin-referral": adminReferral,
  "admin-payment": adminPayment
};
const route = (method, path, handler) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false
  }
});
const contentApi = () => ({
  type: "content-api",
  routes: [
    route("GET", "/site", "site.get"),
    route("GET", "/slots", "order.slots"),
    route("POST", "/orders", "order.create"),
    route("GET", "/orders/:orderNo", "order.detail"),
    route("POST", "/orders/:orderNo/renew", "order.renew"),
    route("POST", "/orders/:orderNo/outbound", "order.requestOutbound"),
    route("GET", "/my/me", "my.me"),
    route("GET", "/my/orders", "my.orders"),
    route("GET", "/my/referral", "my.referral"),
    route("GET", "/my/rewards", "my.rewards"),
    route("GET", "/my/share-records", "my.shareRecords"),
    route("POST", "/pay/prepay", "pay.prepay"),
    route("POST", "/pay/notify", "pay.notify"),
    route("POST", "/pay/mock-pay", "pay.mockPay"),
    route("GET", "/referral/:code/preview", "referral.preview"),
    route("GET", "/agreement", "content.agreement"),
    route("GET", "/faqs", "content.faqs")
  ]
});
const adminRoute = (method, path, handler, allow) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      { name: "plugin::zhao-tire.admin-role", config: { allow } }
    ]
  }
});
const adminApi = () => ({
  type: "content-api",
  routes: [
    // 当前操作员
    adminRoute("GET", "/me", "admin-me.find", "read"),
    // 订单
    adminRoute("GET", "/orders", "admin-order.find", "read"),
    adminRoute(
      "GET",
      "/orders/export.xlsx",
      "admin-order.exportExcel",
      "full"
    ),
    adminRoute("GET", "/orders/:id", "admin-order.findOne", "read"),
    adminRoute("PATCH", "/orders/:id", "admin-order.update", "full"),
    adminRoute("POST", "/orders/:id/accept", "admin-order.accept", "full"),
    adminRoute("POST", "/orders/:id/reject", "admin-order.reject", "full"),
    adminRoute(
      "POST",
      "/orders/:id/inbound",
      "admin-order.inbound",
      "storage"
    ),
    adminRoute(
      "POST",
      "/orders/:id/outbound",
      "admin-order.outbound",
      "storage"
    ),
    adminRoute("POST", "/orders/:id/payment", "admin-order.payment", "payment"),
    adminRoute("POST", "/orders/:id/refund", "admin-order.refund", "full"),
    adminRoute(
      "POST",
      "/orders/:id/approve-outbound",
      "admin-order.approveOutbound",
      "full"
    ),
    adminRoute(
      "POST",
      "/orders/:id/reject-outbound",
      "admin-order.rejectOutbound",
      "full"
    ),
    // 支付流水 / 确认到账
    adminRoute("GET", "/payments", "admin-payment.find", "read"),
    adminRoute("POST", "/payments/:id/confirm", "admin-payment.confirm", "payment"),
    // 库存
    adminRoute("GET", "/inventory", "admin-inventory.find", "read"),
    adminRoute(
      "GET",
      "/inventory/expiring",
      "admin-inventory.expiring",
      "read"
    ),
    adminRoute(
      "POST",
      "/inventory/remind",
      "admin-inventory.remind",
      "full"
    ),
    // 客户
    adminRoute("GET", "/customers", "admin-customer.find", "full"),
    // 套餐 / 增值服务
    adminRoute("GET", "/packages", "admin-catalog.packageList", "full"),
    adminRoute("POST", "/packages", "admin-catalog.packageCreate", "full"),
    adminRoute(
      "PUT",
      "/packages/:id",
      "admin-catalog.packageUpdate",
      "full"
    ),
    adminRoute(
      "DELETE",
      "/packages/:id",
      "admin-catalog.packageRemove",
      "full"
    ),
    adminRoute("GET", "/addons", "admin-catalog.addonList", "full"),
    adminRoute("POST", "/addons", "admin-catalog.addonCreate", "full"),
    adminRoute("PUT", "/addons/:id", "admin-catalog.addonUpdate", "full"),
    adminRoute(
      "DELETE",
      "/addons/:id",
      "admin-catalog.addonRemove",
      "full"
    ),
    // 站点配置
    adminRoute("GET", "/config", "admin-catalog.getConfig", "full"),
    adminRoute("PUT", "/config", "admin-catalog.updateConfig", "full"),
    // 内容
    adminRoute("GET", "/faqs", "admin-content.faqList", "full"),
    adminRoute("POST", "/faqs", "admin-content.faqCreate", "full"),
    adminRoute("PUT", "/faqs/:id", "admin-content.faqUpdate", "full"),
    adminRoute("DELETE", "/faqs/:id", "admin-content.faqRemove", "full"),
    adminRoute("GET", "/reviews", "admin-content.reviewList", "full"),
    adminRoute("POST", "/reviews", "admin-content.reviewCreate", "full"),
    adminRoute("PUT", "/reviews/:id", "admin-content.reviewUpdate", "full"),
    adminRoute(
      "DELETE",
      "/reviews/:id",
      "admin-content.reviewRemove",
      "full"
    ),
    adminRoute("GET", "/gallery", "admin-content.galleryList", "full"),
    adminRoute("POST", "/gallery", "admin-content.galleryCreate", "full"),
    adminRoute("PUT", "/gallery/:id", "admin-content.galleryUpdate", "full"),
    adminRoute(
      "DELETE",
      "/gallery/:id",
      "admin-content.galleryRemove",
      "full"
    ),
    // 邀请码管理
    adminRoute("GET", "/referral-codes", "admin-referral.find", "full"),
    adminRoute("PATCH", "/referral-codes/:id", "admin-referral.update", "full"),
    adminRoute("POST", "/referral-codes/:id/grant-free", "admin-referral.grantFree", "full"),
    adminRoute("GET", "/share-records", "admin-referral.shareRecords", "read"),
    adminRoute(
      "GET",
      "/share-records/export.csv",
      "admin-referral.exportShareRecords",
      "read"
    ),
    adminRoute("GET", "/rewards", "admin-referral.rewards", "read"),
    // 短信通知
    adminRoute("GET", "/sms-logs", "admin-sms.find", "full"),
    adminRoute("PATCH", "/sms-logs/:id", "admin-sms.update", "full")
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: [...contentApi().routes, ...adminApi().routes]
  }
};
const ORDER_UID$7 = "plugin::zhao-tire.tire-order";
const CONFIG_UID$4 = "plugin::zhao-tire.tire-config";
const EXCLUDED_STATUS = ["canceled", "rejected"];
const LIMIT_FIELD = {
  morning: "dailyPickupLimitMorning",
  afternoon: "dailyPickupLimitAfternoon"
};
const OTHER_SLOT = {
  morning: "afternoon",
  afternoon: "morning"
};
const getLimit = async (strapi2, slot2) => {
  const config2 = await strapi2.documents(CONFIG_UID$4).findFirst({}) || {};
  const limit = Number(config2[LIMIT_FIELD[slot2]]);
  return Number.isFinite(limit) && limit > 0 ? limit : 6;
};
const countOrders = async (strapi2, date2, slot2) => {
  return strapi2.db.query(ORDER_UID$7).count({
    where: {
      pickupDate: date2,
      pickupSlot: slot2,
      status: { $notIn: EXCLUDED_STATUS }
    }
  });
};
const slot = ({ strapi: strapi2 }) => ({
  async remaining(date2, slot2) {
    const usage = await this.usage(date2, slot2);
    return usage.remaining;
  },
  async usage(date2, slot2) {
    if (slot2 !== "morning" && slot2 !== "afternoon") {
      throw createError("VALIDATION_FAILED", 400, "上门时段不合法");
    }
    const [limit, used] = await Promise.all([
      getLimit(strapi2, slot2),
      countOrders(strapi2, date2, slot2)
    ]);
    return { date: date2, slot: slot2, limit, used, remaining: Math.max(0, limit - used) };
  },
  async assertAvailable(date2, slot2) {
    const usage = await this.usage(date2, slot2);
    if (usage.remaining <= 0) {
      const otherSlot = OTHER_SLOT[slot2];
      const otherUsage = await this.usage(date2, otherSlot);
      throw createError("SLOT_FULL", 409, "该上门时段已约满，请选择其他时段", {
        date: date2,
        slot: slot2,
        limit: usage.limit,
        remaining: 0,
        alternatives: otherUsage.remaining > 0 ? [{ slot: otherSlot, remaining: otherUsage.remaining }] : []
      });
    }
    return usage;
  }
});
const ORDER_UID$6 = "plugin::zhao-tire.tire-order";
const TIMEZONE = "Asia/Shanghai";
const DAY_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit"
});
const dayStamp = (now = /* @__PURE__ */ new Date()) => {
  const parts = DAY_FORMATTER.formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value || "";
  const year = get("year").slice(-2);
  return `${year}${get("month")}${get("day")}`;
};
const formatOrderNo = (now, sequence) => {
  const seq = Math.max(1, Math.trunc(Number(sequence) || 0));
  return `XT${dayStamp(now)}-${String(seq).padStart(4, "0")}`;
};
const orderNo = ({ strapi: strapi2 }) => ({
  dayStamp,
  formatOrderNo,
  /** 按当日已有单量生成下一个单号；唯一冲突由调用方重试 */
  async generate(now = /* @__PURE__ */ new Date()) {
    const prefix = `XT${dayStamp(now)}`;
    const count = await strapi2.db.query(ORDER_UID$6).count({
      where: { orderNo: { $startsWith: prefix } }
    });
    return formatOrderNo(now, count + 1);
  }
});
const CONFIG_UID$3 = "plugin::zhao-tire.tire-config";
const PACKAGE_UID$1 = "plugin::zhao-tire.tire-package";
const ADDON_UID = "plugin::zhao-tire.tire-addon";
const FAQ_UID = "plugin::zhao-tire.tire-faq";
const REVIEW_UID = "plugin::zhao-tire.tire-review";
const GALLERY_UID = "plugin::zhao-tire.tire-gallery";
const site = ({ strapi: strapi2 }) => ({
  async get() {
    const [config2, packages, addons, faqs, reviews, gallery] = await Promise.all([
      strapi2.documents(CONFIG_UID$3).findFirst({
        populate: { bannerImage: true, wechatQr: true }
      }),
      strapi2.db.query(PACKAGE_UID$1).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" }
      }),
      strapi2.db.query(ADDON_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" }
      }),
      strapi2.db.query(FAQ_UID).findMany({
        where: { enabled: true },
        orderBy: { sort: "ASC" }
      }),
      strapi2.db.query(REVIEW_UID).findMany({
        where: { showOnHome: true },
        orderBy: { sort: "ASC" }
      }),
      strapi2.db.query(GALLERY_UID).findMany({
        orderBy: { sort: "ASC" },
        populate: { image: true }
      })
    ]);
    return {
      config: config2 || {},
      packages,
      addons,
      faqs,
      reviews,
      gallery
    };
  }
});
const SMS_TEMPLATES = {
  order_created: "{name}您好，您的雪地胎寄存订单 {orderNo} 已下单成功，请在订单页保存二维码。",
  accepted: "{name}您好，您的雪地胎寄存订单 {orderNo} 已接单，{pickupText}，请保持电话畅通。",
  inbound: "{name}您好，您的轮胎已入库，订单 {orderNo}，仓位 {locationCode}，寄存到期日 {expireAt}。",
  due_7: "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请提前安排取胎或续费。",
  due_3: "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（仅剩 {daysLeft} 天），请尽快取胎或续费。",
  outbound_done: "{name}您好，您的雪地胎寄存订单 {orderNo} 的轮胎已完成出库，感谢使用雪地胎寄存服务。",
  manual: "{name}您好，{content}"
};
const SMS_LOG_UID = "plugin::zhao-tire.tire-sms-log";
const CONFIG_UID$2 = "plugin::zhao-tire.tire-config";
const TIMEZONE_OFFSET_MS$1 = 8 * 60 * 60 * 1e3;
const DAY_MS$1 = 24 * 60 * 60 * 1e3;
const LOG_STATUS = ["pending", "sent", "skipped"];
const toDateOnly$1 = (value) => {
  if (!value) return "";
  return String(value).slice(0, 10);
};
const shanghaiToday$1 = (now = /* @__PURE__ */ new Date()) => new Date(now.getTime() + TIMEZONE_OFFSET_MS$1).toISOString().slice(0, 10);
const dayStartIso = (now = /* @__PURE__ */ new Date()) => {
  const shifted = new Date(now.getTime() + TIMEZONE_OFFSET_MS$1);
  const startUtc = Date.UTC(
    shifted.getUTCFullYear(),
    shifted.getUTCMonth(),
    shifted.getUTCDate()
  ) - TIMEZONE_OFFSET_MS$1;
  return new Date(startUtc).toISOString();
};
const daysUntil = (expireAt) => {
  if (!expireAt) return 0;
  const target = Date.parse(`${expireAt}T00:00:00+08:00`);
  const today = Date.parse(`${shanghaiToday$1()}T00:00:00+08:00`);
  if (Number.isNaN(target) || Number.isNaN(today)) return 0;
  return Math.round((target - today) / DAY_MS$1);
};
const renderTemplate = (template, vars) => template.replace(/\{(\w+)\}/g, (_match, key) => {
  const value = vars[key];
  return value === void 0 || value === null ? "" : String(value);
});
const buildVariables = (order2, extra = {}) => {
  const expireAt = toDateOnly$1(
    extra?.expireAt ?? order2?.expireAt ?? order2?.expectedReturnDate
  );
  const rawDaysLeft = extra?.daysLeft !== void 0 ? Number(extra.daysLeft) : expireAt ? daysUntil(expireAt) : 0;
  const slotText = order2?.pickupSlot === "afternoon" ? "下午" : order2?.pickupSlot === "morning" ? "上午" : "";
  const pickupDate = toDateOnly$1(order2?.pickupDate);
  const pickupText = order2?.serviceType === "pickup" ? `上门取胎时间 ${pickupDate} ${slotText}`.replace(/\s+/g, " ").trim() : "请按预约时间到店送胎";
  return {
    name: String(order2?.customerName || ""),
    orderNo: String(order2?.orderNo || ""),
    expireAt,
    daysLeft: Number.isFinite(rawDaysLeft) ? Math.max(0, rawDaysLeft) : 0,
    locationCode: String(extra?.locationCode ?? order2?.locationCode ?? ""),
    pickupText,
    content: String(extra?.content || "")
  };
};
const loadConfig = async (strapi2) => {
  try {
    return await strapi2.documents(CONFIG_UID$2).findFirst({}) || {};
  } catch {
    return {};
  }
};
const resolveTemplate = (config2, type, extra = {}) => {
  if (extra?.content) return String(extra.content);
  const override = config2?.smsTemplateOverride;
  if (override && typeof override === "object" && typeof override[type] === "string" && override[type].trim()) {
    return override[type];
  }
  return SMS_TEMPLATES[type] || "";
};
const notify = ({ strapi: strapi2 }) => ({
  /**
   * 渲染通知并落 tire-sms-log；同订单同类型当日去重。
   * 发送失败只记录 warn，不影响主流程。
   */
  async enqueue(type, order2, extra = {}) {
    if (!order2 || !order2.phone) return null;
    const config2 = await loadConfig(strapi2);
    const template = resolveTemplate(config2, type, extra);
    if (!template) return null;
    const content2 = renderTemplate(template, buildVariables(order2, extra));
    const phone = String(order2.phone);
    if (order2.id) {
      const existing = await strapi2.db.query(SMS_LOG_UID).findOne({
        where: {
          type,
          order: { id: order2.id },
          createdAt: { $gte: dayStartIso() }
        }
      });
      if (existing) return { ...existing, duplicated: true };
    }
    const data = { type, phone, content: content2, status: "pending" };
    if (order2.id) data.order = { id: order2.id };
    const operatorId2 = Number(extra?.operatorId);
    if (Number.isInteger(operatorId2) && operatorId2 > 0) {
      data.operator = { id: operatorId2 };
    }
    const log = await strapi2.db.query(SMS_LOG_UID).create({ data });
    try {
      const provider = strapi2.plugin("zhao-tire").service("sms-provider");
      const result = await provider.send({ phone, content: content2 });
      if (result?.sent && log?.id) {
        const sentAt = (/* @__PURE__ */ new Date()).toISOString();
        await strapi2.db.query(SMS_LOG_UID).update({
          where: { id: log.id },
          data: { status: "sent", sentAt }
        });
        log.status = "sent";
        log.sentAt = sentAt;
      }
    } catch (error2) {
      strapi2.log.warn(`[zhao-tire] 短信发送失败（保留队列）：${error2}`);
    }
    return log;
  },
  async list(query = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      200,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const where = {};
    if (query?.type) where.type = String(query.type);
    if (query?.status) where.status = String(query.status);
    if (query?.phone) where.phone = { $containsi: String(query.phone) };
    if (query?.orderNo) {
      where.order = { orderNo: { $containsi: String(query.orderNo) } };
    }
    const [data, total] = await Promise.all([
      strapi2.db.query(SMS_LOG_UID).findMany({
        where,
        orderBy: { createdAt: "DESC" },
        populate: { order: true },
        limit: pageSize,
        offset: (page - 1) * pageSize
      }),
      strapi2.db.query(SMS_LOG_UID).count({ where })
    ]);
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  async update(id, payload = {}, operatorId2) {
    const logId = Number(id);
    if (!Number.isInteger(logId) || logId <= 0) {
      throw createError("VALIDATION_FAILED", 400, "通知记录 id 不合法");
    }
    const existing = await strapi2.db.query(SMS_LOG_UID).findOne({
      where: { id: logId }
    });
    if (!existing) {
      throw createError("ORDER_NOT_FOUND", 404, "通知记录不存在");
    }
    const status = String(payload?.status || "");
    if (!LOG_STATUS.includes(status)) {
      throw createError("VALIDATION_FAILED", 400, "通知状态不合法");
    }
    const data = { status };
    if (status === "sent") data.sentAt = (/* @__PURE__ */ new Date()).toISOString();
    if (payload?.content !== void 0) {
      data.content = String(payload.content).trim();
    }
    if (Number.isInteger(Number(operatorId2)) && Number(operatorId2) > 0) {
      data.operator = { id: Number(operatorId2) };
    }
    return strapi2.db.query(SMS_LOG_UID).update({
      where: { id: logId },
      data
    });
  }
});
const ALIYUN_ENDPOINT = "https://dysmsapi.aliyuncs.com/";
const percentEncode = (value) => encodeURIComponent(value).replace(/\+/g, "%20").replace(/\*/g, "%2A").replace(/%7E/g, "~");
const readAliyunEnv = () => ({
  accessKeyId: process.env.ALIYUN_SMS_ACCESS_KEY_ID || "",
  accessKeySecret: process.env.ALIYUN_SMS_ACCESS_KEY_SECRET || "",
  signName: process.env.ALIYUN_SMS_SIGN_NAME || "",
  templateCode: process.env.ALIYUN_SMS_TEMPLATE_CODE || ""
});
const getProviderName = (strapi2) => {
  let provider = "";
  try {
    const pluginConfig = strapi2.config.get("plugin::zhao-tire") || {};
    provider = String(pluginConfig.smsProvider || "");
  } catch {
  }
  return (provider || process.env.SMS_PROVIDER || "queue").toLowerCase();
};
const sendByAliyun = async (strapi2, { phone, content: content2 }) => {
  const { accessKeyId, accessKeySecret, signName, templateCode } = readAliyunEnv();
  if (!accessKeyId || !accessKeySecret || !signName || !templateCode) {
    strapi2.log.warn(
      "[zhao-tire] ALIYUN_SMS_* 环境变量不完整，降级为待发队列"
    );
    return { provider: "queue", queued: true };
  }
  const fetchFn = globalThis.fetch;
  if (typeof fetchFn !== "function") {
    strapi2.log.warn("[zhao-tire] 当前 Node 运行时不支持 fetch，降级为待发队列");
    return { provider: "queue", queued: true };
  }
  const params = {
    AccessKeyId: accessKeyId,
    Action: "SendSms",
    Format: "JSON",
    PhoneNumbers: phone,
    RegionId: "cn-hangzhou",
    SignName: signName,
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    TemplateCode: templateCode,
    TemplateParam: JSON.stringify({ content: content2 }),
    Timestamp: (/* @__PURE__ */ new Date()).toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2017-05-25"
  };
  const canonicalQuery = Object.keys(params).sort().map((key) => `${percentEncode(key)}=${percentEncode(params[key])}`).join("&");
  const stringToSign = `POST&${percentEncode("/")}&${percentEncode(
    canonicalQuery
  )}`;
  const signature = createHmac("sha1", `${accessKeySecret}&`).update(stringToSign).digest("base64");
  const body = `${canonicalQuery}&Signature=${percentEncode(signature)}`;
  try {
    const response = await fetchFn(ALIYUN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });
    const payload = await response.json();
    if (payload?.Code !== "OK") {
      throw new Error(
        `阿里云短信发送失败：${payload?.Code || response.status} ${payload?.Message || ""}`
      );
    }
    return { provider: "aliyun", sent: true };
  } catch (error2) {
    strapi2.log.warn(`[zhao-tire] 阿里云短信发送失败，保留待发队列：${error2}`);
    return {
      provider: "aliyun",
      queued: true,
      error: String(error2?.message || error2)
    };
  }
};
const smsProvider = ({ strapi: strapi2 }) => ({
  async send(payload) {
    if (!payload || !payload.phone) {
      return { provider: "queue", queued: true, error: "缺少手机号" };
    }
    const provider = getProviderName(strapi2);
    if (provider === "aliyun") {
      return sendByAliyun(strapi2, payload);
    }
    return { provider: "queue", queued: true };
  },
  providerName() {
    return getProviderName(strapi2);
  }
});
const ORDER_UID$5 = "plugin::zhao-tire.tire-order";
const STATUS_TEXT = {
  pending_accept: "待接单",
  accepted: "待入库",
  stored: "寄存中",
  pending_outbound: "待出库",
  completed: "已完成",
  rejected: "已拒绝",
  canceled: "已取消"
};
const SERVICE_TEXT = {
  store: "到店送存",
  pickup: "上门取送"
};
const CAR_TEXT = {
  sedan: "轿车",
  suv: "SUV",
  pickup: "皮卡"
};
const PAYMENT_TEXT = {
  unpaid: "未支付",
  deposit_paid: "已付定金",
  paid: "已支付"
};
const SLOT_TEXT = {
  morning: "上午",
  afternoon: "下午"
};
const toDate = (value) => value ? String(value).slice(0, 10) : "";
const toTime = (value) => {
  if (!value) return "";
  const date2 = new Date(String(value));
  if (Number.isNaN(date2.getTime())) return String(value);
  return new Date(date2.getTime() + 8 * 60 * 60 * 1e3).toISOString().slice(0, 16).replace("T", " ");
};
const toYuan = (value) => Math.round(Number(value) || 0) / 100;
const exportService = ({ strapi: strapi2 }) => ({
  async ordersExcel(query = {}) {
    const orders = await strapi2.db.query(ORDER_UID$5).findMany({
      where: buildOrderWhere(query),
      orderBy: { createdAt: "DESC" },
      populate: { inboundPhotos: true }
    });
    const rows = orders.map((order2) => ({
      订单号: order2.orderNo,
      状态: STATUS_TEXT[order2.status] || order2.status,
      客户姓名: order2.customerName,
      手机号: order2.phone,
      车牌号: order2.plateNo || "",
      车型: CAR_TEXT[order2.carType] || order2.carType || "",
      轮胎规格: order2.tireSpec || "",
      带轮毂: order2.withWheelRim ? "是" : "否",
      服务类型: SERVICE_TEXT[order2.serviceType] || order2.serviceType,
      上门日期: toDate(order2.pickupDate),
      上门时段: SLOT_TEXT[order2.pickupSlot] || "",
      寄存开始日: toDate(order2.storageStartDate),
      预计取回日: toDate(order2.expectedReturnDate),
      到期日: toDate(order2.expireAt),
      月数: Number(order2.months) || 0,
      "套餐费(元)": toYuan(order2.amountPackage),
      "增值费(元)": toYuan(order2.amountAddon),
      "订单总额(元)": toYuan(order2.amountTotal),
      "已收(元)": toYuan(order2.paidAmount),
      支付状态: PAYMENT_TEXT[order2.paymentStatus] || order2.paymentStatus,
      仓位: order2.locationCode || "",
      入库照片数: (order2.inboundPhotos || []).length,
      入库时间: toTime(order2.inboundAt),
      出库时间: toTime(order2.outboundAt),
      下单时间: toTime(order2.createdAt),
      备注: order2.note || ""
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    sheet["!cols"] = [
      { wch: 18 },
      { wch: 10 },
      { wch: 12 },
      { wch: 14 },
      { wch: 12 },
      { wch: 8 },
      { wch: 18 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 18 },
      { wch: 18 },
      { wch: 18 },
      { wch: 24 }
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "订单");
    const output = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx"
    });
    return {
      buffer: Buffer.from(output),
      filename: `雪地胎订单-${dayStamp()}.xlsx`
    };
  }
});
const CONFIG_UID$1 = "plugin::zhao-tire.tire-config";
const COLLECTIONS = {
  packages: {
    uid: "plugin::zhao-tire.tire-package",
    fields: [
      "name",
      "code",
      "baseMonths",
      "storePrice",
      "pickupPrice",
      "extraMonthPrice",
      "overdueDayPrice",
      "durationText",
      "highlights",
      "enabled",
      "sort"
    ],
    usesDocumentService: true
  },
  addons: {
    uid: "plugin::zhao-tire.tire-addon",
    fields: ["name", "code", "price", "unitText", "enabled", "sort"],
    usesDocumentService: true
  },
  faqs: {
    uid: "plugin::zhao-tire.tire-faq",
    fields: ["question", "answer", "sort", "enabled"]
  },
  reviews: {
    uid: "plugin::zhao-tire.tire-review",
    fields: ["nickname", "content", "rating", "showOnHome", "sort"]
  },
  gallery: {
    uid: "plugin::zhao-tire.tire-gallery",
    fields: ["caption", "sort"],
    mediaField: "image"
  }
};
const CONFIG_FIELDS = [
  "bannerTitle",
  "bannerSubtitle",
  "serviceIntro",
  "warehouseConditions",
  "guarantees",
  "serviceAreaText",
  "warehouseAddress",
  "warehouseLat",
  "warehouseLng",
  "mapUrl",
  "contactPhone",
  "dailyPickupLimitMorning",
  "dailyPickupLimitAfternoon",
  "paymentOnlineEnabled",
  "depositEnabled",
  "depositRatio",
  "agreementText",
  "maxStorageDate",
  "announcement",
  "smsTemplateOverride"
];
const CONFIG_MEDIA_FIELDS = [
  { field: "bannerImage", inputKey: "bannerImageId" },
  { field: "wechatQr", inputKey: "wechatQrId" }
];
const getCollection = (name) => {
  const def = COLLECTIONS[name];
  if (!def) {
    throw createError("VALIDATION_FAILED", 400, `未知的内容类型：${name}`);
  }
  return def;
};
const pickFields = (input, fields2) => {
  const data = {};
  for (const field of fields2) {
    if (input?.[field] !== void 0) data[field] = input[field];
  }
  return data;
};
const requireId = (id) => {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw createError("VALIDATION_FAILED", 400, "记录 id 不合法");
  }
  return value;
};
const catalog = ({ strapi: strapi2 }) => ({
  async list(name) {
    const def = getCollection(name);
    return strapi2.db.query(def.uid).findMany({
      orderBy: { sort: "ASC" },
      ...def.mediaField ? { populate: { [def.mediaField]: true } } : {}
    });
  },
  async create(name, payload = {}) {
    const def = getCollection(name);
    const input = payload?.data ?? payload;
    const data = pickFields(input, def.fields);
    if (def.mediaField && input?.imageId !== void 0) {
      data[def.mediaField] = input.imageId ? { id: requireId(input.imageId) } : null;
    }
    if (def.usesDocumentService) {
      return strapi2.documents(def.uid).create({ data });
    }
    return strapi2.db.query(def.uid).create({ data });
  },
  async update(name, id, payload = {}) {
    const def = getCollection(name);
    const recordId = requireId(id);
    const input = payload?.data ?? payload;
    const data = pickFields(input, def.fields);
    if (def.mediaField && input?.imageId !== void 0) {
      data[def.mediaField] = input.imageId ? { id: requireId(input.imageId) } : null;
    }
    if (Object.keys(data).length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }
    if (def.usesDocumentService) {
      const existing = await strapi2.db.query(def.uid).findOne({
        where: { id: recordId },
        select: ["id", "documentId"]
      });
      if (!existing) {
        throw createError("ORDER_NOT_FOUND", 404, "记录不存在");
      }
      return strapi2.documents(def.uid).update({
        documentId: existing.documentId,
        data
      });
    }
    return strapi2.db.query(def.uid).update({
      where: { id: recordId },
      data
    });
  },
  async remove(name, id) {
    const def = getCollection(name);
    const recordId = requireId(id);
    if (def.usesDocumentService) {
      const existing = await strapi2.db.query(def.uid).findOne({
        where: { id: recordId },
        select: ["id", "documentId"]
      });
      if (!existing) {
        throw createError("ORDER_NOT_FOUND", 404, "记录不存在");
      }
      await strapi2.documents(def.uid).delete({
        documentId: existing.documentId
      });
      return { id: recordId, deleted: true };
    }
    await strapi2.db.query(def.uid).delete({ where: { id: recordId } });
    return { id: recordId, deleted: true };
  },
  async getConfig() {
    const config2 = await strapi2.documents(CONFIG_UID$1).findFirst({
      populate: { bannerImage: true, wechatQr: true }
    });
    return config2 || {};
  },
  async updateConfig(payload = {}) {
    const input = payload?.data ?? payload;
    const data = pickFields(input, CONFIG_FIELDS);
    for (const media of CONFIG_MEDIA_FIELDS) {
      if (input?.[media.inputKey] !== void 0) {
        data[media.field] = input[media.inputKey] ? { id: requireId(input[media.inputKey]) } : null;
      }
    }
    if (Object.keys(data).length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }
    const existing = await strapi2.documents(CONFIG_UID$1).findFirst(
      {}
    );
    const populate2 = { bannerImage: true, wechatQr: true };
    if (existing?.documentId) {
      return strapi2.documents(CONFIG_UID$1).update({
        documentId: existing.documentId,
        data,
        populate: populate2
      });
    }
    return strapi2.documents(CONFIG_UID$1).create({ data });
  }
});
const ORDER_UID$4 = "plugin::zhao-tire.tire-order";
const ACTIVE_STATUSES$1 = ["stored", "pending_outbound"];
const TIMEZONE_OFFSET_MS = 8 * 60 * 60 * 1e3;
const DAY_MS = 24 * 60 * 60 * 1e3;
const toDateOnly = (value) => value ? String(value).slice(0, 10) : "";
const shanghaiToday = (now = /* @__PURE__ */ new Date()) => new Date(now.getTime() + TIMEZONE_OFFSET_MS).toISOString().slice(0, 10);
const dateAfter = (offsetDays, now = /* @__PURE__ */ new Date()) => new Date(now.getTime() + TIMEZONE_OFFSET_MS + offsetDays * DAY_MS).toISOString().slice(0, 10);
const remainingDays = (expireAt) => {
  const date2 = toDateOnly(expireAt);
  if (!date2) return 0;
  const target = Date.parse(`${date2}T00:00:00+08:00`);
  const today = Date.parse(`${shanghaiToday()}T00:00:00+08:00`);
  if (Number.isNaN(target) || Number.isNaN(today)) return 0;
  return Math.round((target - today) / DAY_MS);
};
const withRemaining = (order2) => ({
  ...order2,
  remainingDays: remainingDays(order2.expireAt)
});
const REMIND_CONTENT = "{name}您好，您的雪地胎寄存订单 {orderNo} 将于 {expireAt} 到期（剩余 {daysLeft} 天），请及时取胎或续费。";
const inventory = ({ strapi: strapi2 }) => ({
  async list(query = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const where = { status: { $in: ACTIVE_STATUSES$1 } };
    const locationCode = String(query?.locationCode || "").trim();
    if (locationCode) {
      where.locationCode = { $containsi: locationCode };
    }
    const keyword = String(query?.keyword || "").trim();
    if (keyword) {
      where.$or = [
        { orderNo: { $containsi: keyword } },
        { phone: { $containsi: keyword } },
        { plateNo: { $containsi: keyword } },
        { customerName: { $containsi: keyword } }
      ];
    }
    const [data, total] = await Promise.all([
      strapi2.db.query(ORDER_UID$4).findMany({
        where,
        orderBy: { expireAt: "ASC" },
        populate: { inboundPhotos: true },
        limit: pageSize,
        offset: (page - 1) * pageSize
      }),
      strapi2.db.query(ORDER_UID$4).count({ where })
    ]);
    return {
      data: data.map(withRemaining),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  },
  async expiring(query = {}) {
    const rawDays = Number(query?.days);
    const days = Number.isInteger(rawDays) && rawDays > 0 ? rawDays : 7;
    const limitDate = dateAfter(days);
    const where = {
      status: { $in: ACTIVE_STATUSES$1 },
      expireAt: { $lte: limitDate }
    };
    const locationCode = String(query?.locationCode || "").trim();
    if (locationCode) {
      where.locationCode = { $containsi: locationCode };
    }
    const data = await strapi2.db.query(ORDER_UID$4).findMany({
      where,
      orderBy: { expireAt: "ASC" },
      populate: { inboundPhotos: true }
    });
    return {
      data: data.map(withRemaining),
      days,
      limitDate,
      total: data.length
    };
  },
  async remind(payload = {}, operatorId2) {
    const rawIds = payload?.ids ?? payload?.orderIds;
    const ids = (Array.isArray(rawIds) ? rawIds : [rawIds]).map((item) => Number(item)).filter((id) => Number.isInteger(id) && id > 0);
    if (ids.length === 0) {
      throw createError("VALIDATION_FAILED", 400, "请选择需要提醒的订单");
    }
    const orders = await strapi2.db.query(ORDER_UID$4).findMany({
      where: { id: { $in: ids } }
    });
    const notify2 = strapi2.plugin("zhao-tire").service("notify");
    let queued = 0;
    let skipped = 0;
    for (const order2 of orders) {
      if (!order2.phone) {
        skipped += 1;
        continue;
      }
      try {
        await notify2.enqueue("manual", order2, {
          content: REMIND_CONTENT,
          operatorId: operatorId2
        });
        queued += 1;
      } catch (error2) {
        skipped += 1;
        strapi2.log.warn(
          `[zhao-tire] 批量提醒失败（${order2.orderNo}）：${error2}`
        );
      }
    }
    return {
      requested: ids.length,
      queued,
      skipped: skipped + (ids.length - orders.length)
    };
  }
});
const ORDER_UID$3 = "plugin::zhao-tire.tire-order";
const ACTIVE_STATUSES = ["stored", "pending_outbound"];
const customer = ({ strapi: strapi2 }) => ({
  async list(query = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const keyword = String(query?.keyword || "").trim();
    const where = {};
    if (keyword) {
      where.$or = [
        { phone: { $containsi: keyword } },
        { customerName: { $containsi: keyword } },
        { plateNo: { $containsi: keyword } }
      ];
    }
    const orders = await strapi2.db.query(ORDER_UID$3).findMany({
      where,
      orderBy: { createdAt: "DESC" }
    });
    const byPhone = /* @__PURE__ */ new Map();
    for (const order2 of orders) {
      const phone = String(order2.phone || "").trim();
      if (!phone) continue;
      let entry = byPhone.get(phone);
      if (!entry) {
        entry = {
          phone,
          customerName: order2.customerName || "",
          orderCount: 0,
          storedCount: 0,
          totalAmount: 0,
          latestOrderNo: order2.orderNo,
          latestCreatedAt: order2.createdAt,
          orders: []
        };
        byPhone.set(phone, entry);
      }
      entry.orderCount += 1;
      entry.totalAmount += Number(order2.amountTotal) || 0;
      if (ACTIVE_STATUSES.includes(order2.status)) entry.storedCount += 1;
      entry.orders.push({
        id: order2.id,
        orderNo: order2.orderNo,
        status: order2.status,
        serviceType: order2.serviceType,
        plateNo: order2.plateNo || "",
        locationCode: order2.locationCode || "",
        createdAt: order2.createdAt,
        expireAt: order2.expireAt,
        amountTotal: Number(order2.amountTotal) || 0,
        paidAmount: Number(order2.paidAmount) || 0
      });
    }
    const data = Array.from(byPhone.values());
    const total = data.length;
    const start = (page - 1) * pageSize;
    return {
      data: data.slice(start, start + pageSize),
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize)
      }
    };
  }
});
const RC_UID = "plugin::zhao-tire.tire-referral-code";
const ORDER_UID$2 = "plugin::zhao-tire.tire-order";
const SHARE_UID = "plugin::zhao-tire.tire-share-record";
const REWARD_UID = "plugin::zhao-tire.tire-referral-reward";
const PACKAGE_UID = "plugin::zhao-tire.tire-package";
const CONFIG_UID = "plugin::zhao-tire.tire-config";
const PHONE_PATTERN = /^1[3-9]\d{9}$/;
const INVITE_CODE_CHARS = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const INVITE_CODE_LEN = 6;
const REFERRAL_THRESHOLD = 3;
const DEFAULT_REWARD_CAP = 6900;
const DEFAULT_REWARD_VALID_DAYS = 365;
const DEFAULT_REWARD_YEAR_LIMIT = 4;
const DEFAULT_DAILY_BIND_LIMIT = 5;
function throwErr$2(code, status, message) {
  const e = new Error(message);
  e.code = code;
  e.status = status;
  throw e;
}
function generateCode() {
  let result = "";
  for (let i = 0; i < INVITE_CODE_LEN; i += 1) {
    result += INVITE_CODE_CHARS.charAt(
      Math.floor(Math.random() * INVITE_CODE_CHARS.length)
    );
  }
  return result;
}
function generateRewardNo() {
  const now = /* @__PURE__ */ new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1e4).toString().padStart(4, "0");
  return `RW${stamp}${rand}`;
}
const toNumber$2 = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
async function readConfig(strapi2) {
  const config2 = await strapi2.db.query(CONFIG_UID).findOne() || {};
  return {
    rewardCap: toNumber$2(config2.referralRewardCap, DEFAULT_REWARD_CAP),
    rewardValidDays: toNumber$2(
      config2.referralRewardValidDays,
      DEFAULT_REWARD_VALID_DAYS
    ),
    rewardYearLimit: toNumber$2(
      config2.referralRewardYearLimit,
      DEFAULT_REWARD_YEAR_LIMIT
    ),
    dailyBindLimit: toNumber$2(
      config2.referralDailyBindLimit,
      DEFAULT_DAILY_BIND_LIMIT
    )
  };
}
async function ensureCode(strapi2, phone, nickname) {
  let row = await strapi2.db.query(RC_UID).findOne({ where: { phone } });
  if (row) {
    if (nickname && nickname !== row.nickname) {
      row = await strapi2.db.query(RC_UID).update({
        where: { id: row.id },
        data: { nickname }
      });
    }
    return row;
  }
  let created = null;
  let lastError = null;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = generateCode();
    try {
      created = await strapi2.db.query(RC_UID).create({
        data: { code, phone, nickname: nickname || null }
      });
      break;
    } catch (error2) {
      lastError = error2;
      if (String(error2?.message || "").toLowerCase().includes("unique")) continue;
      throw error2;
    }
  }
  if (!created) throw lastError || new Error("邀请码生成失败");
  return created;
}
async function basePackageFee(strapi2) {
  const packages = await strapi2.db.query(PACKAGE_UID).findMany({
    where: { enabled: true },
    orderBy: { sort: "ASC" }
  });
  for (const pkg of packages || []) {
    const price = toNumber$2(pkg.storePrice) || toNumber$2(pkg.pickupPrice);
    if (price > 0) return price;
  }
  return 0;
}
function dayStart(date2) {
  const copy = new Date(date2);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
const referral = ({ strapi: strapi2 }) => ({
  /** 获取或创建某手机号的邀请码（返回邀请码 + 计数 + 奖励情况） */
  async ensureForPhone(phone, nickname) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr$2("VALIDATION_FAILED", 400, "手机号不合法");
    }
    return ensureCode(strapi2, phone, nickname);
  },
  /** 校验邀请码是否存在，返回码的归属手机号；不存在抛错 */
  async validate(referralCode) {
    const code = String(referralCode || "").trim().toUpperCase();
    if (!code) throwErr$2("VALIDATION_FAILED", 400, "邀请码不能为空");
    if (code.length !== INVITE_CODE_LEN) throwErr$2("VALIDATION_FAILED", 400, "邀请码格式错误");
    const row = await strapi2.db.query(RC_UID).findOne({ where: { code } });
    if (!row) throwErr$2("REFERRAL_CODE_INVALID", 400, "邀请码不存在");
    return row;
  },
  /**
   * 下单后绑定邀请关系（订单创建成功后调用）
   * - 禁止自邀
   * - 同一手机号 / openid / 设备只能绑定一个邀请人
   * - 单邀请人每日绑定上限，超限进 pending_review
   * - 被邀请人仅首单可绑定
   */
  async attachReferral(order2, referralCode, extra = {}) {
    if (!order2?.id) return null;
    const phone = String(order2.phone || "");
    const code = String(referralCode || "").trim().toUpperCase();
    if (!code) return null;
    const rc = await this.validate(code);
    if (rc.phone === phone) {
      throwErr$2("REFERRAL_SELF", 400, "不能使用自己的邀请码");
    }
    const openid = String(extra.openid || "").trim().slice(0, 128);
    const deviceId = String(extra.deviceId || "").trim().slice(0, 128);
    const ip = String(extra.ip || "").trim().slice(0, 64);
    const previous = await strapi2.db.query(ORDER_UID$2).count({
      where: {
        phone,
        id: { $ne: order2.id }
      }
    });
    if (previous > 0) {
      strapi2.log.warn(
        `[zhao-tire] referral skipped: phone ${phone} already has ${previous} order(s)`
      );
      return { skipped: true, reason: "not_first_order" };
    }
    const dedupeKey = openid ? `openid:${openid}` : deviceId ? `device:${deviceId}` : `phone:${phone}`;
    const exists = await strapi2.db.query(SHARE_UID).findOne({ where: { dedupeKey } });
    if (exists) {
      return { skipped: true, reason: "already_bound", record: exists };
    }
    const samePhone = await strapi2.db.query(SHARE_UID).findOne({
      where: { inviteePhone: phone }
    });
    if (samePhone && samePhone.referrerPhone !== rc.phone) {
      return { skipped: true, reason: "invitee_bound_to_other" };
    }
    const boundAt = /* @__PURE__ */ new Date();
    const sameDayCount = await strapi2.db.query(SHARE_UID).count({
      where: {
        referrerPhone: rc.phone,
        boundAt: { $gte: dayStart(boundAt).toISOString() },
        status: { $in: ["bound", "valid"] }
      }
    });
    let status = "bound";
    let riskReason = null;
    if (sameDayCount >= (await readConfig(strapi2)).dailyBindLimit) {
      status = "pending_review";
      riskReason = "daily_bind_limit";
    }
    const record2 = await strapi2.db.query(SHARE_UID).create({
      data: {
        shareCode: rc.code,
        referrerPhone: rc.phone,
        inviteePhone: phone,
        inviteeOpenid: openid || null,
        deviceId: deviceId || null,
        ip: ip || null,
        orderNo: order2.orderNo,
        orderId: order2.id,
        status,
        riskReason,
        dedupeKey,
        boundAt: boundAt.toISOString()
      }
    });
    await strapi2.db.query(ORDER_UID$2).update({
      where: { id: order2.id },
      data: { referralCode: rc.code, referrerPhone: rc.phone }
    });
    if (status === "bound") {
      await strapi2.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { usedCount: toNumber$2(rc.usedCount) + 1 }
      });
    }
    return record2;
  },
  /** 被邀请人入库成功：把邀请置为有效并触发「每满 3 人发 1 次」 */
  async markValidOnInbound(orderNo2) {
    const order2 = await strapi2.db.query(ORDER_UID$2).findOne({ where: { orderNo: orderNo2 } });
    if (!order2) return null;
    let record2 = await strapi2.db.query(SHARE_UID).findOne({
      where: { orderNo: orderNo2 },
      orderBy: { id: "DESC" }
    });
    if (!record2 && order2.phone) {
      record2 = await strapi2.db.query(SHARE_UID).findOne({
        where: { inviteePhone: order2.phone, status: "bound" },
        orderBy: { id: "DESC" }
      });
    }
    if (!record2) return null;
    if (record2.status === "valid") return { duplicated: true, record: record2 };
    if (record2.status !== "bound") {
      return { skipped: true, reason: record2.status, record: record2 };
    }
    const now = (/* @__PURE__ */ new Date()).toISOString();
    await strapi2.db.query(SHARE_UID).update({
      where: { id: record2.id },
      data: { status: "valid", validAt: now }
    });
    let rc = await strapi2.db.query(RC_UID).findOne({
      where: { phone: record2.referrerPhone }
    });
    if (!rc) rc = await ensureCode(strapi2, record2.referrerPhone);
    const completed = toNumber$2(rc.completedCount) + 1;
    let pendingFree = toNumber$2(rc.pendingFreeCount);
    let totalFree = toNumber$2(rc.totalFreeCount);
    const rewarded = completed >= REFERRAL_THRESHOLD && completed % REFERRAL_THRESHOLD === 0;
    let reward = null;
    if (rewarded) {
      reward = await this.issueReward(rc, { source: "referral_3" });
      if (reward?.issued) {
        pendingFree += 1;
        totalFree += 1;
      }
    }
    const debtCount = toNumber$2(rc.debtCount) + (reward?.debt ? 1 : 0);
    await strapi2.db.query(RC_UID).update({
      where: { id: rc.id },
      data: { completedCount: completed, pendingFreeCount: pendingFree, totalFreeCount: totalFree, debtCount }
    });
    return {
      referralCode: rc.code,
      referrerPhone: rc.phone,
      completedCount: completed,
      rewarded,
      reward,
      pendingFreeCount: pendingFree,
      recordId: record2.id
    };
  },
  /**
   * 发放一次免单额度（基础套餐费，受单次封顶 / 年度上限约束）
   * - 额度快照 = min(基础套餐价, referralRewardCap)
   * - cap = 0 时表示不封顶
   * - debtCount > 0 时先抵消欠账，不发新券
   */
  async issueReward(rc, options2 = {}) {
    const config2 = await readConfig(strapi2);
    const phone = String(rc.phone || "");
    if (!options2.force && toNumber$2(rc.debtCount) > 0) {
      return { issued: false, debt: true, reason: "debt_offset" };
    }
    if (!options2.force) {
      const yearStart = new Date((/* @__PURE__ */ new Date()).getFullYear(), 0, 1);
      const yearCount = await strapi2.db.query(REWARD_UID).count({
        where: {
          phone,
          source: "referral_3",
          issuedAt: { $gte: yearStart.toISOString() }
        }
      });
      if (yearCount >= config2.rewardYearLimit) {
        return { issued: false, reason: "year_limit" };
      }
    }
    const baseFee = await basePackageFee(strapi2);
    const cap = config2.rewardCap;
    const amount = cap > 0 ? Math.min(baseFee || cap, cap) : baseFee;
    const issuedAt = /* @__PURE__ */ new Date();
    const expiresAt = new Date(
      issuedAt.getTime() + Math.max(1, config2.rewardValidDays) * 864e5
    );
    const reward = await strapi2.db.query(REWARD_UID).create({
      data: {
        rewardNo: generateRewardNo(),
        phone,
        amount,
        source: options2.source || "referral_3",
        status: "available",
        issuedAt: issuedAt.toISOString(),
        expiresAt: expiresAt.toISOString(),
        note: options2.note || "每满 3 个有效邀请赠送 1 次基础套餐免单"
      }
    });
    return { issued: true, reward, amount };
  },
  /**
   * 下单时预占一张奖励券（避免并发重复使用）
   * 返回 { rewardNo, discount, amount }；无可用券返回 null
   */
  async reserveReward(phone, amountPackage) {
    const now = /* @__PURE__ */ new Date();
    const rows = await strapi2.db.query(REWARD_UID).findMany({
      where: {
        phone,
        status: "available",
        $or: [{ expiresAt: null }, { expiresAt: { $gt: now.toISOString() } }]
      },
      orderBy: { expiresAt: "ASC" },
      limit: 5
    });
    for (const row of rows || []) {
      const claimed = await strapi2.db.query(REWARD_UID).update({
        where: { id: row.id, status: "available" },
        data: { status: "reserved", usedAt: now.toISOString() }
      });
      if (!claimed) continue;
      const amount = toNumber$2(row.amount);
      const discount = amount > 0 ? Math.min(amount, amountPackage) : amountPackage;
      return { rewardNo: row.rewardNo, discount, amount, reward: claimed };
    }
    return null;
  },
  /** 订单创建成功后把预占券绑定到订单 */
  async bindReward(rewardNo, orderNo2) {
    if (!rewardNo) return null;
    return strapi2.db.query(REWARD_UID).update({
      where: { rewardNo, status: "reserved" },
      data: { status: "used", usedOrderNo: orderNo2, usedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
  },
  /** 订单创建失败时释放预占券 */
  async releaseReward(rewardNo) {
    if (!rewardNo) return null;
    return strapi2.db.query(REWARD_UID).update({
      where: { rewardNo, status: "reserved" },
      data: { status: "available", usedOrderNo: null, usedAt: null }
    });
  },
  /** 查询某手机号的可用奖励券（前端展示） */
  async listRewards(phone) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr$2("VALIDATION_FAILED", 400, "手机号不合法");
    }
    const now = /* @__PURE__ */ new Date();
    const rows = await strapi2.db.query(REWARD_UID).findMany({
      where: { phone },
      orderBy: { expiresAt: "ASC" },
      limit: 50
    });
    const rewards = (rows || []).map((row) => {
      const expired = row.status === "available" && row.expiresAt && new Date(row.expiresAt).getTime() <= now.getTime();
      return {
        rewardNo: row.rewardNo,
        amount: toNumber$2(row.amount),
        source: row.source,
        status: expired ? "expired" : row.status,
        issuedAt: row.issuedAt,
        expiresAt: row.expiresAt,
        usedOrderNo: row.usedOrderNo || null
      };
    });
    return {
      rewards,
      available: rewards.filter((item) => item.status === "available")
    };
  },
  /** 退款回滚：作废该订单产生的有效邀请与未使用奖励 */
  async rollbackForOrder(orderNo2) {
    const record2 = await strapi2.db.query(SHARE_UID).findOne({
      where: { orderNo: orderNo2, status: "valid" },
      orderBy: { id: "DESC" }
    });
    if (!record2) return null;
    await strapi2.db.query(SHARE_UID).update({
      where: { id: record2.id },
      data: { status: "rolled_back", riskReason: "order_refunded" }
    });
    const rc = await strapi2.db.query(RC_UID).findOne({
      where: { phone: record2.referrerPhone }
    });
    if (!rc) return { rolledBack: true };
    const completed = Math.max(0, toNumber$2(rc.completedCount) - 1);
    let pendingFree = Math.max(0, toNumber$2(rc.pendingFreeCount));
    let debtCount = toNumber$2(rc.debtCount);
    const milestoneBroken = toNumber$2(rc.completedCount) >= REFERRAL_THRESHOLD && toNumber$2(rc.completedCount) % REFERRAL_THRESHOLD === 0;
    if (milestoneBroken) {
      const latest = await strapi2.db.query(REWARD_UID).findOne({
        where: { phone: rc.phone, source: "referral_3", status: { $in: ["available", "reserved"] } },
        orderBy: { id: "DESC" }
      });
      if (latest) {
        await strapi2.db.query(REWARD_UID).update({
          where: { id: latest.id, status: latest.status },
          data: { status: "void", note: "退款回滚作废" }
        });
        pendingFree = Math.max(0, pendingFree - 1);
      } else {
        debtCount += 1;
      }
    }
    await strapi2.db.query(RC_UID).update({
      where: { id: rc.id },
      data: { completedCount: completed, pendingFreeCount: pendingFree, debtCount }
    });
    return { rolledBack: true, completedCount: completed, pendingFreeCount: pendingFree, debtCount };
  },
  /** 订单退款后归还该单使用的奖励券 */
  async restoreUsedReward(order2) {
    if (!order2?.rewardNo) return null;
    const reward = await strapi2.db.query(REWARD_UID).findOne({
      where: { rewardNo: order2.rewardNo, status: "used" }
    });
    if (!reward) return null;
    const rc = await strapi2.db.query(RC_UID).findOne({
      where: { phone: String(order2.phone || reward.phone) }
    });
    await strapi2.db.query(REWARD_UID).update({
      where: { id: reward.id, status: "used" },
      data: { status: "available", usedOrderNo: null, usedAt: null, note: "订单退款返还" }
    });
    if (rc) {
      await strapi2.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { pendingFreeCount: toNumber$2(rc.pendingFreeCount) + 1 }
      });
    }
    return { rewardNo: reward.rewardNo };
  },
  /**
   * 兼容旧接口：支付完成时累加计数（新流程已改为入库触发）
   */
  async markCompleted(orderNo2) {
    return this.markValidOnInbound(orderNo2);
  },
  /** 兼容旧接口：扣减一次免单额度，返回是否成功 */
  async consumeFree(phone) {
    const reserved = await this.reserveReward(phone, 1e8);
    if (!reserved) return false;
    await strapi2.db.query(REWARD_UID).update({
      where: { rewardNo: reserved.rewardNo, status: "reserved" },
      data: { status: "used", usedAt: (/* @__PURE__ */ new Date()).toISOString() }
    });
    const rc = await strapi2.db.query(RC_UID).findOne({ where: { phone } });
    if (rc) {
      await strapi2.db.query(RC_UID).update({
        where: { id: rc.id },
        data: { pendingFreeCount: Math.max(0, toNumber$2(rc.pendingFreeCount) - 1) }
      });
    }
    return true;
  },
  /** 查询某手机号的邀请码详情 + 奖励进度（前端"我的邀请码"页用） */
  async getProfile(phone) {
    if (!PHONE_PATTERN.test(phone)) {
      throwErr$2("VALIDATION_FAILED", 400, "手机号不合法");
    }
    const rc = await strapi2.db.query(RC_UID).findOne({ where: { phone } });
    if (!rc) {
      return ensureCode(strapi2, phone);
    }
    return rc;
  }
});
const PAYMENT_UID = "plugin::zhao-tire.tire-payment";
const ORDER_UID$1 = "plugin::zhao-tire.tire-order";
const CHANNELS = ["wechat", "store_pay", "pickup_pay", "deposit", "full", "mock"];
const toNumber$1 = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
function throwErr$1(code, status, message, details) {
  const error2 = new Error(message);
  error2.code = code;
  error2.status = status;
  if (details) error2.details = details;
  throw error2;
}
function generatePaymentNo() {
  const now = /* @__PURE__ */ new Date();
  const pad = (value) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(
    now.getDate()
  )}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
  const rand = Math.floor(Math.random() * 1e5).toString().padStart(5, "0");
  return `PAY${stamp}${rand}`;
}
const payment = ({ strapi: strapi2 }) => ({
  async findOrder(orderNo2) {
    const order2 = await strapi2.db.query(ORDER_UID$1).findOne({ where: { orderNo: orderNo2 } });
    if (!order2) throwErr$1("ORDER_NOT_FOUND", 404, "订单不存在");
    return order2;
  },
  outstandingOf(order2) {
    return Math.max(0, toNumber$1(order2.amountTotal) - toNumber$1(order2.paidAmount));
  },
  /** 创建 pending 流水（幂等键已存在则直接返回原流水） */
  async ensurePending(params) {
    const channel = CHANNELS.includes(params.channel) ? params.channel : "store_pay";
    const existing = await strapi2.db.query(PAYMENT_UID).findOne({
      where: { idempotencyKey: params.idempotencyKey }
    });
    if (existing) return existing;
    if (params.amount <= 0) {
      throwErr$1("AMOUNT_INVALID", 400, "支付金额必须大于 0");
    }
    const outstanding = this.outstandingOf(params.order);
    if (params.amount > outstanding) {
      throwErr$1("AMOUNT_EXCEEDED", 400, "支付金额超过订单未结金额", {
        outstanding,
        amount: params.amount
      });
    }
    return strapi2.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: params.order.orderNo,
        orderId: params.order.id,
        channel,
        amount: params.amount,
        status: "pending",
        idempotencyKey: params.idempotencyKey,
        provider: params.provider || "manual",
        payerOpenid: params.payerOpenid || null,
        externalNo: params.externalNo || null,
        note: params.note || null,
        raw: params.raw || null
      }
    });
  },
  /**
   * 把流水置为 paid 并同步订单累计金额
   * - 幂等：已 paid 的流水直接返回 duplicated
   * - 金额上限：流水金额不得超过订单未结金额
   */
  async settle(paymentNo, options2 = {}) {
    const payment2 = await strapi2.db.query(PAYMENT_UID).findOne({
      where: { paymentNo }
    });
    if (!payment2) throwErr$1("PAYMENT_NOT_FOUND", 404, "支付流水不存在");
    if (payment2.status === "paid") {
      return { duplicated: true, payment: payment2 };
    }
    if (payment2.status !== "pending") {
      throwErr$1("PAYMENT_STATE_INVALID", 400, "该流水当前状态不可确认", {
        status: payment2.status
      });
    }
    const order2 = await this.findOrder(payment2.orderNo);
    const total = toNumber$1(order2.amountTotal);
    const paid = toNumber$1(order2.paidAmount);
    const outstanding = Math.max(0, total - paid);
    if (payment2.amount > outstanding) {
      throwErr$1("AMOUNT_EXCEEDED", 400, "支付金额超过订单未结金额", {
        outstanding,
        amount: payment2.amount
      });
    }
    const paidAmount = paid + payment2.amount;
    const paymentStatus = total <= 0 || paidAmount >= total ? "paid" : paidAmount > 0 ? "deposit_paid" : "unpaid";
    const paidAt = (/* @__PURE__ */ new Date()).toISOString();
    const updatedPayment = await strapi2.db.query(PAYMENT_UID).update({
      where: { id: payment2.id, status: "pending" },
      data: {
        status: "paid",
        paidAt,
        externalNo: options2.externalNo || payment2.externalNo || null,
        raw: options2.raw || payment2.raw || null
      }
    });
    if (!updatedPayment) {
      const again = await strapi2.db.query(PAYMENT_UID).findOne({
        where: { paymentNo }
      });
      if (again?.status === "paid") return { duplicated: true, payment: again };
      throwErr$1("PAYMENT_STATE_INVALID", 409, "流水状态已被修改，请刷新后重试");
    }
    await strapi2.db.query(ORDER_UID$1).update({
      where: { id: order2.id },
      data: { paidAmount, paymentStatus }
    });
    return {
      duplicated: false,
      payment: updatedPayment,
      order: { orderNo: order2.orderNo, paidAmount, paymentStatus }
    };
  },
  /** 人工收款登记（门店收银 / 取货付款 / 后台确认到账） */
  async recordManual(params) {
    const channel = CHANNELS.includes(params.channel) ? params.channel : "store_pay";
    const idempotencyKey = params.idempotencyKey || `manual:${params.order.orderNo}:${channel}:${params.amount}:${params.operatorId || 0}:${Date.now()}`;
    const existing = await strapi2.db.query(PAYMENT_UID).findOne({
      where: { idempotencyKey }
    });
    if (existing) {
      if (existing.status === "pending" && params.status === "paid") {
        return this.settle(existing.paymentNo);
      }
      return { duplicated: true, payment: existing };
    }
    if (params.amount <= 0) throwErr$1("AMOUNT_INVALID", 400, "收款金额必须大于 0");
    const outstanding = this.outstandingOf(params.order);
    if (params.amount > outstanding) {
      throwErr$1("AMOUNT_EXCEEDED", 400, "收款金额超过订单未结金额", {
        outstanding,
        amount: params.amount
      });
    }
    const payment2 = await strapi2.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: params.order.orderNo,
        orderId: params.order.id,
        channel,
        amount: params.amount,
        status: "pending",
        idempotencyKey,
        provider: "manual",
        operatorName: params.operatorName || null,
        operator: params.operatorId || null,
        note: params.note || null
      }
    });
    if (params.status === "pending") {
      return { duplicated: false, payment: payment2, pending: true };
    }
    return this.settle(payment2.paymentNo, { externalNo: `MANUAL-${payment2.paymentNo}` });
  },
  async list(query) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const where = {};
    if (query.status) where.status = query.status;
    if (query.orderNo) where.orderNo = query.orderNo;
    if (query.channel) where.channel = query.channel;
    const [rows, total] = await Promise.all([
      strapi2.db.query(PAYMENT_UID).findMany({
        where,
        orderBy: { id: "DESC" },
        limit: pageSize,
        offset: (page - 1) * pageSize
      }),
      strapi2.db.query(PAYMENT_UID).count({ where })
    ]);
    return {
      data: rows,
      meta: { page, pageSize, total, pageCount: Math.ceil(total / pageSize) }
    };
  },
  /** 退款：回滚累计金额，整单退清时回滚邀请与奖励 */
  async refund(params) {
    const order2 = params.order;
    const paid = toNumber$1(order2.paidAmount);
    const amount = Math.round(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throwErr$1("AMOUNT_INVALID", 400, "退款金额必须大于 0");
    }
    if (amount > paid) {
      throwErr$1("REFUND_EXCEEDED", 400, "退款金额超过已收金额", { paid });
    }
    const total = toNumber$1(order2.amountTotal);
    const paidAmount = paid - amount;
    const paymentStatus = paidAmount <= 0 ? "unpaid" : paidAmount >= total ? "paid" : "deposit_paid";
    const refundedAt = (/* @__PURE__ */ new Date()).toISOString();
    const payment2 = await strapi2.db.query(PAYMENT_UID).create({
      data: {
        paymentNo: generatePaymentNo(),
        orderNo: order2.orderNo,
        orderId: order2.id,
        channel: order2.paymentMethod || "store_pay",
        amount: -amount,
        status: "refunded",
        idempotencyKey: `refund:${order2.orderNo}:${amount}:${Date.now()}`,
        provider: "manual",
        operatorName: params.operatorName || null,
        operator: params.operatorId || null,
        refundedAmount: amount,
        refundNote: params.note || null,
        paidAt: refundedAt,
        note: "退款"
      }
    });
    await strapi2.db.query(ORDER_UID$1).update({
      where: { id: order2.id },
      data: { paidAmount, paymentStatus }
    });
    let rollback = null;
    if (paidAmount <= 0) {
      const referralService = strapi2.service("plugin::zhao-tire.referral");
      await referralService.restoreUsedReward(order2);
      rollback = await referralService.rollbackForOrder(order2.orderNo);
      await strapi2.db.query(ORDER_UID$1).update({
        where: { id: order2.id },
        data: { rewardNo: null, rewardAmount: 0 }
      });
    }
    return {
      payment: payment2,
      order: { orderNo: order2.orderNo, paidAmount, paymentStatus },
      rollback
    };
  }
});
const ORDER_UID = "plugin::zhao-tire.tire-order";
const toNumber = (value, fallback = 0) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
};
function throwErr(code, status, message, details) {
  const error2 = new Error(message);
  error2.code = code;
  error2.status = status;
  if (details) error2.details = details;
  throw error2;
}
function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value ?? null);
}
function signMockPayload(payload, secret) {
  return crypto.createHmac("sha256", secret).update(canonicalize(payload)).digest("hex");
}
const pay = ({ strapi: strapi2 }) => ({
  provider() {
    const provider = String(process.env.PAY_PROVIDER || "mock").toLowerCase();
    return provider === "wechat" ? "wechat" : "mock";
  },
  mockSecret() {
    const secret = String(process.env.PAY_MOCK_SECRET || "tire-mock-local-secret");
    if (!process.env.PAY_MOCK_SECRET) {
      strapi2.log.warn(
        "[zhao-tire] PAY_MOCK_SECRET 未配置，使用开发默认值（仅限 mock 通道）"
      );
    }
    return secret;
  },
  publicBase() {
    return String(process.env.PAY_PUBLIC_BASE || "https://www.joho.cn").replace(/\/$/, "");
  },
  /** 下单支付：创建 pending 流水并返回收银台参数（mock 或微信 JSAPI） */
  async prepay(payload) {
    const provider = this.provider();
    const orderNo2 = String(payload?.orderNo || "").trim();
    if (!orderNo2) throwErr("VALIDATION_FAILED", 400, "orderNo 不能为空");
    const order2 = await strapi2.db.query(ORDER_UID).findOne({ where: { orderNo: orderNo2 } });
    if (!order2) throwErr("ORDER_NOT_FOUND", 404, "订单不存在");
    const paymentService2 = strapi2.service("plugin::zhao-tire.payment");
    const outstanding = paymentService2.outstandingOf(order2);
    if (outstanding <= 0) {
      throwErr("ORDER_ALREADY_PAID", 400, "订单已结清，无需支付", {
        paymentStatus: order2.paymentStatus
      });
    }
    if (provider === "wechat") {
      const wechatPay = strapi2.service("plugin::zhao-tire.wechat-pay");
      return wechatPay.prepay({
        order: order2,
        amount: outstanding,
        openid: payload?.openid,
        idempotencyKey: payload?.idempotencyKey
      });
    }
    const channel = payload?.channel === "pickup_pay" ? "pickup_pay" : "wechat";
    const idempotencyKey = String(payload?.idempotencyKey || "").trim() || `prepay:${order2.orderNo}:${channel}:${outstanding}`;
    const payment2 = await paymentService2.ensurePending({
      order: order2,
      amount: outstanding,
      channel,
      idempotencyKey,
      provider,
      externalNo: `MOCK-${Date.now()}`,
      raw: { provider, channel }
    });
    if (payment2.status === "paid") {
      return { paid: true, paymentNo: payment2.paymentNo, amount: payment2.amount };
    }
    return {
      paymentNo: payment2.paymentNo,
      amount: payment2.amount,
      provider,
      mock: provider === "mock",
      payUrl: `${this.publicBase()}/tire/#/pages/pay/mock?paymentNo=${payment2.paymentNo}`,
      orderNo: order2.orderNo
    };
  },
  /** 支付异步回调：mock 用 HMAC，微信走 APIv3 验签/解密；失败均不改单 */
  async notify(payload, signature, rawBody, headers) {
    if (this.provider() === "wechat") {
      const wechatPay = strapi2.service("plugin::zhao-tire.wechat-pay");
      return wechatPay.notify({
        headers,
        rawBody: rawBody || JSON.stringify(payload || {}),
        body: payload
      });
    }
    const sign = String(signature || "").trim();
    if (!sign) throwErr("INVALID_SIGNATURE", 401, "缺少 X-Mock-Sign 签名");
    const body = {
      paymentNo: String(payload?.paymentNo || ""),
      amount: toNumber(payload?.amount),
      externalNo: payload?.externalNo ? String(payload.externalNo) : void 0,
      status: payload?.status ? String(payload.status) : "paid"
    };
    if (!body.paymentNo) throwErr("VALIDATION_FAILED", 400, "paymentNo 不能为空");
    const expected = signMockPayload(
      {
        paymentNo: body.paymentNo,
        amount: body.amount,
        ...body.externalNo ? { externalNo: body.externalNo } : {},
        status: body.status
      },
      this.mockSecret()
    );
    if (sign.length !== expected.length) {
      throwErr("INVALID_SIGNATURE", 401, "签名不匹配");
    }
    const valid = crypto.timingSafeEqual(
      Buffer.from(sign),
      Buffer.from(expected)
    );
    if (!valid) throwErr("INVALID_SIGNATURE", 401, "签名不匹配");
    if (body.status !== "paid") {
      throwErr("PAYMENT_STATE_INVALID", 400, "mock 回调仅支持 paid 状态");
    }
    const paymentService2 = strapi2.service("plugin::zhao-tire.payment");
    const result = await paymentService2.settle(body.paymentNo, {
      externalNo: body.externalNo || `MOCK-NOTIFY-${Date.now()}`,
      raw: { payload: body }
    });
    return { ok: true, duplicated: result.duplicated, paidAmount: result.order?.paidAmount };
  },
  /** H5 mock 收银台确认支付（仅 PAY_PROVIDER=mock 时可用） */
  async mockPay(paymentNo) {
    if (this.provider() !== "mock") {
      throwErr("PAY_PROVIDER_UNAVAILABLE", 501, "当前支付通道不支持模拟支付");
    }
    const paymentService2 = strapi2.service("plugin::zhao-tire.payment");
    const result = await paymentService2.settle(String(paymentNo || ""), {
      externalNo: `MOCK-H5-${Date.now()}`,
      raw: { source: "mock-h5" }
    });
    return { ok: true, duplicated: result.duplicated, paidAmount: result.order?.paidAmount };
  }
});
const services = {
  pricing,
  slot,
  "order-no": orderNo,
  order: order$1,
  site,
  notify,
  "sms-provider": smsProvider,
  export: exportService,
  catalog,
  inventory,
  customer,
  referral,
  payment,
  pay
};
const FULL_ACCESS_ROLES = ["strapi-super-admin", "tire-admin"];
const WAREHOUSE_ROLE = "tire-warehouse";
const WAREHOUSE_ALLOWED = ["read", "storage"];
const CASHIER_ROLE = "tire-cashier";
const CASHIER_ALLOWED = ["read", "payment"];
const deny = (ctx, status) => {
  const code = status === 401 ? "UNAUTHORIZED" : "FORBIDDEN";
  const message = status === 401 ? "未登录或登录已过期" : "无后台访问权限";
  const payload = JSON.stringify({ code, message });
  try {
    ctx.status = status;
    ctx.body = { code, message };
    ctx.respond = false;
    ctx.res.statusCode = status;
    ctx.res.setHeader("Content-Type", "application/json; charset=utf-8");
    ctx.res.end(payload);
  } catch {
  }
  return false;
};
const adminRole = async (ctx, policyConfig = {}, { strapi: strapi2 }) => {
  const header = String(ctx.request?.headers?.authorization || "").trim();
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return deny(ctx, 401);
  const token = match[1].trim();
  if (!token) return deny(ctx, 401);
  let decoded;
  try {
    const secret = strapi2.config.get("admin.auth.secret");
    if (!secret) return deny(ctx, 401);
    decoded = jwt.verify(token, secret, { algorithms: ["HS256"] });
  } catch {
    return deny(ctx, 401);
  }
  const userId = Number(decoded?.id ?? decoded?.userId);
  if (!Number.isInteger(userId) || userId <= 0) return deny(ctx, 401);
  const user = await strapi2.db.query("admin::user").findOne({
    where: { id: userId },
    populate: ["roles"]
  });
  if (!user) return deny(ctx, 401);
  const roleCodes = (user.roles || []).map((role) => String(role?.code || "")).filter(Boolean);
  const allow = String(policyConfig?.allow ?? "");
  ctx.state.user = user;
  ctx.state.adminUser = user;
  if (roleCodes.some((code) => FULL_ACCESS_ROLES.includes(code))) {
    return true;
  }
  if (roleCodes.includes(WAREHOUSE_ROLE) && WAREHOUSE_ALLOWED.includes(allow)) {
    return true;
  }
  if (roleCodes.includes(CASHIER_ROLE) && CASHIER_ALLOWED.includes(allow)) {
    return true;
  }
  return deny(ctx, 403);
};
const policies = {
  "admin-role": adminRole
};
const index = {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies
};
export {
  index as default
};
