import contentApi from "./content-api";
import tenant from "./tenant";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: contentApi().routes,
  },
  tenant: {
    type: "content-api" as const,
    routes: tenant().routes,
  },
};
