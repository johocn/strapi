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
};
