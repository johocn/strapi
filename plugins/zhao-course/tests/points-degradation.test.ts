import courseProgressFactory from "../server/src/services/course-progress";

function createMockStrapi() {
  return {
    db: {
      query: jest.fn(),
    },
    documents: jest.fn(),
    plugin: jest.fn(),
    log: {
      info: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    },
  } as any;
}

describe("C1: 积分降级静默失败问题", () => {
  let strapi: any;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  it("zhao-point 不可用时，isPointsClaimed 不应被标记为 true", async () => {
    const mockDbFindOne = jest.fn().mockResolvedValue({
      id: 1,
      user: { id: 1 },
      isPointsClaimed: false,
      isCompleted: true,
      course: { id: 1, enablePoints: true, pointsType: "course_points", points: 100, title: "测试课程" },
    });
    const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1 });

    strapi.db.query = jest.fn().mockReturnValue({
      findOne: mockDbFindOne,
      update: mockDbUpdate,
    });

    strapi.plugin = jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({
        earnPoints: jest.fn().mockRejectedValue(new Error("zhao-point 服务不可用")),
      }),
    });

    const service = courseProgressFactory({ strapi });
    await expect(service.claimPoints(1, "1")).rejects.toThrow("积分发放失败");
    expect(mockDbUpdate).not.toHaveBeenCalled();
  });

  it("zhao-point 可用时，isPointsClaimed 应被标记为 true", async () => {
    const mockDbFindOne = jest.fn().mockResolvedValue({
      id: 1,
      user: { id: 1 },
      isPointsClaimed: false,
      isCompleted: true,
      course: { id: 1, enablePoints: true, pointsType: "course_points", points: 100, title: "测试课程" },
    });
    const mockDbUpdate = jest.fn().mockResolvedValue({ id: 1 });

    strapi.db.query = jest.fn().mockReturnValue({
      findOne: mockDbFindOne,
      update: mockDbUpdate,
    });

    strapi.plugin = jest.fn().mockReturnValue({
      service: jest.fn().mockReturnValue({
        earnPoints: jest.fn().mockResolvedValue({ success: true }),
      }),
    });

    const service = courseProgressFactory({ strapi });
    const result = await service.claimPoints(1, "1");

    expect(mockDbUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isPointsClaimed: true }),
      })
    );
    expect(result.claimed).toBe(true);
  });
});
