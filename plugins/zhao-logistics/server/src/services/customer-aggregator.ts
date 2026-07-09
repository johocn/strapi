import type { Core } from "@strapi/strapi";

const PROFILE_UID = "plugin::zhao-logistics.customer-profile";
const QUOTE_REQUEST_UID = "plugin::zhao-logistics.quote-request";
const INTENT_ORDER_UID = "plugin::zhao-logistics.intent-order";
const LEAD_UID = "plugin::zhao-website.lead";

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 按 phone/email 匹配现有档案，存在则更新，不存在则创建
   */
  async upsert(
    siteId: number,
    info: {
      name: string;
      contactPhone?: string;
      contactEmail?: string;
      customerType?: string;
      country?: string;
      sourceChannel?: string;
      utmSource?: string;
    }
  ): Promise<any> {
    // 1. 按 phone 或 email 查现有档案
    let existing: any = null;
    if (info.contactPhone) {
      existing = await strapi.db.query(PROFILE_UID).findOne({
        where: { site: siteId, contactPhone: info.contactPhone, deletedAt: null },
      });
    }
    if (!existing && info.contactEmail) {
      existing = await strapi.db.query(PROFILE_UID).findOne({
        where: { site: siteId, contactEmail: info.contactEmail, deletedAt: null },
      });
    }

    if (existing) {
      // 2a. 更新（合并非空字段）
      const updateData: any = {};
      if (info.name && !existing.name) updateData.name = info.name;
      if (info.contactEmail && !existing.contactEmail) updateData.contactEmail = info.contactEmail;
      if (info.contactPhone && !existing.contactPhone) updateData.contactPhone = info.contactPhone;
      if (info.customerType && !existing.customerType) updateData.customerType = info.customerType;

      if (Object.keys(updateData).length > 0) {
        return strapi.db.query(PROFILE_UID).update({
          where: { documentId: existing.documentId },
          data: updateData,
        });
      }
      return existing;
    }

    // 2b. 创建新档案
    return strapi.db.query(PROFILE_UID).create({
      data: {
        site: siteId,
        name: info.name,
        contactPhone: info.contactPhone || "",
        contactEmail: info.contactEmail || null,
        customerType: info.customerType || "individual",
        country: info.country || "cn",
        lifecycleStage: "lead",
        sourceChannel: info.sourceChannel || null,
        utmSource: info.utmSource || null,
        totalQuoteCount: 0,
        totalOrderCount: 0,
        totalOrderValue: 0,
      },
    });
  },

  /**
   * 从 lead 创建/更新客户档案，并关联 leadId
   */
  async upsertFromLead(siteId: number, leadId: string): Promise<any> {
    const lead = await strapi.db.query(LEAD_UID).findOne({
      where: { site: siteId, documentId: leadId, deletedAt: null },
    });
    if (!lead) throw new Error("lead 不存在");

    const profile = await this.upsert(siteId, {
      name: lead.contactName || "未知",
      contactPhone: lead.contactPhone,
      contactEmail: lead.contactEmail,
      customerType: "individual",
      country: "cn",
      sourceChannel: lead.sourceType,
      utmSource: lead.utmSource,
    });

    // 追加 relatedLeadIds
    const relatedLeadIds: string[] = Array.isArray(profile.relatedLeadIds) ? profile.relatedLeadIds : [];
    if (!relatedLeadIds.includes(leadId)) {
      relatedLeadIds.push(leadId);
      await strapi.db.query(PROFILE_UID).update({
        where: { documentId: profile.documentId },
        data: { relatedLeadIds },
      });
    }

    return profile;
  },

  /**
   * 询价提交时更新档案：累计询价数 + 关联 quoteRequestId
   */
  async upsertFromQuote(siteId: number, quoteRequestId: string): Promise<any> {
    const quote = await strapi.db.query(QUOTE_REQUEST_UID).findOne({
      where: { site: siteId, documentId: quoteRequestId, deletedAt: null },
    });
    if (!quote) throw new Error("询价单不存在");

    // 解析联系方式（customerContact 是 JSON 字符串）
    let contactPhone = "";
    let contactEmail = "";
    try {
      const contact = typeof quote.customerContact === "string" ? JSON.parse(quote.customerContact) : quote.customerContact;
      if (Array.isArray(contact)) {
        for (const c of contact) {
          if (c.type === "phone") contactPhone = c.value;
          if (c.type === "email") contactEmail = c.value;
        }
      }
    } catch {}

    const profile = await this.upsert(siteId, {
      name: quote.customerName,
      contactPhone,
      contactEmail,
      customerType: quote.customerType,
      country: "cn",
      sourceChannel: quote.utmSource,
      utmSource: quote.utmSource,
    });

    // 累计询价数 + 关联 ID
    const relatedQuoteIds: string[] = Array.isArray(profile.relatedQuoteIds) ? profile.relatedQuoteIds : [];
    if (!relatedQuoteIds.includes(quoteRequestId)) {
      relatedQuoteIds.push(quoteRequestId);
    }
    const totalQuoteCount = (profile.totalQuoteCount || 0) + 1;

    const updated = await strapi.db.query(PROFILE_UID).update({
      where: { documentId: profile.documentId },
      data: {
        relatedQuoteIds,
        totalQuoteCount,
        lastQuoteAt: new Date().toISOString(),
        lifecycleStage: this._computeStage(totalQuoteCount, profile.totalOrderCount || 0),
      },
    });

    return updated;
  },

  /**
   * 订单成交时更新档案：累计订单数 + 成交额 + 关联 orderId
   */
  async upsertFromOrder(siteId: number, intentOrderId: string): Promise<any> {
    const order = await strapi.db.query(INTENT_ORDER_UID).findOne({
      where: { site: siteId, documentId: intentOrderId, deletedAt: null },
    });
    if (!order) throw new Error("意向订单不存在");

    const profile = await this.upsert(siteId, {
      name: order.customerName,
      contactPhone: this._extractPhone(order.customerContact),
      customerType: order.customerType,
      country: "cn",
    });

    const relatedOrderIds: string[] = Array.isArray(profile.relatedOrderIds) ? profile.relatedOrderIds : [];
    if (!relatedOrderIds.includes(intentOrderId)) {
      relatedOrderIds.push(intentOrderId);
    }
    const totalOrderCount = (profile.totalOrderCount || 0) + 1;
    const orderValue = Number(order.confirmedPrice) || 0;
    const totalOrderValue = Number(profile.totalOrderValue || 0) + orderValue;

    const updated = await strapi.db.query(PROFILE_UID).update({
      where: { documentId: profile.documentId },
      data: {
        relatedOrderIds,
        totalOrderCount,
        totalOrderValue: Math.round(totalOrderValue * 100) / 100,
        lastOrderAt: new Date().toISOString(),
        lifecycleStage: this._computeStage(profile.totalQuoteCount || 0, totalOrderCount),
      },
    });

    return updated;
  },

  /**
   * 聚合查询客户档案详情（含关联 lead/quote/order 列表）
   */
  async getProfile(siteId: number, profileId: string): Promise<any> {
    const profile = await strapi.db.query(PROFILE_UID).findOne({
      where: { site: siteId, documentId: profileId, deletedAt: null },
      populate: { assignedTo: true },
    });
    if (!profile) throw new Error("客户档案不存在");

    // 加载关联记录
    const [leads, quotes, orders] = await Promise.all([
      profile.relatedLeadIds?.length
        ? strapi.db.query(LEAD_UID).findMany({
            where: { site: siteId, documentId: { $in: profile.relatedLeadIds }, deletedAt: null },
          })
        : [],
      profile.relatedQuoteIds?.length
        ? strapi.db.query(QUOTE_REQUEST_UID).findMany({
            where: { site: siteId, documentId: { $in: profile.relatedQuoteIds }, deletedAt: null },
          })
        : [],
      profile.relatedOrderIds?.length
        ? strapi.db.query(INTENT_ORDER_UID).findMany({
            where: { site: siteId, documentId: { $in: profile.relatedOrderIds }, deletedAt: null },
          })
        : [],
    ]);

    return { ...profile, leads, quotes, orders };
  },

  /**
   * 合并重复客户档案（把 source 的关联记录转移到 target，软删 source）
   */
  async merge(siteId: number, sourceId: string, targetId: string): Promise<any> {
    const [source, target] = await Promise.all([
      strapi.db.query(PROFILE_UID).findOne({ where: { site: siteId, documentId: sourceId, deletedAt: null } }),
      strapi.db.query(PROFILE_UID).findOne({ where: { site: siteId, documentId: targetId, deletedAt: null } }),
    ]);
    if (!source) throw new Error("源档案不存在");
    if (!target) throw new Error("目标档案不存在");

    // 合并关联 ID
    const mergeIds = (a: any, b: any): string[] => Array.from(new Set([...(Array.isArray(a) ? a : []), ...(Array.isArray(b) ? b : [])]));

    const relatedLeadIds = mergeIds(target.relatedLeadIds, source.relatedLeadIds);
    const relatedQuoteIds = mergeIds(target.relatedQuoteIds, source.relatedQuoteIds);
    const relatedOrderIds = mergeIds(target.relatedOrderIds, source.relatedOrderIds);

    const totalQuoteCount = (target.totalQuoteCount || 0) + (source.totalQuoteCount || 0);
    const totalOrderCount = (target.totalOrderCount || 0) + (source.totalOrderCount || 0);
    const totalOrderValue = Number(target.totalOrderValue || 0) + Number(source.totalOrderValue || 0);

    const updated = await strapi.db.query(PROFILE_UID).update({
      where: { documentId: targetId },
      data: {
        relatedLeadIds,
        relatedQuoteIds,
        relatedOrderIds,
        totalQuoteCount,
        totalOrderCount,
        totalOrderValue: Math.round(totalOrderValue * 100) / 100,
        lastQuoteAt: this._laterTime(source.lastQuoteAt, target.lastQuoteAt),
        lastOrderAt: this._laterTime(source.lastOrderAt, target.lastOrderAt),
      },
    });

    // 软删源档案
    await strapi.db.query(PROFILE_UID).update({
      where: { documentId: sourceId },
      data: { deletedAt: new Date().toISOString() },
    });

    return updated;
  },

  _extractPhone(contactStr: string): string {
    try {
      const contact = typeof contactStr === "string" ? JSON.parse(contactStr) : contactStr;
      if (Array.isArray(contact)) {
        const phone = contact.find((c: any) => c.type === "phone");
        return phone?.value || "";
      }
    } catch {}
    return "";
  },

  _computeStage(quoteCount: number, orderCount: number): string {
    if (orderCount >= 5) return "vip";
    if (orderCount >= 2) return "repeat";
    if (orderCount >= 1) return "active";
    if (quoteCount >= 1) return "active";
    return "lead";
  },

  _laterTime(a: string | null, b: string | null): string | null {
    if (!a) return b;
    if (!b) return a;
    return new Date(a).getTime() > new Date(b).getTime() ? a : b;
  },
});
