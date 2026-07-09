import createGeneric from "./generic";
import quoteEngine from "./quote-engine";
import trackingAggregator from "./tracking-aggregator";
import dynamicForm from "./dynamic-form";

const quoteRequest = createGeneric("quote-request");
const quoteFieldRule = createGeneric("quote-field-rule");
const quotePriceRule = createGeneric("quote-price-rule");
const quotePriceFormula = createGeneric("quote-price-formula");
const trackingShipment = createGeneric("tracking-shipment");
const trackingNode = createGeneric("tracking-node");
const trackingProvider = createGeneric("tracking-provider");
const contactMatrix = createGeneric("contact-matrix");
const review = createGeneric("review");
const subscription = createGeneric("subscription");
const landingPage = createGeneric("landing-page");
const conversionFunnel = createGeneric("conversion-funnel");
const conversionEvent = createGeneric("conversion-event");
const intentOrder = createGeneric("intent-order");
const referral = createGeneric("referral");
const customerProfile = createGeneric("customer-profile");

export default {
  "quote-request": quoteRequest,
  "quote-field-rule": quoteFieldRule,
  "quote-price-rule": quotePriceRule,
  "quote-price-formula": quotePriceFormula,
  "tracking-shipment": trackingShipment,
  "tracking-node": trackingNode,
  "tracking-provider": trackingProvider,
  "contact-matrix": contactMatrix,
  "quote-engine": quoteEngine,
  "tracking-aggregator": trackingAggregator,
  "dynamic-form": dynamicForm,
  "review": review,
  "subscription": subscription,
  "landing-page": landingPage,
  "conversion-funnel": conversionFunnel,
  "conversion-event": conversionEvent,
  "intent-order": intentOrder,
  "referral": referral,
  "customer-profile": customerProfile,
};
