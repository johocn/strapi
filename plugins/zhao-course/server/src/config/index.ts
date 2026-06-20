export default {
  default: {
    // 课程插件默认配置
    points: {
      // 积分相关默认配置
      autoClaim: false, // 是否自动领取积分
    },
  },
  validator: (config: Record<string, unknown>) => {
    if (config.points && typeof config.points !== "object") {
      throw new Error("points 配置必须是对象");
    }
  },
};
