import logger from "./logger";
import errorHandler from "./error-handler";
import configManager from "./config-manager";
import i18n from "./i18n";
import softDelete from "./soft-delete";
import siteConfig from "./site-config";
import config from "./config";

export default {
  logger,
  "error-handler": errorHandler,
  "config-manager": configManager,
  i18n,
  "soft-delete": softDelete,
  "site-config": siteConfig,
  config,
};
