import type { Core } from "@strapi/strapi";
import * as XLSX from "xlsx";
import { buildOrderWhere } from "./order";
import { dayStamp } from "./order-no";

const ORDER_UID = "plugin::zhao-tire.tire-order";

const STATUS_TEXT: Record<string, string> = {
  pending_accept: "待接单",
  accepted: "待入库",
  stored: "寄存中",
  pending_outbound: "待出库",
  completed: "已完成",
  rejected: "已拒绝",
  canceled: "已取消",
};

const SERVICE_TEXT: Record<string, string> = {
  store: "到店送存",
  pickup: "上门取送",
};

const CAR_TEXT: Record<string, string> = {
  sedan: "轿车",
  suv: "SUV",
  pickup: "皮卡",
};

const PAYMENT_TEXT: Record<string, string> = {
  unpaid: "未支付",
  deposit_paid: "已付定金",
  paid: "已支付",
};

const SLOT_TEXT: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
};

const toDate = (value: unknown): string =>
  value ? String(value).slice(0, 10) : "";

const toTime = (value: unknown): string => {
  if (!value) return "";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);
  return new Date(date.getTime() + 8 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 16)
    .replace("T", " ");
};

const toYuan = (value: unknown): number =>
  Math.round((Number(value) || 0)) / 100;

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async ordersExcel(query: any = {}) {
    const orders = await strapi.db.query(ORDER_UID).findMany({
      where: buildOrderWhere(query),
      orderBy: { createdAt: "DESC" },
      populate: { inboundPhotos: true },
    });

    const rows = orders.map((order: any) => ({
      订单号: order.orderNo,
      状态: STATUS_TEXT[order.status] || order.status,
      客户姓名: order.customerName,
      手机号: order.phone,
      车牌号: order.plateNo || "",
      车型: CAR_TEXT[order.carType] || order.carType || "",
      轮胎规格: order.tireSpec || "",
      带轮毂: order.withWheelRim ? "是" : "否",
      服务类型: SERVICE_TEXT[order.serviceType] || order.serviceType,
      上门日期: toDate(order.pickupDate),
      上门时段: SLOT_TEXT[order.pickupSlot] || "",
      寄存开始日: toDate(order.storageStartDate),
      预计取回日: toDate(order.expectedReturnDate),
      到期日: toDate(order.expireAt),
      月数: Number(order.months) || 0,
      "套餐费(元)": toYuan(order.amountPackage),
      "增值费(元)": toYuan(order.amountAddon),
      "订单总额(元)": toYuan(order.amountTotal),
      "已收(元)": toYuan(order.paidAmount),
      支付状态: PAYMENT_TEXT[order.paymentStatus] || order.paymentStatus,
      仓位: order.locationCode || "",
      入库照片数: (order.inboundPhotos || []).length,
      入库时间: toTime(order.inboundAt),
      出库时间: toTime(order.outboundAt),
      下单时间: toTime(order.createdAt),
      备注: order.note || "",
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
      { wch: 24 },
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "订单");
    const output: any = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return {
      buffer: Buffer.from(output),
      filename: `雪地胎订单-${dayStamp()}.xlsx`,
    };
  },
});
