import api from "./api";
import admin from "./admin";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: [...api().routes, ...admin().routes],
  },
};
