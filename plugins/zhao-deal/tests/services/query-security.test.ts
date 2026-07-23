import queryServiceFactory from "../../server/src/services/query";

describe("query service 安全 hotfix", () => {
  let strapi: any;
  let findManyMock: jest.Mock;

  beforeEach(() => {
    findManyMock = jest.fn().mockResolvedValue([]);
    strapi = {
      documents: jest.fn().mockReturnValue({ findMany: findManyMock }),
    };
  });

  it("listPlatforms 限定 fields 白名单不暴露 appKey/appSecret", async () => {
    const svc = queryServiceFactory({ strapi });
    await svc.listPlatforms();
    const call = findManyMock.mock.calls[0][0];
    expect(call.fields).toEqual(["name", "code", "promoSite"]);
    // 不能要求全部字段
    expect(call.fields).not.toContain("appKey");
    expect(call.fields).not.toContain("appSecret");
    expect(call.fields).not.toContain("apiEndpoint");
  });

  it("listCoupons populate platform 限定 fields", async () => {
    const svc = queryServiceFactory({ strapi });
    await svc.listCoupons({ page: "1", pageSize: "10" });
    const call = findManyMock.mock.calls[0][0];
    expect(call.populate.platform).toEqual({ fields: ["name", "code"] });
    expect(call.populate.platform).not.toBe(true);
  });

  it("listProducts populate platform 限定 fields", async () => {
    const svc = queryServiceFactory({ strapi });
    await svc.listProducts({ page: "1", pageSize: "10" });
    const call = findManyMock.mock.calls[0][0];
    expect(call.populate.platform).toEqual({ fields: ["name", "code"] });
  });

  it("listCategories populate platform 限定 fields", async () => {
    const svc = queryServiceFactory({ strapi });
    await svc.listCategories("taobao");
    const call = findManyMock.mock.calls[0][0];
    expect(call.populate.platform).toEqual({ fields: ["name", "code"] });
  });

  it("getCollection populate coupons.platform 限定 fields", async () => {
    findManyMock.mockResolvedValue([{ documentId: "c1", code: "summer" }]);
    const svc = queryServiceFactory({ strapi });
    await svc.getCollection("summer");
    const call = findManyMock.mock.calls[0][0];
    expect(call.populate.coupons.populate.platform).toEqual({ fields: ["name", "code"] });
  });
});
