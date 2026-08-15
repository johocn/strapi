declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_quiz_records",
  "info": {
    "singularName": "quiz-record",
    "pluralName": "quiz-records",
    "displayName": "答题记录"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "user": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "quiz": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-quiz.quiz"
    },
    "answer": {
      "type": "json"
    },
    "isCorrect": {
      "type": "boolean"
    },
    "score": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 0
    },
    "teacherScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 0
    },
    "scoringStatus": {
      "type": "enumeration",
      "enum": ["pending","auto_graded","manual_graded"],
      "default": "pending"
    },
    "grader": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::users-permissions.user"
    },
    "gradedAt": {
      "type": "datetime"
    },
    "totalPoints": {
      "type": "integer",
      "default": 0
    },
    "submittedAt": {
      "type": "datetime"
    },
    "duration": {
      "type": "integer",
      "default": 0
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson"
    }
  }
}
;

export default _default;
