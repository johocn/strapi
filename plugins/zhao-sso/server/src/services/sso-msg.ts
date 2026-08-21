import type { Core } from "@strapi/strapi";
import { createWechatTemplateChannel } from "./channel/wechat-template";

const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";
const VERSION_UID = "plugin::zhao-sso.msg-template-version";

const MAX_RETRY = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 分钟后重试

/** 按权重加权随机选版本；weight<=0 剔除 */
function pickVersion(versions: any[]): any | null {
  const pool = (versions || []).filter((v: any) => (v.weight || 0) > 0);
  if (!pool.length) return null;
  const total = pool.reduce((s: number, v: any) => s + (v.weight || 0), 0);
  let r = Math.random() * total;
  for (const v of pool) {
    r -= v.weight || 0;
    if (r <= 0) return v;
  }
  return pool[pool.length - 1];
}

/** link 追加 utm 归因参数（utm_source=msg&utm_campaign=code&utm_content=jobId） */
function appendUtm(link: string | null, code: string, jobId: any): string | null {
  if (!link) return link;
  const sep = link.includes("?") ? "&" : "?";
  return `${link}${sep}utm_source=msg&utm_campaign=${encodeURIComponent(code)}&utm_content=${jobId}`;
}

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  // 通道注册表（后续扩展短信/企微/APP 时在此新增）
  function resolveChannel(provider: string) {
    const channels: Record<string, any> = {
      wechat: createWechatTemplateChannel({ strapi }),
    };
    const ch = channels[provider];
    if (!ch) throwErr("SSO_MSG_400", 400, `不支持的通道 provider=${provider}`);
    return ch;
  }

  /** 解析模板渲染参数：由 params + template.wxTemplateFields 映射成 {微信字段名:{value}} */
  function renderData(params: Record<string, any>, wxTemplateFields: Array<{ name: string; key: string }>) {
    const data: Record<string, { value: string }> = {};
    const list = Array.isArray(wxTemplateFields) ? wxTemplateFields : [];
    for (const f of list) {
      const key = f.key;
      const val = params?.[key];
      if (val === null || val === undefined) continue;
      data[f.name] = { value: String(val) };
    }
    return data;
  }

  async function resolveToTarget(userId: number, provider: string): Promise<string | null> {
    if (provider === "wechat") {
      // 说明：按 provider 拉最近绑定后在内存过滤 userId，绕开 Strapi 对关系 where(user=数字id)+orderBy 的编译缺陷(Undefined binding t2.id)
      const bindings = await strapi.db.query(BINDING_UID).findMany({
        where: { provider: "wechat" },
        orderBy: { id: "DESC" },
        limit: 100,
      });
      const b = bindings.find((x: any) => x.user === userId || (x.user && x.user.id === userId));
      return b?.provider_user_id || null;
    }
    return null;
  }

  return {
    /**
     * 构建消息任务(pending)。幂等：同 dedupeKey 已有未终态任务则跳过。
     * @param opts { user, scene, templateCode, params, link, scheduledAt?, dedupeKey? }
     */
    async buildJob(opts: {
      user: number;
      scene: string;
      templateCode: string;
      params?: Record<string, any>;
      link?: string;
      scheduledAt?: string;
      dedupeKey?: string;
    }) {
      const { user, scene, templateCode, params = {}, link, scheduledAt, dedupeKey } = opts;

      const template = await strapi.db.query(MSG_TEMPLATE_UID).findOne({
        where: { code: templateCode, isEnabled: true },
      });
      if (!template) throwErr("SSO_MSG_TEMPLATE_404", 404, `消息模板未找到或未启用: ${templateCode}`);

      // AB 版本选择：有 active 版本按权重随机选并固化；无则回退模板本体（link 兼容 opts.link）
      const versions = await strapi.db.query(VERSION_UID).findMany({
        where: { template: template.id, status: "active" },
      });
      const picked = pickVersion(versions);
      let useWxTemplateId = template.wxTemplateId;
      let useWxTemplateFields = template.wxTemplateFields;
      let useLink = template.link || link;
      if (picked) {
        useWxTemplateId = picked.wxTemplateId || template.wxTemplateId;
        useWxTemplateFields = picked.wxTemplateFields || template.wxTemplateFields;
        useLink = picked.link || template.link || link;
      }

      const provider = template.provider || "wechat";
      const key = dedupeKey || `${scene}:${user}`;

      // 幂等：存在任意未终态 job 则跳过
      const existing = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { dedupeKey: key },
      });
      if (existing && existing.status !== "sent" && existing.status !== "failed" && existing.status !== "cancelled") {
        return { job: existing, skipped: true };
      }

      const toTarget = await resolveToTarget(user, provider);

      const jobData: any = {
        user: user,
        scene,
        provider,
        params,
        link: null, // link 占位，创建后用 job.id 追加 utm 再更新
        version: picked ? picked.id : null,
        status: "pending",
        retryCount: 0,
        dedupeKey: key,
        template: template.id,
      };
      if (toTarget) jobData.toTarget = toTarget;
      if (scheduledAt) jobData.scheduledAt = scheduledAt;

      const job = await strapi.db.query(MSG_JOB_UID).create({ data: jobData });
      // utm 归因：用 job.id 回填 link（版本/模板/opts.link 任一存在即追加）
      if (useLink && job?.id) {
        const finalLink = appendUtm(useLink, picked ? picked.code : template.code, job.id);
        await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { link: finalLink } });
        job.link = finalLink;
      }
      return { job, skipped: false };
    },

    /**
     * 立即构建并发送（手动/单发）——同步执行，返回发送结果。
     */
    async sendNow(opts: {
      user: number;
      scene: string;
      templateCode: string;
      params?: Record<string, any>;
      link?: string;
      dedupeKey?: string;
    }) {
      const { job } = await this.buildJob(opts);
      if (!job) throwErr("SSO_MSG_500", 500, "创建任务失败");
      return this.sendJob(job.id);
    },

    /**
     * 发送指定 job（含重试上限），落库回执。
     */
    async sendJob(jobId: number) {
      const job = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { id: jobId },
        populate: { template: true, version: true, user: true },
      });
      if (!job) throwErr("SSO_MSG_JOB_404", 404, "消息任务不存在");
      if (job.status === "sent") return job;
      if (!job.template) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板");
      if (job.status === "failed" && job.retryCount >= MAX_RETRY) return job;

      // 触达频控：按用户每日上限 + 场景冷却在发送前拦截，超限置终态 quota_limited
      const qUserId = typeof job.user === "number" ? job.user : job.user?.id;
      const quota = await strapi
        .plugin("zhao-sso")
        .service("sso-quota")
        .evaluate({ userId: qUserId, scene: job.scene, templateId: job.template?.id });
      if (!quota.allowed) {
        strapi.log.warn(`[zhao-sso:msg] sent blocked by quota (user=${qUserId}, scene=${job.scene}): ${quota.reason}`);
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "quota_limited", result: { reason: quota.reason, scene: job.scene, detail: quota.detail || null } },
        });
        return this.getJob(job.id);
      }

      await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { status: "sending" } });

      const channel = resolveChannel(job.provider);

      let toTarget = job.toTarget;
      if (!toTarget) {
        toTarget = await resolveToTarget(job.user, job.provider);
        if (toTarget) {
          await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { toTarget } });
        }
      }

      if (!toTarget) {
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "failed", result: { reason: "no_target", message: "未解析到触达目标(openid)" } },
        });
        return this.getJob(job.id);
      }

      // 版本优先取内容，无版本（或字段为空）回退模板本体
      const wxFields = job.version?.wxTemplateFields || job.template.wxTemplateFields;
      const wxTemplateId = job.version?.wxTemplateId || job.template.wxTemplateId;
      if (!wxTemplateId) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板ID");
      const data = renderData(job.params || {}, wxFields);

      try {
        const res = await channel.send({
          openid: toTarget,
          templateId: wxTemplateId,
          url: job.link || undefined,
          data,
        });
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "sent", wxMsgId: String(res.msgId), sentAt: new Date(), result: res.raw || null },
        });
        // 发送成功 → 版本计数（失败/重试不累加）
        if (job.version?.id) {
          await strapi.db.query(VERSION_UID).update({
            where: { id: job.version.id },
            data: { sentCount: (job.version.sentCount || 0) + 1, successCount: (job.version.successCount || 0) + 1, lastUsedAt: new Date() },
          });
        }
      } catch (e: any) {
        const retryCount = (job.retryCount || 0) + 1;
        const retryable = retryCount <= MAX_RETRY && e?.code !== "SSO_MSG_NOT_SUBSCRIBE";
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: {
            status: retryable ? "pending" : "failed",
            retryCount,
            nextRetryAt: retryable ? new Date(Date.now() + RETRY_DELAY_MS) : null,
            result: { error: (e as any).message, code: (e as any).code || null },
          },
        });
      }
      return this.getJob(job.id);
    },

    async getJob(jobId: number) {
      const job = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { id: jobId },
        populate: { template: true, user: true },
      });
      if (!job) throwErr("SSO_MSG_JOB_404", 404, "消息任务不存在");
      return job;
    },

    /** 拉取待发送任务（供 cron 进程调度）。dueOnly=true 时只取已到发送时间的任务 */
    async listPendingJobsForSend(limit = 50, dueOnly = false) {
      const now = new Date();
      const where: any = { status: "pending" };
      if (dueOnly) {
        where.$or = [
          { scheduledAt: null },
          { scheduledAt: { $lte: now } },
          { nextRetryAt: { $lte: now } },
        ];
      }
      return strapi.db.query(MSG_JOB_UID).findMany({
        where,
        populate: { template: true },
        orderBy: { scheduledAt: "ASC" },
        limit,
      });
    },

    /** 查询/刷新用户公众号关注状态，落库到 sso-third-party-binding.subscribe */
    async refreshSubscribe(userId: number, appType = "official_account") {
      const binding = await strapi.db.query(BINDING_UID).findOne({
        where: { provider: "wechat", user: userId },
        orderBy: { id: "DESC" },
      });
      if (!binding) throwErr("SSO_MSG_BINDING_404", 404, "该用户无微信绑定，无法查询关注状态");

      const wechatSvc = strapi.plugin("zhao-sso").service("sso-wechat");
      const subscribe = (await wechatSvc.querySubscribe(binding.provider_user_id, binding.provider, appType)) || 0;

      await strapi.db.query(BINDING_UID).update({
        where: { id: binding.id },
        data: {
          subscribe,
          subscribe_at: new Date(),
          subscribe_check_at: new Date(),
        },
      });
      return subscribe;
    },
  };
};