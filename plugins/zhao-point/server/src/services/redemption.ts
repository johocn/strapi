import type { Core } from "@strapi/strapi";

const PRODUCT_UID = "plugin::zhao-point.point-product";
const REDEMPTION_UID = "plugin::zhao-point.point-redemption";
const RECORD_UID = "plugin::zhao-point.point-record";
const CHANNEL_MEMBER_UID = "plugin::zhao-channel.channel-member";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  const throwError = (code: string, message: string, details?: any) => {
    const err = new Error(message) as any;
    err.code = code;
    err.details = details;
    throw err;
  };

  const generatePickupCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  // ===== 商品管理 =====

  const createProduct = async (data: any) => {
    // 整数字段清洗：防止浮点精度泄漏（如 -2e-18）
    const intFields = ['pointsCost', 'stock', 'totalStock', 'maxPerUser', 'sortOrder'];
    for (const key of intFields) {
      if (data[key] !== undefined && data[key] !== null) {
        data[key] = Math.round(Number(data[key])) || 0;
      }
    }
    // 浮点字段清洗
    if (data.originalPrice !== undefined && data.originalPrice !== null) {
      data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
    }
    if (data.price !== undefined && data.price !== null) {
      data.price = Math.round(Number(data.price) * 100) / 100 || null;
    }
    // 解析 channel：documentId 转为数字 id
    if (data.channel && typeof data.channel === 'string') {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
        select: ['id'],
      });
      if (ch) data.channel = ch.id;
      else delete data.channel;
    }
    return await strapi.db.query(PRODUCT_UID).create({ data });
  };

  const updateProduct = async (id: string | number, data: any) => {
    // 整数字段清洗
    const intFields = ['pointsCost', 'stock', 'totalStock', 'maxPerUser', 'sortOrder'];
    for (const key of intFields) {
      if (data[key] !== undefined && data[key] !== null) {
        data[key] = Math.round(Number(data[key])) || 0;
      }
    }
    if (data.originalPrice !== undefined && data.originalPrice !== null) {
      data.originalPrice = Math.round(Number(data.originalPrice) * 100) / 100 || null;
    }
    if (data.price !== undefined && data.price !== null) {
      data.price = Math.round(Number(data.price) * 100) / 100 || null;
    }
    // 解析 channel：documentId 转为数字 id
    if (data.channel && typeof data.channel === 'string') {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: { $or: [{ id: !isNaN(Number(data.channel)) ? Number(data.channel) : -1 }, { documentId: String(data.channel) }] },
        select: ['id'],
      });
      if (ch) data.channel = ch.id;
      else delete data.channel;
    }
    // id 可能是 documentId，需转为数字 id
    let numericId = id;
    if (typeof id === 'string' && isNaN(Number(id))) {
      const product = await strapi.db.query(PRODUCT_UID).findOne({
        where: { documentId: id },
        select: ['id'],
      });
      if (!product) throwError("POINT_013", "商品不存在");
      numericId = product.id;
    }
    return await strapi.db.query(PRODUCT_UID).update({ where: { id: numericId }, data });
  };

  const deleteProduct = async (id: string | number) => {
    // id 可能是 documentId
    if (typeof id === 'string' && isNaN(Number(id))) {
      const product = await strapi.db.query(PRODUCT_UID).findOne({ where: { documentId: id }, select: ['id'] });
      if (!product) throwError("POINT_013", "商品不存在");
      return await strapi.db.query(PRODUCT_UID).delete({ where: { id: product.id } });
    }
    return await strapi.db.query(PRODUCT_UID).delete({ where: { id } });
  };

  const getProducts = async (filters?: {
    status?: string;
    deliveryType?: string;
    name?: string;
    page?: number;
    pageSize?: number;
    userId?: string | number;
  }) => {
    const { status, deliveryType, name, page = 1, pageSize = 20, userId } = filters || {};
    const where: any = { deletedAt: null, status: status || "on_shelf" };
    if (deliveryType) where.deliveryType = deliveryType;
    if (name) where.name = { $containsi: name };

    // 如果传入了 userId，按渠道过滤商品
    if (userId) {
      const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
        where: { user: userId },
        populate: { channel: { select: ['id'] } },
      });
      const userChannelIds = members.map((m: any) => m.channel?.id || m.channel).filter(Boolean);

      if (userChannelIds.length > 0) {
        where.$or = [
          { channel: { $in: userChannelIds } },
          { allowCrossChannel: true },
        ];
      } else {
        // 用户没有渠道归属，只看跨渠道商品
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
          channel: { select: ['id', 'documentId', 'name'] },
          coverImage: true,
          images: true,
        },
      }),
      strapi.db.query(PRODUCT_UID).count({ where }),
    ]);

    return { records, total, page, pageSize };
  };

  const getProduct = async (id: string | number, userId?: string | number) => {
    const where: any = { deletedAt: null };
    // 支持 documentId 查询
    if (typeof id === 'string' && isNaN(Number(id))) {
      where.documentId = id;
    } else {
      where.id = id;
    }
    const product = await strapi.db.query(PRODUCT_UID).findOne({
      where,
      select: [
        'id', 'documentId', 'name', 'subtitle', 'description', 'detail',
        'pointsCost', 'originalPrice', 'price', 'stock', 'totalStock',
        'deliveryType', 'salesMode', 'status', 'maxPerUser', 'sortOrder',
        'allowCrossChannel', 'allowGlobalPoints', 'createdAt', 'updatedAt',
      ],
      populate: {
        channel: { select: ['id', 'documentId', 'name'] },
        coverImage: true,
        images: true,
      },
    });

    // 如果传入了 userId，检查商品可见性
    if (userId && product) {
      if (product.allowCrossChannel) {
        return product;
      }
      const members = await strapi.db.query(CHANNEL_MEMBER_UID).findMany({
        where: { user: userId },
        populate: { channel: { select: ['id'] } },
      });
      const userChannelIds = members.map((m: any) => m.channel?.id || m.channel).filter(Boolean);
      const productChannelId = product.channel?.id || product.channel;
      if (!productChannelId || !userChannelIds.includes(productChannelId)) {
        return null;
      }
    }

    return product;
  };

  const adjustStock = async (id: string | number, delta: number) => {
    // 解析 documentId 为数字 id
    let numericId: string | number = id;
    if (typeof id === 'string' && isNaN(Number(id))) {
      const p = await strapi.db.query(PRODUCT_UID).findOne({ where: { documentId: id, deletedAt: null }, select: ['id'] });
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
      data: { stock: newStock },
    });
  };

  // ===== 兑换下单 =====

  const createRedemption = async (params: {
    userId: string | number;
    productId?: string | number;
    itemName?: string;
    pointsCost?: number;
    quantity?: number;
    deliveryType?: string;
    pickupLocationId?: string | number;
    receiverName?: string;
    receiverPhone?: string;
    receiverAddress?: string;
    remark?: string;
    channelId?: string | number;
    useGlobalPoints?: boolean;
    selectedChannels?: (string | number)[];
  }) => {
    const {
      userId, productId, itemName, pointsCost: manualPointsCost,
      quantity = 1, deliveryType, pickupLocationId, receiverName, receiverPhone,
      receiverAddress, remark, channelId, useGlobalPoints = false,
      selectedChannels: rawSelectedChannels = [],
    } = params;

    let finalItemName = itemName || "";
    let finalPointsCost = manualPointsCost || 0;
    let finalSalesMode: string = "points_only";
    let finalPrice: number = 0;
    let productNumericId: number | undefined;
    let productChannelId: number | undefined;
    let productAllowGlobalPoints: boolean = true;
    let productAllowCrossChannel: boolean = false;

    // 如果指定了商品ID，从商品读取信息
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

      // 根据销售模式确定积分消耗
      if (finalSalesMode === "points_only") {
        finalPointsCost = product.pointsCost;
      } else if (finalSalesMode === "hybrid") {
        finalPointsCost = product.pointsCost;
      } else {
        // purchase_only: 不消耗积分
        finalPointsCost = 0;
      }

      // 检查库存
      if (product.stock !== undefined && product.stock !== null && product.stock >= 0 && product.stock < quantity) {
        throwError("POINT_014", "商品库存不足");
      }

      // 检查用户兑换上限
      if (product.maxPerUser > 0) {
        const userRedemptions = await strapi.db.query(REDEMPTION_UID).count({
          where: {
            user: userId,
            product: product.id,
            status: { $in: ["pending", "approved", "shipped", "completed"] },
          },
        });
        if (userRedemptions + quantity > product.maxPerUser) {
          throwError("POINT_015", "已达该商品最大兑换数量");
        }
      }
    }

    // 解析 pickupLocationId（可能是 documentId，需转为数字 id）并验证渠道归属
    let pickupLocationNumericId: number | undefined;
    if (pickupLocationId) {
      const loc = await strapi.db.query("plugin::zhao-point.pickup-location").findOne({
        where: {
          deletedAt: null,
          $or: [
            { id: !isNaN(Number(pickupLocationId)) ? Number(pickupLocationId) : -1 },
            { documentId: String(pickupLocationId) },
          ],
        },
        populate: { channels: { select: ['id', 'documentId'] } },
      });
      if (!loc) {
        throwError("POINT_021", "自提点不存在");
      }
      // 验证自提点是否属于该商品的渠道
      if (productId && productChannelId) {
        const locChannelIds = (loc.channels || []).map((c: any) => c.id);
        if (!locChannelIds.includes(productChannelId)) {
          throwError("POINT_022", "该自提点不支持此商品的渠道");
        }
      }
      pickupLocationNumericId = loc.id;
    }

    // 解析 channelId：可能是 documentId，需转为数字 id
    let channelNumericId: number | undefined;
    if (channelId) {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: {
          $or: [
            { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
            { documentId: String(channelId) },
          ],
        },
        select: ['id'],
      });
      if (ch) channelNumericId = ch.id;
    }

    const totalPointsCost = finalPointsCost * quantity;
    const totalPriceAmount = finalPrice * quantity;

    // 检查积分余额：本渠道 → 其他渠道 → 全局积分
    // deductions 记录每个来源的扣减明细
    const deductions: { channelId: number | null; amount: number; channelName?: string }[] = [];
    // 商品无渠道归属时，视为全局商品，直接走全局积分
    const isGlobalProduct = !productChannelId;
    if (totalPointsCost > 0) {
      // 1. 计算本渠道余额（全局商品跳过此步）
      let ownChannelBalance = 0;
      if (productChannelId) {
        const channelRecords = await strapi.db.query(RECORD_UID).findMany({
          where: { user: userId, channel: productChannelId },
          select: ['points'],
        });
        ownChannelBalance = channelRecords.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
      }

      let remaining = totalPointsCost;

      // 第1级：扣本渠道积分（全局商品跳过，直接走全局）
      if (!isGlobalProduct && ownChannelBalance > 0 && remaining > 0) {
        const deduct = Math.min(ownChannelBalance, remaining);
        deductions.push({ channelId: productChannelId || null, amount: deduct });
        remaining -= deduct;
      }

      // 第2级：扣其他渠道积分（仅 allowCrossChannel=true 且用户选择了渠道，全局商品跳过）
      if (!isGlobalProduct && remaining > 0 && productAllowCrossChannel && rawSelectedChannels.length > 0) {
        // 解析 selectedChannels 为数字 ID
        const otherChannelIds: number[] = [];
        for (const chId of rawSelectedChannels) {
          if (typeof chId === 'string' && isNaN(Number(chId))) {
            const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { documentId: String(chId) },
              select: ['id', 'name'],
            });
            if (ch) otherChannelIds.push(ch.id);
          } else {
            const numId = Number(chId);
            if (numId > 0 && numId !== productChannelId) otherChannelIds.push(numId);
          }
        }

        // 按渠道逐个扣减
        for (const chId of otherChannelIds) {
          if (remaining <= 0) break;
          const chRecords = await strapi.db.query(RECORD_UID).findMany({
            where: { user: userId, channel: chId },
            select: ['points'],
          });
          const chBalance = chRecords.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
          if (chBalance > 0) {
            const deduct = Math.min(chBalance, remaining);
            // 查渠道名称
            const chInfo = await strapi.db.query("plugin::zhao-channel.channel").findOne({
              where: { id: chId },
              select: ['name'],
            });
            deductions.push({ channelId: chId, amount: deduct, channelName: chInfo?.name });
            remaining -= deduct;
          }
        }
      }

      // 第3级：扣全局积分（全局商品直接走全局，渠道商品需 allowGlobalPoints=true 且用户同意）
      if (remaining > 0 && (isGlobalProduct || (productAllowGlobalPoints && useGlobalPoints))) {
        const globalRecords = await strapi.db.query(RECORD_UID).findMany({
          where: { user: userId, channel: null },
          select: ['points'],
        });
        const globalBalance = globalRecords.reduce((sum: number, r: any) => sum + (r.points || 0), 0);
        if (globalBalance > 0) {
          const deduct = Math.min(globalBalance, remaining);
          deductions.push({ channelId: null, amount: deduct });
          remaining -= deduct;
        }
      }

      // 检查是否足够
      if (remaining > 0) {
        // 构造提示信息
        const totalAvailable = deductions.reduce((s, d) => s + d.amount, 0) + (remaining > 0 ? 0 : 0);
        const hints: string[] = [];
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
          hints,
        });
      }
    }

    // 事务：扣积分、扣库存、创建订单
    const result = await strapi.db.transaction(async () => {
      // 按扣减明细逐个创建积分记录
      if (totalPointsCost > 0 && deductions.length > 0) {
        const pointService = strapi.plugin("zhao-point").service("point");
        const latestBalance = await pointService.getBalance(userId);
        let cumulativeDeduct = 0;

        for (const d of deductions) {
          cumulativeDeduct += d.amount;
          const isGlobal = d.channelId === null;
          const methodSuffix = isGlobal
            ? "（全局积分补足）"
            : d.channelId !== productChannelId
              ? `（${d.channelName || '渠道' + d.channelId}积分补足）`
              : "";
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
              channel: d.channelId || undefined,
              createdAt: new Date(),
            },
          });
        }
      }

      // 扣减库存
      if (productId) {
        const product = await getProduct(productId);
        if (product.stock !== undefined && product.stock !== null && product.stock >= 0) {
          await strapi.db.query(PRODUCT_UID).update({
            where: { id: product.id },
            data: { stock: product.stock - quantity },
          });
        }
      }

      // 创建兑换记录
      // purchase_only（纯售价）无需审核，直接 approved
      const initialStatus = finalSalesMode === "purchase_only" ? "approved" : "pending";
      const redemption = await strapi.db.query(REDEMPTION_UID).create({
        data: {
          user: userId,
          product: productNumericId || undefined,
          itemName: finalItemName,
          pointsCost: finalPointsCost,
          quantity,
          totalCost: totalPointsCost,
          status: initialStatus,
          deliveryType: deliveryType || undefined,
          pickupCode: generatePickupCode(),
          pickupLocation: pickupLocationNumericId || undefined,
          salesMode: finalSalesMode,
          priceAmount: totalPriceAmount || undefined,
          pointsAmount: totalPointsCost || undefined,
          receiverName: receiverName || undefined,
          receiverPhone: receiverPhone || undefined,
          receiverAddress: receiverAddress || undefined,
          remark: remark || "",
          channel: channelNumericId || undefined,
          deductionDetail: deductions.length > 0 ? deductions : undefined,
          createdAt: new Date(),
        },
      });

      return redemption;
    });

    return result;
  };

  // ===== 兑换审核 =====

  const reviewRedemption = async (
    redemptionId: string | number,
    status: string,
    operatorId: string | number,
    extra?: { expressCompany?: string; trackingNumber?: string }
  ) => {
    // 解析 redemptionId：可能是 documentId，需转为数字 id
    let numericRedemptionId: string | number = redemptionId;
    if (typeof redemptionId === 'string' && isNaN(Number(redemptionId))) {
      const found = await strapi.db.query(REDEMPTION_UID).findOne({
        where: { documentId: redemptionId },
        select: ['id'],
      });
      if (!found) throwError("POINT_006", "兑换记录不存在", { redemptionId });
      numericRedemptionId = found.id;
    }

    const redemption = await strapi.db.query(REDEMPTION_UID).findOne({
      where: { id: numericRedemptionId },
      populate: { product: { select: ['id'] }, user: { select: ['id'] } },
    });

    if (!redemption) {
      throwError("POINT_006", "兑换记录不存在", { redemptionId });
    }

    const validTransitions: Record<string, string[]> = {
      pending: ["approved", "rejected", "cancelled"],
      approved: ["shipped", "cancelled"],
      shipped: ["completed"],
    };

    const allowedNext = validTransitions[redemption.status] || [];
    if (!allowedNext.includes(status)) {
      throwError("POINT_016", "兑换订单状态错误", {
        current: redemption.status,
        target: status,
        allowed: allowedNext,
      });
    }

    const now = new Date().toISOString();
    const updateData: any = { status, operator: operatorId };

    if (status === "shipped" || status === "completed" || status === "approved") {
      updateData.completedAt = now;
    }
    if (extra?.expressCompany) updateData.expressCompany = extra.expressCompany;
    if (extra?.trackingNumber) updateData.trackingNumber = extra.trackingNumber;

    // 驳回/取消：退积分+还库存
    if (status === "rejected" || status === "cancelled") {
      // 仅在有积分消耗时退积分
      if (redemption.totalCost > 0) {
        const pointService = strapi.plugin("zhao-point").service("point");
        const { balance } = await pointService.getBalance(redemption.user.id || redemption.user);
        const refundUserId = redemption.user.id || redemption.user;

        // 按原扣减明细分别退回
        const detail = redemption.deductionDetail;
        if (detail && Array.isArray(detail) && detail.length > 0) {
          let cumulativeRefund = 0;
          for (const d of detail) {
            cumulativeRefund += d.amount;
            const isGlobal = d.channelId === null;
            const channelLabel = isGlobal
              ? "全局积分"
              : d.channelName || `渠道${d.channelId}`;
            await strapi.db.query("plugin::zhao-point.point-record").create({
              data: {
                user: refundUserId,
                action: "manual_adjust",
                points: d.amount,
                balance: balance + cumulativeRefund,
                type: "increase",
                method: status === "rejected"
                  ? `兑换驳回退回${channelLabel}: ${redemption.itemName}`
                  : `兑换取消退回${channelLabel}: ${redemption.itemName}`,
                operator: operatorId,
                remark: `兑换记录 #${redemptionId} ${status === "rejected" ? "被驳回" : "已取消"}，退回${channelLabel}`,
                channel: d.channelId || undefined,
                createdAt: new Date(),
              },
            });
          }
        } else {
          // 兼容旧记录（无 deductionDetail），退回总额到无渠道
          await strapi.db.query("plugin::zhao-point.point-record").create({
            data: {
              user: refundUserId,
              action: "manual_adjust",
              points: redemption.totalCost,
              balance: balance + redemption.totalCost,
              type: "increase",
              method: status === "rejected" ? `兑换驳回退回积分: ${redemption.itemName}` : `兑换取消退回积分: ${redemption.itemName}`,
              operator: operatorId,
              remark: `兑换记录 #${redemptionId} ${status === "rejected" ? "被驳回" : "已取消"}，退回积分`,
              createdAt: new Date(),
            },
          });
        }
      }

      // 恢复库存
      if (redemption.product) {
        const productId = redemption.product.id || redemption.product;
        const product = await strapi.db.query(PRODUCT_UID).findOne({ where: { id: productId, deletedAt: null } });
        if (product && product.stock !== undefined && product.stock !== null && product.stock >= 0) {
          await strapi.db.query(PRODUCT_UID).update({
            where: { id: productId },
            data: { stock: product.stock + redemption.quantity },
          });
        }
      }
    }

    return await strapi.db.query(REDEMPTION_UID).update({
      where: { id: numericRedemptionId },
      data: updateData,
    });
  };

  const getRedemptions = async (filters?: {
    status?: string;
    userId?: string | number;
    deliveryType?: string;
    page?: number;
    pageSize?: number;
    startDate?: string;
    endDate?: string;
  }) => {
    const { status, userId, deliveryType, page = 1, pageSize = 20, startDate, endDate } = filters || {};
    const where: any = { deletedAt: null };
    if (status) where.status = status;
    if (userId) where.user = userId;
    if (deliveryType) where.deliveryType = deliveryType;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.$gte = startDate;
      if (endDate) where.createdAt.$lte = endDate;
    }

    const [records, total] = await Promise.all([
      strapi.db.query(REDEMPTION_UID).findMany({
        where,
        orderBy: { createdAt: "desc" },
        offset: (page - 1) * pageSize,
        limit: pageSize,
        populate: {
          pickupLocation: { select: ['id', 'documentId', 'name', 'address', 'phone', 'latitude', 'longitude'] },
          product: { select: ['id', 'documentId', 'name'], populate: { coverImage: true } },
          user: { select: ['id', 'documentId', 'username'] },
        },
      }),
      strapi.db.query(REDEMPTION_UID).count({ where }),
    ]);

    return { records, total, page, pageSize };
  };

  const getRedemption = async (id: string | number) => {
    const where: any = { deletedAt: null };
    if (typeof id === 'string' && isNaN(Number(id))) {
      where.documentId = id;
    } else {
      where.id = id;
    }
    return await strapi.db.query(REDEMPTION_UID).findOne({
      where,
      populate: {
        pickupLocation: { select: ['id', 'documentId', 'name', 'address', 'phone', 'latitude', 'longitude'] },
        product: { select: ['id', 'documentId', 'name'] },
        user: { select: ['id', 'documentId', 'username', 'name'] },
      },
    });
  };

  const getUserRedemptions = async (
    userId: string | number,
    filters?: { status?: string; page?: number; pageSize?: number }
  ) => {
    return await getRedemptions({ ...filters, userId });
  };

  const verifyRedemption = async (pickupCode: string, operatorId: string | number) => {
    if (!pickupCode) {
      throwError("POINT_020", "提货码不能为空");
    }

    const redemption = await strapi.db.query(REDEMPTION_UID).findOne({
      where: { pickupCode, deletedAt: null },
      populate: { pickupLocation: { select: ['id', 'documentId', 'name', 'address', 'phone', 'latitude', 'longitude'] } },
    });

    if (!redemption) {
      throwError("POINT_023", "提货码无效，未找到对应兑换记录");
    }

    // Only approved orders can be verified
    if (redemption.status !== 'approved') {
      throwError("POINT_025", "订单状态不允许核销", { currentStatus: redemption.status });
    }

    // Mark as completed
    const now = new Date().toISOString();
    return await strapi.db.query(REDEMPTION_UID).update({
      where: { id: redemption.id },
      data: {
        status: 'completed',
        operator: operatorId,
        completedAt: now,
      },
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
    verifyRedemption,
  };
};
