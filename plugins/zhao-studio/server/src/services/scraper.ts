// server/src/services/scraper.ts

import axios from 'axios';
import { extractTitles, extractContent, filterDuplicates } from '../utils/selectors';
import { getTemplate } from '../utils/templates';
import { identifyErrorType } from '../utils/errors';

export default ({ strapi }: { strapi: any }) => ({
  async fetchTitles(sourceId: string) {
    const source = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .findOne({ documentId: sourceId });

    if (!source) {
      throw new Error('采集源不存在');
    }

    try {
      const response = await axios.get(source.url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const selector = source.type === 'template' && source.template
        ? getTemplate(source.template)?.titleSelector || source.titleSelector
        : source.titleSelector;

      const titles = extractTitles(response.data, selector);
      const filteredTitles = filterDuplicates(titles);

      return filteredTitles;
    } catch (error: any) {
      const errorType = identifyErrorType(error);
      throw new Error(errorType.message);
    }
  },

  async fetchContent(url: string, sourceId: string) {
    const source = await strapi
      .documents('plugin::zhao-studio.collect-source')
      .findOne({ documentId: sourceId });

    if (!source) {
      throw new Error('采集源不存在');
    }

    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      const template = source.type === 'template' && source.template
        ? getTemplate(source.template)
        : null;

      const contentSelector = template?.contentSelector || source.contentSelector;
      const authorSelector = template?.authorSelector || source.authorSelector;
      const dateSelector = template?.dateSelector || source.dateSelector;

      const content = extractContent(response.data, contentSelector, authorSelector, dateSelector);

      return content;
    } catch (error: any) {
      const errorType = identifyErrorType(error);
      throw new Error(errorType.message);
    }
  },
});