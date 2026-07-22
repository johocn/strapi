import siteConfig from "./site-config/schema.json";
import siteTemplate from "./site-template/schema.json";
import globalConfig from "./global-config/schema.json";

export default {
  "site-config": { schema: siteConfig },
  "site-template": { schema: siteTemplate },
  "global-config": { schema: globalConfig },
};
