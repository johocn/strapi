import type { Core } from "@strapi/strapi";

const ORDER_UID = "plugin::zhao-tire.tire-order";
const ACTIVE_STATUSES = ["stored", "pending_outbound"];

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async list(query: any = {}) {
    const page = Math.max(1, Number(query?.page) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, Number(query?.pageSize) || 20)
    );
    const keyword = String(query?.keyword || "").trim();

    const where: any = {};
    if (keyword) {
      where.$or = [
        { phone: { $containsi: keyword } },
        { customerName: { $containsi: keyword } },
        { plateNo: { $containsi: keyword } },
      ];
    }

    const orders = await strapi.db.query(ORDER_UID).findMany({
      where,
      orderBy: { createdAt: "DESC" },
    });

    const byPhone = new Map<string, any>();
    for (const order of orders) {
      const phone = String(order.phone || "").trim();
      if (!phone) continue;

      let entry = byPhone.get(phone);
      if (!entry) {
        entry = {
          phone,
          customerName: order.customerName || "",
          orderCount: 0,
          storedCount: 0,
          totalAmount: 0,
          latestOrderNo: order.orderNo,
          latestCreatedAt: order.createdAt,
          orders: [],
        };
        byPhone.set(phone, entry);
      }

      entry.orderCount += 1;
      entry.totalAmount += Number(order.amountTotal) || 0;
      if (ACTIVE_STATUSES.includes(order.status)) entry.storedCount += 1;
      entry.orders.push({
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        serviceType: order.serviceType,
        plateNo: order.plateNo || "",
        locationCode: order.locationCode || "",
        createdAt: order.createdAt,
        expireAt: order.expireAt,
        amountTotal: Number(order.amountTotal) || 0,
        paidAmount: Number(order.paidAmount) || 0,
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
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },
});
