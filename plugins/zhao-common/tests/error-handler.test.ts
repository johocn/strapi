import { AppError } from "../server/src/utils/errors";
import { ErrorCodes } from "../server/src/utils/codes";
import errorHandlerFactory from "../server/src/services/error-handler";

describe("error-handler service", () => {
  const mockStrapi = {} as any;
  const handler = errorHandlerFactory({ strapi: mockStrapi });

  describe("createError", () => {
    it("应使用指定的 code 和 context 创建 AppError", () => {
      const err = handler.createError("CHANNEL_001", { channelId: 42 });
      expect(err).toBeInstanceOf(AppError);
      expect(err.code).toBe("CHANNEL_001");
      expect(err.context).toEqual({ channelId: 42 });
      expect(err.status).toBe(400);
    });

    it("应使用空 context 作为默认值", () => {
      const err = handler.createError("COMMON_001");
      expect(err.context).toEqual({});
    });

    it("应支持自定义 message", () => {
      const err = handler.createError("AUTH_001", {}, "自定义消息");
      expect(err.message).toBe("自定义消息");
    });
  });

  describe("wrapError", () => {
    it("如果错误已经是 AppError 则直接返回", () => {
      const original = new AppError("CHANNEL_001", { id: 1 }, 400);
      const wrapped = handler.wrapError(original);
      expect(wrapped).toBe(original);
    });

    it("应将普通 Error 包装为 AppError", () => {
      const wrapped = handler.wrapError(new Error("something broke"));
      expect(wrapped).toBeInstanceOf(AppError);
      expect(wrapped.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(wrapped.status).toBe(500);
      expect(wrapped.context).toEqual({ originalMessage: "something broke" });
    });

    it("应将非 Error 类型包装为 AppError", () => {
      const wrapped = handler.wrapError("string error");
      expect(wrapped.code).toBe(ErrorCodes.UNKNOWN_ERROR);
      expect(wrapped.status).toBe(500);
      expect(wrapped.message).toBe("Unknown error");
    });

    it("应支持指定默认错误码", () => {
      const wrapped = handler.wrapError(new Error("msg"), "CHANNEL_002");
      expect(wrapped.code).toBe("CHANNEL_002");
    });
  });

  describe("formatError", () => {
    it("应格式化 AppError", () => {
      const err = new AppError("AUTH_001", {}, 401, "token missing");
      expect(handler.formatError(err)).toEqual({
        code: "AUTH_001",
        message: "token missing",
      });
    });

    it("应格式化普通 Error", () => {
      expect(handler.formatError(new Error("普通错误"))).toEqual({
        code: ErrorCodes.UNKNOWN_ERROR,
        message: "普通错误",
      });
    });

    it("应格式化未知类型", () => {
      expect(handler.formatError("raw")).toEqual({
        code: ErrorCodes.UNKNOWN_ERROR,
        message: "Unknown error",
      });
    });
  });
});