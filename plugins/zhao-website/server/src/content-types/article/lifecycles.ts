import { syncTagIndex, removeTagIndex } from "../../services/utils/tag-sync";
import { knowledgeGraphSync } from "../../services/utils/kg-sync";

const TARGET_TYPE = "website-article";

export default {
  async afterCreate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterUpdate(event: any) {
    await syncTagIndex(event, TARGET_TYPE).catch(() => {});
    await knowledgeGraphSync(TARGET_TYPE, event.result).catch(() => {});
  },
  async afterDelete(event: any) {
    await removeTagIndex(event, TARGET_TYPE).catch(() => {});
  },
};
