import pointRecord from "./point-record/schema.json";
import pointRule from "./point-rule/schema.json";
import pointRedemption from "./point-redemption/schema.json";
import pointProduct from "./point-product/schema.json";
import pointConfig from "./point-config/schema.json";
import channelVerification from "./channel-verification/schema.json";
import ruleTemplate from "./rule-template/schema.json";
import pointType from "./point-type/schema.json";
import signInRecord from "./sign-in-record/schema.json";
import pickupLocation from "./pickup-location/schema.json";

export default {
  "point-record": { schema: pointRecord },
  "point-rule": { schema: pointRule },
  "point-redemption": { schema: pointRedemption },
  "point-product": { schema: pointProduct },
  "point-config": { schema: pointConfig },
  "channel-verification": { schema: channelVerification },
  "rule-template": { schema: ruleTemplate },
  "point-type": { schema: pointType },
  "sign-in-record": { schema: signInRecord },
  "pickup-location": { schema: pickupLocation },
};
