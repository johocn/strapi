// server/src/services/quality.ts

export interface QualityScore {
  total: number;
  details: {
    length: number;
    images: number;
    author: number;
    date: number;
    title: number;
  };
}

export default ({ strapi }: { strapi: any }) => ({
  calculateQuality(content: any): QualityScore {
    const details = {
      length: 0,
      images: 0,
      author: 0,
      date: 0,
      title: 0,
    };

    // 文字长度评分（最多30分）
    if (content.body && content.body.length >= 500) {
      details.length = 30;
    } else if (content.body && content.body.length >= 300) {
      details.length = 20;
    } else if (content.body && content.body.length >= 100) {
      details.length = 10;
    }

    // 图片数量评分（最多20分）
    if (content.images && content.images.length >= 3) {
      details.images = 20;
    } else if (content.images && content.images.length >= 1) {
      details.images = 10;
    }

    // 作者评分（最多10分）
    if (content.author && content.author.trim().length > 0) {
      details.author = 10;
    }

    // 日期评分（最多10分）
    if (content.date && content.date.trim().length > 0) {
      details.date = 10;
    }

    // 标题评分（最多10分）
    if (content.title && content.title.length >= 10) {
      details.title = 10;
    } else if (content.title && content.title.length >= 5) {
      details.title = 5;
    }

    const total = details.length + details.images + details.author + details.date + details.title;

    return { total, details };
  },

  isQualityAcceptable(score: QualityScore): boolean {
    return score.total >= 40; // 最低40分才可入库
  },

  getQualityLevel(score: QualityScore): 'high' | 'medium' | 'low' {
    if (score.total >= 70) {
      return 'high';
    } else if (score.total >= 50) {
      return 'medium';
    } else {
      return 'low';
    }
  },
});