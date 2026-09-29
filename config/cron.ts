import logisticsCron from "../plugins/zhao-logistics/server/src/config/cron";
import zhaoTrackCron from "../plugins/zhao-track/server/src/config/cron";
import zhaoDealCron from "../plugins/zhao-deal/server/src/config/cron";

// cluster 多实例部署时，定时任务只在 0 号实例注册，避免重复执行
const isPrimaryInstance = !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === "0";

export default isPrimaryInstance
  ? {
      ...logisticsCron,
      ...zhaoTrackCron,
      ...zhaoDealCron,
    }
  : {};