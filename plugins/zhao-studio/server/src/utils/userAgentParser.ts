// server/src/utils/userAgentParser.ts

export interface UserAgentInfo {
  browser: string;
  browserVersion: string;
  os: string;
  osVersion: string;
  deviceType: 'desktop' | 'mobile' | 'tablet';
  platform: string;
}

export function parseUserAgent(userAgent: string): UserAgentInfo {
  const result: UserAgentInfo = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    deviceType: 'desktop',
    platform: '',
  };

  if (!userAgent) {
    return result;
  }

  // 解析浏览器（Edge 的 UA 同时含 Chrome 字样，须先判定）
  if (userAgent.includes('Edg/') || userAgent.includes('Edge/')) {
    result.browser = 'Edge';
    const match = userAgent.match(/Edg(?:e)?\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Chrome')) {
    result.browser = 'Chrome';
    const match = userAgent.match(/Chrome\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Safari')) {
    result.browser = 'Safari';
    const match = userAgent.match(/Version\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('Firefox')) {
    result.browser = 'Firefox';
    const match = userAgent.match(/Firefox\/(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  } else if (userAgent.includes('MSIE') || userAgent.includes('Trident')) {
    result.browser = 'IE';
    const match = userAgent.match(/(?:MSIE|rv:)(\d+\.\d+)/);
    if (match) result.browserVersion = match[1];
  }

  // 解析操作系统（Android/iOS 的 UA 分别含 Linux/Mac OS X 字样，须先判定）
  if (userAgent.includes('Android')) {
    result.os = 'Android';
    const match = userAgent.match(/Android (\d+\.\d+)/);
    if (match) result.osVersion = match[1];
  } else if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    result.os = 'iOS';
    const match = userAgent.match(/OS (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  } else if (userAgent.includes('Windows')) {
    result.os = 'Windows';
    if (userAgent.includes('Windows NT 10')) result.osVersion = '10';
    else if (userAgent.includes('Windows NT 6.3')) result.osVersion = '8.1';
    else if (userAgent.includes('Windows NT 6.2')) result.osVersion = '8';
    else if (userAgent.includes('Windows NT 6.1')) result.osVersion = '7';
  } else if (userAgent.includes('Mac OS X')) {
    result.os = 'MacOS';
    const match = userAgent.match(/Mac OS X (\d+[._]\d+)/);
    if (match) result.osVersion = match[1].replace('_', '.');
  } else if (userAgent.includes('Linux')) {
    result.os = 'Linux';
  }

  // 解析设备类型（iPad 的 UA 含 Mobile 字样，须先判平板）
  if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
    result.deviceType = 'tablet';
  } else if (userAgent.includes('Mobile') || userAgent.includes('iPhone') || userAgent.includes('Android')) {
    result.deviceType = 'mobile';
  } else {
    result.deviceType = 'desktop';
  }

  // 解析平台
  if (userAgent.includes('iPhone')) {
    result.platform = 'iPhone';
  } else if (userAgent.includes('iPad')) {
    result.platform = 'iPad';
  } else if (userAgent.includes('Android')) {
    result.platform = 'Linux armv8l';
  } else if (userAgent.includes('Windows')) {
    result.platform = 'Win32';
  } else if (userAgent.includes('Mac')) {
    result.platform = 'MacIntel';
  } else if (userAgent.includes('Linux')) {
    result.platform = 'Linux x86_64';
  }

  return result;
}