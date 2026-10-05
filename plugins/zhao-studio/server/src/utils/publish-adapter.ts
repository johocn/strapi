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
  toutiao:     { article: true,  video: false, gallery: false }, // RPA 框架 input 是图文设计
  xiaohongshu: { article: true,  video: false, gallery: false }, // 同上
  douyin:      { article: true,  video: false, gallery: false }, // OAuth server API 只有 article；video/gallery 走 h5_share 手动扫码
  bilibili:    { article: true,  video: true,  gallery: false }, // 本次补 RPA driver：专栏 + 视频投稿
  wechat:      { article: true,  video: false, gallery: false }, // freepublish 只支持 article
  internal:    { article: true,  video: true,  gallery: true },  // 直接更新 status
  custom:      { article: true,  video: true,  gallery: true },  // 自定义接口透传
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
