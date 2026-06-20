import channel from "./channel";
import channelMember from "./channel-member";
import channelPermission from "./channel-permission";
import userInvite from "./user-invite";
import channelInvite from "./channel-invite";
import channelStats from "./channel-stats";

export default {
  channel,
  "channel-member": channelMember,
  "channel-permission": channelPermission,
  "user-invite": userInvite,
  "channel-invite": channelInvite,
  "channel-stats": channelStats,
};