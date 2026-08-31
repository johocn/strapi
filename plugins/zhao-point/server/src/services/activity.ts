import type { Core } from "@strapi/strapi";
import { FormValidationError, validateFormData, collectFormData, collectQuestionnaire } from "./form";

const SIGNS_UID = "plugin::zhao-point.activity-signup";
const ATT_UID = "plugin::zhao-point.activity-attendance";
const AUTH_UID = "plugin::zhao-course.user-course-auth";
const ACTIVITY_UID = "plugin::zhao-point.activity";
const MSG_UID = "plugin::zhao-point.activity-message";

/** 宣传页允许的模块类型（与 C端渲染组件一一对应） */
export const PROMO_MODULE_TYPES = [
  "cover", "info", "rich", "highlights", "speakers", "agenda",
  "images", "rewards", "contact", "message", "faq", "custom",
] as const;

/** 宣传页风格枚举 */
export const PROMO_TEMPLATES = ["summit", "salon", "training", "action", "life"] as const;

function isEmpty(v: any): boolean {
  return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
}

/** 归一化 promoModules：过滤非法 type、sort 冲突去重、排序；undefined/null 返回 undefined */
function normalizePromoModules(promoModules: any): any[] | undefined {
  if (promoModules === undefined || promoModules === null) return undefined;
  if (!Array.isArray(promoModules)) throw new Error("promoModules 必须为数组");
  const seen = new Set<number>();
  const out: any[] = [];
  for (const m of promoModules) {
    if (!m || typeof m !== "object") continue;
    if (!PROMO_MODULE_TYPES.includes(m.type)) continue;
    const sort = Number.isFinite(Number(m.sort)) ? Number(m.sort) : out.length;
    if (seen.has(sort)) continue;
    seen.add(sort);
    out.push({
      type: m.type,
      config: m.config && typeof m.config === "object" && !Array.isArray(m.config) ? m.config : {},
      sort,
    });
  }
  return out.sort((a, b) => a.sort - b.sort);
}

/** 读取合并后的联系方式：活动覆盖优先，否则读站点 extraConfig.promoContact */
async function resolvePromoContact(strapi: any, activityContact: any, siteDocumentId?: string): Promise<any | null> {
  if (activityContact && typeof activityContact === "object" && !Array.isArray(activityContact)) {
    if (Object.keys(activityContact).length) return activityContact;
  }
  if (!siteDocumentId) return null;
  try {
    const siteSvc = strapi.plugin("zhao-common")?.service("site-config");
    if (!siteSvc || typeof siteSvc.getConfig !== "function") return null;
    const config = await siteSvc.getConfig(siteDocumentId);
    const ec = config?.extraConfig;
    if (ec && typeof ec === "object" && !Array.isArray(ec) && ec.promoContact) return ec.promoContact;
  } catch {
    /* 站点配置读取失败静默降级为无联系方式 */
  }
  return null;
}

/** 活动奖励摘要：供 rewards 模块与报名分流使用 */
function summarizeRewards(rewardConfig: any): any {
  const rc = rewardConfig && typeof rewardConfig === "object" ? rewardConfig : {};
  return {
    enabled: !!rc.loginEnabled,
    channel: rc.channel && rc.channel.type ? rc.channel : undefined,
    selectMode: rc.selectMode || "all",
    selectN: Math.max(1, Number(rc.selectN) || 1),
    rewards: Array.isArray(rc.rewards) ? rc.rewards.map((r: any) => ({
      id: r.id, name: r.name, type: r.type, mode: r.mode, condition: resolveCondition(r),
    })) : [],
  };
}

function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1), dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** 归一化奖励附加条件：优先 condition；兼容旧 loginRequired/channel */
function resolveCondition(r: any): string {
  if (r?.condition) return r.condition;
  if (r?.loginRequired) return "wechat_auth";
  if (r?.channel) return r.channel; // contact | survey
  return "none";
}

/** 归一化解锁通道：channel.type 优先；兼容旧 infoChannels（取首个映射，仅 contact/survey 直映，其余默认 contact） */
function resolveChannel(rewardConfig: any): { type: string; label?: string } {
  const rc = rewardConfig && typeof rewardConfig === "object" ? rewardConfig : {};
  if (rc.channel?.type) return rc.channel;
  const legacy = Array.isArray(rc.infoChannels) ? rc.infoChannels.find((c: any) => c?.channel) : undefined;
  if (legacy?.channel === "survey") return { type: "survey", label: "回答调查问卷" };
  if (legacy?.channel === "contact") return { type: "contact", label: "留联系方式" };
  return { type: "contact", label: "留联系方式" }; // 无配置/wechat_auth/subscribe 兜底 contact
}

/** 是否已关注公众号：resolve sso → refreshSubscribe 刷新（失败静默降级绑定表缓存值） */
async function hasSubscribe(strapi: any, upUserId: number): Promise<boolean> {
  try {
    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
    if (!sop || !msg) return false;
    const sso = await sop.resolveSsoUserForUpUser(upUserId);
    if (!sso?.id) return false;
    try {
      const fresh = await msg.refreshSubscribe(sso.id, "official_account");
      if (typeof fresh === "number") return fresh === 1;
    } catch { /* 刷新失败降级缓存值 */ }
    const binding = await strapi.db.query("plugin::zhao-sso.sso-third-party-binding").findOne({
      where: { user: sso.id, provider: "wechat" },
      orderBy: { id: "DESC" },
    });
    return (binding?.subscribe ?? 0) === 1;
  } catch {
    return false;
  }
}

/** 重算 unlockInfo 并幂等发放新增解锁的 multi 权益；供补填问卷/解锁刷新共用 */
async function recomputeUnlock(strapi: any, signup: any, act: any, userId: number): Promise<{ unlockInfo: any; newlyGranted: any[] }> {
  const rewardConfig = act.rewardConfig;
  if (!rewardConfig || typeof rewardConfig !== "object") return { unlockInfo: undefined, newlyGranted: [] };
  const prevChosen = Array.isArray(signup.unlockInfo?.chosenRewards) ? signup.unlockInfo.chosenRewards : [];
  const loginAuth = await hasWechatAuth(strapi, userId);
  const subscribed = await hasSubscribe(strapi, userId);
  const channelType = resolveChannel(rewardConfig)?.type;
  const conditions = {
    contact: contactFilled(act.formConfig, signup.formData),
    survey: surveyFilled(signup.preQuestionnaireData, preQuestionnaireFields(act)),
    post_survey: postSurveyDone(act, signup.questionnaireData, signup.attendedAt),
  };
  const channelDone = channelDoneOf(channelType, conditions, loginAuth, subscribed);
  const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
  const newly = rewardList.filter((r: any) =>
    r?.mode === "multi" && channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions) && prevChosen.indexOf(r.id) < 0
  );
  const granted: any[] = [];
  if (newly.length) {
    const channelId = await resolveUserChannelId(strapi, userId);
    for (const r of newly) {
      const g = await grantReward(strapi, { userId, reward: r, channelId });
      if (g) granted.push(g);
    }
  }
  const unlockInfo = {
    loginAuth, subscribed, channelDone, conditions,
    chosenRewards: [...prevChosen, ...granted.map((g) => g.id)],
  };
  await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { unlockInfo } });
  // 达标达成补发：活动临时开放单课时播放权（幂等，锚定活动结束，source=milestone）
  const tempLessons = act.preUnlockLessons || [];
  if (tempLessons.length) {
    for (const lesson of tempLessons) {
      if (!lesson?.course?.id) continue;
      await grantTempLessonLesson(strapi, {
        userId, courseId: lesson.course.id,
        activityDocumentId: act.documentId,
        lessonDocumentId: lesson.documentId || String(lesson.id),
        source: "milestone",
        expiresAt: act.endTime || null,
      });
    }
  }
  return { unlockInfo, newlyGranted: granted };
}

/** contact 条件：报名表单存在 type=phone 字段且表单已填非空电话 */
function contactFilled(formConfig: any, formData: any): boolean {
  const fields = Array.isArray(formConfig) ? formConfig : [];
  const data = formData && typeof formData === "object" ? formData : {};
  return fields.some((f: any) => f?.type === "phone" && f?.key && !isEmpty(data[f.key]));
}

/**
 * survey 条件：问卷是否完成。
 * fields 提供时要求全部 required===true 字段均有值（数组非空 / 字符串 trim 非空 / 其他非 undefined 非 null）；
 * fields 未提供时退化为"至少一字段有值"，兼容历史调用点。
 */
function surveyFilled(questionnaireData: any, fields?: any): boolean {
  if (!questionnaireData || typeof questionnaireData !== "object" || Array.isArray(questionnaireData)) return false;
  if (fields !== undefined && fields !== null) {
    const fieldArr = Array.isArray(fields) ? fields : [];
    return fieldArr
      .filter((f: any) => f && f.required === true)
      .every((f: any) => {
        const v = questionnaireData[f?.key];
        if (v === undefined || v === null) return false;
        if (Array.isArray(v)) return v.length > 0;
        if (typeof v === "string") return v.trim() !== "";
        return true; // 其他类型：非 undefined 非 null 视为已填
      });
  }
  return Object.keys(questionnaireData).some((k) => {
    const v = questionnaireData[k];
    if (v === undefined || v === null) return false;
    if (Array.isArray(v)) return v.length > 0;
    return String(v).trim() !== "";
  });
}

