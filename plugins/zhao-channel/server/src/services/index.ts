import channel from "./channel";
import channelMember from "./channel-member";
import channelPermission from "./channel-permission";
import userInvite from "./user-invite";

import channelStatsService from "./channel-stats.service";

export default {
  channel,
  "channel-member": channelMember,
  "channel-permission": channelPermission,
  "user-invite": userInvite,
  "channel-stats": channelStatsService,
};
