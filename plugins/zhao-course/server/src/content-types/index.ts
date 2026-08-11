import courseCategory from "./course-category/schema.json";
import course from "./course/schema.json";
import courseLesson from "./course-lesson/schema.json";
import userCourseAuth from "./user-course-auth/schema.json";
import courseProgress from "./course-progress/schema.json";
import lessonProgress from "./lesson-progress/schema.json";
import courseEnrollment from "./course-enrollment/schema.json";
import courseAccessCode from "./course-access-code/schema.json";

import courseLifecycles from "./course/lifecycles";
import courseLessonLifecycles from "./course-lesson/lifecycles";

export default {
  "course-category": { schema: courseCategory },
  course: { schema: course, lifecycles: courseLifecycles },
  "course-lesson": { schema: courseLesson, lifecycles: courseLessonLifecycles },
  "user-course-auth": { schema: userCourseAuth },
  "course-progress": { schema: courseProgress },
  "lesson-progress": { schema: lessonProgress },
  "course-enrollment": { schema: courseEnrollment },
  "course-access-code": { schema: courseAccessCode },
};
