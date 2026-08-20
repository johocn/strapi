type Method = "GET" | "POST" | "PUT" | "DELETE";

const partnerRoute = (method: Method, path: string, handler: string) => ({
  method,
  path: `/v1/partner${path}`,
  handler,
  config: { auth: false, policies: ["plugin::zhao-sso.sso-authenticated"] },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    partnerRoute("GET", "/my-customers", "partner.myCustomers"),
    partnerRoute("GET", "/customers/:id", "partner.customerDetail"),
    partnerRoute("POST", "/customers/:id/touch", "partner.touch"),
    partnerRoute("GET", "/follow-ups", "partner.listFollowUps"),
    partnerRoute("POST", "/follow-ups", "partner.createFollowUp"),
    partnerRoute("PUT", "/follow-ups/:id", "partner.updateFollowUp"),
  ],
});
