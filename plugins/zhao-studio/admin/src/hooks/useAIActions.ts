import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin/ai';

interface ChatResponse {
  content: string;
  role: string;
}

export const useAIActions = () => {
  const [loading, setLoading] = React.useState(false);

  // 通用对话（新增，调用后端 /ai/chat）
  const chat = async (content: string): Promise<ChatResponse> => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content }],
        }),
      });
      if (!res.ok) throw new Error('对话失败');
      const json = await res.json();
      return json.data || { content: '（无回复）', role: 'assistant' };
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async (articleId: string, options?: { length?: number }) => {
    setLoading(true);
    try {
      const query = options?.length ? `?length=${options.length}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/summary${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('生成摘要失败');
      const json = await res.json();
      return json.data?.summary || '';
    } finally {
      setLoading(false);
    }
  };

  const optimizeTitle = async (articleId: string, style?: string) => {
    setLoading(true);
    try {
      const query = style ? `?style=${style}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/title${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('优化标题失败');
      const json = await res.json();
      return json.data?.optimizedTitle || '';
    } finally {
      setLoading(false);
    }
  };

  const rewriteContent = async (articleId: string, tone?: string) => {
    setLoading(true);
    try {
      const query = tone ? `?tone=${tone}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/rewrite${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('改写内容失败');
      const json = await res.json();
      return json.data?.rewrittenContent || '';
    } finally {
      setLoading(false);
    }
  };

  const convertLanguage = async (articleId: string, target?: string) => {
    setLoading(true);
    try {
      const query = target ? `?target=${target}` : '';
      const res = await fetch(`${API_BASE}/articles/${articleId}/convert${query}`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('语言转换失败');
      const json = await res.json();
      return json.data?.convertedContent || '';
    } finally {
      setLoading(false);
    }
  };

  return { chat, generateSummary, optimizeTitle, rewriteContent, convertLanguage, loading };
};

export default useAIActions;
