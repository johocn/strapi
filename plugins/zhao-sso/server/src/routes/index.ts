import api from "./api";
import admin from "./admin";

const apiRoutes = api();
const adminRoutes = admin();

export default {
  "content-api": {
    type: "content-api",
    routes: [...apiRoutes.routes, ...adminRoutes.routes],
  },
};
