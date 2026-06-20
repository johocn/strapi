type Method = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

const publicRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: { auth: false },
});

const userRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1${path}`,
  handler,
  config: {
    auth: false,
    policies: ["plugin::zhao-auth.is-authenticated"],
  },
});

const channelScopeRoute = (
  method: Method,
  path: string,
  handler: string,
  permission: string,
) => ({
  method,
  path: `/v1/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
      "plugin::zhao-auth.has-channel-scope",
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    publicRoute("GET", "/quizzes", "quiz.find"),
    publicRoute("GET", "/quizzes/:documentId", "quiz.findOne"),
    publicRoute("GET", "/quiz-exams", "quiz-exam.find"),
    publicRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne"),

    userRoute("POST", "/my/quiz-records/submit", "quiz-record.submitAnswer"),
    userRoute("GET", "/my/quiz-records", "quiz-record.getUserRecords"),
    userRoute("POST", "/my/quiz/start", "quiz.startQuiz"),
    userRoute("POST", "/my/quiz/check-answer", "quiz.checkAnswer"),
    userRoute("POST", "/my/quiz/claim-points", "quiz.claimQuizPoints"),
    userRoute("POST", "/my/quiz-exam-attempts/start", "quiz-exam-attempt.startExam"),
    userRoute("POST", "/my/quiz-exam-attempts/:documentId/submit", "quiz-exam-attempt.submitExam"),
    userRoute("GET", "/my/exam-attempts", "quiz-exam-attempt.getUserAttempts"),
    userRoute("GET", "/my/quiz-exams/:documentId/questions", "quiz-exam.getQuestions"),

    channelScopeRoute("GET", "/quizzes", "quiz.find", "quiz.read"),
    channelScopeRoute("GET", "/quizzes/:documentId", "quiz.findOne", "quiz.read"),
    channelScopeRoute("POST", "/quizzes", "quiz.create", "quiz.create"),
    channelScopeRoute("PUT", "/quizzes/:documentId", "quiz.update", "quiz.update"),
    channelScopeRoute("DELETE", "/quizzes/:documentId", "quiz.delete", "quiz.delete"),

    channelScopeRoute("GET", "/quiz-exams", "quiz-exam.find", "exam.read"),
    channelScopeRoute("GET", "/quiz-exams/:documentId", "quiz-exam.findOne", "exam.read"),
    channelScopeRoute("POST", "/quiz-exams", "quiz-exam.create", "exam.create"),
    channelScopeRoute("PUT", "/quiz-exams/:documentId", "quiz-exam.update", "exam.update"),
    channelScopeRoute("DELETE", "/quiz-exams/:documentId", "quiz-exam.delete", "exam.delete"),
    channelScopeRoute("GET", "/quiz-exams/:documentId/questions", "quiz-exam.getQuestions", "exam.read"),

    channelScopeRoute("GET", "/quiz-records", "quiz-record.find", "quiz-record.read"),
    channelScopeRoute("GET", "/quiz-records/:documentId", "quiz-record.findOne", "quiz-record.read"),
    channelScopeRoute("PUT", "/quiz-records/:documentId/grade", "quiz-record.teacherGrade", "quiz-record.read"),
    channelScopeRoute("GET", "/quiz-records/pending-grading", "quiz-record.getPendingGrading", "quiz-record.read"),

    channelScopeRoute("GET", "/quiz-exam-attempts", "quiz-exam-attempt.find", "exam.read"),
    channelScopeRoute("GET", "/quiz-exam-attempts/:documentId", "quiz-exam-attempt.findOne", "exam.read"),

    channelScopeRoute("GET", "/quiz-batches", "quiz-batch.find", "quiz.read"),
    channelScopeRoute("GET", "/quiz-batches/:documentId", "quiz-batch.findOne", "quiz.read"),
    channelScopeRoute("POST", "/quiz-batches", "quiz-batch.create", "quiz.create"),
    channelScopeRoute("PUT", "/quiz-batches/:documentId", "quiz-batch.update", "quiz.update"),
    channelScopeRoute("DELETE", "/quiz-batches/:documentId", "quiz-batch.delete", "quiz.delete"),
    channelScopeRoute("POST", "/quiz-batches/:documentId/import", "quiz-batch.importFile", "quiz.create"),
    channelScopeRoute("GET", "/quiz-batches/template/download", "quiz-batch.downloadTemplate", "quiz.read"),
  ],
});
