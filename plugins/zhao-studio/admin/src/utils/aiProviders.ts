// admin/src/utils/aiProviders.ts

export interface AIProvider {
  name: string;
  displayName: string;
  models: string[];
  defaultModel: string;
  maxTokens: number;
  temperature: number;
}

export const aiProviders: Record<string, AIProvider> = {
  qwen: {
    name: 'qwen',
    displayName: '阿里云通义千问',
    models: ['qwen-turbo', 'qwen-plus', 'qwen-max'],
    defaultModel: 'qwen-turbo',
    maxTokens: 2000,
    temperature: 0.7,
  },
  wenxin: {
    name: 'wenxin',
    displayName: '百度文心一言',
    models: ['ERNIE-Bot', 'ERNIE-Bot-turbo'],
    defaultModel: 'ERNIE-Bot-turbo',
    maxTokens: 2000,
    temperature: 0.7,
  },
  hunyuan: {
    name: 'hunyuan',
    displayName: '腾讯混元',
    models: ['hunyuan-lite', 'hunyuan-standard'],
    defaultModel: 'hunyuan-lite',
    maxTokens: 2000,
    temperature: 0.7,
  },
  spark: {
    name: 'spark',
    displayName: '讯飞星火',
    models: ['spark-v1.5', 'spark-v2.0'],
    defaultModel: 'spark-v1.5',
    maxTokens: 2000,
    temperature: 0.7,
  },
  custom: {
    name: 'custom',
    displayName: '自定义接口',
    models: [],
    defaultModel: '',
    maxTokens: 2000,
    temperature: 0.7,
  },
};

export function getProvider(providerId: string): AIProvider | undefined {
  return aiProviders[providerId];
}

export function getAllProviders(): AIProvider[] {
  return Object.values(aiProviders);
}