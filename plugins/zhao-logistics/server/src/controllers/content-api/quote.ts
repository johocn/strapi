const QUOTE_REQUEST_UID = "plugin::zhao-logistics.quote-request";

export default {
  /**
   * GET /v1/quote/fields — 加载动态字段规则
   */
  async loadFields(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, customerType, lang } = ctx.query;
    const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
      routeId,
      serviceProvider,
      customerType,
      lang,
    });
    ctx.body = { data: fields };
  },

  /**
   * POST /v1/quote/calculate — 公开报价计算
   */
  async calculate(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const { routeId, serviceProvider, weight, length, width, height, variables } = ctx.request.body;
    if (!routeId || !weight) return ctx.badRequest("routeId 和 weight 必填");

    const result = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider,
      weight: Number(weight),
      length: length ? Number(length) : undefined,
      width: width ? Number(width) : undefined,
      height: height ? Number(height) : undefined,
      variables,
    });

    if (!result) return ctx.notFound("未找到匹配的报价规则");
    ctx.body = { data: result };
  },

  /**
   * POST /v1/quote/submit — 提交询价（集成点 6.1）
   * 1. dynamic-form.loadFields + validate
   * 2. quote-engine.calculate
   * 3. 创建 quote-request
   * 4. 调 zhao-website.lead.createPublic（type=quote）
   * 5. customer-aggregator.upsertFromQuote
   * 6. referral-engine.applyCode（若有 referralCode）
   * 7. funnel-tracker.track('quote_submit')
   */
  async submit(ctx: any) {
    const siteId = ctx.state.siteId;
    if (!siteId) return ctx.badRequest("siteId 未设置");
    const body = ctx.request.body;

    // 1. 校验必填
    const { routeId, origin, destination, cargoType, weight, customerName, customerContact, lang, formData, referralCode, utm } = body;
    if (!routeId || !origin || !destination || !cargoType || !weight || !customerName || !customerContact || !lang) {
      return ctx.badRequest("缺少必填字段");
    }

    // 2. 动态字段校验（可选）
    if (formData) {
      const fields = await strapi.plugin("zhao-logistics").service("dynamic-form").loadFields(siteId, {
        routeId,
        customerType: body.customerType,
        lang,
      });
      const validation = strapi.plugin("zhao-logistics").service("dynamic-form").validate(siteId, formData, fields);
      if (!validation.valid) {
        return ctx.badRequest("表单校验失败", { errors: validation.errors });
      }
    }

    // 3. 计算报价
    const quoteResult = await strapi.plugin("zhao-logistics").service("quote-engine").calculate(siteId, {
      routeId,
      serviceProvider: body.serviceProvider,
      weight: Number(weight),
      length: body.length,
      width: body.width,
      height: body.height,
    });

    // 4. 生成询价单号
    const trackingNo = `QR${Date.now()}${Math.floor(Math.random() * 100)}`;

    // 5. 创建 quote-request
    const quoteRequest = await strapi.db.query(QUOTE_REQUEST_UID).create({
      data: {
        site: siteId,
        trackingNo,
        routeId,
        origin,
        destination,
        serviceProvider: body.serviceProvider || null,
        cargoType,
        weight: Number(weight),
        volume: body.volume || null,
        formData: formData || {},
        quotedPrice: quoteResult || null,
        status: "submitted",
        customerName,
        customerContact,
        customerType: body.customerType || null,
        utmSource: utm?.source || null,
        utmMedium: utm?.medium || null,
        utmCampaign: utm?.campaign || null,
        lang,
        remark: body.remark || null,
        expiresAt: quoteResult?.expiresAt || null,
      },
    });

    // 6. 创建 lead（type=quote，sourceId=quoteRequest.documentId）
    let leadId: string | null = null;
    try {
      const lead = await strapi.plugin("zhao-website").service("lead").createPublic(siteId, {
        type: "quote",
        contactName: customerName,
        contactPhone: typeof customerContact === "string" ? customerContact : JSON.stringify(customerContact),
        sourceType: "quote_submit",
        sourceId: quoteRequest.documentId,
        referralCode: referralCode || null,
        utmSource: utm?.source || null,
        utmMedium: utm?.medium || null,
        utmCampaign: utm?.campaign || null,
        message: body.remark || null,
      }, ctx);
      leadId = lead?.documentId || null;
      if (leadId) {
        await strapi.db.query(QUOTE_REQUEST_UID).update({
          where: { documentId: quoteRequest.documentId },
          data: { leadId },
        });
      }
    } catch (err: any) {
      strapi.log.error(`[quote.submit] lead 创建失败: ${err.message}`);
    }

    // 7. 客户档案聚合
    try {
      await strapi.plugin("zhao-logistics").service("customer-aggregator").upsertFromQuote(siteId, quoteRequest.documentId);
    } catch (err: any) {
      strapi.log.error(`[quote.submit] 客户档案更新失败: ${err.message}`);
    }

    // 8. 推荐码应用
    if (referralCode) {
      try {
        await strapi.plugin("zhao-logistics").service("referral-engine").applyCode(siteId, referralCode, {
          name: customerName,
          contact: customerContact,
          source: "quote_submit",
        });
      } catch (err: any) {
        strapi.log.error(`[quote.submit] 推荐码应用失败: ${err.message}`);
      }
    }

    // 9. 漏斗事件
    try {
      await strapi.plugin("zhao-logistics").service("funnel-tracker").track(siteId, {
        eventName: "quote_submit",
        visitorId: ctx.request.headers["x-visitor-id"] || `q_${quoteRequest.documentId}`,
        userId: ctx.state.user?.id,
        landingPageId: body.landingPageId,
        quoteRequestId: quoteRequest.documentId,
        utm,
        lang,
        ctx,
      });
    } catch (err: any) {
      strapi.log.error(`[quote.submit] 漏斗事件记录失败: ${err.message}`);
    }

    ctx.body = {
      data: {
        quoteRequestId: quoteRequest.documentId,
        trackingNo,
        quote: quoteResult,
        leadId,
      },
    };
  },
};
