// tests/services/publish-helpers.test.ts
// 覆盖 publish-helpers.ts 的 DB lnk fallback 辅助函数

import {
  detectContentType,
  inferContentTypeFromLnk,
  inferContentTypeFromScheduleLnk,
  resolveContentFromLnk,
  CONTENT_UID,
  contentLnkCol,
  ContentType,
} from '../../server/src/utils/publish-helpers';

function makeMockStrapi(resultsList: any[][] = []) {
  const query = jest.fn();
  // 为每次调用依次 mock 返回值，多出来的调用一律返回空数组
  resultsList.forEach((r) => query.mockResolvedValueOnce(r));
  query.mockResolvedValue([]);
  return {
    db: { connection: { query } },
    log: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  } as any;
}

describe('publish-helpers', () => {
  // =====================================================
  // detectContentType — 纯函数，无 strapi 依赖
  // =====================================================
  describe('detectContentType', () => {
    test('video 已 populate → 返回 video', () => {
      expect(detectContentType({ video: { documentId: 'v1' } })).toBe('video');
    });

    test('video 是 string（Strapi populate 有时只给 documentId）→ 返回 video', () => {
      expect(detectContentType({ video: 'v1' })).toBe('video');
    });

    test('gallery 优先于 video 都存在时 — 按 video → gallery → article 顺序', () => {
      expect(detectContentType({ video: { documentId: 'v1' }, gallery: { documentId: 'g1' } })).toBe('video');
      expect(detectContentType({ gallery: { documentId: 'g1' }, article: { documentId: 'a1' } })).toBe('gallery');
      expect(detectContentType({ article: { documentId: 'a1' } })).toBe('article');
    });

    test('三个 relation 都为空 → 返回 null', () => {
      expect(detectContentType({})).toBeNull();
      expect(detectContentType({ video: null, gallery: null, article: null })).toBeNull();
      expect(detectContentType({ video: undefined })).toBeNull();
    });

    test('null/undefined doc → 返回 null', () => {
      expect(detectContentType(null)).toBeNull();
      expect(detectContentType(undefined)).toBeNull();
    });
  });

  // =====================================================
  // contentLnkCol — 纯函数
  // =====================================================
  describe('contentLnkCol', () => {
    test('video/gallery 用 publish_xxx_id', () => {
      expect(contentLnkCol('video')).toBe('publish_video_id');
      expect(contentLnkCol('gallery')).toBe('publish_gallery_id');
    });

    test('article 用 article_draft_id（因为 target 是 article-draft CT）', () => {
      expect(contentLnkCol('article')).toBe('article_draft_id');
    });
  });

  // =====================================================
  // inferContentTypeFromLnk — DB 查询 publish_records_xxx_lnk
  // =====================================================
  describe('inferContentTypeFromLnk', () => {
    test('record 在 video_lnk 有行 → 返回 video', async () => {
      const strapi = makeMockStrapi([[{ '?column?': 1 }]]); // 第一次 SELECT 返回有行
      const result = await inferContentTypeFromLnk(strapi, 480);
      expect(result).toBe('video');
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        'SELECT 1 FROM zhao_publish_records_video_lnk WHERE publish_record_id = $1 LIMIT 1',
        [480],
      );
    });

    test('video 无 → 查 gallery → 有 → 返回 gallery', async () => {
      // 第一次（video）返回空，第二次（gallery）返回有行
      const strapi = makeMockStrapi([[], [{ '?column?': 1 }]]);
      const result = await inferContentTypeFromLnk(strapi, 480);
      expect(result).toBe('gallery');
    });

    test('video + gallery 空 → 查 article → 有 → 返回 article', async () => {
      const strapi = makeMockStrapi([[], [], [{ '?column?': 1 }]]);
      const result = await inferContentTypeFromLnk(strapi, 480);
      expect(result).toBe('article');
    });

    test('三个 lnk 表都无行 → 返回 null', async () => {
      const strapi = makeMockStrapi([[], [], []]);
      const result = await inferContentTypeFromLnk(strapi, 480);
      expect(result).toBeNull();
    });

    test('DB 查询抛错 → 吞掉异常返回 null（不能让 lnk fallback 本身崩）', async () => {
      const strapi = makeMockStrapi();
      strapi.db.connection.query.mockRejectedValueOnce(new Error('relation does not exist'));
      // video 抛错 → catch → 继续查 gallery（也 mockReject）
      strapi.db.connection.query.mockRejectedValueOnce(new Error('relation does not exist'));
      strapi.db.connection.query.mockRejectedValueOnce(new Error('relation does not exist'));

      const result = await inferContentTypeFromLnk(strapi, 480);
      expect(result).toBeNull();
    });
  });

  // =====================================================
  // inferContentTypeFromScheduleLnk — DB 查询 publish_schedules_xxx_lnk
  // =====================================================
  describe('inferContentTypeFromScheduleLnk', () => {
    test('schedule 在 video_lnk 有行 → 返回 video', async () => {
      const strapi = makeMockStrapi([[{ '?column?': 1 }]]);
      const result = await inferContentTypeFromScheduleLnk(strapi, 9);
      expect(result).toBe('video');
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        'SELECT 1 FROM zhao_publish_schedules_video_lnk WHERE publish_schedule_id = $1 LIMIT 1',
        [9],
      );
    });

    test('三个都无 → null', async () => {
      const strapi = makeMockStrapi([[], [], []]);
      const result = await inferContentTypeFromScheduleLnk(strapi, 9);
      expect(result).toBeNull();
    });
  });

  // =====================================================
  // resolveContentFromLnk — lnk JOIN content 表
  // =====================================================
  describe('resolveContentFromLnk', () => {
    test('video: JOIN publish_videos 查到 document_id', async () => {
      const strapi = makeMockStrapi([[{ id: 12, document_id: 'f75rfs33hvjwhp67v9b5cva9' }]]);
      const result = await resolveContentFromLnk(strapi, 'video', 480);
      expect(result).toEqual({ contentNumId: 12, contentDocumentId: 'f75rfs33hvjwhp67v9b5cva9' });
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('zhao_publish_records_video_lnk'),
        [480],
      );
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('zhao_publish_videos'),
        [480],
      );
    });

    test('article: JOIN article_drafts，lnk 列是 article_draft_id', async () => {
      const strapi = makeMockStrapi([[{ id: 5, document_id: 'art-doc-1' }]]);
      const result = await resolveContentFromLnk(strapi, 'article', 480);
      expect(result).toEqual({ contentNumId: 5, contentDocumentId: 'art-doc-1' });
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('article_draft_id'),
        [480],
      );
      expect(strapi.db.connection.query).toHaveBeenCalledWith(
        expect.stringContaining('zhao_article_drafts'),
        [480],
      );
    });

    test('lnk 无对应行 → 返回 null', async () => {
      const strapi = makeMockStrapi([[]]);
      const result = await resolveContentFromLnk(strapi, 'gallery', 480);
      expect(result).toBeNull();
    });

    test('DB 抛错 → 返回 null', async () => {
      const strapi = makeMockStrapi();
      strapi.db.connection.query.mockRejectedValueOnce(new Error('boom'));
      const result = await resolveContentFromLnk(strapi, 'video', 480);
      expect(result).toBeNull();
    });
  });

  // =====================================================
  // CONTENT_UID 常量校验
  // =====================================================
  describe('CONTENT_UID', () => {
    test('三个 contentType 都有对应 UID，且都是 plugin CT 格式', () => {
      (['video', 'gallery', 'article'] as ContentType[]).forEach((ct) => {
        expect(CONTENT_UID[ct]).toMatch(/^plugin::zhao-studio\./);
      });
    });
  });
});
