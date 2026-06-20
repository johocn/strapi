import { AppError, NotFoundError, ForbiddenError, UnauthorizedError, ValidationError } from "../server/src/utils/errors";

describe("AppError", () => {
  it("应创建基本错误实例", () => {
    const err = new AppError("TEST_ERROR", { foo: "bar" }, 400, "test message");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("AppError");
    expect(err.code).toBe("TEST_ERROR");
    expect(err.status).toBe(400);
    expect(err.message).toBe("test message");
    expect(err.context).toEqual({ foo: "bar" });
  });

  it("应使用默认值创建", () => {
    const err = new AppError("CODE_ONLY");
    expect(err.code).toBe("CODE_ONLY");
    expect(err.status).toBe(400);
    expect(err.context).toEqual({});
    expect(err.message).toBe("CODE_ONLY");
  });

  it("toJSON 应返回正确的序列化对象", () => {
    const err = new AppError("TEST", { id: 1 }, 500, "msg");
    expect(err.toJSON()).toEqual({
      code: "TEST",
      message: "msg",
      context: { id: 1 },
    });
  });
});

describe("NotFoundError", () => {
  it("应创建 404 错误", () => {
    const err = new NotFoundError("Channel", 42);
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(404);
    expect(err.code).toBe("CHANNEL_NOT_FOUND");
    expect(err.message).toBe("Channel not found");
    expect(err.context).toEqual({ resource: "Channel", id: 42 });
  });

  it("应支持字符串 id", () => {
    const err = new NotFoundError("User", "abc-123");
    expect(err.code).toBe("USER_NOT_FOUND");
    expect(err.context.id).toBe("abc-123");
  });
});

describe("ForbiddenError", () => {
  it("应创建 403 错误", () => {
    const err = new ForbiddenError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Forbidden");
  });

  it("应支持自定义 code 和 message", () => {
    const err = new ForbiddenError("SCOPE_FORBIDDEN", { channelId: 1 }, "no access");
    expect(err.code).toBe("SCOPE_FORBIDDEN");
    expect(err.context).toEqual({ channelId: 1 });
    expect(err.message).toBe("no access");
  });
});

describe("UnauthorizedError", () => {
  it("应创建 401 错误", () => {
    const err = new UnauthorizedError();
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("应支持自定义参数", () => {
    const err = new UnauthorizedError("TOKEN_EXPIRED", {}, "token expired");
    expect(err.code).toBe("TOKEN_EXPIRED");
    expect(err.message).toBe("token expired");
  });
});

describe("ValidationError", () => {
  it("应创建 422 错误", () => {
    const err = new ValidationError("email", "格式不正确");
    expect(err).toBeInstanceOf(AppError);
    expect(err.status).toBe(422);
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.message).toBe("格式不正确");
    expect(err.context).toEqual({ field: "email", reason: "格式不正确" });
  });

  it("应支持扩展上下文", () => {
    const err = new ValidationError("age", "必须大于 0", { min: 1 });
    expect(err.context).toEqual({ field: "age", reason: "必须大于 0", min: 1 });
  });
});