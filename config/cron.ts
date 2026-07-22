import logisticsCron from "../plugins/zhao-logistics/server/src/config/cron";
import zhaoTrackCron from "../plugins/zhao-track/server/src/config/cron";
import zhaoDealCron from "../plugins/zhao-deal/server/src/config/cron";

export default {
  ...logisticsCron,
  ...zhaoTrackCron,
  ...zhaoDealCron,
};
