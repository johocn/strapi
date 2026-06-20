/**
 * Application methods
 */
import bootstrap from "./bootstrap";
import register from "./register";
import config from "./config";

/**
 * Plugin server methods
 */
import contentTypes from "./content-types";
import controllers from "./controllers";
import routes from "./routes";
import services from "./services";
import policies from "./policies";

export default {
  register,
  bootstrap,
  config,
  controllers,
  routes,
  services,
  contentTypes,
  policies,
};
