// server/src/utils/selectors.ts

import * as cheerio from 'cheerio';

export interface ScrapedTitle {
  title: string;
  url: string;
}

export interface ScrapedContent {
  title: string;
  body: string;
  author?: string;
  date?: string;
  images?: string[];
}

export function extractTitles(html: string, selector: string): ScrapedTitle[] {
  const $ = cheerio.load(html);
  const titles: ScrapedTitle[] = [];

  $(selector).each((_, element) => {
    const $element = $(element);
    const title = $element.text().trim();
    const url = $element.attr('href') || '';

    if (title && url) {
      titles.push({ title, url });
    }
  });

  return titles;
}

export function extractContent(
  html: string,
  contentSelector: string,
  authorSelector?: string,
  dateSelector?: string
): ScrapedContent {
  const $ = cheerio.load(html);

  const title = $('h1').first().text().trim() || $('title').text().trim();
  const body = $(contentSelector).text().trim();

  const author = authorSelector ? $(authorSelector).text().trim() : undefined;
  const date = dateSelector ? $(dateSelector).text().trim() : undefined;

  const images: string[] = [];
  $(contentSelector).find('img').each((_, element) => {
    const src = $(element).attr('src');
    if (src) {
      images.push(src);
    }
  });

  return { title, body, author, date, images };
}

export function filterDuplicates(titles: ScrapedTitle[]): ScrapedTitle[] {
  const seen = new Set<string>();
  return titles.filter((title) => {
    const key = title.url;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}