/** 活动前问卷需求字段（兼容旧配置：仅 questionnaire 的老活动回退以 questionnaire 作为活动前问卷） */
function preQuestionnaireFields(act: any): any {
  return act?.preQuestionnaire?.fields || act?.questionnaire?.fields;
}

/** post_survey 达成口径：活动后问卷已启用 且 必填全答 且 已签到 且 活动已结束（与现有 postSurveyAllowed 判定一致） */
function postSurveyDone(act: any, questionnaireData: any, attendedAt: any): boolean {
  const q = act?.questionnaire;
  if (!q || q.enabled !== true || !Array.isArray(q.fields)) return false;
  if (!attendedAt) return false;
  if (!act.endTime || Date.now() < new Date(act.endTime).getTime()) return false;
  return surveyFilled(questionnaireData, q.fields);
}

/** channelDone：单选通道门槛是否达成（无通道视为恒真） */
function channelDoneOf(channelType: string, conditions: Record<string, boolean>, loginAuth: boolean, subscribed: boolean): boolean {
  if (!channelType) return true;
  switch (channelType) {
    case "contact": return conditions.contact;
    case "survey": return conditions.survey;
    case "post_survey": return !!conditions.post_survey;
    case "wechat_auth": return loginAuth;
    case "subscribe": return subscribed;
    default: return true;
  }
}

/** 奖励解锁判定：按附加条件 condition 判定；none=无条件(恒真), wechat_auth=loginAuth, subscribe=subscribed, contact/survey/post_survey=对应条件已达成 */
function isRewardUnlocked(r: any, loginAuth: boolean, subscribed: boolean, conditions: Record<string, boolean>): boolean {
  if (!r || typeof r !== "object") return false;
  const c = resolveCondition(r);
  if (c === "wechat_auth") return loginAuth;
  if (c === "subscribe") return subscribed;
  if (c === "contact" || c === "survey" || c === "post_survey") return !!conditions[c];
  return true; // none / 未识别视为无条件
}

async function grantPoints(strapi, userId: number, action: string, remark: string) {
  try {
    // 积分必须归属渠道：解析用户当前渠道（优先 channel-member 当前渠道，其次直接授权渠道）
    const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
    let userChannelId: number | undefined;
    if (channelSvc) {
      const member = await strapi.db.query("plugin::zhao-channel.channel-member")
        .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
      userChannelId = member?.channel?.id || member?.channel;
      if (!userChannelId) {
        const dirs = await channelSvc.getUserDirectChannels(userId);
        userChannelId = dirs?.[0];
      }
    }
    await strapi.plugin("zhao-point").service("point").earnPoints(
      { userId, action, source: "activity", method: action, remark, userChannelId }
    );
  } catch (e: any) {
    console.error(`[zhao-point:activity] grantPoints(${action},user=${userId}) failed:`, e?.message);
  }
}

/** 单次积分发放：失败仅 warn，绝不抛错阻断 */
async function earnPointsSafe(strapi: any, userId: number, action: string, points: number, remark: string, userChannelId?: number) {
  try {
    await strapi.plugin("zhao-point").service("point").earnPoints({
      userId, action, points, source: "activity", method: "activity_signup", remark, userChannelId,
    });
  } catch (e: any) {
    strapi.log.warn(`[zhao-point:activity] earnPointsSafe(${action},user=${userId}) failed: ${e?.message}`);
  }
}

/** 按达成项累加发放分级积分：基础5 + 授权+5 + 联系方式+20 + 问卷+50 + 关注+50（关注奖励 isOneTime 防重） */
export async function grantActivityPoints(strapi: any, userId: number, { loginAuth, subscribed, conditions }: {
  loginAuth: boolean;
  subscribed: boolean;
  conditions: Record<string, boolean>;
}) {
  const userChannelId = await resolveUserChannelId(strapi, userId);
  await earnPointsSafe(strapi, userId, "activity_signup", 5, "活动报名", userChannelId);
  if (loginAuth) await earnPointsSafe(strapi, userId, "activity_signup_auth", 5, "微信授权登录报名", userChannelId);
  if (conditions.contact) await earnPointsSafe(strapi, userId, "activity_signup_contact", 20, "完善联系方式报名", userChannelId);
  if (conditions.survey) await earnPointsSafe(strapi, userId, "activity_signup_survey", 50, "回答问卷报名", userChannelId);
  if (subscribed) {
    // 关注奖励：不传 points 用规则默认 50；isOneTime=true 由 earnPoints 内部防重（已领抛 POINT_011，被 earnPointsSafe 吞掉）
    await earnPointsSafe(strapi, userId, "follow_official_account", 50, "关注公众号报名奖励", userChannelId);
  }
}

async function grantCourseTrial(strapi, userId: number, courseId: number) {
  try {
    const existing = await strapi.db.query(AUTH_UID).findOne({ where: { user: userId, course: courseId } });
    if (existing) return;
    await strapi.documents(AUTH_UID).create({ data: { user: userId, course: courseId, authType: "trial", isExpired: false } });
  } catch { /* 幂等授权，失败忽略 */ }
}

/** 幂等写入单课时临时授权(temp_lesson)：活动期间临时开放单课时播放权 */
async function grantTempLessonLesson(strapi: any, opts: {
  userId: number; courseId: number;
  activityDocumentId: string; lessonDocumentId: string;
  source: "signup" | "milestone" | "manual";
  expiresAt?: string | Date | null;
}) {
  try {
    const expires = opts.expiresAt ? new Date(opts.expiresAt) : null;
    const existing = await strapi.db.query(AUTH_UID).findOne({
      where: {
        user: opts.userId, course: opts.courseId,
        authType: "temp_lesson", lessonDocumentId: opts.lessonDocumentId,
      },
    });
    if (existing) {
      if (expires && (!existing.expiresAt || new Date(existing.expiresAt) < expires)) {
        await strapi.db.query(AUTH_UID).update({
          where: { id: existing.id },
          data: { expiresAt: expires, isExpired: false },
        });
      }
      return existing;
    }
    await strapi.db.query(AUTH_UID).create({
      data: {
        user: opts.userId, course: opts.courseId,
        activityDocumentId: opts.activityDocumentId,
        lessonDocumentId: opts.lessonDocumentId,
        authType: "temp_lesson", source: opts.source,
        expiresAt: expires, grantedAt: new Date(),
        isExpired: false,
      },
    });
  } catch { /* 幂等授权，失败忽略 */ }
}

async function resolveUserChannelId(strapi, userId: number): Promise<number | undefined> {
  const channelSvc = strapi.plugin("zhao-channel")?.service("channel-permission");
  let userChannelId: number | undefined;
  if (channelSvc) {
    const member = await strapi.db.query("plugin::zhao-channel.channel-member")
      .findOne({ where: { user: userId, isCurrent: true }, populate: ["channel"] });
    userChannelId = member?.channel?.id || member?.channel;
    if (!userChannelId) {
      const dirs = await channelSvc.getUserDirectChannels(userId);
      userChannelId = dirs?.[0];
    }
  }
  return userChannelId;
}

/** 是否已微信授权登录：解析 sso 用户并探测是否绑定过公众号(provider=wechat)第三方授权 */
async function hasWechatAuth(strapi: any, upUserId: number): Promise<boolean> {
  // 来源1（三方登录，C端公众号 OAuth）：third_party_accounts.user 关联 up_user，直接用 upUserId 查询
  try {
    const thirdAccountSvc = strapi.plugin("zhao-third")?.service("third-party-account");
    if (thirdAccountSvc) {
      const accounts = await thirdAccountSvc.findByUser(upUserId);
      if (Array.isArray(accounts) && accounts.some((a: any) => a.platform === "wechat" || a.provider === "wechat")) return true;
    }
  } catch { /* 忽略来源1异常 */ }
  // 来源2（SSO 登录）：sso_third_party_bindings.user 关联 sso_user，需先映射
  try {
    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const sso = sop && (await sop.resolveSsoUserForUpUser(upUserId));
    if (sso?.id) {
      const bound = await strapi.db.query("plugin::zhao-sso.sso-third-party-binding").findOne({
        where: { user: sso.id, provider: "wechat" },
      });
      if (bound) return true;
    }
  } catch { /* 忽略来源2异常 */ }
  return false;
}

/** 大纲奖励按 kind 分发：lesson→课时课程授权；article/file→无用户级授权，返回信息供前端展示/领取 */
async function grantOutline(strapi: any, opts: { userId: number; reward: any }): Promise<boolean> {
  if (opts.reward.kind === "lesson" && opts.reward.courseId) {
    await grantCourseTrial(strapi, opts.userId, Number(opts.reward.courseId));
    return true;
  }
  return true;
}

