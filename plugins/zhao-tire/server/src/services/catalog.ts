import type { Core } from "@strapi/strapi";
import { createError } from "../utils/errors";

const CONFIG_UID = "plugin::zhao-tire.tire-config";

type CollectionName = "packages" | "addons" | "faqs" | "reviews" | "gallery";

type CollectionDef = {
  uid: string;
  fields: string[];
  mediaField?: string;
  usesDocumentService?: boolean;
};

const COLLECTIONS: Record<CollectionName, CollectionDef> = {
  packages: {
    uid: "plugin::zhao-tire.tire-package",
    fields: [
      "name",
      "code",
      "baseMonths",
      "freeDays",
      "storePrice",
      "pickupPrice",
      "extraMonthPrice",
      "overdueDayPrice",
      "durationText",
      "highlights",
      "enabled",
      "sort",
    ],
    usesDocumentService: true,
  },
  addons: {
    uid: "plugin::zhao-tire.tire-addon",
    fields: ["name", "code", "price", "unitText", "enabled", "sort"],
    usesDocumentService: true,
  },
  faqs: {
    uid: "plugin::zhao-tire.tire-faq",
    fields: ["question", "answer", "sort", "enabled"],
  },
  reviews: {
    uid: "plugin::zhao-tire.tire-review",
    fields: ["nickname", "content", "rating", "showOnHome", "sort"],
  },
  gallery: {
    uid: "plugin::zhao-tire.tire-gallery",
    fields: ["caption", "sort"],
    mediaField: "image",
  },
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
  "agreementVersion",
  "smsReminderEnabled",
  "overdueAutoStartDate",
  "maxStorageDate",
  "announcement",
  "smsTemplateOverride",
];

const CONFIG_MEDIA_FIELDS: Array<{ field: string; inputKey: string }> = [
  { field: "bannerImage", inputKey: "bannerImageId" },
  { field: "wechatQr", inputKey: "wechatQrId" },
];

const getCollection = (name: CollectionName): CollectionDef => {
  const def = COLLECTIONS[name];
  if (!def) {
    throw createError("VALIDATION_FAILED", 400, `未知的内容类型：${name}`);
  }
  return def;
};

const pickFields = (input: any, fields: string[]) => {
  const data: any = {};
  for (const field of fields) {
    if (input?.[field] !== undefined) data[field] = input[field];
  }
  return data;
};

const requireId = (id: unknown): number => {
  const value = Number(id);
  if (!Number.isInteger(value) || value <= 0) {
    throw createError("VALIDATION_FAILED", 400, "记录 id 不合法");
  }
  return value;
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(name: CollectionName) {
    const def = getCollection(name);
    return strapi.db.query(def.uid).findMany({
      orderBy: { sort: "ASC" },
      ...(def.mediaField ? { populate: { [def.mediaField]: true } } : {}),
    });
  },

  async create(name: CollectionName, payload: any = {}) {
    const def = getCollection(name);
    const input = payload?.data ?? payload;
    const data = pickFields(input, def.fields);

    if (def.mediaField && input?.imageId !== undefined) {
      data[def.mediaField] = input.imageId
        ? { id: requireId(input.imageId) }
        : null;
    }

    if (def.usesDocumentService) {
      return strapi.documents(def.uid as any).create({ data });
    }
    return strapi.db.query(def.uid).create({ data });
  },

  async update(name: CollectionName, id: unknown, payload: any = {}) {
    const def = getCollection(name);
    const recordId = requireId(id);
    const input = payload?.data ?? payload;
    const data = pickFields(input, def.fields);

    if (def.mediaField && input?.imageId !== undefined) {
      data[def.mediaField] = input.imageId
        ? { id: requireId(input.imageId) }
        : null;
    }

    if (Object.keys(data).length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }

    if (def.usesDocumentService) {
      const existing: any = await strapi.db.query(def.uid).findOne({
        where: { id: recordId },
        select: ["id", "documentId"],
      });
      if (!existing) {
        throw createError("ORDER_NOT_FOUND", 404, "记录不存在");
      }
      return strapi.documents(def.uid as any).update({
        documentId: existing.documentId,
        data,
      });
    }

    return strapi.db.query(def.uid).update({
      where: { id: recordId },
      data,
    });
  },

  async remove(name: CollectionName, id: unknown) {
    const def = getCollection(name);
    const recordId = requireId(id);

    if (def.usesDocumentService) {
      const existing: any = await strapi.db.query(def.uid).findOne({
        where: { id: recordId },
        select: ["id", "documentId"],
      });
      if (!existing) {
        throw createError("ORDER_NOT_FOUND", 404, "记录不存在");
      }
      await strapi.documents(def.uid as any).delete({
        documentId: existing.documentId,
      });
      return { id: recordId, deleted: true };
    }

    await strapi.db.query(def.uid).delete({ where: { id: recordId } });
    return { id: recordId, deleted: true };
  },

  async getConfig() {
    const config = await strapi.documents(CONFIG_UID as any).findFirst({
      populate: { bannerImage: true, wechatQr: true },
    });
    return config || {};
  },

  async updateConfig(payload: any = {}) {
    const input = payload?.data ?? payload;
    const data = pickFields(input, CONFIG_FIELDS);

    if (data.agreementVersion !== undefined) {
      const version = String(data.agreementVersion ?? "").trim();
      if (version && !/^\d{4}\.\d{2}\.\d{2}-\d+$/.test(version)) {
        throw createError(
          "VALIDATION_FAILED",
          400,
          "条款版本号格式应为 YYYY.MM.DD-N，例如 2026.11.05-1"
        );
      }
      data.agreementVersion = version || null;
    }

    for (const media of CONFIG_MEDIA_FIELDS) {
      if (input?.[media.inputKey] !== undefined) {
        data[media.field] = input[media.inputKey]
          ? { id: requireId(input[media.inputKey]) }
          : null;
      }
    }

    if (Object.keys(data).length === 0) {
      throw createError("VALIDATION_FAILED", 400, "没有可更新的字段");
    }

    const existing: any = await strapi.documents(CONFIG_UID as any).findFirst(
      {}
    );
    const populate = { bannerImage: true, wechatQr: true };

    if (existing?.documentId) {
      return strapi.documents(CONFIG_UID as any).update({
        documentId: existing.documentId,
        data,
        populate,
      } as any);
    }

    return strapi.documents(CONFIG_UID as any).create({ data });
  },
});
