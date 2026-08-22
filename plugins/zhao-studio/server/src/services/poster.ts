import type { Core } from '@strapi/strapi';

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  // Public: Get template by code with elements
  async getTemplate(code: string) {
    const templates = await strapi.documents('plugin::zhao-studio.poster-template').findMany({
      filters: { code, isActive: true },
      populate: { elements: true, site: true },
      limit: 1,
    }) as any[];
    
    if (!templates || templates.length === 0) return null;
    const template = templates[0];
    // Sort elements by sortOrder in memory
    if (template.elements && Array.isArray(template.elements)) {
      template.elements.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    return template;
  },

  // Public: Resolve template variables and return elements config
  async resolveTemplate(code: string, variables: Record<string, any>) {
    const template = await this.getTemplate(code);
    if (!template) return null;

    // Resolve each element
    const resolvedElements = (template.elements || []).map((element: any) => {
      const resolved: any = { ...element };
      
      // Resolve content
      if (element.isVariable && element.variableName) {
        if (element.variableName === 'invite_code' && !variables.invite_code) {
          // Invite code is optional, use default
          resolved.resolvedContent = element.defaultValue || '';
        } else {
          // 传入变量值优先，defaultValue 兜底（避免活动标题/时间被模板默认文案覆盖）
          resolved.resolvedContent = variables[element.variableName] || element.defaultValue || '';
        }
      } else {
        resolved.resolvedContent = element.content || '';
      }

      // Special handling for qrcode elements
      if (element.elementType === 'qrcode' && element.qrContentMode === 'url_with_invite') {
        const baseUrl = variables.qr_code || element.qrBaseUrl || '';
        const inviteCode = variables.invite_code;
        
        if (inviteCode) {
          // Append invite code
          const separator = element.qrInviteSeparator || '?';
          const param = element.qrInviteParam || 'inviteCode';
          resolved.resolvedContent = `${baseUrl}${separator}${param}=${inviteCode}`;
        } else {
          // Fallback based on qrFallbackMode
          const fallback = element.qrFallbackMode || 'base_url_only';
          if (fallback === 'base_url_only') {
            resolved.resolvedContent = baseUrl;
          } else if (fallback === 'default_value') {
            resolved.resolvedContent = element.defaultValue || baseUrl;
          } else if (fallback === 'hide_element') {
            resolved.hidden = true;
          }
        }
      }

      return resolved;
    }).filter((e: any) => !e.hidden);

    return {
      template: {
        canvasWidth: template.canvasWidth,
        canvasHeight: template.canvasHeight,
        backgroundColor: template.backgroundColor,
        backgroundImage: template.backgroundImage,
        backgroundMode: template.backgroundMode,
      },
      elements: resolvedElements,
    };
  },

  // Admin CRUD for templates
  async listTemplates(filters: any = {}) {
    return await strapi.documents('plugin::zhao-studio.poster-template').findMany({
      filters,
      populate: { elements: true, site: true },
      sort: { createdAt: 'desc' },
    });
  },

  async createTemplate(data: any) {
    return await strapi.documents('plugin::zhao-studio.poster-template').create({ data });
  },

  async findOneTemplate(documentId: string) {
    const template = await strapi.documents('plugin::zhao-studio.poster-template').findOne({
      documentId,
      populate: { elements: true, site: true },
    }) as any;
    // Sort elements by sortOrder in memory
    if (template && template.elements && Array.isArray(template.elements)) {
      template.elements.sort((a: any, b: any) => (a.sortOrder || 0) - (b.sortOrder || 0));
    }
    return template;
  },

  async updateTemplate(documentId: string, data: any) {
    return await strapi.documents('plugin::zhao-studio.poster-template').update({ documentId, data });
  },

  async deleteTemplate(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.poster-template').delete({ documentId });
  },

  async cloneTemplate(documentId: string) {
    const original = await this.findOneTemplate(documentId);
    if (!original) throw new Error('Template not found');

    const { id, documentId: _, createdAt, updatedAt, elements, ...templateData } = original;
    const cloned = await this.createTemplate({
      ...templateData,
      name: `${original.name} (副本)`,
      code: `${original.code}_copy_${Date.now()}`,
      isDefault: false,
    });

    // Clone elements
    if (elements && elements.length > 0) {
      for (const element of elements) {
        const { id: eid, documentId: edid, createdAt: eca, updatedAt: eua, posterTemplate: ept, ...elementData } = element;
        await strapi.documents('plugin::zhao-studio.poster-element').create({
          data: { ...elementData, posterTemplate: cloned.documentId },
        });
      }
    }

    return this.findOneTemplate(cloned.documentId);
  },

  // Batch save elements for a template
  async batchSaveElements(templateDocumentId: string, elements: any[]) {
    // Delete existing elements
    const existing = await strapi.documents('plugin::zhao-studio.poster-element').findMany({
      filters: { posterTemplate: templateDocumentId },
    });
    
    for (const el of existing || []) {
      await strapi.documents('plugin::zhao-studio.poster-element').delete({
        documentId: el.documentId,
      });
    }

    // Create new elements
    const created = [];
    for (const element of elements) {
      const el = await strapi.documents('plugin::zhao-studio.poster-element').create({
        data: { ...element, posterTemplate: templateDocumentId },
      });
      created.push(el);
    }

    return created;
  },

  // Admin CRUD for elements
  async listElements(filters: any = {}) {
    return await strapi.documents('plugin::zhao-studio.poster-element').findMany({
      filters,
      populate: { posterTemplate: true },
      sort: { sortOrder: 'asc' },
    });
  },

  async createElement(data: any) {
    return await strapi.documents('plugin::zhao-studio.poster-element').create({ data });
  },

  async updateElement(documentId: string, data: any) {
    return await strapi.documents('plugin::zhao-studio.poster-element').update({ documentId, data });
  },

  async deleteElement(documentId: string) {
    return await strapi.documents('plugin::zhao-studio.poster-element').delete({ documentId });
  },

  // Seed default templates (called from bootstrap or manual trigger)
  async seedDefaultTemplate() {
    strapi.log.info('[zhao-studio] Starting default poster template seed...');

    // Get first site
    const sites = await strapi.documents('plugin::zhao-common.site-config').findMany({ limit: 1 });
    if (!sites || sites.length === 0) {
      strapi.log.warn('[zhao-studio] No site found, skipping default poster template seed');
      return { success: false, reason: 'no_site' };
    }
    const siteId = sites[0].documentId;
    strapi.log.info(`[zhao-studio] Using site documentId: ${siteId}`);

    // Gradient color convention: front-end parses '#gradient:' prefix
    const gradientColor = '#gradient:667eea,764ba2';

    // Define 3 default templates
    const templates = [
      {
        name: '企业品牌海报',
        code: 'brand_share',
        isDefault: true,
        requiredVariables: ['title', 'values', 'main_image', 'qr_code'],
        optionalVariables: ['logo', 'invite_code'],
        elements: [
          { elementKey: 'gradient_bar', elementType: 'shape', elementName: '顶部渐变条', isVariable: false, shapeType: 'rect', x: 0, y: 0, width: 600, height: 6, elementBgColor: gradientColor, zIndex: 1, sortOrder: 1 },
          { elementKey: 'logo', elementType: 'image', elementName: 'Logo', isVariable: true, variableName: 'logo', defaultValue: '', x: 510, y: 40, width: 60, height: 60, imageFit: 'contain', zIndex: 10, sortOrder: 2 },
          { elementKey: 'title', elementType: 'text', elementName: '标题', isVariable: true, variableName: 'title', defaultValue: '', x: 30, y: 120, width: 540, height: 50, fontSize: 36, fontColor: '#333333', fontWeight: 'bold', textAlign: 'center', zIndex: 10, sortOrder: 3 },
          { elementKey: 'values', elementType: 'text', elementName: '价值描述', isVariable: true, variableName: 'values', defaultValue: '', x: 30, y: 185, width: 540, height: 80, fontSize: 26, fontColor: '#666666', textAlign: 'center', lineHeight: 1.6, zIndex: 10, sortOrder: 4 },
          { elementKey: 'main_image', elementType: 'image', elementName: '主图', isVariable: true, variableName: 'main_image', defaultValue: '', x: 30, y: 290, width: 540, height: 300, imageFit: 'cover', borderRadius: 12, zIndex: 5, sortOrder: 5 },
          { elementKey: 'qr_code', elementType: 'qrcode', elementName: '分享二维码', isVariable: false, qrContentMode: 'url_with_invite', qrBaseUrl: 'https://v.joho.cn/share', qrInviteParam: 'inviteCode', qrFallbackMode: 'base_url_only', x: 200, y: 640, width: 200, height: 200, qrSize: 200, qrColor: '#000000', qrBgColor: '#FFFFFF', zIndex: 10, sortOrder: 6 },
          { elementKey: 'footer_text', elementType: 'text', elementName: '底部提示', isVariable: false, content: '扫码立即体验', x: 30, y: 870, width: 540, height: 30, fontSize: 24, fontColor: '#999999', textAlign: 'center', zIndex: 10, sortOrder: 7 },
        ],
      },
      {
        name: '课程推荐海报',
        code: 'course_share',
        isDefault: false,
        requiredVariables: ['user_name', 'course_image', 'qr_code'],
        optionalVariables: ['user_avatar', 'recommend_reason', 'invite_code'],
        elements: [
          { elementKey: 'gradient_bar', elementType: 'shape', elementName: '顶部渐变条', isVariable: false, shapeType: 'rect', x: 0, y: 0, width: 600, height: 6, elementBgColor: gradientColor, zIndex: 1, sortOrder: 1 },
          { elementKey: 'user_avatar', elementType: 'image', elementName: '用户头像', isVariable: true, variableName: 'user_avatar', defaultValue: '', x: 30, y: 40, width: 50, height: 50, imageFit: 'cover', borderRadius: 25, zIndex: 10, sortOrder: 2 },
          { elementKey: 'user_name', elementType: 'text', elementName: '用户名', isVariable: true, variableName: 'user_name', defaultValue: '', x: 90, y: 55, width: 300, height: 30, fontSize: 24, fontColor: '#333333', fontWeight: 'bold', textAlign: 'left', zIndex: 10, sortOrder: 3 },
          { elementKey: 'course_image', elementType: 'image', elementName: '课程封面', isVariable: true, variableName: 'course_image', defaultValue: '', x: 30, y: 120, width: 540, height: 280, imageFit: 'cover', borderRadius: 12, zIndex: 5, sortOrder: 4 },
          { elementKey: 'recommend_reason', elementType: 'text', elementName: '推荐理由', isVariable: true, variableName: 'recommend_reason', defaultValue: '', x: 30, y: 430, width: 540, height: 100, fontSize: 26, fontColor: '#555555', textAlign: 'left', lineHeight: 1.6, zIndex: 10, sortOrder: 5 },
          { elementKey: 'qr_code', elementType: 'qrcode', elementName: '分享二维码', isVariable: false, qrContentMode: 'url_with_invite', qrBaseUrl: 'https://v.joho.cn/share', qrInviteParam: 'inviteCode', qrFallbackMode: 'base_url_only', x: 200, y: 580, width: 200, height: 200, qrSize: 200, qrColor: '#000000', qrBgColor: '#FFFFFF', zIndex: 10, sortOrder: 6 },
          { elementKey: 'footer_text', elementType: 'text', elementName: '底部提示', isVariable: false, content: '扫码一起学习', x: 30, y: 810, width: 540, height: 30, fontSize: 24, fontColor: '#999999', textAlign: 'center', zIndex: 10, sortOrder: 7 },
        ],
      },
      {
        name: '活动分享海报',
        code: 'activity_share',
        isDefault: false,
        requiredVariables: ['title', 'qr_code'],
        optionalVariables: ['activity_time', 'activity_venue', 'invite_code'],
        elements: [
          { elementKey: 'gradient_bar', elementType: 'shape', elementName: '顶部渐变条', isVariable: false, shapeType: 'rect', x: 0, y: 0, width: 600, height: 6, elementBgColor: gradientColor, zIndex: 1, sortOrder: 1 },
          { elementKey: 'title', elementType: 'text', elementName: '活动标题', isVariable: true, variableName: 'title', defaultValue: '精品线下活动', x: 30, y: 150, width: 540, height: 60, fontSize: 36, fontColor: '#333333', fontWeight: 'bold', textAlign: 'left', lineHeight: 1.4, zIndex: 10, sortOrder: 3 },
          { elementKey: 'activity_time', elementType: 'text', elementName: '活动时间', isVariable: true, variableName: 'activity_time', defaultValue: '活动时间 · 待定', x: 30, y: 240, width: 540, height: 40, fontSize: 26, fontColor: '#666666', textAlign: 'left', zIndex: 10, sortOrder: 4 },
          { elementKey: 'activity_venue', elementType: 'text', elementName: '活动场所', isVariable: true, variableName: 'activity_venue', defaultValue: '活动场所 · 待定', x: 30, y: 295, width: 540, height: 40, fontSize: 26, fontColor: '#666666', textAlign: 'left', zIndex: 10, sortOrder: 5 },
          { elementKey: 'main_info_badge', elementType: 'text', elementName: '扫码报名标签', isVariable: false, content: '扫码报名', x: 225, y: 390, width: 150, height: 44, fontSize: 24, fontColor: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', elementBgColor: '#667eea', borderRadius: 8, zIndex: 10, sortOrder: 6 },
          { elementKey: 'qr_code', elementType: 'qrcode', elementName: '分享二维码', isVariable: false, qrContentMode: 'url_with_invite', qrBaseUrl: 'https://v.joho.cn/share', qrInviteParam: 'inviteCode', qrInviteSeparator: '?', qrFallbackMode: 'base_url_only', x: 200, y: 480, width: 200, height: 200, qrSize: 200, qrColor: '#000000', qrBgColor: '#FFFFFF', zIndex: 10, sortOrder: 7 },
          { elementKey: 'footer_text', elementType: 'text', elementName: '底部提示', isVariable: false, content: '名额有限 · 扫码报名参加', x: 30, y: 720, width: 540, height: 30, fontSize: 24, fontColor: '#999999', textAlign: 'center', zIndex: 10, sortOrder: 8 },
        ],
      },
      {
        name: '积分兑换海报',
        code: 'product_share',
        isDefault: false,
        requiredVariables: ['user_name', 'product_image', 'product_name', 'product_price', 'qr_code'],
        optionalVariables: ['user_avatar', 'recommend_reason', 'invite_code'],
        elements: [
          { elementKey: 'gradient_bar', elementType: 'shape', elementName: '顶部渐变条', isVariable: false, shapeType: 'rect', x: 0, y: 0, width: 600, height: 6, elementBgColor: gradientColor, zIndex: 1, sortOrder: 1 },
          { elementKey: 'user_avatar', elementType: 'image', elementName: '用户头像', isVariable: true, variableName: 'user_avatar', defaultValue: '', x: 30, y: 40, width: 50, height: 50, imageFit: 'cover', borderRadius: 25, zIndex: 10, sortOrder: 2 },
          { elementKey: 'user_name', elementType: 'text', elementName: '用户名', isVariable: true, variableName: 'user_name', defaultValue: '', x: 90, y: 55, width: 300, height: 30, fontSize: 24, fontColor: '#333333', fontWeight: 'bold', textAlign: 'left', zIndex: 10, sortOrder: 3 },
          { elementKey: 'exchange_badge', elementType: 'text', elementName: '兑换标签', isVariable: false, content: '积分兑换', x: 30, y: 130, width: 110, height: 32, fontSize: 14, fontColor: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', elementBgColor: '#FF6B00', borderRadius: 4, zIndex: 20, sortOrder: 4 },
          { elementKey: 'product_image', elementType: 'image', elementName: '产品图', isVariable: true, variableName: 'product_image', defaultValue: '', x: 30, y: 120, width: 540, height: 260, imageFit: 'cover', borderRadius: 12, zIndex: 5, sortOrder: 5 },
          { elementKey: 'product_name', elementType: 'text', elementName: '产品名称', isVariable: true, variableName: 'product_name', defaultValue: '', x: 30, y: 410, width: 540, height: 40, fontSize: 32, fontColor: '#333333', fontWeight: 'bold', textAlign: 'left', zIndex: 10, sortOrder: 6 },
          { elementKey: 'product_price', elementType: 'text', elementName: '产品价格', isVariable: true, variableName: 'product_price', defaultValue: '', x: 30, y: 465, width: 300, height: 35, fontSize: 28, fontColor: '#FF4444', fontWeight: 'bold', textAlign: 'left', zIndex: 10, sortOrder: 7 },
          { elementKey: 'recommend_reason', elementType: 'text', elementName: '推荐理由', isVariable: true, variableName: 'recommend_reason', defaultValue: '', x: 30, y: 520, width: 540, height: 70, fontSize: 24, fontColor: '#555555', textAlign: 'left', lineHeight: 1.6, zIndex: 10, sortOrder: 8 },
          { elementKey: 'qr_code', elementType: 'qrcode', elementName: '分享二维码', isVariable: false, qrContentMode: 'url_with_invite', qrBaseUrl: 'https://v.joho.cn/share', qrInviteParam: 'inviteCode', qrFallbackMode: 'base_url_only', x: 210, y: 620, width: 180, height: 180, qrSize: 180, qrColor: '#000000', qrBgColor: '#FFFFFF', zIndex: 10, sortOrder: 9 },
          { elementKey: 'footer_text', elementType: 'text', elementName: '底部提示', isVariable: false, content: '扫码积分兑换好物', x: 30, y: 830, width: 540, height: 30, fontSize: 24, fontColor: '#999999', textAlign: 'center', zIndex: 10, sortOrder: 10 },
        ],
      },
    ];

    for (const tpl of templates) {
      // Check if template with this code already exists
      const existing = await strapi.documents('plugin::zhao-studio.poster-template').findMany({
        filters: { code: tpl.code },
        limit: 1,
      });

      if (existing && existing.length > 0) {
        strapi.log.info(`[zhao-studio] Poster template "${tpl.code}" already exists, skipping`);
        continue;
      }

      // Create template
      const template = await this.createTemplate({
        name: tpl.name,
        code: tpl.code,
        site: siteId,
        canvasWidth: 600,
        canvasHeight: 1000,
        backgroundColor: '#FFFFFF',
        isDefault: tpl.isDefault,
        isActive: true,
        requiredVariables: tpl.requiredVariables,
        optionalVariables: tpl.optionalVariables,
      });

      strapi.log.info(`[zhao-studio] Template created: ${tpl.code} (documentId: ${template.documentId})`);

      // Create elements
      for (const el of tpl.elements) {
        await this.createElement({ ...el, posterTemplate: template.documentId });
      }

      strapi.log.info(`[zhao-studio] Poster template "${tpl.code}" seeded successfully`);
    }

    strapi.log.info('[zhao-studio] Default poster templates seed completed');
    return { success: true, templates: templates.length };
  },
});
