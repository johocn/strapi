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
import activity from "./activity/schema.json";
import activitySignup from "./activity-signup/schema.json";
import activityAttendance from "./activity-attendance/schema.json";
import activitySeries from "./activity-series/schema.json";
import activityMessage from "./activity-message/schema.json";
import activityReferralReward from "./activity-referral-reward/schema.json";
import activityLedger from "./activity-ledger/schema.json";
import activityShareVisit from "./activity-share-visit/schema.json";
import lecturer from "./lecturer/schema.json";
import venue from "./venue/schema.json";
import lecturerLifecycles from "./lecturer/lifecycles";
import tourStory from "./tour-story/schema.json";
import venueLifecycles from "./venue/lifecycles";
import activityLifecycles from "./activity/lifecycles";
import activitySeriesLifecycles from "./activity-series/lifecycles";

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
  activity: { schema: activity, lifecycles: activityLifecycles },
  "activity-signup": { schema: activitySignup },
  "activity-attendance": { schema: activityAttendance },
  "activity-series": { schema: activitySeries, lifecycles: activitySeriesLifecycles },
  "activity-message": { schema: activityMessage },
  "activity-referral-reward": { schema: activityReferralReward },
  "activity-ledger": { schema: activityLedger },
  "activity-share-visit": { schema: activityShareVisit },
  "tour-story": { schema: tourStory },
  lecturer: { schema: lecturer, lifecycles: lecturerLifecycles },
  venue: { schema: venue, lifecycles: venueLifecycles },
};
