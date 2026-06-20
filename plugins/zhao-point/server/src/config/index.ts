export default {
  default: {
    // 增加积分规则 (category: increase)
    increaseRules: {
      // 每日签到类 (taskGroup: daily)
      daily_sign_in:         { points: 5,    limitPerDay: 1,  isOneTime: false, description: "每日签到",         taskGroup: "daily", extraConfig: {} },
      daily_sign_in_streak:  { points: 10,   limitPerDay: 1,  isOneTime: false, description: "连续签到奖励",     taskGroup: "daily", extraConfig: { streakMilestones: [7, 14, 30], streakBonusPoints: [50, 100, 200] } },
      daily_first_login:     { points: 2,    limitPerDay: 1,  isOneTime: false, description: "每日首次登录",     taskGroup: "daily", extraConfig: {} },
      online_duration:       { points: 1,    limitPerDay: 0,  isOneTime: false, description: "在线时长(每10分钟)", taskGroup: "daily", extraConfig: {} },

      // 内容互动类 (taskGroup: interact)
      browse_article:        { points: 3,    limitPerDay: 10, isOneTime: false, description: "浏览文章",         taskGroup: "interact", extraConfig: {} },
      like_article:          { points: 1,    limitPerDay: 20, isOneTime: false, description: "文章点赞",         taskGroup: "interact", extraConfig: {} },
      comment_article:       { points: 2,    limitPerDay: 10, isOneTime: false, description: "文章评论",         taskGroup: "interact", extraConfig: {} },
      share_article:         { points: 3,    limitPerDay: 5,  isOneTime: false, description: "文章分享",         taskGroup: "interact", extraConfig: {} },
      watch_video:           { points: 5,    limitPerDay: 10, isOneTime: false, description: "观看视频",         taskGroup: "interact", extraConfig: {} },
      like_video:            { points: 1,    limitPerDay: 20, isOneTime: false, description: "视频点赞",         taskGroup: "interact", extraConfig: {} },
      comment_video:         { points: 2,    limitPerDay: 10, isOneTime: false, description: "视频评论",         taskGroup: "interact", extraConfig: {} },
      share_video:           { points: 3,    limitPerDay: 5,  isOneTime: false, description: "视频分享",         taskGroup: "interact", extraConfig: {} },

      // 广告类 (taskGroup: interact)
      click_ad:              { points: 1,    limitPerDay: 20, isOneTime: false, description: "点击广告",         taskGroup: "interact", extraConfig: {} },
      watch_ad:              { points: 3,    limitPerDay: 10, isOneTime: false, description: "观看完整广告视频", taskGroup: "interact", extraConfig: {} },

      // 学习类 (taskGroup: learn)
      complete_lesson:       { points: 10,   limitPerDay: 0,  isOneTime: false, description: "完成单个课时",     taskGroup: "learn", extraConfig: {} },
      complete_course:       { points: 50,   limitPerDay: 0,  isOneTime: false, description: "完成课程学习",     taskGroup: "learn", extraConfig: {} },
      review_course:         { points: 5,    limitPerDay: 5,  isOneTime: false, description: "课程评价",         taskGroup: "learn", extraConfig: {} },
      complete_quiz:         { points: 10,   limitPerDay: 0,  isOneTime: false, description: "完成答题",         taskGroup: "learn", extraConfig: {} },
      quiz_perfect:          { points: 20,   limitPerDay: 0,  isOneTime: false, description: "答题满分",         taskGroup: "learn", extraConfig: {} },
      quiz_pass:             { points: 0,    limitPerDay: 0,  isOneTime: false, description: "答题通过(动态积分)", taskGroup: "learn", extraConfig: {} },

      // 社交类 (taskGroup: social)
      invite_register:       { points: 100,  limitPerDay: 0,  isOneTime: false, description: "邀请好友注册",     taskGroup: "social", extraConfig: {} },
      invite_purchase:       { points: 200,  limitPerDay: 0,  isOneTime: false, description: "邀请好友消费",     taskGroup: "social", extraConfig: {} },
      follow_official_account: { points: 10, limitPerDay: 0,  isOneTime: true,  description: "关注公众号",     taskGroup: "social", extraConfig: {} },
      join_community:        { points: 20,   limitPerDay: 0,  isOneTime: true,  description: "加入社群",         taskGroup: "social", extraConfig: {} },

      // 用户类 (taskGroup: onetime)
      new_user_reward:       { points: 100,  limitPerDay: 0,  isOneTime: true,  description: "新用户注册奖励",   taskGroup: "onetime", extraConfig: {} },
      complete_profile:      { points: 20,   limitPerDay: 0,  isOneTime: true,  description: "完善个人资料",     taskGroup: "onetime", extraConfig: {} },
      bind_phone:            { points: 10,   limitPerDay: 0,  isOneTime: true,  description: "绑定手机号",       taskGroup: "onetime", extraConfig: {} },
      bind_wechat:           { points: 10,   limitPerDay: 0,  isOneTime: true,  description: "绑定微信",         taskGroup: "onetime", extraConfig: {} },
      birthday_reward:       { points: 50,   limitPerDay: 0,  isOneTime: true,  description: "生日奖励",         taskGroup: "onetime", extraConfig: {} },

      // 其他 (taskGroup: other)
      submit_feedback:       { points: 5,    limitPerDay: 3,  isOneTime: false, description: "提交反馈建议",     taskGroup: "other", extraConfig: {} },
      report_violation:      { points: 2,    limitPerDay: 5,  isOneTime: false, description: "举报违规",         taskGroup: "other", extraConfig: {} },
      purchase_course:       { points: 0,    limitPerDay: 0,  isOneTime: false, description: "购买课程(按金额比例)", taskGroup: "other", extraConfig: {} },
      browse_page:           { points: 2,    limitPerDay: 5,  isOneTime: false, description: "浏览特定页面",     taskGroup: "other", extraConfig: {} },
      task_complete:         { points: 10,   limitPerDay: 0,  isOneTime: false, description: "完成任务",         taskGroup: "other", extraConfig: {} },
      qr_scan_verify:        { points: 5,    limitPerDay: 3,  isOneTime: false, description: "扫码核销奖励",     taskGroup: "other", extraConfig: {} },
    },

    // 扣除积分规则 (category: decrease)
    decreaseRules: {
      redeem_gift:          { points: 0, description: "兑换礼品",   taskGroup: "redeem", extraConfig: {} },
      redeem_coupon:        { points: 0, description: "兑换优惠券", taskGroup: "redeem", extraConfig: {} },
      exchange_course:      { points: 0, description: "兑换课程",   taskGroup: "redeem", extraConfig: {} },
      exchange_membership:  { points: 0, description: "兑换会员",   taskGroup: "redeem", extraConfig: {} },
      lottery_cost:         { points: 0, description: "抽奖消耗",   taskGroup: "redeem", extraConfig: {} },
      unlock_content:       { points: 0, description: "解锁付费内容", taskGroup: "redeem", extraConfig: {} },
      cancel_order_penalty: { points: 10, description: "取消订单罚款", taskGroup: "penalty", extraConfig: {} },
      violation_penalty:    { points: 50, description: "违规扣分",   taskGroup: "penalty", extraConfig: {} },
      refund_deduct:        { points: 0, description: "退款扣回",   taskGroup: "penalty", extraConfig: {} },
      expiration_deduct:    { points: 0, description: "过期扣除",   taskGroup: "penalty", extraConfig: {} },
    },

    defaultOperator: "system",
  },
};
