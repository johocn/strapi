import React from 'react';

const API_BASE = '/api/zhao-studio/v1/admin';

interface PublishParams {
  articleIds: string[];
  platformId: string;
  accountId: string;
}

export const usePublishActions = () => {
  const [loading, setLoading] = React.useState(false);

  // 批量发布：循环调用单文章发布接口
  const publish = async ({ articleIds, platformId, accountId }: PublishParams) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        articleIds.map(articleId =>
          fetch(`${API_BASE}/articles/${articleId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platformId, accountId }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 篇文章发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };

  // 单文章发布（保留原有方法，兼容旧代码）
  const publishArticle = async (articleId: string, accountIds: string[]) => {
    setLoading(true);
    try {
      const results = await Promise.all(
        accountIds.map(accountId =>
          fetch(`${API_BASE}/articles/${articleId}/publish`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ accountId }),
          })
        )
      );
      const failed = results.filter(r => !r.ok);
      if (failed.length > 0) {
        throw new Error(`${failed.length} 个账号发布失败`);
      }
    } finally {
      setLoading(false);
    }
  };

  return { publish, publishArticle, loading };
};

export default usePublishActions;
