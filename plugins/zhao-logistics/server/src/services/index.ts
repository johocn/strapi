import quoteRequest from "./quote-request";
import quoteFieldRule from "./quote-field-rule";
import quotePriceRule from "./quote-price-rule";
import quotePriceFormula from "./quote-price-formula";
import trackingShipment from "./tracking-shipment";
import trackingNode from "./tracking-node";
import trackingProvider from "./tracking-provider";
import contactMatrix from "./contact-matrix";
import quoteEngine from "./quote-engine";
import trackingAggregator from "./tracking-aggregator";
import dynamicForm from "./dynamic-form";
import funnelTracker from "./funnel-tracker";
import referralEngine from "./referral-engine";
import customerAggregator from "./customer-aggregator";
import review from "./review";
import subscription from "./subscription";
import landingPage from "./landing-page";
import conversionFunnel from "./conversion-funnel";
import conversionEvent from "./conversion-event";
import intentOrder from "./intent-order";
import referral from "./referral";
import customerProfile from "./customer-profile";

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
  "funnel-tracker": funnelTracker,
  "referral-engine": referralEngine,
  "customer-aggregator": customerAggregator,
  "review": review,
  "subscription": subscription,
  "landing-page": landingPage,
  "conversion-funnel": conversionFunnel,
  "conversion-event": conversionEvent,
  "intent-order": intentOrder,
  "referral": referral,
  "customer-profile": customerProfile,
};
