import api from "./api";
import admin from "./admin";
import partner from "./partner";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: [...api().routes, ...admin().routes, ...partner().routes],
  },
};
