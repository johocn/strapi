import quiz from "./quiz/schema.json";
import quizRecord from "./quiz-record/schema.json";
import quizExam from "./quiz-exam/schema.json";
import quizExamAttempt from "./quiz-exam-attempt/schema.json";
import quizBatch from "./quiz-batch/schema.json";

export default {
  quiz: { schema: quiz },
  "quiz-record": { schema: quizRecord },
  "quiz-exam": { schema: quizExam },
  "quiz-exam-attempt": { schema: quizExamAttempt },
  "quiz-batch": { schema: quizBatch },
};
