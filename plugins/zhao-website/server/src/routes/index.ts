import contentApi from "./content-api";
import adminApi from "./admin-api";

const contentApiRoutes = contentApi();
const adminApiRoutes = adminApi();

export default {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes,
  },
  "admin-api": {
    type: "admin-api",
    routes: adminApiRoutes.routes,
  },
};
