import createHasCoursePermission from "../server/src/policies/has-course-permission";
import type { AuthContext, PolicyResult } from "../server/src/utils/types";

function makeCtx(roles: string | string[]): AuthContext {
  return {
    user: { id: 1, roles } as any,
    params: {},
    body: {},
    query: {},
    headers: {},
    method: "GET",
    path: "/api/test",
  };
}

describe("has-course-permission - string roles branch", () => {
  const strapi = {} as any;
  const policy = createHasCoursePermission(strapi);

  it("user.roles 为字符串时应正确提取", () => {
    const result = policy(makeCtx("user"), { permission: "course.read" }) as PolicyResult;
    expect(result.passed).toBe(true);
  });

  it("user.roles 为字符串但无权限时应拒绝", () => {
    const result = policy(makeCtx("user"), { permission: "course.create" }) as PolicyResult;
    expect(result.passed).toBe(false);
    expect(result.code).toBe("FORBIDDEN_PERMISSION");
  });
});
