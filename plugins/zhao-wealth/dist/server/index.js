"use strict";
Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: "Module" } });
const Redis = require("ioredis");
const Queue = require("bull");
const playwright = require("playwright");
const _interopDefault = (e) => e && e.__esModule ? e : { default: e };
const Redis__default = /* @__PURE__ */ _interopDefault(Redis);
const Queue__default = /* @__PURE__ */ _interopDefault(Queue);
const kind$9 = "collectionType";
const collectionName$9 = "wealth_companies";
const info$9 = { "singularName": "wealth-company", "pluralName": "wealth-companies", "displayName": "理财公司", "description": "银行理财公司信息管理" };
const options$9 = { "draftAndPublish": false };
const attributes$9 = { "name": { "type": "string", "required": true }, "shortName": { "type": "string" }, "companyType": { "type": "enumeration", "enum": ["bank", "bank-subsidiary", "joint-venture"], "default": "bank-subsidiary" }, "website": { "type": "string" }, "products": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-product", "mappedBy": "company" }, "status": { "type": "boolean", "default": true }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthCompany = {
  kind: kind$9,
  collectionName: collectionName$9,
  info: info$9,
  options: options$9,
  attributes: attributes$9
};
const kind$8 = "collectionType";
const collectionName$8 = "wealth_products";
const info$8 = { "singularName": "wealth-product", "pluralName": "wealth-products", "displayName": "理财产品", "description": "理财/基金产品信息" };
const options$8 = { "draftAndPublish": false };
const attributes$8 = { "productCode": { "type": "string", "unique": true, "required": true }, "productName": { "type": "string", "required": true }, "productType": { "type": "enumeration", "enum": ["bank-wealth", "stock-fund", "bond-fund", "mixed-fund", "money-fund"], "required": true }, "registerCode": { "type": "string", "unique": true }, "riskLevel": { "type": "enumeration", "enum": ["R1", "R2", "R3", "R4", "R5"], "default": "R2" }, "termType": { "type": "enumeration", "enum": ["short", "medium", "long"] }, "issueDate": { "type": "date" }, "maturityDate": { "type": "date" }, "company": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-company", "inversedBy": "products" }, "navs": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-nav", "mappedBy": "product" }, "moneyIncomes": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-money-income", "mappedBy": "product" }, "annualSnapshots": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-annual-snapshot", "mappedBy": "product" }, "yearlyReturns": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-yearly-return", "mappedBy": "product" }, "riskMetrics": { "type": "relation", "relation": "oneToMany", "target": "plugin::zhao-wealth.wealth-risk-metric", "mappedBy": "product" }, "recommendWeight": { "type": "integer", "default": 0 }, "recommendTags": { "type": "json" }, "recommendEnabled": { "type": "boolean", "default": false }, "recommendReason": { "type": "text" }, "status": { "type": "boolean", "default": true }, "benchmark": { "type": "string" }, "remark": { "type": "text" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthProduct = {
  kind: kind$8,
  collectionName: collectionName$8,
  info: info$8,
  options: options$8,
  attributes: attributes$8
};
const kind$7 = "collectionType";
const collectionName$7 = "wealth_collect_configs";
const info$7 = { "singularName": "wealth-collect-config", "pluralName": "wealth-collect-configs", "displayName": "采集配置", "description": "产品数据采集配置" };
const options$7 = { "draftAndPublish": false };
const attributes$7 = { "product": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-wealth.wealth-product" }, "collectMethod": { "type": "enumeration", "enum": ["web-crawler", "zip-pdf", "manual", "api"], "default": "web-crawler" }, "collectUrl": { "type": "string" }, "collectRules": { "type": "json" }, "collectStatus": { "type": "enumeration", "enum": ["pending", "success", "failed"], "default": "pending" }, "lastCollectTime": { "type": "datetime" }, "failCount": { "type": "integer", "default": 0 }, "failReason": { "type": "text" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthCollectConfig = {
  kind: kind$7,
  collectionName: collectionName$7,
  info: info$7,
  options: options$7,
  attributes: attributes$7
};
const kind$6 = "collectionType";
const collectionName$6 = "wealth_navs";
const info$6 = { "singularName": "wealth-nav", "pluralName": "wealth-navs", "displayName": "净值数据", "description": "理财/基金净值数据（不含货币基金）" };
const options$6 = { "draftAndPublish": false };
const attributes$6 = { "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "navs" }, "navDate": { "type": "date", "required": true }, "unitNav": { "type": "decimal", "precision": 10, "scale": 4 }, "accNav": { "type": "decimal", "precision": 10, "scale": 4 }, "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"], "default": "crawler" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthNav = {
  kind: kind$6,
  collectionName: collectionName$6,
  info: info$6,
  options: options$6,
  attributes: attributes$6
};
const kind$5 = "collectionType";
const collectionName$5 = "wealth_money_incomes";
const info$5 = { "singularName": "wealth-money-income", "pluralName": "wealth-money-incomes", "displayName": "货币基金收益", "description": "货币基金万份收益数据" };
const options$5 = { "draftAndPublish": false };
const attributes$5 = { "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "moneyIncomes" }, "incomeDate": { "type": "date", "required": true }, "tenThousandIncome": { "type": "decimal", "precision": 10, "scale": 6 }, "sevenDayAnnual": { "type": "decimal", "precision": 10, "scale": 4 }, "dataSource": { "type": "enumeration", "enum": ["crawler", "manual"], "default": "crawler" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthMoneyIncome = {
  kind: kind$5,
  collectionName: collectionName$5,
  info: info$5,
  options: options$5,
  attributes: attributes$5
};
const kind$4 = "collectionType";
const collectionName$4 = "wealth_annual_snapshots";
const info$4 = { "singularName": "wealth-annual-snapshot", "pluralName": "wealth-annual-snapshots", "displayName": "年化快照", "description": "各周期年化收益快照" };
const options$4 = { "draftAndPublish": false };
const attributes$4 = { "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "annualSnapshots" }, "snapshotDate": { "type": "date", "required": true }, "annual1d": { "type": "decimal", "precision": 10, "scale": 6 }, "annual3d": { "type": "decimal", "precision": 10, "scale": 6 }, "annual7d": { "type": "decimal", "precision": 10, "scale": 6 }, "annual2w": { "type": "decimal", "precision": 10, "scale": 6 }, "annual1m": { "type": "decimal", "precision": 10, "scale": 6 }, "annual3m": { "type": "decimal", "precision": 10, "scale": 6 }, "annual6m": { "type": "decimal", "precision": 10, "scale": 6 }, "annual1y": { "type": "decimal", "precision": 10, "scale": 6 }, "isEstimate": { "type": "boolean", "default": false }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthAnnualSnapshot = {
  kind: kind$4,
  collectionName: collectionName$4,
  info: info$4,
  options: options$4,
  attributes: attributes$4
};
const kind$3 = "collectionType";
const collectionName$3 = "wealth_yearly_returns";
const info$3 = { "singularName": "wealth-yearly-return", "pluralName": "wealth-yearly-returns", "displayName": "年度收益", "description": "历年年度收益统计" };
const options$3 = { "draftAndPublish": false };
const attributes$3 = { "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "yearlyReturns" }, "year": { "type": "integer", "required": true }, "annualReturn": { "type": "decimal", "precision": 10, "scale": 6 }, "baseDays": { "type": "integer" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthYearlyReturn = {
  kind: kind$3,
  collectionName: collectionName$3,
  info: info$3,
  options: options$3,
  attributes: attributes$3
};
const kind$2 = "collectionType";
const collectionName$2 = "wealth_customer_products";
const info$2 = { "singularName": "wealth-customer-product", "pluralName": "wealth-customer-products", "displayName": "客户自选产品", "description": "客户关注的产品列表" };
const options$2 = { "draftAndPublish": false };
const attributes$2 = { "user": { "type": "relation", "relation": "manyToOne", "target": "plugin::users-permissions.user" }, "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product" }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "followTime": { "type": "datetime" }, "sortOrder": { "type": "integer", "default": 0 }, "remark": { "type": "string" }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthCustomerProduct = {
  kind: kind$2,
  collectionName: collectionName$2,
  info: info$2,
  options: options$2,
  attributes: attributes$2
};
const kind$1 = "collectionType";
const collectionName$1 = "wealth_recommend_configs";
const info$1 = { "singularName": "wealth-recommend-config", "pluralName": "wealth-recommend-configs", "displayName": "推荐配置", "description": "手动推荐产品配置" };
const options$1 = { "draftAndPublish": false };
const attributes$1 = { "product": { "type": "relation", "relation": "oneToOne", "target": "plugin::zhao-wealth.wealth-product" }, "channel": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-channel.channel" }, "recommendOrder": { "type": "integer", "default": 0 }, "recommendReason": { "type": "text" }, "status": { "type": "boolean", "default": true }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthRecommendConfig = {
  kind: kind$1,
  collectionName: collectionName$1,
  info: info$1,
  options: options$1,
  attributes: attributes$1
};
const kind = "collectionType";
const collectionName = "wealth_risk_metrics";
const info = { "singularName": "wealth-risk-metric", "pluralName": "wealth-risk-metrics", "displayName": "风险指标", "description": "业绩归因指标（波动率/最大回撤/夏普/同类排名）" };
const options = { "draftAndPublish": false };
const attributes = { "product": { "type": "relation", "relation": "manyToOne", "target": "plugin::zhao-wealth.wealth-product", "inversedBy": "riskMetrics" }, "snapshotDate": { "type": "date", "required": true }, "period": { "type": "enumeration", "enum": ["m1", "m3", "m6", "y1"], "required": true }, "metricName": { "type": "enumeration", "enum": ["volatility", "maxDrawdown", "sharpe", "rankPercentile"], "required": true }, "metricValue": { "type": "decimal", "precision": 12, "scale": 6 }, "createdAt": { "type": "datetime" }, "updatedAt": { "type": "datetime" } };
const wealthRiskMetric = {
  kind,
  collectionName,
  info,
  options,
  attributes
};
const contentTypes = {
  "wealth-company": { schema: wealthCompany },
  "wealth-product": { schema: wealthProduct },
  "wealth-collect-config": { schema: wealthCollectConfig },
  "wealth-nav": { schema: wealthNav },
  "wealth-money-income": { schema: wealthMoneyIncome },
  "wealth-annual-snapshot": { schema: wealthAnnualSnapshot },
  "wealth-yearly-return": { schema: wealthYearlyReturn },
  "wealth-customer-product": { schema: wealthCustomerProduct },
  "wealth-recommend-config": { schema: wealthRecommendConfig },
  "wealth-risk-metric": { schema: wealthRiskMetric }
};
class LuxonError extends Error {
}
class InvalidDateTimeError extends LuxonError {
  constructor(reason) {
    super(`Invalid DateTime: ${reason.toMessage()}`);
  }
}
class InvalidIntervalError extends LuxonError {
  constructor(reason) {
    super(`Invalid Interval: ${reason.toMessage()}`);
  }
}
class InvalidDurationError extends LuxonError {
  constructor(reason) {
    super(`Invalid Duration: ${reason.toMessage()}`);
  }
}
class ConflictingSpecificationError extends LuxonError {
}
class InvalidUnitError extends LuxonError {
  constructor(unit) {
    super(`Invalid unit ${unit}`);
  }
}
class InvalidArgumentError extends LuxonError {
}
class ZoneIsAbstractError extends LuxonError {
  constructor() {
    super("Zone is an abstract class");
  }
}
const n = "numeric", s = "short", l = "long";
const DATE_SHORT = {
  year: n,
  month: n,
  day: n
};
const DATE_MED = {
  year: n,
  month: s,
  day: n
};
const DATE_MED_WITH_WEEKDAY = {
  year: n,
  month: s,
  day: n,
  weekday: s
};
const DATE_FULL = {
  year: n,
  month: l,
  day: n
};
const DATE_HUGE = {
  year: n,
  month: l,
  day: n,
  weekday: l
};
const TIME_SIMPLE = {
  hour: n,
  minute: n
};
const TIME_WITH_SECONDS = {
  hour: n,
  minute: n,
  second: n
};
const TIME_WITH_SHORT_OFFSET = {
  hour: n,
  minute: n,
  second: n,
  timeZoneName: s
};
const TIME_WITH_LONG_OFFSET = {
  hour: n,
  minute: n,
  second: n,
  timeZoneName: l
};
const TIME_24_SIMPLE = {
  hour: n,
  minute: n,
  hourCycle: "h23"
};
const TIME_24_WITH_SECONDS = {
  hour: n,
  minute: n,
  second: n,
  hourCycle: "h23"
};
const TIME_24_WITH_SHORT_OFFSET = {
  hour: n,
  minute: n,
  second: n,
  hourCycle: "h23",
  timeZoneName: s
};
const TIME_24_WITH_LONG_OFFSET = {
  hour: n,
  minute: n,
  second: n,
  hourCycle: "h23",
  timeZoneName: l
};
const DATETIME_SHORT = {
  year: n,
  month: n,
  day: n,
  hour: n,
  minute: n
};
const DATETIME_SHORT_WITH_SECONDS = {
  year: n,
  month: n,
  day: n,
  hour: n,
  minute: n,
  second: n
};
const DATETIME_MED = {
  year: n,
  month: s,
  day: n,
  hour: n,
  minute: n
};
const DATETIME_MED_WITH_SECONDS = {
  year: n,
  month: s,
  day: n,
  hour: n,
  minute: n,
  second: n
};
const DATETIME_MED_WITH_WEEKDAY = {
  year: n,
  month: s,
  day: n,
  weekday: s,
  hour: n,
  minute: n
};
const DATETIME_FULL = {
  year: n,
  month: l,
  day: n,
  hour: n,
  minute: n,
  timeZoneName: s
};
const DATETIME_FULL_WITH_SECONDS = {
  year: n,
  month: l,
  day: n,
  hour: n,
  minute: n,
  second: n,
  timeZoneName: s
};
const DATETIME_HUGE = {
  year: n,
  month: l,
  day: n,
  weekday: l,
  hour: n,
  minute: n,
  timeZoneName: l
};
const DATETIME_HUGE_WITH_SECONDS = {
  year: n,
  month: l,
  day: n,
  weekday: l,
  hour: n,
  minute: n,
  second: n,
  timeZoneName: l
};
class Zone {
  /**
   * The type of zone
   * @abstract
   * @type {string}
   */
  get type() {
    throw new ZoneIsAbstractError();
  }
  /**
   * The name of this zone.
   * @abstract
   * @type {string}
   */
  get name() {
    throw new ZoneIsAbstractError();
  }
  /**
   * The IANA name of this zone.
   * Defaults to `name` if not overwritten by a subclass.
   * @abstract
   * @type {string}
   */
  get ianaName() {
    return this.name;
  }
  /**
   * Returns whether the offset is known to be fixed for the whole year.
   * @abstract
   * @type {boolean}
   */
  get isUniversal() {
    throw new ZoneIsAbstractError();
  }
  /**
   * Returns the offset's common name (such as EST) at the specified timestamp
   * @abstract
   * @param {number} ts - Epoch milliseconds for which to get the name
   * @param {Object} opts - Options to affect the format
   * @param {string} opts.format - What style of offset to return. Accepts 'long' or 'short'.
   * @param {string} opts.locale - What locale to return the offset name in.
   * @return {string}
   */
  offsetName(ts, opts) {
    throw new ZoneIsAbstractError();
  }
  /**
   * Returns the offset's value as a string
   * @abstract
   * @param {number} ts - Epoch milliseconds for which to get the offset
   * @param {string} format - What style of offset to return.
   *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
   * @return {string}
   */
  formatOffset(ts, format) {
    throw new ZoneIsAbstractError();
  }
  /**
   * Return the offset in minutes for this zone at the specified timestamp.
   * @abstract
   * @param {number} ts - Epoch milliseconds for which to compute the offset
   * @return {number}
   */
  offset(ts) {
    throw new ZoneIsAbstractError();
  }
  /**
   * Return whether this Zone is equal to another zone
   * @abstract
   * @param {Zone} otherZone - the zone to compare
   * @return {boolean}
   */
  equals(otherZone) {
    throw new ZoneIsAbstractError();
  }
  /**
   * Return whether this Zone is valid.
   * @abstract
   * @type {boolean}
   */
  get isValid() {
    throw new ZoneIsAbstractError();
  }
}
let singleton$1 = null;
class SystemZone extends Zone {
  /**
   * Get a singleton instance of the local zone
   * @return {SystemZone}
   */
  static get instance() {
    if (singleton$1 === null) {
      singleton$1 = new SystemZone();
    }
    return singleton$1;
  }
  /** @override **/
  get type() {
    return "system";
  }
  /** @override **/
  get name() {
    return new Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
  /** @override **/
  get isUniversal() {
    return false;
  }
  /** @override **/
  offsetName(ts, { format, locale }) {
    return parseZoneInfo(ts, format, locale);
  }
  /** @override **/
  formatOffset(ts, format) {
    return formatOffset(this.offset(ts), format);
  }
  /** @override **/
  offset(ts) {
    return -new Date(ts).getTimezoneOffset();
  }
  /** @override **/
  equals(otherZone) {
    return otherZone.type === "system";
  }
  /** @override **/
  get isValid() {
    return true;
  }
}
const dtfCache = /* @__PURE__ */ new Map();
function makeDTF(zoneName) {
  let dtf = dtfCache.get(zoneName);
  if (dtf === void 0) {
    dtf = new Intl.DateTimeFormat("en-US", {
      hour12: false,
      timeZone: zoneName,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      era: "short"
    });
    dtfCache.set(zoneName, dtf);
  }
  return dtf;
}
const typeToPos = {
  year: 0,
  month: 1,
  day: 2,
  era: 3,
  hour: 4,
  minute: 5,
  second: 6
};
function hackyOffset(dtf, date) {
  const formatted = dtf.format(date).replace(/\u200E/g, ""), parsed = /(\d+)\/(\d+)\/(\d+) (AD|BC),? (\d+):(\d+):(\d+)/.exec(formatted), [, fMonth, fDay, fYear, fadOrBc, fHour, fMinute, fSecond] = parsed;
  return [fYear, fMonth, fDay, fadOrBc, fHour, fMinute, fSecond];
}
function partsOffset(dtf, date) {
  const formatted = dtf.formatToParts(date);
  const filled = [];
  for (let i = 0; i < formatted.length; i++) {
    const { type, value } = formatted[i];
    const pos = typeToPos[type];
    if (type === "era") {
      filled[pos] = value;
    } else if (!isUndefined(pos)) {
      filled[pos] = parseInt(value, 10);
    }
  }
  return filled;
}
const ianaZoneCache = /* @__PURE__ */ new Map();
class IANAZone extends Zone {
  /**
   * @param {string} name - Zone name
   * @return {IANAZone}
   */
  static create(name) {
    let zone = ianaZoneCache.get(name);
    if (zone === void 0) {
      ianaZoneCache.set(name, zone = new IANAZone(name));
    }
    return zone;
  }
  /**
   * Reset local caches. Should only be necessary in testing scenarios.
   * @return {void}
   */
  static resetCache() {
    ianaZoneCache.clear();
    dtfCache.clear();
  }
  /**
   * Returns whether the provided string is a valid specifier. This only checks the string's format, not that the specifier identifies a known zone; see isValidZone for that.
   * @param {string} s - The string to check validity on
   * @example IANAZone.isValidSpecifier("America/New_York") //=> true
   * @example IANAZone.isValidSpecifier("Sport~~blorp") //=> false
   * @deprecated For backward compatibility, this forwards to isValidZone, better use `isValidZone()` directly instead.
   * @return {boolean}
   */
  static isValidSpecifier(s2) {
    return this.isValidZone(s2);
  }
  /**
   * Returns whether the provided string identifies a real zone
   * @param {string} zone - The string to check
   * @example IANAZone.isValidZone("America/New_York") //=> true
   * @example IANAZone.isValidZone("Fantasia/Castle") //=> false
   * @example IANAZone.isValidZone("Sport~~blorp") //=> false
   * @return {boolean}
   */
  static isValidZone(zone) {
    if (!zone) {
      return false;
    }
    try {
      new Intl.DateTimeFormat("en-US", { timeZone: zone }).format();
      return true;
    } catch (e) {
      return false;
    }
  }
  constructor(name) {
    super();
    this.zoneName = name;
    this.valid = IANAZone.isValidZone(name);
  }
  /**
   * The type of zone. `iana` for all instances of `IANAZone`.
   * @override
   * @type {string}
   */
  get type() {
    return "iana";
  }
  /**
   * The name of this zone (i.e. the IANA zone name).
   * @override
   * @type {string}
   */
  get name() {
    return this.zoneName;
  }
  /**
   * Returns whether the offset is known to be fixed for the whole year:
   * Always returns false for all IANA zones.
   * @override
   * @type {boolean}
   */
  get isUniversal() {
    return false;
  }
  /**
   * Returns the offset's common name (such as EST) at the specified timestamp
   * @override
   * @param {number} ts - Epoch milliseconds for which to get the name
   * @param {Object} opts - Options to affect the format
   * @param {string} opts.format - What style of offset to return. Accepts 'long' or 'short'.
   * @param {string} opts.locale - What locale to return the offset name in.
   * @return {string}
   */
  offsetName(ts, { format, locale }) {
    return parseZoneInfo(ts, format, locale, this.name);
  }
  /**
   * Returns the offset's value as a string
   * @override
   * @param {number} ts - Epoch milliseconds for which to get the offset
   * @param {string} format - What style of offset to return.
   *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
   * @return {string}
   */
  formatOffset(ts, format) {
    return formatOffset(this.offset(ts), format);
  }
  /**
   * Return the offset in minutes for this zone at the specified timestamp.
   * @override
   * @param {number} ts - Epoch milliseconds for which to compute the offset
   * @return {number}
   */
  offset(ts) {
    if (!this.valid) return NaN;
    const date = new Date(ts);
    if (isNaN(date)) return NaN;
    const dtf = makeDTF(this.name);
    let [year, month, day, adOrBc, hour, minute, second] = dtf.formatToParts ? partsOffset(dtf, date) : hackyOffset(dtf, date);
    if (adOrBc === "BC") {
      year = -Math.abs(year) + 1;
    }
    const adjustedHour = hour === 24 ? 0 : hour;
    const asUTC = objToLocalTS({
      year,
      month,
      day,
      hour: adjustedHour,
      minute,
      second,
      millisecond: 0
    });
    let asTS = +date;
    const over = asTS % 1e3;
    asTS -= over >= 0 ? over : 1e3 + over;
    return (asUTC - asTS) / (60 * 1e3);
  }
  /**
   * Return whether this Zone is equal to another zone
   * @override
   * @param {Zone} otherZone - the zone to compare
   * @return {boolean}
   */
  equals(otherZone) {
    return otherZone.type === "iana" && otherZone.name === this.name;
  }
  /**
   * Return whether this Zone is valid.
   * @override
   * @type {boolean}
   */
  get isValid() {
    return this.valid;
  }
}
let intlLFCache = {};
function getCachedLF(locString, opts = {}) {
  const key = JSON.stringify([locString, opts]);
  let dtf = intlLFCache[key];
  if (!dtf) {
    dtf = new Intl.ListFormat(locString, opts);
    intlLFCache[key] = dtf;
  }
  return dtf;
}
const intlDTCache = /* @__PURE__ */ new Map();
function getCachedDTF(locString, opts = {}) {
  const key = JSON.stringify([locString, opts]);
  let dtf = intlDTCache.get(key);
  if (dtf === void 0) {
    dtf = new Intl.DateTimeFormat(locString, opts);
    intlDTCache.set(key, dtf);
  }
  return dtf;
}
const intlNumCache = /* @__PURE__ */ new Map();
function getCachedINF(locString, opts = {}) {
  const key = JSON.stringify([locString, opts]);
  let inf = intlNumCache.get(key);
  if (inf === void 0) {
    inf = new Intl.NumberFormat(locString, opts);
    intlNumCache.set(key, inf);
  }
  return inf;
}
const intlRelCache = /* @__PURE__ */ new Map();
function getCachedRTF(locString, opts = {}) {
  const { base, ...cacheKeyOpts } = opts;
  const key = JSON.stringify([locString, cacheKeyOpts]);
  let inf = intlRelCache.get(key);
  if (inf === void 0) {
    inf = new Intl.RelativeTimeFormat(locString, opts);
    intlRelCache.set(key, inf);
  }
  return inf;
}
let sysLocaleCache = null;
function systemLocale() {
  if (sysLocaleCache) {
    return sysLocaleCache;
  } else {
    sysLocaleCache = new Intl.DateTimeFormat().resolvedOptions().locale;
    return sysLocaleCache;
  }
}
const intlResolvedOptionsCache = /* @__PURE__ */ new Map();
function getCachedIntResolvedOptions(locString) {
  let opts = intlResolvedOptionsCache.get(locString);
  if (opts === void 0) {
    opts = new Intl.DateTimeFormat(locString).resolvedOptions();
    intlResolvedOptionsCache.set(locString, opts);
  }
  return opts;
}
const weekInfoCache = /* @__PURE__ */ new Map();
function getCachedWeekInfo(locString) {
  let data = weekInfoCache.get(locString);
  if (!data) {
    const locale = new Intl.Locale(locString);
    data = "getWeekInfo" in locale ? locale.getWeekInfo() : locale.weekInfo;
    if (!("minimalDays" in data)) {
      data = { ...fallbackWeekSettings, ...data };
    }
    weekInfoCache.set(locString, data);
  }
  return data;
}
function parseLocaleString(localeStr) {
  const xIndex = localeStr.indexOf("-x-");
  if (xIndex !== -1) {
    localeStr = localeStr.substring(0, xIndex);
  }
  const uIndex = localeStr.indexOf("-u-");
  if (uIndex === -1) {
    return [localeStr];
  } else {
    let options2;
    let selectedStr;
    try {
      options2 = getCachedDTF(localeStr).resolvedOptions();
      selectedStr = localeStr;
    } catch (e) {
      const smaller = localeStr.substring(0, uIndex);
      options2 = getCachedDTF(smaller).resolvedOptions();
      selectedStr = smaller;
    }
    const { numberingSystem, calendar } = options2;
    return [selectedStr, numberingSystem, calendar];
  }
}
function intlConfigString(localeStr, numberingSystem, outputCalendar) {
  if (outputCalendar || numberingSystem) {
    if (!localeStr.includes("-u-")) {
      localeStr += "-u";
    }
    if (outputCalendar) {
      localeStr += `-ca-${outputCalendar}`;
    }
    if (numberingSystem) {
      localeStr += `-nu-${numberingSystem}`;
    }
    return localeStr;
  } else {
    return localeStr;
  }
}
function mapMonths(f) {
  const ms = [];
  for (let i = 1; i <= 12; i++) {
    const dt = DateTime.utc(2009, i, 1);
    ms.push(f(dt));
  }
  return ms;
}
function mapWeekdays(f) {
  const ms = [];
  for (let i = 1; i <= 7; i++) {
    const dt = DateTime.utc(2016, 11, 13 + i);
    ms.push(f(dt));
  }
  return ms;
}
function listStuff(loc, length, englishFn, intlFn) {
  const mode = loc.listingMode();
  if (mode === "error") {
    return null;
  } else if (mode === "en") {
    return englishFn(length);
  } else {
    return intlFn(length);
  }
}
function supportsFastNumbers(loc) {
  if (loc.numberingSystem && loc.numberingSystem !== "latn") {
    return false;
  } else {
    return loc.numberingSystem === "latn" || !loc.locale || loc.locale.startsWith("en") || getCachedIntResolvedOptions(loc.locale).numberingSystem === "latn";
  }
}
class PolyNumberFormatter {
  constructor(intl, forceSimple, opts) {
    this.padTo = opts.padTo || 0;
    this.floor = opts.floor || false;
    const { padTo, floor, ...otherOpts } = opts;
    if (!forceSimple || Object.keys(otherOpts).length > 0) {
      const intlOpts = { useGrouping: false, ...opts };
      if (opts.padTo > 0) intlOpts.minimumIntegerDigits = opts.padTo;
      this.inf = getCachedINF(intl, intlOpts);
    }
  }
  format(i) {
    if (this.inf) {
      const fixed = this.floor ? Math.floor(i) : i;
      return this.inf.format(fixed);
    } else {
      const fixed = this.floor ? Math.floor(i) : roundTo(i, 3);
      return padStart(fixed, this.padTo);
    }
  }
}
class PolyDateFormatter {
  constructor(dt, intl, opts) {
    this.opts = opts;
    this.originalZone = void 0;
    let z = void 0;
    if (this.opts.timeZone) {
      this.dt = dt;
    } else if (dt.zone.type === "fixed") {
      const gmtOffset = -1 * (dt.offset / 60);
      const offsetZ = gmtOffset >= 0 ? `Etc/GMT+${gmtOffset}` : `Etc/GMT${gmtOffset}`;
      if (dt.offset !== 0 && IANAZone.create(offsetZ).valid) {
        z = offsetZ;
        this.dt = dt;
      } else {
        z = "UTC";
        this.dt = dt.offset === 0 ? dt : dt.setZone("UTC").plus({ minutes: dt.offset });
        this.originalZone = dt.zone;
      }
    } else if (dt.zone.type === "system") {
      this.dt = dt;
    } else if (dt.zone.type === "iana") {
      this.dt = dt;
      z = dt.zone.name;
    } else {
      z = "UTC";
      this.dt = dt.setZone("UTC").plus({ minutes: dt.offset });
      this.originalZone = dt.zone;
    }
    const intlOpts = { ...this.opts };
    intlOpts.timeZone = intlOpts.timeZone || z;
    this.dtf = getCachedDTF(intl, intlOpts);
  }
  format() {
    if (this.originalZone) {
      return this.formatToParts().map(({ value }) => value).join("");
    }
    return this.dtf.format(this.dt.toJSDate());
  }
  formatToParts() {
    const parts = this.dtf.formatToParts(this.dt.toJSDate());
    if (this.originalZone) {
      return parts.map((part) => {
        if (part.type === "timeZoneName") {
          const offsetName = this.originalZone.offsetName(this.dt.ts, {
            locale: this.dt.locale,
            format: this.opts.timeZoneName
          });
          return {
            ...part,
            value: offsetName
          };
        } else {
          return part;
        }
      });
    }
    return parts;
  }
  resolvedOptions() {
    return this.dtf.resolvedOptions();
  }
}
class PolyRelFormatter {
  constructor(intl, isEnglish, opts) {
    this.opts = { style: "long", ...opts };
    if (!isEnglish && hasRelative()) {
      this.rtf = getCachedRTF(intl, opts);
    }
  }
  format(count, unit) {
    if (this.rtf) {
      return this.rtf.format(count, unit);
    } else {
      return formatRelativeTime(unit, count, this.opts.numeric, this.opts.style !== "long");
    }
  }
  formatToParts(count, unit) {
    if (this.rtf) {
      return this.rtf.formatToParts(count, unit);
    } else {
      return [];
    }
  }
}
const fallbackWeekSettings = {
  firstDay: 1,
  minimalDays: 4,
  weekend: [6, 7]
};
class Locale {
  static fromOpts(opts) {
    return Locale.create(
      opts.locale,
      opts.numberingSystem,
      opts.outputCalendar,
      opts.weekSettings,
      opts.defaultToEN
    );
  }
  static create(locale, numberingSystem, outputCalendar, weekSettings, defaultToEN = false) {
    const specifiedLocale = locale || Settings.defaultLocale;
    const localeR = specifiedLocale || (defaultToEN ? "en-US" : systemLocale());
    const numberingSystemR = numberingSystem || Settings.defaultNumberingSystem;
    const outputCalendarR = outputCalendar || Settings.defaultOutputCalendar;
    const weekSettingsR = validateWeekSettings(weekSettings) || Settings.defaultWeekSettings;
    return new Locale(localeR, numberingSystemR, outputCalendarR, weekSettingsR, specifiedLocale);
  }
  static resetCache() {
    sysLocaleCache = null;
    intlDTCache.clear();
    intlNumCache.clear();
    intlRelCache.clear();
    intlResolvedOptionsCache.clear();
    weekInfoCache.clear();
  }
  static fromObject({ locale, numberingSystem, outputCalendar, weekSettings } = {}) {
    return Locale.create(locale, numberingSystem, outputCalendar, weekSettings);
  }
  constructor(locale, numbering, outputCalendar, weekSettings, specifiedLocale) {
    const [parsedLocale, parsedNumberingSystem, parsedOutputCalendar] = parseLocaleString(locale);
    this.locale = parsedLocale;
    this.numberingSystem = numbering || parsedNumberingSystem || null;
    this.outputCalendar = outputCalendar || parsedOutputCalendar || null;
    this.weekSettings = weekSettings;
    this.intl = intlConfigString(this.locale, this.numberingSystem, this.outputCalendar);
    this.weekdaysCache = { format: {}, standalone: {} };
    this.monthsCache = { format: {}, standalone: {} };
    this.meridiemCache = null;
    this.eraCache = {};
    this.specifiedLocale = specifiedLocale;
    this.fastNumbersCached = null;
  }
  get fastNumbers() {
    if (this.fastNumbersCached == null) {
      this.fastNumbersCached = supportsFastNumbers(this);
    }
    return this.fastNumbersCached;
  }
  listingMode() {
    const isActuallyEn = this.isEnglish();
    const hasNoWeirdness = (this.numberingSystem === null || this.numberingSystem === "latn") && (this.outputCalendar === null || this.outputCalendar === "gregory");
    return isActuallyEn && hasNoWeirdness ? "en" : "intl";
  }
  clone(alts) {
    if (!alts || Object.getOwnPropertyNames(alts).length === 0) {
      return this;
    } else {
      return Locale.create(
        alts.locale || this.specifiedLocale,
        alts.numberingSystem || this.numberingSystem,
        alts.outputCalendar || this.outputCalendar,
        validateWeekSettings(alts.weekSettings) || this.weekSettings,
        alts.defaultToEN || false
      );
    }
  }
  redefaultToEN(alts = {}) {
    return this.clone({ ...alts, defaultToEN: true });
  }
  redefaultToSystem(alts = {}) {
    return this.clone({ ...alts, defaultToEN: false });
  }
  months(length, format = false) {
    return listStuff(this, length, months, () => {
      const monthSpecialCase = this.intl === "ja" || this.intl.startsWith("ja-");
      format &= !monthSpecialCase;
      const intl = format ? { month: length, day: "numeric" } : { month: length }, formatStr = format ? "format" : "standalone";
      if (!this.monthsCache[formatStr][length]) {
        const mapper = !monthSpecialCase ? (dt) => this.extract(dt, intl, "month") : (dt) => this.dtFormatter(dt, intl).format();
        this.monthsCache[formatStr][length] = mapMonths(mapper);
      }
      return this.monthsCache[formatStr][length];
    });
  }
  weekdays(length, format = false) {
    return listStuff(this, length, weekdays, () => {
      const intl = format ? { weekday: length, year: "numeric", month: "long", day: "numeric" } : { weekday: length }, formatStr = format ? "format" : "standalone";
      if (!this.weekdaysCache[formatStr][length]) {
        this.weekdaysCache[formatStr][length] = mapWeekdays(
          (dt) => this.extract(dt, intl, "weekday")
        );
      }
      return this.weekdaysCache[formatStr][length];
    });
  }
  meridiems() {
    return listStuff(
      this,
      void 0,
      () => meridiems,
      () => {
        if (!this.meridiemCache) {
          const intl = { hour: "numeric", hourCycle: "h12" };
          this.meridiemCache = [DateTime.utc(2016, 11, 13, 9), DateTime.utc(2016, 11, 13, 19)].map(
            (dt) => this.extract(dt, intl, "dayperiod")
          );
        }
        return this.meridiemCache;
      }
    );
  }
  eras(length) {
    return listStuff(this, length, eras, () => {
      const intl = { era: length };
      if (!this.eraCache[length]) {
        this.eraCache[length] = [DateTime.utc(-40, 1, 1), DateTime.utc(2017, 1, 1)].map(
          (dt) => this.extract(dt, intl, "era")
        );
      }
      return this.eraCache[length];
    });
  }
  extract(dt, intlOpts, field) {
    const df = this.dtFormatter(dt, intlOpts), results = df.formatToParts(), matching = results.find((m) => m.type.toLowerCase() === field);
    return matching ? matching.value : null;
  }
  numberFormatter(opts = {}) {
    return new PolyNumberFormatter(this.intl, opts.forceSimple || this.fastNumbers, opts);
  }
  dtFormatter(dt, intlOpts = {}) {
    return new PolyDateFormatter(dt, this.intl, intlOpts);
  }
  relFormatter(opts = {}) {
    return new PolyRelFormatter(this.intl, this.isEnglish(), opts);
  }
  listFormatter(opts = {}) {
    return getCachedLF(this.intl, opts);
  }
  isEnglish() {
    return this.locale === "en" || this.locale.toLowerCase() === "en-us" || getCachedIntResolvedOptions(this.intl).locale.startsWith("en-us");
  }
  getWeekSettings() {
    if (this.weekSettings) {
      return this.weekSettings;
    } else if (!hasLocaleWeekInfo()) {
      return fallbackWeekSettings;
    } else {
      return getCachedWeekInfo(this.locale);
    }
  }
  getStartOfWeek() {
    return this.getWeekSettings().firstDay;
  }
  getMinDaysInFirstWeek() {
    return this.getWeekSettings().minimalDays;
  }
  getWeekendDays() {
    return this.getWeekSettings().weekend;
  }
  equals(other) {
    return this.locale === other.locale && this.numberingSystem === other.numberingSystem && this.outputCalendar === other.outputCalendar;
  }
  toString() {
    return `Locale(${this.locale}, ${this.numberingSystem}, ${this.outputCalendar})`;
  }
}
let singleton = null;
class FixedOffsetZone extends Zone {
  /**
   * Get a singleton instance of UTC
   * @return {FixedOffsetZone}
   */
  static get utcInstance() {
    if (singleton === null) {
      singleton = new FixedOffsetZone(0);
    }
    return singleton;
  }
  /**
   * Get an instance with a specified offset
   * @param {number} offset - The offset in minutes
   * @return {FixedOffsetZone}
   */
  static instance(offset2) {
    return offset2 === 0 ? FixedOffsetZone.utcInstance : new FixedOffsetZone(offset2);
  }
  /**
   * Get an instance of FixedOffsetZone from a UTC offset string, like "UTC+6"
   * @param {string} s - The offset string to parse
   * @example FixedOffsetZone.parseSpecifier("UTC+6")
   * @example FixedOffsetZone.parseSpecifier("UTC+06")
   * @example FixedOffsetZone.parseSpecifier("UTC-6:00")
   * @return {FixedOffsetZone}
   */
  static parseSpecifier(s2) {
    if (s2) {
      const r = s2.match(/^utc(?:([+-]\d{1,2})(?::(\d{2}))?)?$/i);
      if (r) {
        return new FixedOffsetZone(signedOffset(r[1], r[2]));
      }
    }
    return null;
  }
  constructor(offset2) {
    super();
    this.fixed = offset2;
  }
  /**
   * The type of zone. `fixed` for all instances of `FixedOffsetZone`.
   * @override
   * @type {string}
   */
  get type() {
    return "fixed";
  }
  /**
   * The name of this zone.
   * All fixed zones' names always start with "UTC" (plus optional offset)
   * @override
   * @type {string}
   */
  get name() {
    return this.fixed === 0 ? "UTC" : `UTC${formatOffset(this.fixed, "narrow")}`;
  }
  /**
   * The IANA name of this zone, i.e. `Etc/UTC` or `Etc/GMT+/-nn`
   *
   * @override
   * @type {string}
   */
  get ianaName() {
    if (this.fixed === 0) {
      return "Etc/UTC";
    } else {
      return `Etc/GMT${formatOffset(-this.fixed, "narrow")}`;
    }
  }
  /**
   * Returns the offset's common name at the specified timestamp.
   *
   * For fixed offset zones this equals to the zone name.
   * @override
   */
  offsetName() {
    return this.name;
  }
  /**
   * Returns the offset's value as a string
   * @override
   * @param {number} ts - Epoch milliseconds for which to get the offset
   * @param {string} format - What style of offset to return.
   *                          Accepts 'narrow', 'short', or 'techie'. Returning '+6', '+06:00', or '+0600' respectively
   * @return {string}
   */
  formatOffset(ts, format) {
    return formatOffset(this.fixed, format);
  }
  /**
   * Returns whether the offset is known to be fixed for the whole year:
   * Always returns true for all fixed offset zones.
   * @override
   * @type {boolean}
   */
  get isUniversal() {
    return true;
  }
  /**
   * Return the offset in minutes for this zone at the specified timestamp.
   *
   * For fixed offset zones, this is constant and does not depend on a timestamp.
   * @override
   * @return {number}
   */
  offset() {
    return this.fixed;
  }
  /**
   * Return whether this Zone is equal to another zone (i.e. also fixed and same offset)
   * @override
   * @param {Zone} otherZone - the zone to compare
   * @return {boolean}
   */
  equals(otherZone) {
    return otherZone.type === "fixed" && otherZone.fixed === this.fixed;
  }
  /**
   * Return whether this Zone is valid:
   * All fixed offset zones are valid.
   * @override
   * @type {boolean}
   */
  get isValid() {
    return true;
  }
}
class InvalidZone extends Zone {
  constructor(zoneName) {
    super();
    this.zoneName = zoneName;
  }
  /** @override **/
  get type() {
    return "invalid";
  }
  /** @override **/
  get name() {
    return this.zoneName;
  }
  /** @override **/
  get isUniversal() {
    return false;
  }
  /** @override **/
  offsetName() {
    return null;
  }
  /** @override **/
  formatOffset() {
    return "";
  }
  /** @override **/
  offset() {
    return NaN;
  }
  /** @override **/
  equals() {
    return false;
  }
  /** @override **/
  get isValid() {
    return false;
  }
}
function normalizeZone(input, defaultZone2) {
  if (isUndefined(input) || input === null) {
    return defaultZone2;
  } else if (input instanceof Zone) {
    return input;
  } else if (isString(input)) {
    const lowered = input.toLowerCase();
    if (lowered === "default") return defaultZone2;
    else if (lowered === "local" || lowered === "system") return SystemZone.instance;
    else if (lowered === "utc" || lowered === "gmt") return FixedOffsetZone.utcInstance;
    else return FixedOffsetZone.parseSpecifier(lowered) || IANAZone.create(input);
  } else if (isNumber(input)) {
    return FixedOffsetZone.instance(input);
  } else if (typeof input === "object" && "offset" in input && typeof input.offset === "function") {
    return input;
  } else {
    return new InvalidZone(input);
  }
}
const numberingSystems = {
  arab: "[٠-٩]",
  arabext: "[۰-۹]",
  bali: "[᭐-᭙]",
  beng: "[০-৯]",
  deva: "[०-९]",
  fullwide: "[０-９]",
  gujr: "[૦-૯]",
  hanidec: "[〇|一|二|三|四|五|六|七|八|九]",
  khmr: "[០-៩]",
  knda: "[೦-೯]",
  laoo: "[໐-໙]",
  limb: "[᥆-᥏]",
  mlym: "[൦-൯]",
  mong: "[᠐-᠙]",
  mymr: "[၀-၉]",
  orya: "[୦-୯]",
  tamldec: "[௦-௯]",
  telu: "[౦-౯]",
  thai: "[๐-๙]",
  tibt: "[༠-༩]",
  latn: "\\d"
};
const numberingSystemsUTF16 = {
  arab: [1632, 1641],
  arabext: [1776, 1785],
  bali: [6992, 7001],
  beng: [2534, 2543],
  deva: [2406, 2415],
  fullwide: [65296, 65303],
  gujr: [2790, 2799],
  khmr: [6112, 6121],
  knda: [3302, 3311],
  laoo: [3792, 3801],
  limb: [6470, 6479],
  mlym: [3430, 3439],
  mong: [6160, 6169],
  mymr: [4160, 4169],
  orya: [2918, 2927],
  tamldec: [3046, 3055],
  telu: [3174, 3183],
  thai: [3664, 3673],
  tibt: [3872, 3881]
};
const hanidecChars = numberingSystems.hanidec.replace(/[\[|\]]/g, "").split("");
function parseDigits(str) {
  let value = parseInt(str, 10);
  if (isNaN(value)) {
    value = "";
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      if (str[i].search(numberingSystems.hanidec) !== -1) {
        value += hanidecChars.indexOf(str[i]);
      } else {
        for (const key in numberingSystemsUTF16) {
          const [min, max] = numberingSystemsUTF16[key];
          if (code >= min && code <= max) {
            value += code - min;
          }
        }
      }
    }
    return parseInt(value, 10);
  } else {
    return value;
  }
}
const digitRegexCache = /* @__PURE__ */ new Map();
function resetDigitRegexCache() {
  digitRegexCache.clear();
}
function digitRegex({ numberingSystem }, append = "") {
  const ns = numberingSystem || "latn";
  let appendCache = digitRegexCache.get(ns);
  if (appendCache === void 0) {
    appendCache = /* @__PURE__ */ new Map();
    digitRegexCache.set(ns, appendCache);
  }
  let regex = appendCache.get(append);
  if (regex === void 0) {
    regex = new RegExp(`${numberingSystems[ns]}${append}`);
    appendCache.set(append, regex);
  }
  return regex;
}
let now = () => Date.now(), defaultZone = "system", defaultLocale = null, defaultNumberingSystem = null, defaultOutputCalendar = null, twoDigitCutoffYear = 60, throwOnInvalid, defaultWeekSettings = null;
class Settings {
  /**
   * Get the callback for returning the current timestamp.
   * @type {function}
   */
  static get now() {
    return now;
  }
  /**
   * Set the callback for returning the current timestamp.
   * The function should return a number, which will be interpreted as an Epoch millisecond count
   * @type {function}
   * @example Settings.now = () => Date.now() + 3000 // pretend it is 3 seconds in the future
   * @example Settings.now = () => 0 // always pretend it's Jan 1, 1970 at midnight in UTC time
   */
  static set now(n2) {
    now = n2;
  }
  /**
   * Set the default time zone to create DateTimes in. Does not affect existing instances.
   * Use the value "system" to reset this value to the system's time zone.
   * @type {string}
   */
  static set defaultZone(zone) {
    defaultZone = zone;
  }
  /**
   * Get the default time zone object currently used to create DateTimes. Does not affect existing instances.
   * The default value is the system's time zone (the one set on the machine that runs this code).
   * @type {Zone}
   */
  static get defaultZone() {
    return normalizeZone(defaultZone, SystemZone.instance);
  }
  /**
   * Get the default locale to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static get defaultLocale() {
    return defaultLocale;
  }
  /**
   * Set the default locale to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static set defaultLocale(locale) {
    defaultLocale = locale;
  }
  /**
   * Get the default numbering system to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static get defaultNumberingSystem() {
    return defaultNumberingSystem;
  }
  /**
   * Set the default numbering system to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static set defaultNumberingSystem(numberingSystem) {
    defaultNumberingSystem = numberingSystem;
  }
  /**
   * Get the default output calendar to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static get defaultOutputCalendar() {
    return defaultOutputCalendar;
  }
  /**
   * Set the default output calendar to create DateTimes with. Does not affect existing instances.
   * @type {string}
   */
  static set defaultOutputCalendar(outputCalendar) {
    defaultOutputCalendar = outputCalendar;
  }
  /**
   * @typedef {Object} WeekSettings
   * @property {number} firstDay
   * @property {number} minimalDays
   * @property {number[]} weekend
   */
  /**
   * @return {WeekSettings|null}
   */
  static get defaultWeekSettings() {
    return defaultWeekSettings;
  }
  /**
   * Allows overriding the default locale week settings, i.e. the start of the week, the weekend and
   * how many days are required in the first week of a year.
   * Does not affect existing instances.
   *
   * @param {WeekSettings|null} weekSettings
   */
  static set defaultWeekSettings(weekSettings) {
    defaultWeekSettings = validateWeekSettings(weekSettings);
  }
  /**
   * Get the cutoff year for whether a 2-digit year string is interpreted in the current or previous century. Numbers higher than the cutoff will be considered to mean 19xx and numbers lower or equal to the cutoff will be considered 20xx.
   * @type {number}
   */
  static get twoDigitCutoffYear() {
    return twoDigitCutoffYear;
  }
  /**
   * Set the cutoff year for whether a 2-digit year string is interpreted in the current or previous century. Numbers higher than the cutoff will be considered to mean 19xx and numbers lower or equal to the cutoff will be considered 20xx.
   * @type {number}
   * @example Settings.twoDigitCutoffYear = 0 // all 'yy' are interpreted as 20th century
   * @example Settings.twoDigitCutoffYear = 99 // all 'yy' are interpreted as 21st century
   * @example Settings.twoDigitCutoffYear = 50 // '49' -> 2049; '50' -> 1950
   * @example Settings.twoDigitCutoffYear = 1950 // interpreted as 50
   * @example Settings.twoDigitCutoffYear = 2050 // ALSO interpreted as 50
   */
  static set twoDigitCutoffYear(cutoffYear) {
    twoDigitCutoffYear = cutoffYear % 100;
  }
  /**
   * Get whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
   * @type {boolean}
   */
  static get throwOnInvalid() {
    return throwOnInvalid;
  }
  /**
   * Set whether Luxon will throw when it encounters invalid DateTimes, Durations, or Intervals
   * @type {boolean}
   */
  static set throwOnInvalid(t) {
    throwOnInvalid = t;
  }
  /**
   * Reset Luxon's global caches. Should only be necessary in testing scenarios.
   * @return {void}
   */
  static resetCaches() {
    Locale.resetCache();
    IANAZone.resetCache();
    DateTime.resetCache();
    resetDigitRegexCache();
  }
}
class Invalid {
  constructor(reason, explanation) {
    this.reason = reason;
    this.explanation = explanation;
  }
  toMessage() {
    if (this.explanation) {
      return `${this.reason}: ${this.explanation}`;
    } else {
      return this.reason;
    }
  }
}
const nonLeapLadder = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334], leapLadder = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
function unitOutOfRange(unit, value) {
  return new Invalid(
    "unit out of range",
    `you specified ${value} (of type ${typeof value}) as a ${unit}, which is invalid`
  );
}
function dayOfWeek(year, month, day) {
  const d = new Date(Date.UTC(year, month - 1, day));
  if (year < 100 && year >= 0) {
    d.setUTCFullYear(d.getUTCFullYear() - 1900);
  }
  const js = d.getUTCDay();
  return js === 0 ? 7 : js;
}
function computeOrdinal(year, month, day) {
  return day + (isLeapYear(year) ? leapLadder : nonLeapLadder)[month - 1];
}
function uncomputeOrdinal(year, ordinal) {
  const table = isLeapYear(year) ? leapLadder : nonLeapLadder, month0 = table.findIndex((i) => i < ordinal), day = ordinal - table[month0];
  return { month: month0 + 1, day };
}
function isoWeekdayToLocal(isoWeekday, startOfWeek) {
  return (isoWeekday - startOfWeek + 7) % 7 + 1;
}
function gregorianToWeek(gregObj, minDaysInFirstWeek = 4, startOfWeek = 1) {
  const { year, month, day } = gregObj, ordinal = computeOrdinal(year, month, day), weekday = isoWeekdayToLocal(dayOfWeek(year, month, day), startOfWeek);
  let weekNumber = Math.floor((ordinal - weekday + 14 - minDaysInFirstWeek) / 7), weekYear;
  if (weekNumber < 1) {
    weekYear = year - 1;
    weekNumber = weeksInWeekYear(weekYear, minDaysInFirstWeek, startOfWeek);
  } else if (weekNumber > weeksInWeekYear(year, minDaysInFirstWeek, startOfWeek)) {
    weekYear = year + 1;
    weekNumber = 1;
  } else {
    weekYear = year;
  }
  return { weekYear, weekNumber, weekday, ...timeObject(gregObj) };
}
function weekToGregorian(weekData, minDaysInFirstWeek = 4, startOfWeek = 1) {
  const { weekYear, weekNumber, weekday } = weekData, weekdayOfJan4 = isoWeekdayToLocal(dayOfWeek(weekYear, 1, minDaysInFirstWeek), startOfWeek), yearInDays = daysInYear(weekYear);
  let ordinal = weekNumber * 7 + weekday - weekdayOfJan4 - 7 + minDaysInFirstWeek, year;
  if (ordinal < 1) {
    year = weekYear - 1;
    ordinal += daysInYear(year);
  } else if (ordinal > yearInDays) {
    year = weekYear + 1;
    ordinal -= daysInYear(weekYear);
  } else {
    year = weekYear;
  }
  const { month, day } = uncomputeOrdinal(year, ordinal);
  return { year, month, day, ...timeObject(weekData) };
}
function gregorianToOrdinal(gregData) {
  const { year, month, day } = gregData;
  const ordinal = computeOrdinal(year, month, day);
  return { year, ordinal, ...timeObject(gregData) };
}
function ordinalToGregorian(ordinalData) {
  const { year, ordinal } = ordinalData;
  const { month, day } = uncomputeOrdinal(year, ordinal);
  return { year, month, day, ...timeObject(ordinalData) };
}
function usesLocalWeekValues(obj, loc) {
  const hasLocaleWeekData = !isUndefined(obj.localWeekday) || !isUndefined(obj.localWeekNumber) || !isUndefined(obj.localWeekYear);
  if (hasLocaleWeekData) {
    const hasIsoWeekData = !isUndefined(obj.weekday) || !isUndefined(obj.weekNumber) || !isUndefined(obj.weekYear);
    if (hasIsoWeekData) {
      throw new ConflictingSpecificationError(
        "Cannot mix locale-based week fields with ISO-based week fields"
      );
    }
    if (!isUndefined(obj.localWeekday)) obj.weekday = obj.localWeekday;
    if (!isUndefined(obj.localWeekNumber)) obj.weekNumber = obj.localWeekNumber;
    if (!isUndefined(obj.localWeekYear)) obj.weekYear = obj.localWeekYear;
    delete obj.localWeekday;
    delete obj.localWeekNumber;
    delete obj.localWeekYear;
    return {
      minDaysInFirstWeek: loc.getMinDaysInFirstWeek(),
      startOfWeek: loc.getStartOfWeek()
    };
  } else {
    return { minDaysInFirstWeek: 4, startOfWeek: 1 };
  }
}
function hasInvalidWeekData(obj, minDaysInFirstWeek = 4, startOfWeek = 1) {
  const validYear = isInteger(obj.weekYear), validWeek = integerBetween(
    obj.weekNumber,
    1,
    weeksInWeekYear(obj.weekYear, minDaysInFirstWeek, startOfWeek)
  ), validWeekday = integerBetween(obj.weekday, 1, 7);
  if (!validYear) {
    return unitOutOfRange("weekYear", obj.weekYear);
  } else if (!validWeek) {
    return unitOutOfRange("week", obj.weekNumber);
  } else if (!validWeekday) {
    return unitOutOfRange("weekday", obj.weekday);
  } else return false;
}
function hasInvalidOrdinalData(obj) {
  const validYear = isInteger(obj.year), validOrdinal = integerBetween(obj.ordinal, 1, daysInYear(obj.year));
  if (!validYear) {
    return unitOutOfRange("year", obj.year);
  } else if (!validOrdinal) {
    return unitOutOfRange("ordinal", obj.ordinal);
  } else return false;
}
function hasInvalidGregorianData(obj) {
  const validYear = isInteger(obj.year), validMonth = integerBetween(obj.month, 1, 12), validDay = integerBetween(obj.day, 1, daysInMonth(obj.year, obj.month));
  if (!validYear) {
    return unitOutOfRange("year", obj.year);
  } else if (!validMonth) {
    return unitOutOfRange("month", obj.month);
  } else if (!validDay) {
    return unitOutOfRange("day", obj.day);
  } else return false;
}
function hasInvalidTimeData(obj) {
  const { hour, minute, second, millisecond } = obj;
  const validHour = integerBetween(hour, 0, 23) || hour === 24 && minute === 0 && second === 0 && millisecond === 0, validMinute = integerBetween(minute, 0, 59), validSecond = integerBetween(second, 0, 59), validMillisecond = integerBetween(millisecond, 0, 999);
  if (!validHour) {
    return unitOutOfRange("hour", hour);
  } else if (!validMinute) {
    return unitOutOfRange("minute", minute);
  } else if (!validSecond) {
    return unitOutOfRange("second", second);
  } else if (!validMillisecond) {
    return unitOutOfRange("millisecond", millisecond);
  } else return false;
}
function isUndefined(o) {
  return typeof o === "undefined";
}
function isNumber(o) {
  return typeof o === "number";
}
function isInteger(o) {
  return typeof o === "number" && o % 1 === 0;
}
function isString(o) {
  return typeof o === "string";
}
function isDate(o) {
  return Object.prototype.toString.call(o) === "[object Date]";
}
function hasRelative() {
  try {
    return typeof Intl !== "undefined" && !!Intl.RelativeTimeFormat;
  } catch (e) {
    return false;
  }
}
function hasLocaleWeekInfo() {
  try {
    return typeof Intl !== "undefined" && !!Intl.Locale && ("weekInfo" in Intl.Locale.prototype || "getWeekInfo" in Intl.Locale.prototype);
  } catch (e) {
    return false;
  }
}
function maybeArray(thing) {
  return Array.isArray(thing) ? thing : [thing];
}
function bestBy(arr, by, compare) {
  if (arr.length === 0) {
    return void 0;
  }
  return arr.reduce((best, next) => {
    const pair = [by(next), next];
    if (!best) {
      return pair;
    } else if (compare(best[0], pair[0]) === best[0]) {
      return best;
    } else {
      return pair;
    }
  }, null)[1];
}
function pick(obj, keys) {
  return keys.reduce((a, k) => {
    a[k] = obj[k];
    return a;
  }, {});
}
function hasOwnProperty(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
}
function validateWeekSettings(settings) {
  if (settings == null) {
    return null;
  } else if (typeof settings !== "object") {
    throw new InvalidArgumentError("Week settings must be an object");
  } else {
    if (!integerBetween(settings.firstDay, 1, 7) || !integerBetween(settings.minimalDays, 1, 7) || !Array.isArray(settings.weekend) || settings.weekend.some((v) => !integerBetween(v, 1, 7))) {
      throw new InvalidArgumentError("Invalid week settings");
    }
    return {
      firstDay: settings.firstDay,
      minimalDays: settings.minimalDays,
      weekend: Array.from(settings.weekend)
    };
  }
}
function integerBetween(thing, bottom, top) {
  return isInteger(thing) && thing >= bottom && thing <= top;
}
function floorMod(x, n2) {
  return x - n2 * Math.floor(x / n2);
}
function padStart(input, n2 = 2) {
  const isNeg = input < 0;
  let padded;
  if (isNeg) {
    padded = "-" + ("" + -input).padStart(n2, "0");
  } else {
    padded = ("" + input).padStart(n2, "0");
  }
  return padded;
}
function parseInteger(string) {
  if (isUndefined(string) || string === null || string === "") {
    return void 0;
  } else {
    return parseInt(string, 10);
  }
}
function parseFloating(string) {
  if (isUndefined(string) || string === null || string === "") {
    return void 0;
  } else {
    return parseFloat(string);
  }
}
function parseMillis(fraction) {
  if (isUndefined(fraction) || fraction === null || fraction === "") {
    return void 0;
  } else {
    const f = parseFloat("0." + fraction) * 1e3;
    return Math.floor(f);
  }
}
function roundTo(number, digits, rounding = "round") {
  const factor = 10 ** digits;
  switch (rounding) {
    case "expand":
      return number > 0 ? Math.ceil(number * factor) / factor : Math.floor(number * factor) / factor;
    case "trunc":
      return Math.trunc(number * factor) / factor;
    case "round":
      return Math.round(number * factor) / factor;
    case "floor":
      return Math.floor(number * factor) / factor;
    case "ceil":
      return Math.ceil(number * factor) / factor;
    default:
      throw new RangeError(`Value rounding ${rounding} is out of range`);
  }
}
function isLeapYear(year) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}
function daysInYear(year) {
  return isLeapYear(year) ? 366 : 365;
}
function daysInMonth(year, month) {
  const modMonth = floorMod(month - 1, 12) + 1, modYear = year + (month - modMonth) / 12;
  if (modMonth === 2) {
    return isLeapYear(modYear) ? 29 : 28;
  } else {
    return [31, null, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][modMonth - 1];
  }
}
function objToLocalTS(obj) {
  let d = Date.UTC(
    obj.year,
    obj.month - 1,
    obj.day,
    obj.hour,
    obj.minute,
    obj.second,
    obj.millisecond
  );
  if (obj.year < 100 && obj.year >= 0) {
    d = new Date(d);
    d.setUTCFullYear(obj.year, obj.month - 1, obj.day);
  }
  return +d;
}
function firstWeekOffset(year, minDaysInFirstWeek, startOfWeek) {
  const fwdlw = isoWeekdayToLocal(dayOfWeek(year, 1, minDaysInFirstWeek), startOfWeek);
  return -fwdlw + minDaysInFirstWeek - 1;
}
function weeksInWeekYear(weekYear, minDaysInFirstWeek = 4, startOfWeek = 1) {
  const weekOffset = firstWeekOffset(weekYear, minDaysInFirstWeek, startOfWeek);
  const weekOffsetNext = firstWeekOffset(weekYear + 1, minDaysInFirstWeek, startOfWeek);
  return (daysInYear(weekYear) - weekOffset + weekOffsetNext) / 7;
}
function untruncateYear(year) {
  if (year > 99) {
    return year;
  } else return year > Settings.twoDigitCutoffYear ? 1900 + year : 2e3 + year;
}
function parseZoneInfo(ts, offsetFormat, locale, timeZone = null) {
  const date = new Date(ts), intlOpts = {
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  };
  if (timeZone) {
    intlOpts.timeZone = timeZone;
  }
  const modified = { timeZoneName: offsetFormat, ...intlOpts };
  const parsed = new Intl.DateTimeFormat(locale, modified).formatToParts(date).find((m) => m.type.toLowerCase() === "timezonename");
  return parsed ? parsed.value : null;
}
function signedOffset(offHourStr, offMinuteStr) {
  let offHour = parseInt(offHourStr, 10);
  if (Number.isNaN(offHour)) {
    offHour = 0;
  }
  const offMin = parseInt(offMinuteStr, 10) || 0, offMinSigned = offHour < 0 || Object.is(offHour, -0) ? -offMin : offMin;
  return offHour * 60 + offMinSigned;
}
function asNumber(value) {
  const numericValue = Number(value);
  if (typeof value === "boolean" || value === "" || !Number.isFinite(numericValue))
    throw new InvalidArgumentError(`Invalid unit value ${value}`);
  return numericValue;
}
function normalizeObject(obj, normalizer) {
  const normalized = {};
  for (const u in obj) {
    if (hasOwnProperty(obj, u)) {
      const v = obj[u];
      if (v === void 0 || v === null) continue;
      normalized[normalizer(u)] = asNumber(v);
    }
  }
  return normalized;
}
function formatOffset(offset2, format) {
  const hours = Math.trunc(Math.abs(offset2 / 60)), minutes = Math.trunc(Math.abs(offset2 % 60)), sign = offset2 >= 0 ? "+" : "-";
  switch (format) {
    case "short":
      return `${sign}${padStart(hours, 2)}:${padStart(minutes, 2)}`;
    case "narrow":
      return `${sign}${hours}${minutes > 0 ? `:${minutes}` : ""}`;
    case "techie":
      return `${sign}${padStart(hours, 2)}${padStart(minutes, 2)}`;
    default:
      throw new RangeError(`Value format ${format} is out of range for property format`);
  }
}
function timeObject(obj) {
  return pick(obj, ["hour", "minute", "second", "millisecond"]);
}
const monthsLong = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December"
];
const monthsShort = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec"
];
const monthsNarrow = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];
function months(length) {
  switch (length) {
    case "narrow":
      return [...monthsNarrow];
    case "short":
      return [...monthsShort];
    case "long":
      return [...monthsLong];
    case "numeric":
      return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
    case "2-digit":
      return ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
    default:
      return null;
  }
}
const weekdaysLong = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday"
];
const weekdaysShort = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const weekdaysNarrow = ["M", "T", "W", "T", "F", "S", "S"];
function weekdays(length) {
  switch (length) {
    case "narrow":
      return [...weekdaysNarrow];
    case "short":
      return [...weekdaysShort];
    case "long":
      return [...weekdaysLong];
    case "numeric":
      return ["1", "2", "3", "4", "5", "6", "7"];
    default:
      return null;
  }
}
const meridiems = ["AM", "PM"];
const erasLong = ["Before Christ", "Anno Domini"];
const erasShort = ["BC", "AD"];
const erasNarrow = ["B", "A"];
function eras(length) {
  switch (length) {
    case "narrow":
      return [...erasNarrow];
    case "short":
      return [...erasShort];
    case "long":
      return [...erasLong];
    default:
      return null;
  }
}
function meridiemForDateTime(dt) {
  return meridiems[dt.hour < 12 ? 0 : 1];
}
function weekdayForDateTime(dt, length) {
  return weekdays(length)[dt.weekday - 1];
}
function monthForDateTime(dt, length) {
  return months(length)[dt.month - 1];
}
function eraForDateTime(dt, length) {
  return eras(length)[dt.year < 0 ? 0 : 1];
}
function formatRelativeTime(unit, count, numeric = "always", narrow = false) {
  const units = {
    years: ["year", "yr."],
    quarters: ["quarter", "qtr."],
    months: ["month", "mo."],
    weeks: ["week", "wk."],
    days: ["day", "day", "days"],
    hours: ["hour", "hr."],
    minutes: ["minute", "min."],
    seconds: ["second", "sec."]
  };
  const lastable = ["hours", "minutes", "seconds"].indexOf(unit) === -1;
  if (numeric === "auto" && lastable) {
    const isDay = unit === "days";
    switch (count) {
      case 1:
        return isDay ? "tomorrow" : `next ${units[unit][0]}`;
      case -1:
        return isDay ? "yesterday" : `last ${units[unit][0]}`;
      case 0:
        return isDay ? "today" : `this ${units[unit][0]}`;
    }
  }
  const isInPast = Object.is(count, -0) || count < 0, fmtValue = Math.abs(count), singular = fmtValue === 1, lilUnits = units[unit], fmtUnit = narrow ? singular ? lilUnits[1] : lilUnits[2] || lilUnits[1] : singular ? units[unit][0] : unit;
  return isInPast ? `${fmtValue} ${fmtUnit} ago` : `in ${fmtValue} ${fmtUnit}`;
}
function stringifyTokens(splits, tokenToString) {
  let s2 = "";
  for (const token of splits) {
    if (token.literal) {
      s2 += token.val;
    } else {
      s2 += tokenToString(token.val);
    }
  }
  return s2;
}
const macroTokenToFormatOpts = {
  D: DATE_SHORT,
  DD: DATE_MED,
  DDD: DATE_FULL,
  DDDD: DATE_HUGE,
  t: TIME_SIMPLE,
  tt: TIME_WITH_SECONDS,
  ttt: TIME_WITH_SHORT_OFFSET,
  tttt: TIME_WITH_LONG_OFFSET,
  T: TIME_24_SIMPLE,
  TT: TIME_24_WITH_SECONDS,
  TTT: TIME_24_WITH_SHORT_OFFSET,
  TTTT: TIME_24_WITH_LONG_OFFSET,
  f: DATETIME_SHORT,
  ff: DATETIME_MED,
  fff: DATETIME_FULL,
  ffff: DATETIME_HUGE,
  F: DATETIME_SHORT_WITH_SECONDS,
  FF: DATETIME_MED_WITH_SECONDS,
  FFF: DATETIME_FULL_WITH_SECONDS,
  FFFF: DATETIME_HUGE_WITH_SECONDS
};
class Formatter {
  static create(locale, opts = {}) {
    return new Formatter(locale, opts);
  }
  static parseFormat(fmt) {
    let current = null, currentFull = "", bracketed = false;
    const splits = [];
    for (let i = 0; i < fmt.length; i++) {
      const c = fmt.charAt(i);
      if (c === "'") {
        if (currentFull.length > 0 || bracketed) {
          splits.push({
            literal: bracketed || /^\s+$/.test(currentFull),
            val: currentFull === "" ? "'" : currentFull
          });
        }
        current = null;
        currentFull = "";
        bracketed = !bracketed;
      } else if (bracketed) {
        currentFull += c;
      } else if (c === current) {
        currentFull += c;
      } else {
        if (currentFull.length > 0) {
          splits.push({ literal: /^\s+$/.test(currentFull), val: currentFull });
        }
        currentFull = c;
        current = c;
      }
    }
    if (currentFull.length > 0) {
      splits.push({ literal: bracketed || /^\s+$/.test(currentFull), val: currentFull });
    }
    return splits;
  }
  static macroTokenToFormatOpts(token) {
    return macroTokenToFormatOpts[token];
  }
  constructor(locale, formatOpts) {
    this.opts = formatOpts;
    this.loc = locale;
    this.systemLoc = null;
  }
  formatWithSystemDefault(dt, opts) {
    if (this.systemLoc === null) {
      this.systemLoc = this.loc.redefaultToSystem();
    }
    const df = this.systemLoc.dtFormatter(dt, { ...this.opts, ...opts });
    return df.format();
  }
  dtFormatter(dt, opts = {}) {
    return this.loc.dtFormatter(dt, { ...this.opts, ...opts });
  }
  formatDateTime(dt, opts) {
    return this.dtFormatter(dt, opts).format();
  }
  formatDateTimeParts(dt, opts) {
    return this.dtFormatter(dt, opts).formatToParts();
  }
  formatInterval(interval, opts) {
    const df = this.dtFormatter(interval.start, opts);
    return df.dtf.formatRange(interval.start.toJSDate(), interval.end.toJSDate());
  }
  resolvedOptions(dt, opts) {
    return this.dtFormatter(dt, opts).resolvedOptions();
  }
  num(n2, p = 0, signDisplay = void 0) {
    if (this.opts.forceSimple) {
      return padStart(n2, p);
    }
    const opts = { ...this.opts };
    if (p > 0) {
      opts.padTo = p;
    }
    if (signDisplay) {
      opts.signDisplay = signDisplay;
    }
    return this.loc.numberFormatter(opts).format(n2);
  }
  formatDateTimeFromString(dt, fmt) {
    const knownEnglish = this.loc.listingMode() === "en", useDateTimeFormatter = this.loc.outputCalendar && this.loc.outputCalendar !== "gregory", string = (opts, extract) => this.loc.extract(dt, opts, extract), formatOffset2 = (opts) => {
      if (dt.isOffsetFixed && dt.offset === 0 && opts.allowZ) {
        return "Z";
      }
      return dt.isValid ? dt.zone.formatOffset(dt.ts, opts.format) : "";
    }, meridiem = () => knownEnglish ? meridiemForDateTime(dt) : string({ hour: "numeric", hourCycle: "h12" }, "dayperiod"), month = (length, standalone) => knownEnglish ? monthForDateTime(dt, length) : string(standalone ? { month: length } : { month: length, day: "numeric" }, "month"), weekday = (length, standalone) => knownEnglish ? weekdayForDateTime(dt, length) : string(
      standalone ? { weekday: length } : { weekday: length, month: "long", day: "numeric" },
      "weekday"
    ), maybeMacro = (token) => {
      const formatOpts = Formatter.macroTokenToFormatOpts(token);
      if (formatOpts) {
        return this.formatWithSystemDefault(dt, formatOpts);
      } else {
        return token;
      }
    }, era = (length) => knownEnglish ? eraForDateTime(dt, length) : string({ era: length }, "era"), tokenToString = (token) => {
      switch (token) {
        // ms
        case "S":
          return this.num(dt.millisecond);
        case "u":
        // falls through
        case "SSS":
          return this.num(dt.millisecond, 3);
        // seconds
        case "s":
          return this.num(dt.second);
        case "ss":
          return this.num(dt.second, 2);
        // fractional seconds
        case "uu":
          return this.num(Math.floor(dt.millisecond / 10), 2);
        case "uuu":
          return this.num(Math.floor(dt.millisecond / 100));
        // minutes
        case "m":
          return this.num(dt.minute);
        case "mm":
          return this.num(dt.minute, 2);
        // hours
        case "h":
          return this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12);
        case "hh":
          return this.num(dt.hour % 12 === 0 ? 12 : dt.hour % 12, 2);
        case "H":
          return this.num(dt.hour);
        case "HH":
          return this.num(dt.hour, 2);
        // offset
        case "Z":
          return formatOffset2({ format: "narrow", allowZ: this.opts.allowZ });
        case "ZZ":
          return formatOffset2({ format: "short", allowZ: this.opts.allowZ });
        case "ZZZ":
          return formatOffset2({ format: "techie", allowZ: this.opts.allowZ });
        case "ZZZZ":
          return dt.zone.offsetName(dt.ts, { format: "short", locale: this.loc.locale });
        case "ZZZZZ":
          return dt.zone.offsetName(dt.ts, { format: "long", locale: this.loc.locale });
        // zone
        case "z":
          return dt.zoneName;
        // meridiems
        case "a":
          return meridiem();
        // dates
        case "d":
          return useDateTimeFormatter ? string({ day: "numeric" }, "day") : this.num(dt.day);
        case "dd":
          return useDateTimeFormatter ? string({ day: "2-digit" }, "day") : this.num(dt.day, 2);
        // weekdays - standalone
        case "c":
          return this.num(dt.weekday);
        case "ccc":
          return weekday("short", true);
        case "cccc":
          return weekday("long", true);
        case "ccccc":
          return weekday("narrow", true);
        // weekdays - format
        case "E":
          return this.num(dt.weekday);
        case "EEE":
          return weekday("short", false);
        case "EEEE":
          return weekday("long", false);
        case "EEEEE":
          return weekday("narrow", false);
        // months - standalone
        case "L":
          return useDateTimeFormatter ? string({ month: "numeric", day: "numeric" }, "month") : this.num(dt.month);
        case "LL":
          return useDateTimeFormatter ? string({ month: "2-digit", day: "numeric" }, "month") : this.num(dt.month, 2);
        case "LLL":
          return month("short", true);
        case "LLLL":
          return month("long", true);
        case "LLLLL":
          return month("narrow", true);
        // months - format
        case "M":
          return useDateTimeFormatter ? string({ month: "numeric" }, "month") : this.num(dt.month);
        case "MM":
          return useDateTimeFormatter ? string({ month: "2-digit" }, "month") : this.num(dt.month, 2);
        case "MMM":
          return month("short", false);
        case "MMMM":
          return month("long", false);
        case "MMMMM":
          return month("narrow", false);
        // years
        case "y":
          return useDateTimeFormatter ? string({ year: "numeric" }, "year") : this.num(dt.year);
        case "yy":
          return useDateTimeFormatter ? string({ year: "2-digit" }, "year") : this.num(dt.year.toString().slice(-2), 2);
        case "yyyy":
          return useDateTimeFormatter ? string({ year: "numeric" }, "year") : this.num(dt.year, 4);
        case "yyyyyy":
          return useDateTimeFormatter ? string({ year: "numeric" }, "year") : this.num(dt.year, 6);
        // eras
        case "G":
          return era("short");
        case "GG":
          return era("long");
        case "GGGGG":
          return era("narrow");
        case "kk":
          return this.num(dt.weekYear.toString().slice(-2), 2);
        case "kkkk":
          return this.num(dt.weekYear, 4);
        case "W":
          return this.num(dt.weekNumber);
        case "WW":
          return this.num(dt.weekNumber, 2);
        case "n":
          return this.num(dt.localWeekNumber);
        case "nn":
          return this.num(dt.localWeekNumber, 2);
        case "ii":
          return this.num(dt.localWeekYear.toString().slice(-2), 2);
        case "iiii":
          return this.num(dt.localWeekYear, 4);
        case "o":
          return this.num(dt.ordinal);
        case "ooo":
          return this.num(dt.ordinal, 3);
        case "q":
          return this.num(dt.quarter);
        case "qq":
          return this.num(dt.quarter, 2);
        case "X":
          return this.num(Math.floor(dt.ts / 1e3));
        case "x":
          return this.num(dt.ts);
        default:
          return maybeMacro(token);
      }
    };
    return stringifyTokens(Formatter.parseFormat(fmt), tokenToString);
  }
  formatDurationFromString(dur, fmt) {
    const invertLargest = this.opts.signMode === "negativeLargestOnly" ? -1 : 1;
    const tokenToField = (token) => {
      switch (token[0]) {
        case "S":
          return "milliseconds";
        case "s":
          return "seconds";
        case "m":
          return "minutes";
        case "h":
          return "hours";
        case "d":
          return "days";
        case "w":
          return "weeks";
        case "M":
          return "months";
        case "y":
          return "years";
        default:
          return null;
      }
    }, tokenToString = (lildur, info2) => (token) => {
      const mapped = tokenToField(token);
      if (mapped) {
        const inversionFactor = info2.isNegativeDuration && mapped !== info2.largestUnit ? invertLargest : 1;
        let signDisplay;
        if (this.opts.signMode === "negativeLargestOnly" && mapped !== info2.largestUnit) {
          signDisplay = "never";
        } else if (this.opts.signMode === "all") {
          signDisplay = "always";
        } else {
          signDisplay = "auto";
        }
        return this.num(lildur.get(mapped) * inversionFactor, token.length, signDisplay);
      } else {
        return token;
      }
    }, tokens = Formatter.parseFormat(fmt), realTokens = tokens.reduce(
      (found, { literal, val }) => literal ? found : found.concat(val),
      []
    ), collapsed = dur.shiftTo(...realTokens.map(tokenToField).filter((t) => t)), durationInfo = {
      isNegativeDuration: collapsed < 0,
      // this relies on "collapsed" being based on "shiftTo", which builds up the object
      // in order
      largestUnit: Object.keys(collapsed.values)[0]
    };
    return stringifyTokens(tokens, tokenToString(collapsed, durationInfo));
  }
}
const ianaRegex = /[A-Za-z_+-]{1,256}(?::?\/[A-Za-z0-9_+-]{1,256}(?:\/[A-Za-z0-9_+-]{1,256})?)?/;
function combineRegexes(...regexes) {
  const full = regexes.reduce((f, r) => f + r.source, "");
  return RegExp(`^${full}$`);
}
function combineExtractors(...extractors) {
  return (m) => extractors.reduce(
    ([mergedVals, mergedZone, cursor], ex) => {
      const [val, zone, next] = ex(m, cursor);
      return [{ ...mergedVals, ...val }, zone || mergedZone, next];
    },
    [{}, null, 1]
  ).slice(0, 2);
}
function parse(s2, ...patterns) {
  if (s2 == null) {
    return [null, null];
  }
  for (const [regex, extractor] of patterns) {
    const m = regex.exec(s2);
    if (m) {
      return extractor(m);
    }
  }
  return [null, null];
}
function simpleParse(...keys) {
  return (match2, cursor) => {
    const ret = {};
    let i;
    for (i = 0; i < keys.length; i++) {
      ret[keys[i]] = parseInteger(match2[cursor + i]);
    }
    return [ret, null, cursor + i];
  };
}
const offsetRegex = /(?:([Zz])|([+-]\d\d)(?::?(\d\d))?)/;
const isoExtendedZone = `(?:${offsetRegex.source}?(?:\\[(${ianaRegex.source})\\])?)?`;
const isoTimeBaseRegex = /(\d\d)(?::?(\d\d)(?::?(\d\d)(?:[.,](\d{1,30}))?)?)?/;
const isoTimeRegex = RegExp(`${isoTimeBaseRegex.source}${isoExtendedZone}`);
const isoTimeExtensionRegex = RegExp(`(?:[Tt]${isoTimeRegex.source})?`);
const isoYmdRegex = /([+-]\d{6}|\d{4})(?:-?(\d\d)(?:-?(\d\d))?)?/;
const isoWeekRegex = /(\d{4})-?W(\d\d)(?:-?(\d))?/;
const isoOrdinalRegex = /(\d{4})-?(\d{3})/;
const extractISOWeekData = simpleParse("weekYear", "weekNumber", "weekDay");
const extractISOOrdinalData = simpleParse("year", "ordinal");
const sqlYmdRegex = /(\d{4})-(\d\d)-(\d\d)/;
const sqlTimeRegex = RegExp(
  `${isoTimeBaseRegex.source} ?(?:${offsetRegex.source}|(${ianaRegex.source}))?`
);
const sqlTimeExtensionRegex = RegExp(`(?: ${sqlTimeRegex.source})?`);
function int(match2, pos, fallback) {
  const m = match2[pos];
  return isUndefined(m) ? fallback : parseInteger(m);
}
function extractISOYmd(match2, cursor) {
  const item = {
    year: int(match2, cursor),
    month: int(match2, cursor + 1, 1),
    day: int(match2, cursor + 2, 1)
  };
  return [item, null, cursor + 3];
}
function extractISOTime(match2, cursor) {
  const item = {
    hours: int(match2, cursor, 0),
    minutes: int(match2, cursor + 1, 0),
    seconds: int(match2, cursor + 2, 0),
    milliseconds: parseMillis(match2[cursor + 3])
  };
  return [item, null, cursor + 4];
}
function extractISOOffset(match2, cursor) {
  const local = !match2[cursor] && !match2[cursor + 1], fullOffset = signedOffset(match2[cursor + 1], match2[cursor + 2]), zone = local ? null : FixedOffsetZone.instance(fullOffset);
  return [{}, zone, cursor + 3];
}
function extractIANAZone(match2, cursor) {
  const zone = match2[cursor] ? IANAZone.create(match2[cursor]) : null;
  return [{}, zone, cursor + 1];
}
const isoTimeOnly = RegExp(`^T?${isoTimeBaseRegex.source}$`);
const isoDuration = /^-?P(?:(?:(-?\d{1,20}(?:\.\d{1,20})?)Y)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20}(?:\.\d{1,20})?)W)?(?:(-?\d{1,20}(?:\.\d{1,20})?)D)?(?:T(?:(-?\d{1,20}(?:\.\d{1,20})?)H)?(?:(-?\d{1,20}(?:\.\d{1,20})?)M)?(?:(-?\d{1,20})(?:[.,](-?\d{1,20}))?S)?)?)$/;
function extractISODuration(match2) {
  const [s2, yearStr, monthStr, weekStr, dayStr, hourStr, minuteStr, secondStr, millisecondsStr] = match2;
  const hasNegativePrefix = s2[0] === "-";
  const negativeSeconds = secondStr && secondStr[0] === "-";
  const maybeNegate = (num, force = false) => num !== void 0 && (force || num && hasNegativePrefix) ? -num : num;
  return [
    {
      years: maybeNegate(parseFloating(yearStr)),
      months: maybeNegate(parseFloating(monthStr)),
      weeks: maybeNegate(parseFloating(weekStr)),
      days: maybeNegate(parseFloating(dayStr)),
      hours: maybeNegate(parseFloating(hourStr)),
      minutes: maybeNegate(parseFloating(minuteStr)),
      seconds: maybeNegate(parseFloating(secondStr), secondStr === "-0"),
      milliseconds: maybeNegate(parseMillis(millisecondsStr), negativeSeconds)
    }
  ];
}
const obsOffsets = {
  GMT: 0,
  EDT: -4 * 60,
  EST: -5 * 60,
  CDT: -5 * 60,
  CST: -6 * 60,
  MDT: -6 * 60,
  MST: -7 * 60,
  PDT: -7 * 60,
  PST: -8 * 60
};
function fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr) {
  const result = {
    year: yearStr.length === 2 ? untruncateYear(parseInteger(yearStr)) : parseInteger(yearStr),
    month: monthsShort.indexOf(monthStr) + 1,
    day: parseInteger(dayStr),
    hour: parseInteger(hourStr),
    minute: parseInteger(minuteStr)
  };
  if (secondStr) result.second = parseInteger(secondStr);
  if (weekdayStr) {
    result.weekday = weekdayStr.length > 3 ? weekdaysLong.indexOf(weekdayStr) + 1 : weekdaysShort.indexOf(weekdayStr) + 1;
  }
  return result;
}
const rfc2822 = /^(?:(Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s)?(\d{1,2})\s(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s(\d{2,4})\s(\d\d):(\d\d)(?::(\d\d))?\s(?:(UT|GMT|[ECMP][SD]T)|([Zz])|(?:([+-]\d\d)(\d\d)))$/;
function extractRFC2822(match2) {
  const [
    ,
    weekdayStr,
    dayStr,
    monthStr,
    yearStr,
    hourStr,
    minuteStr,
    secondStr,
    obsOffset,
    milOffset,
    offHourStr,
    offMinuteStr
  ] = match2, result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
  let offset2;
  if (obsOffset) {
    offset2 = obsOffsets[obsOffset];
  } else if (milOffset) {
    offset2 = 0;
  } else {
    offset2 = signedOffset(offHourStr, offMinuteStr);
  }
  return [result, new FixedOffsetZone(offset2)];
}
function preprocessRFC2822(s2) {
  return s2.replace(/\([^()]*\)|[\n\t]/g, " ").replace(/(\s\s+)/g, " ").trim();
}
const rfc1123 = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d\d) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d\d):(\d\d):(\d\d) GMT$/, rfc850 = /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d\d)-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d\d) (\d\d):(\d\d):(\d\d) GMT$/, ascii = /^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( \d|\d\d) (\d\d):(\d\d):(\d\d) (\d{4})$/;
function extractRFC1123Or850(match2) {
  const [, weekdayStr, dayStr, monthStr, yearStr, hourStr, minuteStr, secondStr] = match2, result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
  return [result, FixedOffsetZone.utcInstance];
}
function extractASCII(match2) {
  const [, weekdayStr, monthStr, dayStr, hourStr, minuteStr, secondStr, yearStr] = match2, result = fromStrings(weekdayStr, yearStr, monthStr, dayStr, hourStr, minuteStr, secondStr);
  return [result, FixedOffsetZone.utcInstance];
}
const isoYmdWithTimeExtensionRegex = combineRegexes(isoYmdRegex, isoTimeExtensionRegex);
const isoWeekWithTimeExtensionRegex = combineRegexes(isoWeekRegex, isoTimeExtensionRegex);
const isoOrdinalWithTimeExtensionRegex = combineRegexes(isoOrdinalRegex, isoTimeExtensionRegex);
const isoTimeCombinedRegex = combineRegexes(isoTimeRegex);
const extractISOYmdTimeAndOffset = combineExtractors(
  extractISOYmd,
  extractISOTime,
  extractISOOffset,
  extractIANAZone
);
const extractISOWeekTimeAndOffset = combineExtractors(
  extractISOWeekData,
  extractISOTime,
  extractISOOffset,
  extractIANAZone
);
const extractISOOrdinalDateAndTime = combineExtractors(
  extractISOOrdinalData,
  extractISOTime,
  extractISOOffset,
  extractIANAZone
);
const extractISOTimeAndOffset = combineExtractors(
  extractISOTime,
  extractISOOffset,
  extractIANAZone
);
function parseISODate(s2) {
  return parse(
    s2,
    [isoYmdWithTimeExtensionRegex, extractISOYmdTimeAndOffset],
    [isoWeekWithTimeExtensionRegex, extractISOWeekTimeAndOffset],
    [isoOrdinalWithTimeExtensionRegex, extractISOOrdinalDateAndTime],
    [isoTimeCombinedRegex, extractISOTimeAndOffset]
  );
}
function parseRFC2822Date(s2) {
  return parse(preprocessRFC2822(s2), [rfc2822, extractRFC2822]);
}
function parseHTTPDate(s2) {
  return parse(
    s2,
    [rfc1123, extractRFC1123Or850],
    [rfc850, extractRFC1123Or850],
    [ascii, extractASCII]
  );
}
function parseISODuration(s2) {
  return parse(s2, [isoDuration, extractISODuration]);
}
const extractISOTimeOnly = combineExtractors(extractISOTime);
function parseISOTimeOnly(s2) {
  return parse(s2, [isoTimeOnly, extractISOTimeOnly]);
}
const sqlYmdWithTimeExtensionRegex = combineRegexes(sqlYmdRegex, sqlTimeExtensionRegex);
const sqlTimeCombinedRegex = combineRegexes(sqlTimeRegex);
const extractISOTimeOffsetAndIANAZone = combineExtractors(
  extractISOTime,
  extractISOOffset,
  extractIANAZone
);
function parseSQL(s2) {
  return parse(
    s2,
    [sqlYmdWithTimeExtensionRegex, extractISOYmdTimeAndOffset],
    [sqlTimeCombinedRegex, extractISOTimeOffsetAndIANAZone]
  );
}
const INVALID$2 = "Invalid Duration";
const lowOrderMatrix = {
  weeks: {
    days: 7,
    hours: 7 * 24,
    minutes: 7 * 24 * 60,
    seconds: 7 * 24 * 60 * 60,
    milliseconds: 7 * 24 * 60 * 60 * 1e3
  },
  days: {
    hours: 24,
    minutes: 24 * 60,
    seconds: 24 * 60 * 60,
    milliseconds: 24 * 60 * 60 * 1e3
  },
  hours: { minutes: 60, seconds: 60 * 60, milliseconds: 60 * 60 * 1e3 },
  minutes: { seconds: 60, milliseconds: 60 * 1e3 },
  seconds: { milliseconds: 1e3 }
}, casualMatrix = {
  years: {
    quarters: 4,
    months: 12,
    weeks: 52,
    days: 365,
    hours: 365 * 24,
    minutes: 365 * 24 * 60,
    seconds: 365 * 24 * 60 * 60,
    milliseconds: 365 * 24 * 60 * 60 * 1e3
  },
  quarters: {
    months: 3,
    weeks: 13,
    days: 91,
    hours: 91 * 24,
    minutes: 91 * 24 * 60,
    seconds: 91 * 24 * 60 * 60,
    milliseconds: 91 * 24 * 60 * 60 * 1e3
  },
  months: {
    weeks: 4,
    days: 30,
    hours: 30 * 24,
    minutes: 30 * 24 * 60,
    seconds: 30 * 24 * 60 * 60,
    milliseconds: 30 * 24 * 60 * 60 * 1e3
  },
  ...lowOrderMatrix
}, daysInYearAccurate = 146097 / 400, daysInMonthAccurate = 146097 / 4800, accurateMatrix = {
  years: {
    quarters: 4,
    months: 12,
    weeks: daysInYearAccurate / 7,
    days: daysInYearAccurate,
    hours: daysInYearAccurate * 24,
    minutes: daysInYearAccurate * 24 * 60,
    seconds: daysInYearAccurate * 24 * 60 * 60,
    milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1e3
  },
  quarters: {
    months: 3,
    weeks: daysInYearAccurate / 28,
    days: daysInYearAccurate / 4,
    hours: daysInYearAccurate * 24 / 4,
    minutes: daysInYearAccurate * 24 * 60 / 4,
    seconds: daysInYearAccurate * 24 * 60 * 60 / 4,
    milliseconds: daysInYearAccurate * 24 * 60 * 60 * 1e3 / 4
  },
  months: {
    weeks: daysInMonthAccurate / 7,
    days: daysInMonthAccurate,
    hours: daysInMonthAccurate * 24,
    minutes: daysInMonthAccurate * 24 * 60,
    seconds: daysInMonthAccurate * 24 * 60 * 60,
    milliseconds: daysInMonthAccurate * 24 * 60 * 60 * 1e3
  },
  ...lowOrderMatrix
};
const orderedUnits$1 = [
  "years",
  "quarters",
  "months",
  "weeks",
  "days",
  "hours",
  "minutes",
  "seconds",
  "milliseconds"
];
const reverseUnits = orderedUnits$1.slice(0).reverse();
function clone$1(dur, alts, clear = false) {
  const conf = {
    values: clear ? alts.values : { ...dur.values, ...alts.values || {} },
    loc: dur.loc.clone(alts.loc),
    conversionAccuracy: alts.conversionAccuracy || dur.conversionAccuracy,
    matrix: alts.matrix || dur.matrix
  };
  return new Duration(conf);
}
function durationToMillis(matrix, vals) {
  let sum = vals.milliseconds ?? 0;
  for (const unit of reverseUnits.slice(1)) {
    if (vals[unit]) {
      sum += vals[unit] * matrix[unit]["milliseconds"];
    }
  }
  return sum;
}
function normalizeValues(matrix, vals) {
  const factor = durationToMillis(matrix, vals) < 0 ? -1 : 1;
  orderedUnits$1.reduceRight((previous, current) => {
    if (!isUndefined(vals[current])) {
      if (previous) {
        const previousVal = vals[previous] * factor;
        const conv = matrix[current][previous];
        const rollUp = Math.floor(previousVal / conv);
        vals[current] += rollUp * factor;
        vals[previous] -= rollUp * conv * factor;
      }
      return current;
    } else {
      return previous;
    }
  }, null);
  orderedUnits$1.reduce((previous, current) => {
    if (!isUndefined(vals[current])) {
      if (previous) {
        const fraction = vals[previous] % 1;
        vals[previous] -= fraction;
        vals[current] += fraction * matrix[previous][current];
      }
      return current;
    } else {
      return previous;
    }
  }, null);
}
function removeZeroes(vals) {
  const newVals = {};
  for (const [key, value] of Object.entries(vals)) {
    if (value !== 0) {
      newVals[key] = value;
    }
  }
  return newVals;
}
class Duration {
  /**
   * @private
   */
  constructor(config) {
    const accurate = config.conversionAccuracy === "longterm" || false;
    let matrix = accurate ? accurateMatrix : casualMatrix;
    if (config.matrix) {
      matrix = config.matrix;
    }
    this.values = config.values;
    this.loc = config.loc || Locale.create();
    this.conversionAccuracy = accurate ? "longterm" : "casual";
    this.invalid = config.invalid || null;
    this.matrix = matrix;
    this.isLuxonDuration = true;
  }
  /**
   * Create Duration from a number of milliseconds.
   * @param {number} count of milliseconds
   * @param {Object} opts - options for parsing
   * @param {string} [opts.locale='en-US'] - the locale to use
   * @param {string} opts.numberingSystem - the numbering system to use
   * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
   * @return {Duration}
   */
  static fromMillis(count, opts) {
    return Duration.fromObject({ milliseconds: count }, opts);
  }
  /**
   * Create a Duration from a JavaScript object with keys like 'years' and 'hours'.
   * If this object is empty then a zero milliseconds duration is returned.
   * @param {Object} obj - the object to create the DateTime from
   * @param {number} obj.years
   * @param {number} obj.quarters
   * @param {number} obj.months
   * @param {number} obj.weeks
   * @param {number} obj.days
   * @param {number} obj.hours
   * @param {number} obj.minutes
   * @param {number} obj.seconds
   * @param {number} obj.milliseconds
   * @param {Object} [opts=[]] - options for creating this Duration
   * @param {string} [opts.locale='en-US'] - the locale to use
   * @param {string} opts.numberingSystem - the numbering system to use
   * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
   * @param {string} [opts.matrix=Object] - the custom conversion system to use
   * @return {Duration}
   */
  static fromObject(obj, opts = {}) {
    if (obj == null || typeof obj !== "object") {
      throw new InvalidArgumentError(
        `Duration.fromObject: argument expected to be an object, got ${obj === null ? "null" : typeof obj}`
      );
    }
    return new Duration({
      values: normalizeObject(obj, Duration.normalizeUnit),
      loc: Locale.fromObject(opts),
      conversionAccuracy: opts.conversionAccuracy,
      matrix: opts.matrix
    });
  }
  /**
   * Create a Duration from DurationLike.
   *
   * @param {Object | number | Duration} durationLike
   * One of:
   * - object with keys like 'years' and 'hours'.
   * - number representing milliseconds
   * - Duration instance
   * @return {Duration}
   */
  static fromDurationLike(durationLike) {
    if (isNumber(durationLike)) {
      return Duration.fromMillis(durationLike);
    } else if (Duration.isDuration(durationLike)) {
      return durationLike;
    } else if (typeof durationLike === "object") {
      return Duration.fromObject(durationLike);
    } else {
      throw new InvalidArgumentError(
        `Unknown duration argument ${durationLike} of type ${typeof durationLike}`
      );
    }
  }
  /**
   * Create a Duration from an ISO 8601 duration string.
   * @param {string} text - text to parse
   * @param {Object} opts - options for parsing
   * @param {string} [opts.locale='en-US'] - the locale to use
   * @param {string} opts.numberingSystem - the numbering system to use
   * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
   * @param {string} [opts.matrix=Object] - the preset conversion system to use
   * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
   * @example Duration.fromISO('P3Y6M1W4DT12H30M5S').toObject() //=> { years: 3, months: 6, weeks: 1, days: 4, hours: 12, minutes: 30, seconds: 5 }
   * @example Duration.fromISO('PT23H').toObject() //=> { hours: 23 }
   * @example Duration.fromISO('P5Y3M').toObject() //=> { years: 5, months: 3 }
   * @return {Duration}
   */
  static fromISO(text, opts) {
    const [parsed] = parseISODuration(text);
    if (parsed) {
      return Duration.fromObject(parsed, opts);
    } else {
      return Duration.invalid("unparsable", `the input "${text}" can't be parsed as ISO 8601`);
    }
  }
  /**
   * Create a Duration from an ISO 8601 time string.
   * @param {string} text - text to parse
   * @param {Object} opts - options for parsing
   * @param {string} [opts.locale='en-US'] - the locale to use
   * @param {string} opts.numberingSystem - the numbering system to use
   * @param {string} [opts.conversionAccuracy='casual'] - the preset conversion system to use
   * @param {string} [opts.matrix=Object] - the conversion system to use
   * @see https://en.wikipedia.org/wiki/ISO_8601#Times
   * @example Duration.fromISOTime('11:22:33.444').toObject() //=> { hours: 11, minutes: 22, seconds: 33, milliseconds: 444 }
   * @example Duration.fromISOTime('11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
   * @example Duration.fromISOTime('T11:00').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
   * @example Duration.fromISOTime('1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
   * @example Duration.fromISOTime('T1100').toObject() //=> { hours: 11, minutes: 0, seconds: 0 }
   * @return {Duration}
   */
  static fromISOTime(text, opts) {
    const [parsed] = parseISOTimeOnly(text);
    if (parsed) {
      return Duration.fromObject(parsed, opts);
    } else {
      return Duration.invalid("unparsable", `the input "${text}" can't be parsed as ISO 8601`);
    }
  }
  /**
   * Create an invalid Duration.
   * @param {string} reason - simple string of why this datetime is invalid. Should not contain parameters or anything else data-dependent
   * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
   * @return {Duration}
   */
  static invalid(reason, explanation = null) {
    if (!reason) {
      throw new InvalidArgumentError("need to specify a reason the Duration is invalid");
    }
    const invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
    if (Settings.throwOnInvalid) {
      throw new InvalidDurationError(invalid);
    } else {
      return new Duration({ invalid });
    }
  }
  /**
   * @private
   */
  static normalizeUnit(unit) {
    const normalized = {
      year: "years",
      years: "years",
      quarter: "quarters",
      quarters: "quarters",
      month: "months",
      months: "months",
      week: "weeks",
      weeks: "weeks",
      day: "days",
      days: "days",
      hour: "hours",
      hours: "hours",
      minute: "minutes",
      minutes: "minutes",
      second: "seconds",
      seconds: "seconds",
      millisecond: "milliseconds",
      milliseconds: "milliseconds"
    }[unit ? unit.toLowerCase() : unit];
    if (!normalized) throw new InvalidUnitError(unit);
    return normalized;
  }
  /**
   * Check if an object is a Duration. Works across context boundaries
   * @param {object} o
   * @return {boolean}
   */
  static isDuration(o) {
    return o && o.isLuxonDuration || false;
  }
  /**
   * Get  the locale of a Duration, such 'en-GB'
   * @type {string}
   */
  get locale() {
    return this.isValid ? this.loc.locale : null;
  }
  /**
   * Get the numbering system of a Duration, such 'beng'. The numbering system is used when formatting the Duration
   *
   * @type {string}
   */
  get numberingSystem() {
    return this.isValid ? this.loc.numberingSystem : null;
  }
  /**
   * Returns a string representation of this Duration formatted according to the specified format string. You may use these tokens:
   * * `S` for milliseconds
   * * `s` for seconds
   * * `m` for minutes
   * * `h` for hours
   * * `d` for days
   * * `w` for weeks
   * * `M` for months
   * * `y` for years
   * Notes:
   * * Add padding by repeating the token, e.g. "yy" pads the years to two digits, "hhhh" pads the hours out to four digits
   * * Tokens can be escaped by wrapping with single quotes.
   * * The duration will be converted to the set of units in the format string using {@link Duration#shiftTo} and the Durations's conversion accuracy setting.
   * @param {string} fmt - the format string
   * @param {Object} opts - options
   * @param {boolean} [opts.floor=true] - floor numerical values
   * @param {'negative'|'all'|'negativeLargestOnly'} [opts.signMode=negative] - How to handle signs
   * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("y d s") //=> "1 6 2"
   * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("yy dd sss") //=> "01 06 002"
   * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toFormat("M S") //=> "12 518402000"
   * @example Duration.fromObject({ days: 6, seconds: 2 }).toFormat("d s", { signMode: "all" }) //=> "+6 +2"
   * @example Duration.fromObject({ days: -6, seconds: -2 }).toFormat("d s", { signMode: "all" }) //=> "-6 -2"
   * @example Duration.fromObject({ days: -6, seconds: -2 }).toFormat("d s", { signMode: "negativeLargestOnly" }) //=> "-6 2"
   * @return {string}
   */
  toFormat(fmt, opts = {}) {
    const fmtOpts = {
      ...opts,
      floor: opts.round !== false && opts.floor !== false
    };
    return this.isValid ? Formatter.create(this.loc, fmtOpts).formatDurationFromString(this, fmt) : INVALID$2;
  }
  /**
   * Returns a string representation of a Duration with all units included.
   * To modify its behavior, use `listStyle` and any Intl.NumberFormat option, though `unitDisplay` is especially relevant.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl/NumberFormat/NumberFormat#options
   * @param {Object} opts - Formatting options. Accepts the same keys as the options parameter of the native `Intl.NumberFormat` constructor, as well as `listStyle`.
   * @param {string} [opts.listStyle='narrow'] - How to format the merged list. Corresponds to the `style` property of the options parameter of the native `Intl.ListFormat` constructor.
   * @param {boolean} [opts.showZeros=true] - Show all units previously used by the duration even if they are zero
   * @example
   * ```js
   * var dur = Duration.fromObject({ months: 1, weeks: 0, hours: 5, minutes: 6 })
   * dur.toHuman() //=> '1 month, 0 weeks, 5 hours, 6 minutes'
   * dur.toHuman({ listStyle: "long" }) //=> '1 month, 0 weeks, 5 hours, and 6 minutes'
   * dur.toHuman({ unitDisplay: "short" }) //=> '1 mth, 0 wks, 5 hr, 6 min'
   * dur.toHuman({ showZeros: false }) //=> '1 month, 5 hours, 6 minutes'
   * ```
   */
  toHuman(opts = {}) {
    if (!this.isValid) return INVALID$2;
    const showZeros = opts.showZeros !== false;
    const l2 = orderedUnits$1.map((unit) => {
      const val = this.values[unit];
      if (isUndefined(val) || val === 0 && !showZeros) {
        return null;
      }
      return this.loc.numberFormatter({ style: "unit", unitDisplay: "long", ...opts, unit: unit.slice(0, -1) }).format(val);
    }).filter((n2) => n2);
    return this.loc.listFormatter({ type: "conjunction", style: opts.listStyle || "narrow", ...opts }).format(l2);
  }
  /**
   * Returns a JavaScript object with this Duration's values.
   * @example Duration.fromObject({ years: 1, days: 6, seconds: 2 }).toObject() //=> { years: 1, days: 6, seconds: 2 }
   * @return {Object}
   */
  toObject() {
    if (!this.isValid) return {};
    return { ...this.values };
  }
  /**
   * Returns an ISO 8601-compliant string representation of this Duration.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Durations
   * @example Duration.fromObject({ years: 3, seconds: 45 }).toISO() //=> 'P3YT45S'
   * @example Duration.fromObject({ months: 4, seconds: 45 }).toISO() //=> 'P4MT45S'
   * @example Duration.fromObject({ months: 5 }).toISO() //=> 'P5M'
   * @example Duration.fromObject({ minutes: 5 }).toISO() //=> 'PT5M'
   * @example Duration.fromObject({ milliseconds: 6 }).toISO() //=> 'PT0.006S'
   * @return {string}
   */
  toISO() {
    if (!this.isValid) return null;
    let s2 = "P";
    if (this.years !== 0) s2 += this.years + "Y";
    if (this.months !== 0 || this.quarters !== 0) s2 += this.months + this.quarters * 3 + "M";
    if (this.weeks !== 0) s2 += this.weeks + "W";
    if (this.days !== 0) s2 += this.days + "D";
    if (this.hours !== 0 || this.minutes !== 0 || this.seconds !== 0 || this.milliseconds !== 0)
      s2 += "T";
    if (this.hours !== 0) s2 += this.hours + "H";
    if (this.minutes !== 0) s2 += this.minutes + "M";
    if (this.seconds !== 0 || this.milliseconds !== 0)
      s2 += roundTo(this.seconds + this.milliseconds / 1e3, 3) + "S";
    if (s2 === "P") s2 += "T0S";
    return s2;
  }
  /**
   * Returns an ISO 8601-compliant string representation of this Duration, formatted as a time of day.
   * Note that this will return null if the duration is invalid, negative, or equal to or greater than 24 hours.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Times
   * @param {Object} opts - options
   * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
   * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
   * @param {boolean} [opts.includePrefix=false] - include the `T` prefix
   * @param {string} [opts.format='extended'] - choose between the basic and extended format
   * @example Duration.fromObject({ hours: 11 }).toISOTime() //=> '11:00:00.000'
   * @example Duration.fromObject({ hours: 11 }).toISOTime({ suppressMilliseconds: true }) //=> '11:00:00'
   * @example Duration.fromObject({ hours: 11 }).toISOTime({ suppressSeconds: true }) //=> '11:00'
   * @example Duration.fromObject({ hours: 11 }).toISOTime({ includePrefix: true }) //=> 'T11:00:00.000'
   * @example Duration.fromObject({ hours: 11 }).toISOTime({ format: 'basic' }) //=> '110000.000'
   * @return {string}
   */
  toISOTime(opts = {}) {
    if (!this.isValid) return null;
    const millis = this.toMillis();
    if (millis < 0 || millis >= 864e5) return null;
    opts = {
      suppressMilliseconds: false,
      suppressSeconds: false,
      includePrefix: false,
      format: "extended",
      ...opts,
      includeOffset: false
    };
    const dateTime = DateTime.fromMillis(millis, { zone: "UTC" });
    return dateTime.toISOTime(opts);
  }
  /**
   * Returns an ISO 8601 representation of this Duration appropriate for use in JSON.
   * @return {string}
   */
  toJSON() {
    return this.toISO();
  }
  /**
   * Returns an ISO 8601 representation of this Duration appropriate for use in debugging.
   * @return {string}
   */
  toString() {
    return this.toISO();
  }
  /**
   * Returns a string representation of this Duration appropriate for the REPL.
   * @return {string}
   */
  [Symbol.for("nodejs.util.inspect.custom")]() {
    if (this.isValid) {
      return `Duration { values: ${JSON.stringify(this.values)} }`;
    } else {
      return `Duration { Invalid, reason: ${this.invalidReason} }`;
    }
  }
  /**
   * Returns an milliseconds value of this Duration.
   * @return {number}
   */
  toMillis() {
    if (!this.isValid) return NaN;
    return durationToMillis(this.matrix, this.values);
  }
  /**
   * Returns an milliseconds value of this Duration. Alias of {@link toMillis}
   * @return {number}
   */
  valueOf() {
    return this.toMillis();
  }
  /**
   * Make this Duration longer by the specified amount. Return a newly-constructed Duration.
   * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
   * @return {Duration}
   */
  plus(duration) {
    if (!this.isValid) return this;
    const dur = Duration.fromDurationLike(duration), result = {};
    for (const k of orderedUnits$1) {
      if (hasOwnProperty(dur.values, k) || hasOwnProperty(this.values, k)) {
        result[k] = dur.get(k) + this.get(k);
      }
    }
    return clone$1(this, { values: result }, true);
  }
  /**
   * Make this Duration shorter by the specified amount. Return a newly-constructed Duration.
   * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
   * @return {Duration}
   */
  minus(duration) {
    if (!this.isValid) return this;
    const dur = Duration.fromDurationLike(duration);
    return this.plus(dur.negate());
  }
  /**
   * Scale this Duration by the specified amount. Return a newly-constructed Duration.
   * @param {function} fn - The function to apply to each unit. Arity is 1 or 2: the value of the unit and, optionally, the unit name. Must return a number.
   * @example Duration.fromObject({ hours: 1, minutes: 30 }).mapUnits(x => x * 2) //=> { hours: 2, minutes: 60 }
   * @example Duration.fromObject({ hours: 1, minutes: 30 }).mapUnits((x, u) => u === "hours" ? x * 2 : x) //=> { hours: 2, minutes: 30 }
   * @return {Duration}
   */
  mapUnits(fn) {
    if (!this.isValid) return this;
    const result = {};
    for (const k of Object.keys(this.values)) {
      result[k] = asNumber(fn(this.values[k], k));
    }
    return clone$1(this, { values: result }, true);
  }
  /**
   * Get the value of unit.
   * @param {string} unit - a unit such as 'minute' or 'day'
   * @example Duration.fromObject({years: 2, days: 3}).get('years') //=> 2
   * @example Duration.fromObject({years: 2, days: 3}).get('months') //=> 0
   * @example Duration.fromObject({years: 2, days: 3}).get('days') //=> 3
   * @return {number}
   */
  get(unit) {
    return this[Duration.normalizeUnit(unit)];
  }
  /**
   * "Set" the values of specified units. Return a newly-constructed Duration.
   * @param {Object} values - a mapping of units to numbers
   * @example dur.set({ years: 2017 })
   * @example dur.set({ hours: 8, minutes: 30 })
   * @return {Duration}
   */
  set(values) {
    if (!this.isValid) return this;
    const mixed = { ...this.values, ...normalizeObject(values, Duration.normalizeUnit) };
    return clone$1(this, { values: mixed });
  }
  /**
   * "Set" the locale and/or numberingSystem.  Returns a newly-constructed Duration.
   * @example dur.reconfigure({ locale: 'en-GB' })
   * @return {Duration}
   */
  reconfigure({ locale, numberingSystem, conversionAccuracy, matrix } = {}) {
    const loc = this.loc.clone({ locale, numberingSystem });
    const opts = { loc, matrix, conversionAccuracy };
    return clone$1(this, opts);
  }
  /**
   * Return the length of the duration in the specified unit.
   * @param {string} unit - a unit such as 'minutes' or 'days'
   * @example Duration.fromObject({years: 1}).as('days') //=> 365
   * @example Duration.fromObject({years: 1}).as('months') //=> 12
   * @example Duration.fromObject({hours: 60}).as('days') //=> 2.5
   * @return {number}
   */
  as(unit) {
    return this.isValid ? this.shiftTo(unit).get(unit) : NaN;
  }
  /**
   * Reduce this Duration to its canonical representation in its current units.
   * Assuming the overall value of the Duration is positive, this means:
   * - excessive values for lower-order units are converted to higher-order units (if possible, see first and second example)
   * - negative lower-order units are converted to higher order units (there must be such a higher order unit, otherwise
   *   the overall value would be negative, see third example)
   * - fractional values for higher-order units are converted to lower-order units (if possible, see fourth example)
   *
   * If the overall value is negative, the result of this method is equivalent to `this.negate().normalize().negate()`.
   * @example Duration.fromObject({ years: 2, days: 5000 }).normalize().toObject() //=> { years: 15, days: 255 }
   * @example Duration.fromObject({ days: 5000 }).normalize().toObject() //=> { days: 5000 }
   * @example Duration.fromObject({ hours: 12, minutes: -45 }).normalize().toObject() //=> { hours: 11, minutes: 15 }
   * @example Duration.fromObject({ years: 2.5, days: 0, hours: 0 }).normalize().toObject() //=> { years: 2, days: 182, hours: 12 }
   * @return {Duration}
   */
  normalize() {
    if (!this.isValid) return this;
    const vals = this.toObject();
    normalizeValues(this.matrix, vals);
    return clone$1(this, { values: vals }, true);
  }
  /**
   * Rescale units to its largest representation
   * @example Duration.fromObject({ milliseconds: 90000 }).rescale().toObject() //=> { minutes: 1, seconds: 30 }
   * @return {Duration}
   */
  rescale() {
    if (!this.isValid) return this;
    const vals = removeZeroes(this.normalize().shiftToAll().toObject());
    return clone$1(this, { values: vals }, true);
  }
  /**
   * Convert this Duration into its representation in a different set of units.
   * @example Duration.fromObject({ hours: 1, seconds: 30 }).shiftTo('minutes', 'milliseconds').toObject() //=> { minutes: 60, milliseconds: 30000 }
   * @return {Duration}
   */
  shiftTo(...units) {
    if (!this.isValid) return this;
    if (units.length === 0) {
      return this;
    }
    units = units.map((u) => Duration.normalizeUnit(u));
    const built = {}, accumulated = {}, vals = this.toObject();
    let lastUnit;
    for (const k of orderedUnits$1) {
      if (units.indexOf(k) >= 0) {
        lastUnit = k;
        let own = 0;
        for (const ak in accumulated) {
          own += this.matrix[ak][k] * accumulated[ak];
          accumulated[ak] = 0;
        }
        if (isNumber(vals[k])) {
          own += vals[k];
        }
        const i = Math.trunc(own);
        built[k] = i;
        accumulated[k] = (own * 1e3 - i * 1e3) / 1e3;
      } else if (isNumber(vals[k])) {
        accumulated[k] = vals[k];
      }
    }
    for (const key in accumulated) {
      if (accumulated[key] !== 0) {
        built[lastUnit] += key === lastUnit ? accumulated[key] : accumulated[key] / this.matrix[lastUnit][key];
      }
    }
    normalizeValues(this.matrix, built);
    return clone$1(this, { values: built }, true);
  }
  /**
   * Shift this Duration to all available units.
   * Same as shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds", "milliseconds")
   * @return {Duration}
   */
  shiftToAll() {
    if (!this.isValid) return this;
    return this.shiftTo(
      "years",
      "months",
      "weeks",
      "days",
      "hours",
      "minutes",
      "seconds",
      "milliseconds"
    );
  }
  /**
   * Return the negative of this Duration.
   * @example Duration.fromObject({ hours: 1, seconds: 30 }).negate().toObject() //=> { hours: -1, seconds: -30 }
   * @return {Duration}
   */
  negate() {
    if (!this.isValid) return this;
    const negated = {};
    for (const k of Object.keys(this.values)) {
      negated[k] = this.values[k] === 0 ? 0 : -this.values[k];
    }
    return clone$1(this, { values: negated }, true);
  }
  /**
   * Removes all units with values equal to 0 from this Duration.
   * @example Duration.fromObject({ years: 2, days: 0, hours: 0, minutes: 0 }).removeZeros().toObject() //=> { years: 2 }
   * @return {Duration}
   */
  removeZeros() {
    if (!this.isValid) return this;
    const vals = removeZeroes(this.values);
    return clone$1(this, { values: vals }, true);
  }
  /**
   * Get the years.
   * @type {number}
   */
  get years() {
    return this.isValid ? this.values.years || 0 : NaN;
  }
  /**
   * Get the quarters.
   * @type {number}
   */
  get quarters() {
    return this.isValid ? this.values.quarters || 0 : NaN;
  }
  /**
   * Get the months.
   * @type {number}
   */
  get months() {
    return this.isValid ? this.values.months || 0 : NaN;
  }
  /**
   * Get the weeks
   * @type {number}
   */
  get weeks() {
    return this.isValid ? this.values.weeks || 0 : NaN;
  }
  /**
   * Get the days.
   * @type {number}
   */
  get days() {
    return this.isValid ? this.values.days || 0 : NaN;
  }
  /**
   * Get the hours.
   * @type {number}
   */
  get hours() {
    return this.isValid ? this.values.hours || 0 : NaN;
  }
  /**
   * Get the minutes.
   * @type {number}
   */
  get minutes() {
    return this.isValid ? this.values.minutes || 0 : NaN;
  }
  /**
   * Get the seconds.
   * @return {number}
   */
  get seconds() {
    return this.isValid ? this.values.seconds || 0 : NaN;
  }
  /**
   * Get the milliseconds.
   * @return {number}
   */
  get milliseconds() {
    return this.isValid ? this.values.milliseconds || 0 : NaN;
  }
  /**
   * Returns whether the Duration is invalid. Invalid durations are returned by diff operations
   * on invalid DateTimes or Intervals.
   * @return {boolean}
   */
  get isValid() {
    return this.invalid === null;
  }
  /**
   * Returns an error code if this Duration became invalid, or null if the Duration is valid
   * @return {string}
   */
  get invalidReason() {
    return this.invalid ? this.invalid.reason : null;
  }
  /**
   * Returns an explanation of why this Duration became invalid, or null if the Duration is valid
   * @type {string}
   */
  get invalidExplanation() {
    return this.invalid ? this.invalid.explanation : null;
  }
  /**
   * Equality check
   * Two Durations are equal iff they have the same units and the same values for each unit.
   * @param {Duration} other
   * @return {boolean}
   */
  equals(other) {
    if (!this.isValid || !other.isValid) {
      return false;
    }
    if (!this.loc.equals(other.loc)) {
      return false;
    }
    function eq(v1, v2) {
      if (v1 === void 0 || v1 === 0) return v2 === void 0 || v2 === 0;
      return v1 === v2;
    }
    for (const u of orderedUnits$1) {
      if (!eq(this.values[u], other.values[u])) {
        return false;
      }
    }
    return true;
  }
}
const INVALID$1 = "Invalid Interval";
function validateStartEnd(start, end) {
  if (!start || !start.isValid) {
    return Interval.invalid("missing or invalid start");
  } else if (!end || !end.isValid) {
    return Interval.invalid("missing or invalid end");
  } else if (end < start) {
    return Interval.invalid(
      "end before start",
      `The end of an interval must be after its start, but you had start=${start.toISO()} and end=${end.toISO()}`
    );
  } else {
    return null;
  }
}
class Interval {
  /**
   * @private
   */
  constructor(config) {
    this.s = config.start;
    this.e = config.end;
    this.invalid = config.invalid || null;
    this.isLuxonInterval = true;
  }
  /**
   * Create an invalid Interval.
   * @param {string} reason - simple string of why this Interval is invalid. Should not contain parameters or anything else data-dependent
   * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
   * @return {Interval}
   */
  static invalid(reason, explanation = null) {
    if (!reason) {
      throw new InvalidArgumentError("need to specify a reason the Interval is invalid");
    }
    const invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
    if (Settings.throwOnInvalid) {
      throw new InvalidIntervalError(invalid);
    } else {
      return new Interval({ invalid });
    }
  }
  /**
   * Create an Interval from a start DateTime and an end DateTime. Inclusive of the start but not the end.
   * @param {DateTime|Date|Object} start
   * @param {DateTime|Date|Object} end
   * @return {Interval}
   */
  static fromDateTimes(start, end) {
    const builtStart = friendlyDateTime(start), builtEnd = friendlyDateTime(end);
    const validateError = validateStartEnd(builtStart, builtEnd);
    if (validateError == null) {
      return new Interval({
        start: builtStart,
        end: builtEnd
      });
    } else {
      return validateError;
    }
  }
  /**
   * Create an Interval from a start DateTime and a Duration to extend to.
   * @param {DateTime|Date|Object} start
   * @param {Duration|Object|number} duration - the length of the Interval.
   * @return {Interval}
   */
  static after(start, duration) {
    const dur = Duration.fromDurationLike(duration), dt = friendlyDateTime(start);
    return Interval.fromDateTimes(dt, dt.plus(dur));
  }
  /**
   * Create an Interval from an end DateTime and a Duration to extend backwards to.
   * @param {DateTime|Date|Object} end
   * @param {Duration|Object|number} duration - the length of the Interval.
   * @return {Interval}
   */
  static before(end, duration) {
    const dur = Duration.fromDurationLike(duration), dt = friendlyDateTime(end);
    return Interval.fromDateTimes(dt.minus(dur), dt);
  }
  /**
   * Create an Interval from an ISO 8601 string.
   * Accepts `<start>/<end>`, `<start>/<duration>`, and `<duration>/<end>` formats.
   * @param {string} text - the ISO string to parse
   * @param {Object} [opts] - options to pass {@link DateTime#fromISO} and optionally {@link Duration#fromISO}
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @return {Interval}
   */
  static fromISO(text, opts) {
    const [s2, e] = (text || "").split("/", 2);
    if (s2 && e) {
      let start, startIsValid;
      try {
        start = DateTime.fromISO(s2, opts);
        startIsValid = start.isValid;
      } catch (e2) {
        startIsValid = false;
      }
      let end, endIsValid;
      try {
        end = DateTime.fromISO(e, opts);
        endIsValid = end.isValid;
      } catch (e2) {
        endIsValid = false;
      }
      if (startIsValid && endIsValid) {
        return Interval.fromDateTimes(start, end);
      }
      if (startIsValid) {
        const dur = Duration.fromISO(e, opts);
        if (dur.isValid) {
          return Interval.after(start, dur);
        }
      } else if (endIsValid) {
        const dur = Duration.fromISO(s2, opts);
        if (dur.isValid) {
          return Interval.before(end, dur);
        }
      }
    }
    return Interval.invalid("unparsable", `the input "${text}" can't be parsed as ISO 8601`);
  }
  /**
   * Check if an object is an Interval. Works across context boundaries
   * @param {object} o
   * @return {boolean}
   */
  static isInterval(o) {
    return o && o.isLuxonInterval || false;
  }
  /**
   * Returns the start of the Interval
   * @type {DateTime}
   */
  get start() {
    return this.isValid ? this.s : null;
  }
  /**
   * Returns the end of the Interval. This is the first instant which is not part of the interval
   * (Interval is half-open).
   * @type {DateTime}
   */
  get end() {
    return this.isValid ? this.e : null;
  }
  /**
   * Returns the last DateTime included in the interval (since end is not part of the interval)
   * @type {DateTime}
   */
  get lastDateTime() {
    return this.isValid ? this.e ? this.e.minus(1) : null : null;
  }
  /**
   * Returns whether this Interval's end is at least its start, meaning that the Interval isn't 'backwards'.
   * @type {boolean}
   */
  get isValid() {
    return this.invalidReason === null;
  }
  /**
   * Returns an error code if this Interval is invalid, or null if the Interval is valid
   * @type {string}
   */
  get invalidReason() {
    return this.invalid ? this.invalid.reason : null;
  }
  /**
   * Returns an explanation of why this Interval became invalid, or null if the Interval is valid
   * @type {string}
   */
  get invalidExplanation() {
    return this.invalid ? this.invalid.explanation : null;
  }
  /**
   * Returns the length of the Interval in the specified unit.
   * @param {string} unit - the unit (such as 'hours' or 'days') to return the length in.
   * @return {number}
   */
  length(unit = "milliseconds") {
    return this.isValid ? this.toDuration(...[unit]).get(unit) : NaN;
  }
  /**
   * Returns the count of minutes, hours, days, months, or years included in the Interval, even in part.
   * Unlike {@link Interval#length} this counts sections of the calendar, not periods of time, e.g. specifying 'day'
   * asks 'what dates are included in this interval?', not 'how many days long is this interval?'
   * @param {string} [unit='milliseconds'] - the unit of time to count.
   * @param {Object} opts - options
   * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week; this operation will always use the locale of the start DateTime
   * @return {number}
   */
  count(unit = "milliseconds", opts) {
    if (!this.isValid) return NaN;
    const start = this.start.startOf(unit, opts);
    let end;
    if (opts?.useLocaleWeeks) {
      end = this.end.reconfigure({ locale: start.locale });
    } else {
      end = this.end;
    }
    end = end.startOf(unit, opts);
    return Math.floor(end.diff(start, unit).get(unit)) + (end.valueOf() !== this.end.valueOf());
  }
  /**
   * Returns whether this Interval's start and end are both in the same unit of time
   * @param {string} unit - the unit of time to check sameness on
   * @return {boolean}
   */
  hasSame(unit) {
    return this.isValid ? this.isEmpty() || this.e.minus(1).hasSame(this.s, unit) : false;
  }
  /**
   * Return whether this Interval has the same start and end DateTimes.
   * @return {boolean}
   */
  isEmpty() {
    return this.s.valueOf() === this.e.valueOf();
  }
  /**
   * Return whether this Interval's start is after the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  isAfter(dateTime) {
    if (!this.isValid) return false;
    return this.s > dateTime;
  }
  /**
   * Return whether this Interval's end is before the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  isBefore(dateTime) {
    if (!this.isValid) return false;
    return this.e <= dateTime;
  }
  /**
   * Return whether this Interval contains the specified DateTime.
   * @param {DateTime} dateTime
   * @return {boolean}
   */
  contains(dateTime) {
    if (!this.isValid) return false;
    return this.s <= dateTime && this.e > dateTime;
  }
  /**
   * "Sets" the start and/or end dates. Returns a newly-constructed Interval.
   * @param {Object} values - the values to set
   * @param {DateTime} values.start - the starting DateTime
   * @param {DateTime} values.end - the ending DateTime
   * @return {Interval}
   */
  set({ start, end } = {}) {
    if (!this.isValid) return this;
    return Interval.fromDateTimes(start || this.s, end || this.e);
  }
  /**
   * Split this Interval at each of the specified DateTimes
   * @param {...DateTime} dateTimes - the unit of time to count.
   * @return {Array}
   */
  splitAt(...dateTimes) {
    if (!this.isValid) return [];
    const sorted = dateTimes.map(friendlyDateTime).filter((d) => this.contains(d)).sort((a, b) => a.toMillis() - b.toMillis()), results = [];
    let { s: s2 } = this, i = 0;
    while (s2 < this.e) {
      const added = sorted[i] || this.e, next = +added > +this.e ? this.e : added;
      results.push(Interval.fromDateTimes(s2, next));
      s2 = next;
      i += 1;
    }
    return results;
  }
  /**
   * Split this Interval into smaller Intervals, each of the specified length.
   * Left over time is grouped into a smaller interval
   * @param {Duration|Object|number} duration - The length of each resulting interval.
   * @return {Array}
   */
  splitBy(duration) {
    const dur = Duration.fromDurationLike(duration);
    if (!this.isValid || !dur.isValid || dur.as("milliseconds") === 0) {
      return [];
    }
    let { s: s2 } = this, idx = 1, next;
    const results = [];
    while (s2 < this.e) {
      const added = this.start.plus(dur.mapUnits((x) => x * idx));
      next = +added > +this.e ? this.e : added;
      results.push(Interval.fromDateTimes(s2, next));
      s2 = next;
      idx += 1;
    }
    return results;
  }
  /**
   * Split this Interval into the specified number of smaller intervals.
   * @param {number} numberOfParts - The number of Intervals to divide the Interval into.
   * @return {Array}
   */
  divideEqually(numberOfParts) {
    if (!this.isValid) return [];
    return this.splitBy(this.length() / numberOfParts).slice(0, numberOfParts);
  }
  /**
   * Return whether this Interval overlaps with the specified Interval
   * @param {Interval} other
   * @return {boolean}
   */
  overlaps(other) {
    return this.e > other.s && this.s < other.e;
  }
  /**
   * Return whether this Interval's end is adjacent to the specified Interval's start.
   * @param {Interval} other
   * @return {boolean}
   */
  abutsStart(other) {
    if (!this.isValid) return false;
    return +this.e === +other.s;
  }
  /**
   * Return whether this Interval's start is adjacent to the specified Interval's end.
   * @param {Interval} other
   * @return {boolean}
   */
  abutsEnd(other) {
    if (!this.isValid) return false;
    return +other.e === +this.s;
  }
  /**
   * Returns true if this Interval fully contains the specified Interval, specifically if the intersect (of this Interval and the other Interval) is equal to the other Interval; false otherwise.
   * @param {Interval} other
   * @return {boolean}
   */
  engulfs(other) {
    if (!this.isValid) return false;
    return this.s <= other.s && this.e >= other.e;
  }
  /**
   * Return whether this Interval has the same start and end as the specified Interval.
   * @param {Interval} other
   * @return {boolean}
   */
  equals(other) {
    if (!this.isValid || !other.isValid) {
      return false;
    }
    return this.s.equals(other.s) && this.e.equals(other.e);
  }
  /**
   * Return an Interval representing the intersection of this Interval and the specified Interval.
   * Specifically, the resulting Interval has the maximum start time and the minimum end time of the two Intervals.
   * Returns null if the intersection is empty, meaning, the intervals don't intersect.
   * @param {Interval} other
   * @return {Interval}
   */
  intersection(other) {
    if (!this.isValid) return this;
    const s2 = this.s > other.s ? this.s : other.s, e = this.e < other.e ? this.e : other.e;
    if (s2 >= e) {
      return null;
    } else {
      return Interval.fromDateTimes(s2, e);
    }
  }
  /**
   * Return an Interval representing the union of this Interval and the specified Interval.
   * Specifically, the resulting Interval has the minimum start time and the maximum end time of the two Intervals.
   * @param {Interval} other
   * @return {Interval}
   */
  union(other) {
    if (!this.isValid) return this;
    const s2 = this.s < other.s ? this.s : other.s, e = this.e > other.e ? this.e : other.e;
    return Interval.fromDateTimes(s2, e);
  }
  /**
   * Merge an array of Intervals into an equivalent minimal set of Intervals.
   * Combines overlapping and adjacent Intervals.
   * The resulting array will contain the Intervals in ascending order, that is, starting with the earliest Interval
   * and ending with the latest.
   *
   * @param {Array} intervals
   * @return {Array}
   */
  static merge(intervals) {
    const [found, final] = intervals.sort((a, b) => a.s - b.s).reduce(
      ([sofar, current], item) => {
        if (!current) {
          return [sofar, item];
        } else if (current.overlaps(item) || current.abutsStart(item)) {
          return [sofar, current.union(item)];
        } else {
          return [sofar.concat([current]), item];
        }
      },
      [[], null]
    );
    if (final) {
      found.push(final);
    }
    return found;
  }
  /**
   * Return an array of Intervals representing the spans of time that only appear in one of the specified Intervals.
   * @param {Array} intervals
   * @return {Array}
   */
  static xor(intervals) {
    let start = null, currentCount = 0;
    const results = [], ends = intervals.map((i) => [
      { time: i.s, type: "s" },
      { time: i.e, type: "e" }
    ]), flattened = Array.prototype.concat(...ends), arr = flattened.sort((a, b) => a.time - b.time);
    for (const i of arr) {
      currentCount += i.type === "s" ? 1 : -1;
      if (currentCount === 1) {
        start = i.time;
      } else {
        if (start && +start !== +i.time) {
          results.push(Interval.fromDateTimes(start, i.time));
        }
        start = null;
      }
    }
    return Interval.merge(results);
  }
  /**
   * Return an Interval representing the span of time in this Interval that doesn't overlap with any of the specified Intervals.
   * @param {...Interval} intervals
   * @return {Array}
   */
  difference(...intervals) {
    return Interval.xor([this].concat(intervals)).map((i) => this.intersection(i)).filter((i) => i && !i.isEmpty());
  }
  /**
   * Returns a string representation of this Interval appropriate for debugging.
   * @return {string}
   */
  toString() {
    if (!this.isValid) return INVALID$1;
    return `[${this.s.toISO()} – ${this.e.toISO()})`;
  }
  /**
   * Returns a string representation of this Interval appropriate for the REPL.
   * @return {string}
   */
  [Symbol.for("nodejs.util.inspect.custom")]() {
    if (this.isValid) {
      return `Interval { start: ${this.s.toISO()}, end: ${this.e.toISO()} }`;
    } else {
      return `Interval { Invalid, reason: ${this.invalidReason} }`;
    }
  }
  /**
   * Returns a localized string representing this Interval. Accepts the same options as the
   * Intl.DateTimeFormat constructor and any presets defined by Luxon, such as
   * {@link DateTime.DATE_FULL} or {@link DateTime.TIME_SIMPLE}. The exact behavior of this method
   * is browser-specific, but in general it will return an appropriate representation of the
   * Interval in the assigned locale. Defaults to the system's locale if no locale has been
   * specified.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
   * @param {Object} [formatOpts=DateTime.DATE_SHORT] - Either a DateTime preset or
   * Intl.DateTimeFormat constructor options.
   * @param {Object} opts - Options to override the configuration of the start DateTime.
   * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(); //=> 11/7/2022 – 11/8/2022
   * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL); //=> November 7 – 8, 2022
   * @example Interval.fromISO('2022-11-07T09:00Z/2022-11-08T09:00Z').toLocaleString(DateTime.DATE_FULL, { locale: 'fr-FR' }); //=> 7–8 novembre 2022
   * @example Interval.fromISO('2022-11-07T17:00Z/2022-11-07T19:00Z').toLocaleString(DateTime.TIME_SIMPLE); //=> 6:00 – 8:00 PM
   * @example Interval.fromISO('2022-11-07T17:00Z/2022-11-07T19:00Z').toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); //=> Mon, Nov 07, 6:00 – 8:00 p
   * @return {string}
   */
  toLocaleString(formatOpts = DATE_SHORT, opts = {}) {
    return this.isValid ? Formatter.create(this.s.loc.clone(opts), formatOpts).formatInterval(this) : INVALID$1;
  }
  /**
   * Returns an ISO 8601-compliant string representation of this Interval.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @param {Object} opts - The same options as {@link DateTime#toISO}
   * @return {string}
   */
  toISO(opts) {
    if (!this.isValid) return INVALID$1;
    return `${this.s.toISO(opts)}/${this.e.toISO(opts)}`;
  }
  /**
   * Returns an ISO 8601-compliant string representation of date of this Interval.
   * The time components are ignored.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @return {string}
   */
  toISODate() {
    if (!this.isValid) return INVALID$1;
    return `${this.s.toISODate()}/${this.e.toISODate()}`;
  }
  /**
   * Returns an ISO 8601-compliant string representation of time of this Interval.
   * The date components are ignored.
   * @see https://en.wikipedia.org/wiki/ISO_8601#Time_intervals
   * @param {Object} opts - The same options as {@link DateTime#toISO}
   * @return {string}
   */
  toISOTime(opts) {
    if (!this.isValid) return INVALID$1;
    return `${this.s.toISOTime(opts)}/${this.e.toISOTime(opts)}`;
  }
  /**
   * Returns a string representation of this Interval formatted according to the specified format
   * string. **You may not want this.** See {@link Interval#toLocaleString} for a more flexible
   * formatting tool.
   * @param {string} dateFormat - The format string. This string formats the start and end time.
   * See {@link DateTime#toFormat} for details.
   * @param {Object} opts - Options.
   * @param {string} [opts.separator =  ' – '] - A separator to place between the start and end
   * representations.
   * @return {string}
   */
  toFormat(dateFormat, { separator = " – " } = {}) {
    if (!this.isValid) return INVALID$1;
    return `${this.s.toFormat(dateFormat)}${separator}${this.e.toFormat(dateFormat)}`;
  }
  /**
   * Return a Duration representing the time spanned by this interval.
   * @param {string|string[]} [unit=['milliseconds']] - the unit or units (such as 'hours' or 'days') to include in the duration.
   * @param {Object} opts - options that affect the creation of the Duration
   * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
   * @example Interval.fromDateTimes(dt1, dt2).toDuration().toObject() //=> { milliseconds: 88489257 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration('days').toObject() //=> { days: 1.0241812152777778 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes']).toObject() //=> { hours: 24, minutes: 34.82095 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration(['hours', 'minutes', 'seconds']).toObject() //=> { hours: 24, minutes: 34, seconds: 49.257 }
   * @example Interval.fromDateTimes(dt1, dt2).toDuration('seconds').toObject() //=> { seconds: 88489.257 }
   * @return {Duration}
   */
  toDuration(unit, opts) {
    if (!this.isValid) {
      return Duration.invalid(this.invalidReason);
    }
    return this.e.diff(this.s, unit, opts);
  }
  /**
   * Run mapFn on the interval start and end, returning a new Interval from the resulting DateTimes
   * @param {function} mapFn
   * @return {Interval}
   * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.toUTC())
   * @example Interval.fromDateTimes(dt1, dt2).mapEndpoints(endpoint => endpoint.plus({ hours: 2 }))
   */
  mapEndpoints(mapFn) {
    return Interval.fromDateTimes(mapFn(this.s), mapFn(this.e));
  }
}
class Info {
  /**
   * Return whether the specified zone contains a DST.
   * @param {string|Zone} [zone='local'] - Zone to check. Defaults to the environment's local zone.
   * @return {boolean}
   */
  static hasDST(zone = Settings.defaultZone) {
    const proto = DateTime.now().setZone(zone).set({ month: 12 });
    return !zone.isUniversal && proto.offset !== proto.set({ month: 6 }).offset;
  }
  /**
   * Return whether the specified zone is a valid IANA specifier.
   * @param {string} zone - Zone to check
   * @return {boolean}
   */
  static isValidIANAZone(zone) {
    return IANAZone.isValidZone(zone);
  }
  /**
   * Converts the input into a {@link Zone} instance.
   *
   * * If `input` is already a Zone instance, it is returned unchanged.
   * * If `input` is a string containing a valid time zone name, a Zone instance
   *   with that name is returned.
   * * If `input` is a string that doesn't refer to a known time zone, a Zone
   *   instance with {@link Zone#isValid} == false is returned.
   * * If `input is a number, a Zone instance with the specified fixed offset
   *   in minutes is returned.
   * * If `input` is `null` or `undefined`, the default zone is returned.
   * @param {string|Zone|number} [input] - the value to be converted
   * @return {Zone}
   */
  static normalizeZone(input) {
    return normalizeZone(input, Settings.defaultZone);
  }
  /**
   * Get the weekday on which the week starts according to the given locale.
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @returns {number} the start of the week, 1 for Monday through 7 for Sunday
   */
  static getStartOfWeek({ locale = null, locObj = null } = {}) {
    return (locObj || Locale.create(locale)).getStartOfWeek();
  }
  /**
   * Get the minimum number of days necessary in a week before it is considered part of the next year according
   * to the given locale.
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @returns {number}
   */
  static getMinimumDaysInFirstWeek({ locale = null, locObj = null } = {}) {
    return (locObj || Locale.create(locale)).getMinDaysInFirstWeek();
  }
  /**
   * Get the weekdays, which are considered the weekend according to the given locale
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @returns {number[]} an array of weekdays, 1 for Monday through 7 for Sunday
   */
  static getWeekendWeekdays({ locale = null, locObj = null } = {}) {
    return (locObj || Locale.create(locale)).getWeekendDays().slice();
  }
  /**
   * Return an array of standalone month names.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
   * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.numberingSystem=null] - the numbering system
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @param {string} [opts.outputCalendar='gregory'] - the calendar
   * @example Info.months()[0] //=> 'January'
   * @example Info.months('short')[0] //=> 'Jan'
   * @example Info.months('numeric')[0] //=> '1'
   * @example Info.months('short', { locale: 'fr-CA' } )[0] //=> 'janv.'
   * @example Info.months('numeric', { locale: 'ar' })[0] //=> '١'
   * @example Info.months('long', { outputCalendar: 'islamic' })[0] //=> 'Rabiʻ I'
   * @return {Array}
   */
  static months(length = "long", { locale = null, numberingSystem = null, locObj = null, outputCalendar = "gregory" } = {}) {
    return (locObj || Locale.create(locale, numberingSystem, outputCalendar)).months(length);
  }
  /**
   * Return an array of format month names.
   * Format months differ from standalone months in that they're meant to appear next to the day of the month. In some languages, that
   * changes the string.
   * See {@link Info#months}
   * @param {string} [length='long'] - the length of the month representation, such as "numeric", "2-digit", "narrow", "short", "long"
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.numberingSystem=null] - the numbering system
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @param {string} [opts.outputCalendar='gregory'] - the calendar
   * @return {Array}
   */
  static monthsFormat(length = "long", { locale = null, numberingSystem = null, locObj = null, outputCalendar = "gregory" } = {}) {
    return (locObj || Locale.create(locale, numberingSystem, outputCalendar)).months(length, true);
  }
  /**
   * Return an array of standalone week names.
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
   * @param {string} [length='long'] - the length of the weekday representation, such as "narrow", "short", "long".
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @param {string} [opts.numberingSystem=null] - the numbering system
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @example Info.weekdays()[0] //=> 'Monday'
   * @example Info.weekdays('short')[0] //=> 'Mon'
   * @example Info.weekdays('short', { locale: 'fr-CA' })[0] //=> 'lun.'
   * @example Info.weekdays('short', { locale: 'ar' })[0] //=> 'الاثنين'
   * @return {Array}
   */
  static weekdays(length = "long", { locale = null, numberingSystem = null, locObj = null } = {}) {
    return (locObj || Locale.create(locale, numberingSystem, null)).weekdays(length);
  }
  /**
   * Return an array of format week names.
   * Format weekdays differ from standalone weekdays in that they're meant to appear next to more date information. In some languages, that
   * changes the string.
   * See {@link Info#weekdays}
   * @param {string} [length='long'] - the length of the month representation, such as "narrow", "short", "long".
   * @param {Object} opts - options
   * @param {string} [opts.locale=null] - the locale code
   * @param {string} [opts.numberingSystem=null] - the numbering system
   * @param {string} [opts.locObj=null] - an existing locale object to use
   * @return {Array}
   */
  static weekdaysFormat(length = "long", { locale = null, numberingSystem = null, locObj = null } = {}) {
    return (locObj || Locale.create(locale, numberingSystem, null)).weekdays(length, true);
  }
  /**
   * Return an array of meridiems.
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @example Info.meridiems() //=> [ 'AM', 'PM' ]
   * @example Info.meridiems({ locale: 'my' }) //=> [ 'နံနက်', 'ညနေ' ]
   * @return {Array}
   */
  static meridiems({ locale = null } = {}) {
    return Locale.create(locale).meridiems();
  }
  /**
   * Return an array of eras, such as ['BC', 'AD']. The locale can be specified, but the calendar system is always Gregorian.
   * @param {string} [length='short'] - the length of the era representation, such as "short" or "long".
   * @param {Object} opts - options
   * @param {string} [opts.locale] - the locale code
   * @example Info.eras() //=> [ 'BC', 'AD' ]
   * @example Info.eras('long') //=> [ 'Before Christ', 'Anno Domini' ]
   * @example Info.eras('long', { locale: 'fr' }) //=> [ 'avant Jésus-Christ', 'après Jésus-Christ' ]
   * @return {Array}
   */
  static eras(length = "short", { locale = null } = {}) {
    return Locale.create(locale, null, "gregory").eras(length);
  }
  /**
   * Return the set of available features in this environment.
   * Some features of Luxon are not available in all environments. For example, on older browsers, relative time formatting support is not available. Use this function to figure out if that's the case.
   * Keys:
   * * `relative`: whether this environment supports relative time formatting
   * * `localeWeek`: whether this environment supports different weekdays for the start of the week based on the locale
   * @example Info.features() //=> { relative: false, localeWeek: true }
   * @return {Object}
   */
  static features() {
    return { relative: hasRelative(), localeWeek: hasLocaleWeekInfo() };
  }
}
function dayDiff(earlier, later) {
  const utcDayStart = (dt) => dt.toUTC(0, { keepLocalTime: true }).startOf("day").valueOf(), ms = utcDayStart(later) - utcDayStart(earlier);
  return Math.floor(Duration.fromMillis(ms).as("days"));
}
function highOrderDiffs(cursor, later, units) {
  const differs = [
    ["years", (a, b) => b.year - a.year],
    ["quarters", (a, b) => b.quarter - a.quarter + (b.year - a.year) * 4],
    ["months", (a, b) => b.month - a.month + (b.year - a.year) * 12],
    [
      "weeks",
      (a, b) => {
        const days = dayDiff(a, b);
        return (days - days % 7) / 7;
      }
    ],
    ["days", dayDiff]
  ];
  const results = {};
  const earlier = cursor;
  let lowestOrder, highWater;
  for (const [unit, differ] of differs) {
    if (units.indexOf(unit) >= 0) {
      lowestOrder = unit;
      results[unit] = differ(cursor, later);
      highWater = earlier.plus(results);
      if (highWater > later) {
        results[unit]--;
        cursor = earlier.plus(results);
        if (cursor > later) {
          highWater = cursor;
          results[unit]--;
          cursor = earlier.plus(results);
        }
      } else {
        cursor = highWater;
      }
    }
  }
  return [cursor, results, highWater, lowestOrder];
}
function diff(earlier, later, units, opts) {
  let [cursor, results, highWater, lowestOrder] = highOrderDiffs(earlier, later, units);
  const remainingMillis = later - cursor;
  const lowerOrderUnits = units.filter(
    (u) => ["hours", "minutes", "seconds", "milliseconds"].indexOf(u) >= 0
  );
  if (lowerOrderUnits.length === 0) {
    if (highWater < later) {
      highWater = cursor.plus({ [lowestOrder]: 1 });
    }
    if (highWater !== cursor) {
      results[lowestOrder] = (results[lowestOrder] || 0) + remainingMillis / (highWater - cursor);
    }
  }
  const duration = Duration.fromObject(results, opts);
  if (lowerOrderUnits.length > 0) {
    return Duration.fromMillis(remainingMillis, opts).shiftTo(...lowerOrderUnits).plus(duration);
  } else {
    return duration;
  }
}
const MISSING_FTP = "missing Intl.DateTimeFormat.formatToParts support";
function intUnit(regex, post = (i) => i) {
  return { regex, deser: ([s2]) => post(parseDigits(s2)) };
}
const NBSP = String.fromCharCode(160);
const spaceOrNBSP = `[ ${NBSP}]`;
const spaceOrNBSPRegExp = new RegExp(spaceOrNBSP, "g");
function fixListRegex(s2) {
  return s2.replace(/\./g, "\\.?").replace(spaceOrNBSPRegExp, spaceOrNBSP);
}
function stripInsensitivities(s2) {
  return s2.replace(/\./g, "").replace(spaceOrNBSPRegExp, " ").toLowerCase();
}
function oneOf(strings, startIndex) {
  if (strings === null) {
    return null;
  } else {
    return {
      regex: RegExp(strings.map(fixListRegex).join("|")),
      deser: ([s2]) => strings.findIndex((i) => stripInsensitivities(s2) === stripInsensitivities(i)) + startIndex
    };
  }
}
function offset(regex, groups) {
  return { regex, deser: ([, h, m]) => signedOffset(h, m), groups };
}
function simple(regex) {
  return { regex, deser: ([s2]) => s2 };
}
function escapeToken(value) {
  return value.replace(/[\-\[\]{}()*+?.,\\\^$|#\s]/g, "\\$&");
}
function unitForToken(token, loc) {
  const one = digitRegex(loc), two = digitRegex(loc, "{2}"), three = digitRegex(loc, "{3}"), four = digitRegex(loc, "{4}"), six = digitRegex(loc, "{6}"), oneOrTwo = digitRegex(loc, "{1,2}"), oneToThree = digitRegex(loc, "{1,3}"), oneToSix = digitRegex(loc, "{1,6}"), oneToNine = digitRegex(loc, "{1,9}"), twoToFour = digitRegex(loc, "{2,4}"), fourToSix = digitRegex(loc, "{4,6}"), literal = (t) => ({ regex: RegExp(escapeToken(t.val)), deser: ([s2]) => s2, literal: true }), unitate = (t) => {
    if (token.literal) {
      return literal(t);
    }
    switch (t.val) {
      // era
      case "G":
        return oneOf(loc.eras("short"), 0);
      case "GG":
        return oneOf(loc.eras("long"), 0);
      // years
      case "y":
        return intUnit(oneToSix);
      case "yy":
        return intUnit(twoToFour, untruncateYear);
      case "yyyy":
        return intUnit(four);
      case "yyyyy":
        return intUnit(fourToSix);
      case "yyyyyy":
        return intUnit(six);
      // months
      case "M":
        return intUnit(oneOrTwo);
      case "MM":
        return intUnit(two);
      case "MMM":
        return oneOf(loc.months("short", true), 1);
      case "MMMM":
        return oneOf(loc.months("long", true), 1);
      case "L":
        return intUnit(oneOrTwo);
      case "LL":
        return intUnit(two);
      case "LLL":
        return oneOf(loc.months("short", false), 1);
      case "LLLL":
        return oneOf(loc.months("long", false), 1);
      // dates
      case "d":
        return intUnit(oneOrTwo);
      case "dd":
        return intUnit(two);
      // ordinals
      case "o":
        return intUnit(oneToThree);
      case "ooo":
        return intUnit(three);
      // time
      case "HH":
        return intUnit(two);
      case "H":
        return intUnit(oneOrTwo);
      case "hh":
        return intUnit(two);
      case "h":
        return intUnit(oneOrTwo);
      case "mm":
        return intUnit(two);
      case "m":
        return intUnit(oneOrTwo);
      case "q":
        return intUnit(oneOrTwo);
      case "qq":
        return intUnit(two);
      case "s":
        return intUnit(oneOrTwo);
      case "ss":
        return intUnit(two);
      case "S":
        return intUnit(oneToThree);
      case "SSS":
        return intUnit(three);
      case "u":
        return simple(oneToNine);
      case "uu":
        return simple(oneOrTwo);
      case "uuu":
        return intUnit(one);
      // meridiem
      case "a":
        return oneOf(loc.meridiems(), 0);
      // weekYear (k)
      case "kkkk":
        return intUnit(four);
      case "kk":
        return intUnit(twoToFour, untruncateYear);
      // weekNumber (W)
      case "W":
        return intUnit(oneOrTwo);
      case "WW":
        return intUnit(two);
      // weekdays
      case "E":
      case "c":
        return intUnit(one);
      case "EEE":
        return oneOf(loc.weekdays("short", false), 1);
      case "EEEE":
        return oneOf(loc.weekdays("long", false), 1);
      case "ccc":
        return oneOf(loc.weekdays("short", true), 1);
      case "cccc":
        return oneOf(loc.weekdays("long", true), 1);
      // offset/zone
      case "Z":
      case "ZZ":
        return offset(new RegExp(`([+-]${oneOrTwo.source})(?::(${two.source}))?`), 2);
      case "ZZZ":
        return offset(new RegExp(`([+-]${oneOrTwo.source})(${two.source})?`), 2);
      // we don't support ZZZZ (PST) or ZZZZZ (Pacific Standard Time) in parsing
      // because we don't have any way to figure out what they are
      case "z":
        return simple(/[a-z_+-/]{1,256}?/i);
      // this special-case "token" represents a place where a macro-token expanded into a white-space literal
      // in this case we accept any non-newline white-space
      case " ":
        return simple(/[^\S\n\r]/);
      default:
        return literal(t);
    }
  };
  const unit = unitate(token) || {
    invalidReason: MISSING_FTP
  };
  unit.token = token;
  return unit;
}
const partTypeStyleToTokenVal = {
  year: {
    "2-digit": "yy",
    numeric: "yyyyy"
  },
  month: {
    numeric: "M",
    "2-digit": "MM",
    short: "MMM",
    long: "MMMM"
  },
  day: {
    numeric: "d",
    "2-digit": "dd"
  },
  weekday: {
    short: "EEE",
    long: "EEEE"
  },
  dayperiod: "a",
  dayPeriod: "a",
  hour12: {
    numeric: "h",
    "2-digit": "hh"
  },
  hour24: {
    numeric: "H",
    "2-digit": "HH"
  },
  minute: {
    numeric: "m",
    "2-digit": "mm"
  },
  second: {
    numeric: "s",
    "2-digit": "ss"
  },
  timeZoneName: {
    long: "ZZZZZ",
    short: "ZZZ"
  }
};
function tokenForPart(part, formatOpts, resolvedOpts) {
  const { type, value } = part;
  if (type === "literal") {
    const isSpace = /^\s+$/.test(value);
    return {
      literal: !isSpace,
      val: isSpace ? " " : value
    };
  }
  const style = formatOpts[type];
  let actualType = type;
  if (type === "hour") {
    if (formatOpts.hour12 != null) {
      actualType = formatOpts.hour12 ? "hour12" : "hour24";
    } else if (formatOpts.hourCycle != null) {
      if (formatOpts.hourCycle === "h11" || formatOpts.hourCycle === "h12") {
        actualType = "hour12";
      } else {
        actualType = "hour24";
      }
    } else {
      actualType = resolvedOpts.hour12 ? "hour12" : "hour24";
    }
  }
  let val = partTypeStyleToTokenVal[actualType];
  if (typeof val === "object") {
    val = val[style];
  }
  if (val) {
    return {
      literal: false,
      val
    };
  }
  return void 0;
}
function buildRegex(units) {
  const re = units.map((u) => u.regex).reduce((f, r) => `${f}(${r.source})`, "");
  return [`^${re}$`, units];
}
function match(input, regex, handlers) {
  const matches = input.match(regex);
  if (matches) {
    const all = {};
    let matchIndex = 1;
    for (const i in handlers) {
      if (hasOwnProperty(handlers, i)) {
        const h = handlers[i], groups = h.groups ? h.groups + 1 : 1;
        if (!h.literal && h.token) {
          all[h.token.val[0]] = h.deser(matches.slice(matchIndex, matchIndex + groups));
        }
        matchIndex += groups;
      }
    }
    return [matches, all];
  } else {
    return [matches, {}];
  }
}
function dateTimeFromMatches(matches) {
  const toField = (token) => {
    switch (token) {
      case "S":
        return "millisecond";
      case "s":
        return "second";
      case "m":
        return "minute";
      case "h":
      case "H":
        return "hour";
      case "d":
        return "day";
      case "o":
        return "ordinal";
      case "L":
      case "M":
        return "month";
      case "y":
        return "year";
      case "E":
      case "c":
        return "weekday";
      case "W":
        return "weekNumber";
      case "k":
        return "weekYear";
      case "q":
        return "quarter";
      default:
        return null;
    }
  };
  let zone = null;
  let specificOffset;
  if (!isUndefined(matches.z)) {
    zone = IANAZone.create(matches.z);
  }
  if (!isUndefined(matches.Z)) {
    if (!zone) {
      zone = new FixedOffsetZone(matches.Z);
    }
    specificOffset = matches.Z;
  }
  if (!isUndefined(matches.q)) {
    matches.M = (matches.q - 1) * 3 + 1;
  }
  if (!isUndefined(matches.h)) {
    if (matches.h < 12 && matches.a === 1) {
      matches.h += 12;
    } else if (matches.h === 12 && matches.a === 0) {
      matches.h = 0;
    }
  }
  if (matches.G === 0 && matches.y) {
    matches.y = -matches.y;
  }
  if (!isUndefined(matches.u)) {
    matches.S = parseMillis(matches.u);
  }
  const vals = Object.keys(matches).reduce((r, k) => {
    const f = toField(k);
    if (f) {
      r[f] = matches[k];
    }
    return r;
  }, {});
  return [vals, zone, specificOffset];
}
let dummyDateTimeCache = null;
function getDummyDateTime() {
  if (!dummyDateTimeCache) {
    dummyDateTimeCache = DateTime.fromMillis(1555555555555);
  }
  return dummyDateTimeCache;
}
function maybeExpandMacroToken(token, locale) {
  if (token.literal) {
    return token;
  }
  const formatOpts = Formatter.macroTokenToFormatOpts(token.val);
  const tokens = formatOptsToTokens(formatOpts, locale);
  if (tokens == null || tokens.includes(void 0)) {
    return token;
  }
  return tokens;
}
function expandMacroTokens(tokens, locale) {
  return Array.prototype.concat(...tokens.map((t) => maybeExpandMacroToken(t, locale)));
}
class TokenParser {
  constructor(locale, format) {
    this.locale = locale;
    this.format = format;
    this.tokens = expandMacroTokens(Formatter.parseFormat(format), locale);
    this.units = this.tokens.map((t) => unitForToken(t, locale));
    this.disqualifyingUnit = this.units.find((t) => t.invalidReason);
    if (!this.disqualifyingUnit) {
      const [regexString, handlers] = buildRegex(this.units);
      this.regex = RegExp(regexString, "i");
      this.handlers = handlers;
    }
  }
  explainFromTokens(input) {
    if (!this.isValid) {
      return { input, tokens: this.tokens, invalidReason: this.invalidReason };
    } else {
      const [rawMatches, matches] = match(input, this.regex, this.handlers), [result, zone, specificOffset] = matches ? dateTimeFromMatches(matches) : [null, null, void 0];
      if (hasOwnProperty(matches, "a") && hasOwnProperty(matches, "H")) {
        throw new ConflictingSpecificationError(
          "Can't include meridiem when specifying 24-hour format"
        );
      }
      return {
        input,
        tokens: this.tokens,
        regex: this.regex,
        rawMatches,
        matches,
        result,
        zone,
        specificOffset
      };
    }
  }
  get isValid() {
    return !this.disqualifyingUnit;
  }
  get invalidReason() {
    return this.disqualifyingUnit ? this.disqualifyingUnit.invalidReason : null;
  }
}
function explainFromTokens(locale, input, format) {
  const parser = new TokenParser(locale, format);
  return parser.explainFromTokens(input);
}
function parseFromTokens(locale, input, format) {
  const { result, zone, specificOffset, invalidReason } = explainFromTokens(locale, input, format);
  return [result, zone, specificOffset, invalidReason];
}
function formatOptsToTokens(formatOpts, locale) {
  if (!formatOpts) {
    return null;
  }
  const formatter = Formatter.create(locale, formatOpts);
  const df = formatter.dtFormatter(getDummyDateTime());
  const parts = df.formatToParts();
  const resolvedOpts = df.resolvedOptions();
  return parts.map((p) => tokenForPart(p, formatOpts, resolvedOpts));
}
const INVALID = "Invalid DateTime";
const MAX_DATE = 864e13;
function unsupportedZone(zone) {
  return new Invalid("unsupported zone", `the zone "${zone.name}" is not supported`);
}
function possiblyCachedWeekData(dt) {
  if (dt.weekData === null) {
    dt.weekData = gregorianToWeek(dt.c);
  }
  return dt.weekData;
}
function possiblyCachedLocalWeekData(dt) {
  if (dt.localWeekData === null) {
    dt.localWeekData = gregorianToWeek(
      dt.c,
      dt.loc.getMinDaysInFirstWeek(),
      dt.loc.getStartOfWeek()
    );
  }
  return dt.localWeekData;
}
function clone(inst, alts) {
  const current = {
    ts: inst.ts,
    zone: inst.zone,
    c: inst.c,
    o: inst.o,
    loc: inst.loc,
    invalid: inst.invalid
  };
  return new DateTime({ ...current, ...alts, old: current });
}
function fixOffset(localTS, o, tz) {
  let utcGuess = localTS - o * 60 * 1e3;
  const o2 = tz.offset(utcGuess);
  if (o === o2) {
    return [utcGuess, o];
  }
  utcGuess -= (o2 - o) * 60 * 1e3;
  const o3 = tz.offset(utcGuess);
  if (o2 === o3) {
    return [utcGuess, o2];
  }
  return [localTS - Math.min(o2, o3) * 60 * 1e3, Math.max(o2, o3)];
}
function tsToObj(ts, offset2) {
  ts += offset2 * 60 * 1e3;
  const d = new Date(ts);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours(),
    minute: d.getUTCMinutes(),
    second: d.getUTCSeconds(),
    millisecond: d.getUTCMilliseconds()
  };
}
function objToTS(obj, offset2, zone) {
  return fixOffset(objToLocalTS(obj), offset2, zone);
}
function adjustTime(inst, dur) {
  const oPre = inst.o, year = inst.c.year + Math.trunc(dur.years), month = inst.c.month + Math.trunc(dur.months) + Math.trunc(dur.quarters) * 3, c = {
    ...inst.c,
    year,
    month,
    day: Math.min(inst.c.day, daysInMonth(year, month)) + Math.trunc(dur.days) + Math.trunc(dur.weeks) * 7
  }, millisToAdd = Duration.fromObject({
    years: dur.years - Math.trunc(dur.years),
    quarters: dur.quarters - Math.trunc(dur.quarters),
    months: dur.months - Math.trunc(dur.months),
    weeks: dur.weeks - Math.trunc(dur.weeks),
    days: dur.days - Math.trunc(dur.days),
    hours: dur.hours,
    minutes: dur.minutes,
    seconds: dur.seconds,
    milliseconds: dur.milliseconds
  }).as("milliseconds"), localTS = objToLocalTS(c);
  let [ts, o] = fixOffset(localTS, oPre, inst.zone);
  if (millisToAdd !== 0) {
    ts += millisToAdd;
    o = inst.zone.offset(ts);
  }
  return { ts, o };
}
function parseDataToDateTime(parsed, parsedZone, opts, format, text, specificOffset) {
  const { setZone, zone } = opts;
  if (parsed && Object.keys(parsed).length !== 0 || parsedZone) {
    const interpretationZone = parsedZone || zone, inst = DateTime.fromObject(parsed, {
      ...opts,
      zone: interpretationZone,
      specificOffset
    });
    return setZone ? inst : inst.setZone(zone);
  } else {
    return DateTime.invalid(
      new Invalid("unparsable", `the input "${text}" can't be parsed as ${format}`)
    );
  }
}
function toTechFormat(dt, format, allowZ = true) {
  return dt.isValid ? Formatter.create(Locale.create("en-US"), {
    allowZ,
    forceSimple: true
  }).formatDateTimeFromString(dt, format) : null;
}
function toISODate(o, extended, precision) {
  const longFormat = o.c.year > 9999 || o.c.year < 0;
  let c = "";
  if (longFormat && o.c.year >= 0) c += "+";
  c += padStart(o.c.year, longFormat ? 6 : 4);
  if (precision === "year") return c;
  if (extended) {
    c += "-";
    c += padStart(o.c.month);
    if (precision === "month") return c;
    c += "-";
  } else {
    c += padStart(o.c.month);
    if (precision === "month") return c;
  }
  c += padStart(o.c.day);
  return c;
}
function toISOTime(o, extended, suppressSeconds, suppressMilliseconds, includeOffset, extendedZone, precision) {
  let showSeconds = !suppressSeconds || o.c.millisecond !== 0 || o.c.second !== 0, c = "";
  switch (precision) {
    case "day":
    case "month":
    case "year":
      break;
    default:
      c += padStart(o.c.hour);
      if (precision === "hour") break;
      if (extended) {
        c += ":";
        c += padStart(o.c.minute);
        if (precision === "minute") break;
        if (showSeconds) {
          c += ":";
          c += padStart(o.c.second);
        }
      } else {
        c += padStart(o.c.minute);
        if (precision === "minute") break;
        if (showSeconds) {
          c += padStart(o.c.second);
        }
      }
      if (precision === "second") break;
      if (showSeconds && (!suppressMilliseconds || o.c.millisecond !== 0)) {
        c += ".";
        c += padStart(o.c.millisecond, 3);
      }
  }
  if (includeOffset) {
    if (o.isOffsetFixed && o.offset === 0 && !extendedZone) {
      c += "Z";
    } else if (o.o < 0) {
      c += "-";
      c += padStart(Math.trunc(-o.o / 60));
      c += ":";
      c += padStart(Math.trunc(-o.o % 60));
    } else {
      c += "+";
      c += padStart(Math.trunc(o.o / 60));
      c += ":";
      c += padStart(Math.trunc(o.o % 60));
    }
  }
  if (extendedZone) {
    c += "[" + o.zone.ianaName + "]";
  }
  return c;
}
const defaultUnitValues = {
  month: 1,
  day: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0
}, defaultWeekUnitValues = {
  weekNumber: 1,
  weekday: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0
}, defaultOrdinalUnitValues = {
  ordinal: 1,
  hour: 0,
  minute: 0,
  second: 0,
  millisecond: 0
};
const orderedUnits = ["year", "month", "day", "hour", "minute", "second", "millisecond"], orderedWeekUnits = [
  "weekYear",
  "weekNumber",
  "weekday",
  "hour",
  "minute",
  "second",
  "millisecond"
], orderedOrdinalUnits = ["year", "ordinal", "hour", "minute", "second", "millisecond"];
function normalizeUnit(unit) {
  const normalized = {
    year: "year",
    years: "year",
    month: "month",
    months: "month",
    day: "day",
    days: "day",
    hour: "hour",
    hours: "hour",
    minute: "minute",
    minutes: "minute",
    quarter: "quarter",
    quarters: "quarter",
    second: "second",
    seconds: "second",
    millisecond: "millisecond",
    milliseconds: "millisecond",
    weekday: "weekday",
    weekdays: "weekday",
    weeknumber: "weekNumber",
    weeksnumber: "weekNumber",
    weeknumbers: "weekNumber",
    weekyear: "weekYear",
    weekyears: "weekYear",
    ordinal: "ordinal"
  }[unit.toLowerCase()];
  if (!normalized) throw new InvalidUnitError(unit);
  return normalized;
}
function normalizeUnitWithLocalWeeks(unit) {
  switch (unit.toLowerCase()) {
    case "localweekday":
    case "localweekdays":
      return "localWeekday";
    case "localweeknumber":
    case "localweeknumbers":
      return "localWeekNumber";
    case "localweekyear":
    case "localweekyears":
      return "localWeekYear";
    default:
      return normalizeUnit(unit);
  }
}
function guessOffsetForZone(zone) {
  if (zoneOffsetTs === void 0) {
    zoneOffsetTs = Settings.now();
  }
  if (zone.type !== "iana") {
    return zone.offset(zoneOffsetTs);
  }
  const zoneName = zone.name;
  let offsetGuess = zoneOffsetGuessCache.get(zoneName);
  if (offsetGuess === void 0) {
    offsetGuess = zone.offset(zoneOffsetTs);
    zoneOffsetGuessCache.set(zoneName, offsetGuess);
  }
  return offsetGuess;
}
function quickDT(obj, opts) {
  const zone = normalizeZone(opts.zone, Settings.defaultZone);
  if (!zone.isValid) {
    return DateTime.invalid(unsupportedZone(zone));
  }
  const loc = Locale.fromObject(opts);
  let ts, o;
  if (!isUndefined(obj.year)) {
    for (const u of orderedUnits) {
      if (isUndefined(obj[u])) {
        obj[u] = defaultUnitValues[u];
      }
    }
    const invalid = hasInvalidGregorianData(obj) || hasInvalidTimeData(obj);
    if (invalid) {
      return DateTime.invalid(invalid);
    }
    const offsetProvis = guessOffsetForZone(zone);
    [ts, o] = objToTS(obj, offsetProvis, zone);
  } else {
    ts = Settings.now();
  }
  return new DateTime({ ts, zone, loc, o });
}
function diffRelative(start, end, opts) {
  const round = isUndefined(opts.round) ? true : opts.round, rounding = isUndefined(opts.rounding) ? "trunc" : opts.rounding, format = (c, unit) => {
    c = roundTo(c, round || opts.calendary ? 0 : 2, opts.calendary ? "round" : rounding);
    const formatter = end.loc.clone(opts).relFormatter(opts);
    return formatter.format(c, unit);
  }, differ = (unit) => {
    if (opts.calendary) {
      if (!end.hasSame(start, unit)) {
        return end.startOf(unit).diff(start.startOf(unit), unit).get(unit);
      } else return 0;
    } else {
      return end.diff(start, unit).get(unit);
    }
  };
  if (opts.unit) {
    return format(differ(opts.unit), opts.unit);
  }
  for (const unit of opts.units) {
    const count = differ(unit);
    if (Math.abs(count) >= 1) {
      return format(count, unit);
    }
  }
  return format(start > end ? -0 : 0, opts.units[opts.units.length - 1]);
}
function lastOpts(argList) {
  let opts = {}, args;
  if (argList.length > 0 && typeof argList[argList.length - 1] === "object") {
    opts = argList[argList.length - 1];
    args = Array.from(argList).slice(0, argList.length - 1);
  } else {
    args = Array.from(argList);
  }
  return [opts, args];
}
let zoneOffsetTs;
const zoneOffsetGuessCache = /* @__PURE__ */ new Map();
class DateTime {
  /**
   * @access private
   */
  constructor(config) {
    const zone = config.zone || Settings.defaultZone;
    let invalid = config.invalid || (Number.isNaN(config.ts) ? new Invalid("invalid input") : null) || (!zone.isValid ? unsupportedZone(zone) : null);
    this.ts = isUndefined(config.ts) ? Settings.now() : config.ts;
    let c = null, o = null;
    if (!invalid) {
      const unchanged = config.old && config.old.ts === this.ts && config.old.zone.equals(zone);
      if (unchanged) {
        [c, o] = [config.old.c, config.old.o];
      } else {
        const ot = isNumber(config.o) && !config.old ? config.o : zone.offset(this.ts);
        c = tsToObj(this.ts, ot);
        invalid = Number.isNaN(c.year) ? new Invalid("invalid input") : null;
        c = invalid ? null : c;
        o = invalid ? null : ot;
      }
    }
    this._zone = zone;
    this.loc = config.loc || Locale.create();
    this.invalid = invalid;
    this.weekData = null;
    this.localWeekData = null;
    this.c = c;
    this.o = o;
    this.isLuxonDateTime = true;
  }
  // CONSTRUCT
  /**
   * Create a DateTime for the current instant, in the system's time zone.
   *
   * Use Settings to override these default values if needed.
   * @example DateTime.now().toISO() //~> now in the ISO format
   * @return {DateTime}
   */
  static now() {
    return new DateTime({});
  }
  /**
   * Create a local DateTime
   * @param {number} [year] - The calendar year. If omitted (as in, call `local()` with no arguments), the current time will be used
   * @param {number} [month=1] - The month, 1-indexed
   * @param {number} [day=1] - The day of the month, 1-indexed
   * @param {number} [hour=0] - The hour of the day, in 24-hour time
   * @param {number} [minute=0] - The minute of the hour, meaning a number between 0 and 59
   * @param {number} [second=0] - The second of the minute, meaning a number between 0 and 59
   * @param {number} [millisecond=0] - The millisecond of the second, meaning a number between 0 and 999
   * @example DateTime.local()                                  //~> now
   * @example DateTime.local({ zone: "America/New_York" })      //~> now, in US east coast time
   * @example DateTime.local(2017)                              //~> 2017-01-01T00:00:00
   * @example DateTime.local(2017, 3)                           //~> 2017-03-01T00:00:00
   * @example DateTime.local(2017, 3, 12, { locale: "fr" })     //~> 2017-03-12T00:00:00, with a French locale
   * @example DateTime.local(2017, 3, 12, 5)                    //~> 2017-03-12T05:00:00
   * @example DateTime.local(2017, 3, 12, 5, { zone: "utc" })   //~> 2017-03-12T05:00:00, in UTC
   * @example DateTime.local(2017, 3, 12, 5, 45)                //~> 2017-03-12T05:45:00
   * @example DateTime.local(2017, 3, 12, 5, 45, 10)            //~> 2017-03-12T05:45:10
   * @example DateTime.local(2017, 3, 12, 5, 45, 10, 765)       //~> 2017-03-12T05:45:10.765
   * @return {DateTime}
   */
  static local() {
    const [opts, args] = lastOpts(arguments), [year, month, day, hour, minute, second, millisecond] = args;
    return quickDT({ year, month, day, hour, minute, second, millisecond }, opts);
  }
  /**
   * Create a DateTime in UTC
   * @param {number} [year] - The calendar year. If omitted (as in, call `utc()` with no arguments), the current time will be used
   * @param {number} [month=1] - The month, 1-indexed
   * @param {number} [day=1] - The day of the month
   * @param {number} [hour=0] - The hour of the day, in 24-hour time
   * @param {number} [minute=0] - The minute of the hour, meaning a number between 0 and 59
   * @param {number} [second=0] - The second of the minute, meaning a number between 0 and 59
   * @param {number} [millisecond=0] - The millisecond of the second, meaning a number between 0 and 999
   * @param {Object} options - configuration options for the DateTime
   * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
   * @param {string} [options.outputCalendar] - the output calendar to set on the resulting DateTime instance
   * @param {string} [options.numberingSystem] - the numbering system to set on the resulting DateTime instance
   * @param {string} [options.weekSettings] - the week settings to set on the resulting DateTime instance
   * @example DateTime.utc()                                              //~> now
   * @example DateTime.utc(2017)                                          //~> 2017-01-01T00:00:00Z
   * @example DateTime.utc(2017, 3)                                       //~> 2017-03-01T00:00:00Z
   * @example DateTime.utc(2017, 3, 12)                                   //~> 2017-03-12T00:00:00Z
   * @example DateTime.utc(2017, 3, 12, 5)                                //~> 2017-03-12T05:00:00Z
   * @example DateTime.utc(2017, 3, 12, 5, 45)                            //~> 2017-03-12T05:45:00Z
   * @example DateTime.utc(2017, 3, 12, 5, 45, { locale: "fr" })          //~> 2017-03-12T05:45:00Z with a French locale
   * @example DateTime.utc(2017, 3, 12, 5, 45, 10)                        //~> 2017-03-12T05:45:10Z
   * @example DateTime.utc(2017, 3, 12, 5, 45, 10, 765, { locale: "fr" }) //~> 2017-03-12T05:45:10.765Z with a French locale
   * @return {DateTime}
   */
  static utc() {
    const [opts, args] = lastOpts(arguments), [year, month, day, hour, minute, second, millisecond] = args;
    opts.zone = FixedOffsetZone.utcInstance;
    return quickDT({ year, month, day, hour, minute, second, millisecond }, opts);
  }
  /**
   * Create a DateTime from a JavaScript Date object. Uses the default zone.
   * @param {Date} date - a JavaScript Date object
   * @param {Object} options - configuration options for the DateTime
   * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
   * @return {DateTime}
   */
  static fromJSDate(date, options2 = {}) {
    const ts = isDate(date) ? date.valueOf() : NaN;
    if (Number.isNaN(ts)) {
      return DateTime.invalid("invalid input");
    }
    const zoneToUse = normalizeZone(options2.zone, Settings.defaultZone);
    if (!zoneToUse.isValid) {
      return DateTime.invalid(unsupportedZone(zoneToUse));
    }
    return new DateTime({
      ts,
      zone: zoneToUse,
      loc: Locale.fromObject(options2)
    });
  }
  /**
   * Create a DateTime from a number of milliseconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
   * @param {number} milliseconds - a number of milliseconds since 1970 UTC
   * @param {Object} options - configuration options for the DateTime
   * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
   * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
   * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
   * @param {string} options.weekSettings - the week settings to set on the resulting DateTime instance
   * @return {DateTime}
   */
  static fromMillis(milliseconds, options2 = {}) {
    if (!isNumber(milliseconds)) {
      throw new InvalidArgumentError(
        `fromMillis requires a numerical input, but received a ${typeof milliseconds} with value ${milliseconds}`
      );
    } else if (milliseconds < -MAX_DATE || milliseconds > MAX_DATE) {
      return DateTime.invalid("Timestamp out of range");
    } else {
      return new DateTime({
        ts: milliseconds,
        zone: normalizeZone(options2.zone, Settings.defaultZone),
        loc: Locale.fromObject(options2)
      });
    }
  }
  /**
   * Create a DateTime from a number of seconds since the epoch (meaning since 1 January 1970 00:00:00 UTC). Uses the default zone.
   * @param {number} seconds - a number of seconds since 1970 UTC
   * @param {Object} options - configuration options for the DateTime
   * @param {string|Zone} [options.zone='local'] - the zone to place the DateTime into
   * @param {string} [options.locale] - a locale to set on the resulting DateTime instance
   * @param {string} options.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @param {string} options.numberingSystem - the numbering system to set on the resulting DateTime instance
   * @param {string} options.weekSettings - the week settings to set on the resulting DateTime instance
   * @return {DateTime}
   */
  static fromSeconds(seconds, options2 = {}) {
    if (!isNumber(seconds)) {
      throw new InvalidArgumentError("fromSeconds requires a numerical input");
    } else {
      return new DateTime({
        ts: seconds * 1e3,
        zone: normalizeZone(options2.zone, Settings.defaultZone),
        loc: Locale.fromObject(options2)
      });
    }
  }
  /**
   * Create a DateTime from a JavaScript object with keys like 'year' and 'hour' with reasonable defaults.
   * @param {Object} obj - the object to create the DateTime from
   * @param {number} obj.year - a year, such as 1987
   * @param {number} obj.month - a month, 1-12
   * @param {number} obj.day - a day of the month, 1-31, depending on the month
   * @param {number} obj.ordinal - day of the year, 1-365 or 366
   * @param {number} obj.weekYear - an ISO week year
   * @param {number} obj.weekNumber - an ISO week number, between 1 and 52 or 53, depending on the year
   * @param {number} obj.weekday - an ISO weekday, 1-7, where 1 is Monday and 7 is Sunday
   * @param {number} obj.localWeekYear - a week year, according to the locale
   * @param {number} obj.localWeekNumber - a week number, between 1 and 52 or 53, depending on the year, according to the locale
   * @param {number} obj.localWeekday - a weekday, 1-7, where 1 is the first and 7 is the last day of the week, according to the locale
   * @param {number} obj.hour - hour of the day, 0-23
   * @param {number} obj.minute - minute of the hour, 0-59
   * @param {number} obj.second - second of the minute, 0-59
   * @param {number} obj.millisecond - millisecond of the second, 0-999
   * @param {Object} opts - options for creating this DateTime
   * @param {string|Zone} [opts.zone='local'] - interpret the numbers in the context of a particular zone. Can take any value taken as the first argument to setZone()
   * @param {string} [opts.locale='system\'s locale'] - a locale to set on the resulting DateTime instance
   * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
   * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
   * @example DateTime.fromObject({ year: 1982, month: 5, day: 25}).toISODate() //=> '1982-05-25'
   * @example DateTime.fromObject({ year: 1982 }).toISODate() //=> '1982-01-01'
   * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }) //~> today at 10:26:06
   * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'utc' }),
   * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'local' })
   * @example DateTime.fromObject({ hour: 10, minute: 26, second: 6 }, { zone: 'America/New_York' })
   * @example DateTime.fromObject({ weekYear: 2016, weekNumber: 2, weekday: 3 }).toISODate() //=> '2016-01-13'
   * @example DateTime.fromObject({ localWeekYear: 2022, localWeekNumber: 1, localWeekday: 1 }, { locale: "en-US" }).toISODate() //=> '2021-12-26'
   * @return {DateTime}
   */
  static fromObject(obj, opts = {}) {
    obj = obj || {};
    const zoneToUse = normalizeZone(opts.zone, Settings.defaultZone);
    if (!zoneToUse.isValid) {
      return DateTime.invalid(unsupportedZone(zoneToUse));
    }
    const loc = Locale.fromObject(opts);
    const normalized = normalizeObject(obj, normalizeUnitWithLocalWeeks);
    const { minDaysInFirstWeek, startOfWeek } = usesLocalWeekValues(normalized, loc);
    const tsNow = Settings.now(), offsetProvis = !isUndefined(opts.specificOffset) ? opts.specificOffset : zoneToUse.offset(tsNow), containsOrdinal = !isUndefined(normalized.ordinal), containsGregorYear = !isUndefined(normalized.year), containsGregorMD = !isUndefined(normalized.month) || !isUndefined(normalized.day), containsGregor = containsGregorYear || containsGregorMD, definiteWeekDef = normalized.weekYear || normalized.weekNumber;
    if ((containsGregor || containsOrdinal) && definiteWeekDef) {
      throw new ConflictingSpecificationError(
        "Can't mix weekYear/weekNumber units with year/month/day or ordinals"
      );
    }
    if (containsGregorMD && containsOrdinal) {
      throw new ConflictingSpecificationError("Can't mix ordinal dates with month/day");
    }
    const useWeekData = definiteWeekDef || normalized.weekday && !containsGregor;
    let units, defaultValues, objNow = tsToObj(tsNow, offsetProvis);
    if (useWeekData) {
      units = orderedWeekUnits;
      defaultValues = defaultWeekUnitValues;
      objNow = gregorianToWeek(objNow, minDaysInFirstWeek, startOfWeek);
    } else if (containsOrdinal) {
      units = orderedOrdinalUnits;
      defaultValues = defaultOrdinalUnitValues;
      objNow = gregorianToOrdinal(objNow);
    } else {
      units = orderedUnits;
      defaultValues = defaultUnitValues;
    }
    let foundFirst = false;
    for (const u of units) {
      const v = normalized[u];
      if (!isUndefined(v)) {
        foundFirst = true;
      } else if (foundFirst) {
        normalized[u] = defaultValues[u];
      } else {
        normalized[u] = objNow[u];
      }
    }
    const higherOrderInvalid = useWeekData ? hasInvalidWeekData(normalized, minDaysInFirstWeek, startOfWeek) : containsOrdinal ? hasInvalidOrdinalData(normalized) : hasInvalidGregorianData(normalized), invalid = higherOrderInvalid || hasInvalidTimeData(normalized);
    if (invalid) {
      return DateTime.invalid(invalid);
    }
    const gregorian = useWeekData ? weekToGregorian(normalized, minDaysInFirstWeek, startOfWeek) : containsOrdinal ? ordinalToGregorian(normalized) : normalized, [tsFinal, offsetFinal] = objToTS(gregorian, offsetProvis, zoneToUse), inst = new DateTime({
      ts: tsFinal,
      zone: zoneToUse,
      o: offsetFinal,
      loc
    });
    if (normalized.weekday && containsGregor && obj.weekday !== inst.weekday) {
      return DateTime.invalid(
        "mismatched weekday",
        `you can't specify both a weekday of ${normalized.weekday} and a date of ${inst.toISO()}`
      );
    }
    if (!inst.isValid) {
      return DateTime.invalid(inst.invalid);
    }
    return inst;
  }
  /**
   * Create a DateTime from an ISO 8601 string
   * @param {string} text - the ISO string
   * @param {Object} opts - options to affect the creation
   * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the time to this zone
   * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
   * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
   * @param {string} [opts.outputCalendar] - the output calendar to set on the resulting DateTime instance
   * @param {string} [opts.numberingSystem] - the numbering system to set on the resulting DateTime instance
   * @param {string} [opts.weekSettings] - the week settings to set on the resulting DateTime instance
   * @example DateTime.fromISO('2016-05-25T09:08:34.123')
   * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00')
   * @example DateTime.fromISO('2016-05-25T09:08:34.123+06:00', {setZone: true})
   * @example DateTime.fromISO('2016-05-25T09:08:34.123', {zone: 'utc'})
   * @example DateTime.fromISO('2016-W05-4')
   * @return {DateTime}
   */
  static fromISO(text, opts = {}) {
    const [vals, parsedZone] = parseISODate(text);
    return parseDataToDateTime(vals, parsedZone, opts, "ISO 8601", text);
  }
  /**
   * Create a DateTime from an RFC 2822 string
   * @param {string} text - the RFC 2822 string
   * @param {Object} opts - options to affect the creation
   * @param {string|Zone} [opts.zone='local'] - convert the time to this zone. Since the offset is always specified in the string itself, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
   * @param {boolean} [opts.setZone=false] - override the zone with a fixed-offset zone specified in the string itself, if it specifies one
   * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
   * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
   * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
   * @example DateTime.fromRFC2822('25 Nov 2016 13:23:12 GMT')
   * @example DateTime.fromRFC2822('Fri, 25 Nov 2016 13:23:12 +0600')
   * @example DateTime.fromRFC2822('25 Nov 2016 13:23 Z')
   * @return {DateTime}
   */
  static fromRFC2822(text, opts = {}) {
    const [vals, parsedZone] = parseRFC2822Date(text);
    return parseDataToDateTime(vals, parsedZone, opts, "RFC 2822", text);
  }
  /**
   * Create a DateTime from an HTTP header date
   * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
   * @param {string} text - the HTTP header date
   * @param {Object} opts - options to affect the creation
   * @param {string|Zone} [opts.zone='local'] - convert the time to this zone. Since HTTP dates are always in UTC, this has no effect on the interpretation of string, merely the zone the resulting DateTime is expressed in.
   * @param {boolean} [opts.setZone=false] - override the zone with the fixed-offset zone specified in the string. For HTTP dates, this is always UTC, so this option is equivalent to setting the `zone` option to 'utc', but this option is included for consistency with similar methods.
   * @param {string} [opts.locale='system's locale'] - a locale to set on the resulting DateTime instance
   * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @param {string} opts.numberingSystem - the numbering system to set on the resulting DateTime instance
   * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
   * @example DateTime.fromHTTP('Sun, 06 Nov 1994 08:49:37 GMT')
   * @example DateTime.fromHTTP('Sunday, 06-Nov-94 08:49:37 GMT')
   * @example DateTime.fromHTTP('Sun Nov  6 08:49:37 1994')
   * @return {DateTime}
   */
  static fromHTTP(text, opts = {}) {
    const [vals, parsedZone] = parseHTTPDate(text);
    return parseDataToDateTime(vals, parsedZone, opts, "HTTP", opts);
  }
  /**
   * Create a DateTime from an input string and format string.
   * Defaults to en-US if no locale has been specified, regardless of the system's locale. For a table of tokens and their interpretations, see [here](https://moment.github.io/luxon/#/parsing?id=table-of-tokens).
   * @param {string} text - the string to parse
   * @param {string} fmt - the format the string is expected to be in (see the link below for the formats)
   * @param {Object} opts - options to affect the creation
   * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
   * @param {boolean} [opts.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
   * @param {string} [opts.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
   * @param {string} opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
   * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
   * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @return {DateTime}
   */
  static fromFormat(text, fmt, opts = {}) {
    if (isUndefined(text) || isUndefined(fmt)) {
      throw new InvalidArgumentError("fromFormat requires an input string and a format");
    }
    const { locale = null, numberingSystem = null } = opts, localeToUse = Locale.fromOpts({
      locale,
      numberingSystem,
      defaultToEN: true
    }), [vals, parsedZone, specificOffset, invalid] = parseFromTokens(localeToUse, text, fmt);
    if (invalid) {
      return DateTime.invalid(invalid);
    } else {
      return parseDataToDateTime(vals, parsedZone, opts, `format ${fmt}`, text, specificOffset);
    }
  }
  /**
   * @deprecated use fromFormat instead
   */
  static fromString(text, fmt, opts = {}) {
    return DateTime.fromFormat(text, fmt, opts);
  }
  /**
   * Create a DateTime from a SQL date, time, or datetime
   * Defaults to en-US if no locale has been specified, regardless of the system's locale
   * @param {string} text - the string to parse
   * @param {Object} opts - options to affect the creation
   * @param {string|Zone} [opts.zone='local'] - use this zone if no offset is specified in the input string itself. Will also convert the DateTime to this zone
   * @param {boolean} [opts.setZone=false] - override the zone with a zone specified in the string itself, if it specifies one
   * @param {string} [opts.locale='en-US'] - a locale string to use when parsing. Will also set the DateTime to this locale
   * @param {string} opts.numberingSystem - the numbering system to use when parsing. Will also set the resulting DateTime to this numbering system
   * @param {string} opts.weekSettings - the week settings to set on the resulting DateTime instance
   * @param {string} opts.outputCalendar - the output calendar to set on the resulting DateTime instance
   * @example DateTime.fromSQL('2017-05-15')
   * @example DateTime.fromSQL('2017-05-15 09:12:34')
   * @example DateTime.fromSQL('2017-05-15 09:12:34.342')
   * @example DateTime.fromSQL('2017-05-15 09:12:34.342+06:00')
   * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles')
   * @example DateTime.fromSQL('2017-05-15 09:12:34.342 America/Los_Angeles', { setZone: true })
   * @example DateTime.fromSQL('2017-05-15 09:12:34.342', { zone: 'America/Los_Angeles' })
   * @example DateTime.fromSQL('09:12:34.342')
   * @return {DateTime}
   */
  static fromSQL(text, opts = {}) {
    const [vals, parsedZone] = parseSQL(text);
    return parseDataToDateTime(vals, parsedZone, opts, "SQL", text);
  }
  /**
   * Create an invalid DateTime.
   * @param {string} reason - simple string of why this DateTime is invalid. Should not contain parameters or anything else data-dependent.
   * @param {string} [explanation=null] - longer explanation, may include parameters and other useful debugging information
   * @return {DateTime}
   */
  static invalid(reason, explanation = null) {
    if (!reason) {
      throw new InvalidArgumentError("need to specify a reason the DateTime is invalid");
    }
    const invalid = reason instanceof Invalid ? reason : new Invalid(reason, explanation);
    if (Settings.throwOnInvalid) {
      throw new InvalidDateTimeError(invalid);
    } else {
      return new DateTime({ invalid });
    }
  }
  /**
   * Check if an object is an instance of DateTime. Works across context boundaries
   * @param {object} o
   * @return {boolean}
   */
  static isDateTime(o) {
    return o && o.isLuxonDateTime || false;
  }
  /**
   * Produce the format string for a set of options
   * @param formatOpts
   * @param localeOpts
   * @returns {string}
   */
  static parseFormatForOpts(formatOpts, localeOpts = {}) {
    const tokenList = formatOptsToTokens(formatOpts, Locale.fromObject(localeOpts));
    return !tokenList ? null : tokenList.map((t) => t ? t.val : null).join("");
  }
  /**
   * Produce the the fully expanded format token for the locale
   * Does NOT quote characters, so quoted tokens will not round trip correctly
   * @param fmt
   * @param localeOpts
   * @returns {string}
   */
  static expandFormat(fmt, localeOpts = {}) {
    const expanded = expandMacroTokens(Formatter.parseFormat(fmt), Locale.fromObject(localeOpts));
    return expanded.map((t) => t.val).join("");
  }
  static resetCache() {
    zoneOffsetTs = void 0;
    zoneOffsetGuessCache.clear();
  }
  // INFO
  /**
   * Get the value of unit.
   * @param {string} unit - a unit such as 'minute' or 'day'
   * @example DateTime.local(2017, 7, 4).get('month'); //=> 7
   * @example DateTime.local(2017, 7, 4).get('day'); //=> 4
   * @return {number}
   */
  get(unit) {
    return this[unit];
  }
  /**
   * Returns whether the DateTime is valid. Invalid DateTimes occur when:
   * * The DateTime was created from invalid calendar information, such as the 13th month or February 30
   * * The DateTime was created by an operation on another invalid date
   * @type {boolean}
   */
  get isValid() {
    return this.invalid === null;
  }
  /**
   * Returns an error code if this DateTime is invalid, or null if the DateTime is valid
   * @type {string}
   */
  get invalidReason() {
    return this.invalid ? this.invalid.reason : null;
  }
  /**
   * Returns an explanation of why this DateTime became invalid, or null if the DateTime is valid
   * @type {string}
   */
  get invalidExplanation() {
    return this.invalid ? this.invalid.explanation : null;
  }
  /**
   * Get the locale of a DateTime, such 'en-GB'. The locale is used when formatting the DateTime
   *
   * @type {string}
   */
  get locale() {
    return this.isValid ? this.loc.locale : null;
  }
  /**
   * Get the numbering system of a DateTime, such 'beng'. The numbering system is used when formatting the DateTime
   *
   * @type {string}
   */
  get numberingSystem() {
    return this.isValid ? this.loc.numberingSystem : null;
  }
  /**
   * Get the output calendar of a DateTime, such 'islamic'. The output calendar is used when formatting the DateTime
   *
   * @type {string}
   */
  get outputCalendar() {
    return this.isValid ? this.loc.outputCalendar : null;
  }
  /**
   * Get the time zone associated with this DateTime.
   * @type {Zone}
   */
  get zone() {
    return this._zone;
  }
  /**
   * Get the name of the time zone.
   * @type {string}
   */
  get zoneName() {
    return this.isValid ? this.zone.name : null;
  }
  /**
   * Get the year
   * @example DateTime.local(2017, 5, 25).year //=> 2017
   * @type {number}
   */
  get year() {
    return this.isValid ? this.c.year : NaN;
  }
  /**
   * Get the quarter
   * @example DateTime.local(2017, 5, 25).quarter //=> 2
   * @type {number}
   */
  get quarter() {
    return this.isValid ? Math.ceil(this.c.month / 3) : NaN;
  }
  /**
   * Get the month (1-12).
   * @example DateTime.local(2017, 5, 25).month //=> 5
   * @type {number}
   */
  get month() {
    return this.isValid ? this.c.month : NaN;
  }
  /**
   * Get the day of the month (1-30ish).
   * @example DateTime.local(2017, 5, 25).day //=> 25
   * @type {number}
   */
  get day() {
    return this.isValid ? this.c.day : NaN;
  }
  /**
   * Get the hour of the day (0-23).
   * @example DateTime.local(2017, 5, 25, 9).hour //=> 9
   * @type {number}
   */
  get hour() {
    return this.isValid ? this.c.hour : NaN;
  }
  /**
   * Get the minute of the hour (0-59).
   * @example DateTime.local(2017, 5, 25, 9, 30).minute //=> 30
   * @type {number}
   */
  get minute() {
    return this.isValid ? this.c.minute : NaN;
  }
  /**
   * Get the second of the minute (0-59).
   * @example DateTime.local(2017, 5, 25, 9, 30, 52).second //=> 52
   * @type {number}
   */
  get second() {
    return this.isValid ? this.c.second : NaN;
  }
  /**
   * Get the millisecond of the second (0-999).
   * @example DateTime.local(2017, 5, 25, 9, 30, 52, 654).millisecond //=> 654
   * @type {number}
   */
  get millisecond() {
    return this.isValid ? this.c.millisecond : NaN;
  }
  /**
   * Get the week year
   * @see https://en.wikipedia.org/wiki/ISO_week_date
   * @example DateTime.local(2014, 12, 31).weekYear //=> 2015
   * @type {number}
   */
  get weekYear() {
    return this.isValid ? possiblyCachedWeekData(this).weekYear : NaN;
  }
  /**
   * Get the week number of the week year (1-52ish).
   * @see https://en.wikipedia.org/wiki/ISO_week_date
   * @example DateTime.local(2017, 5, 25).weekNumber //=> 21
   * @type {number}
   */
  get weekNumber() {
    return this.isValid ? possiblyCachedWeekData(this).weekNumber : NaN;
  }
  /**
   * Get the day of the week.
   * 1 is Monday and 7 is Sunday
   * @see https://en.wikipedia.org/wiki/ISO_week_date
   * @example DateTime.local(2014, 11, 31).weekday //=> 4
   * @type {number}
   */
  get weekday() {
    return this.isValid ? possiblyCachedWeekData(this).weekday : NaN;
  }
  /**
   * Returns true if this date is on a weekend according to the locale, false otherwise
   * @returns {boolean}
   */
  get isWeekend() {
    return this.isValid && this.loc.getWeekendDays().includes(this.weekday);
  }
  /**
   * Get the day of the week according to the locale.
   * 1 is the first day of the week and 7 is the last day of the week.
   * If the locale assigns Sunday as the first day of the week, then a date which is a Sunday will return 1,
   * @returns {number}
   */
  get localWeekday() {
    return this.isValid ? possiblyCachedLocalWeekData(this).weekday : NaN;
  }
  /**
   * Get the week number of the week year according to the locale. Different locales assign week numbers differently,
   * because the week can start on different days of the week (see localWeekday) and because a different number of days
   * is required for a week to count as the first week of a year.
   * @returns {number}
   */
  get localWeekNumber() {
    return this.isValid ? possiblyCachedLocalWeekData(this).weekNumber : NaN;
  }
  /**
   * Get the week year according to the locale. Different locales assign week numbers (and therefor week years)
   * differently, see localWeekNumber.
   * @returns {number}
   */
  get localWeekYear() {
    return this.isValid ? possiblyCachedLocalWeekData(this).weekYear : NaN;
  }
  /**
   * Get the ordinal (meaning the day of the year)
   * @example DateTime.local(2017, 5, 25).ordinal //=> 145
   * @type {number|DateTime}
   */
  get ordinal() {
    return this.isValid ? gregorianToOrdinal(this.c).ordinal : NaN;
  }
  /**
   * Get the human readable short month name, such as 'Oct'.
   * Defaults to the system's locale if no locale has been specified
   * @example DateTime.local(2017, 10, 30).monthShort //=> Oct
   * @type {string}
   */
  get monthShort() {
    return this.isValid ? Info.months("short", { locObj: this.loc })[this.month - 1] : null;
  }
  /**
   * Get the human readable long month name, such as 'October'.
   * Defaults to the system's locale if no locale has been specified
   * @example DateTime.local(2017, 10, 30).monthLong //=> October
   * @type {string}
   */
  get monthLong() {
    return this.isValid ? Info.months("long", { locObj: this.loc })[this.month - 1] : null;
  }
  /**
   * Get the human readable short weekday, such as 'Mon'.
   * Defaults to the system's locale if no locale has been specified
   * @example DateTime.local(2017, 10, 30).weekdayShort //=> Mon
   * @type {string}
   */
  get weekdayShort() {
    return this.isValid ? Info.weekdays("short", { locObj: this.loc })[this.weekday - 1] : null;
  }
  /**
   * Get the human readable long weekday, such as 'Monday'.
   * Defaults to the system's locale if no locale has been specified
   * @example DateTime.local(2017, 10, 30).weekdayLong //=> Monday
   * @type {string}
   */
  get weekdayLong() {
    return this.isValid ? Info.weekdays("long", { locObj: this.loc })[this.weekday - 1] : null;
  }
  /**
   * Get the UTC offset of this DateTime in minutes
   * @example DateTime.now().offset //=> -240
   * @example DateTime.utc().offset //=> 0
   * @type {number}
   */
  get offset() {
    return this.isValid ? +this.o : NaN;
  }
  /**
   * Get the short human name for the zone's current offset, for example "EST" or "EDT".
   * Defaults to the system's locale if no locale has been specified
   * @type {string}
   */
  get offsetNameShort() {
    if (this.isValid) {
      return this.zone.offsetName(this.ts, {
        format: "short",
        locale: this.locale
      });
    } else {
      return null;
    }
  }
  /**
   * Get the long human name for the zone's current offset, for example "Eastern Standard Time" or "Eastern Daylight Time".
   * Defaults to the system's locale if no locale has been specified
   * @type {string}
   */
  get offsetNameLong() {
    if (this.isValid) {
      return this.zone.offsetName(this.ts, {
        format: "long",
        locale: this.locale
      });
    } else {
      return null;
    }
  }
  /**
   * Get whether this zone's offset ever changes, as in a DST.
   * @type {boolean}
   */
  get isOffsetFixed() {
    return this.isValid ? this.zone.isUniversal : null;
  }
  /**
   * Get whether the DateTime is in a DST.
   * @type {boolean}
   */
  get isInDST() {
    if (this.isOffsetFixed) {
      return false;
    } else {
      return this.offset > this.set({ month: 1, day: 1 }).offset || this.offset > this.set({ month: 5 }).offset;
    }
  }
  /**
   * Get those DateTimes which have the same local time as this DateTime, but a different offset from UTC
   * in this DateTime's zone. During DST changes local time can be ambiguous, for example
   * `2023-10-29T02:30:00` in `Europe/Berlin` can have offset `+01:00` or `+02:00`.
   * This method will return both possible DateTimes if this DateTime's local time is ambiguous.
   * @returns {DateTime[]}
   */
  getPossibleOffsets() {
    if (!this.isValid || this.isOffsetFixed) {
      return [this];
    }
    const dayMs = 864e5;
    const minuteMs = 6e4;
    const localTS = objToLocalTS(this.c);
    const oEarlier = this.zone.offset(localTS - dayMs);
    const oLater = this.zone.offset(localTS + dayMs);
    const o1 = this.zone.offset(localTS - oEarlier * minuteMs);
    const o2 = this.zone.offset(localTS - oLater * minuteMs);
    if (o1 === o2) {
      return [this];
    }
    const ts1 = localTS - o1 * minuteMs;
    const ts2 = localTS - o2 * minuteMs;
    const c1 = tsToObj(ts1, o1);
    const c2 = tsToObj(ts2, o2);
    if (c1.hour === c2.hour && c1.minute === c2.minute && c1.second === c2.second && c1.millisecond === c2.millisecond) {
      return [clone(this, { ts: ts1 }), clone(this, { ts: ts2 })];
    }
    return [this];
  }
  /**
   * Returns true if this DateTime is in a leap year, false otherwise
   * @example DateTime.local(2016).isInLeapYear //=> true
   * @example DateTime.local(2013).isInLeapYear //=> false
   * @type {boolean}
   */
  get isInLeapYear() {
    return isLeapYear(this.year);
  }
  /**
   * Returns the number of days in this DateTime's month
   * @example DateTime.local(2016, 2).daysInMonth //=> 29
   * @example DateTime.local(2016, 3).daysInMonth //=> 31
   * @type {number}
   */
  get daysInMonth() {
    return daysInMonth(this.year, this.month);
  }
  /**
   * Returns the number of days in this DateTime's year
   * @example DateTime.local(2016).daysInYear //=> 366
   * @example DateTime.local(2013).daysInYear //=> 365
   * @type {number}
   */
  get daysInYear() {
    return this.isValid ? daysInYear(this.year) : NaN;
  }
  /**
   * Returns the number of weeks in this DateTime's year
   * @see https://en.wikipedia.org/wiki/ISO_week_date
   * @example DateTime.local(2004).weeksInWeekYear //=> 53
   * @example DateTime.local(2013).weeksInWeekYear //=> 52
   * @type {number}
   */
  get weeksInWeekYear() {
    return this.isValid ? weeksInWeekYear(this.weekYear) : NaN;
  }
  /**
   * Returns the number of weeks in this DateTime's local week year
   * @example DateTime.local(2020, 6, {locale: 'en-US'}).weeksInLocalWeekYear //=> 52
   * @example DateTime.local(2020, 6, {locale: 'de-DE'}).weeksInLocalWeekYear //=> 53
   * @type {number}
   */
  get weeksInLocalWeekYear() {
    return this.isValid ? weeksInWeekYear(
      this.localWeekYear,
      this.loc.getMinDaysInFirstWeek(),
      this.loc.getStartOfWeek()
    ) : NaN;
  }
  /**
   * Returns the resolved Intl options for this DateTime.
   * This is useful in understanding the behavior of formatting methods
   * @param {Object} opts - the same options as toLocaleString
   * @return {Object}
   */
  resolvedLocaleOptions(opts = {}) {
    const { locale, numberingSystem, calendar } = Formatter.create(
      this.loc.clone(opts),
      opts
    ).resolvedOptions(this);
    return { locale, numberingSystem, outputCalendar: calendar };
  }
  // TRANSFORM
  /**
   * "Set" the DateTime's zone to UTC. Returns a newly-constructed DateTime.
   *
   * Equivalent to {@link DateTime#setZone}('utc')
   * @param {number} [offset=0] - optionally, an offset from UTC in minutes
   * @param {Object} [opts={}] - options to pass to `setZone()`
   * @return {DateTime}
   */
  toUTC(offset2 = 0, opts = {}) {
    return this.setZone(FixedOffsetZone.instance(offset2), opts);
  }
  /**
   * "Set" the DateTime's zone to the host's local zone. Returns a newly-constructed DateTime.
   *
   * Equivalent to `setZone('local')`
   * @return {DateTime}
   */
  toLocal() {
    return this.setZone(Settings.defaultZone);
  }
  /**
   * "Set" the DateTime's zone to specified zone. Returns a newly-constructed DateTime.
   *
   * By default, the setter keeps the underlying time the same (as in, the same timestamp), but the new instance will report different local times and consider DSTs when making computations, as with {@link DateTime#plus}. You may wish to use {@link DateTime#toLocal} and {@link DateTime#toUTC} which provide simple convenience wrappers for commonly used zones.
   * @param {string|Zone} [zone='local'] - a zone identifier. As a string, that can be any IANA zone supported by the host environment, or a fixed-offset name of the form 'UTC+3', or the strings 'local' or 'utc'. You may also supply an instance of a {@link DateTime#Zone} class.
   * @param {Object} opts - options
   * @param {boolean} [opts.keepLocalTime=false] - If true, adjust the underlying time so that the local time stays the same, but in the target zone. You should rarely need this.
   * @return {DateTime}
   */
  setZone(zone, { keepLocalTime = false, keepCalendarTime = false } = {}) {
    zone = normalizeZone(zone, Settings.defaultZone);
    if (zone.equals(this.zone)) {
      return this;
    } else if (!zone.isValid) {
      return DateTime.invalid(unsupportedZone(zone));
    } else {
      let newTS = this.ts;
      if (keepLocalTime || keepCalendarTime) {
        const offsetGuess = zone.offset(this.ts);
        const asObj = this.toObject();
        [newTS] = objToTS(asObj, offsetGuess, zone);
      }
      return clone(this, { ts: newTS, zone });
    }
  }
  /**
   * "Set" the locale, numberingSystem, or outputCalendar. Returns a newly-constructed DateTime.
   * @param {Object} properties - the properties to set
   * @example DateTime.local(2017, 5, 25).reconfigure({ locale: 'en-GB' })
   * @return {DateTime}
   */
  reconfigure({ locale, numberingSystem, outputCalendar } = {}) {
    const loc = this.loc.clone({ locale, numberingSystem, outputCalendar });
    return clone(this, { loc });
  }
  /**
   * "Set" the locale. Returns a newly-constructed DateTime.
   * Just a convenient alias for reconfigure({ locale })
   * @example DateTime.local(2017, 5, 25).setLocale('en-GB')
   * @return {DateTime}
   */
  setLocale(locale) {
    return this.reconfigure({ locale });
  }
  /**
   * "Set" the values of specified units. Returns a newly-constructed DateTime.
   * You can only set units with this method; for "setting" metadata, see {@link DateTime#reconfigure} and {@link DateTime#setZone}.
   *
   * This method also supports setting locale-based week units, i.e. `localWeekday`, `localWeekNumber` and `localWeekYear`.
   * They cannot be mixed with ISO-week units like `weekday`.
   * @param {Object} values - a mapping of units to numbers
   * @example dt.set({ year: 2017 })
   * @example dt.set({ hour: 8, minute: 30 })
   * @example dt.set({ weekday: 5 })
   * @example dt.set({ year: 2005, ordinal: 234 })
   * @return {DateTime}
   */
  set(values) {
    if (!this.isValid) return this;
    const normalized = normalizeObject(values, normalizeUnitWithLocalWeeks);
    const { minDaysInFirstWeek, startOfWeek } = usesLocalWeekValues(normalized, this.loc);
    const settingWeekStuff = !isUndefined(normalized.weekYear) || !isUndefined(normalized.weekNumber) || !isUndefined(normalized.weekday), containsOrdinal = !isUndefined(normalized.ordinal), containsGregorYear = !isUndefined(normalized.year), containsGregorMD = !isUndefined(normalized.month) || !isUndefined(normalized.day), containsGregor = containsGregorYear || containsGregorMD, definiteWeekDef = normalized.weekYear || normalized.weekNumber;
    if ((containsGregor || containsOrdinal) && definiteWeekDef) {
      throw new ConflictingSpecificationError(
        "Can't mix weekYear/weekNumber units with year/month/day or ordinals"
      );
    }
    if (containsGregorMD && containsOrdinal) {
      throw new ConflictingSpecificationError("Can't mix ordinal dates with month/day");
    }
    let mixed;
    if (settingWeekStuff) {
      mixed = weekToGregorian(
        { ...gregorianToWeek(this.c, minDaysInFirstWeek, startOfWeek), ...normalized },
        minDaysInFirstWeek,
        startOfWeek
      );
    } else if (!isUndefined(normalized.ordinal)) {
      mixed = ordinalToGregorian({ ...gregorianToOrdinal(this.c), ...normalized });
    } else {
      mixed = { ...this.toObject(), ...normalized };
      if (isUndefined(normalized.day)) {
        mixed.day = Math.min(daysInMonth(mixed.year, mixed.month), mixed.day);
      }
    }
    const [ts, o] = objToTS(mixed, this.o, this.zone);
    return clone(this, { ts, o });
  }
  /**
   * Add a period of time to this DateTime and return the resulting DateTime
   *
   * Adding hours, minutes, seconds, or milliseconds increases the timestamp by the right number of milliseconds. Adding days, months, or years shifts the calendar, accounting for DSTs and leap years along the way. Thus, `dt.plus({ hours: 24 })` may result in a different time than `dt.plus({ days: 1 })` if there's a DST shift in between.
   * @param {Duration|Object|number} duration - The amount to add. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
   * @example DateTime.now().plus(123) //~> in 123 milliseconds
   * @example DateTime.now().plus({ minutes: 15 }) //~> in 15 minutes
   * @example DateTime.now().plus({ days: 1 }) //~> this time tomorrow
   * @example DateTime.now().plus({ days: -1 }) //~> this time yesterday
   * @example DateTime.now().plus({ hours: 3, minutes: 13 }) //~> in 3 hr, 13 min
   * @example DateTime.now().plus(Duration.fromObject({ hours: 3, minutes: 13 })) //~> in 3 hr, 13 min
   * @return {DateTime}
   */
  plus(duration) {
    if (!this.isValid) return this;
    const dur = Duration.fromDurationLike(duration);
    return clone(this, adjustTime(this, dur));
  }
  /**
   * Subtract a period of time to this DateTime and return the resulting DateTime
   * See {@link DateTime#plus}
   * @param {Duration|Object|number} duration - The amount to subtract. Either a Luxon Duration, a number of milliseconds, the object argument to Duration.fromObject()
   @return {DateTime}
   */
  minus(duration) {
    if (!this.isValid) return this;
    const dur = Duration.fromDurationLike(duration).negate();
    return clone(this, adjustTime(this, dur));
  }
  /**
   * "Set" this DateTime to the beginning of a unit of time.
   * @param {string} unit - The unit to go to the beginning of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
   * @param {Object} opts - options
   * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week
   * @example DateTime.local(2014, 3, 3).startOf('month').toISODate(); //=> '2014-03-01'
   * @example DateTime.local(2014, 3, 3).startOf('year').toISODate(); //=> '2014-01-01'
   * @example DateTime.local(2014, 3, 3).startOf('week').toISODate(); //=> '2014-03-03', weeks always start on Mondays
   * @example DateTime.local(2014, 3, 3, 5, 30).startOf('day').toISOTime(); //=> '00:00.000-05:00'
   * @example DateTime.local(2014, 3, 3, 5, 30).startOf('hour').toISOTime(); //=> '05:00:00.000-05:00'
   * @return {DateTime}
   */
  startOf(unit, { useLocaleWeeks = false } = {}) {
    if (!this.isValid) return this;
    const o = {}, normalizedUnit = Duration.normalizeUnit(unit);
    switch (normalizedUnit) {
      case "years":
        o.month = 1;
      // falls through
      case "quarters":
      case "months":
        o.day = 1;
      // falls through
      case "weeks":
      case "days":
        o.hour = 0;
      // falls through
      case "hours":
        o.minute = 0;
      // falls through
      case "minutes":
        o.second = 0;
      // falls through
      case "seconds":
        o.millisecond = 0;
        break;
    }
    if (normalizedUnit === "weeks") {
      if (useLocaleWeeks) {
        const startOfWeek = this.loc.getStartOfWeek();
        const { weekday } = this;
        if (weekday < startOfWeek) {
          o.weekNumber = this.weekNumber - 1;
        }
        o.weekday = startOfWeek;
      } else {
        o.weekday = 1;
      }
    }
    if (normalizedUnit === "quarters") {
      const q = Math.ceil(this.month / 3);
      o.month = (q - 1) * 3 + 1;
    }
    return this.set(o);
  }
  /**
   * "Set" this DateTime to the end (meaning the last millisecond) of a unit of time
   * @param {string} unit - The unit to go to the end of. Can be 'year', 'quarter', 'month', 'week', 'day', 'hour', 'minute', 'second', or 'millisecond'.
   * @param {Object} opts - options
   * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week
   * @example DateTime.local(2014, 3, 3).endOf('month').toISO(); //=> '2014-03-31T23:59:59.999-05:00'
   * @example DateTime.local(2014, 3, 3).endOf('year').toISO(); //=> '2014-12-31T23:59:59.999-05:00'
   * @example DateTime.local(2014, 3, 3).endOf('week').toISO(); // => '2014-03-09T23:59:59.999-05:00', weeks start on Mondays
   * @example DateTime.local(2014, 3, 3, 5, 30).endOf('day').toISO(); //=> '2014-03-03T23:59:59.999-05:00'
   * @example DateTime.local(2014, 3, 3, 5, 30).endOf('hour').toISO(); //=> '2014-03-03T05:59:59.999-05:00'
   * @return {DateTime}
   */
  endOf(unit, opts) {
    return this.isValid ? this.plus({ [unit]: 1 }).startOf(unit, opts).minus(1) : this;
  }
  // OUTPUT
  /**
   * Returns a string representation of this DateTime formatted according to the specified format string.
   * **You may not want this.** See {@link DateTime#toLocaleString} for a more flexible formatting tool. For a table of tokens and their interpretations, see [here](https://moment.github.io/luxon/#/formatting?id=table-of-tokens).
   * Defaults to en-US if no locale has been specified, regardless of the system's locale.
   * @param {string} fmt - the format string
   * @param {Object} opts - opts to override the configuration options on this DateTime
   * @example DateTime.now().toFormat('yyyy LLL dd') //=> '2017 Apr 22'
   * @example DateTime.now().setLocale('fr').toFormat('yyyy LLL dd') //=> '2017 avr. 22'
   * @example DateTime.now().toFormat('yyyy LLL dd', { locale: "fr" }) //=> '2017 avr. 22'
   * @example DateTime.now().toFormat("HH 'hours and' mm 'minutes'") //=> '20 hours and 55 minutes'
   * @return {string}
   */
  toFormat(fmt, opts = {}) {
    return this.isValid ? Formatter.create(this.loc.redefaultToEN(opts)).formatDateTimeFromString(this, fmt) : INVALID;
  }
  /**
   * Returns a localized string representing this date. Accepts the same options as the Intl.DateTimeFormat constructor and any presets defined by Luxon, such as `DateTime.DATE_FULL` or `DateTime.TIME_SIMPLE`.
   * The exact behavior of this method is browser-specific, but in general it will return an appropriate representation
   * of the DateTime in the assigned locale.
   * Defaults to the system's locale if no locale has been specified
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
   * @param formatOpts {Object} - Intl.DateTimeFormat constructor options and configuration options
   * @param {Object} opts - opts to override the configuration options on this DateTime
   * @example DateTime.now().toLocaleString(); //=> 4/20/2017
   * @example DateTime.now().setLocale('en-gb').toLocaleString(); //=> '20/04/2017'
   * @example DateTime.now().toLocaleString(DateTime.DATE_FULL); //=> 'April 20, 2017'
   * @example DateTime.now().toLocaleString(DateTime.DATE_FULL, { locale: 'fr' }); //=> '28 août 2022'
   * @example DateTime.now().toLocaleString(DateTime.TIME_SIMPLE); //=> '11:32 AM'
   * @example DateTime.now().toLocaleString(DateTime.DATETIME_SHORT); //=> '4/20/2017, 11:32 AM'
   * @example DateTime.now().toLocaleString({ weekday: 'long', month: 'long', day: '2-digit' }); //=> 'Thursday, April 20'
   * @example DateTime.now().toLocaleString({ weekday: 'short', month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); //=> 'Thu, Apr 20, 11:27 AM'
   * @example DateTime.now().toLocaleString({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }); //=> '11:32'
   * @return {string}
   */
  toLocaleString(formatOpts = DATE_SHORT, opts = {}) {
    return this.isValid ? Formatter.create(this.loc.clone(opts), formatOpts).formatDateTime(this) : INVALID;
  }
  /**
   * Returns an array of format "parts", meaning individual tokens along with metadata. This is allows callers to post-process individual sections of the formatted output.
   * Defaults to the system's locale if no locale has been specified
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat/formatToParts
   * @param opts {Object} - Intl.DateTimeFormat constructor options, same as `toLocaleString`.
   * @example DateTime.now().toLocaleParts(); //=> [
   *                                   //=>   { type: 'day', value: '25' },
   *                                   //=>   { type: 'literal', value: '/' },
   *                                   //=>   { type: 'month', value: '05' },
   *                                   //=>   { type: 'literal', value: '/' },
   *                                   //=>   { type: 'year', value: '1982' }
   *                                   //=> ]
   */
  toLocaleParts(opts = {}) {
    return this.isValid ? Formatter.create(this.loc.clone(opts), opts).formatDateTimeParts(this) : [];
  }
  /**
   * Returns an ISO 8601-compliant string representation of this DateTime
   * @param {Object} opts - options
   * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
   * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
   * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
   * @param {boolean} [opts.extendedZone=false] - add the time zone format extension
   * @param {string} [opts.format='extended'] - choose between the basic and extended format
   * @param {string} [opts.precision='milliseconds'] - truncate output to desired presicion: 'years', 'months', 'days', 'hours', 'minutes', 'seconds' or 'milliseconds'. When precision and suppressSeconds or suppressMilliseconds are used together, precision sets the maximum unit shown in the output, however seconds or milliseconds will still be suppressed if they are 0.
   * @example DateTime.utc(1983, 5, 25).toISO() //=> '1982-05-25T00:00:00.000Z'
   * @example DateTime.now().toISO() //=> '2017-04-22T20:47:05.335-04:00'
   * @example DateTime.now().toISO({ includeOffset: false }) //=> '2017-04-22T20:47:05.335'
   * @example DateTime.now().toISO({ format: 'basic' }) //=> '20170422T204705.335-0400'
   * @example DateTime.now().toISO({ precision: 'day' }) //=> '2017-04-22Z'
   * @example DateTime.now().toISO({ precision: 'minute' }) //=> '2017-04-22T20:47Z'
   * @return {string|null}
   */
  toISO({
    format = "extended",
    suppressSeconds = false,
    suppressMilliseconds = false,
    includeOffset = true,
    extendedZone = false,
    precision = "milliseconds"
  } = {}) {
    if (!this.isValid) {
      return null;
    }
    precision = normalizeUnit(precision);
    const ext = format === "extended";
    let c = toISODate(this, ext, precision);
    if (orderedUnits.indexOf(precision) >= 3) c += "T";
    c += toISOTime(
      this,
      ext,
      suppressSeconds,
      suppressMilliseconds,
      includeOffset,
      extendedZone,
      precision
    );
    return c;
  }
  /**
   * Returns an ISO 8601-compliant string representation of this DateTime's date component
   * @param {Object} opts - options
   * @param {string} [opts.format='extended'] - choose between the basic and extended format
   * @param {string} [opts.precision='day'] - truncate output to desired precision: 'years', 'months', or 'days'.
   * @example DateTime.utc(1982, 5, 25).toISODate() //=> '1982-05-25'
   * @example DateTime.utc(1982, 5, 25).toISODate({ format: 'basic' }) //=> '19820525'
   * @example DateTime.utc(1982, 5, 25).toISODate({ precision: 'month' }) //=> '1982-05'
   * @return {string|null}
   */
  toISODate({ format = "extended", precision = "day" } = {}) {
    if (!this.isValid) {
      return null;
    }
    return toISODate(this, format === "extended", normalizeUnit(precision));
  }
  /**
   * Returns an ISO 8601-compliant string representation of this DateTime's week date
   * @example DateTime.utc(1982, 5, 25).toISOWeekDate() //=> '1982-W21-2'
   * @return {string}
   */
  toISOWeekDate() {
    return toTechFormat(this, "kkkk-'W'WW-c");
  }
  /**
   * Returns an ISO 8601-compliant string representation of this DateTime's time component
   * @param {Object} opts - options
   * @param {boolean} [opts.suppressMilliseconds=false] - exclude milliseconds from the format if they're 0
   * @param {boolean} [opts.suppressSeconds=false] - exclude seconds from the format if they're 0
   * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
   * @param {boolean} [opts.extendedZone=true] - add the time zone format extension
   * @param {boolean} [opts.includePrefix=false] - include the `T` prefix
   * @param {string} [opts.format='extended'] - choose between the basic and extended format
   * @param {string} [opts.precision='milliseconds'] - truncate output to desired presicion: 'hours', 'minutes', 'seconds' or 'milliseconds'. When precision and suppressSeconds or suppressMilliseconds are used together, precision sets the maximum unit shown in the output, however seconds or milliseconds will still be suppressed if they are 0.
   * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime() //=> '07:34:19.361Z'
   * @example DateTime.utc().set({ hour: 7, minute: 34, seconds: 0, milliseconds: 0 }).toISOTime({ suppressSeconds: true }) //=> '07:34Z'
   * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ format: 'basic' }) //=> '073419.361Z'
   * @example DateTime.utc().set({ hour: 7, minute: 34 }).toISOTime({ includePrefix: true }) //=> 'T07:34:19.361Z'
   * @example DateTime.utc().set({ hour: 7, minute: 34, second: 56 }).toISOTime({ precision: 'minute' }) //=> '07:34Z'
   * @return {string}
   */
  toISOTime({
    suppressMilliseconds = false,
    suppressSeconds = false,
    includeOffset = true,
    includePrefix = false,
    extendedZone = false,
    format = "extended",
    precision = "milliseconds"
  } = {}) {
    if (!this.isValid) {
      return null;
    }
    precision = normalizeUnit(precision);
    let c = includePrefix && orderedUnits.indexOf(precision) >= 3 ? "T" : "";
    return c + toISOTime(
      this,
      format === "extended",
      suppressSeconds,
      suppressMilliseconds,
      includeOffset,
      extendedZone,
      precision
    );
  }
  /**
   * Returns an RFC 2822-compatible string representation of this DateTime
   * @example DateTime.utc(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 +0000'
   * @example DateTime.local(2014, 7, 13).toRFC2822() //=> 'Sun, 13 Jul 2014 00:00:00 -0400'
   * @return {string}
   */
  toRFC2822() {
    return toTechFormat(this, "EEE, dd LLL yyyy HH:mm:ss ZZZ", false);
  }
  /**
   * Returns a string representation of this DateTime appropriate for use in HTTP headers. The output is always expressed in GMT.
   * Specifically, the string conforms to RFC 1123.
   * @see https://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
   * @example DateTime.utc(2014, 7, 13).toHTTP() //=> 'Sun, 13 Jul 2014 00:00:00 GMT'
   * @example DateTime.utc(2014, 7, 13, 19).toHTTP() //=> 'Sun, 13 Jul 2014 19:00:00 GMT'
   * @return {string}
   */
  toHTTP() {
    return toTechFormat(this.toUTC(), "EEE, dd LLL yyyy HH:mm:ss 'GMT'");
  }
  /**
   * Returns a string representation of this DateTime appropriate for use in SQL Date
   * @example DateTime.utc(2014, 7, 13).toSQLDate() //=> '2014-07-13'
   * @return {string|null}
   */
  toSQLDate() {
    if (!this.isValid) {
      return null;
    }
    return toISODate(this, true);
  }
  /**
   * Returns a string representation of this DateTime appropriate for use in SQL Time
   * @param {Object} opts - options
   * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overrides includeOffset.
   * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
   * @param {boolean} [opts.includeOffsetSpace=true] - include the space between the time and the offset, such as '05:15:16.345 -04:00'
   * @example DateTime.utc().toSQL() //=> '05:15:16.345'
   * @example DateTime.now().toSQL() //=> '05:15:16.345 -04:00'
   * @example DateTime.now().toSQL({ includeOffset: false }) //=> '05:15:16.345'
   * @example DateTime.now().toSQL({ includeZone: false }) //=> '05:15:16.345 America/New_York'
   * @return {string}
   */
  toSQLTime({ includeOffset = true, includeZone = false, includeOffsetSpace = true } = {}) {
    let fmt = "HH:mm:ss.SSS";
    if (includeZone || includeOffset) {
      if (includeOffsetSpace) {
        fmt += " ";
      }
      if (includeZone) {
        fmt += "z";
      } else if (includeOffset) {
        fmt += "ZZ";
      }
    }
    return toTechFormat(this, fmt, true);
  }
  /**
   * Returns a string representation of this DateTime appropriate for use in SQL DateTime
   * @param {Object} opts - options
   * @param {boolean} [opts.includeZone=false] - include the zone, such as 'America/New_York'. Overrides includeOffset.
   * @param {boolean} [opts.includeOffset=true] - include the offset, such as 'Z' or '-04:00'
   * @param {boolean} [opts.includeOffsetSpace=true] - include the space between the time and the offset, such as '05:15:16.345 -04:00'
   * @example DateTime.utc(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 Z'
   * @example DateTime.local(2014, 7, 13).toSQL() //=> '2014-07-13 00:00:00.000 -04:00'
   * @example DateTime.local(2014, 7, 13).toSQL({ includeOffset: false }) //=> '2014-07-13 00:00:00.000'
   * @example DateTime.local(2014, 7, 13).toSQL({ includeZone: true }) //=> '2014-07-13 00:00:00.000 America/New_York'
   * @return {string}
   */
  toSQL(opts = {}) {
    if (!this.isValid) {
      return null;
    }
    return `${this.toSQLDate()} ${this.toSQLTime(opts)}`;
  }
  /**
   * Returns a string representation of this DateTime appropriate for debugging
   * @return {string}
   */
  toString() {
    return this.isValid ? this.toISO() : INVALID;
  }
  /**
   * Returns a string representation of this DateTime appropriate for the REPL.
   * @return {string}
   */
  [Symbol.for("nodejs.util.inspect.custom")]() {
    if (this.isValid) {
      return `DateTime { ts: ${this.toISO()}, zone: ${this.zone.name}, locale: ${this.locale} }`;
    } else {
      return `DateTime { Invalid, reason: ${this.invalidReason} }`;
    }
  }
  /**
   * Returns the epoch milliseconds of this DateTime. Alias of {@link DateTime#toMillis}
   * @return {number}
   */
  valueOf() {
    return this.toMillis();
  }
  /**
   * Returns the epoch milliseconds of this DateTime.
   * @return {number}
   */
  toMillis() {
    return this.isValid ? this.ts : NaN;
  }
  /**
   * Returns the epoch seconds (including milliseconds in the fractional part) of this DateTime.
   * @return {number}
   */
  toSeconds() {
    return this.isValid ? this.ts / 1e3 : NaN;
  }
  /**
   * Returns the epoch seconds (as a whole number) of this DateTime.
   * @return {number}
   */
  toUnixInteger() {
    return this.isValid ? Math.floor(this.ts / 1e3) : NaN;
  }
  /**
   * Returns an ISO 8601 representation of this DateTime appropriate for use in JSON.
   * @return {string}
   */
  toJSON() {
    return this.toISO();
  }
  /**
   * Returns a BSON serializable equivalent to this DateTime.
   * @return {Date}
   */
  toBSON() {
    return this.toJSDate();
  }
  /**
   * Returns a JavaScript object with this DateTime's year, month, day, and so on.
   * @param opts - options for generating the object
   * @param {boolean} [opts.includeConfig=false] - include configuration attributes in the output
   * @example DateTime.now().toObject() //=> { year: 2017, month: 4, day: 22, hour: 20, minute: 49, second: 42, millisecond: 268 }
   * @return {Object}
   */
  toObject(opts = {}) {
    if (!this.isValid) return {};
    const base = { ...this.c };
    if (opts.includeConfig) {
      base.outputCalendar = this.outputCalendar;
      base.numberingSystem = this.loc.numberingSystem;
      base.locale = this.loc.locale;
    }
    return base;
  }
  /**
   * Returns a JavaScript Date equivalent to this DateTime.
   * @return {Date}
   */
  toJSDate() {
    return new Date(this.isValid ? this.ts : NaN);
  }
  // COMPARE
  /**
   * Return the difference between two DateTimes as a Duration.
   * @param {DateTime} otherDateTime - the DateTime to compare this one to
   * @param {string|string[]} [unit=['milliseconds']] - the unit or array of units (such as 'hours' or 'days') to include in the duration.
   * @param {Object} opts - options that affect the creation of the Duration
   * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
   * @example
   * var i1 = DateTime.fromISO('1982-05-25T09:45'),
   *     i2 = DateTime.fromISO('1983-10-14T10:30');
   * i2.diff(i1).toObject() //=> { milliseconds: 43807500000 }
   * i2.diff(i1, 'hours').toObject() //=> { hours: 12168.75 }
   * i2.diff(i1, ['months', 'days']).toObject() //=> { months: 16, days: 19.03125 }
   * i2.diff(i1, ['months', 'days', 'hours']).toObject() //=> { months: 16, days: 19, hours: 0.75 }
   * @return {Duration}
   */
  diff(otherDateTime, unit = "milliseconds", opts = {}) {
    if (!this.isValid || !otherDateTime.isValid) {
      return Duration.invalid("created by diffing an invalid DateTime");
    }
    const durOpts = { locale: this.locale, numberingSystem: this.numberingSystem, ...opts };
    const units = maybeArray(unit).map(Duration.normalizeUnit), otherIsLater = otherDateTime.valueOf() > this.valueOf(), earlier = otherIsLater ? this : otherDateTime, later = otherIsLater ? otherDateTime : this, diffed = diff(earlier, later, units, durOpts);
    return otherIsLater ? diffed.negate() : diffed;
  }
  /**
   * Return the difference between this DateTime and right now.
   * See {@link DateTime#diff}
   * @param {string|string[]} [unit=['milliseconds']] - the unit or units units (such as 'hours' or 'days') to include in the duration
   * @param {Object} opts - options that affect the creation of the Duration
   * @param {string} [opts.conversionAccuracy='casual'] - the conversion system to use
   * @return {Duration}
   */
  diffNow(unit = "milliseconds", opts = {}) {
    return this.diff(DateTime.now(), unit, opts);
  }
  /**
   * Return an Interval spanning between this DateTime and another DateTime
   * @param {DateTime} otherDateTime - the other end point of the Interval
   * @return {Interval|DateTime}
   */
  until(otherDateTime) {
    return this.isValid ? Interval.fromDateTimes(this, otherDateTime) : this;
  }
  /**
   * Return whether this DateTime is in the same unit of time as another DateTime.
   * Higher-order units must also be identical for this function to return `true`.
   * Note that time zones are **ignored** in this comparison, which compares the **local** calendar time. Use {@link DateTime#setZone} to convert one of the dates if needed.
   * @param {DateTime} otherDateTime - the other DateTime
   * @param {string} unit - the unit of time to check sameness on
   * @param {Object} opts - options
   * @param {boolean} [opts.useLocaleWeeks=false] - If true, use weeks based on the locale, i.e. use the locale-dependent start of the week; only the locale of this DateTime is used
   * @example DateTime.now().hasSame(otherDT, 'day'); //~> true if otherDT is in the same current calendar day
   * @return {boolean}
   */
  hasSame(otherDateTime, unit, opts) {
    if (!this.isValid) return false;
    const inputMs = otherDateTime.valueOf();
    const adjustedToZone = this.setZone(otherDateTime.zone, { keepLocalTime: true });
    return adjustedToZone.startOf(unit, opts) <= inputMs && inputMs <= adjustedToZone.endOf(unit, opts);
  }
  /**
   * Equality check
   * Two DateTimes are equal if and only if they represent the same millisecond, have the same zone and location, and are both valid.
   * To compare just the millisecond values, use `+dt1 === +dt2`.
   * @param {DateTime} other - the other DateTime
   * @return {boolean}
   */
  equals(other) {
    return this.isValid && other.isValid && this.valueOf() === other.valueOf() && this.zone.equals(other.zone) && this.loc.equals(other.loc);
  }
  /**
   * Returns a string representation of a this time relative to now, such as "in two days". Can only internationalize if your
   * platform supports Intl.RelativeTimeFormat. Rounds towards zero by default.
   * @param {Object} options - options that affect the output
   * @param {DateTime} [options.base=DateTime.now()] - the DateTime to use as the basis to which this time is compared. Defaults to now.
   * @param {string} [options.style="long"] - the style of units, must be "long", "short", or "narrow"
   * @param {string|string[]} options.unit - use a specific unit or array of units; if omitted, or an array, the method will pick the best unit. Use an array or one of "years", "quarters", "months", "weeks", "days", "hours", "minutes", or "seconds"
   * @param {boolean} [options.round=true] - whether to round the numbers in the output.
   * @param {string} [options.rounding="trunc"] - rounding method to use when rounding the numbers in the output. Can be "trunc" (toward zero), "expand" (away from zero), "round", "floor", or "ceil".
   * @param {number} [options.padding=0] - padding in milliseconds. This allows you to round up the result if it fits inside the threshold. Don't use in combination with {round: false} because the decimal output will include the padding.
   * @param {string} options.locale - override the locale of this DateTime
   * @param {string} options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
   * @example DateTime.now().plus({ days: 1 }).toRelative() //=> "in 1 day"
   * @example DateTime.now().setLocale("es").toRelative({ days: 1 }) //=> "dentro de 1 día"
   * @example DateTime.now().plus({ days: 1 }).toRelative({ locale: "fr" }) //=> "dans 23 heures"
   * @example DateTime.now().minus({ days: 2 }).toRelative() //=> "2 days ago"
   * @example DateTime.now().minus({ days: 2 }).toRelative({ unit: "hours" }) //=> "48 hours ago"
   * @example DateTime.now().minus({ hours: 36 }).toRelative({ round: false }) //=> "1.5 days ago"
   */
  toRelative(options2 = {}) {
    if (!this.isValid) return null;
    const base = options2.base || DateTime.fromObject({}, { zone: this.zone }), padding = options2.padding ? this < base ? -options2.padding : options2.padding : 0;
    let units = ["years", "months", "days", "hours", "minutes", "seconds"];
    let unit = options2.unit;
    if (Array.isArray(options2.unit)) {
      units = options2.unit;
      unit = void 0;
    }
    return diffRelative(base, this.plus(padding), {
      ...options2,
      numeric: "always",
      units,
      unit
    });
  }
  /**
   * Returns a string representation of this date relative to today, such as "yesterday" or "next month".
   * Only internationalizes on platforms that supports Intl.RelativeTimeFormat.
   * @param {Object} options - options that affect the output
   * @param {DateTime} [options.base=DateTime.now()] - the DateTime to use as the basis to which this time is compared. Defaults to now.
   * @param {string} options.locale - override the locale of this DateTime
   * @param {string} options.unit - use a specific unit; if omitted, the method will pick the unit. Use one of "years", "quarters", "months", "weeks", or "days"
   * @param {string} options.numberingSystem - override the numberingSystem of this DateTime. The Intl system may choose not to honor this
   * @example DateTime.now().plus({ days: 1 }).toRelativeCalendar() //=> "tomorrow"
   * @example DateTime.now().setLocale("es").plus({ days: 1 }).toRelative() //=> ""mañana"
   * @example DateTime.now().plus({ days: 1 }).toRelativeCalendar({ locale: "fr" }) //=> "demain"
   * @example DateTime.now().minus({ days: 2 }).toRelativeCalendar() //=> "2 days ago"
   */
  toRelativeCalendar(options2 = {}) {
    if (!this.isValid) return null;
    return diffRelative(options2.base || DateTime.fromObject({}, { zone: this.zone }), this, {
      ...options2,
      numeric: "auto",
      units: ["years", "months", "days"],
      calendary: true
    });
  }
  /**
   * Return the min of several date times
   * @param {...DateTime} dateTimes - the DateTimes from which to choose the minimum
   * @return {DateTime} the min DateTime, or undefined if called with no argument
   */
  static min(...dateTimes) {
    if (!dateTimes.every(DateTime.isDateTime)) {
      throw new InvalidArgumentError("min requires all arguments be DateTimes");
    }
    return bestBy(dateTimes, (i) => i.valueOf(), Math.min);
  }
  /**
   * Return the max of several date times
   * @param {...DateTime} dateTimes - the DateTimes from which to choose the maximum
   * @return {DateTime} the max DateTime, or undefined if called with no argument
   */
  static max(...dateTimes) {
    if (!dateTimes.every(DateTime.isDateTime)) {
      throw new InvalidArgumentError("max requires all arguments be DateTimes");
    }
    return bestBy(dateTimes, (i) => i.valueOf(), Math.max);
  }
  // MISC
  /**
   * Explain how a string would be parsed by fromFormat()
   * @param {string} text - the string to parse
   * @param {string} fmt - the format the string is expected to be in (see description)
   * @param {Object} options - options taken by fromFormat()
   * @return {Object}
   */
  static fromFormatExplain(text, fmt, options2 = {}) {
    const { locale = null, numberingSystem = null } = options2, localeToUse = Locale.fromOpts({
      locale,
      numberingSystem,
      defaultToEN: true
    });
    return explainFromTokens(localeToUse, text, fmt);
  }
  /**
   * @deprecated use fromFormatExplain instead
   */
  static fromStringExplain(text, fmt, options2 = {}) {
    return DateTime.fromFormatExplain(text, fmt, options2);
  }
  /**
   * Build a parser for `fmt` using the given locale. This parser can be passed
   * to {@link DateTime.fromFormatParser} to a parse a date in this format. This
   * can be used to optimize cases where many dates need to be parsed in a
   * specific format.
   *
   * @param {String} fmt - the format the string is expected to be in (see
   * description)
   * @param {Object} options - options used to set locale and numberingSystem
   * for parser
   * @returns {TokenParser} - opaque object to be used
   */
  static buildFormatParser(fmt, options2 = {}) {
    const { locale = null, numberingSystem = null } = options2, localeToUse = Locale.fromOpts({
      locale,
      numberingSystem,
      defaultToEN: true
    });
    return new TokenParser(localeToUse, fmt);
  }
  /**
   * Create a DateTime from an input string and format parser.
   *
   * The format parser must have been created with the same locale as this call.
   *
   * @param {String} text - the string to parse
   * @param {TokenParser} formatParser - parser from {@link DateTime.buildFormatParser}
   * @param {Object} opts - options taken by fromFormat()
   * @returns {DateTime}
   */
  static fromFormatParser(text, formatParser, opts = {}) {
    if (isUndefined(text) || isUndefined(formatParser)) {
      throw new InvalidArgumentError(
        "fromFormatParser requires an input string and a format parser"
      );
    }
    const { locale = null, numberingSystem = null } = opts, localeToUse = Locale.fromOpts({
      locale,
      numberingSystem,
      defaultToEN: true
    });
    if (!localeToUse.equals(formatParser.locale)) {
      throw new InvalidArgumentError(
        `fromFormatParser called with a locale of ${localeToUse}, but the format parser was created for ${formatParser.locale}`
      );
    }
    const { result, zone, specificOffset, invalidReason } = formatParser.explainFromTokens(text);
    if (invalidReason) {
      return DateTime.invalid(invalidReason);
    } else {
      return parseDataToDateTime(
        result,
        zone,
        opts,
        `format ${formatParser.format}`,
        text,
        specificOffset
      );
    }
  }
  // FORMAT PRESETS
  /**
   * {@link DateTime#toLocaleString} format like 10/14/1983
   * @type {Object}
   */
  static get DATE_SHORT() {
    return DATE_SHORT;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Oct 14, 1983'
   * @type {Object}
   */
  static get DATE_MED() {
    return DATE_MED;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Fri, Oct 14, 1983'
   * @type {Object}
   */
  static get DATE_MED_WITH_WEEKDAY() {
    return DATE_MED_WITH_WEEKDAY;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'October 14, 1983'
   * @type {Object}
   */
  static get DATE_FULL() {
    return DATE_FULL;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Tuesday, October 14, 1983'
   * @type {Object}
   */
  static get DATE_HUGE() {
    return DATE_HUGE;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get TIME_SIMPLE() {
    return TIME_SIMPLE;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get TIME_WITH_SECONDS() {
    return TIME_WITH_SECONDS;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23 AM EDT'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get TIME_WITH_SHORT_OFFSET() {
    return TIME_WITH_SHORT_OFFSET;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23 AM Eastern Daylight Time'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get TIME_WITH_LONG_OFFSET() {
    return TIME_WITH_LONG_OFFSET;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30', always 24-hour.
   * @type {Object}
   */
  static get TIME_24_SIMPLE() {
    return TIME_24_SIMPLE;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23', always 24-hour.
   * @type {Object}
   */
  static get TIME_24_WITH_SECONDS() {
    return TIME_24_WITH_SECONDS;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23 EDT', always 24-hour.
   * @type {Object}
   */
  static get TIME_24_WITH_SHORT_OFFSET() {
    return TIME_24_WITH_SHORT_OFFSET;
  }
  /**
   * {@link DateTime#toLocaleString} format like '09:30:23 Eastern Daylight Time', always 24-hour.
   * @type {Object}
   */
  static get TIME_24_WITH_LONG_OFFSET() {
    return TIME_24_WITH_LONG_OFFSET;
  }
  /**
   * {@link DateTime#toLocaleString} format like '10/14/1983, 9:30 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_SHORT() {
    return DATETIME_SHORT;
  }
  /**
   * {@link DateTime#toLocaleString} format like '10/14/1983, 9:30:33 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_SHORT_WITH_SECONDS() {
    return DATETIME_SHORT_WITH_SECONDS;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Oct 14, 1983, 9:30 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_MED() {
    return DATETIME_MED;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Oct 14, 1983, 9:30:33 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_MED_WITH_SECONDS() {
    return DATETIME_MED_WITH_SECONDS;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Fri, 14 Oct 1983, 9:30 AM'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_MED_WITH_WEEKDAY() {
    return DATETIME_MED_WITH_WEEKDAY;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'October 14, 1983, 9:30 AM EDT'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_FULL() {
    return DATETIME_FULL;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'October 14, 1983, 9:30:33 AM EDT'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_FULL_WITH_SECONDS() {
    return DATETIME_FULL_WITH_SECONDS;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Friday, October 14, 1983, 9:30 AM Eastern Daylight Time'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_HUGE() {
    return DATETIME_HUGE;
  }
  /**
   * {@link DateTime#toLocaleString} format like 'Friday, October 14, 1983, 9:30:33 AM Eastern Daylight Time'. Only 12-hour if the locale is.
   * @type {Object}
   */
  static get DATETIME_HUGE_WITH_SECONDS() {
    return DATETIME_HUGE_WITH_SECONDS;
  }
}
function friendlyDateTime(dateTimeish) {
  if (DateTime.isDateTime(dateTimeish)) {
    return dateTimeish;
  } else if (dateTimeish && dateTimeish.valueOf && isNumber(dateTimeish.valueOf())) {
    return DateTime.fromJSDate(dateTimeish);
  } else if (dateTimeish && typeof dateTimeish === "object") {
    return DateTime.fromObject(dateTimeish);
  } else {
    throw new InvalidArgumentError(
      `Unknown datetime argument: ${dateTimeish}, of type ${typeof dateTimeish}`
    );
  }
}
const HOLIDAYS_2026 = [
  "2026-01-01",
  "2026-01-02",
  "2026-01-03",
  // 元旦
  "2026-02-17",
  "2026-02-18",
  "2026-02-19",
  "2026-02-20",
  "2026-02-21",
  "2026-02-22",
  "2026-02-23",
  // 春节
  "2026-04-04",
  "2026-04-05",
  "2026-04-06",
  // 清明
  "2026-05-01",
  "2026-05-02",
  "2026-05-03",
  "2026-05-04",
  "2026-05-05",
  // 劳动节
  "2026-06-14",
  "2026-06-15",
  "2026-06-16",
  // 端午
  "2026-10-01",
  "2026-10-02",
  "2026-10-03",
  "2026-10-04",
  "2026-10-05",
  "2026-10-06",
  "2026-10-07",
  "2026-10-08"
  // 国庆
];
const WORKDAYS_ON_WEEKEND_2026 = [
  "2026-02-15",
  "2026-02-16",
  // 春节调休
  "2026-10-10",
  "2026-10-11"
  // 国庆调休
];
function isTradingDay(date) {
  const dateStr = DateTime.fromJSDate(date).toISODate();
  const dayOfWeek2 = date.getDay();
  if (WORKDAYS_ON_WEEKEND_2026.includes(dateStr)) {
    return true;
  }
  if (dayOfWeek2 === 0 || dayOfWeek2 === 6) {
    return false;
  }
  if (HOLIDAYS_2026.includes(dateStr)) {
    return false;
  }
  return true;
}
function getPreviousTradingDay(currentDate, tradingDaysCount) {
  let count = 0;
  let checkDate = new Date(currentDate);
  while (count < tradingDaysCount) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (isTradingDay(checkDate)) {
      count++;
    }
    if (DateTime.fromJSDate(currentDate).diff(DateTime.fromJSDate(checkDate), "days").days > 365) {
      return null;
    }
  }
  return checkDate;
}
function getNaturalDays(startDate, endDate) {
  const start = DateTime.fromJSDate(startDate);
  const end = DateTime.fromJSDate(endDate);
  return Math.floor(end.diff(start, "days").days);
}
function calculateAnnualReturn(startNav, endNav, naturalDays) {
  if (startNav <= 0 || endNav <= 0) {
    return null;
  }
  if (naturalDays <= 0) {
    return null;
  }
  const ratio = endNav / startNav;
  const annualReturn = Math.pow(ratio, 365 / naturalDays) - 1;
  return Math.round(annualReturn * 1e6) / 1e6;
}
function calculateMoneyFundAnnual(totalIncome, naturalDays) {
  if (naturalDays <= 0) {
    return null;
  }
  const avgIncome = totalIncome / naturalDays;
  const annualReturn = avgIncome * 365 / 1e4;
  return Math.round(annualReturn * 1e6) / 1e6;
}
function isEstimateValue(naturalDays) {
  return naturalDays < 7;
}
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
let client = null;
let redisAvailable = null;
function getRedisClient() {
  if (redisAvailable === false) return null;
  if (!client) {
    try {
      client = new Redis__default.default(REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        retryStrategy: () => null
        // 不自动重试
      });
      client.on("error", () => {
        redisAvailable = false;
      });
    } catch {
      redisAvailable = false;
      return null;
    }
  }
  return client;
}
async function ensureRedisAvailable() {
  if (redisAvailable === false) return false;
  const redis = getRedisClient();
  if (!redis) {
    redisAvailable = false;
    return false;
  }
  try {
    if (redis.status === "wait" || redis.status === "connect") {
      await redis.connect();
    }
    await redis.ping();
    redisAvailable = true;
    return true;
  } catch {
    redisAvailable = false;
    return false;
  }
}
function markRedisUnavailable() {
  redisAvailable = false;
}
async function acquireLock(key, ttl) {
  if (!await ensureRedisAvailable()) return false;
  try {
    const redis = client;
    const result = await redis.set(key, "locked", "PX", ttl * 1e3, "NX");
    return result === "OK";
  } catch {
    redisAvailable = false;
    return false;
  }
}
async function releaseLock(key) {
  if (!await ensureRedisAvailable()) return;
  try {
    const redis = client;
    await redis.del(key);
  } catch {
    redisAvailable = false;
  }
}
function successResponse(data, msg = "success") {
  return {
    code: 200,
    msg,
    data
  };
}
function errorResponse(code, msg) {
  return {
    code,
    msg,
    data: null
  };
}
function paginatedResponse(data, page, pageSize, total) {
  return successResponse({
    list: data,
    page,
    pageSize,
    total
  });
}
const product$1 = ({ strapi }) => ({
  /**
   * 获取产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 100, productType, riskLevel } = ctx.query;
      const filters = { status: true };
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;
      const result = await strapi.service("plugin::zhao-wealth.product").findList(filters, page, pageSize);
      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 获取产品详情（C端）
   */
  async detail(ctx) {
    try {
      const { id } = ctx.params;
      const product2 = await strapi.service("plugin::zhao-wealth.product").findOne(Number(id));
      if (!product2) {
        ctx.body = errorResponse(404, "产品不存在");
        return;
      }
      ctx.body = successResponse(product2);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  }
});
const nav = ({ strapi }) => ({
  /**
   * 获取净值时序数据（C端）
   */
  async timeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end }
        },
        limit: Math.min(pageSize, 500),
        offset: (page - 1) * pageSize,
        orderBy: { navDate: "desc" }
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-nav").count({
        where: {
          product: Number(id),
          navDate: { $gte: start, $lte: end }
        }
      });
      const list = navs.map((n2) => ({
        date: n2.navDate,
        unitNav: n2.unitNav,
        accNav: n2.accNav
      }));
      ctx.body = paginatedResponse(list, page, pageSize, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值时序查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  }
});
const annual = ({ strapi }) => ({
  /**
   * 获取年化快照时序数据（C端）
   */
  async snapshotTimeSeries(ctx) {
    try {
      const { id } = ctx.params;
      const { startDate, endDate, page = 1, pageSize = 100 } = ctx.query;
      const start = startDate ? new Date(startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1e3);
      const end = endDate ? new Date(endDate) : /* @__PURE__ */ new Date();
      const result = await strapi.service("plugin::zhao-wealth.annual-snapshot").getSnapshotTimeSeries(
        Number(id),
        start,
        end,
        page,
        pageSize
      );
      const list = result.list.map((s2) => ({
        date: s2.snapshotDate,
        annual1d: s2.annual1d,
        annual3d: s2.annual3d,
        annual7d: s2.annual7d,
        annual2w: s2.annual2w,
        annual1m: s2.annual1m,
        annual3m: s2.annual3m,
        annual6m: s2.annual6m,
        annual1y: s2.annual1y,
        isEstimate: s2.isEstimate
      }));
      ctx.body = paginatedResponse(list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年化快照查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 获取年度收益列表（C端）
   */
  async yearlyReturns(ctx) {
    try {
      const { id } = ctx.params;
      const returns = await strapi.service("plugin::zhao-wealth.annual-snapshot").getYearlyReturns(Number(id));
      ctx.body = successResponse(returns);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 年度收益查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  }
});
const recommend = ({ strapi }) => ({
  /**
   * 获取推荐产品列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 10 } = ctx.query;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;
      if (!userId || !channelId) {
        ctx.body = errorResponse(403, "需要登录");
        return;
      }
      const recommendations = await strapi.service("plugin::zhao-wealth.recommend-service").getRecommendations(
        userId,
        channelId,
        pageSize
      );
      ctx.body = paginatedResponse(recommendations, page, pageSize, recommendations.length);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  }
});
const customerProduct$1 = ({ strapi }) => ({
  /**
   * 获取用户自选列表（C端）
   */
  async list(ctx) {
    try {
      const { page = 1, pageSize = 20 } = ctx.query;
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.body = errorResponse(403, "需要登录");
        return;
      }
      const result = await strapi.service("plugin::zhao-wealth.customer-product").getUserProducts(userId, page, pageSize);
      ctx.body = paginatedResponse(result.list, result.page, result.pageSize, result.total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 自选列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 添加自选（C端）
   */
  async add(ctx) {
    try {
      const { productId } = ctx.request.body;
      const userId = ctx.state.user?.id;
      const channelId = ctx.state.channel?.id;
      if (!userId || !channelId) {
        ctx.body = errorResponse(403, "需要登录");
        return;
      }
      const result = await strapi.service("plugin::zhao-wealth.customer-product").addProduct(userId, productId, channelId);
      ctx.body = successResponse(result, "添加成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 添加自选失败: ${error.message}`);
      ctx.body = errorResponse(500, "添加失败");
    }
  },
  /**
   * 删除自选（C端）
   */
  async remove(ctx) {
    try {
      const { id } = ctx.params;
      const userId = ctx.state.user?.id;
      if (!userId) {
        ctx.body = errorResponse(403, "需要登录");
        return;
      }
      const result = await strapi.service("plugin::zhao-wealth.customer-product").removeProduct(userId, Number(id));
      if (!result) {
        ctx.body = errorResponse(404, "自选不存在或无权限");
        return;
      }
      ctx.body = successResponse(result, "删除成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 删除自选失败: ${error.message}`);
      ctx.body = errorResponse(500, "删除失败");
    }
  }
});
let collectQueue = null;
let calculateQueue = null;
let recalculateQueue = null;
async function setupQueues(strapi) {
  const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";
  const url = new URL(redisUrl);
  const redisConfig = {
    host: url.hostname,
    port: parseInt(url.port) || 6379,
    password: url.password || void 0,
    maxRetriesPerRequest: 1
  };
  const available = await ensureRedisAvailable();
  if (!available) {
    markRedisUnavailable();
    strapi.log.warn("[zhao-wealth] Redis 不可用，队列功能降级（API 与手动操作仍可用）");
    return;
  }
  try {
    collectQueue = new Queue__default.default("wealth-collect", {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "fixed", delay: 5 * 60 * 1e3 },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    calculateQueue = new Queue__default.default("wealth-calculate", {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 2,
        backoff: { type: "fixed", delay: 1 * 60 * 1e3 },
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    recalculateQueue = new Queue__default.default("wealth-recalculate", {
      redis: redisConfig,
      defaultJobOptions: {
        attempts: 1,
        removeOnComplete: true,
        removeOnFail: false
      }
    });
    strapi.log.info("[zhao-wealth] Bull队列初始化完成");
  } catch (error) {
    markRedisUnavailable();
    strapi.log.warn(`[zhao-wealth] Bull队列初始化失败，队列功能将不可用: ${error.message}`);
  }
}
function getCollectQueue() {
  return collectQueue;
}
function getCalculateQueue() {
  return calculateQueue;
}
function getRecalculateQueue() {
  return recalculateQueue;
}
const collect = ({ strapi }) => ({
  /**
   * 触发采集（后台）
   */
  async trigger(ctx) {
    try {
      const { productId } = ctx.request.body;
      const queue = getCollectQueue();
      if (!queue) {
        ctx.status = 503;
        ctx.body = errorResponse(503, "采集服务暂不可用（Redis 未就绪）");
        return;
      }
      if (productId) {
        queue.add("collect-single", { productId });
        ctx.body = successResponse({ productId }, "单产品采集任务已触发");
      } else {
        queue.add("collect-all", {});
        ctx.body = successResponse({}, "全量采集任务已触发");
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发采集失败: ${error.message}`);
      ctx.body = errorResponse(500, "触发失败");
    }
  },
  /**
   * 查询采集状态（后台）
   */
  async status(ctx) {
    try {
      const { productId } = ctx.query;
      if (productId) {
        const config = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findOne({
          where: { product: Number(productId) }
        });
        ctx.body = successResponse(config);
      } else {
        const configs = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findMany({
          populate: ["product"]
        });
        ctx.body = successResponse(configs);
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询采集状态失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 触发重算（后台）
   */
  async recalculate(ctx) {
    try {
      const { productId, startDate, endDate } = ctx.request.body;
      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();
      if (productId && startDate && endDate) {
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, "计算服务暂不可用（Redis 未就绪）");
          return;
        }
        queue.add("recalculate-range", { productId, startDate, endDate });
        ctx.body = successResponse({ productId }, "指定范围重算任务已触发");
      } else if (productId) {
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, "计算服务暂不可用（Redis 未就绪）");
          return;
        }
        queue.add("recalculate-product", { productId });
        ctx.body = successResponse({ productId }, "单产品重算任务已触发");
      } else {
        if (!recalcQueue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, "计算服务暂不可用（Redis 未就绪）");
          return;
        }
        recalcQueue.add("recalculate-all", {});
        ctx.body = successResponse({}, "全量重算任务已触发");
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发重算失败: ${error.message}`);
      ctx.body = errorResponse(500, "触发失败");
    }
  }
});
const adminApi$1 = ({ strapi }) => ({
  // ===== 公司管理 =====
  async companiesList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const companies = await strapi.db.query("plugin::zhao-wealth.wealth-company").findMany({
        limit,
        offset: offset2,
        orderBy: { createdAt: "desc" }
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-company").count();
      ctx.body = paginatedResponse(companies, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async companyDetail(ctx) {
    try {
      const { id } = ctx.params;
      const company = await strapi.db.query("plugin::zhao-wealth.wealth-company").findOne({
        where: { id: Number(id) }
      });
      if (!company) {
        ctx.body = errorResponse(404, "公司不存在");
        return;
      }
      ctx.body = successResponse(company);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async companyCreate(ctx) {
    try {
      const data = ctx.request.body;
      const company = await strapi.db.query("plugin::zhao-wealth.wealth-company").create({ data });
      ctx.body = successResponse(company, "创建成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司创建失败: ${error.message}`);
      ctx.body = errorResponse(500, "创建失败");
    }
  },
  async companyUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const company = await strapi.db.query("plugin::zhao-wealth.wealth-company").update({
        where: { id: Number(id) },
        data
      });
      ctx.body = successResponse(company, "更新成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司更新失败: ${error.message}`);
      ctx.body = errorResponse(500, "更新失败");
    }
  },
  async companyDelete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.db.query("plugin::zhao-wealth.wealth-company").delete({
        where: { id: Number(id) }
      });
      ctx.body = successResponse(null, "删除成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 公司删除失败: ${error.message}`);
      ctx.body = errorResponse(500, "删除失败");
    }
  },
  // ===== 产品管理 =====
  async productsList(ctx) {
    try {
      const { page = 1, pageSize = 100, productType, riskLevel } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const filters = {};
      if (productType) filters.productType = productType;
      if (riskLevel) filters.riskLevel = riskLevel;
      const products = await strapi.db.query("plugin::zhao-wealth.wealth-product").findMany({
        where: filters,
        limit,
        offset: offset2,
        orderBy: { createdAt: "desc" },
        populate: ["company"]
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-product").count({ where: filters });
      ctx.body = paginatedResponse(products, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async productDetail(ctx) {
    try {
      const { id } = ctx.params;
      const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
        where: { id: Number(id) },
        populate: ["company"]
      });
      if (!product2) {
        ctx.body = errorResponse(404, "产品不存在");
        return;
      }
      const latestNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: { product: Number(id) },
        orderBy: { navDate: "desc" }
      });
      ctx.body = successResponse({ ...product2, latestNav });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品详情查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async productCreate(ctx) {
    try {
      const data = ctx.request.body;
      const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").create({ data });
      await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").create({
        data: {
          product: product2.id,
          collectMethod: "web-crawler",
          collectStatus: "pending"
        }
      });
      ctx.body = successResponse(product2, "创建成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品创建失败: ${error.message}`);
      ctx.body = errorResponse(500, "创建失败");
    }
  },
  async productUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").update({
        where: { id: Number(id) },
        data
      });
      ctx.body = successResponse(product2, "更新成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品更新失败: ${error.message}`);
      ctx.body = errorResponse(500, "更新失败");
    }
  },
  async productDelete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.db.query("plugin::zhao-wealth.wealth-nav").deleteMany({ where: { product: Number(id) } });
      await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").deleteMany({ where: { product: Number(id) } });
      await strapi.db.query("plugin::zhao-wealth.wealth-yearly-return").deleteMany({ where: { product: Number(id) } });
      await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").delete({ where: { product: Number(id) } });
      await strapi.db.query("plugin::zhao-wealth.wealth-product").delete({ where: { id: Number(id) } });
      ctx.body = successResponse(null, "删除成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品删除失败: ${error.message}`);
      ctx.body = errorResponse(500, "删除失败");
    }
  },
  // ===== 采集配置 =====
  async collectConfigsList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const configs = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findMany({
        limit,
        offset: offset2,
        populate: ["product"]
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count();
      ctx.body = paginatedResponse(configs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集配置列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async collectConfigUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const config = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").update({
        where: { id: Number(id) },
        data
      });
      ctx.body = successResponse(config, "更新成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集配置更新失败: ${error.message}`);
      ctx.body = errorResponse(500, "更新失败");
    }
  },
  // ===== 净值管理 =====
  async navDataList(ctx) {
    try {
      const { id } = ctx.params;
      const { page = 1, pageSize = 100, startDate, endDate } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const filters = { product: Number(id) };
      if (startDate && endDate) {
        filters.navDate = { $gte: startDate, $lte: endDate };
      }
      const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
        where: filters,
        limit,
        offset: offset2,
        orderBy: { navDate: "desc" }
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-nav").count({ where: filters });
      ctx.body = paginatedResponse(navs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async navDataCreate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const existing = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: { product: Number(id), navDate: data.navDate }
      });
      if (existing) {
        ctx.body = errorResponse(400, "该日期净值已存在");
        return;
      }
      const nav2 = await strapi.db.query("plugin::zhao-wealth.wealth-nav").create({
        data: { ...data, product: Number(id) }
      });
      ctx.body = successResponse(nav2, "创建成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据创建失败: ${error.message}`);
      ctx.body = errorResponse(500, "创建失败");
    }
  },
  async navDataUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const nav2 = await strapi.db.query("plugin::zhao-wealth.wealth-nav").update({
        where: { id: Number(id) },
        data
      });
      ctx.body = successResponse(nav2, "更新成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 净值数据更新失败: ${error.message}`);
      ctx.body = errorResponse(500, "更新失败");
    }
  },
  // ===== 推荐配置 =====
  async recommendConfigsList(ctx) {
    try {
      const { page = 1, pageSize = 100 } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const configs = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").findMany({
        limit,
        offset: offset2,
        populate: ["product"],
        orderBy: { recommendOrder: "asc" }
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").count();
      ctx.body = paginatedResponse(configs, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async recommendConfigCreate(ctx) {
    try {
      const data = ctx.request.body;
      const existing = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").findOne({
        where: { product: data.product }
      });
      if (existing) {
        ctx.body = errorResponse(400, "该产品已有推荐配置");
        return;
      }
      const config = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").create({ data });
      ctx.body = successResponse(config, "创建成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置创建失败: ${error.message}`);
      ctx.body = errorResponse(500, "创建失败");
    }
  },
  async recommendConfigUpdate(ctx) {
    try {
      const { id } = ctx.params;
      const data = ctx.request.body;
      const config = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").update({
        where: { id: Number(id) },
        data
      });
      ctx.body = successResponse(config, "更新成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置更新失败: ${error.message}`);
      ctx.body = errorResponse(500, "更新失败");
    }
  },
  async recommendConfigDelete(ctx) {
    try {
      const { id } = ctx.params;
      await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").delete({
        where: { id: Number(id) }
      });
      ctx.body = successResponse(null, "删除成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 推荐配置删除失败: ${error.message}`);
      ctx.body = errorResponse(500, "删除失败");
    }
  },
  // ===== 客户自选 =====
  async customerProductsList(ctx) {
    try {
      const { page = 1, pageSize = 100, channelId } = ctx.query;
      const limit = Math.min(pageSize, 500);
      const offset2 = (page - 1) * limit;
      const filters = {};
      if (channelId) filters.channel = Number(channelId);
      const customerProducts = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").findMany({
        where: filters,
        limit,
        offset: offset2,
        populate: ["user", "product", "channel"],
        orderBy: { followTime: "desc" }
      });
      const total = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").count({ where: filters });
      ctx.body = paginatedResponse(customerProducts, page, limit, total);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 客户自选列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  // ===== 统计 =====
  async stats(ctx) {
    try {
      const productCount = await strapi.db.query("plugin::zhao-wealth.wealth-product").count();
      const companyCount = await strapi.db.query("plugin::zhao-wealth.wealth-company").count();
      const collectPending = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "pending" } });
      const collectSuccess = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "success" } });
      const collectFailed = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "failed" } });
      ctx.body = successResponse({
        productCount,
        companyCount,
        collectPending,
        collectSuccess,
        collectFailed
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 统计查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  // ===== 仪表盘聚合（新）=====
  async statsOverview(ctx) {
    try {
      const result = await strapi.plugin("zhao-wealth").service("stats").getOverview();
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 概览统计失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  async statsAnomalies(ctx) {
    try {
      const { limit = 10 } = ctx.query;
      const result = await strapi.plugin("zhao-wealth").service("stats").getAnomalies(Number(limit));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 异常列表查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  // ===== 采集与校验 =====
  async collect(ctx) {
    try {
      const { source, query } = ctx.request.body;
      if (!source || !query) {
        ctx.body = errorResponse(400, "缺少 source 或 query 参数");
        return;
      }
      const { getCollector: getCollector2, getChinawealthCollector } = require("../collectors/collector-factory");
      const collector = getCollector2(source);
      if (!collector) {
        ctx.body = errorResponse(400, `不支持的数据源: ${source}`);
        return;
      }
      const sourceData = await collector.collectProductInfo(query);
      if (!sourceData) {
        ctx.body = errorResponse(404, "未找到匹配产品");
        return;
      }
      let officialData = null;
      let verification = { status: "no_register_code", matchScore: 0, differences: [] };
      if (sourceData.registerCode) {
        try {
          const cwCollector = getChinawealthCollector();
          officialData = await cwCollector.collectByRegisterCode(sourceData.registerCode);
          if (officialData) {
            verification = this.compareData(sourceData, officialData);
          } else {
            verification = { status: "not_found_on_official", matchScore: 0, differences: [] };
          }
        } catch (error) {
          strapi.log.warn(`[zhao-wealth] 中国理财网校验失败: ${error.message}`);
          verification = { status: "verification_failed", matchScore: 0, differences: [], error: error.message };
        }
      }
      ctx.body = successResponse({
        sourceData,
        officialData,
        verification
      });
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集失败: ${error.message}`);
      ctx.body = errorResponse(500, `采集失败: ${error.message}`);
    }
  },
  async collectConfirm(ctx) {
    try {
      const data = ctx.request.body;
      const existing = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
        where: { productCode: data.productCode }
      });
      if (existing) {
        ctx.body = errorResponse(400, `产品代码 ${data.productCode} 已存在`);
        return;
      }
      const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").create({
        data: {
          productCode: data.productCode,
          productName: data.productName,
          productType: data.productType,
          registerCode: data.registerCode || null,
          riskLevel: data.riskLevel || "R2",
          termType: data.termType || null,
          issueDate: data.issueDate || null,
          maturityDate: data.maturityDate || null,
          benchmark: data.benchmark || null,
          remark: data.remark || null,
          company: data.company || null,
          recommendEnabled: data.recommendEnabled ?? false,
          status: data.status ?? true
        }
      });
      await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").create({
        data: {
          product: product2.id,
          collectMethod: "web-crawler",
          collectStatus: "pending"
        }
      });
      ctx.body = successResponse(product2, "采集入库成功");
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 采集入库失败: ${error.message}`);
      ctx.body = errorResponse(500, `入库失败: ${error.message}`);
    }
  },
  /**
   * 对比双源数据，返回差异列表
   */
  compareData(sourceData, officialData) {
    const differences = [];
    if (sourceData.productName && officialData.productName) {
      if (!officialData.productName.includes(sourceData.productName) && !sourceData.productName.includes(officialData.productName)) {
        differences.push({
          field: "productName",
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: "warning",
          description: "产品名称差异较大，请确认是否为同一产品"
        });
      } else if (sourceData.productName !== officialData.productName) {
        differences.push({
          field: "productName",
          sourceValue: sourceData.productName,
          officialValue: officialData.productName,
          severity: "info",
          description: "官网简称 vs 理财网全称"
        });
      }
    }
    if (sourceData.registerCode && officialData.registerCode && sourceData.registerCode !== officialData.registerCode) {
      differences.push({
        field: "registerCode",
        sourceValue: sourceData.registerCode,
        officialValue: officialData.registerCode,
        severity: "error",
        description: "登记编码不匹配，请确认是否为同一产品"
      });
    }
    if (sourceData.riskLevel && officialData.riskLevel && sourceData.riskLevel !== officialData.riskLevel) {
      differences.push({
        field: "riskLevel",
        sourceValue: sourceData.riskLevelRaw || sourceData.riskLevel,
        officialValue: officialData.riskLevelRaw || officialData.riskLevel,
        severity: "warning",
        description: "风险等级不一致"
      });
    }
    if (sourceData.termType && officialData.termType && sourceData.termType !== officialData.termType) {
      differences.push({
        field: "termType",
        sourceValue: sourceData.termTypeRaw || sourceData.termType,
        officialValue: officialData.termTypeRaw || officialData.termType,
        severity: "info",
        description: "期限类型表述不同"
      });
    }
    if (sourceData.productType && officialData.productType && sourceData.productType !== officialData.productType) {
      differences.push({
        field: "productType",
        sourceValue: sourceData.productTypeRaw || sourceData.productType,
        officialValue: officialData.productTypeRaw || officialData.productType,
        severity: "warning",
        description: "投资性质不一致"
      });
    }
    const matchScore = differences.length === 0 ? 1 : differences.some((d) => d.severity === "error") ? 0.3 : 0.8;
    const status = matchScore === 1 ? "full_match" : matchScore >= 0.8 ? "partial_match" : "mismatch";
    return { status, matchScore, differences };
  }
});
const riskMetric = ({ strapi }) => ({
  /**
   * C 端查询：获取产品的风险指标
   * GET /v1/wealth/products/:id/risk-metrics?period=1m,3m,6m,1y
   */
  async getMetrics(ctx) {
    try {
      const { id } = ctx.params;
      const periodQuery = ctx.query.period;
      const periods = periodQuery ? periodQuery.split(",").map((p) => p.trim()) : ["m1", "m3", "m6", "y1"];
      const validPeriods = ["m1", "m3", "m6", "y1"];
      const invalidPeriods = periods.filter((p) => !validPeriods.includes(p));
      if (invalidPeriods.length > 0) {
        ctx.status = 400;
        ctx.body = errorResponse(400, `无效的周期: ${invalidPeriods.join(", ")}`);
        return;
      }
      const result = {};
      for (const period of periods) {
        const metricNames = ["volatility", "maxDrawdown", "sharpe", "rankPercentile"];
        const periodData = {};
        for (const metricName of metricNames) {
          const records = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
            where: {
              product: Number(id),
              period,
              metricName
            },
            orderBy: { snapshotDate: "desc" },
            limit: 1
          });
          periodData[metricName] = records.length > 0 ? records[0].metricValue : null;
        }
        result[period] = periodData;
      }
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 查询风险指标失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 后台触发：重算风险指标
   * POST /wealth-admin/v1/recalculate-risk-metric
   * body: { productId?, type: 'risk-metric' | 'all' }
   */
  async recalculate(ctx) {
    try {
      const { productId, type } = ctx.request.body;
      if (type !== "risk-metric" && type !== "all") {
        ctx.status = 400;
        ctx.body = errorResponse(400, "type 必须为 'risk-metric' 或 'all'");
        return;
      }
      const queue = getCalculateQueue();
      const recalcQueue = getRecalculateQueue();
      if (productId) {
        if (!queue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, "计算服务暂不可用（Redis 未就绪）");
          return;
        }
        queue.add("recalculate-risk-metric-product", { productId });
        ctx.body = successResponse({ productId }, "单产品风险指标重算任务已触发");
      } else {
        if (!recalcQueue) {
          ctx.status = 503;
          ctx.body = errorResponse(503, "计算服务暂不可用（Redis 未就绪）");
          return;
        }
        recalcQueue.add("recalculate-all-risk-metrics", {});
        ctx.body = successResponse({}, "全量风险指标重算任务已触发");
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 触发风险指标重算失败: ${error.message}`);
      ctx.body = errorResponse(500, "触发失败");
    }
  },
  /**
   * 指标中心：聚合查询
   * GET /wealth-admin/v1/risk-metrics/admin/aggregate?productId=1&period=m1
   */
  async adminAggregate(ctx) {
    try {
      const { productId, period } = ctx.query;
      if (!productId || !period) {
        ctx.status = 400;
        ctx.body = errorResponse(400, "productId 和 period 必填");
        return;
      }
      const validPeriods = ["m1", "m3", "m6", "y1"];
      if (!validPeriods.includes(period)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, "无效的 period");
        return;
      }
      const result = await strapi.plugin("zhao-wealth").service("risk-metric").adminAggregate(Number(productId), period);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标聚合查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 指标中心：历史趋势
   * GET /wealth-admin/v1/risk-metrics/admin/trend?productId=1
   */
  async adminTrend(ctx) {
    try {
      const { productId } = ctx.query;
      if (!productId) {
        ctx.status = 400;
        ctx.body = errorResponse(400, "productId 必填");
        return;
      }
      const result = await strapi.plugin("zhao-wealth").service("risk-metric").adminTrend(Number(productId));
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 指标趋势查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  },
  /**
   * 指标中心：同类对比
   * GET /wealth-admin/v1/risk-metrics/admin/peers?period=m1&metricName=volatility
   */
  async adminPeers(ctx) {
    try {
      const { period, metricName, limit } = ctx.query;
      if (!period || !metricName) {
        ctx.status = 400;
        ctx.body = errorResponse(400, "period 和 metricName 必填");
        return;
      }
      const validPeriods = ["m1", "m3", "m6", "y1"];
      const validMetrics = ["volatility", "maxDrawdown", "sharpe", "rankPercentile"];
      if (!validPeriods.includes(period) || !validMetrics.includes(metricName)) {
        ctx.status = 400;
        ctx.body = errorResponse(400, "无效的 period 或 metricName");
        return;
      }
      const result = await strapi.plugin("zhao-wealth").service("risk-metric").adminPeers(period, metricName, Number(limit) || 50);
      ctx.body = successResponse(result);
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 同类对比查询失败: ${error.message}`);
      ctx.body = errorResponse(500, "查询失败");
    }
  }
});
const controllers = {
  product: product$1,
  nav,
  annual,
  recommend,
  "customer-product": customerProduct$1,
  collect,
  "admin-api": adminApi$1,
  "risk-metric": riskMetric
};
const contentApi = () => ({
  type: "content-api",
  routes: [
    {
      method: "GET",
      path: "/v1/wealth/products",
      handler: "product.list",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/products/:id",
      handler: "product.detail",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/products/:id/nav",
      handler: "nav.timeSeries",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/products/:id/annual-snapshot",
      handler: "annual.snapshotTimeSeries",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/products/:id/yearly-return",
      handler: "annual.yearlyReturns",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/recommend",
      handler: "recommend.list",
      config: {
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/customer-products",
      handler: "customer-product.list",
      config: {
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    },
    {
      method: "POST",
      path: "/v1/wealth/customer-products",
      handler: "customer-product.add",
      config: {
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    },
    {
      method: "DELETE",
      path: "/v1/wealth/customer-products/:id",
      handler: "customer-product.remove",
      config: {
        policies: ["plugin::zhao-auth.is-authenticated"]
      }
    },
    {
      method: "GET",
      path: "/v1/wealth/products/:id/risk-metrics",
      handler: "risk-metric.getMetrics",
      config: {
        policies: ["plugin::zhao-auth.has-channel-access", "plugin::zhao-auth.has-tenant-access"]
      }
    }
  ]
});
const adminApi = () => ({
  type: "admin",
  routes: [
    {
      method: "GET",
      path: "/companies",
      handler: "admin-api.companiesList"
    },
    {
      method: "GET",
      path: "/companies/:id",
      handler: "admin-api.companyDetail"
    },
    {
      method: "POST",
      path: "/companies",
      handler: "admin-api.companyCreate"
    },
    {
      method: "PUT",
      path: "/companies/:id",
      handler: "admin-api.companyUpdate"
    },
    {
      method: "DELETE",
      path: "/companies/:id",
      handler: "admin-api.companyDelete"
    },
    {
      method: "GET",
      path: "/products",
      handler: "admin-api.productsList"
    },
    {
      method: "GET",
      path: "/products/:id",
      handler: "admin-api.productDetail"
    },
    {
      method: "POST",
      path: "/products",
      handler: "admin-api.productCreate"
    },
    {
      method: "PUT",
      path: "/products/:id",
      handler: "admin-api.productUpdate"
    },
    {
      method: "DELETE",
      path: "/products/:id",
      handler: "admin-api.productDelete"
    },
    {
      method: "GET",
      path: "/collect-configs",
      handler: "admin-api.collectConfigsList"
    },
    {
      method: "PUT",
      path: "/collect-configs/:id",
      handler: "admin-api.collectConfigUpdate"
    },
    {
      method: "POST",
      path: "/collect/trigger",
      handler: "collect.trigger"
    },
    {
      method: "GET",
      path: "/collect/status",
      handler: "collect.status"
    },
    {
      method: "GET",
      path: "/products/:id/nav",
      handler: "admin-api.navDataList"
    },
    {
      method: "POST",
      path: "/products/:id/nav",
      handler: "admin-api.navDataCreate"
    },
    {
      method: "PUT",
      path: "/nav/:id",
      handler: "admin-api.navDataUpdate"
    },
    {
      method: "POST",
      path: "/recalculate",
      handler: "collect.recalculate"
    },
    {
      method: "GET",
      path: "/recommend-configs",
      handler: "admin-api.recommendConfigsList"
    },
    {
      method: "POST",
      path: "/recommend-configs",
      handler: "admin-api.recommendConfigCreate"
    },
    {
      method: "PUT",
      path: "/recommend-configs/:id",
      handler: "admin-api.recommendConfigUpdate"
    },
    {
      method: "DELETE",
      path: "/recommend-configs/:id",
      handler: "admin-api.recommendConfigDelete"
    },
    {
      method: "GET",
      path: "/customer-products",
      handler: "admin-api.customerProductsList"
    },
    {
      method: "GET",
      path: "/stats",
      handler: "admin-api.stats"
    },
    {
      method: "POST",
      path: "/recalculate-risk-metric",
      handler: "risk-metric.recalculate"
    },
    {
      method: "GET",
      path: "/stats/overview",
      handler: "admin-api.statsOverview"
    },
    {
      method: "GET",
      path: "/stats/anomalies",
      handler: "admin-api.statsAnomalies"
    },
    {
      method: "POST",
      path: "/products/collect",
      handler: "admin-api.collect"
    },
    {
      method: "POST",
      path: "/products/collect/confirm",
      handler: "admin-api.collectConfirm"
    },
    {
      method: "GET",
      path: "/risk-metrics/admin/aggregate",
      handler: "risk-metric.adminAggregate"
    },
    {
      method: "GET",
      path: "/risk-metrics/admin/trend",
      handler: "risk-metric.adminTrend"
    },
    {
      method: "GET",
      path: "/risk-metrics/admin/peers",
      handler: "risk-metric.adminPeers"
    }
  ]
});
const routes = {
  "content-api": {
    type: "content-api",
    routes: contentApi().routes
  },
  "admin-api": {
    type: "admin",
    routes: adminApi().routes
  }
};
const product = ({ strapi }) => ({
  /**
   * 获取产品列表
   */
  async findList(filters, page = 1, pageSize = 100) {
    const limit = Math.min(pageSize, 500);
    const offset2 = (page - 1) * limit;
    const products = await strapi.db.query("plugin::zhao-wealth.wealth-product").findMany({
      where: filters,
      limit,
      offset: offset2,
      populate: ["company"]
    });
    const total = await strapi.db.query("plugin::zhao-wealth.wealth-product").count({
      where: filters
    });
    return { list: products, page, pageSize: limit, total };
  },
  /**
   * 获取产品详情
   */
  async findOne(id) {
    const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
      where: { id },
      populate: ["company"]
    });
    const latestNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
      where: { product: id },
      orderBy: { navDate: "desc" }
    });
    return {
      ...product2,
      latestNav
    };
  },
  /**
   * 创建产品
   */
  async create(data) {
    return strapi.db.query("plugin::zhao-wealth.wealth-product").create({ data });
  },
  /**
   * 更新产品
   */
  async update(id, data) {
    return strapi.db.query("plugin::zhao-wealth.wealth-product").update({
      where: { id },
      data
    });
  },
  /**
   * 删除产品
   */
  async delete(id) {
    return strapi.db.query("plugin::zhao-wealth.wealth-product").delete({
      where: { id }
    });
  }
});
const navCalculator = ({ strapi }) => ({
  /**
   * 计算单个产品的年化快照
   */
  async calculateSnapshot(productId, snapshotDate) {
    const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
      where: { id: productId }
    });
    if (!product2) {
      strapi.log.warn(`[zhao-wealth] 产品不存在: ${productId}`);
      return null;
    }
    const isMoneyFund = product2.productType === "money-fund";
    if (isMoneyFund) {
      return await this.calculateMoneyFundSnapshot(productId, snapshotDate);
    } else {
      return await this.calculateNavSnapshot(productId, snapshotDate);
    }
  },
  /**
   * 净值复利年化快照计算（理财/普通基金）
   */
  async calculateNavSnapshot(productId, snapshotDate) {
    const periods = [
      { field: "annual1d", days: 1 },
      { field: "annual3d", days: 3 },
      { field: "annual7d", days: 7 },
      { field: "annual2w", days: 14 },
      { field: "annual1m", days: 22 },
      { field: "annual3m", days: 66 },
      { field: "annual6m", days: 125 },
      { field: "annual1y", days: 250 }
    ];
    const snapshot = {
      product: productId,
      snapshotDate
    };
    const currentNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
      where: { product: productId, navDate: snapshotDate }
    });
    if (!currentNav || !currentNav.unitNav) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}当日无净值数据`);
      return null;
    }
    for (const period of periods) {
      const prevDate = getPreviousTradingDay(snapshotDate, period.days);
      if (!prevDate) {
        snapshot[period.field] = null;
        continue;
      }
      const prevNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: { product: productId, navDate: prevDate }
      });
      if (!prevNav || !prevNav.unitNav || prevNav.unitNav <= 0) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 产品${productId}周期${period.field}净值不足`);
        continue;
      }
      const naturalDays = getNaturalDays(prevDate, snapshotDate);
      const annualReturn = calculateAnnualReturn(prevNav.unitNav, currentNav.unitNav, naturalDays);
      snapshot[period.field] = annualReturn;
    }
    const minNaturalDays = getNaturalDays(getPreviousTradingDay(snapshotDate, 7), snapshotDate);
    snapshot.isEstimate = isEstimateValue(minNaturalDays || 0);
    return snapshot;
  },
  /**
   * 货币基金年化快照计算（万份收益单利）
   */
  async calculateMoneyFundSnapshot(productId, snapshotDate) {
    const periods = [
      { field: "annual7d", days: 7 },
      { field: "annual1m", days: 30 },
      { field: "annual3m", days: 90 },
      { field: "annual6m", days: 180 },
      { field: "annual1y", days: 365 }
    ];
    const snapshot = {
      product: productId,
      snapshotDate,
      annual1d: null,
      annual3d: null,
      annual2w: null,
      isEstimate: false
    };
    for (const period of periods) {
      const startDate = new Date(snapshotDate);
      startDate.setDate(startDate.getDate() - period.days);
      const incomes = await strapi.db.query("plugin::zhao-wealth.wealth-money-income").findMany({
        where: {
          product: productId,
          incomeDate: { $gte: startDate, $lte: snapshotDate }
        }
      });
      if (incomes.length < period.days) {
        snapshot[period.field] = null;
        strapi.log.warn(`[zhao-wealth] 货基${productId}周期${period.field}收益数据不足`);
        continue;
      }
      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const annualReturn = calculateMoneyFundAnnual(totalIncome, period.days);
      snapshot[period.field] = annualReturn;
    }
    return snapshot;
  },
  /**
   * 批量重算年化快照
   */
  async recalculateSnapshots(productId, startDate, endDate) {
    const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
      where: {
        product: productId,
        navDate: { $gte: startDate, $lte: endDate }
      },
      orderBy: { navDate: "asc" }
    });
    for (const nav2 of navs) {
      const snapshot = await this.calculateSnapshot(productId, nav2.navDate);
      if (snapshot) {
        const existing = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findOne({
          where: { product: productId, snapshotDate: nav2.navDate }
        });
        if (existing) {
          await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").update({
            where: { id: existing.id },
            data: snapshot
          });
        } else {
          await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").create({ data: snapshot });
        }
      }
    }
    strapi.log.info(`[zhao-wealth] 产品${productId}年化快照重算完成，${navs.length}条`);
  },
  /**
   * 全量重算所有产品年化快照
   */
  async recalculateAll() {
    const products = await strapi.db.query("plugin::zhao-wealth.wealth-product").findMany();
    for (const product2 of products) {
      const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
        where: { product: product2.id },
        orderBy: { navDate: "asc" }
      });
      if (navs.length > 0) {
        const startDate = navs[0].navDate;
        const endDate = navs[navs.length - 1].navDate;
        await this.recalculateSnapshots(product2.id, startDate, endDate);
      }
    }
    strapi.log.info(`[zhao-wealth] 全量年化快照重算完成，${products.length}个产品`);
  }
});
const annualSnapshot = ({ strapi }) => ({
  /**
   * 获取年化快照时序数据
   */
  async getSnapshotTimeSeries(productId, startDate, endDate, page, pageSize) {
    const limit = Math.min(pageSize, 500);
    const offset2 = (page - 1) * limit;
    const snapshots = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findMany({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate }
      },
      limit,
      offset: offset2,
      orderBy: { snapshotDate: "desc" }
    });
    const total = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").count({
      where: {
        product: productId,
        snapshotDate: { $gte: startDate, $lte: endDate }
      }
    });
    return { list: snapshots, page, pageSize: limit, total };
  },
  /**
   * 获取年度收益列表
   */
  async getYearlyReturns(productId) {
    const returns = await strapi.db.query("plugin::zhao-wealth.wealth-yearly-return").findMany({
      where: { product: productId },
      orderBy: { year: "desc" }
    });
    return returns;
  },
  /**
   * 计算并保存年度收益
   */
  async calculateYearlyReturn(productId, year) {
    const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
      where: { id: productId }
    });
    if (!product2) return null;
    const isMoneyFund = product2.productType === "money-fund";
    if (isMoneyFund) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const incomes = await strapi.db.query("plugin::zhao-wealth.wealth-money-income").findMany({
        where: {
          product: productId,
          incomeDate: { $gte: yearStart, $lte: yearEnd }
        }
      });
      if (incomes.length < 365) {
        strapi.log.warn(`[zhao-wealth] 货基${productId} ${year}年数据不完整`);
        return null;
      }
      const totalIncome = incomes.reduce((sum, item) => sum + (item.tenThousandIncome || 0), 0);
      const avgIncome = totalIncome / incomes.length;
      const annualReturn = avgIncome * 365 / 1e4;
      return await strapi.db.query("plugin::zhao-wealth.wealth-yearly-return").create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1e6) / 1e6,
          baseDays: 365
        }
      });
    } else {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = new Date(year, 11, 31);
      const yearStartNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: {
          product: productId,
          navDate: { $gte: yearStart, $lte: yearEnd }
        },
        orderBy: { navDate: "asc" }
      });
      const yearEndNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: {
          product: productId,
          navDate: { $gte: yearStart, $lte: yearEnd }
        },
        orderBy: { navDate: "desc" }
      });
      if (!yearStartNav || !yearEndNav) {
        strapi.log.warn(`[zhao-wealth] 产品${productId} ${year}年净值数据不完整`);
        return null;
      }
      const annualReturn = yearEndNav.unitNav / yearStartNav.unitNav - 1;
      return await strapi.db.query("plugin::zhao-wealth.wealth-yearly-return").create({
        data: {
          product: productId,
          year,
          annualReturn: Math.round(annualReturn * 1e6) / 1e6,
          baseDays: 365
        }
      });
    }
  }
});
const recommendService = ({ strapi }) => ({
  /**
   * 获取推荐产品列表
   */
  async getRecommendations(userId, channelId, limit = 10) {
    const recommendations = [];
    const manualRecommend = await strapi.db.query("plugin::zhao-wealth.wealth-recommend-config").findMany({
      where: {
        channel: channelId,
        status: true
      },
      orderBy: { recommendOrder: "asc" },
      limit,
      populate: ["product"]
    });
    for (const config of manualRecommend) {
      const latestSnapshot = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findOne({
        where: { product: config.product.id },
        orderBy: { snapshotDate: "desc" }
      });
      recommendations.push({
        productId: config.product.id,
        productName: config.product.productName,
        productType: config.product.productType,
        riskLevel: config.product.riskLevel,
        recommendSource: "manual",
        recommendReason: config.recommendReason,
        annual1y: latestSnapshot?.annual1y,
        latestNav: null
      });
    }
    if (recommendations.length < limit) {
      const user = await strapi.db.query("plugin::users-permissions.user").findOne({
        where: { id: userId }
      });
      if (user && user.riskPreference) {
        const matchedProducts = await strapi.db.query("plugin::zhao-wealth.wealth-product").findMany({
          where: {
            riskLevel: { $lte: user.riskPreference },
            status: true
          },
          orderBy: { recommendWeight: "desc" },
          limit: limit - recommendations.length
        });
        for (const product2 of matchedProducts) {
          if (recommendations.some((r) => r.productId === product2.id)) continue;
          const latestSnapshot = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findOne({
            where: { product: product2.id },
            orderBy: { snapshotDate: "desc" }
          });
          recommendations.push({
            productId: product2.id,
            productName: product2.productName,
            productType: product2.productType,
            riskLevel: product2.riskLevel,
            recommendSource: "preference",
            recommendReason: "符合您的风险偏好",
            annual1y: latestSnapshot?.annual1y,
            latestNav: null
          });
        }
      }
    }
    if (recommendations.length < limit) {
      const topProducts = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findMany({
        where: {
          annual1y: { $ne: null }
        },
        orderBy: { annual1y: "desc" },
        limit: limit - recommendations.length,
        populate: ["product"]
      });
      for (const snapshot of topProducts) {
        if (recommendations.some((r) => r.productId === snapshot.product.id)) continue;
        recommendations.push({
          productId: snapshot.product.id,
          productName: snapshot.product.productName,
          productType: snapshot.product.productType,
          riskLevel: snapshot.product.riskLevel,
          recommendSource: "annual-ranking",
          recommendReason: "近一年年化收益排名靠前",
          annual1y: snapshot.annual1y,
          latestNav: null
        });
      }
    }
    return recommendations.slice(0, limit);
  }
});
const customerProduct = ({ strapi }) => ({
  /**
   * 获取用户自选产品列表
   */
  async getUserProducts(userId, page, pageSize) {
    const limit = Math.min(pageSize, 500);
    const offset2 = (page - 1) * limit;
    const customerProducts = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").findMany({
      where: { user: userId },
      limit,
      offset: offset2,
      orderBy: { sortOrder: "asc", followTime: "desc" },
      populate: ["product"]
    });
    const total = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").count({
      where: { user: userId }
    });
    const list = await Promise.all(customerProducts.map(async (cp) => {
      const latestNav = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findOne({
        where: { product: cp.product.id },
        orderBy: { navDate: "desc" }
      });
      const latestSnapshot = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findOne({
        where: { product: cp.product.id },
        orderBy: { snapshotDate: "desc" }
      });
      return {
        ...cp,
        latestNav,
        latestSnapshot
      };
    }));
    return { list, page, pageSize: limit, total };
  },
  /**
   * 添加自选产品
   */
  async addProduct(userId, productId, channelId) {
    const existing = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").findOne({
      where: { user: userId, product: productId }
    });
    if (existing) {
      return existing;
    }
    return await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").create({
      data: {
        user: userId,
        product: productId,
        channel: channelId,
        followTime: /* @__PURE__ */ new Date(),
        sortOrder: 0
      }
    });
  },
  /**
   * 删除自选产品
   */
  async removeProduct(userId, customerProductId) {
    const cp = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").findOne({
      where: { id: customerProductId }
    });
    if (!cp || cp.user !== userId) {
      return null;
    }
    return await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").delete({
      where: { id: customerProductId }
    });
  },
  /**
   * 获取渠道下所有客户自选统计
   */
  async getChannelProductsStats(channelId) {
    const stats = await strapi.db.query("plugin::zhao-wealth.wealth-customer-product").findMany({
      where: { channel: channelId },
      populate: ["product", "user"]
    });
    const productStats = {};
    for (const cp of stats) {
      const productId = cp.product.id;
      if (!productStats[productId]) {
        productStats[productId] = {
          productId,
          productName: cp.product.productName,
          followCount: 0
        };
      }
      productStats[productId].followCount++;
    }
    return Object.values(productStats).sort((a, b) => b.followCount - a.followCount);
  }
});
const pluginConfig = {
  // 夏普比率的无风险利率（默认 2%，可通过环境变量覆盖）
  riskFreeRate: Number(process.env.WEALTH_RISK_FREE_RATE || 0.02),
  // 计算周期列表
  riskMetricPeriods: ["m1", "m3", "m6", "y1"]
};
const PERIOD_DAYS = {
  "m1": 30,
  "m3": 90,
  "m6": 180,
  "y1": 365
};
const PERIOD_TO_ANNUAL_FIELD = {
  "m1": "annual1m",
  "m3": "annual3m",
  "m6": "annual6m",
  "y1": "annual1y"
};
function getPeriodRange(snapshotDate, period) {
  const days = PERIOD_DAYS[period];
  const end = new Date(snapshotDate);
  const start = new Date(snapshotDate);
  start.setDate(start.getDate() - days);
  return { start, end };
}
function calculateVolatility(navs) {
  if (navs.length < 2) return null;
  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());
  const returns = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].unitNav;
    const curr = sorted[i].unitNav;
    if (prev <= 0) return null;
    returns.push(curr / prev - 1);
  }
  const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
  const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
  const std = Math.sqrt(variance);
  return std * Math.sqrt(250);
}
function calculateMaxDrawdown(navs) {
  if (navs.length < 2) return null;
  const sorted = [...navs].sort((a, b) => new Date(a.navDate).getTime() - new Date(b.navDate).getTime());
  let peak = sorted[0].unitNav;
  let maxDrawdown = 0;
  for (const nav2 of sorted) {
    if (nav2.unitNav > peak) {
      peak = nav2.unitNav;
    }
    if (peak > 0) {
      const drawdown = (peak - nav2.unitNav) / peak;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    }
  }
  return -maxDrawdown;
}
function calculateSharpe(annualReturn, volatility, riskFreeRate) {
  if (annualReturn === null || volatility === null || volatility === 0) return null;
  return (annualReturn - riskFreeRate) / volatility;
}
const riskMetricService = ({ strapi }) => ({
  /**
   * 计算单个产品单个周期的 4 项指标
   * 返回 { volatility, maxDrawdown, sharpe, rankPercentile }
   * rankPercentile 需要在 calculateRankPercentile 中分组计算后填充
   */
  async calculateMetricsForPeriod(productId, snapshotDate, period) {
    const { start, end } = getPeriodRange(snapshotDate, period);
    const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
      where: {
        product: productId,
        navDate: { $gte: start.toISOString().slice(0, 10), $lte: end.toISOString().slice(0, 10) }
      },
      orderBy: { navDate: "asc" }
    });
    const volatility = calculateVolatility(navs);
    const maxDrawdown = calculateMaxDrawdown(navs);
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];
    const snapshot = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findOne({
      where: {
        product: productId,
        snapshotDate: snapshotDate.toISOString().slice(0, 10)
      }
    });
    const annualReturn = snapshot ? snapshot[annualField] : null;
    const sharpe = calculateSharpe(annualReturn, volatility, pluginConfig.riskFreeRate);
    return { volatility, maxDrawdown, sharpe, annualReturn };
  },
  /**
   * 计算同类排名百分位
   * 按 productType 分组，按同期 annualReturn 降序排名
   * rankPercentile = (rank / total) × 100
   */
  async calculateRankPercentile(productId, snapshotDate, period) {
    const annualField = PERIOD_TO_ANNUAL_FIELD[period];
    const product2 = await strapi.db.query("plugin::zhao-wealth.wealth-product").findOne({
      where: { id: productId }
    });
    if (!product2) return null;
    const snapshots = await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").findMany({
      where: {
        snapshotDate: snapshotDate.toISOString().slice(0, 10),
        product: { productType: product2.productType }
      },
      populate: ["product"]
    });
    const valid = snapshots.filter((s2) => s2[annualField] !== null && s2[annualField] !== void 0);
    if (valid.length < 2) return null;
    const sorted = valid.sort((a, b) => b[annualField] - a[annualField]);
    const rank = sorted.findIndex((s2) => s2.product.id === productId) + 1;
    if (rank === 0) return null;
    return rank / valid.length * 100;
  },
  /**
   * 计算单个产品的所有 4 周期 × 4 指标并写入数据库
   */
  async calculateAndSaveMetrics(productId, snapshotDate) {
    const dateStr = snapshotDate.toISOString().slice(0, 10);
    const periods = pluginConfig.riskMetricPeriods;
    for (const period of periods) {
      const metrics = await this.calculateMetricsForPeriod(productId, snapshotDate, period);
      const rankPercentile = await this.calculateRankPercentile(productId, snapshotDate, period);
      const metricEntries = [
        { metricName: "volatility", metricValue: metrics.volatility },
        { metricName: "maxDrawdown", metricValue: metrics.maxDrawdown },
        { metricName: "sharpe", metricValue: metrics.sharpe },
        { metricName: "rankPercentile", metricValue: rankPercentile }
      ];
      for (const entry of metricEntries) {
        await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").delete({
          where: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName
          }
        });
        await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").create({
          data: {
            product: productId,
            snapshotDate: dateStr,
            period,
            metricName: entry.metricName,
            metricValue: entry.metricValue
          }
        });
      }
    }
    strapi.log.info(`[zhao-wealth] 产品${productId}风险指标计算完成`);
  },
  /**
   * 批量计算当日所有产品的风险指标
   */
  async calculateAllForDate(snapshotDate) {
    const products = await strapi.db.query("plugin::zhao-wealth.wealth-product").findMany({
      where: { status: true }
    });
    strapi.log.info(`[zhao-wealth] 开始计算 ${products.length} 个产品的风险指标`);
    for (const product2 of products) {
      try {
        await this.calculateAndSaveMetrics(product2.id, snapshotDate);
      } catch (error) {
        strapi.log.error(`[zhao-wealth] 产品${product2.id}风险指标计算失败: ${error.message}`);
      }
    }
    strapi.log.info(`[zhao-wealth] 风险指标批量计算完成`);
  },
  /**
   * 全量重算（补全历史数据）
   * 遍历所有有净值数据的历史日期
   */
  async recalculateAll() {
    const navDates = await strapi.db.connection.raw(`
      SELECT DISTINCT nav_date FROM wealth_navs ORDER BY nav_date ASC
    `);
    const dates = navDates.rows.map((r) => new Date(r.nav_date));
    strapi.log.info(`[zhao-wealth] 全量重算风险指标，共 ${dates.length} 个日期`);
    for (const date of dates) {
      await this.calculateAllForDate(date);
    }
    strapi.log.info(`[zhao-wealth] 全量重算完成`);
  },
  /**
   * 指标中心：聚合查询
   * 返回最新 snapshotDate 的 4 指标值
   */
  async adminAggregate(productId, period) {
    const metricNames = ["volatility", "maxDrawdown", "sharpe", "rankPercentile"];
    const result = {};
    for (const metricName of metricNames) {
      const records = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
        where: { product: productId, period, metricName },
        orderBy: { snapshotDate: "desc" },
        limit: 1
      });
      result[metricName] = records.length > 0 ? records[0].metricValue : null;
    }
    return result;
  },
  /**
   * 指标中心：历史趋势
   * 返回 4 指标按 snapshotDate 排序的时序数据
   */
  async adminTrend(productId) {
    const records = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
      where: { product: productId },
      orderBy: [{ snapshotDate: "asc" }, { period: "asc" }],
      limit: 500
    });
    const trend = {
      m1: [],
      m3: [],
      m6: [],
      y1: []
    };
    const grouped = {};
    for (const r of records) {
      const key = `${r.snapshotDate}_${r.period}`;
      if (!grouped[key]) {
        grouped[key] = {
          snapshotDate: r.snapshotDate,
          period: r.period,
          volatility: null,
          maxDrawdown: null,
          sharpe: null,
          rankPercentile: null
        };
      }
      grouped[key][r.metricName] = r.metricValue;
    }
    for (const key of Object.keys(grouped)) {
      const item = grouped[key];
      if (trend[item.period]) {
        trend[item.period].push(item);
      }
    }
    return trend;
  },
  /**
   * 指标中心：同类对比
   * 返回同 period + metricName 下所有产品的排名
   */
  async adminPeers(period, metricName, limit = 50) {
    const latest = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
      where: { period, metricName },
      orderBy: { snapshotDate: "desc" },
      limit: 1
    });
    if (latest.length === 0) return [];
    const snapshotDate = latest[0].snapshotDate;
    const records = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
      where: { snapshotDate, period, metricName },
      populate: ["product"],
      limit
    });
    const valid = records.filter((r) => r.metricValue !== null && r.product);
    if (metricName === "maxDrawdown") {
      valid.sort((a, b) => a.metricValue - b.metricValue);
    } else {
      valid.sort((a, b) => b.metricValue - a.metricValue);
    }
    return valid.map((r, index2) => ({
      rank: index2 + 1,
      productId: r.product.id,
      productName: r.product.productName,
      productType: r.product.productType,
      metricValue: r.metricValue
    }));
  }
});
const statsService = ({ strapi }) => ({
  /**
   * 全局概览统计
   * 返回 productCount/companyCount/collectSuccessRate/riskMetricCoverage/todayAnomaly
   */
  async getOverview() {
    const productCount = await strapi.db.query("plugin::zhao-wealth.wealth-product").count();
    const companyCount = await strapi.db.query("plugin::zhao-wealth.wealth-company").count();
    const collectSuccess = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "success" } });
    const collectFailed = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "failed" } });
    const collectPending = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({ where: { collectStatus: "pending" } });
    const collectTotal = collectSuccess + collectFailed + collectPending;
    const collectSuccessRate = collectTotal > 0 ? collectSuccess / collectTotal : 0;
    let riskMetricCoverage = 0;
    if (productCount > 0) {
      const productsWithMetrics = await strapi.db.connection.raw(`
        SELECT COUNT(DISTINCT p.id) AS cnt
        FROM wealth_products p
        JOIN wealth_risk_metrics rm ON rm.product_id = p.id
      `);
      riskMetricCoverage = productsWithMetrics.rows[0].cnt / productCount;
    }
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    const todayFailedCollect = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").count({
      where: { collectStatus: "failed" }
    });
    const nullMetrics = await strapi.db.connection.raw(`
      SELECT COUNT(*) AS cnt FROM wealth_risk_metrics
      WHERE snapshot_date = ? AND metric_value IS NULL
    `, [today]);
    const todayAnomaly = todayFailedCollect + Number(nullMetrics.rows[0].cnt);
    return {
      productCount,
      companyCount,
      collectSuccessRate: Number(collectSuccessRate.toFixed(4)),
      riskMetricCoverage: Number(riskMetricCoverage.toFixed(4)),
      todayAnomaly
    };
  },
  /**
   * 异常列表
   * 返回最近 N 条采集失败 + 指标计算失败记录
   */
  async getAnomalies(limit = 10) {
    const failedConfigs = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findMany({
      where: { collectStatus: "failed" },
      populate: ["product"],
      limit,
      orderBy: { updatedAt: "desc" }
    });
    const collectAnomalies = failedConfigs.map((c) => ({
      type: "collect_failed",
      productId: c.product?.id,
      productName: c.product?.productName,
      failCount: c.failCount || 0,
      lastCollectTime: c.lastCollectTime,
      message: `采集失败 ${c.failCount || 0} 次`
    }));
    const nullMetrics = await strapi.db.query("plugin::zhao-wealth.wealth-risk-metric").findMany({
      where: { metricValue: null },
      populate: ["product"],
      limit,
      orderBy: { snapshotDate: "desc" }
    });
    const metricAnomalies = nullMetrics.map((m) => ({
      type: "metric_null",
      productId: m.product?.id,
      productName: m.product?.productName,
      snapshotDate: m.snapshotDate,
      period: m.period,
      metricName: m.metricName,
      message: `${m.period} 周期 ${m.metricName} 计算失败`
    }));
    const all = [...collectAnomalies, ...metricAnomalies];
    return all.slice(0, limit);
  }
});
const services = {
  product,
  "nav-calculator": navCalculator,
  "annual-snapshot": annualSnapshot,
  "recommend-service": recommendService,
  "customer-product": customerProduct,
  "risk-metric-service": riskMetricService,
  stats: statsService
};
const hasChannelAccess = async (ctx, config, { strapi }) => {
  const user = ctx.state.user;
  if (!user) {
    return false;
  }
  const channelId = ctx.state.channel?.id;
  if (!channelId) {
    strapi.log.warn("[zhao-wealth] 用户无渠道信息");
    return false;
  }
  return true;
};
const hasProductPermission = async (ctx, config, { strapi }) => {
  const user = ctx.state.user;
  if (!user) {
    return false;
  }
  const role = user.role?.type;
  if (role === "admin") {
    return true;
  }
  const channelId = ctx.state.channel?.id;
  if (role === "channel-admin" && channelId) {
    return true;
  }
  return false;
};
const policies = {
  "has-channel-access": hasChannelAccess,
  "has-product-permission": hasProductPermission
};
const register = ({ strapi }) => {
  strapi.log.info("[zhao-wealth] 插件已注册");
};
class BaseCollector {
  /**
   * 采集产品基本信息
   */
  async collectProductInfo(productCode) {
    throw new Error("Method not implemented");
  }
  /**
   * 采集净值数据
   */
  async collectNavData(productCode) {
    throw new Error("Method not implemented");
  }
  /**
   * 数据入库
   */
  async saveToDatabase(productId, data) {
    throw new Error("Method not implemented");
  }
}
const CHROME_PATH = "C:\\Users\\Administrator\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe";
const PAGE_TIMEOUT = 3e4;
let browser = null;
let initPromise = null;
async function initBrowser() {
  if (browser) return browser;
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      browser = await playwright.chromium.launch({
        executablePath: CHROME_PATH,
        headless: false,
        args: ["--disable-blink-features=AutomationControlled"]
      });
      console.log("[zhao-wealth] Playwright Browser 已启动");
      return browser;
    } catch (error) {
      console.error(`[zhao-wealth] Playwright Browser 启动失败: ${error.message}`);
      initPromise = null;
      return null;
    }
  })();
  return initPromise;
}
async function createPage() {
  if (!browser) {
    browser = await initBrowser();
  }
  if (!browser) return null;
  const context = await browser.newContext({
    userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36"
  });
  const page = await context.newPage();
  page.setDefaultTimeout(PAGE_TIMEOUT);
  return page;
}
async function closePage(page) {
  try {
    const context = page.context();
    await page.close();
    await context.close();
  } catch {
  }
}
async function destroyBrowser() {
  if (browser) {
    try {
      await browser.close();
    } catch {
    }
    browser = null;
    initPromise = null;
    console.log("[zhao-wealth] Playwright Browser 已关闭");
  }
}
const BASE_URL = "https://www.cbhbwm.com.cn";
const RISK_MAP = {
  "低风险": "R1",
  "中低风险": "R2",
  "中风险": "R3",
  "中高风险": "R4",
  "高风险": "R5"
};
const TERM_MAP = {
  "3-6个月": "short",
  "6-12个月": "medium",
  "1-3年": "long",
  "3年以上": "long"
};
class CbhbCollector extends BaseCollector {
  /**
   * 通过销售编码采集渤银理财产品详情
   */
  async collectProductInfo(productCode) {
    const page = await createPage();
    if (!page) {
      throw new Error("Playwright Browser 不可用");
    }
    try {
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/gmxqy/index.html?saleCode=${productCode}`, {
        waitUntil: "domcontentloaded"
      });
      await page.waitForSelector(".product-detail, .detail-info, .pro-detail", { timeout: 1e4 }).catch(() => {
      });
      const productInfo = await page.evaluate(() => {
        const doc = globalThis.document || {};
        const getText = (selector) => {
          const el = doc.querySelector(selector);
          return el ? el.textContent?.trim() || "" : "";
        };
        const name = getText(".product-title, .pro-name, .detail-title, h2");
        const registerCode = getText(".register-code, .reg-code, .pro-code").replace("登记编号：", "").replace("登记编号:", "");
        const riskText = getText(".risk-type, .risk-level, .pro-risk");
        const termText = getText(".term-type, .pro-term, .invest-period");
        const issueDate = getText(".issue-date, .start-date, .raise-start");
        const maturityDate = getText(".maturity-date, .end-date, .raise-end");
        const benchmark = getText(".benchmark, .pro-benchmark, .performance-benchmark, .yield-benchmark");
        return { name, registerCode, riskText, termText, issueDate, maturityDate, benchmark };
      });
      if (!productInfo.name) {
        return await this.collectFromListPage(productCode);
      }
      return {
        productCode,
        productName: productInfo.name,
        registerCode: productInfo.registerCode,
        riskLevel: this.parseRiskLevel(productInfo.riskText),
        riskLevelRaw: productInfo.riskText,
        termType: this.parseTermType(productInfo.termText),
        termTypeRaw: productInfo.termText,
        productType: "bank-wealth",
        productTypeRaw: "固定收益类",
        issueDate: productInfo.issueDate,
        maturityDate: productInfo.maturityDate,
        benchmark: productInfo.benchmark,
        company: "渤银理财"
      };
    } catch (error) {
      throw new Error(`渤银官网采集失败: ${error.message}`);
    } finally {
      await closePage(page);
    }
  }
  /**
   * 从列表页搜索产品
   */
  async collectFromListPage(productCode) {
    const page = await createPage();
    if (!page) {
      throw new Error("Playwright Browser 不可用");
    }
    try {
      await page.goto(`${BASE_URL}/cbhbwm/gmcp/qbcp/index.html`, {
        waitUntil: "domcontentloaded"
      });
      await page.waitForSelector(".product-item, .pro-item, .list-item", { timeout: 1e4 }).catch(() => {
      });
      const found = await page.evaluate((code) => {
        const doc = globalThis.document || {};
        const items = doc.querySelectorAll(".product-item, .pro-item, .list-item, tr");
        for (const item of items) {
          const text = item.textContent || "";
          if (text.includes(code)) {
            return text.trim();
          }
        }
        return "";
      }, productCode);
      if (!found) {
        return null;
      }
      return {
        productCode,
        productName: "",
        registerCode: "",
        riskLevel: "R2",
        riskLevelRaw: "",
        termType: "medium",
        termTypeRaw: "",
        productType: "bank-wealth",
        productTypeRaw: "固定收益类",
        issueDate: "",
        maturityDate: "",
        benchmark: "",
        company: "渤银理财",
        _listMatch: found
      };
    } finally {
      await closePage(page);
    }
  }
  /**
   * 采集净值数据（占位，当前不实现）
   */
  async collectNavData(productCode) {
    return [];
  }
  parseRiskLevel(text) {
    for (const [key, value] of Object.entries(RISK_MAP)) {
      if (text.includes(key)) return value;
    }
    return "R2";
  }
  parseTermType(text) {
    for (const [key, value] of Object.entries(TERM_MAP)) {
      if (text.includes(key)) return value;
    }
    return "medium";
  }
}
function getCollector(collectMethod) {
  switch (collectMethod) {
    case "web-crawler":
      return new CbhbCollector();
    default:
      return new BaseCollector();
  }
}
function registerCollectJobs(strapi) {
  const queue = getCollectQueue();
  if (!queue) {
    strapi.log.warn("[zhao-wealth] collect queue 不可用，跳过 job 注册");
    return;
  }
  queue.process("collect-single", async (job) => {
    const { productId } = job.data;
    const config = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findOne({
      where: { product: productId },
      populate: ["product"]
    });
    if (!config) {
      strapi.log.warn(`[zhao-wealth] 产品${productId}无采集配置`);
      return;
    }
    const collector = getCollector(config.collectMethod);
    try {
      const navData = await collector.collectNavData(config.product.productCode);
      for (const nav2 of navData) {
        await strapi.db.query("plugin::zhao-wealth.wealth-nav").create({
          data: {
            product: productId,
            ...nav2
          }
        });
      }
      await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").update({
        where: { id: config.id },
        data: {
          collectStatus: "success",
          lastCollectTime: /* @__PURE__ */ new Date(),
          failCount: 0
        }
      });
      strapi.log.info(`[zhao-wealth] 产品${productId}采集成功，${navData.length}条净值`);
      const calculateQueue2 = getCollectQueue();
      if (calculateQueue2) {
        calculateQueue2.add("calculate-snapshot", { productId });
      }
    } catch (error) {
      strapi.log.error(`[zhao-wealth] 产品${productId}采集失败: ${error.message}`);
      await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").update({
        where: { id: config.id },
        data: {
          collectStatus: "failed",
          failCount: config.failCount + 1,
          failReason: error.message
        }
      });
    }
  });
  queue.process("collect-all", async (job) => {
    const lockKey = "wealth:collect:lock";
    const acquired = await acquireLock(lockKey, 30 * 60);
    if (!acquired) {
      strapi.log.warn("[zhao-wealth] 采集任务已在执行中或 Redis 不可用");
      return;
    }
    try {
      const configs = await strapi.db.query("plugin::zhao-wealth.wealth-collect-config").findMany({
        populate: ["product"]
      });
      for (const config of configs) {
        queue.add("collect-single", { productId: config.product.id });
      }
      strapi.log.info(`[zhao-wealth] 全量采集任务分发完成，${configs.length}个产品`);
    } finally {
      await releaseLock(lockKey);
    }
  });
}
function registerCalculateJobs(strapi) {
  const queue = getCalculateQueue();
  if (!queue) {
    strapi.log.warn("[zhao-wealth] calculate queue 不可用，跳过 job 注册");
    return;
  }
  queue.process("calculate-snapshot", async (job) => {
    const { productId } = job.data;
    const today = /* @__PURE__ */ new Date();
    const snapshot = await strapi.service("plugin::zhao-wealth.nav-calculator").calculateSnapshot(productId, today);
    if (snapshot) {
      await strapi.db.query("plugin::zhao-wealth.wealth-annual-snapshot").create({ data: snapshot });
      strapi.log.info(`[zhao-wealth] 产品${productId}年化快照计算完成`);
    }
  });
  queue.process("recalculate-product", async (job) => {
    const { productId } = job.data;
    const navs = await strapi.db.query("plugin::zhao-wealth.wealth-nav").findMany({
      where: { product: productId },
      orderBy: { navDate: "asc" }
    });
    if (navs.length > 0) {
      const startDate = navs[0].navDate;
      const endDate = navs[navs.length - 1].navDate;
      await strapi.service("plugin::zhao-wealth.nav-calculator").recalculateSnapshots(productId, startDate, endDate);
    }
  });
  queue.process("recalculate-range", async (job) => {
    const { productId, startDate, endDate } = job.data;
    await strapi.service("plugin::zhao-wealth.nav-calculator").recalculateSnapshots(productId, new Date(startDate), new Date(endDate));
  });
  const recalcQueue = getRecalculateQueue();
  if (!recalcQueue) {
    strapi.log.warn("[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all 注册");
    return;
  }
  recalcQueue.process("recalculate-all", async (job) => {
    const lockKey = "wealth:recalculate:lock";
    const acquired = await acquireLock(lockKey, 60 * 60);
    if (!acquired) {
      strapi.log.warn("[zhao-wealth] 重算任务已在执行中或 Redis 不可用");
      return;
    }
    try {
      await strapi.service("plugin::zhao-wealth.nav-calculator").recalculateAll();
    } finally {
      await releaseLock(lockKey);
    }
  });
}
function registerRiskMetricJobs(strapi) {
  const calcQueue = getCalculateQueue();
  if (calcQueue) {
    calcQueue.process("calculate-risk-metric", async (job) => {
      const { productId, snapshotDate } = job.data;
      const date = snapshotDate ? new Date(snapshotDate) : /* @__PURE__ */ new Date();
      await strapi.service("plugin::zhao-wealth.risk-metric-service").calculateAndSaveMetrics(productId, date);
    });
    calcQueue.process("recalculate-risk-metric-product", async (job) => {
      const { productId } = job.data;
      const navDates = await strapi.db.connection.raw(`
        SELECT DISTINCT nav_date FROM wealth_navs WHERE product_id = ? ORDER BY nav_date ASC
      `, [productId]);
      for (const row of navDates.rows) {
        await strapi.service("plugin::zhao-wealth.risk-metric-service").calculateAndSaveMetrics(productId, new Date(row.nav_date));
      }
      strapi.log.info(`[zhao-wealth] 产品${productId}风险指标重算完成`);
    });
  } else {
    strapi.log.warn("[zhao-wealth] calculate queue 不可用，跳过 risk-metric job 注册");
  }
  const recalcQueue = getRecalculateQueue();
  if (recalcQueue) {
    recalcQueue.process("recalculate-all-risk-metrics", async (job) => {
      const lockKey = "wealth:recalculate-risk-metric:lock";
      const acquired = await acquireLock(lockKey, 60 * 60);
      if (!acquired) {
        strapi.log.warn("[zhao-wealth] 风险指标重算任务已在执行中或 Redis 不可用");
        return;
      }
      try {
        await strapi.service("plugin::zhao-wealth.risk-metric-service").recalculateAll();
      } finally {
        await releaseLock(lockKey);
      }
    });
  } else {
    strapi.log.warn("[zhao-wealth] recalculate queue 不可用，跳过 recalculate-all-risk-metrics 注册");
  }
}
const jobs = async ({ strapi }) => {
  await setupQueues(strapi);
  registerCollectJobs(strapi);
  registerCalculateJobs(strapi);
  registerRiskMetricJobs(strapi);
};
const seedCompanies = [
  {
    name: "工银理财有限责任公司",
    shortName: "工银理财",
    companyType: "bank-subsidiary",
    website: "https://www.icbc.com.cn",
    status: true
  },
  {
    name: "建信理财有限责任公司",
    shortName: "建信理财",
    companyType: "bank-subsidiary",
    website: "https://www.ccb.com",
    status: true
  },
  {
    name: "中银理财有限责任公司",
    shortName: "中银理财",
    companyType: "bank-subsidiary",
    website: "https://www.boc.cn",
    status: true
  },
  {
    name: "农银理财有限责任公司",
    shortName: "农银理财",
    companyType: "bank-subsidiary",
    website: "https://www.abchina.com",
    status: true
  },
  {
    name: "交银理财有限责任公司",
    shortName: "交银理财",
    companyType: "bank-subsidiary",
    website: "https://www.bankcomm.com",
    status: true
  },
  {
    name: "中邮理财有限责任公司",
    shortName: "中邮理财",
    companyType: "bank-subsidiary",
    website: "https://www.psbc.com",
    status: true
  },
  {
    name: "招银理财有限责任公司",
    shortName: "招银理财",
    companyType: "bank-subsidiary",
    website: "https://www.cmbchina.com",
    status: true
  },
  {
    name: "兴银理财有限责任公司",
    shortName: "兴银理财",
    companyType: "bank-subsidiary",
    website: "https://www.cib.com.cn",
    status: true
  },
  {
    name: "信银理财有限责任公司",
    shortName: "信银理财",
    companyType: "bank-subsidiary",
    website: "https://www.citicbank.com",
    status: true
  },
  {
    name: "光大理财有限责任公司",
    shortName: "光大理财",
    companyType: "bank-subsidiary",
    website: "https://www.cebbank.com",
    status: true
  },
  {
    name: "浦银理财有限责任公司",
    shortName: "浦银理财",
    companyType: "bank-subsidiary",
    website: "https://www.spdb.com.cn",
    status: true
  },
  {
    name: "民生理财有限责任公司",
    shortName: "民生理财",
    companyType: "bank-subsidiary",
    website: "https://www.cmbc.com.cn",
    status: true
  },
  {
    name: "华夏理财有限责任公司",
    shortName: "华夏理财",
    companyType: "bank-subsidiary",
    website: "https://www.hxb.com.cn",
    status: true
  },
  {
    name: "平安理财有限责任公司",
    shortName: "平安理财",
    companyType: "bank-subsidiary",
    website: "https://www.bank.pingan.com",
    status: true
  },
  {
    name: "渤银理财有限责任公司",
    shortName: "渤银理财",
    companyType: "bank-subsidiary",
    website: "https://www.cbhb.com.cn",
    status: true
  },
  {
    name: "浙银理财有限责任公司",
    shortName: "浙银理财",
    companyType: "bank-subsidiary",
    website: "https://www.czbank.com",
    status: true
  },
  {
    name: "恒银理财有限责任公司",
    shortName: "恒银理财",
    companyType: "bank-subsidiary",
    website: "https://www.hengbank.com.cn",
    status: true
  },
  {
    name: "广银理财有限责任公司",
    shortName: "广银理财",
    companyType: "bank-subsidiary",
    website: "https://www.cgbchina.com.cn",
    status: true
  },
  {
    name: "杭银理财有限责任公司",
    shortName: "杭银理财",
    companyType: "bank-subsidiary",
    website: "https://www.bankofhz.com",
    status: true
  },
  {
    name: "宁银理财有限责任公司",
    shortName: "宁银理财",
    companyType: "bank-subsidiary",
    website: "https://www.nbcb.com.cn",
    status: true
  },
  {
    name: "徽银理财有限责任公司",
    shortName: "徽银理财",
    companyType: "bank-subsidiary",
    website: "https://www.hsbank.com.cn",
    status: true
  },
  {
    name: "南银理财有限责任公司",
    shortName: "南银理财",
    companyType: "bank-subsidiary",
    website: "https://www.njcb.com.cn",
    status: true
  },
  {
    name: "苏银理财有限责任公司",
    shortName: "苏银理财",
    companyType: "bank-subsidiary",
    website: "https://www.jsbchina.cn",
    status: true
  },
  {
    name: "青银理财有限责任公司",
    shortName: "青银理财",
    companyType: "bank-subsidiary",
    website: "https://www.qdccb.com",
    status: true
  },
  {
    name: "上银理财有限责任公司",
    shortName: "上银理财",
    companyType: "bank-subsidiary",
    website: "https://www.bosc.cn",
    status: true
  },
  {
    name: "北银理财有限责任公司",
    shortName: "北银理财",
    companyType: "bank-subsidiary",
    website: "https://www.bankofbeijing.com.cn",
    status: true
  },
  {
    name: "渝农商理财有限责任公司",
    shortName: "渝农商理财",
    companyType: "bank-subsidiary",
    website: "https://www.cqrcb.com",
    status: true
  },
  {
    name: "高盛工银理财有限责任公司",
    shortName: "高盛工银理财",
    companyType: "joint-venture",
    website: "",
    status: true
  },
  {
    name: "施罗德交银理财有限公司",
    shortName: "施罗德交银理财",
    companyType: "joint-venture",
    website: "",
    status: true
  },
  {
    name: "贝莱德建信理财有限责任公司",
    shortName: "贝莱德建信理财",
    companyType: "joint-venture",
    website: "",
    status: true
  },
  {
    name: "汇华理财有限公司",
    shortName: "汇华理财",
    companyType: "joint-venture",
    website: "",
    status: true
  },
  {
    name: "法巴农银理财有限责任公司",
    shortName: "法巴农银理财",
    companyType: "joint-venture",
    website: "",
    status: true
  },
  {
    name: "吉林银行股份有限公司",
    shortName: "吉林银行",
    companyType: "bank",
    website: "https://www.jlbank.com.cn",
    status: true
  }
];
const COMPANY_UID = "plugin::zhao-wealth.wealth-company";
async function initSeedCompanies(strapi) {
  try {
    const count = await strapi.db.query(COMPANY_UID).count({});
    if (count > 0) {
      strapi.log.info(`[zhao-wealth] 理财公司数据已存在（${count} 条），跳过初始化`);
      return;
    }
    for (const item of seedCompanies) {
      await strapi.documents(COMPANY_UID).create({ data: { ...item } });
    }
    strapi.log.info(`[zhao-wealth] 已初始化 ${seedCompanies.length} 家理财公司种子数据`);
  } catch (e) {
    strapi.log.warn(`[zhao-wealth] 理财公司种子数据初始化失败: ${e?.message || String(e)}`);
  }
}
const bootstrap = async ({ strapi }) => {
  await jobs({ strapi });
  const pwBrowser = await initBrowser();
  if (pwBrowser) {
    strapi.log.info("[zhao-wealth] Playwright Browser 已就绪");
  } else {
    strapi.log.warn("[zhao-wealth] Playwright Browser 不可用，采集功能将降级");
  }
  await initSeedCompanies(strapi);
  process.on("SIGTERM", async () => {
    await destroyBrowser();
  });
  process.on("SIGINT", async () => {
    await destroyBrowser();
  });
  strapi.cron.add({
    "wealth-trading-day-check": {
      task: ({ strapi: strapi2 }) => {
        const today = /* @__PURE__ */ new Date();
        const isTrading = isTradingDay(today);
        strapi2.log.info(`[zhao-wealth] 交易日检查: ${today.toISOString().slice(0, 10)} ${isTrading ? "是交易日" : "非交易日"}`);
      },
      options: "0 8 * * *"
    }
  });
  strapi.cron.add({
    "wealth-collect-trigger": {
      task: ({ strapi: strapi2 }) => {
        const today = /* @__PURE__ */ new Date();
        if (!isTradingDay(today)) {
          strapi2.log.info("[zhao-wealth] 非交易日，跳过采集");
          return;
        }
        const queue = getCollectQueue();
        if (!queue) {
          strapi2.log.warn("[zhao-wealth] 采集队列不可用（Redis 未就绪），跳过");
          return;
        }
        queue.add("collect-all", {});
        strapi2.log.info("[zhao-wealth] 18:00 采集任务已触发");
      },
      options: "0 18 * * *"
    }
  });
  strapi.cron.add({
    "wealth-calculate-trigger": {
      task: async ({ strapi: strapi2 }) => {
        const today = /* @__PURE__ */ new Date();
        if (!isTradingDay(today)) {
          strapi2.log.info("[zhao-wealth] 非交易日，跳过年化计算");
          return;
        }
        const queue = getCalculateQueue();
        if (!queue) {
          strapi2.log.warn("[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过");
          return;
        }
        const products = await strapi2.db.query("plugin::zhao-wealth.wealth-product").findMany({
          where: { status: true }
        });
        for (const product2 of products) {
          queue.add("calculate-snapshot", { productId: product2.id });
        }
        strapi2.log.info(`[zhao-wealth] 20:00 年化计算任务已触发，${products.length}个产品`);
      },
      options: "0 20 * * *"
    }
  });
  strapi.cron.add({
    "wealth-risk-metric-trigger": {
      task: async ({ strapi: strapi2 }) => {
        const today = /* @__PURE__ */ new Date();
        if (!isTradingDay(today)) {
          strapi2.log.info("[zhao-wealth] 非交易日，跳过风险指标计算");
          return;
        }
        const queue = getCalculateQueue();
        if (!queue) {
          strapi2.log.warn("[zhao-wealth] 计算队列不可用（Redis 未就绪），跳过风险指标计算");
          return;
        }
        const products = await strapi2.db.query("plugin::zhao-wealth.wealth-product").findMany({
          where: { status: true }
        });
        for (const product2 of products) {
          queue.add("calculate-risk-metric", { productId: product2.id, snapshotDate: today });
        }
        strapi2.log.info(`[zhao-wealth] 20:30 风险指标计算任务已触发，${products.length}个产品`);
      },
      options: "30 20 * * *"
    }
  });
  strapi.log.info("[zhao-wealth] 插件已启动");
};
const index = {
  contentTypes,
  controllers,
  routes,
  services,
  policies,
  register,
  bootstrap
};
exports.default = index;
