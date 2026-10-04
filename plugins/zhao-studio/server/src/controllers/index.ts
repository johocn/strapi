import collect from './collect';
import draft from './draft';
import publish from './publish';
import publishVideo from './publish-video';
import publishGallery from './publish-gallery';
import internalApi from './internal-api';
import ai from './ai';
import analytics from './analytics';
import knowledgeIndex from './knowledge-index';
import browserLog from './browser-log';
import statSummary from './stat-summary';
import syncEventApi from './sync-event-api';
import promoChannel from './promo-channel';
import promoCampaign from './promo-campaign';
import abTest from './ab-test';
import channelReport from './channel-report';
import ad from './ad';
import poster from './poster';
import oauth from './oauth';
import rpa from './rpa';

export default {
  collect,
  draft,
  publish,
  'publish-video': publishVideo,
  'publish-gallery': publishGallery,
  'internal-api': internalApi,
  ai,
  analytics,
  'knowledge-index': knowledgeIndex,
  'browser-log': browserLog,
  'stat-summary': statSummary,
  'sync-event-api': syncEventApi,
  'promo-channel': promoChannel,
  'promo-campaign': promoCampaign,
  'ab-test': abTest,
  'channel-report': channelReport,
  ad,
  'poster': poster,
  oauth,
  rpa,
};