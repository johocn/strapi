import collect from './collect';
import scraper from './scraper';
import quality from './quality';
import aiAssist from './ai-assist';
import publish from './publish';
import channelAdapter from './channel-adapter';
import internalApi from './internal-api';
import statusSync from './status-sync';
import analytics from './analytics';
import aggregation from './aggregation';
import syncEvent from './sync-event';
import promoChannel from './promo-channel';
import promoCampaign from './promo-campaign';
import abTest from './ab-test';
import channelReport from './channel-report';

export default {
  collect,
  scraper,
  quality,
  'ai-assist': aiAssist,
  publish,
  'channel-adapter': channelAdapter,
  'internal-api': internalApi,
  'status-sync': statusSync,
  analytics,
  aggregation,
  'sync-event': syncEvent,
  'promo-channel': promoChannel,
  'promo-campaign': promoCampaign,
  'ab-test': abTest,
  'channel-report': channelReport,
};