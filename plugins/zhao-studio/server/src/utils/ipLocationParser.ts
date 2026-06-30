// server/src/utils/ipLocationParser.ts

import axios from 'axios';

export interface IpLocationInfo {
  country: string;
  city: string;
}

// 使用免费的 IP 地理位置服务(可替换为付费服务)
const IP_API_URL = 'http://ip-api.com/json/';

export async function parseIpLocation(ip: string): Promise<IpLocationInfo> {
  const result: IpLocationInfo = {
    country: '',
    city: '',
  };

  if (!ip || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    // 本地或内网IP,返回空
    return result;
  }

  try {
    const response = await axios.get(`${IP_API_URL}${ip}`, {
      timeout: 5000,
    });

    if (response.data && response.data.status === 'success') {
      result.country = response.data.country || '';
      result.city = response.data.city || '';
    }
  } catch (error) {
    // 解析失败,返回空,不阻塞上报
  }

  return result;
}

// 提取 referrer 域名
export function extractReferrerDomain(referrer: string): string {
  if (!referrer) {
    return '';
  }

  try {
    const url = new URL(referrer);
    return url.hostname || '';
  } catch {
    return '';
  }
}