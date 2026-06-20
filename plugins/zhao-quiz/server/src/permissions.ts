export interface PermissionConfig {
  [action: string]: string[];
}

export const PERMISSIONS: PermissionConfig = {
  'quiz.create': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz.read': ['admin', 'channel-admin', 'plugin-manager', 'instructor', 'user'],
  'quiz.update': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz.delete': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz.publish': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz-batch.create': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz-batch.read': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz-batch.update': ['admin', 'channel-admin', 'plugin-manager', 'instructor'],
  'quiz-batch.delete': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam.take': ['user'],
  'quiz-exam.read': ['admin', 'channel-admin', 'plugin-manager', 'user'],
  'quiz-exam.create': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam.update': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam.delete': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam.submit': ['user'],
  'quiz-exam.grade': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam-attempt.take': ['user'],
  'quiz-exam-attempt.read': ['admin', 'channel-admin', 'plugin-manager', 'user'],
  'quiz-exam-attempt.create': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam-attempt.update': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam-attempt.delete': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-exam-attempt.submit': ['user'],
  'quiz-exam-attempt.grade': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-record.read': ['admin', 'channel-admin', 'plugin-manager', 'user'],
  'quiz-record.create': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-record.update': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-record.delete': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-record.grade': ['admin', 'channel-admin', 'plugin-manager'],
  'quiz-record.export': ['admin', 'channel-admin', 'plugin-manager'],
};

export default PERMISSIONS;
