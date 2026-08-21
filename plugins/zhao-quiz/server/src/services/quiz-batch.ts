import type { Core } from "@strapi/strapi";
import * as XLSX from "xlsx";
import * as path from "path";
import * as fs from "fs";

const UID = "plugin::zhao-quiz.quiz-batch";
const QUIZ_UID = "plugin::zhao-quiz.quiz";

export default ({ strapi }: { strapi: Core.Strapi }) => {
  function throwErr(code: string, status: number, message: string): never {
    const e: any = new Error(message);
    e.code = code;
    e.status = status;
    throw e;
  }

  return {
  async find(query: any = {}) {
    const { filters, pagination } = query;
    const page = Number(pagination?.page) || 1;
    const pageSize = Number(pagination?.pageSize) || 25;

    const [list, total] = await Promise.all([
      strapi.documents(UID).findMany({
        ...query,
        populate: { course: true, lesson: true, file: true, templateFile: true, ...(query.populate || {}) },
        pagination: { page, pageSize },
      }),
      strapi.documents(UID).count({ filters: filters || {} }),
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
      populate: { course: true, lesson: true, file: true, templateFile: true },
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

  _getFilePath(fileInfo: any): string | null {
    if (!fileInfo) return null;
    const uploadDir = strapi.dirs?.static?.public || path.join(process.cwd(), "public", "uploads");
    const fileName = fileInfo.hash || fileInfo.name || "";
    const ext = fileInfo.ext || "";

    // 1. 优先：url 去除 /static 前缀后拼 uploadDir（zhao-oss 对外路径形如 /static/quiz/xxx.xlsx，物理文件在 public/ 下不含此前缀）
    const url = (fileInfo.url || "") as string;
    if (url) {
      const rel = url.startsWith("/static") ? url.slice("/static".length) : url;
      const viaUrl = path.join(uploadDir, rel.replace(/^\//, ""));
      if (fs.existsSync(viaUrl)) return viaUrl;
    }

    // 2. 其次：hash + ext 直接在 uploadDir 下
    if (fileName) {
      const hashPath = path.join(uploadDir, fileName + ext);
      if (fs.existsSync(hashPath)) return hashPath;
    }

    // 3. 再次：url 去除 /uploads/ 前缀（默认 provider 历史场景）
    const altPath = path.join(uploadDir, url.replace("/uploads/", "").replace(/^\//, ""));
    if (fs.existsSync(altPath)) return altPath;

    return null;
  },

  async importFromFile(batchDocumentId: string) {
    const batch = await strapi.documents(UID).findOne({
      documentId: batchDocumentId,
      populate: { file: true, course: true, lesson: true },
    });

    if (!batch) {
      throwErr("QUIZ_007", 404, "批量导入记录不存在");
    }

    await strapi.documents(UID).update({
      documentId: batchDocumentId,
      data: { status: "processing" } as any,
    });

    const results = { total: 0, success: 0, skipped: 0, errors: [] as string[] };
    const courseDocId = batch.course?.documentId;
    const lessonDocId = batch.lesson?.documentId;

    try {
      const filePath = this._getFilePath(batch.file);
      if (!filePath) {
        throwErr("QUIZ_008", 400, "无法找到上传的文件");
      }

      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      if (!sheetName) throwErr("QUIZ_009", 400, "工作簿中无工作表");

      const data: any[] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      results.total = data.length;

      for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const rowNum = i + 2;

        try {
          const type = (row.题型 || row.type || "").toString().trim();
          const title = (row.题目 || row.title || "").toString().trim();
          const answer = (row.答案 || row.answer || "").toString().trim();
          const points = parseInt(row.分值 || row.points || "0", 10) || 0;
          const difficulty = (row.难度 || row.difficulty || "medium").toString().trim();
          const explanation = (row.解析 || row.explanation || "").toString().trim();
          const sort = parseInt(row.排序 || row.sort || "0", 10) || 0;

        const validTypes = ["single_choice","multiple_choice","true_false","fill_blank","short_answer","essay","matching","ordering"];
        if (!validTypes.includes(type)) {
          results.errors.push(`第${rowNum}行: 题型 "${type}" 无效`);
          continue;
        }

        if (!title) {
          results.errors.push(`第${rowNum}行: 题目内容不能为空`);
          continue;
        }

        if (!answer && type !== "essay") {
          results.errors.push(`第${rowNum}行: 答案不能为空（问答题除外）`);
          continue;
        }

        // 行级关联（课程/课时/知识点），未填则回退批次 course/lesson（知识点无批次级）
        const strVal = (x: any) => (x === undefined || x === null ? null : String(x).trim() || null);
        let courseVal = strVal(row.课程 ?? row.course);
        if (!courseVal) courseVal = courseDocId || null;
        let lessonVal = strVal(row.课时 ?? row.lesson);
        if (!lessonVal) lessonVal = lessonDocId || null;
        const kpVal = strVal(row.知识点 ?? row.knowledgePoints ?? row.knowledge_point);

        let courseId: string | null = null;
        let lessonId: string | null = null;
        const kpIds: string[] = [];
        let assocFailed = false;

        if (courseVal) {
          courseId = await this._resolveCourse(courseVal);
          if (!courseId) { assocFailed = true; results.errors.push(`第${rowNum}行: 课程 "${courseVal}" 未找到`); }
        }
        if (lessonVal) {
          lessonId = await this._resolveLesson(lessonVal);
          if (!lessonId) { assocFailed = true; results.errors.push(`第${rowNum}行: 课时 "${lessonVal}" 未找到`); }
        }
        const kpTokens = kpVal ? kpVal.split("|").map((s: string) => s.trim()).filter(Boolean) : [];
        for (const kp of kpTokens) {
          const kpId = await this._resolveKnowledgePoint(kp);
          if (kpId) kpIds.push(kpId);
          else { assocFailed = true; results.errors.push(`第${rowNum}行: 知识点 "${kp}" 未找到`); }
        }
        if (assocFailed) continue;

        let options = null;
        const optRaw = (row.选项 ?? row.options ?? row["选项(JSON)"] ?? row["选项（JSON）"]) as string | undefined;
        if (optRaw !== undefined && optRaw !== null && optRaw !== "") {
          const optStr = optRaw.toString();
          if (optStr.trim().startsWith("[")) {
            try { options = JSON.parse(optStr); } catch { options = optStr.includes("|") ? optStr.split("|").map((o: string) => o.trim()) : optStr; }
          } else if (optStr.includes("|")) {
            options = optStr.split("|").map((o: string) => o.trim());
          } else {
            options = optStr;
          }
        }

        const quizData: any = {
          title,
          type,
          answer: answer || "",
          points,
          difficulty,
          explanation,
          sort,
          isPublished: true,
        };

        if (options) quizData.options = this._normalizeOptions(options);
        if (courseId) quizData.course = courseId;
        if (lessonId) quizData.lesson = lessonId;
        if (kpIds.length) quizData.tags = kpIds.map((documentId: string) => ({ documentId }));

          // 幂等去重：同课程 + 同题干 视为重复
          const dupFilters: any = { title };
          if (courseId) dupFilters.course = { documentId: courseId };
          const dup = await strapi.documents(QUIZ_UID).findMany({ filters: dupFilters, pagination: { page: 1, pageSize: 1 } });
          if (dup.length > 0) {
            results.skipped++;
            results.errors.push(`第${rowNum}行: 已存在相同题目，跳过`);
            continue;
          }

          await strapi.documents(QUIZ_UID).create({ data: quizData });
          results.success++;
        } catch (rowErr: any) {
          results.errors.push(`第${rowNum}行: ${rowErr.message}`);
        }
      }
    } catch (err: any) {
      results.errors.push(err.message);
    }

    const status = results.errors.length === 0 ? "completed" : results.success > 0 ? "completed" : "failed";

    await strapi.documents(UID).update({
      documentId: batchDocumentId,
      data: {
        status,
        totalCount: results.total,
        successCount: results.success,
        errorCount: results.errors.length,
        errors: results.errors,
      } as any,
    });

    return results;
  },

  async exportQuizzes(filters: any = {}) {
    const { course, lesson } = filters;
    const qf: any = {};
    if (course) qf.course = { documentId: course };
    if (lesson) qf.lesson = { documentId: lesson };
    const list = await strapi.documents(QUIZ_UID).findMany({
      filters: qf,
      sort: { sort: "asc" },
      populate: { course: true, lesson: true },
    });

    const headers = ["题型", "题目", "选项", "答案", "分值", "难度", "解析", "排序", "quizId", "updatedAt", "发布状态"];
    const rows = list.map((q: any) => {
      let optStr = "";
      if (Array.isArray(q.options)) {
        optStr = q.options.length && typeof q.options[0] === "object"
          ? q.options.map((o: any) => `${o.key}.${o.text}`).join("|")
          : q.options.join("|");
      } else if (q.options != null) {
        optStr = String(q.options);
      }
      return [
        q.type, q.title, optStr,
        q.answer, q.points, q.difficulty, q.explanation || "", q.sort,
        q.documentId, q.updatedAt || "", q.isPublished ? "已发布" : "草稿",
      ];
    });
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "题库导出");
    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  },

  // 按 documentId 或唯一标识（课程/课时用 title，知识点用 name 且限知识分组）解析关联实体
  async _resolveCourse(value: string): Promise<string | null> {
    if (!value) return null;
    const uid = "plugin::zhao-course.course";
    let doc: any;
    if (typeof value === "string" && /^[A-Za-z0-9_-]{16,}$/.test(value.trim())) {
      doc = await strapi.documents(uid).findOne({ documentId: value.trim() }).catch(() => null);
    }
    if (doc) return doc.documentId;
    const byTitle = await strapi.documents(uid).findMany({
      filters: { title: { $eq: value.trim() } },
      pagination: { page: 1, pageSize: 1 },
    }).catch(() => []);
    return byTitle?.[0]?.documentId || null;
  },

  async _resolveLesson(value: string): Promise<string | null> {
    if (!value) return null;
    const uid = "plugin::zhao-course.course-lesson";
    let doc: any;
    if (typeof value === "string" && /^[A-Za-z0-9_-]{16,}$/.test(value.trim())) {
      doc = await strapi.documents(uid).findOne({ documentId: value.trim() }).catch(() => null);
    }
    if (doc) return doc.documentId;
    const byTitle = await strapi.documents(uid).findMany({
      filters: { title: { $eq: value.trim() } },
      pagination: { page: 1, pageSize: 1 },
    }).catch(() => []);
    return byTitle?.[0]?.documentId || null;
  },

  // 知识点：zhao-tag 中归属 slug='knowledge-points' 分组的 tag，按 name 或 documentId 定位
  async _resolveKnowledgePoint(value: string): Promise<string | null> {
    if (!value) return null;
    const key = value.trim();
    const knex = strapi.db.connection;
    try {
      if (/^[A-Za-z0-9_-]{16,}$/.test(key)) {
        const row = await knex("zhao_tags as t")
          .join("zhao_tags_tag_group_lnk as l", "l.tag_id", "t.id")
          .join("zhao_tag_groups as g", "g.id", "l.tag_group_id")
          .select("t.document_id")
          .where("g.slug", "knowledge-points").andWhere("t.document_id", key).first();
        if (row) return row.document_id;
      }
      const row = await knex("zhao_tags as t")
        .join("zhao_tags_tag_group_lnk as l", "l.tag_id", "t.id")
        .join("zhao_tag_groups as g", "g.id", "l.tag_group_id")
        .select("t.document_id")
        .where("g.slug", "knowledge-points").andWhere("t.name", key).first();
      return row?.document_id || null;
    } catch {
      return null;
    }
  },

  // 将字符串选项规范化为 [{key,text}]（与前端 form.vue 渲染一致）；剥离 "A." 式前缀
  _normalizeOptions(raw: string | string[] | null): { key: string; text: string }[] | null {
    if (raw == null) return null;
    let arr: string[] = [];
    if (Array.isArray(raw)) arr = raw.map((o) => o.trim());
    else {
      const s = (raw as string).trim();
      arr = s.startsWith("[") ? (JSON.parse(s) as string[]) : s.split("|").map((o: string) => o.trim());
    }
    const cleaned = arr.map((o) => o.replace(/^([A-H])\s*[.、．]\s*/, "").trim());
    return cleaned.map((text, i) => ({ key: String.fromCharCode(65 + i), text }));
  },

  async generateTemplate(params: any = {}) {
    const courseDocId = await this._resolveCourse(params.course);
    const lessonDocId = await this._resolveLesson(params.lesson);
    const kpRaw = params.knowledgePoints || params.knowledgePoint || params.knowledge_point || "";
    const kpDocIds: string[] = [];
    for (const kp of String(kpRaw).split("|").map((s: string) => s.trim()).filter(Boolean)) {
      const id = await this._resolveKnowledgePoint(kp);
      if (id) kpDocIds.push(id);
    }

    const headers = ["课程", "课时", "知识点", "题型", "题目", "选项(JSON)", "答案", "分值", "难度", "解析", "排序"];
    const assoc = [courseDocId || "", lessonDocId || "", kpDocIds.join("|")];
    const example = [
      [...assoc, "single_choice", "中国的首都是哪里？", '["北京","上海","广州","深圳","重庆","成都"]', "北京", 5, "easy", "这是地理常识题", 1],
      [...assoc, "multiple_choice", "以下哪些是编程语言？", '["JavaScript","HTML","Python","CSS","Ruby","Go"]', "JavaScript,Python", 10, "medium", "HTML和CSS不是编程语言", 2],
      [...assoc, "true_false", "地球是圆的", "", "true", 3, "easy", "", 3],
      [...assoc, "fill_blank", "1+1=___", "", "2", 3, "easy", "", 4],
      [...assoc, "short_answer", "请简述MVC模式", "", "MVC是模型-视图-控制器", 8, "hard", "", 5],
      [...assoc, "essay", "请论述AI的未来发展", "", "", 15, "hard", "参考答案：从技术进步角度论述", 6],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "题目导入");

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  },

  async downloadTemplate(params: any = {}) {
    return this.generateTemplate(params);
  },
  };
};
