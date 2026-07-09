import contentApi from "./content-api";

export default {
  "content-api": {
    type: "content-api" as const,
    routes: contentApi().routes,
  },
};
