import type { Core } from "@strapi/strapi";
import { createError } from "../utils/errors";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const CONFIG_UID = "plugin::zhao-tire.tire-config";
const EXCLUDED_STATUS = ["canceled", "rejected"];

export type SlotName = "morning" | "afternoon";

const LIMIT_FIELD: Record<SlotName, string> = {
  morning: "dailyPickupLimitMorning",
  afternoon: "dailyPickupLimitAfternoon",
};

const OTHER_SLOT: Record<SlotName, SlotName> = {
  morning: "afternoon",
  afternoon: "morning",
};

const getLimit = async (strapi: Core.Strapi, slot: SlotName): Promise<number> => {
  const config: any =
    (await strapi.documents(CONFIG_UID).findFirst({})) || {};
  const limit = Number(config[LIMIT_FIELD[slot]]);
  return Number.isFinite(limit) && limit > 0 ? limit : 6;
};

const countOrders = async (
  strapi: Core.Strapi,
  date: string,
  slot: SlotName
): Promise<number> => {
  return strapi.db.query(ORDER_UID).count({
    where: {
      pickupDate: date,
      pickupSlot: slot,
      status: { $notIn: EXCLUDED_STATUS },
    },
  });
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async remaining(date: string, slot: SlotName): Promise<number> {
    const usage = await this.usage(date, slot);
    return usage.remaining;
  },

  async usage(date: string, slot: SlotName) {
    if (slot !== "morning" && slot !== "afternoon") {
      throw createError("VALIDATION_FAILED", 400, "上门时段不合法");
    }
    const [limit, used] = await Promise.all([
      getLimit(strapi, slot),
      countOrders(strapi, date, slot),
    ]);
    return { date, slot, limit, used, remaining: Math.max(0, limit - used) };
  },

  async assertAvailable(date: string, slot: SlotName) {
    const usage = await this.usage(date, slot);
    if (usage.remaining <= 0) {
      const otherSlot = OTHER_SLOT[slot];
      const otherUsage = await this.usage(date, otherSlot);
      throw createError("SLOT_FULL", 409, "该上门时段已约满，请选择其他时段", {
        date,
        slot,
        limit: usage.limit,
        remaining: 0,
        alternatives:
          otherUsage.remaining > 0
            ? [{ slot: otherSlot, remaining: otherUsage.remaining }]
            : [],
      });
    }
    return usage;
  },
});
