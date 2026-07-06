declare const _default: {
  "kind": "collectionType",
  "collectionName": "zhao_quiz_exams",
  "info": {
    "singularName": "quiz-exam",
    "pluralName": "quiz-exams",
    "displayName": "考试配置"
  },
  "options": {
    "draftAndPublish": false
  },
  "attributes": {
    "title": {
      "type": "string",
      "required": true
    },
    "description": {
      "type": "text"
    },
    "timeLimit": {
      "type": "integer",
      "default": 0
    },
    "passScore": {
      "type": "decimal",
      "precision": 5,
      "scale": 2,
      "default": 60
    },
    "totalPoints": {
      "type": "integer",
      "default": 0
    },
    "questionCount": {
      "type": "integer",
      "default": 0
    },
    "randomOrder": {
      "type": "boolean",
      "default": false
    },
    "allowRetry": {
      "type": "boolean",
      "default": true
    },
    "maxAttempts": {
      "type": "integer",
      "default": 0
    },
    "showResult": {
      "type": "boolean",
      "default": true
    },
    "questionPoints": {
      "type": "json"
    },
    "course": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course",
      "inversedBy": "exams"
    },
    "lesson": {
      "type": "relation",
      "relation": "manyToOne",
      "target": "plugin::zhao-course.course-lesson",
      "inversedBy": "exams"
    },
    "questions": {
      "type": "relation",
      "relation": "manyToMany",
      "target": "plugin::zhao-quiz.quiz",
      "inversedBy": "exams"
    },
    "channelScope": {
      "type": "enumeration",
      "enum": ["all", "specific"],
      "default": "all"
    },
    "channelIds": {
      "type": "json",
      "default": "[]"
    },
    "deletedAt": {
      "type": "datetime",
      "default": null
    }
  }
}
;

export default _default;
