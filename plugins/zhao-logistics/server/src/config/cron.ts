import type { Core } from "@strapi/strapi";

const SHIPMENT_UID = "plugin::zhao-logistics.tracking-shipment";
const SUBSCRIPTION_UID = "plugin::zhao-logistics.subscription";

/**
 * zhao-logistics 定时任务
 * - 每 10 分钟同步活跃运单轨迹
 * - 每 30 分钟处理订阅通知（检测新节点）
 */
const cronTasks: Record<string, Core.CronTaskConfig> = {
  // 每 10 分钟同步活跃运单轨迹
  "*/10 * * * *": {
    task: async ({ strapi }) => {
      const logger = strapi.log;
      logger.info("[zhao-logistics cron] 开始同步运单轨迹...");

      try {
        const tenMinutesAgo = new Date(
          Date.now() - 10 * 60 * 1000
        ).toISOString();
        const shipments = await strapi.db.query(SHIPMENT_UID).findMany({
          where: {
            deletedAt: null,
            status: { $in: ["pending", "in_transit", "customs", "hold"] },
            $or: [
              { lastSyncAt: null },
              { lastSyncAt: { $lt: tenMinutesAgo } },
            ],
          },
          populate: { syncProvider: true },
          limit: 50,
        });

        let successCount = 0;
        for (const shipment of shipments) {
          if (!shipment.syncProvider || !shipment.syncProvider.isEnabled)
            continue;
          try {
            const siteConfig = shipment.site;
            const siteId =
              typeof siteConfig === "number" ? siteConfig : siteConfig?.id;
            if (!siteId) continue;

            await strapi
              .plugin("zhao-logistics")
              .service("tracking-aggregator")
              .syncFromProvider(siteId, shipment.trackingNo);
            successCount++;
          } catch (err: any) {
            logger.error(
              `[zhao-logistics cron] 运单 ${shipment.trackingNo} 同步失败: ${err.message}`
            );
          }
        }

        logger.info(
          `[zhao-logistics cron] 同步完成: ${successCount}/${shipments.length} 成功`
        );
      } catch (err: any) {
        logger.error(`[zhao-logistics cron] 追踪同步任务异常: ${err.message}`);
      }
    },
    options: { tz: "Asia/Shanghai" },
  },

  // 每 30 分钟处理订阅通知（检测新节点/异常状态）
  "*/30 * * * *": {
    task: async ({ strapi }) => {
      const logger = strapi.log;
      logger.info("[zhao-logistics cron] 开始处理订阅通知...");

      try {
        const subscriptions = await strapi.db
          .query(SUBSCRIPTION_UID)
          .findMany({
            where: {
              subscriberType: "tracking_update",
              isActive: true,
              deletedAt: null,
            },
            limit: 100,
          });

        let notifyCount = 0;
        for (const sub of subscriptions) {
          const siteConfig = sub.site;
          const siteId =
            typeof siteConfig === "number" ? siteConfig : siteConfig?.id;
          if (!siteId || !sub.trackingNo) continue;

          try {
            const shipment = await strapi.db.query(SHIPMENT_UID).findOne({
              where: {
                site: siteId,
                trackingNo: sub.trackingNo,
                deletedAt: null,
              },
            });
            if (!shipment) continue;

            const lastSync = shipment.lastSyncAt
              ? new Date(shipment.lastSyncAt).getTime()
              : 0;
            const lastNotified = sub.lastNotifiedAt
              ? new Date(sub.lastNotifiedAt).getTime()
              : 0;

            if (lastSync > lastNotified) {
              // 有新节点，更新通知时间（实际通知发送逻辑视业务扩展）
              await strapi.db.query(SUBSCRIPTION_UID).update({
                where: { documentId: sub.documentId },
                data: {
                  lastNotifiedAt: new Date().toISOString(),
                  notifyCount: (sub.notifyCount || 0) + 1,
                },
              });
              notifyCount++;
            }
          } catch (err: any) {
            logger.error(
              `[zhao-logistics cron] 订阅 ${sub.documentId} 处理失败: ${err.message}`
            );
          }
        }

        logger.info(
          `[zhao-logistics cron] 订阅处理完成: ${notifyCount}/${subscriptions.length} 有更新`
        );
      } catch (err: any) {
        logger.error(`[zhao-logistics cron] 订阅通知任务异常: ${err.message}`);
      }
    },
    options: { tz: "Asia/Shanghai" },
  },
};

export default cronTasks;