/** 权益专属信息标题（meta），按奖励类型解析展示标题 */
async function rewardMetaLabel(strapi: any, reward: any): Promise<string> {
  if (!reward || !reward.type) return "";
  switch (reward.type) {
    case "course_outline":
      if (reward.kind === "lesson") return reward.lessonTitle || "";
      return reward.title || "";
    case "course_trial":
      return reward.title || "";
    case "coupon": {
      if (reward.couponTitle) return reward.couponTitle;
      const c = await strapi.db.query("plugin::zhao-deal.coupon").findOne({
        where: { id: Number(reward.couponId) || 0 },
      });
      return c?.title || c?.amountDesc || "";
    }
    default:
      return "";
  }
}

/** 逐项发放奖励；按类型分发，重入由调用方靠 unlockInfo 幂等保证 */
async function grantReward(strapi: any, opts: {
  userId: number; reward: any; channelId?: number;
}): Promise<{ id: string; type: string; name: string; message: string; link?: string } | null> {
  const { userId, reward } = opts;
  if (!reward?.id || !reward?.type) return null;
  const base = { id: reward.id, type: reward.type, name: reward.name || "" };
  try {
    switch (reward.type) {
      case "points": {
        const amount = Math.max(0, Number(reward.amount) || 0);
        if (amount <= 0) return null;
        await strapi.plugin("zhao-point").service("point").earnPoints({
          userId, action: "activity_reward", points: amount,
          source: "activity", method: "activity_reward",
          remark: `活动奖励:${reward.name ?? "奖励"}`,
          userChannelId: opts.channelId,
        });
        return { ...base, message: `积分 +${amount}` };
      }
      case "course_trial": {
        const courseId = Number(reward.courseId);
        if (!courseId) return null;
        await grantCourseTrial(strapi, userId, courseId);
        return { ...base, message: "已开通试听课程" };
      }
      case "course_outline": {
        if (!(await grantOutline(strapi, { userId, reward }))) return null;
        if (reward.kind === "lesson") return { ...base, message: "已开通试听课时" };
        return { ...base, message: "已解锁课前培训大纲", link: reward.link };
      }
      case "coupon": {
        const c = await strapi.db.query("plugin::zhao-deal.coupon").findOne({
          where: { id: Number(reward.couponId) || 0 },
        });
        if (!c) return null;
        return { ...base, message: `已领取优惠券：${c.amountDesc ?? ""}`.trim(), link: c.promoLink };
      }
      default:
        return null;
    }
  } catch (e: any) {
    strapi.log.warn(`[zhao-point:activity] grantReward ${reward.id} failed: ${e.message}`);
    return null;
  }
}

/**
 * 分享裂变奖励：下线 B(userId, upUser) 成功报名活动 act → 给其邀请人 A 发积分。
 * 幂等键：(invitee, activity)；虚拟分享者/无码/奖励<=0/桥接不到 A 均跳过；失败仅日志，绝不阻断报名主流程。
 */
async function grantShareReward(strapi, userId: number, act: any) {
  try {
    if (!act?.id) return;
    const configSvc = strapi.plugin("zhao-point").service("config-service");
    const config = configSvc ? await configSvc.getConfig() : null;
    const reward = Number(act.shareRewardPoints ?? config?.defaultShareRewardPoints ?? 0) || 0;
    if (reward <= 0) return;

    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    const profileSvc = strapi.plugin("zhao-sso")?.service("sso-profile");
    if (!sop || !profileSvc) return;

    const inviteeSso = await sop.resolveSsoUserForUpUser(userId);
    const inviteCodeStr = inviteeSso?.invite_code_used;
    if (!inviteCodeStr) return;

    const code = await strapi.db.query("plugin::zhao-sso.sso-invite-code").findOne({
      where: { code: inviteCodeStr, is_active: true },
      populate: ["creator"],
    });
    const inviter = code?.creator;
    if (!inviter || inviter.status === "virtual") return;

    const inviterUp = await profileSvc.resolveUpUserForSsoUser(inviter.id);
    if (!inviterUp?.id) return;

    const REWARD_UID = "plugin::zhao-point.activity-referral-reward";
    const exists = await strapi.db.query(REWARD_UID).findOne({
      where: { invitee: userId, activity: act.id },
    });
    if (exists) return;

    const userChannelId = await resolveUserChannelId(strapi, inviterUp.id);
    await strapi.plugin("zhao-point").service("point").earnPoints({
      userId: inviterUp.id,
      action: "activity_share_reward",
      source: "activity",
      method: "activity_share_reward",
      points: reward,
      remark: `分享活动:${act.title}`,
      userChannelId,
    });
    await strapi.db.query(REWARD_UID).create({
      data: {
        inviter: inviterUp.id,
        invitee: userId,
        activity: act.id,
        points: reward,
        sourceInviteCode: inviteCodeStr,
        issuedAt: new Date(),
      },
    });
  } catch (e: any) {
    strapi.log.warn(`[zhao-point:activity] grantShareReward failed: ${e.message}`);
  }
}

/**
 * 分级积分预览（单一来源）：base 基础报名 5；auth 微信授权登录额外 5（累计 10）；
 * contact 完善联系方式 20；survey 回答问卷 50；subscribe 关注公众号 50。
 * 预览与实际发放（grantActivityPoints）共用此配置，避免两处漂移。
 */
export function computePointsPreview({ loginAuth, subscribed, conditions }: {
  loginAuth: boolean;
  subscribed: boolean;
  conditions: Record<string, boolean>;
}): { base: number; auth: number; contact: number; survey: number; subscribe: number; total: number } {
  const base = 5; // activity_signup
  const auth = loginAuth ? 5 : 0; // activity_signup_auth
  const contact = conditions.contact ? 20 : 0; // activity_signup_contact
  const survey = conditions.survey ? 50 : 0; // activity_signup_survey
  const subscribe = subscribed ? 50 : 0; // follow_official_account
  return { base, auth, contact, survey, subscribe, total: base + auth + contact + survey + subscribe };
}

