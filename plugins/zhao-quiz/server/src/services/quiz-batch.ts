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
    const fileName = fileInfo.hash || fileInfo.name;
    const ext = fileInfo.ext || "";
    const filePath = path.join(uploadDir, fileName + ext);
    if (fs.existsSync(filePath)) return filePath;
    const altPath = path.join(uploadDir, fileInfo.url?.replace("/uploads/", "") || "");
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

    const results = { total: 0, success: 0, errors: [] as string[] };
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

          let options = null;
          if (row.选项 || row.options) {
            const optStr = (row.选项 || row.options).toString();
            try {
              options = JSON.parse(optStr);
            } catch {
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

          if (options) quizData.options = options;
          if (courseDocId) quizData.course = courseDocId;
          if (lessonDocId) quizData.lesson = lessonDocId;

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

  async generateTemplate(_courseDocId?: string, _lessonDocId?: string) {
    const headers = ["题型", "题目", "选项(JSON)", "答案", "分值", "难度", "解析", "排序"];
    const example = [
      ["single_choice", "中国的首都是哪里？", '["北京","上海","广州","深圳"]', "北京", 5, "easy", "这是地理常识题", 1],
      ["multiple_choice", "以下哪些是编程语言？", '["JavaScript","HTML","Python","CSS"]', "JavaScript,Python", 10, "medium", "HTML和CSS不是编程语言", 2],
      ["true_false", "地球是圆的", "", "true", 3, "easy", "", 3],
      ["fill_blank", "1+1=___", "", "2", 3, "easy", "", 4],
      ["short_answer", "请简述MVC模式", "", "MVC是模型-视图-控制器", 8, "hard", "", 5],
      ["essay", "请论述AI的未来发展", "", "", 15, "hard", "参考答案：从技术进步角度论述", 6],
    ];

    const ws = XLSX.utils.aoa_to_sheet([headers, ...example]);
    ws["!cols"] = headers.map(() => ({ wch: 20 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "题目导入");

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    return buffer;
  },

  async downloadTemplate() {
    return this.generateTemplate();
  },
  };
};
