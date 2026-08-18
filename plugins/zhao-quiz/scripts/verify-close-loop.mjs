// 错题集闭环验证脚本（部署期运行）
// 用途：在运行中的 Strapi（本地 dev 或 shao 服务器）上，通过 HTTP 验证
//       「提交错题 → 错题入库 → 错题重练 → 组卷规则抽题」闭环。
// 前提：Strapi 已启动；已存在考试（rule 组卷）与题目；已有测试用户。
// 用法（PowerShell）：
//   $env:QUIZ_API="https://<strapi-host>/zhao-quiz/v1"
//   $env:QUIZ_TOKEN="<用户JWT>"
//   $env:QUIZ_SAMPLE_QUIZ="<题目documentId>"
//   $env:QUIZ_RULE_EXAM="<规则考试documentId>"
//   node plugins/zhao-quiz/scripts/verify-close-loop.mjs
// 退出码 0=全部断言通过；非 0=存在失败。

const BASE = (process.env.QUIZ_API || "http://localhost:1337/zhao-quiz/v1").replace(/\/$/, "");
const TOKEN = process.env.QUIZ_TOKEN;
const SAMPLE_QUIZ = process.env.QUIZ_SAMPLE_QUIZ;
const RULE_EXAM = process.env.QUIZ_RULE_EXAM;

const results = [];
function check(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? "  -> " + detail : ""}`);
}

async function call(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
      ...(opts.headers || {}),
    },
    ...opts,
  });
  const json = await res.json().catch(() => null);
  return { status: res.status, json };
}

async function main() {
  if (!TOKEN || !SAMPLE_QUIZ || !RULE_EXAM) {
    console.error("缺少必填环境变量 QUIZ_TOKEN / QUIZ_SAMPLE_QUIZ / QUIZ_RULE_EXAM");
    process.exit(2);
  }

  // 1) 提交错误答案 => 错题入库（wrongCount=1）
  const wrong = await call("/my/quiz-records/submit", {
    method: "POST",
    body: JSON.stringify({ quizDocumentId: SAMPLE_QUIZ, answer: "__wrong_fixture__", mode: "practice", practiceType: "knowledge" }),
  });
  check("提交错误答案返回记录", wrong.status === 200 && wrong.json?.data, `HTTP ${wrong.status}`);

  const wrongList = await call("/my/wrong-quizzes?status=active&pageSize=50");
  const hit = (wrongList.json?.data || []).find((w: any) => w.quiz?.documentId === SAMPLE_QUIZ);
  check("错题已入库(active)", !!hit, hit ? `wrongCount=${hit.wrongCount}` : "未命中");
  if (!hit) process.exit(1);

  // 2) 错题重练队列可见该题
  const due = await call("/my/wrong-quizzes/due?limit=50");
  const dueHit = (due.json?.data || []).some((w: any) => w.quiz?.documentId === SAMPLE_QUIZ);
  check("错题重练队列包含题目(due<=now)", dueHit, `due 总数=${due.json?.meta?.pagination?.total}`);

  // 3) 规则组卷返回题目且含缺额提示字段
  const paper = await call(`/my/quiz-exams/${RULE_EXAM}/paper`);
  const hasShortagesField = Array.isArray(paper.json?.data?.shortages);
  const hasQuestions = Array.isArray(paper.json?.data?.questions);
  check("规则组卷返回 questions", paper.status === 200 && hasQuestions, `HTTP ${paper.status}, 题目数=${paper.json?.data?.questions?.length}`);
  check("组卷返回 shortages 字段", hasShortagesField, `shortages=${JSON.stringify(paper.json?.data?.shortages)}`);
  const leaksAnswer = (paper.json?.data?.questions || []).some((q: any) => q.answer !== undefined);
  check("组卷已隐藏答案", !leaksAnswer, "无答案泄漏");

  const failed = results.filter((r) => !r.ok);
  console.log(`\n结果: ${results.length - failed.length}/${results.length} 通过`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((e) => {
  console.error("脚本异常:", e);
  process.exit(1);
});