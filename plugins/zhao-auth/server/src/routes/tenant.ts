export default () => ({
  type: "content-api" as const,
  routes: [
    {
      method: "GET",
      path: "/v1/my/tenants",
      handler: "tenant.getMyTenants",
      config: {
        auth: false,
        policies: ["plugin::zhao-auth.is-authenticated"],
      },
    },
  ],
});
