import site from "./content-api/site";
import order from "./content-api/order";
import content from "./content-api/content";
import my from "./content-api/my";
import referral from "./content-api/referral";
import pay from "./content-api/pay";
import adminOrder from "./admin-api/order";
import adminInventory from "./admin-api/inventory";
import adminCatalog from "./admin-api/catalog";
import adminCustomer from "./admin-api/customer";
import adminSms from "./admin-api/sms";
import adminContent from "./admin-api/content";
import adminMe from "./admin-api/me";
import adminReferral from "./admin-api/referral";
import adminPayment from "./admin-api/payment";

export default {
  site,
  order,
  content,
  my,
  referral,
  pay,
  "admin-order": adminOrder,
  "admin-inventory": adminInventory,
  "admin-catalog": adminCatalog,
  "admin-customer": adminCustomer,
  "admin-sms": adminSms,
  "admin-content": adminContent,
  "admin-me": adminMe,
  "admin-referral": adminReferral,
  "admin-payment": adminPayment,
};
