declare const _default: {
  "kind": "collectionType",
  "collectionName": "activities",
  "info": { "singularName": "activity", "pluralName": "activities", "displayName": "Activity", "description": "线下活动" },
  "options": { "draftAndPublish": false },
  "pluginOptions": { "i18n": { "localized": false } },
  "attributes": {
    "title": { "type": "string", "required": true },
    "type": { "type": "string", "default": "其他" },
    "description": { "type": "text" },
    "startTime": { "type": "datetime" },
    "endTime": { "type": "datetime" },
    "venueName": { "type": "string" },
    "lat": { "type": "float" },
    "lng": { "type": "float" },
    "capacity": { "type": "integer", "required": true, "default": 100 },
    "usedCapacity": { "type": "integer", "default": 0 },
    "signupStart": { "type": "datetime" },
    "signupEnd": { "type": "datetime" },
    "checkinMode": { "type": "enumeration", "enum": ["worker_scan", "self", "both"], "default": "both" },
    "geoEnforced": { "type": "boolean", "default": false },
    "geoRadiusM": { "type": "integer", "default": 500 },
    "status": { "type": "enumeration", "enum": ["draft", "signup_open", "ongoing", "ended"], "default": "draft" },
    "channelScope": { "type": "enumeration", "enum": ["all", "specific"], "default": "all" },
    "channelIds": { "type": "json" },
    "preUnlockArticles": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article" },
    "preUnlockLessons": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-course.course-lesson" },
    "learningPackageArticles": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-website.article" },
    "learningPackageLessons": { "type": "relation", "relation": "manyToMany", "target": "plugin::zhao-course.course-lesson" }
  }
};

export default _default;
