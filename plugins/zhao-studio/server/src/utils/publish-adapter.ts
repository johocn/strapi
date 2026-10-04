// server/src/utils/publish-adapter.ts
// 内容类型识别 + 平台适配校验

export function detectContentType(content: any): 'article' | 'video' | 'gallery' {
  if (!content) throw new Error('content 不能为空')
  if (content.videoUrl) return 'video'
  if (Array.isArray(content.images) && content.images.length > 0) return 'gallery'
  if (content.content || content.aiSummary || content.sourceTitle || content.article) return 'article'
  throw new Error('无法识别 content 类型：缺少 videoUrl / images / article 字段')
}

const PLATFORM_CAPS: Record<string, Record<string, boolean>> = {
  douyin: { article: true, video: true, gallery: true },
  xiaohongshu: { article: true, video: true, gallery: true },
  wechat: { article: true, video: true, gallery: true },
  toutiao: { article: true, video: true, gallery: true },
  bilibili: { article: false, video: true, gallery: false },
  internal: { article: true, video: true, gallery: true },
  custom: { article: true, video: true, gallery: true },
}

export function validateContentForPlatform(
  content: any,
  contentType: 'article' | 'video' | 'gallery',
  platformType: string,
): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  const caps = PLATFORM_CAPS[platformType] || {}
  if (!caps[contentType]) {
    errors.push(`平台 ${platformType} 暂不支持 ${contentType} 类型`)
    return { valid: false, errors }
  }

  if (contentType === 'video') {
    if (!content.videoUrl) errors.push('video 类型必须提供 videoUrl')
    if (!content.title) errors.push('video 类型必须提供 title')
  }

  if (contentType === 'gallery') {
    if (!Array.isArray(content.images) || content.images.length === 0) {
      errors.push('gallery 类型必须提供非空 images[]')
    }
    if (platformType === 'xiaohongshu' && Array.isArray(content.images) && content.images.length < 3) {
      errors.push('小红书图集至少需要 3 张图片')
    }
    if (!content.title) errors.push('gallery 类型必须提供 title')
  }

  if (contentType === 'article') {
    if (!content.title) errors.push('article 类型必须提供 title')
  }

  return { valid: errors.length === 0, errors }
}

const UID_MAP: Record<string, string> = {
  article: 'plugin::zhao-studio.article-draft',
  video: 'plugin::zhao-studio.publish-video',
  gallery: 'plugin::zhao-studio.publish-gallery',
}

export function getContentUid(type: 'article' | 'video' | 'gallery'): string {
  return UID_MAP[type]
}
