import type { Core } from "@strapi/strapi";

const routes: Core.Route[] = [
  // quote
  { method: "GET", path: "/v1/quote/fields", handler: "quote.loadFields", config: {} },
  { method: "POST", path: "/v1/quote/calculate", handler: "quote.calculate", config: {} },
  { method: "POST", path: "/v1/quote/submit", handler: "quote.submit", config: {} },
  // tracking
  { method: "GET", path: "/v1/tracking/:trackingNo", handler: "tracking.getTracking", config: {} },
  { method: "POST", path: "/v1/tracking/batch", handler: "tracking.batch", config: {} },
  { method: "POST", path: "/v1/tracking/subscribe", handler: "tracking.subscribe", config: {} },
  // contact-matrix
  { method: "GET", path: "/v1/contact-matrix/:lang", handler: "contact-matrix.getByLang", config: {} },
  // review
  { method: "GET", path: "/v1/reviews", handler: "review.list", config: {} },
  { method: "POST", path: "/v1/reviews/submit", handler: "review.submit", config: {} },
  // landing-page
  { method: "GET", path: "/v1/landing-pages/:slug", handler: "landing-page.getBySlug", config: {} },
  // intent-order（需登录）
  { method: "GET", path: "/v1/intent-orders/:orderNo", handler: "intent-order.getMyOrder", config: {} },
  // funnel
  { method: "POST", path: "/v1/funnel/track", handler: "funnel.track", config: {} },
  // referral
  { method: "POST", path: "/v1/referral/apply", handler: "referral.apply", config: {} },
  { method: "GET", path: "/v1/referral/validate/:code", handler: "referral.validate", config: {} },
  // customer-profile（需登录）
  { method: "GET", path: "/v1/customer-profile", handler: "customer-profile.getMyProfile", config: {} },
];

export default routes;
