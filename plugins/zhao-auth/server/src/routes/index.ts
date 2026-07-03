import contentApi from "./content-api";
import tenant from "./tenant";

const contentApiRoutes = contentApi();
const tenantRoutes = tenant();

export default {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes,
  },
  tenant: {
    type: "content-api",
    routes: tenantRoutes.routes,
  },
};
