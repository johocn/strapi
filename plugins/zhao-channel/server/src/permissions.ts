export const PERMISSIONS = {
  'channel.create': ['admin', 'channel-admin', 'plugin-manager'],
  'channel.read': ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'],
  'channel.update': ['admin', 'channel-admin', 'plugin-manager'],
  'channel.config.update': ['admin', 'channel-admin', 'plugin-manager'],
  'channel.delete': ['admin', 'channel-admin'],
  'channel-member.add': ['admin', 'channel-admin', 'plugin-manager'],
  'channel-member.remove': ['admin', 'channel-admin', 'plugin-manager'],
  'channel-member.read': ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'],
  'channel-permission.set': ['admin', 'channel-admin'],
  'user-invite.send': ['admin', 'channel-admin', 'plugin-manager'],
  'user-invite.validate': ['admin', 'channel-admin', 'plugin-manager', 'user'],
};

export default PERMISSIONS;
