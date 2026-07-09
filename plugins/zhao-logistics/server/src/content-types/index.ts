import quoteRequest from "./quote-request/schema.json";
import quoteFieldRule from "./quote-field-rule/schema.json";
import quotePriceRule from "./quote-price-rule/schema.json";
import quotePriceFormula from "./quote-price-formula/schema.json";
import trackingShipment from "./tracking-shipment/schema.json";
import trackingNode from "./tracking-node/schema.json";
import trackingProvider from "./tracking-provider/schema.json";
import contactMatrix from "./contact-matrix/schema.json";
import review from "./review/schema.json";
import subscription from "./subscription/schema.json";
import landingPage from "./landing-page/schema.json";
import conversionFunnel from "./conversion-funnel/schema.json";
import conversionEvent from "./conversion-event/schema.json";
import intentOrder from "./intent-order/schema.json";
import referral from "./referral/schema.json";
import customerProfile from "./customer-profile/schema.json";

export default {
  "quote-request": { schema: quoteRequest },
  "quote-field-rule": { schema: quoteFieldRule },
  "quote-price-rule": { schema: quotePriceRule },
  "quote-price-formula": { schema: quotePriceFormula },
  "tracking-shipment": { schema: trackingShipment },
  "tracking-node": { schema: trackingNode },
  "tracking-provider": { schema: trackingProvider },
  "contact-matrix": { schema: contactMatrix },
  "review": { schema: review },
  "subscription": { schema: subscription },
  "landing-page": { schema: landingPage },
  "conversion-funnel": { schema: conversionFunnel },
  "conversion-event": { schema: conversionEvent },
  "intent-order": { schema: intentOrder },
  "referral": { schema: referral },
  "customer-profile": { schema: customerProfile },
};
