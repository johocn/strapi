import contentApi from "./content-api";

const contentApiRoutes = contentApi();

export default {
  "content-api": {
    type: "content-api",
    routes: contentApiRoutes.routes,
  },
};
