import collect from './collect';
import draft from './draft';
import publish from './publish';
import internalApi from './internal-api';
import ai from './ai';
import analytics from './analytics';
import knowledgeIndex from './knowledge-index';
import browserLog from './browser-log';
import statSummary from './stat-summary';

export default {
  collect,
  draft,
  publish,
  'internal-api': internalApi,
  ai,
  analytics,
  'knowledge-index': knowledgeIndex,
  'browser-log': browserLog,
  'stat-summary': statSummary,
};
