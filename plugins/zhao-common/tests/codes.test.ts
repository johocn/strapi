import { ErrorCodes } from "../server/src/utils/codes";

describe("ErrorCodes", () => {
  it("应包含通用错误码", () => {
    expect(ErrorCodes.UNKNOWN_ERROR).toBe("COMMON_001");
    expect(ErrorCodes.VALIDATION_ERROR).toBe("COMMON_002");
    expect(ErrorCodes.NOT_FOUND).toBe("COMMON_003");
    expect(ErrorCodes.FORBIDDEN).toBe("COMMON_004");
    expect(ErrorCodes.UNAUTHORIZED).toBe("COMMON_005");
    expect(ErrorCodes.CONFIG_ERROR).toBe("COMMON_006");
    expect(ErrorCodes.INTERNAL_ERROR).toBe("COMMON_007");
  });

  it("应包含渠道错误码", () => {
    expect(ErrorCodes.CHANNEL_NOT_FOUND).toBe("CHANNEL_001");
    expect(ErrorCodes.CHANNEL_DEPTH_EXCEEDED).toBe("CHANNEL_002");
    expect(ErrorCodes.CHANNEL_DISABLED).toBe("CHANNEL_003");
    expect(ErrorCodes.INVITE_CODE_INVALID).toBe("CHANNEL_004");
    expect(ErrorCodes.MEMBER_NOT_FOUND).toBe("CHANNEL_005");
    expect(ErrorCodes.CHANNEL_DUPLICATE).toBe("CHANNEL_006");
    expect(ErrorCodes.USER_NOT_LINKED).toBe("CHANNEL_007");
  });

  it("应包含认证错误码", () => {
    expect(ErrorCodes.TOKEN_MISSING).toBe("AUTH_001");
    expect(ErrorCodes.TOKEN_INVALID).toBe("AUTH_002");
    expect(ErrorCodes.ROLE_INSUFFICIENT).toBe("AUTH_003");
    expect(ErrorCodes.SCOPE_FORBIDDEN).toBe("AUTH_004");
    expect(ErrorCodes.RESOURCE_OWNER_MISMATCH).toBe("AUTH_005");
  });

  it("as const 应确保所有值为字面量类型（编译时）", () => {
    // 运行时验证：所有值均为字符串
    for (const key of Object.keys(ErrorCodes)) {
      expect(typeof (ErrorCodes as Record<string, unknown>)[key]).toBe("string");
    }
  });
});