import tirePackage from "./tire-package/schema.json";
import tireAddon from "./tire-addon/schema.json";
import tireOrder from "./tire-order/schema.json";
import tireSmsLog from "./tire-sms-log/schema.json";
import tireFaq from "./tire-faq/schema.json";
import tireReview from "./tire-review/schema.json";
import tireGallery from "./tire-gallery/schema.json";
import tireConfig from "./tire-config/schema.json";
import tireReferralCode from "./tire-referral-code/schema.json";
import tirePayment from "./tire-payment/schema.json";
import tireShareRecord from "./tire-share-record/schema.json";
import tireReferralReward from "./tire-referral-reward/schema.json";

export default {
  "tire-package": { schema: tirePackage },
  "tire-addon": { schema: tireAddon },
  "tire-order": { schema: tireOrder },
  "tire-sms-log": { schema: tireSmsLog },
  "tire-faq": { schema: tireFaq },
  "tire-review": { schema: tireReview },
  "tire-gallery": { schema: tireGallery },
  "tire-config": { schema: tireConfig },
  "tire-referral-code": { schema: tireReferralCode },
  "tire-payment": { schema: tirePayment },
  "tire-share-record": { schema: tireShareRecord },
  "tire-referral-reward": { schema: tireReferralReward },
};
