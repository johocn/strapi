import type { Core } from "@strapi/strapi";

const UID = "plugin::zhao-quiz.quiz";
const LESSON_UID = "plugin::zhao-course.course-lesson";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  // 读取 zhao-common 功能开关
  const getFeatureFlagsMap = async () => {
    try {
      const flagService = strapi.plugin("zhao-common")?.service("feature-flag");
      if (!flagService?.findByKey) return {};
      const flag = await flagService.findByKey("channel_cross_points");
      return { channel_cross_points: !!(flag && (flag.flagValue === true || flag.enabled === true)) };
    } catch {
      return {};
    }
  };

  return {
  async find(query: any = {}, channelScope?: { all: boolean; channelIds: number[] }) {
    const mergedFilters: any = { ...(query.filters || {}) };

    if (channelScope && !channelScope.all && channelScope.channelIds.length > 0) {
      mergedFilters.$or = [
        { channelScope: "all" },
        ...channelScope.channelIds.map((id) => ({ channelScope: "specific", channelIds: { $contains: id } })),
      ];
    }

    const page = Number(query.pagination?.page) || 1;
    const pageSize = Number(query.pagination?.pageSize) || 25;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        filters: mergedFilters,
        populate: { course: true, lesson: true, ...(query.populate || {}) },
        pagination: { page, pageSize },
      }),
      strapi.documents(UID).count({ filters: mergedFilters }),
    ]);

    return {
      list,
      pagination: {
        page,
        pageSize,
        total,
        pageCount: Math.ceil(total / pageSize),
      },
    };
  },

  async findOne(documentId: string) {
    return strapi.documents(UID).findOne({
      documentId,
      populate: { course: true, lesson: true },
    });
  },

  async create(data: any) {
    return strapi.documents(UID).create({ data });
  },

  async update(documentId: string, data: any) {
    return strapi.documents(UID).update({ documentId, data });
  },

  async delete(documentId: string) {
    return strapi.documents(UID).delete({ documentId });
  },

  async findByType(type: string, query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      filters: { type, ...(query.filters || {}) },
      populate: { course: true, lesson: true },
    });
  },

  async findByDifficulty(difficulty: string, query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      filters: { difficulty, ...(query.filters || {}) },
    });
  },

  async findByCourse(courseDocumentId: string, query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      filters: { course: { documentId: courseDocumentId }, ...(query.filters || {}) },
      populate: { course: true, lesson: true },
    });
  },

  async findByLesson(lessonDocumentId: string, query: any = {}) {
    return strapi.documents(UID).findMany({
      ...query,
      filters: { lesson: { documentId: lessonDocumentId }, ...(query.filters || {}) },
      populate: { course: true, lesson: true },
    });
  },

  /**
   * C端开始答题：随机抽取题目 + 积分配置
   * 前置校验：课时内容必须完成才能答题
   */
  async startQuiz(userId: number, lessonDocumentId: string, count: number = 2) {
    // 校验课时是否已完成
    const lesson = await strapi.documents(LESSON_UID).findOne({
      documentId: lessonDocumentId,
      populate: { course: true },
    });

    if (!lesson) {
      const e: any = new Error("课时不存在");
      e.code = "QUIZ_016";
      e.status = 404;
      throw e;
    }

    if (userId) {
      const PROGRESS_UID = "plugin::zhao-course.lesson-progress";
      const progress = await strapi.db.query(PROGRESS_UID).findOne({
        where: { user: userId, lesson: lesson.id },
      });
      if (!progress || !progress.isCompleted) {
        const e: any = new Error("请先完成课时内容再答题");
        e.code = "QUIZ_017";
        e.status = 403;
        throw e;
      }
    }

    // 查询课时下已发布的题目
    const allQuestions = await strapi.documents(UID).findMany({
      filters: { lesson: { documentId: lessonDocumentId }, isPublished: true },
      populate: { course: true, lesson: true },
    });

    const questions = Array.isArray(allQuestions) ? allQuestions : [];

    // 随机抽取
    const shuffled = [...questions].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);

    // 隐藏答案和解析（判题时返回）
    const safeQuestions = selected.map((q: any) => ({
      documentId: q.documentId,
      title: q.title,
      type: q.type,
      options: q.options,
      points: q.points || 0,
    }));

    // 课时已在上方查询，直接使用
    const course = lesson?.course || null;

    // 计算积分配置
    const actualCount = selected.length || 1;
    let pointsConfig: any = { enabled: false, perQuestionPoints: 0, pointsType: "none", totalQuestions: actualCount };

    if (course?.enablePoints) {
      if (lesson?.enablePoints && lesson.pointsType === "quiz_points") {
        pointsConfig = { enabled: true, perQuestionPoints: 0, pointsType: "quiz_points", totalQuestions: actualCount };
      } else if (lesson?.enablePoints) {
        const perQ = Math.floor((lesson.points || 0) / actualCount);
        pointsConfig = { enabled: true, perQuestionPoints: perQ, pointsType: "lesson_points", totalQuestions: actualCount };
      } else {
        const perQ = Math.floor((course.points || 0) / actualCount);
        pointsConfig = { enabled: true, perQuestionPoints: perQ, pointsType: "course_points", totalQuestions: actualCount };
      }
    }

    return {
      questions: safeQuestions,
      pointsConfig,
      courseDocumentId: course?.documentId || null,
      channelConfig: course ? {
        channelScope: course.channelScope || "all",
        channelIds: Array.isArray(course.channelIds) ? course.channelIds : [],
        pointChannelId: course.pointChannel?.id ?? course.pointChannel ?? null,
        pointChannelName: course.pointChannel?.name || "",
        allowCrossChannel: course.allowCrossChannel !== false,
      } : null,
      featureFlags: await getFeatureFlagsMap(),
    };
  },

  /**
   * C端判题：验证答案是否正确
   */
  async checkAnswer(quizDocumentId: string, userAnswer: string) {
    const quiz = await strapi.documents(UID).findOne({ documentId: quizDocumentId });
    if (!quiz) {
      const e: any = new Error("题目不存在");
      e.code = "QUIZ_015";
      e.status = 404;
      throw e;
    }

    const correctAnswer = quiz.answer || "";
    // 支持多选题：排序后比较
    const normalize = (ans: string) => ans.split(",").map(s => s.trim()).filter(Boolean).sort().join(",");
    const isCorrect = normalize(userAnswer) === normalize(correctAnswer);

    return {
      isCorrect,
      correctAnswer,
      explanation: quiz.explanation || "",
    };
  },

  /**
   * C端领取答题积分
   */
  async claimQuizPoints(userId: number, courseDocumentId: string, totalEarnedPoints: number, lessonDocumentId?: string, selectedChannelId?: number | string) {
    const RECORD_UID = "plugin::zhao-point.point-record";

    // 检查是否已领取过该课时的答题积分（按课时维度去重）
    const dedupeSource = lessonDocumentId || courseDocumentId;
    const existing = await strapi.db.query(RECORD_UID).findOne({
      where: { user: userId, action: "quiz_pass", source: dedupeSource },
    });
    if (existing) {
      const e: any = new Error("该课时答题积分已领取");
      e.code = "QUIZ_013";
      e.status = 400;
      throw e;
    }

    const totalPoints = totalEarnedPoints;

    if (totalPoints <= 0) {
      return { pointsEarned: 0 };
    }

    // 读取课程渠道配置（pointChannel + channelIds）
    const course = await strapi.documents("plugin::zhao-course.course").findOne({
      documentId: courseDocumentId,
      populate: { pointChannel: true },
    });
    const channelIds: any[] = Array.isArray(course?.channelIds) ? course.channelIds : [];
    const pointChannelId = course?.pointChannel?.id ?? course?.pointChannel ?? null;
    const finalChannelRaw: number | string | null = selectedChannelId ?? pointChannelId;

    // 必传校验：selectedChannelId 与 pointChannelId 都为空时报错
    if (!finalChannelRaw) {
      const e: any = new Error("必须选择积分充值渠道");
      e.code = "QUIZ_020";
      e.status = 400;
      throw e;
    }

    // specific 模式：基于字符串/documentId 比对 finalChannelRaw ∈ channelIds
    if (course?.channelScope === "specific" && finalChannelRaw) {
      const inScope = channelIds.some((id: any) => String(id) === String(finalChannelRaw));
      if (!inScope) {
        const e: any = new Error("所选渠道不在课程所属渠道范围内");
        e.code = "QUIZ_018";
        e.status = 400;
        throw e;
      }
    }

    // documentId → numeric id 转换（参考 redemption.ts:322-335 范式）
    const resolveChannelNumericId = async (channelId: number | string): Promise<number | null> => {
      const ch = await strapi.db.query("plugin::zhao-channel.channel").findOne({
        where: {
          $or: [
            { id: !isNaN(Number(channelId)) ? Number(channelId) : -1 },
            { documentId: String(channelId) },
          ],
        },
        select: ['id'],
      });
      return ch?.id ?? null;
    };
    const finalChannelId = await resolveChannelNumericId(finalChannelRaw);
    if (!finalChannelId) {
      const e: any = new Error("所选渠道不存在");
      e.code = "QUIZ_021";
      e.status = 400;
      throw e;
    }

    // 用户当前渠道
    let userChannelId: number | null = null;
    try {
      const channelMemberService = strapi.plugin("zhao-channel")?.service("channel-member");
      if (channelMemberService?.getMyChannel) {
        const myCh = await channelMemberService.getMyChannel(userId);
        userChannelId = myCh?.channel?.id ?? null;
      }
    } catch {
      // ignore
    }

    // 使用 earnCustomPoints 发放用户自主领取的积分
    try {
      const pointService = strapi.plugin("zhao-point")?.service("point");
      if (pointService?.earnCustomPoints) {
        await pointService.earnCustomPoints({
          userId,
          action: "quiz_pass",
          points: totalPoints,
          source: dedupeSource,
          remark: `答题获得${totalPoints}积分`,
          channelId: finalChannelId,
          userChannelId: userChannelId ?? undefined,
        } as any);
      }
    } catch (e: any) {
      const err: any = new Error(e.message || "积分发放失败");
      err.code = "QUIZ_014";
      err.status = 400;
      throw err;
    }

    return { pointsEarned: totalPoints };
  },
};
}
