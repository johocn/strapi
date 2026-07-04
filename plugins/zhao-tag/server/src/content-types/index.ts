import tagSchema from "./tag/schema.json";
import knowledgePointSchema from "./knowledge-point/schema.json";
import tagIndexSchema from "./tag-index/schema.json";
import tagGroupSchema from "./tag-group/schema.json";

export default {
  tag: { schema: tagSchema },
  "knowledge-point": { schema: knowledgePointSchema },
  "tag-index": { schema: tagIndexSchema },
  "tag-group": { schema: tagGroupSchema },
};
