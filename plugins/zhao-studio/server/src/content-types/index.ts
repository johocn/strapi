import articleDraft from './article-draft';
import collectSource from './collect-source';
import collectTask from './collect-task';
import publishPlatform from './publish-platform';
import publishAccount from './publish-account';
import publishRecord from './publish-record';
import knowledgePointIndex from './knowledge-point-index';
import adSlot from './ad-slot';
import browserLog from './browser-log';
import statSummary from './stat-summary';
import syncEvent from './sync-event';
import promoChannel from './promo-channel';
import channelPlatformConfig from './channel-platform-config';
import promoCampaign from './promo-campaign';
import abExperiment from './ab-experiment';
import abVariant from './ab-variant';

export default {
  'article-draft': articleDraft,
  'collect-source': collectSource,
  'collect-task': collectTask,
  'publish-platform': publishPlatform,
  'publish-account': publishAccount,
  'publish-record': publishRecord,
  'knowledge-point-index': knowledgePointIndex,
  'ad-slot': adSlot,
  'browser-log': browserLog,
  'stat-summary': statSummary,
  'sync-event': syncEvent,
  'promo-channel': promoChannel,
  'channel-platform-config': channelPlatformConfig,
  'promo-campaign': promoCampaign,
  'ab-experiment': abExperiment,
  'ab-variant': abVariant,
};