import admin from "./admin";
import api from "./api";

const adminRoutes = admin();
const apiRoutes = api();

export default {
  "content-api": {
    type: "content-api",
    routes: [...apiRoutes.routes, ...adminRoutes.routes],
  },
};
