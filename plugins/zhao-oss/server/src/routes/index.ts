import admin from "./admin";
import api from "./api";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: [...api().routes, ...admin().routes],
  },
};
