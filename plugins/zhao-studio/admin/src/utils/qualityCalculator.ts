// admin/src/utils/qualityCalculator.ts

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

export function getQualityColor(score: number): string {
  if (score >= 70) {
    return 'success500';
  } else if (score >= 50) {
    return 'warning500';
  } else {
    return 'danger500';
  }
}

export function getQualityLabel(score: number): string {
  if (score >= 70) {
    return '高质量';
  } else if (score >= 50) {
    return '中等质量';
  } else {
    return '低质量';
  }
}

export function isQualityAcceptable(score: number): boolean {
  return score >= 40;
}