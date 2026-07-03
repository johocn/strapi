import type { Core } from "@strapi/strapi";

const TEMPLATE_UID = "plugin::zhao-common.site-template";
const SITE_CONFIG_UID = "plugin::zhao-common.site-config";

/**
 * 解析 extraConfig：兼容对象/字符串两种返回形式
 * Strapi v5 Document Service 对 JSON 字段在某些情况下返回字符串而非对象
 */
function parseExtraConfig(raw: any): Record<string, any> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return raw;
  if (typeof raw === "string" && raw.trim()) {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /**
   * 列出模板
   */
  async listTemplates(filters: Record<string, any> = {}) {
    // 过滤掉分页等非 filters 字段（Document Service 不接受 pageSize 等 key）
    const { pageSize, page, sort, ...safeFilters } = filters as any;
    return strapi.documents(TEMPLATE_UID).findMany({ filters: safeFilters, populate: { sites: { fields: ["documentId"] } } as any });
  },

  /**
   * 获取模板
   */
  async getTemplate(documentId: string) {
    return strapi.documents(TEMPLATE_UID).findOne({ documentId, populate: { sites: { fields: ["documentId"] } } as any });
  },

  /**
   * 创建模板
   */
  async createTemplate(data: any) {
    // 校验 name 非空
    if (!data.name || typeof data.name !== "string" || !data.name.trim()) {
      const e: any = new Error("模板名称不能为空");
      e.status = 400;
      throw e;
    }
    // 校验 presetConfig 和 fieldConstraints 为纯对象
    if (data.presetConfig !== undefined && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e: any = new Error("presetConfig 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== undefined && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e: any = new Error("fieldConstraints 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    // isDefault 唯一性：新模板设为默认时，清除其他模板的默认标记
    if (data.isDefault) {
      await this._clearDefaultFlag();
    }
    return strapi.documents(TEMPLATE_UID).create({ data });
  },

  /**
   * 更新模板
   */
  async updateTemplate(documentId: string, data: any) {
    // 校验 name 非空（如果传了 name）
    if (data.name !== undefined && (typeof data.name !== "string" || !data.name.trim())) {
      const e: any = new Error("模板名称不能为空");
      e.status = 400;
      throw e;
    }
    // 校验 presetConfig 和 fieldConstraints 为纯对象
    if (data.presetConfig !== undefined && (typeof data.presetConfig !== "object" || data.presetConfig === null || Array.isArray(data.presetConfig))) {
      const e: any = new Error("presetConfig 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    if (data.fieldConstraints !== undefined && (typeof data.fieldConstraints !== "object" || data.fieldConstraints === null || Array.isArray(data.fieldConstraints))) {
      const e: any = new Error("fieldConstraints 必须是 JSON 对象");
      e.status = 400;
      throw e;
    }
    // isDefault 唯一性：设为默认时，清除其他模板的默认标记
    if (data.isDefault) {
      await this._clearDefaultFlag(documentId);
    }
    return strapi.documents(TEMPLATE_UID).update({ documentId, data });
  },

  /**
   * 删除模板
   * 先清除关联站点的 template 引用，再删除模板
   */
  async deleteTemplate(documentId: string) {
    // 获取模板预设值，用于清理站点 extraConfig 中的固化值
    const template: any = await this.getTemplate(documentId);
    if (!template) {
      const e: any = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    // 不允许删除默认模板，需先将其他模板设为默认
    if (template.isDefault) {
      const e: any = new Error("默认模板不可删除，请先将其他模板设为默认");
      e.status = 400;
      throw e;
    }
    const presetConfig = (template.presetConfig && typeof template.presetConfig === "object" && !Array.isArray(template.presetConfig))
      ? template.presetConfig : {};

    // 查找关联站点并清除 template 关系 + 清理 extraConfig 中的模板预设值
    const linkedSites = await strapi.documents(SITE_CONFIG_UID).findMany({
      filters: { template: documentId },
    });
    if (Array.isArray(linkedSites)) {
      for (const site of linkedSites) {
        // 合并模板预设值到 extraConfig（租户覆盖值优先），确保删除模板后配置完整
        const safeExtra = (site.extraConfig && typeof site.extraConfig === "object" && !Array.isArray(site.extraConfig))
          ? site.extraConfig : {};
        const extraConfig = { ...presetConfig, ...safeExtra };
        await strapi.documents(SITE_CONFIG_UID).update({
          documentId: site.documentId,
          data: { template: null, extraConfig } as any,
        });
      }
    }
    return strapi.documents(TEMPLATE_UID).delete({ documentId });
  },

  /**
   * 获取默认模板
   */
  async getDefaultTemplate() {
    const records = await strapi.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true, enabled: true },
    });
    if (Array.isArray(records) && records.length > 0) {
      return records[0];
    }
    // 兜底：返回第一个启用的模板
    const allRecords = await strapi.documents(TEMPLATE_UID).findMany({
      filters: { enabled: true },
    });
    if (Array.isArray(allRecords) && allRecords.length > 0) {
      return allRecords[0];
    }
    return null;
  },

  /**
   * 将模板应用到站点
   * @param mode 'overwrite' 覆盖模式（模板预设值替换租户配置），'merge' 合并模式（租户自定义值保留，模板补充缺失字段）
   */
  async applyTemplateToSite(templateDocumentId: string, siteDocumentId: string, mode: "overwrite" | "merge" = "merge") {
    const template: any = await this.getTemplate(templateDocumentId);
    if (!template) {
      const e: any = new Error("模板不存在");
      e.status = 404;
      throw e;
    }
    if (template.enabled === false) {
      const e: any = new Error("模板已禁用，无法应用");
      e.status = 400;
      throw e;
    }

    let extraConfig: Record<string, any>;
    // 校验站点存在（两种模式都需要）
    const currentSite: any = await strapi.documents(SITE_CONFIG_UID).findOne({
      documentId: siteDocumentId,
      populate: ["template"],
    });
    if (!currentSite) {
      const e: any = new Error("站点不存在");
      e.status = 404;
      throw e;
    }
    if (mode === "overwrite") {
      // 覆盖模式：所有值等于模板预设值，无需存储（读取层通过 getMergedConfig 合并）
      extraConfig = {};
    } else {
      // 合并模式：模板预设值 ← 租户自定义值（租户值优先）
      // 只存租户覆盖值：剔除与模板预设值相同的字段
      // 注意：非模板字段（不在 presetConfig 中的）会被保留在 extraConfig 中
      // 如果模板后续新增了同名字段，租户值会覆盖模板预设值（符合"租户优先"语义）
      const safePreset = (template.presetConfig && typeof template.presetConfig === "object" && !Array.isArray(template.presetConfig))
        ? template.presetConfig : {};
      const safeCurrentExtra = (currentSite.extraConfig && typeof currentSite.extraConfig === "object" && !Array.isArray(currentSite.extraConfig))
        ? currentSite.extraConfig : {};
      const merged = {
        ...safePreset,
        ...safeCurrentExtra,
      };
      extraConfig = {};
      for (const [key, value] of Object.entries(merged)) {
        if (!(key in safePreset) || value !== safePreset[key]) {
          extraConfig[key] = value;
        }
      }
    }

    await strapi.documents(SITE_CONFIG_UID).update({
      documentId: siteDocumentId,
      data: {
        extraConfig,
        template: template.documentId,
      } as any,
    });

    return { success: true, templateName: template.name, mode };
  },

  /**
   * 获取合并后的配置（模板预设 + 租户自定义）
   * 租户自定义值覆盖模板预设值
   * @param siteConfig 站点配置对象（避免重复查询）
   */
  async getMergedConfig(siteConfig: any) {
    if (!siteConfig) {
      return { config: {}, meta: null };
    }

    const templateId = siteConfig.template?.documentId ?? siteConfig.template;
    let template: any = null;

    if (templateId) {
      template = await this.getTemplate(templateId);
    }

    const tenantEc = parseExtraConfig(siteConfig.extraConfig);
    // 历史数据兼容：若 extraConfig 自身又嵌套了 extraConfig 字段（旧保存逻辑 bug），提取内层
    if (tenantEc.extraConfig) {
      const inner = parseExtraConfig(tenantEc.extraConfig);
      Object.assign(tenantEc, inner);
      delete tenantEc.extraConfig;
    }

    // 没有关联模板或模板被禁用，直接返回租户配置
    if (!template || template.enabled === false) {
      return {
        config: tenantEc,
        meta: null,
      };
    }

    // 合并：模板预设值 ← 租户自定义值
    const preset = parseExtraConfig(template.presetConfig);
    const mergedConfig = {
      ...preset,
      ...tenantEc,
    };

    const fieldConstraints = parseExtraConfig(template.fieldConstraints);

    const meta = {
      templateId: template.documentId,
      templateName: template.name,
      fieldConstraints,
      presetKeys: Object.keys(preset),
    };

    return { config: mergedConfig, meta };
  },

  /**
   * 校验更新是否在模板约束范围内
   * 返回 { valid: true } 或 { valid: false, deniedFields: [...] }
   */
  async validateUpdate(siteId: string, updateData: Record<string, any>) {
    const siteConfigService = strapi.plugin("zhao-common").service("site-config");
    const siteConfig: any = await siteConfigService.getConfig(siteId);

    if (!siteConfig) {
      return { valid: true };
    }

    const templateId = siteConfig.template?.documentId ?? siteConfig.template;
    if (!templateId) {
      return { valid: true };
    }

    const template: any = await this.getTemplate(templateId);
    if (!template || template.enabled === false) {
      return { valid: true };
    }
    const constraints = template.fieldConstraints;
    if (!constraints || typeof constraints !== "object" || Array.isArray(constraints)) {
      return { valid: true };
    }
    const deniedFields: string[] = [];

    for (const key of Object.keys(updateData)) {
      const fieldConstraint = constraints[key];
      if (fieldConstraint && (fieldConstraint.editable === false || fieldConstraint.visible === false)) {
        deniedFields.push(key);
      }
    }

    if (deniedFields.length > 0) {
      return {
        valid: false,
        deniedFields,
        message: `以下字段受模板约束不可修改: ${deniedFields.join(", ")}`,
      };
    }

    return { valid: true };
  },

  /**
   * 清除其他模板的 isDefault 标记（确保唯一性）
   * @param excludeDocumentId 排除的模板ID（更新时排除自身）
   */
  async _clearDefaultFlag(excludeDocumentId?: string) {
    const defaults = await strapi.documents(TEMPLATE_UID).findMany({
      filters: { isDefault: true },
    });
    if (Array.isArray(defaults)) {
      for (const tpl of defaults) {
        if (tpl.documentId !== excludeDocumentId) {
          await strapi.documents(TEMPLATE_UID).update({
            documentId: tpl.documentId,
            data: { isDefault: false } as any,
          });
        }
      }
    }
  },
});
