"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const partnerRoute = (method, path, handler) => ({
    method,
    path: `/v1/partner${path}`,
    handler,
    config: { auth: false, policies: ["plugin::zhao-sso.sso-authenticated"] },
});
exports.default = () => ({
    type: "content-api",
    routes: [
        partnerRoute("GET", "/my-customers", "partner.myCustomers"),
        partnerRoute("GET", "/customers/:id", "partner.customerDetail"),
        partnerRoute("POST", "/customers/:id/touch", "partner.touch"),
        partnerRoute("GET", "/follow-ups", "partner.listFollowUps"),
        partnerRoute("POST", "/follow-ups", "partner.createFollowUp"),
        partnerRoute("PUT", "/follow-ups/:id", "partner.updateFollowUp"),
    ],
});
//# sourceMappingURL=partner.js.map