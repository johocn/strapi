import { buildOrderWhere } from "../../services/order";
import { createError, sendError } from "../../utils/errors";

const ORDER_UID = "plugin::zhao-tire.tire-order";

const orderService = (): any => strapi.plugin("zhao-tire").service("order");

const readBody = (ctx: any): any => {
  const body = ctx.request?.body;
  if (!body || typeof body !== "object") return {};
  return body.data && typeof body.data === "object" ? body.data : body;
};

const requireId = (value: unknown): number => {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw createError("VALIDATION_FAILED", 400, "订单 id 不合法");
  }
  return id;
};

const operatorId = (ctx: any): number | undefined => {
  const id = Number(ctx.state?.user?.id);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const findOrderById = async (rawId: unknown): Promise<any> => {
  const id = requireId(rawId);
  const order = await strapi.db.query(ORDER_UID).findOne({ where: { id } });
  if (!order) {
    throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
  }
  return order;
};

const parsePhotoIds = (raw: any): number[] => {
  if (raw === undefined || raw === null || raw === "") return [];
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
  return list
    .map((item) =>
      item && typeof item === "object" ? (item as any).id : item
    )
    .map((item) => Number(item))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const bodyPhotoIds = (body: any): number[] => {
  const values = [
    body?.photoIds,
    body?.["photoIds[]"],
    body?.photos,
    body?.["photos[]"],
  ];
  return Array.from(new Set(values.flatMap(parsePhotoIds)));
};

const collectUploadedFiles = (ctx: any): any[] => {
  const files = ctx.request?.files;
  if (!files) return [];
  if (Array.isArray(files)) return files.filter(Boolean);

  const list: any[] = [];
  for (const value of Object.values(files)) {
    if (Array.isArray(value)) list.push(...value.filter(Boolean));
    else if (value) list.push(value);
  }
  return list;
};

const uploadPhotos = async (
  orderId: number,
  field: "inboundPhotos" | "outboundPhotos",
  files: any[]
): Promise<number[]> => {
  if (files.length === 0) return [];

  for (const file of files) {
    const mime = String(file?.mimetype || "");
    if (mime && !mime.startsWith("image/")) {
      throw createError("VALIDATION_FAILED", 400, "仅支持上传图片文件");
    }
  }

  const uploadService: any = strapi.plugin("upload").service("upload");
  const uploaded = await uploadService.upload({
    data: { refId: orderId, ref: ORDER_UID, field },
    files,
  });

  return (uploaded || [])
    .map((file: any) => Number(file?.id))
    .filter((id: number) => Number.isInteger(id) && id > 0);
};

export default {
  async find(ctx: any) {
    try {
      const query = ctx.query || {};
      const page = Math.max(1, Number(query.page) || 1);
      const pageSize = Math.min(
        100,
        Math.max(1, Number(query.pageSize) || 20)
      );
      const where = buildOrderWhere(query);

      const [data, total] = await Promise.all([
        strapi.db.query(ORDER_UID).findMany({
          where,
          orderBy: { createdAt: "DESC" },
          populate: { inboundPhotos: true, outboundPhotos: true },
          limit: pageSize,
          offset: (page - 1) * pageSize,
        }),
        strapi.db.query(ORDER_UID).count({ where }),
      ]);

      ctx.body = {
        data,
        pagination: {
          page,
          pageSize,
          total,
          pageCount: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async findOne(ctx: any) {
    try {
      const order = await strapi.db.query(ORDER_UID).findOne({
        where: { id: requireId(ctx.params.id) },
        populate: {
          inboundPhotos: true,
          outboundPhotos: true,
          storageOperator: true,
        },
      });
      if (!order) {
        throw createError("ORDER_NOT_FOUND", 404, "订单不存在");
      }
      ctx.body = { data: order };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async update(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      const result = await orderService().updateDetails(
        order.orderNo,
        readBody(ctx),
        operatorId(ctx)
      );
      ctx.body = result;
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async accept(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      ctx.body = await orderService().accept(order.orderNo, operatorId(ctx));
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async reject(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      const reason = String(readBody(ctx)?.reason || "").trim();
      ctx.body = await orderService().reject(
        order.orderNo,
        reason,
        operatorId(ctx)
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async approveOutbound(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      ctx.body = await orderService().approveOutbound(
        order.orderNo,
        operatorId(ctx)
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async rejectOutbound(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      const reason = String(readBody(ctx)?.reason || "").trim();
      ctx.body = await orderService().rejectOutbound(
        order.orderNo,
        reason,
        operatorId(ctx)
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async inbound(ctx: any) {
    try {
      const id = requireId(ctx.params.id);
      const order = await findOrderById(id);
      const body = readBody(ctx);
      const files = collectUploadedFiles(ctx);

      const photoIds = Array.from(
        new Set([
          ...(await uploadPhotos(id, "inboundPhotos", files)),
          ...bodyPhotoIds(body),
        ])
      );

      const locationCode = String(
        body?.locationCode || body?.location_code || ""
      ).trim();
      if (!locationCode) {
        throw createError("VALIDATION_FAILED", 400, "请填写仓位编号");
      }

      const result = await orderService().inbound(order.orderNo, {
        photos: photoIds,
        locationCode,
        operatorId: operatorId(ctx),
      });
      ctx.body = { ...result, photos: photoIds };
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async outbound(ctx: any) {
    try {
      const id = requireId(ctx.params.id);
      const order = await findOrderById(id);
      const body = readBody(ctx);

      const photoIds = Array.from(
        new Set([
          ...(await uploadPhotos(
            id,
            "outboundPhotos",
            collectUploadedFiles(ctx)
          )),
          ...bodyPhotoIds(body),
        ])
      );

      ctx.body = await orderService().outbound(order.orderNo, {
        photos: photoIds,
        operatorId: operatorId(ctx),
      });
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async payment(ctx: any) {
    try {
      const order = await findOrderById(ctx.params.id);
      ctx.body = await orderService().registerPayment(
        order.orderNo,
        readBody(ctx),
        operatorId(ctx)
      );
    } catch (error) {
      sendError(ctx, error);
    }
  },

  async exportExcel(ctx: any) {
    try {
      const exportService: any = strapi
        .plugin("zhao-tire")
        .service("export");
      const { buffer, filename } = await exportService.ordersExcel(
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
    } catch (error) {
      sendError(ctx, error);
    }
  },
};
