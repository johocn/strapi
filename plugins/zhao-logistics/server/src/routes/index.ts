import adminApi from "./admin-api";
import contentApi from "./content-api";

export default {
  "admin-api": {
    type: "admin",
    routes: adminApi,
  },
  "content-api": {
    type: "content-api",
    routes: contentApi,
  },
};
