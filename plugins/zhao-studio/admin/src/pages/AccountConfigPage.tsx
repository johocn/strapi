// admin/src/pages/AccountConfigPage.tsx

import React from 'react';
import { Box, Typography, Button, Flex, Badge } from '@strapi/design-system';
import { usePublishAccounts } from '../hooks/usePublishAccounts';
import { usePublishPlatforms } from '../hooks/usePublishPlatforms';
import AccountForm from '../components/AccountForm';

const AccountConfigPage = () => {
  const { accounts, loading, error, createAccount, updateAccount, deleteAccount } = usePublishAccounts();
  const { platforms } = usePublishPlatforms();
  const [showForm, setShowForm] = React.useState(false);
  const [editingAccount, setEditingAccount] = React.useState<any>(null);

  const handleCreate = () => {
    setEditingAccount(null);
    setShowForm(true);
  };

  const handleEdit = (account: any) => {
    setEditingAccount(account);
    setShowForm(true);
  };

  const handleDelete = async (accountId: string) => {
    if (window.confirm('确定要删除此账号吗？')) {
      await deleteAccount(accountId);
    }
  };

  const handleSave = async (data: any) => {
    if (editingAccount) {
      await updateAccount(editingAccount.documentId, data);
    } else {
      await createAccount(data);
    }
    setShowForm(false);
    setEditingAccount(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingAccount(null);
  };

  return (
    <Box padding={4}>
      <Flex justifyContent="space-between" alignItems="center">
        <Box>
          <Typography variant="alpha">发布账号配置</Typography>
          <Typography variant="pi" color="neutral600">管理发布账号和API密钥</Typography>
        </Box>
        <Button onClick={handleCreate}>新建账号</Button>
      </Flex>

      {error && (
        <Box marginTop={4}>
          <Badge variant="danger">{error}</Badge>
        </Box>
      )}

      {showForm ? (
        <Box marginTop={4}>
          <AccountForm
            account={editingAccount}
            platforms={platforms}
            onSave={handleSave}
            onCancel={handleCancel}
          />
        </Box>
      ) : (
        <Flex marginTop={4} gap={4} direction="column">
          {loading ? (
            <Badge>加载中...</Badge>
          ) : accounts.length === 0 ? (
            <Badge variant="warning">暂无账号配置</Badge>
          ) : (
            accounts.map((account) => (
              <Box key={account.documentId} padding={3} background="neutral100" hasRadius>
                <Flex justifyContent="space-between" alignItems="center">
                  <Flex gap={2} alignItems="center">
                    <Typography variant="pi" fontWeight="bold">{account.name}</Typography>
                    <Badge>{account.platform?.name || '未知平台'}</Badge>
                    {!account.isActive && <Badge variant="warning">已禁用</Badge>}
                  </Flex>

                  <Flex gap={2}>
                    <Button variant="secondary" onClick={() => handleEdit(account)}>
                      编辑
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(account.documentId)}>
                      删除
                    </Button>
                  </Flex>
                </Flex>

                {account.lastPublishedAt && (
                  <Box marginTop={2}>
                    <Typography variant="pi" color="neutral600">
                      最后发布: {new Date(account.lastPublishedAt).toLocaleString()}
                    </Typography>
                  </Box>
                )}
              </Box>
            ))
          )}
        </Flex>
      )}
    </Box>
  );
};

export default AccountConfigPage;