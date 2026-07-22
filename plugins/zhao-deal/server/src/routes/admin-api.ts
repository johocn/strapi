type Method = "GET" | "POST" | "PUT" | "DELETE";

const adminRoute = (method: Method, path: string, handler: string, permission: string) => ({
  method,
  path: `/admin${path}`,
  handler,
  config: {
    auth: false,
    policies: [
      "plugin::zhao-auth.is-authenticated",
      { name: "plugin::zhao-auth.has-permission", config: { action: permission } },
    ],
  },
});

export default () => ({
  type: "content-api" as const,
  routes: [
    adminRoute("POST", "/sync/trigger", "admin-sync.trigger", "zhao-deal.sync.trigger"),
    adminRoute("POST", "/coupon-candidates/:documentId/approve", "candidate.approve", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/:documentId/reject", "candidate.reject", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/product-candidates/:documentId/approve", "candidate.approveProduct", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/batch-approve", "candidate.batchApprove", "zhao-deal.candidate.approve"),
    adminRoute("POST", "/coupon-candidates/batch-reject", "candidate.batchReject", "zhao-deal.candidate.approve"),
  ],
});
