import point from "./point";
import pointAdmin from "./point-admin";
import activity from "./activity";
import series from "./series";
import calendar from "./calendar";
import activityStats from "./activity-stats";
import fee from "./fee";
import resource from "./resource";
import ledger from "./ledger";

// Strapi 以「控制器uid.action」精确匹配处理器（controller = uid 最后一个点之前的部分）。
// 嵌套控制器（resource.lecturers / resource.venues）需按完整 uid 单独注册才能被解析。
const resourceFactory = (args: any) => resource(args);

export default {
  point,
  "point-admin": pointAdmin,
  activity,
  series,
  calendar,
  "activity-stats": activityStats,
  fee,
  resource,
  ledger,
  "resource.lecturers": (args: any) => resourceFactory(args).lecturers,
  "resource.venues": (args: any) => resourceFactory(args).venues,
};
