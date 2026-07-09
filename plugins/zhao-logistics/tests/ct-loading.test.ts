import contentTypes from "../server/src/content-types";

describe("zhao-logistics Content Types", () => {
  const expectedCTs = [
    "quote-request",
    "quote-field-rule",
    "quote-price-rule",
    "quote-price-formula",
    "tracking-shipment",
    "tracking-node",
    "tracking-provider",
    "contact-matrix",
  ];

  test("应注册 8 个核心业务 CT", () => {
    expect(Object.keys(contentTypes)).toHaveLength(8);
    expectedCTs.forEach((ct) => {
      expect(contentTypes).toHaveProperty(ct);
    });
  });

  test("每个 CT 都有 schema", () => {
    for (const ct of expectedCTs) {
      expect(contentTypes[ct].schema).toBeDefined();
      expect(contentTypes[ct].schema.kind).toBe("collectionType");
    }
  });

  test("每个 CT 都关联 site-config", () => {
    for (const ct of expectedCTs) {
      const siteAttr = contentTypes[ct].schema.attributes.site;
      expect(siteAttr).toBeDefined();
      expect(siteAttr.type).toBe("relation");
      expect(siteAttr.target).toBe("plugin::zhao-common.site-config");
      expect(siteAttr.required).toBe(true);
    }
  });

  test("每个 CT 都有 deletedAt 软删字段", () => {
    for (const ct of expectedCTs) {
      expect(contentTypes[ct].schema.attributes.deletedAt).toBeDefined();
      expect(contentTypes[ct].schema.attributes.deletedAt.type).toBe("datetime");
    }
  });

  test("tracking-shipment 有 trackingNo 必填字段", () => {
    const attr = contentTypes["tracking-shipment"].schema.attributes.trackingNo;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("string");
    expect(attr.required).toBe(true);
  });

  test("quote-request status 默认 submitted", () => {
    const attr = contentTypes["quote-request"].schema.attributes.status;
    expect(attr.default).toBe("submitted");
  });

  test("quote-field-rule 开启 i18n", () => {
    const pluginOptions = contentTypes["quote-field-rule"].schema.pluginOptions;
    expect(pluginOptions.i18n.localized).toBe(true);
  });

  test("quote-price-rule 关联 quote-price-formula", () => {
    const attr = contentTypes["quote-price-rule"].schema.attributes.formula;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.quote-price-formula");
  });

  test("tracking-node 关联 tracking-shipment", () => {
    const attr = contentTypes["tracking-node"].schema.attributes.shipment;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.tracking-shipment");
    expect(attr.required).toBe(true);
  });

  test("tracking-shipment 关联 tracking-provider", () => {
    const attr = contentTypes["tracking-shipment"].schema.attributes.syncProvider;
    expect(attr).toBeDefined();
    expect(attr.type).toBe("relation");
    expect(attr.target).toBe("plugin::zhao-logistics.tracking-provider");
  });
});
