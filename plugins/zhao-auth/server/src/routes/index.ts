import contentApi from "./content-api";
import tenant from "./tenant";
import moduleVisibility from "./module-visibility";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: contentApi().routes,
  },
  tenant: {
    type: "content-api" as const,
    routes: tenant().routes,
  },
  "module-visibility": {
    type: "content-api" as const,
    routes: moduleVisibility().routes,
  },
};
