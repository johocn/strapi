import loggerFactory from "../server/src/services/logger";

describe("logger service", () => {
  let infoMock: jest.Mock;
  let warnMock: jest.Mock;
  let errorMock: jest.Mock;
  let debugMock: jest.Mock;
  let mockStrapi: any;

  beforeEach(() => {
    infoMock = jest.fn();
    warnMock = jest.fn();
    errorMock = jest.fn();
    debugMock = jest.fn();
    mockStrapi = {
      log: {
        info: infoMock,
        warn: warnMock,
        error: errorMock,
        debug: debugMock,
      },
    };
  });

  it("info() 应带 [zhao-common] 前缀调用 strapi.log.info", () => {
    const logger = loggerFactory({ strapi: mockStrapi });
    logger.info("hello");
    expect(infoMock).toHaveBeenCalledWith("[zhao-common] hello", {});
  });

  it("info() 应传递 meta 参数", () => {
    const logger = loggerFactory({ strapi: mockStrapi });
    logger.info("hello", { userId: 1 });
    expect(infoMock).toHaveBeenCalledWith("[zhao-common] hello", { userId: 1 });
  });

  it("warn() 应带 [zhao-common] 前缀调用 strapi.log.warn", () => {
    const logger = loggerFactory({ strapi: mockStrapi });
    logger.warn("careful");
    expect(warnMock).toHaveBeenCalledWith("[zhao-common] careful", {});
  });

  it("error() 应带 [zhao-common] 前缀调用 strapi.log.error", () => {
    const logger = loggerFactory({ strapi: mockStrapi });
    logger.error("fail");
    expect(errorMock).toHaveBeenCalledWith("[zhao-common] fail", {});
  });

  it("debug() 应带 [zhao-common] 前缀调用 strapi.log.debug", () => {
    const logger = loggerFactory({ strapi: mockStrapi });
    logger.debug("trace", { event: "test" });
    expect(debugMock).toHaveBeenCalledWith("[zhao-common] trace", { event: "test" });
  });
});