export default {
  default: {
    // MeiliSearch v1.11 与 vendure 侧插件共用同一实例；strapi 同机部署，运行时走内网 MEILI_HOST
    host: process.env.MEILI_HOST || "http://127.0.0.1:7700",
    adminKey: process.env.MEILI_ADMIN_KEY || "",
    indexPrefix: "kb",
    locales: ["zh", "en"],
  },
};
