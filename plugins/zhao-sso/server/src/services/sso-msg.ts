import type { Core } from "@strapi/strapi";
import { createWechatTemplateChannel } from "./channel/wechat-template";

const MSG_TEMPLATE_UID = "plugin::zhao-sso.msg-template";
const MSG_JOB_UID = "plugin::zhao-sso.msg-job";
const BINDING_UID = "plugin::zhao-sso.sso-third-party-binding";

const MAX_RETRY = 3;
const RETRY_DELAY_MS = 5 * 60 * 1000; // 5 分钟后重试

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
      const binding = await strapi.db.query(BINDING_UID).findOne({
        where: { provider: "wechat", user: userId },
        orderBy: { id: "DESC" },
      });
      return binding?.provider_user_id || null;
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
        where: { code: templateCode, is_enabled: true },
      });
      if (!template) throwErr("SSO_MSG_TEMPLATE_404", 404, `消息模板未找到或未启用: ${templateCode}`);

      const provider = template.provider || "wechat";
      const key = dedupeKey || `${scene}:${user}`;

      // 幂等：存在任意未终态 job 则跳过
      const existing = await strapi.db.query(MSG_JOB_UID).findOne({
        where: { dedupe_key: key },
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
        link: link || null,
        status: "pending",
        retryCount: 0,
        dedupe_key: key,
        template: template.id,
      };
      if (toTarget) jobData.to_target = toTarget;
      if (scheduledAt) jobData.scheduled_at = scheduledAt;

      const job = await strapi.db.query(MSG_JOB_UID).create({ data: jobData });
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
        populate: { template: true },
      });
      if (!job) throwErr("SSO_MSG_JOB_404", 404, "消息任务不存在");
      if (job.status === "sent") return job;
      if (!job.template) throwErr("SSO_MSG_JOB_500", 500, "任务缺少模板");
      if (job.status === "failed" && job.retryCount >= MAX_RETRY) return job;

      await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { status: "sending" } });

      const channel = resolveChannel(job.provider);

      let toTarget = job.to_target;
      if (!toTarget) {
        toTarget = await resolveToTarget(job.user, job.provider);
        if (toTarget) {
          await strapi.db.query(MSG_JOB_UID).update({ where: { id: job.id }, data: { to_target: toTarget } });
        }
      }

      if (!toTarget) {
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "failed", result: { reason: "no_target", message: "未解析到触达目标(openid)" } },
        });
        return this.getJob(job.id);
      }

      const data = renderData(job.params || {}, job.template.wxTemplateFields);

      try {
        const res = await channel.send({
          openid: toTarget,
          templateId: job.template.wxTemplateId,
          url: job.link || undefined,
          data,
        });
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: { status: "sent", wx_msg_id: String(res.msgId), sent_at: new Date(), result: res.raw || null },
        });
      } catch (e: any) {
        const retryCount = (job.retryCount || 0) + 1;
        const retryable = retryCount <= MAX_RETRY && e?.code !== "SSO_MSG_NOT_SUBSCRIBE";
        await strapi.db.query(MSG_JOB_UID).update({
          where: { id: job.id },
          data: {
            status: retryable ? "pending" : "failed",
            retryCount,
            next_retry_at: retryable ? new Date(Date.now() + RETRY_DELAY_MS) : null,
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

    /** 拉取待发送任务（供 cron 进程调度） */
    async listPendingJobsForSend(limit = 50) {
      return strapi.db.query(MSG_JOB_UID).findMany({
        where: {
          status: "pending",
        },
        populate: { template: true },
        orderBy: { scheduled_at: "ASC" },
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