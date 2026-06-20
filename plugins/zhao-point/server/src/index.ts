import config from "./config";
import contentTypes from "./content-types";
import controllers from "./controllers";
import register from "./register";
import bootstrap from "./bootstrap";
import destroy from "./destroy";
import services from "./services";
import routes from "./routes";
import policies from "./policies";
import middlewares from "./middlewares";

export default {
  register,
  bootstrap,
  destroy,
  config,
  controllers,
  contentTypes,
  services,
  routes,
  policies,
  middlewares,
};
