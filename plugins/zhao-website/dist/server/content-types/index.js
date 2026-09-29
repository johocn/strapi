"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_json_1 = __importDefault(require("./seo-config/schema.json"));
const schema_json_2 = __importDefault(require("./brand-info/schema.json"));
const schema_json_3 = __importDefault(require("./article/schema.json"));
const schema_json_4 = __importDefault(require("./article-category/schema.json"));
const schema_json_5 = __importDefault(require("./product/schema.json"));
const schema_json_6 = __importDefault(require("./case/schema.json"));
const schema_json_7 = __importDefault(require("./compliance/schema.json"));
const schema_json_8 = __importDefault(require("./faq/schema.json"));
const schema_json_9 = __importDefault(require("./tutorial/schema.json"));
const schema_json_10 = __importDefault(require("./download/schema.json"));
const schema_json_11 = __importDefault(require("./lead/schema.json"));
const schema_json_12 = __importDefault(require("./visit-log/schema.json"));
const schema_json_13 = __importDefault(require("./interaction/schema.json"));
const schema_json_14 = __importDefault(require("./search-log/schema.json"));
const schema_json_15 = __importDefault(require("./knowledge-entity/schema.json"));
const schema_json_16 = __importDefault(require("./knowledge-relation/schema.json"));
const schema_json_17 = __importDefault(require("./knowledge-audit-log/schema.json"));
const schema_json_18 = __importDefault(require("./ai-content-summary/schema.json"));
const schema_json_19 = __importDefault(require("./first-truth-policy/schema.json"));
const schema_json_20 = __importDefault(require("./brand-voice/schema.json"));
const schema_json_21 = __importDefault(require("./redirect-rule/schema.json"));
const schema_json_22 = __importDefault(require("./invite-trace/schema.json"));
const schema_json_23 = __importDefault(require("./geo-article/schema.json"));
const schema_json_24 = __importDefault(require("./author/schema.json"));
const lifecycles_1 = __importDefault(require("./geo-article/lifecycles"));
exports.default = {
    "seo-config": { schema: schema_json_1.default },
    "brand-info": { schema: schema_json_2.default },
    "article": { schema: schema_json_3.default },
    "article-category": { schema: schema_json_4.default },
    "product": { schema: schema_json_5.default },
    "case": { schema: schema_json_6.default },
    "compliance": { schema: schema_json_7.default },
    "faq": { schema: schema_json_8.default },
    "tutorial": { schema: schema_json_9.default },
    "download": { schema: schema_json_10.default },
    "lead": { schema: schema_json_11.default },
    "visit-log": { schema: schema_json_12.default },
    "interaction": { schema: schema_json_13.default },
    "search-log": { schema: schema_json_14.default },
    "knowledge-entity": { schema: schema_json_15.default },
    "knowledge-relation": { schema: schema_json_16.default },
    "knowledge-audit-log": { schema: schema_json_17.default },
    "ai-content-summary": { schema: schema_json_18.default },
    "first-truth-policy": { schema: schema_json_19.default },
    "brand-voice": { schema: schema_json_20.default },
    "redirect-rule": { schema: schema_json_21.default },
    "invite-trace": { schema: schema_json_22.default },
    "geo-article": { schema: schema_json_23.default, lifecycles: lifecycles_1.default },
    "author": { schema: schema_json_24.default },
};
//# sourceMappingURL=index.js.map