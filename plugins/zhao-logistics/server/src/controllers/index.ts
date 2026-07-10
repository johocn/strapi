import adminApi from "./admin-api";
import contentApi from "./content-api";

const adminApiWithSuffix = Object.fromEntries(
  Object.entries(adminApi).map(([key, value]) => [`${key}-admin`, value])
);

export default {
  ...contentApi,
  ...adminApiWithSuffix,
};
