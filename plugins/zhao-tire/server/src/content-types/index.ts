import tirePackage from "./tire-package/schema.json";
import tireAddon from "./tire-addon/schema.json";
import tireOrder from "./tire-order/schema.json";
import tireSmsLog from "./tire-sms-log/schema.json";
import tireFaq from "./tire-faq/schema.json";
import tireReview from "./tire-review/schema.json";
import tireGallery from "./tire-gallery/schema.json";
import tireConfig from "./tire-config/schema.json";

export default {
  "tire-package": { schema: tirePackage },
  "tire-addon": { schema: tireAddon },
  "tire-order": { schema: tireOrder },
  "tire-sms-log": { schema: tireSmsLog },
  "tire-faq": { schema: tireFaq },
  "tire-review": { schema: tireReview },
  "tire-gallery": { schema: tireGallery },
  "tire-config": { schema: tireConfig },
};
