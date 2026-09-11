import bcrypt from "bcryptjs";
import type { Core } from "@strapi/strapi";

const bootstrap = async ({ strapi }: { strapi: Core.Strapi }) => {
  strapi.log.info("[zhao-sso] Plugin bootstrapped");

  // Seed 活动 SOP 消息模板 + active 版本（幂等按 code；模板不存落地页 link，link 由 sop-rule.link 或触发 payload 提供）
  const TEMPLATE_UID_ACT = "plugin::zhao-sso.msg-template";
  const VERSION_UID_ACT = "plugin::zhao-sso.msg-template-version";
  const DEFAULT_SOP_TEMPLATES = [
    // act_confirm 绑定「会议报名成功通知」模板；字段映射与 signup 埋点 params 对应（const12 会议资料为常量不填）
    { code: "act_confirm", name: "活动报名成功确认", desc: "报名成功立即发送", wxTemplateId: "EBB10k3Lpl-u8su8dFeK5Y_E8F88hn93FTzhtXeAsgQ", wxTemplateFields: [
      { name: "thing2", key: "activityName" },
      { name: "thing4", key: "activityLocation" },
      { name: "time6", key: "meetingTime" },
    ]},
    // 以下 4 个活动提醒模板：wxTemplateId 需运营在公众号申请后于后台 msg-template 填入；这里先预填与 act_confirm 一致的字段结构（字段 key 可按实际申请到的微信模板在后台微调），让后台填好 ID 后即可点发，无需重建 dist 改代码。
    { code: "act_before", name: "活动开始前提醒", desc: "活动开始前 24h 提醒", wxTemplateFields: [
      { name: "thing2", key: "activityName" },
      { name: "thing4", key: "activityLocation" },
      { name: "time6", key: "meetingTime" },
    ]},
    { code: "act_receipt", name: "活动结束回执（感谢+评价邀请）", desc: "活动结束到场用户回执", wxTemplateFields: [
      { name: "thing2", key: "activityName" },
      { name: "thing4", key: "activityLocation" },
      { name: "time6", key: "meetingTime" },
    ]},
    { code: "act_repurchase", name: "复购/转介邀请", desc: "活动结束到场用户次日复购/转介触达", wxTemplateFields: [
      { name: "thing2", key: "activityName" },
      { name: "thing4", key: "activityLocation" },
      { name: "time6", key: "meetingTime" },
    ]},
    { code: "act_noshow_revisit", name: "未到场挽回", desc: "活动结束未到场用户次日挽回", wxTemplateFields: [
      { name: "thing2", key: "activityName" },
      { name: "thing4", key: "activityLocation" },
      { name: "time6", key: "meetingTime" },
    ]},
    { code: "admin_notify", name: "手动SOP待办管理员微信提醒", desc: "生成手动SOP待办时推送给管理员" },
  ];
  for (const t of DEFAULT_SOP_TEMPLATES) {
    let tpl = await strapi.db.query(TEMPLATE_UID_ACT).findOne({ where: { code: t.code } });
    if (!tpl) {
      tpl = await strapi.db.query(TEMPLATE_UID_ACT).create({ data: { code: t.code, name: t.name, provider: "wechat", content: "（shenglin SOP 模板）", isEnabled: true, description: t.desc, wxTemplateId: t.wxTemplateId || null, wxTemplateFields: t.wxTemplateFields || null } });
      strapi.log.info(`[zhao-sso] SOP template seeded: ${t.code}`);
    } else {
      // 幂等补配微信模板配置（存量模板在重启时自动更新，无需重建 dist 后手动改库）。
      // 注：wxTemplateId 与 wxTemplateFields 分开判定，保证「仅填字段映射、ID 留给运营后台后补」的模板也能把字段写进库。
      const patch: any = {};
      if (t.wxTemplateId && tpl.wxTemplateId !== t.wxTemplateId) patch.wxTemplateId = t.wxTemplateId;
      if (t.wxTemplateFields && JSON.stringify(tpl.wxTemplateFields) !== JSON.stringify(t.wxTemplateFields)) patch.wxTemplateFields = t.wxTemplateFields;
      if (Object.keys(patch).length) {
        await strapi.db.query(TEMPLATE_UID_ACT).update({ where: { id: tpl.id }, data: patch });
        strapi.log.info(`[zhao-sso] SOP template wx config updated: ${t.code}`);
      }
    }
    let ver = await strapi.db.query(VERSION_UID_ACT).findOne({ where: { code: `${t.code}_v1` } });
    if (!ver) {
      await strapi.db.query(VERSION_UID_ACT).create({ data: { template: tpl.id, code: `${t.code}_v1`, name: `${t.name} v1`, status: "active", weight: 1, clickCount: 0, sentCount: 0, successCount: 0 } });
      strapi.log.info(`[zhao-sso] SOP template version seeded: ${t.code}_v1`);
    }
  }

  // 从环境变量读取默认密钥,未配置时跳过创建(避免硬编码密钥上生产)
  const rawSecret = process.env.SSO_DEFAULT_APP_SECRET;
  if (!rawSecret) {
    strapi.log.warn("[zhao-sso] SSO_DEFAULT_APP_SECRET 未配置,跳过默认应用创建(请在 .env 中设置)");
    return;
  }
  const hashedSecret = await bcrypt.hash(rawSecret, 10);

  // 确保 'course' 应用存在（与 zhao-common getPublicConfig 的 ssoAppCode 默认值一致）
  const courseApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "course" },
  });
  if (!courseApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "course",
        app_name: "课程应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=course)");
  }

  // 向后兼容：如果旧版 'default' 应用存在则保留，不存在则创建一份（供历史 app_code=default 的请求使用）
  const defaultApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "default" },
  });
  if (!defaultApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "default",
        app_name: "默认应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=default)");
  }

  // 确保 'wealth' 应用存在（理财应用）
  const wealthApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "wealth" },
  });
  if (!wealthApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "wealth",
        app_name: "理财应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=wealth)");
  }

  // 确保 'e-joho-app' 应用存在
  const eJohoApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: "e-joho-app" },
  });
  if (!eJohoApp) {
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: "e-joho-app",
        app_name: "E-Joho 应用",
        app_secret: hashedSecret,
        redirect_uris: ["http://localhost:*"],
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info("[zhao-sso] Default app created (app_code=e-joho-app)");
  }

  // 确保 Vendure 商城各租户的 SSO 应用存在
  // 与 vendure 仓库 china-data/02-default-channel.ts、03-shop-a-channel.ts 的 ssoProviders 配置对应：
  //   - vendure-default: 默认租户（default channel），clientSecret 明文 = 'default-app-secret'
  //   - vendure-shop-a: shop-a 租户（shop-a channel），clientSecret 明文 = 'shop-a-app-secret'
  const vendureApps = [
    { app_code: "vendure-default", app_name: "Vendure 商城默认租户", rawSecret: "default-app-secret" },
    { app_code: "vendure-shop-a", app_name: "Vendure 商城 shop-a 租户", rawSecret: "shop-a-app-secret" },
  ];
  // vshop 实际回调地址为 ${window.location.origin}/pages/login/index，生产域名为 e.joho.cn
  const vendureRedirectUris = ["https://e.joho.cn/*", "http://localhost:*"];
  for (const { app_code, app_name, rawSecret } of vendureApps) {
    const existing = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
      where: { app_code },
    });
    if (existing) {
      // 存量记录：更新 redirect_uris（幂等，避免历史配置残留 shop.joho.cn）
      const newUris = JSON.stringify(vendureRedirectUris);
      const oldUris = JSON.stringify(existing.redirect_uris || []);
      if (oldUris !== newUris) {
        await strapi.db.query("plugin::zhao-sso.sso-app").update({
          where: { id: existing.id },
          data: { redirect_uris: vendureRedirectUris },
        });
        strapi.log.info(`[zhao-sso] Vendure app redirect_uris updated (app_code=${app_code})`);
      }
    } else {
      const vendureSecret = await bcrypt.hash(rawSecret, 10);
      await strapi.db.query("plugin::zhao-sso.sso-app").create({
        data: {
          app_code,
          app_name,
          app_secret: vendureSecret,
          redirect_uris: vendureRedirectUris,
          allowed_grant_types: ["authorization_code", "refresh_token"],
          is_active: true,
        },
      });
      strapi.log.info(`[zhao-sso] Vendure app created (app_code=${app_code})`);
    }
  }

  // www.youshop.cn C 端商城（nshop）SSO 应用。
  // 与 vendure 仓库 china-data/02-default-channel.ts 及各租户渠道 runtime authConfig 的 ssoProviders 对应，
  // 所有 youshop 渠道共用同一个 app，由 channel_code 区分渠道；clientSecret 明文 = 'youshop-app-secret'
  // 注：www.youshop.cn(nshop) 与 e.joho.cn(vshop 商城，同解析到 __default_channel__) 共用此 app，
  //     故回调白名单同时放行两个域名。
  const YOUSHOP_APP_CODE = "vendure-youshop";
  const YOUSHOP_REDIRECT_URIS = ["https://www.youshop.cn/*", "https://e.joho.cn/*", "http://localhost:*"];
  const youshopApp = await strapi.db.query("plugin::zhao-sso.sso-app").findOne({
    where: { app_code: YOUSHOP_APP_CODE },
  });
  if (youshopApp) {
    const newUris = JSON.stringify(YOUSHOP_REDIRECT_URIS);
    const oldUris = JSON.stringify(youshopApp.redirect_uris || []);
    if (oldUris !== newUris) {
      await strapi.db.query("plugin::zhao-sso.sso-app").update({
        where: { id: youshopApp.id },
        data: { redirect_uris: YOUSHOP_REDIRECT_URIS },
      });
      strapi.log.info(`[zhao-sso] youshop app redirect_uris updated (app_code=${YOUSHOP_APP_CODE})`);
    }
  } else {
    const youshopSecret = await bcrypt.hash("youshop-app-secret", 10);
    await strapi.db.query("plugin::zhao-sso.sso-app").create({
      data: {
        app_code: YOUSHOP_APP_CODE,
        app_name: "Vendure 商城 youshop 租户",
        app_secret: youshopSecret,
        redirect_uris: YOUSHOP_REDIRECT_URIS,
        allowed_grant_types: ["authorization_code", "refresh_token"],
        is_active: true,
      },
    });
    strapi.log.info(`[zhao-sso] youshop app created (app_code=${YOUSHOP_APP_CODE})`);
  }

  // Seed 默认自动化 SOP 规则（幂等按 code；运营可在后台改 templateCode/enabled/delay）
  const RULE_UID = "plugin::zhao-sso.sop-rule";
  const DEFAULT_SOP_RULES = [
    { code: "act_confirm", name: "活动报名成功确认", source: "event", event: "activity.signup", templateCode: "act_confirm", scene: "activity.confirm", delayMinutes: 0, enabled: true, description: "报名成功立即发送" },
    { code: "act_before", name: "活动开始前提醒", source: "event", event: "activity.signup", templateCode: "act_before", scene: "activity.before", delayMinutes: 0, enabled: true, description: "业务按活动开始时间排期覆盖定时" },
    { code: "act_noshow_revisit", name: "未到场回访", source: "event", event: "activity.closed", templateCode: "act_noshow_revisit", scene: "activity.noshow", delayMinutes: 0, enabled: true, description: "活动结束后对未签到者回访" },
    { code: "course_d7", name: "课后7天SOP", source: "event", event: "course.enrolled", templateCode: "course_d7", scene: "course.d7", delayMinutes: 0, enabled: true, description: "购课/报名后按 1/3/7 天排期发送" },
  ];
  for (const rule of DEFAULT_SOP_RULES) {
    const existing = await strapi.db.query(RULE_UID).findOne({ where: { code: rule.code } });
    if (!existing) {
      await strapi.db.query(RULE_UID).create({ data: rule });
      strapi.log.info(`[zhao-sso] SOP rule seeded: ${rule.code}`);
    }
  }

  // 存量邀请码对齐回填（一次性，幂等）：设置 SSO_BACKFILL_INVITE_ALIGN=1 时在启动期执行，
  // 保证每个 sso_user 都有自有码，并把 sso_id / invite_code / nickname 对齐到 up_users、
  // 建立 zhao_user_invites 分销记录（四层同码底座）。执行完即可移除该环境变量。
  if (process.env.SSO_BACKFILL_INVITE_ALIGN === "1") {
    const alignSvc = strapi.plugin("zhao-sso").service("sso-align") as any;
    if (alignSvc?.backfillUsers) {
      let onlyIds: number[] | undefined;
      if (process.env.SSO_BACKFILL_ONLY_IDS) {
        onlyIds = process.env.SSO_BACKFILL_ONLY_IDS.split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n) && n > 0);
      }
      await alignSvc.backfillUsers(onlyIds);
    } else {
      strapi.log.warn("[zhao-sso] sso-align service missing, skip invite backfill");
    }
  }
};

export default bootstrap;
