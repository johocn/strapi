"use strict";
// Minimal admin entry point (admin UI is built separately via strapi-plugin build)
const PLUGIN_ID = "zhao-sso";
module.exports = {
  register(app) {
    app.registerPlugin({
      id: PLUGIN_ID,
      initializer: { name: PLUGIN_ID, bootstrap() {} },
      isReady: true,
      name: PLUGIN_ID,
    });
  },
  async registerTrads() {
    return [];
  },
};
