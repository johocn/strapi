import contentApi from "./content-api";
import adminApi from "./admin-api";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: [...contentApi, ...adminApi],
  },
};