const feeSvc = () => strapi.plugin("zhao-point").service("fee-service");

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  async signup({ userId, activityId, formData, preQuestionnaireData, chosenRewards }: { userId: number; activityId: string; formData?: any; preQuestionnaireData?: any; chosenRewards?: string[] }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityId, populate: { preUnlockLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "signup_open") throw new Error("活动未开放报名");
    const now = Date.now();
    // 报名开始时间不得早于「当前时间-30分钟」（允许最多提前 30 分钟开启报名）
    if (act.signupStart && now < new Date(act.signupStart).getTime() - 30 * 60000) throw new Error("报名未开始");
    // 报名截止时间需晚于「当前时间-30分钟」：即报名截止后 30 分钟内仍可报名，超过则关闭
    if (act.signupEnd && now > new Date(act.signupEnd).getTime() + 30 * 60000) {
      throw new Error("报名已截止");
    }
    // 报名表单校验（活动配置了 formConfig 才校验；无配置兼容不校验）
    // rewardConfig 存在时：必填宽放为选填，仅作为解锁依据，不再拦截报名
    const formConfig = act.formConfig;
    const rewardConfig = act.rewardConfig;
    const hasReward = !!rewardConfig && typeof rewardConfig === "object";
    if (Array.isArray(formConfig) && formConfig.length && !hasReward) {
      const v = validateFormData(formConfig, formData);
      if (!v.ok) throw new FormValidationError(v.errors);
    }
    const storedFormData = Array.isArray(formConfig) && formConfig.length ? collectFormData(formConfig, formData) : undefined;

    // 递进式判定：通道门槛(channelDone) + 各权益独立 condition
    // 注意：loginAuth/subscribed/conditions 在 hasReward 之外计算，供无 rewardConfig 时仍做分级积分预览与发放
    let loginAuth = false;
    let subscribed = false;
    const conditions: Record<string, boolean> = { contact: false, survey: false, post_survey: false };
    let channelType: string | undefined;
    let rewardList: any[] = [];
    loginAuth = await hasWechatAuth(strapi, userId);
    subscribed = await hasSubscribe(strapi, userId); // 非关键路径，失败静默 false
    if (hasReward) {
      channelType = resolveChannel(rewardConfig)?.type;
      conditions.contact = contactFilled(formConfig, formData);
      conditions.survey = surveyFilled(preQuestionnaireData, preQuestionnaireFields(act));
      rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
    } else {
      // 无 rewardConfig 也计算达成项，供分级积分预览/发放（contact/survey 仅依赖表单数据）
      conditions.contact = contactFilled(formConfig, formData);
      conditions.survey = surveyFilled(preQuestionnaireData, preQuestionnaireFields(act));
    }
    const channelDone = channelDoneOf(channelType, conditions, loginAuth, subscribed);
    const visibleRewards = rewardList.filter((r: any) => channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions));
    const autoChosen = visibleRewards.filter((r: any) => r.mode !== "multi").map((r: any) => r.id);
    const multiIds = visibleRewards.filter((r: any) => r.mode === "multi").map((r: any) => r.id);
    // selectMode 约束（multi 权益）：all 全选 / one 最多1 / any 最多 selectN(默认1)
    const selectMode = rewardConfig?.selectMode || "all";
    const selectN = Math.max(1, Number(rewardConfig?.selectN) || 1);
    let multiSelected = (Array.isArray(chosenRewards) ? chosenRewards : []).filter((id: any) => multiIds.indexOf(id) >= 0);
    if (selectMode === "all") multiSelected = multiIds;
    else if (selectMode === "one") multiSelected = multiSelected.slice(0, 1);
    else if (selectMode === "any") multiSelected = multiSelected.slice(0, selectN);
    const chosenRewardsIds = [...autoChosen, ...multiSelected];
    const unlockInfo = hasReward ? { loginAuth, subscribed, channelDone, conditions, chosenRewards: chosenRewardsIds } : undefined;
    const dup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: act.id, status: { $in: ["active", "waiting"] } },
    });
    if (dup) return { ok: false, reason: "already_signed_up" };
    const knex = strapi.db.connection;
    const reserved = await knex("activities").where("id", act.id).andWhere("used_capacity", "<", knex.raw("capacity")).increment("used_capacity", 1);
    if (reserved === 0) {
      // 名额已满 → 进入候补队列（不占用名额）
      const sig = await strapi.db.query(SIGNS_UID).create({
        data: { user: userId, activity: act.id, status: "waiting", signupAt: new Date(), ...(storedFormData ? { formData: storedFormData } : {}), ...(preQuestionnaireData && Object.keys(preQuestionnaireData).length ? { preQuestionnaireData } : {}), ...(unlockInfo ? { unlockInfo: { ...unlockInfo, chosenRewards: [] } } : {}) },
      });
      const waitCount = await strapi.db.query(SIGNS_UID).count({
        where: {
          activity: act.id,
          status: "waiting",
          $or: [
            { signupAt: { $lt: sig.signupAt } },
            { signupAt: sig.signupAt, id: { $lt: sig.id } },
          ],
        },
      });
      // 候补提醒：站内信 + 微信
      try {
        await this.notifyInApp(userId, act.id, "activity.waitlisted", { name: act.title, startTime: act.startTime, position: waitCount + 1 }, `activity:waitlisted:${userId}:${act.id}`);
        const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
        if (sop) {
          const sso = await sop.resolveSsoUserForUpUser(userId);
          if (sso) {
            await sop.trigger("activity.waitlisted", {
              user: sso.id,
              payload: { activity: { name: act.title, startTime: act.startTime }, position: waitCount + 1 },
              schedules: [{ templateCode: "act_waitlisted", scene: "activity.waitlisted", dedupeKey: `activity:waitlisted:${userId}:${act.id}` }],
            });
          }
        }
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] waitlisted notify failed (user=${userId}): ${e.message}`);
      }
      return { ok: true, waitlisted: true, position: waitCount + 1, signupId: sig.id };
    }
    let resolved = await feeSvc().resolveFee(act, userId);
    if (resolved.mode === "tier" && resolved.tierId && Number(resolved.tier?.quota || 0) > 0) {
      let attempts = (Array.isArray(act.feeTiers) ? act.feeTiers.length : 0) + 1;
      while (attempts-- > 0 && resolved.tierId) {
        const usage = await feeSvc().tierUsage(act.id, resolved.tierId);
        if (usage < Number(resolved.tier?.quota || 0)) break;
        resolved = await feeSvc().resolveFee(act, userId, { excludeTierId: resolved.tierId });
      }
    }
    const feeCollectAt = resolved.feeCollectAt || "signup";
    const cost = resolved.cost || 0;
    if (feeCollectAt === "signup" && cost > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: cost, source: "activity", method: "activity_signup", remark: `报名活动:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        await strapi.db.connection("activities").where("id", act.id).decrement("used_capacity", 1);
        return { ok: false, reason: "insufficient_points" };
      }
    }
    const sig = await strapi.db.query(SIGNS_UID).create({ data: { user: userId, activity: act.id, status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null, ...(storedFormData ? { formData: storedFormData } : {}), ...(preQuestionnaireData && Object.keys(preQuestionnaireData).length ? { preQuestionnaireData } : {}), ...(unlockInfo ? { unlockInfo } : {}) } });
    // 报名奖励发放：仅已选定(解锁)项，逐项独立幂等
    const granted: Array<{ id: string; type: string; name: string; message: string; link?: string }> = [];
    if (hasReward && chosenRewardsIds.length) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      for (const r of rewardList) {
        if (chosenRewardsIds.indexOf(r.id) < 0) continue;
        const g = await grantReward(strapi, { userId, reward: r, channelId: userChannelId });
        if (g) granted.push(g);
      }
    }
    // 分级积分发放：按达成项累加（基础5 + 授权 + 联系方式 + 问卷 + 关注）
    await grantActivityPoints(strapi, userId, { loginAuth, subscribed, conditions });
    // 积分预览（供前端展示/校验，与发放共用 computePointsPreview）
    const pointsPreview = computePointsPreview({ loginAuth, subscribed, conditions });
    // 分享裂变奖励
    await grantShareReward(strapi, userId, act);
    // 站内信：报名成功确认（双通道之站内部分）
    await this.notifyInApp(userId, act.id, "activity.confirm", { name: act.title, startTime: act.startTime }, `activity:confirm:${userId}:${act.id}`);
    // 开场前提醒站内信（即时示"已预约提醒"，实际提醒由微信定时触发）
    if (act.startTime && (Number(act.remindLeadMinutes ?? 1440) >= 0)) {
      await this.notifyInApp(userId, act.id, "activity.before", { name: act.title, startTime: act.startTime }, `activity:before:${userId}:${act.id}`);
    }
    // 预留存：试看课时所属课程授权
    const tempExpiry = act.endTime || null;
    for (const lesson of act.preUnlockLessons || []) {
      if (!lesson?.course?.id) continue;
      await grantCourseTrial(strapi, userId, lesson.course.id);
      await grantTempLessonLesson(strapi, {
        userId,
        courseId: lesson.course.id,
        activityDocumentId: act.documentId,
        lessonDocumentId: lesson.documentId || String(lesson.id),
        source: "signup",
        expiresAt: tempExpiry,
      });
    }
    // SOP 埋点：报名确认需 sso 自动下发；活动前提醒改为生成待办（管理员手动发，省轮询开销）
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(userId);
        // 活动前提醒待办（幂等：同活动同场景仅保留一条 open 待办；remindLeadMinutes<0 表示关闭提醒则不生成）
        const leadMin = Number(act.remindLeadMinutes ?? 1440);
        if (act.startTime && leadMin >= 0) {
          const todoKey = `act_before:${act.documentId}`;
          const existingTodo = await strapi.db
            .query("plugin::zhao-sso.manual-sop-todo")
            .findOne({ where: { code: todoKey, status: "open" } });
          if (!existingTodo) {
            await sop.enqueueManualSop({
              code: todoKey,
              title: `活动前提醒待办：${act.title}`,
              scene: "activity.before",
              templateCode: "act_before",
              audience: { activityDocumentId: act.documentId, filter: "registered" },
              paramsTemplate: { activityName: act.title },
              link: null,
            });
          }
        }
        // 报名确认立即发送（sendNow，不依赖 cron；参数按 act_confirm 微信模板字段映射预格式化）
        if (sso) {
          // 合成 timeRange 给 act_confirm 模板 time6 字段（如 "2026-08-31 14:00~16:00"）
          const day = act.startTime ? String(act.startTime).slice(0, 10) : "";
          const sHm = act.startTime ? String(act.startTime).slice(11, 16) : "";
          const eHm = act.endTime ? String(act.endTime).slice(11, 16) : "";
          const timeRange = `${day || "待定"}${sHm ? " " + sHm : ""}${eHm ? "~" + eHm : ""}`;
          try {
            await strapi
              .plugin("zhao-sso")
              .service("sso-msg")
              .sendNow({
                user: sso.id,
                scene: "activity.confirm",
                templateCode: "act_confirm",
                params: {
                  activityName: act.title ? String(act.title).slice(0, 20) : "",
                  activityLocation: act.venueName ? String(act.venueName).slice(0, 20) : "待定",
                  timeRange,
                  remark: "感谢您报名成功，请准时到场参加",
                },
                dedupeKey: `act_confirm:${sso.id}:${act.documentId}`,
              });
          } catch (e: any) {
            strapi.log.warn(`[zhao-point:activity] sendNow act_confirm failed (user=${sso.id}): ${e.message}`);
          }
        }
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] sop activity.signup embed failed: ${e.message}`);
    }
    return { ok: true, granted, signupId: sig.id, pointsPreview, ...(unlockInfo ? { unlockInfo: { ...unlockInfo, pointsPreview } } : {}) };
  },

  /** 补填问卷：type=pre(活动前，报名后即可填，驱动 survey 解锁/积分) | post(活动后，需已签到且活动已结束，仅记录反馈) */
  async fillQuestionnaire({ userId, signupId, answers, type = "pre" }: { userId: number; signupId: number; answers?: any; type?: "pre" | "post" }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { id: signupId, user: userId },
      populate: { activity: true },
    });
    if (!signup) throw new Error("报名记录不存在");
    if (signup.status !== "active" && signup.status !== "waiting") throw new Error("报名已失效");
    const act = signup.activity;
    if (!act) throw new Error("活动不存在");

    // 活动后问卷：必须已签到且活动时间已结束，仅记录反馈、不触发解锁/积分
    if (type === "post") {
      const q = act.questionnaire;
      if (!q || q.enabled !== true || !Array.isArray(q.fields) || !q.fields.length) throw new Error("该活动未开启活动后问卷");
      if (!signup.attendedAt) throw new Error("需到场签到后才能填写活动后问卷");
      if (!act.endTime || Date.now() < new Date(act.endTime).getTime()) throw new Error("活动结束后才能填写活动后问卷");
      const collected = collectQuestionnaire(q.fields, answers);
      await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { questionnaireData: collected } });
      return { ok: true, type: "post", postDone: surveyFilled(collected, q.fields) };
    }

    // 活动前问卷：更新 preQuestionnaireData → 重算解锁 → 幂等发放新增解锁的 multi 权益
    // 兼容旧配置：仅配置了 questionnaire 的老活动回退以 questionnaire 作为活动前问卷，survey 通道不失效
    const q = act.preQuestionnaire || act.questionnaire;
    if (!q || q.enabled !== true || !Array.isArray(q.fields) || !q.fields.length) throw new Error("该活动未开启问卷");
    // 补填前问卷达成状态，用于判定是否本次新达成以补发积分
    const prevSurvey = surveyFilled(signup.preQuestionnaireData || {}, q.fields);
    const collected = collectQuestionnaire(q.fields, answers);
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { preQuestionnaireData: collected } });
    // 重算必须读取更新后的 preQuestionnaireData，不能沿用更新前快照
    const fresh = await strapi.db.query(SIGNS_UID).findOne({ where: { id: signup.id } });
    const { unlockInfo, newlyGranted } = await recomputeUnlock(strapi, fresh, act, userId);
    // 补填问卷后若问卷条件新达成（报名时未达成），补发问卷积分，与直接报名路径保持一致
    const currentSurvey = surveyFilled(fresh.preQuestionnaireData || {}, q.fields);
    if (!prevSurvey && currentSurvey) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      await earnPointsSafe(strapi, userId, "activity_signup_survey", 50, "回答问卷报名", userChannelId);
    }
    return { ok: true, unlockInfo, newlyUnlocked: newlyGranted };
  },

  /** 补填联系方式：更新 signup.formData → 重算解锁 → 本轮新达成联系方式补发 +20 */
  async fillContact({ userId, signupId, formData }: { userId: number; signupId: number; formData?: any }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { id: signupId, user: userId },
      populate: { activity: true },
    });
    if (!signup) throw new Error("报名记录不存在");
    if (signup.status !== "active" && signup.status !== "waiting") throw new Error("报名已失效");
    const act = signup.activity;
    if (!act) throw new Error("活动不存在");
    const formConfig = Array.isArray(act.formConfig) ? act.formConfig : [];
    if (!formConfig.length) throw new Error("该活动未开启报名表单");
    const prevContact = contactFilled(formConfig, signup.formData);
    const collected = collectFormData(formConfig, formData);
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { formData: collected } });
    const fresh = await strapi.db.query(SIGNS_UID).findOne({ where: { id: signup.id } });
    const { unlockInfo, newlyGranted } = await recomputeUnlock(strapi, fresh, act, userId);
    // 补填后若联系方式本轮新达成，补发联系方式积分（与直接报名路径一致，已领幂等）
    const currentContact = contactFilled(formConfig, fresh.formData);
    if (!prevContact && currentContact) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      await earnPointsSafe(strapi, userId, "activity_signup_contact", 20, "完善联系方式报名", userChannelId);
    }
    return { ok: true, unlockInfo, newlyUnlocked: newlyGranted, newlyContact: !prevContact && currentContact };
  },

  /** 用户关注公众号领积分的临时带参二维码（按用户缓存复用，有效期内不重复建码 → 临时码不限数量） */
  async getFollowQrcode({ userId, activityId }: { userId: number; activityId: string }) {
    const sceneKey = `follow:act:${activityId}:${userId}`;
    const qrcodeSvc = strapi.plugin("zhao-sso").service("sso-wx-qrcode");
    const existing = await qrcodeSvc.findBySceneKey(sceneKey).catch(() => null);
    if (existing?.wx_url) return { ok: true, wx_url: existing.wx_url };
    const created = await qrcodeSvc.create({
      scene_key: sceneKey,
      kind: "temporary",
      expire_seconds: 2592000,
      title: `活动关注领积分 ${activityId} u${userId}`,
    });
    return { ok: true, wx_url: created.wx_url };
  },

  /** 补领关注公众号：已关注则补发关注积分(幂等)，并重算解锁新增权益 */
  async claimSubscribe({ userId, signupId }: { userId: number; signupId: number }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { id: signupId, user: userId },
      populate: { activity: true },
    });
    if (!signup) throw new Error("报名记录不存在");
    if (signup.status !== "active" && signup.status !== "waiting") throw new Error("报名已失效");
    const act = signup.activity;
    if (!act) throw new Error("活动不存在");
    const subscribed = await hasSubscribe(strapi, userId);
    if (!subscribed) return { ok: true, subscribed: false, newlyUnlocked: [] };
    const userChannelId = await resolveUserChannelId(strapi, userId);
    // 不传 points，由规则默认；isOneTime 已领抛 POINT_011 被 earnPointsSafe 吞掉（幂等）
    await earnPointsSafe(strapi, userId, "follow_official_account", 50, "关注公众号报名奖励", userChannelId);
    const { unlockInfo, newlyGranted } = await recomputeUnlock(strapi, signup, act, userId);
    return { ok: true, subscribed: true, unlockInfo, newlyUnlocked: newlyGranted };
  },

  /** 报名后权益状态：已报名用户回访时卡片区读取真实已领/可领/未达成（不入库） */
  async signupUnlockStatus({ userId, signupId }: { userId: number; signupId: number }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { id: signupId, user: userId },
      populate: { activity: true },
    });
    if (!signup) throw new Error("报名记录不存在");
    if (signup.status !== "active" && signup.status !== "waiting") throw new Error("报名已失效");
    const act = signup.activity;
    if (!act) throw new Error("活动不存在");
    const rewardConfig = act.rewardConfig;
    const hasReward = !!rewardConfig && typeof rewardConfig === "object";
    const loginAuth = await hasWechatAuth(strapi, userId);
    const subscribed = await hasSubscribe(strapi, userId);
    const conditions = {
      contact: contactFilled(act.formConfig, signup.formData),
      survey: surveyFilled(signup.preQuestionnaireData, preQuestionnaireFields(act)),
      post_survey: postSurveyDone(act, signup.questionnaireData, signup.attendedAt),
    };
    // 活动后问卷可填：已签到 且 活动时间已结束（活动前问卷报名后即可填）
    const postSurveyAllowed = !!(act.questionnaire?.enabled === true && signup.attendedAt && act.endTime && Date.now() >= new Date(act.endTime).getTime());
    if (!hasReward) {
      return {
        ok: true, hasReward: false, loginAuth, subscribed,
        contactDone: conditions.contact, surveyDone: conditions.survey,
        formData: signup.formData || {}, questionnaireData: signup.questionnaireData || {}, preQuestionnaireData: signup.preQuestionnaireData || {},
        postSurveyAllowed,
        pointsPreview: computePointsPreview({ loginAuth, subscribed, conditions }),
      };
    }
    const ch = resolveChannel(rewardConfig);
    const channelDone = channelDoneOf(ch?.type, conditions, loginAuth, subscribed);
    const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
    return {
      ok: true, hasReward: true, loginAuth, subscribed,
      channel: ch, channelDone,
      contactDone: conditions.contact, surveyDone: conditions.survey,
      formData: signup.formData || {}, questionnaireData: signup.questionnaireData || {}, preQuestionnaireData: signup.preQuestionnaireData || {},
      postSurveyAllowed,
      rewards: rewardList.map((r: any) => ({
        id: r.id, name: r.name, type: r.type, mode: r.mode,
        condition: resolveCondition(r), unlocked: isRewardUnlocked(r, loginAuth, subscribed, conditions),
      })),
      pointsPreview: computePointsPreview({ loginAuth, subscribed, conditions }),
    };
  },

  /** 解锁状态探测：C 端报名前或关注/授权后调用，返回通道/条件/可领权益（不入库） */
  async unlockCheck({ userId, activityDocumentId, formData, preQuestionnaireData }: {
    userId: number; activityDocumentId: string; formData?: any; preQuestionnaireData?: any;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const rewardConfig = act.rewardConfig;
    const hasReward = !!rewardConfig && typeof rewardConfig === "object";
    const loginAuth = await hasWechatAuth(strapi, userId);
    const subscribed = await hasSubscribe(strapi, userId);
    const conditions = {
      contact: contactFilled(act.formConfig, formData),
      survey: surveyFilled(preQuestionnaireData, preQuestionnaireFields(act)),
      post_survey: postSurveyDone(act, undefined, undefined),
    };
    const pointsPreview = computePointsPreview({ loginAuth, subscribed, conditions });
    if (!hasReward) {
      return { ok: true, hasReward: false, loginAuth, subscribed, conditions, pointsPreview };
    }
    const ch = resolveChannel(rewardConfig);
    const channelDone = channelDoneOf(ch?.type, conditions, loginAuth, subscribed);
    const rewardList = Array.isArray(rewardConfig?.rewards) ? rewardConfig.rewards : [];
    const selectMode = rewardConfig.selectMode || "all";
    const selectN = Math.max(1, Number(rewardConfig.selectN) || 1);
    // selectMode 池化计算：与 signup 发分路径口径一致——仅多选(mode==="multi")且有条件的权益参与 N 选池；
    // 独选(mode!=="multi")与无条件(condition==="none")权益按 base 如实展示、不占池
    let poolUsed = 0;
    const rewards = await Promise.all(rewardList.map(async (r: any) => {
      const base = !!r?.id && channelDone && isRewardUnlocked(r, loginAuth, subscribed, conditions);
      const condition = resolveCondition(r);
      // points 仅用于前端弹层展示，非发分依据
      const points = r?.type === "points" ? Number(r?.amount) || 0 : 0;
      const meta = await rewardMetaLabel(strapi, r);
      const poolable = r?.mode === "multi" && condition !== "none";
      if (!base || !poolable) return { id: r.id, name: r.name, type: r.type, mode: r.mode, condition, points, unlocked: base, meta };
      let unlocked: boolean;
      if (selectMode === "all") unlocked = true;
      else if (selectMode === "one") unlocked = poolUsed < 1;
      else if (selectMode === "any") unlocked = poolUsed < selectN;
      else unlocked = true;
      if (unlocked) poolUsed += 1;
      return { id: r.id, name: r.name, type: r.type, mode: r.mode, condition, points, unlocked, meta };
    }));
    return {
      ok: true,
      hasReward: true,
      loginAuth,
      subscribed,
      channel: ch,
      conditions,
      channelDone,
      selectMode,
      selectN,
      rewards,
      pointsPreview,
    };
  },

  /** 宣传页聚合：活动 + 模块 + 合并联系方式 + 奖励摘要 + 本人报名状态 */
  async promoDetail({ activityDocumentId, userId, siteDocumentId }: {
    activityDocumentId: string; userId?: number; siteDocumentId?: string;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: ["lecturer", "venue"],
    });
    if (!act) throw new Error("活动不存在");
    const modules = normalizePromoModules(act.promoModules) ?? null;
    const contact = await resolvePromoContact(strapi, act.promoContact, siteDocumentId);
    let signupStatus: any = { signedUp: false };
    if (userId) {
      const signup = await strapi.db.query(SIGNS_UID).findOne({
        where: { activity: act.id, user: userId },
        orderBy: { id: "DESC" },
      });
      if (signup) {
        signupStatus = {
          signedUp: true,
          status: signup.status,
          signupId: signup.id,
          attendedAt: signup.attendedAt || null,
        };
      }
    }
    return {
      activity: act,
      modules,
      contact,
      rewards: summarizeRewards(act.rewardConfig),
      signupStatus,
    };
  },

  /** 用户留言（异步客服） */
  async sendMessage({ userId, activityDocumentId, content }: {
    userId: number; activityDocumentId: string; content?: string;
  }) {
    if (!content || typeof content !== "string" || !content.trim()) throw new Error("留言内容不能为空");
    if (content.trim().length > 1000) throw new Error("留言内容过长");
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const created = await strapi.documents(MSG_UID).create({
      data: {
        activity: act.id,
        user: userId,
        content: content.trim(),
        status: "open",
      },
    });
    return { documentId: created.documentId, status: created.status, createdAt: created.createdAt };
  },

  /** 我的留言 + 运营回复列表（按活动） */
  async listMyMessages({ userId, activityDocumentId }: { userId: number; activityDocumentId: string }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const rows = await strapi.db.query(MSG_UID).findMany({
      where: { activity: act.id, user: userId },
      orderBy: { id: "DESC" },
      limit: 100,
    });
    return rows.map((r: any) => ({
      documentId: r.documentId,
      content: r.content,
      reply: r.reply,
      status: r.status,
      repliedAt: r.repliedAt,
      createdAt: r.created_at,
    }));
  },

  /** 运营端留言列表（可按活动/状态过滤） */
  async adminListMessages({ activity, status, page, pageSize }: {
    activity?: string; status?: string; page: number; pageSize: number;
  }) {
    const where: any = {};
    if (activity) {
      const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activity });
      if (!act) throw new Error("活动不存在");
      where.activity = act.id;
    }
    if (status === "open" || status === "replied") where.status = status;
    const result = await strapi.db.query(MSG_UID).findPage({
      where,
      populate: { user: true, activity: true },
      orderBy: { id: "desc" },
      page, pageSize,
    });
    const rows = result?.results ?? [];
    return {
      list: rows.map((r: any) => ({
        documentId: r.documentId,
        content: r.content,
        reply: r.reply,
        status: r.status,
        repliedAt: r.repliedAt,
        createdAt: r.created_at,
        user: r.user ? {
          id: r.user.id, documentId: r.user.documentId,
          username: r.user.username, nickname: r.user.nickname,
          avatar: r.user.avatar, phone: r.user.phone,
        } : null,
        activity: r.activity ? { documentId: r.activity.documentId, title: r.activity.title } : null,
      })),
      pagination: result?.pagination || { page, pageSize, pageCount: 1, total: rows.length },
    };
  },

  /** 运营端回复留言：status→replied，记录 repliedAt */
  async adminReplyMessage({ messageDocumentId, reply }: { messageDocumentId: string; reply?: string }) {
    if (!reply || typeof reply !== "string" || !reply.trim()) throw new Error("回复内容不能为空");
    const msg = await strapi.documents(MSG_UID).findOne({ documentId: messageDocumentId });
    if (!msg) throw new Error("留言不存在");
    const updated = await strapi.documents(MSG_UID).update({
      documentId: messageDocumentId,
      data: { reply: reply.trim(), status: "replied", repliedAt: new Date().toISOString() },
    });
    return { documentId: updated.documentId, status: updated.status, repliedAt: updated.repliedAt };
  },

  /** C 端公开评价列表 + 聚合（仅展示已公开：rating!=null && reviewHidden!=true） */
  async listPublicReviews({ activityDocumentId, page = 1, pageSize = 20 }: {
    activityDocumentId: string; page?: number; pageSize?: number;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    const visible: any = {
      activity: act.id,
      status: "active",
      rating: { $notNull: true },
      reviewHidden: { $ne: true },
    };
    const result = await strapi.db.query(SIGNS_UID).findPage({
      where: visible,
      populate: { user: true },
      orderBy: { reviewedAt: "desc" },
      page, pageSize,
    });
    const rows = (result?.results ?? []).map((r: any) => ({
      id: r.id,
      rating: r.rating,
      nps: r.nps,
      review: r.review,
      reviewedAt: r.reviewedAt,
      user: r.user ? {
        id: r.user.id, username: r.user.username,
        nickname: r.user.nickname, avatar: r.user.avatar,
      } : null,
    }));
    const all = await strapi.db.query(SIGNS_UID).findMany({
      where: visible, select: ["rating", "nps", "review"],
    });
    const withRating = all.filter((r: any) => r.rating != null);
    const withNps = all.filter((r: any) => r.nps != null);
    const withText = all.filter((r: any) => r.review && String(r.review).trim());
    const avgRating = withRating.length ? withRating.reduce((a: number, r: any) => a + r.rating, 0) / withRating.length : 0;
    const avgNps = withNps.length ? withNps.reduce((a: number, r: any) => a + r.nps, 0) / withNps.length : 0;
    return {
      rows,
      summary: {
        count: all.length,
        avgRating: Number(avgRating.toFixed(2)),
        avgNps: Number(avgNps.toFixed(2)),
        reviewCount: withText.length,
      },
      pagination: result?.pagination ?? { page, pageSize, pageCount: 1, total: rows.length },
    };
  },

  /** 单课时临时授权判定：是否仍有效（活动期内、未过期、且活动仍开放该课时） */
  async isLessonTempAuthorized({ userId, lessonDocumentId }: { userId: number; lessonDocumentId: string }) {
    const auth = await strapi.db.query(AUTH_UID).findOne({
      where: {
        user: userId, authType: "temp_lesson", lessonDocumentId,
        isExpired: false,
        $or: [{ expiresAt: null }, { expiresAt: { $gt: new Date().toISOString() } }],
      },
    });
    if (!auth) return { authorized: false, reason: "no_auth" };

    // 堵越权：回查授权关联活动是否仍开放此课时。
    // 存量授权无 activityDocumentId 时跳过回查，维持兼容放行，不误伤老数据。
    const actId = auth.activityDocumentId;
    if (actId) {
      const act = await strapi.db.query(ACTIVITY_UID).findOne({
        where: { documentId: actId },
        populate: { preUnlockLessons: { select: ["documentId"] } },
      });
      const stillOpen =
        !!act &&
        act.tempLessonMode !== "none" &&
        (act.preUnlockLessons || []).some(
          (l: any) => l.documentId === lessonDocumentId || l.id === lessonDocumentId
        );
      if (!stillOpen) return { authorized: false, reason: "removed_from_activity" };
    }

    return { authorized: true, auth };
  },

  /** 运营手动授权单课时临时播放权（幂等复用 grantTempLessonLesson，source=manual） */
  async adminGrantTempLesson(opts: {
    activityId: string; userId: number; lessonDocumentId: string;
    source?: "signup" | "milestone" | "manual"; expiresAt?: string | Date | null;
  }) {
    const act = await strapi.db.query(ACTIVITY_UID).findOne({
      where: { documentId: opts.activityId },
      populate: { preUnlockLessons: { select: ["documentId", "course"] } },
    });
    if (!act) { const e: any = new Error("活动不存在"); e.status = 404; throw e; }
    const lesson = act.preUnlockLessons?.find((l: any) => l.documentId === opts.lessonDocumentId || l.id === opts.lessonDocumentId);
    if (!lesson) { const e: any = new Error("该课时不在活动的临时开放列表"); e.status = 400; throw e; }
    const exp = opts.expiresAt || act.endTime || null;
    await grantTempLessonLesson(strapi, {
      userId: Number(opts.userId),
      courseId: Number(lesson.course?.id) || Number(lesson.course),
      activityDocumentId: opts.activityId,
      lessonDocumentId: opts.lessonDocumentId,
      source: opts.source || "manual",
      expiresAt: exp,
    });
    return { ok: true, expiresAt: exp };
  },

  /** 本活动本人已解锁学习内容：报名解锁(preUnlock*) + 签到解锁(learningPackage*) */
  async getLearningContent({ userId, activityDocumentId }: {
    userId: number; activityDocumentId: string;
  }) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({
      documentId: activityDocumentId,
      populate: {
        preUnlockArticles: true,
        preUnlockLessons: { populate: { course: true } },
        learningPackageArticles: true,
        learningPackageLessons: { populate: { course: true } },
      },
    });
    if (!act) throw new Error("活动不存在");
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { activity: act.id, user: userId },
    });
    const checkedIn = !!signup?.attendedAt;
    const dedupeByDocId = (arr: any[]) => {
      const seen = new Set<string>();
      const out: any[] = [];
      for (const x of arr) {
        if (!x) continue;
        const k = x.documentId || String(x.id);
        if (seen.has(k)) continue;
        seen.add(k);
        out.push(x);
      }
      return out;
    };
    const articles = dedupeByDocId(
      checkedIn
        ? [...(act.learningPackageArticles || []), ...(act.preUnlockArticles || [])]
        : [...(act.preUnlockArticles || [])]
    ).map((a: any) => ({ documentId: a.documentId, title: a.title, url: a.url || null }));
    const lessons = dedupeByDocId(
      checkedIn
        ? [...(act.learningPackageLessons || []), ...(act.preUnlockLessons || [])]
        : [...(act.preUnlockLessons || [])]
    ).map((l: any) => ({
      documentId: l.documentId, title: l.title,
      course: l.course ? { documentId: l.course.documentId, title: l.course.title } : null,
    }));
    const courses = dedupeByDocId(lessons.map((l: any) => l.course).filter(Boolean));
    return { checkedIn, articles, lessons, courses };
  },

  /**
   * 活动结束触点：本项目无可靠业务结束判定（无 cron、无专属关闭端点，adminUpdate 仅通用更新 status），
   * 因此提供公开 service 方法 closeActivity(activityId) 兼做活动结束埋点（生成手动 SOP 待办），不引入 cron。
   * 调用方在活动结束后自行调用；不再逐人自动下发，改生成回放/复购/未到场回访三条待办给管理员手动发送，
   * 名单由 activity-sop-audience.resolveAudience 在点发时实时解析。
   */
  async closeActivity(activityId: string) {
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId });
    if (!act) throw new Error("活动不存在");
    if (act.status === "ended" || act.status === "archived") {
      return { ok: true, closed: false, already: true, todosGenerated: 0 };
    }
    await strapi.documents("plugin::zhao-point.activity").update({ documentId: activityId, data: { status: "ended" } });
    const actDocId = act.documentId;
    // 不再逐人自动下发回执/复购/回访：改为生成手动 SOP 待办（管理员点发时按 audience 实时查名单）
    const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
    let todosGenerated = 0;
    if (sop) {
      for (const [code, scene, template, title, filter] of [
        ["act_recap", "activity.recap", "act_receipt", `活动回放触达待办：${act.title}`, "recap"],
        ["act_repurchase", "activity.repurchase", "act_repurchase", `复购跟进待办：${act.title}`, "repurchase"],
        ["act_noshow", "activity.noshow", "act_revisit", `未到场回访待办：${act.title}`, "noshow"],
      ] as [string, string, string, string, string][]) {
        const key = `${code}:${actDocId}`;
        const existing = await strapi.db
          .query("plugin::zhao-sso.manual-sop-todo")
          .findOne({ where: { code: key, status: "open" } });
        if (existing) continue;
        await sop.enqueueManualSop({
          code: key,
          title,
          scene,
          templateCode: template,
          audience: { activityDocumentId: actDocId, filter },
          paramsTemplate: { activityName: act.title },
          link: null,
        });
        todosGenerated++;
      }
    }
    // 自动归档：活动结束即生成首张 auto 快照（幂等，仅当无 auto 快照）
    try {
      await strapi.plugin("zhao-point").service("activity-ledger").generateAutoIfAbsent(activityId);
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] ledger auto-generate failed: ${e.message}`);
    }
    return { ok: true, closed: true, todosGenerated };
  },

  /**
   * 懒加载状态流转：读活动时按时间推进状态
   *  - signup_open && now>=startTime → ongoing
   *  - ongoing && now>=endTime → ended（走 closeActivity 收尾：评价引导/复购/回访/快照）
   * 返回是否发生流转；不引入 cron。
   */
  async ensureTransitions(activityDocumentId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) return false;
    const now = Date.now();
    if (act.status === "signup_open" && act.startTime && now >= new Date(act.startTime).getTime()) {
      await strapi.documents(ACTIVITY_UID).update({ documentId: activityDocumentId, data: { status: "ongoing" } });
      return true;
    }
    if (act.status === "ongoing" && act.endTime && now >= new Date(act.endTime).getTime()) {
      await this.closeActivity(activityDocumentId);
      return true;
    }
    return false;
  },

  /** 批量兜底：扫描到期的 signup_open/ongoing 活动统一推进（管理端聚合/启动时调用） */
  async drainDueActivities() {
    const now = new Date().toISOString();
    const rows = await strapi.db.query(ACTIVITY_UID).findMany({
      where: {
        status: { $in: ["signup_open", "ongoing"] },
        $or: [
          { startTime: { $notNull: true, $lte: now } },
          { endTime: { $notNull: true, $lte: now } },
        ],
      },
      select: ["documentId", "status", "startTime", "endTime"],
    });
    let moved = 0;
    for (const r of rows) {
      try {
        if (await this.ensureTransitions(r.documentId)) moved++;
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] drain ${r.documentId} failed: ${e.message}`);
      }
    }
    return { scanned: rows.length, moved };
  },

  /** 管理端归档: 仅 ended -> archived; 幂等(已是 archived 直接返回) */
  async adminArchive(activityDocumentId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    if (act.status === "archived") return act;
    if (act.status !== "ended") throw new Error("仅已结束活动可归档");
    return strapi.documents(ACTIVITY_UID).update({
      documentId: activityDocumentId,
      data: { status: "archived" },
    });
  },
  /** 管理端恢复: archived -> ended; 幂等(非 archived 抛错) */
  async adminUnarchive(activityDocumentId: string) {
    const act = await strapi.documents(ACTIVITY_UID).findOne({ documentId: activityDocumentId });
    if (!act) throw new Error("活动不存在");
    if (act.status !== "archived") throw new Error("仅已归档活动可恢复");
    return strapi.documents(ACTIVITY_UID).update({
      documentId: activityDocumentId,
      data: { status: "ended" },
    });
  },

  async cancel({ userId, activityId }: { userId: number; activityId: number }) {
    const signup = await strapi.db.query(SIGNS_UID).findOne({
      where: { user: userId, activity: activityId, status: { $in: ["active", "waiting"] } },
    });
    if (!signup) throw new Error("未报名");
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { status: "cancelled" } });
    // 取消确认：站内信 + 微信
    try {
      const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
      const params = { name: act?.title ?? "", startTime: act?.startTime ?? null };
      await this.notifyInApp(userId, activityId, "activity.cancelled", params, `activity:cancelled:${userId}:${activityId}`);
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      if (sop) {
        const sso = await sop.resolveSsoUserForUpUser(userId);
        if (sso) {
          await sop.trigger("activity.cancelled", {
            user: sso.id,
            payload: { activity: params },
            schedules: [{ templateCode: "act_cancelled", scene: "activity.cancelled", dedupeKey: `activity:cancelled:${userId}:${activityId}` }],
          });
        }
      }
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] cancel notify failed (user=${userId}): ${e.message}`);
    }
    if (signup.status === "active") {
      // 报名时收费（signup 模式）且已扣积分 → 取消退款
      const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
      if (signup.pointsCharged > 0) {
        const userChannelId = await resolveUserChannelId(strapi, userId);
        try {
          await strapi.plugin("zhao-point").service("point").refundPoints({ userId, action: "activity_fee_refund", points: signup.pointsCharged, source: "activity", method: "activity_cancel", remark: `取消退费:${act?.title ?? ''}`, userChannelId });
        } catch (e: any) {
          strapi.log.warn(`[zhao-point:activity] refund failed (user=${userId}): ${e?.message}`);
        }
      }
      // 释放名额并递补候补（释放一席只转正一人）
      await strapi.db.connection("activities").where("id", activityId).decrement("used_capacity", 1);
      await this.promoteWaiting(activityId);
    }
    // waiting 取消：仅移出队列，不减名额、不递补
    return { ok: true };
  },

  /**
   * 递补：从候补队列取最旧的一个 waiting 转正为 active（复用"used_capacity<capacity 原子占位"法，
   * cancel 释放一席后调用，故每次至多转正一人），并对转正用户即时通知。
   */
  async promoteWaiting(activityId: number) {
    const pending = await strapi.db.query(SIGNS_UID).findMany({
      where: { activity: activityId, status: "waiting" },
      orderBy: [{ signupAt: "asc" }, { id: "asc" }],
      populate: ["user"],
    });
    const knex = strapi.db.connection;
    const act = await strapi.db.query(ACTIVITY_UID).findOne({ where: { id: activityId } });
    let promoted = 0;
    for (const p of pending) {
      if (promoted >= 1) break; // 本次调用对应释放的一席，只转正一人
      const claimed = await knex("activities")
        .where("id", activityId)
        .andWhere("used_capacity", "<", knex.raw("capacity"))
        .increment("used_capacity", 1);
      if (claimed === 0) break; // 无空位（并发已吃满），停止
      const upUserId = p.user?.id ?? p.user;
      const resolved = await feeSvc().resolveFee(act ?? { id: activityId, pointsCost: 0, feeCollectAt: "signup", pricingMode: "flat" }, upUserId);
      const feeCollectAt = resolved.feeCollectAt || "signup";
      const cost = resolved.cost || 0;
      if (feeCollectAt === "signup" && cost > 0) {
        const userChannelId = await resolveUserChannelId(strapi, upUserId);
        try {
          await strapi.plugin("zhao-point").service("point").deductPoints({ userId: upUserId, action: "activity_fee", points: cost, source: "activity", method: "activity_promote", remark: `候补转正:${act?.title ?? ''}`, orderId: `act:${act?.id ?? activityId}`, userChannelId });
        } catch {
          await knex("activities").where("id", activityId).decrement("used_capacity", 1);
          continue;
        }
      }
      await strapi.db.query(SIGNS_UID).update({
        where: { id: p.id },
        data: { status: "active", signupAt: new Date(), pointsCharged: feeCollectAt === "signup" ? cost : 0, feeTierId: resolved.tierId ?? null },
      });
      // 候补转正补发分级积分：按转正当下达成项（表单/问卷取报名时存储值，登录/关注状态实时判定），与直接报名路径保持一致
      try {
        const loginAuth = await hasWechatAuth(strapi, upUserId);
        const subscribed = await hasSubscribe(strapi, upUserId);
        const conditions = {
          contact: contactFilled(act?.formConfig, p.formData),
          survey: surveyFilled(p.preQuestionnaireData, preQuestionnaireFields(act)),
        };
        await grantActivityPoints(strapi, upUserId, { loginAuth, subscribed, conditions });
      } catch (e: any) {
        strapi.log.warn(`[zhao-point:activity] promote grantActivityPoints failed (user=${upUserId}): ${e.message}`);
      }
      promoted++;
      if (upUserId) await this.notifyPromoted(upUserId, activityId);
    }
    return { promoted };
  },

  /** 候补序号（1-based）：按 signupAt 升序、同时间按 id 升序，统计排在该候补记录之前的 waiting 数 + 1 */
  async waitlistPositionOf(activityId: number, signup: { id: number; signupAt: Date | string }) {
    const waitCount = await strapi.db.query(SIGNS_UID).count({
      where: {
        activity: activityId,
        status: "waiting",
        $or: [
          { signupAt: { $lt: signup.signupAt } },
          { signupAt: signup.signupAt, id: { $lt: signup.id } },
        ],
      },
    });
    return waitCount + 1;
  },

  /** 递补转正即时通知：resolve sso 用户 → sso-msg.sendNow(act_promoted)，幂等；匹配不到/模板缺失降级不断链 */
  async notifyPromoted(upUserId: number, activityId: number) {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
      const act = await strapi.db.query("plugin::zhao-point.activity").findOne({ where: { id: activityId } });
      if (!sop || !msg || !act) return;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso) {
        strapi.log.warn(`[zhao-point:activity] promote notify skip: no sso for upUser=${upUserId}`);
        return;
      }
      await msg.sendNow({
        user: sso.id,
        scene: "activity.promoted",
        templateCode: "act_promoted",
        params: { name: act.title, time: act.startTime },
        dedupeKey: `activity:promote:${upUserId}:${activityId}`,
      });
      await this.notifyInApp(upUserId, activityId, "activity.promoted", { name: act.title, startTime: act.startTime }, `activity:promoted:${upUserId}:${activityId}`);
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] promote notify failed (user=${upUserId}): ${e.message}`);
    }
  },

  /** 站内信发送助手：resolve sso-user → sso-msg.sendInApp；无 sso/失败降级不断链 */
  async notifyInApp(upUserId: number, activityId: number, scene: string, params: Record<string, any>, dedupeKey: string) {
    try {
      const sop = strapi.plugin("zhao-sso")?.service("sso-sop");
      const msg = strapi.plugin("zhao-sso")?.service("sso-msg");
      if (!sop || !msg) return;
      const sso = await sop.resolveSsoUserForUpUser(upUserId);
      if (!sso) return;
      await msg.sendInApp({ user: sso.id, scene, params, dedupeKey });
    } catch (e: any) {
      strapi.log.warn(`[zhao-point:activity] sendInApp failed (${scene}, user=${upUserId}): ${e.message}`);
    }
  },

  async checkin({ userId, activityId, method, lat, lng }: {
    userId: number; activityId: string; method: "worker_scan" | "self"; lat?: number; lng?: number;
  }) {
    const attSvc = this as any;
    const act = await strapi.documents("plugin::zhao-point.activity").findOne({ documentId: activityId, populate: { learningPackageLessons: { populate: { course: true } } } });
    if (!act) throw new Error("活动不存在");
    const signup = await strapi.db.query(SIGNS_UID).findOne({ where: { user: userId, activity: act.id, status: "active" } });
    if (!signup) throw new Error("尚未报名");
    const existing = await strapi.db.query(ATT_UID).findOne({ where: { signup: signup.id } });
    if (existing) return { ok: false, reason: "already_checked_in", attendanceId: existing.id, point: existing.pointsGranted };

    let geoPassed = true;
    if (method === "self" && act.geoEnforced && typeof lat === "number" && typeof lng === "number") {
      geoPassed = haversineM(lat, lng, act.lat, act.lng) <= act.geoRadiusM;
      if (!geoPassed) throw new Error("不在活动场地范围内");
    }
    // 到场收费（checkin 模式）
    const resolved = await feeSvc().resolveFee(act, userId);
    if (resolved.feeCollectAt === "checkin" && (resolved.cost || 0) > 0) {
      const userChannelId = await resolveUserChannelId(strapi, userId);
      try {
        await strapi.plugin("zhao-point").service("point").deductPoints({ userId, action: "activity_fee", points: resolved.cost, source: "activity", method: "activity_checkin", remark: `到场收费:${act.title}`, orderId: `act:${act.documentId}`, userChannelId });
      } catch (e) {
        return { ok: false, reason: "insufficient_points" };
      }
    }
    const att = await strapi.db.query(ATT_UID).create({
      data: { signup: signup.id, method, checkinAt: new Date(), lat, lng, geoPassed, pointsGranted: false },
    });
    await strapi.db.query(SIGNS_UID).update({ where: { id: signup.id }, data: { attendedAt: new Date() } });

    await grantPoints(strapi, userId, "activity_attend", "活动到场签到");
    await strapi.db.query(ATT_UID).update({ where: { id: att.id }, data: { pointsGranted: true } });
    // 专属学习包：课时所属课程授权
    for (const lesson of act.learningPackageLessons || []) {
      if (lesson?.course?.id) await grantCourseTrial(strapi, userId, lesson.course.id);
    }
    return { ok: true, attendanceId: att.id, point: true };
  },
});