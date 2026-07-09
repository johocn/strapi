import quoteRequest from "./quote-request/schema.json";
import quoteFieldRule from "./quote-field-rule/schema.json";
import quotePriceRule from "./quote-price-rule/schema.json";
import quotePriceFormula from "./quote-price-formula/schema.json";
import trackingShipment from "./tracking-shipment/schema.json";
import trackingNode from "./tracking-node/schema.json";
import trackingProvider from "./tracking-provider/schema.json";
import contactMatrix from "./contact-matrix/schema.json";

export default {
  "quote-request": { schema: quoteRequest },
  "quote-field-rule": { schema: quoteFieldRule },
  "quote-price-rule": { schema: quotePriceRule },
  "quote-price-formula": { schema: quotePriceFormula },
  "tracking-shipment": { schema: trackingShipment },
  "tracking-node": { schema: trackingNode },
  "tracking-provider": { schema: trackingProvider },
  "contact-matrix": { schema: contactMatrix },
};
