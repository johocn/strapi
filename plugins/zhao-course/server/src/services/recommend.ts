import type { Core } from "@strapi/strapi";

const COURSE_UID = "plugin::zhao-course.course";
const ENROLL_UID = "plugin::zhao-course.course-enrollment";
const PROGRESS_UID = "plugin::zhao-course.course-progress";

const LEVEL_ORDER: Record<string, number> = {
  introductory: 1,
  foundation: 2,
  advanced: 3,
  professional: 4,
};

const tagIds = (c: any) => (Array.isArray(c?.tags) ? c.tags.map((t: any) => t?.id?.toString?.() ?? String(t)).filter(Boolean) : []);

const kwSet = (c: any) => {
  const kws = Array.isArray(c?.keywords) ? c.keywords : typeof c?.keywords === "object" && c.keywords ? Object.values(c.keywords) : [];
  return new Set(kws.map((k: any) => String(k).toLowerCase()).filter(Boolean));
};

export default ({ strapi }: { strapi: Core.Strapi }) => ({
  /** 课程详情续学：seed=当前课程 */
  async relatedFor(courseDocumentId: string, limit = 6) {
    const seed = await this.findOneCourse(courseDocumentId);
    if (!seed) return [];
    return this.buildSuggestions([seed], new Set(), limit);
  },

  /** 学习中心个人续学清单：seed=在学课程（progress<100），否则回退最近报名课程 */
  async suggestionsFor(userId: number, limit = 6) {
    const [enrollments, progresses] = await Promise.all([
      strapi.db.query(ENROLL_UID).findMany({ where: { user: userId, status: "enrolled" }, populate: { course: { select: ["documentId"] } }, limit: 300 }),
      strapi.db.query(PROGRESS_UID).findMany({ where: { user: userId }, populate: { course: { select: ["documentId"] } }, limit: 300 }),
    ]);

    const enrolledDocIds = new Set(enrollments.map((e: any) => e.course?.documentId).filter(Boolean));
    const inProgressDocIds = progresses
      .filter((p: any) => Number(p.progress ?? 0) < 100 && p.course?.documentId)
      .map((p: any) => p.course?.documentId);

    const seedDocIds: string[] = inProgressDocIds.slice(0, 20);
    if (!seedDocIds.length) {
      seedDocIds.push(...enrollments.map((e: any) => e.course?.documentId).filter(Boolean).slice(0, 20));
    }
    if (!seedDocIds.length) return this.fallbackCourses(limit, enrolledDocIds);

    const seeds = (await this.findCoursesByIds(seedDocIds)).filter(Boolean);
    if (!seeds.length) return this.fallbackCourses(limit, enrolledDocIds);
    return this.buildSuggestions(seeds, enrolledDocIds, limit);
  },

  /***** 引擎核心 *****/

  async buildSuggestions(seeds: any[], excludeDocIds: Set<string>, limit: number) {
    const candidates = await this.candidatePool(excludeDocIds);
    const best = new Map<string, any>(); // probeDocId -> {cand, score, seedId, sequenceNext}
    for (const cand of candidates) {
      let bestScore = 0;
      let bestSeed: any = null;
      let bestNext = false;
      for (const seed of seeds) {
        if (String(seed.documentId) === String(cand.documentId)) continue;
        const { score, sequenceNext } = this.scoreCandidate(seed, cand);
        if (score > bestScore) { bestScore = score; bestSeed = seed; bestNext = sequenceNext; }
      }
      if (bestScore > 0) best.set(String(cand.documentId), { cand, score: bestScore, seedId: bestSeed?.id, sequenceNext: bestNext });
    }
    let rows = [...best.values()]
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit)
      .map((r: any) => this.toRow(r.cand, r.score, r.sequenceNext, r.seedId));
    if (!rows.length) rows = this.fallbackCourses(limit, excludeDocIds);
    return rows;
  },

  scoreCandidate(seed: any, cand: any) {
    let score = 0;
    let sequenceNext = false;

    const st = seed.sequenceTag;
    const ct = cand.sequenceTag;
    if (st && ct && String(st.id) === String(ct.id)) {
      const gap = (cand.sequenceNumber || 0) - (seed.sequenceNumber || 0);
      if (seed.enforceSequence && cand.enforceSequence && gap === 1) { score += 300; sequenceNext = true; }
      else if (gap > 0) score += 150;
    }

    const sc = seed.category?.id;
    const cc = cand.category?.id;
    if (sc && cc && String(sc) === String(cc)) {
      const sg = LEVEL_ORDER[seed.level] ?? 2;
      const cg = LEVEL_ORDER[cand.level] ?? 0;
      if (cg > sg) score += 100;
      else if (cg === sg) score += 40;
    }

    const sTags = tagIds(seed);
    const cTags = tagIds(cand);
    score += sTags.filter((t: string) => cTags.includes(t)).length * 10;

    const sKw = kwSet(seed);
    const cKw = kwSet(cand);
    cKw.forEach((k: string) => { if (sKw.has(k)) score += 5; });

    return { score, sequenceNext };
  },

  async candidatePool(excludeDocIds: Set<string>) {
    const all = await strapi.db.query(COURSE_UID).findMany({
      where: { status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
      limit: 500,
    });
    return all.filter((c: any) => !excludeDocIds.has(String(c.documentId)));
  },

  async findOneCourse(documentId: string) {
    return strapi.db.query(COURSE_UID).findOne({
      where: { documentId, status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
    });
  },

  async findCoursesByIds(docIds: string[]) {
    if (!docIds.length) return [];
    return strapi.db.query(COURSE_UID).findMany({
      where: { documentId: { $in: docIds }, status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
    });
  },

  async fallbackCourses(limit: number, excludeDocIds: Set<string>) {
    const all = await strapi.db.query(COURSE_UID).findMany({
      where: { status: "published" },
      populate: { category: true, sequenceTag: true, tags: true },
      orderBy: { studentCount: "DESC" },
      limit: 100,
    });
    return all
      .filter((c: any) => !excludeDocIds.has(String(c.documentId)))
      .slice(0, limit)
      .map((c: any) => this.toRow(c, 0, false, null));
  },

  toRow(cand: any, score: number, sequenceNext: boolean, seedId: number | null) {
    return {
      documentId: cand.documentId,
      id: cand.id,
      title: cand.title,
      category: cand.category?.name ?? null,
      cover: cand.cover ?? null,
      price: cand.price ?? 0,
      isFree: cand.isFree ?? true,
      isPaid: cand.isPaid,
      courseType: cand.courseType,
      level: cand.level,
      difficulty: cand.difficulty,
      studentCount: cand.studentCount ?? 0,
      sequenceNext,
      score,
      seedId,
    };
  },
});