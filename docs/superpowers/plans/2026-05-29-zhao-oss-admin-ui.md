# zhao-oss 前端管理界面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 zhao-oss 插件添加前端管理界面，包含仪表盘、同步记录、配置管理、操作中心四个 Tab 页面。

**Architecture:** 单页面 Tab 切换架构，使用 Ant Design 组件库，集成 zhao-auth 权限系统，支持中英文国际化。

**Tech Stack:** React 18, Ant Design 5.x, TypeScript, Strapi v5 Plugin API

---

## 文件结构

```
e:\code\plugins\zhao-oss\admin\src\
├── index.ts                    # 修改：注册菜单和插件
├── pages/
│   └── HomePage.tsx            # 创建：主页面（Tab 容器）
├── components/
│   ├── DashboardTab.tsx        # 创建：仪表盘
│   ├── RecordsTab.tsx          # 创建：同步记录
│   ├── SettingsTab.tsx         # 创建：配置管理
│   └── ActionsTab.tsx          # 创建：操作中心
├── hooks/
│   └── useOssApi.ts            # 创建：API 请求封装
├── translations/
│   ├── en.json                 # 修改：英文翻译
│   └── zh-CN.json              # 修改：中文翻译
└── utils/
    ├── api.ts                  # 创建：API 客户端
    └── getTranslation.ts       # 已存在
```

---

### Task 1: API 客户端封装

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\utils\api.ts`
- Create: `e:\code\plugins\zhao-oss\admin\src\hooks\useOssApi.ts`

- [ ] **Step 1: 创建 API 客户端**

```typescript
import axios from 'axios';

const API_PREFIX = '/admin/plugins/zhao-oss';

export const api = {
  getDashboard: () => 
    axios.get(`${API_PREFIX}/sync/dashboard`),
  
  getSyncRecords: (params?: { 
    page?: number; 
    pageSize?: number; 
    status?: string;
    provider?: string;
  }) => 
    axios.get(`${API_PREFIX}/sync/records`, { params }),
  
  triggerSync: (fileId: number) => 
    axios.post(`${API_PREFIX}/sync/trigger`, { fileId }),
  
  batchSync: (limit: number = 50, offset: number = 0) => 
    axios.post(`${API_PREFIX}/sync/batch`, { limit, offset }),
  
  deleteRemote: (recordId: number) => 
    axios.delete(`${API_PREFIX}/sync/remote/${recordId}`),
  
  checkHealth: () => 
    axios.get(`${API_PREFIX}/sync/health`),
  
  getConfig: () => 
    axios.get(`${API_PREFIX}/settings`),
  
  updateConfig: (data: Record<string, unknown>) => 
    axios.put(`${API_PREFIX}/settings`, data),
  
  testProvider: (data: Record<string, unknown>) => 
    axios.post(`${API_PREFIX}/settings/test-provider`, data),
};
```

- [ ] **Step 2: 创建 useOssApi Hook**

```typescript
import { useState, useCallback } from 'react';
import { message } from 'antd';
import { api } from '../utils/api';

interface UseOssApiReturn {
  loading: boolean;
  error: string | null;
  fetchDashboard: () => Promise<any>;
  fetchRecords: (params?: any) => Promise<any>;
  triggerSync: (fileId: number) => Promise<boolean>;
  batchSync: (limit?: number, offset?: number) => Promise<any>;
  deleteRemote: (recordId: number) => Promise<boolean>;
  checkHealth: () => Promise<any>;
  getConfig: () => Promise<any>;
  updateConfig: (data: any) => Promise<boolean>;
  testProvider: (data: any) => Promise<any>;
}

export const useOssApi = (): UseOssApiReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((err: any) => {
    const errorMsg = err.response?.data?.error?.message || err.message || '请求失败';
    setError(errorMsg);
    message.error(errorMsg);
    return null;
  }, []);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard();
      setLoading(false);
      return res.data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [handleError]);

  const fetchRecords = useCallback(async (params?: any) => {
    setLoading(true);
    try {
      const res = await api.getSyncRecords(params);
      setLoading(false);
      return res.data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [handleError]);

  const triggerSync = useCallback(async (fileId: number) => {
    setLoading(true);
    try {
      await api.triggerSync(fileId);
      setLoading(false);
      message.success('同步已触发');
      return true;
    } catch (err) {
      setLoading(false);
      handleError(err);
      return false;
    }
  }, [handleError]);

  const batchSync = useCallback(async (limit = 50, offset = 0) => {
    setLoading(true);
    try {
      const res = await api.batchSync(limit, offset);
      setLoading(false);
      message.success(`批量同步完成: ${res.data.success}/${res.data.total}`);
      return res.data;
    } catch (err) {
      setLoading(false);
      handleError(err);
      return null;
    }
  }, [handleError]);

  const deleteRemote = useCallback(async (recordId: number) => {
    setLoading(true);
    try {
      await api.deleteRemote(recordId);
      setLoading(false);
      message.success('远程文件已删除');
      return true;
    } catch (err) {
      setLoading(false);
      handleError(err);
      return false;
    }
  }, [handleError]);

  const checkHealth = useCallback(async () => {
    try {
      const res = await api.checkHealth();
      return res.data;
    } catch (err) {
      return handleError(err);
    }
  }, [handleError]);

  const getConfig = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getConfig();
      setLoading(false);
      return res.data;
    } catch (err) {
      setLoading(false);
      return handleError(err);
    }
  }, [handleError]);

  const updateConfig = useCallback(async (data: any) => {
    setLoading(true);
    try {
      await api.updateConfig(data);
      setLoading(false);
      message.success('配置已保存');
      return true;
    } catch (err) {
      setLoading(false);
      handleError(err);
      return false;
    }
  }, [handleError]);

  const testProvider = useCallback(async (data: any) => {
    setLoading(true);
    try {
      const res = await api.testProvider(data);
      setLoading(false);
      if (res.data.success) {
        message.success('连接测试成功');
      } else {
        message.error(res.data.error || '连接测试失败');
      }
      return res.data;
    } catch (err) {
      setLoading(false);
      handleError(err);
      return null;
    }
  }, [handleError]);

  return {
    loading,
    error,
    fetchDashboard,
    fetchRecords,
    triggerSync,
    batchSync,
    deleteRemote,
    checkHealth,
    getConfig,
    updateConfig,
    testProvider,
  };
};
```

- [ ] **Step 3: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/utils/api.ts admin/src/hooks/useOssApi.ts
git commit -m "feat(zhao-oss): add API client and useOssApi hook"
```

---

### Task 2: 国际化翻译文件

**Files:**
- Modify: `e:\code\plugins\zhao-oss\admin\src\translations\zh-CN.json`
- Modify: `e:\code\plugins\zhao-oss\admin\src\translations\en.json`

- [ ] **Step 1: 更新中文翻译**

```json
{
  "menu.label": "OSS 备份",
  "dashboard.title": "仪表盘",
  "dashboard.total": "总文件数",
  "dashboard.synced": "已同步",
  "dashboard.failed": "同步失败",
  "dashboard.pending": "待同步",
  "dashboard.health": "健康状态",
  "dashboard.health.healthy": "正常",
  "dashboard.health.unhealthy": "异常",
  "dashboard.recentRecords": "最近同步记录",
  "records.title": "同步记录",
  "records.fileId": "文件 ID",
  "records.filename": "文件名",
  "records.status": "状态",
  "records.provider": "提供者",
  "records.remoteUrl": "远程 URL",
  "records.syncTime": "同步时间",
  "records.actions": "操作",
  "records.retry": "重试",
  "records.delete": "删除远程",
  "records.batchRetry": "批量重试",
  "records.batchDelete": "批量删除",
  "settings.title": "配置管理",
  "settings.provider": "提供者",
  "settings.accessKeyId": "Access Key ID",
  "settings.accessKeySecret": "Access Key Secret",
  "settings.bucket": "存储桶",
  "settings.region": "区域",
  "settings.cname": "自定义域名",
  "settings.basePath": "存储路径前缀",
  "settings.maxRetries": "最大重试次数",
  "settings.uploadTimeout": "上传超时 (ms)",
  "settings.save": "保存配置",
  "settings.test": "测试连接",
  "settings.reset": "重置",
  "actions.title": "操作中心",
  "actions.singleSync": "单个文件同步",
  "actions.batchSync": "批量同步",
  "actions.fileId": "文件 ID",
  "actions.limit": "每次数量",
  "actions.offset": "起始偏移",
  "actions.sync": "同步",
  "actions.batchSyncBtn": "批量同步",
  "status.success": "成功",
  "status.failed": "失败",
  "status.pending": "待同步",
  "status.syncing": "同步中",
  "status.deleted": "已删除"
}
```

- [ ] **Step 2: 更新英文翻译**

```json
{
  "menu.label": "OSS Backup",
  "dashboard.title": "Dashboard",
  "dashboard.total": "Total Files",
  "dashboard.synced": "Synced",
  "dashboard.failed": "Failed",
  "dashboard.pending": "Pending",
  "dashboard.health": "Health Status",
  "dashboard.health.healthy": "Healthy",
  "dashboard.health.unhealthy": "Unhealthy",
  "dashboard.recentRecords": "Recent Sync Records",
  "records.title": "Sync Records",
  "records.fileId": "File ID",
  "records.filename": "Filename",
  "records.status": "Status",
  "records.provider": "Provider",
  "records.remoteUrl": "Remote URL",
  "records.syncTime": "Sync Time",
  "records.actions": "Actions",
  "records.retry": "Retry",
  "records.delete": "Delete Remote",
  "records.batchRetry": "Batch Retry",
  "records.batchDelete": "Batch Delete",
  "settings.title": "Settings",
  "settings.provider": "Provider",
  "settings.accessKeyId": "Access Key ID",
  "settings.accessKeySecret": "Access Key Secret",
  "settings.bucket": "Bucket",
  "settings.region": "Region",
  "settings.cname": "Custom Domain",
  "settings.basePath": "Base Path",
  "settings.maxRetries": "Max Retries",
  "settings.uploadTimeout": "Upload Timeout (ms)",
  "settings.save": "Save",
  "settings.test": "Test Connection",
  "settings.reset": "Reset",
  "actions.title": "Actions",
  "actions.singleSync": "Single File Sync",
  "actions.batchSync": "Batch Sync",
  "actions.fileId": "File ID",
  "actions.limit": "Limit",
  "actions.offset": "Offset",
  "actions.sync": "Sync",
  "actions.batchSyncBtn": "Batch Sync",
  "status.success": "Success",
  "status.failed": "Failed",
  "status.pending": "Pending",
  "status.syncing": "Syncing",
  "status.deleted": "Deleted"
}
```

- [ ] **Step 3: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/translations/zh-CN.json admin/src/translations/en.json
git commit -m "feat(zhao-oss): add i18n translations for admin UI"
```

---

### Task 3: 仪表盘组件

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\components\DashboardTab.tsx`

- [ ] **Step 1: 创建仪表盘组件**

```typescript
import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag, Button, Space, Badge } from 'antd';
import {
  FileOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  ReloadOutlined,
} from '@ant-design/icons';
import { useOssApi } from '../hooks/useOssApi';

interface DashboardData {
  stats: { total: number; synced: number; failed: number; pending: number };
  health: { healthy: boolean; provider: string; lastCheck: string };
  recentRecords: Array<{
    id: number;
    fileId: number;
    status: string;
    provider: string;
    lastSyncedAt: string;
  }>;
}

const statusColors: Record<string, string> = {
  success: 'green',
  failed: 'red',
  pending: 'blue',
  syncing: 'orange',
  deleted: 'default',
};

const statusText: Record<string, string> = {
  success: '成功',
  failed: '失败',
  pending: '待同步',
  syncing: '同步中',
  deleted: '已删除',
};

export const DashboardTab: React.FC = () => {
  const { loading, fetchDashboard, checkHealth } = useOssApi();
  const [data, setData] = useState<DashboardData | null>(null);

  const loadDashboard = async () => {
    const result = await fetchDashboard();
    if (result) {
      setData(result);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  const handleRefreshHealth = async () => {
    await checkHealth();
    loadDashboard();
  };

  const recentColumns = [
    { title: '文件 ID', dataIndex: 'fileId', key: 'fileId', width: 80 },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusText[status] || status}
        </Tag>
      ),
    },
    { title: '提供者', dataIndex: 'provider', key: 'provider', width: 100 },
    {
      title: '同步时间',
      dataIndex: 'lastSyncedAt',
      key: 'lastSyncedAt',
      render: (time: string) => (time ? new Date(time).toLocaleString() : '-'),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="总文件数"
              value={data?.stats?.total || 0}
              prefix={<FileOutlined />}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已同步"
              value={data?.stats?.synced || 0}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="同步失败"
              value={data?.stats?.failed || 0}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: '#cf1322' }}
              loading={loading}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待同步"
              value={data?.stats?.pending || 0}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: '#1677ff' }}
              loading={loading}
            />
          </Card>
        </Col>
      </Row>

      <Card
        title="健康状态"
        extra={
          <Button icon={<ReloadOutlined />} onClick={handleRefreshHealth} loading={loading}>
            刷新
          </Button>
        }
      >
        <Space size="large">
          <span>提供者: {data?.health?.provider || '-'}</span>
          <span>
            状态:{' '}
            <Badge
              status={data?.health?.healthy ? 'success' : 'error'}
              text={data?.health?.healthy ? '正常' : '异常'}
            />
          </span>
          <span>
            最后检查:{' '}
            {data?.health?.lastCheck
              ? new Date(data.health.lastCheck).toLocaleString()
              : '-'}
          </span>
        </Space>
      </Card>

      <Card title="最近同步记录">
        <Table
          columns={recentColumns}
          dataSource={data?.recentRecords || []}
          rowKey="id"
          loading={loading}
          pagination={false}
          size="small"
        />
      </Card>
    </Space>
  );
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/components/DashboardTab.tsx
git commit -m "feat(zhao-oss): add DashboardTab component"
```

---

### Task 4: 同步记录组件

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\components\RecordsTab.tsx`

- [ ] **Step 1: 创建同步记录组件**

```typescript
import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Tag,
  Button,
  Space,
  Select,
  Form,
  Popconfirm,
  message,
} from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOssApi } from '../hooks/useOssApi';

interface SyncRecord {
  id: number;
  fileId: number;
  fileHash: string;
  status: string;
  provider: string;
  remoteUrl: string;
  lastSyncedAt: string;
  errorMessage: string;
}

const statusColors: Record<string, string> = {
  success: 'green',
  failed: 'red',
  pending: 'blue',
  syncing: 'orange',
  deleted: 'default',
};

const statusText: Record<string, string> = {
  success: '成功',
  failed: '失败',
  pending: '待同步',
  syncing: '同步中',
  deleted: '已删除',
};

export const RecordsTab: React.FC = () => {
  const { loading, fetchRecords, triggerSync, deleteRemote } = useOssApi();
  const [records, setRecords] = useState<SyncRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedRowKeys, setSelectedRowKeys] = useState<number[]>([]);
  const [filters, setFilters] = useState<{ status?: string; provider?: string }>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const loadRecords = async () => {
    const result = await fetchRecords({
      page,
      pageSize,
      ...filters,
    });
    if (result) {
      setRecords(result.data || []);
      setTotal(result.meta?.pagination?.total || 0);
    }
  };

  useEffect(() => {
    loadRecords();
  }, [page, pageSize, filters]);

  const handleRetry = async (fileId: number) => {
    const success = await triggerSync(fileId);
    if (success) {
      loadRecords();
    }
  };

  const handleDelete = async (recordId: number) => {
    const success = await deleteRemote(recordId);
    if (success) {
      loadRecords();
    }
  };

  const handleBatchRetry = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要重试的记录');
      return;
    }
    const failedRecords = records.filter(
      (r) => selectedRowKeys.includes(r.id) && r.status === 'failed'
    );
    for (const record of failedRecords) {
      await triggerSync(record.fileId);
    }
    setSelectedRowKeys([]);
    loadRecords();
  };

  const columns = [
    { title: '文件 ID', dataIndex: 'fileId', key: 'fileId', width: 80 },
    {
      title: '文件哈希',
      dataIndex: 'fileHash',
      key: 'fileHash',
      width: 150,
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => (
        <Tag color={statusColors[status] || 'default'}>
          {statusText[status] || status}
        </Tag>
      ),
    },
    { title: '提供者', dataIndex: 'provider', key: 'provider', width: 100 },
    {
      title: '远程 URL',
      dataIndex: 'remoteUrl',
      key: 'remoteUrl',
      ellipsis: true,
      render: (url: string) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer">
            {url}
          </a>
        ) : (
          '-'
        ),
    },
    {
      title: '同步时间',
      dataIndex: 'lastSyncedAt',
      key: 'lastSyncedAt',
      width: 180,
      render: (time: string) => (time ? new Date(time).toLocaleString() : '-'),
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_: any, record: SyncRecord) => (
        <Space>
          {record.status === 'failed' && (
            <Button
              type="link"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetry(record.fileId)}
            >
              重试
            </Button>
          )}
          {record.status === 'success' && (
            <Popconfirm
              title="确定删除远程文件?"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      <Card>
        <Form layout="inline">
          <Form.Item label="状态">
            <Select
              allowClear
              style={{ width: 120 }}
              placeholder="全部"
              value={filters.status}
              onChange={(value) => setFilters({ ...filters, status: value })}
              options={[
                { value: 'success', label: '成功' },
                { value: 'failed', label: '失败' },
                { value: 'pending', label: '待同步' },
                { value: 'syncing', label: '同步中' },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button onClick={loadRecords} loading={loading}>
                刷新
              </Button>
              <Button onClick={handleBatchRetry} disabled={selectedRowKeys.length === 0}>
                批量重试 ({selectedRowKeys.length})
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Table
        columns={columns}
        dataSource={records}
        rowKey="id"
        loading={loading}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as number[]),
        }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (total) => `共 ${total} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />
    </Space>
  );
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/components/RecordsTab.tsx
git commit -m "feat(zhao-oss): add RecordsTab component"
```

---

### Task 5: 配置管理组件

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\components\SettingsTab.tsx`

- [ ] **Step 1: 创建配置管理组件**

```typescript
import React, { useEffect, useState } from 'react';
import { Card, Form, Input, InputNumber, Button, Space, Select, message } from 'antd';
import { SaveOutlined, ApiOutlined, ReloadOutlined } from '@ant-design/icons';
import { useOssApi } from '../hooks/useOssApi';

interface ConfigData {
  provider: string;
  accessKeyId: string;
  accessKeySecret: string;
  bucket: string;
  region: string;
  cname?: string;
  basePath?: string;
  maxRetries?: number;
  uploadTimeoutMs?: number;
}

export const SettingsTab: React.FC = () => {
  const { loading, getConfig, updateConfig, testProvider } = useOssApi();
  const [form] = Form.useForm();
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const result = await getConfig();
    if (result) {
      form.setFieldsValue(result);
    }
  };

  const handleSave = async () => {
    const values = await form.validateFields();
    await updateConfig(values);
  };

  const handleTest = async () => {
    const values = await form.validateFields();
    setTestLoading(true);
    const result = await testProvider(values);
    setTestLoading(false);
    if (result?.success) {
      message.success(`连接成功，延迟: ${result.latency || 0}ms`);
    }
  };

  const handleReset = () => {
    loadConfig();
  };

  return (
    <Card title="配置管理">
      <Form
        form={form}
        layout="vertical"
        style={{ maxWidth: 600 }}
        initialValues={{
          provider: 'aliyun',
          maxRetries: 3,
          uploadTimeoutMs: 30000,
          basePath: 'uploads',
        }}
      >
        <Form.Item
          name="provider"
          label="提供者"
          rules={[{ required: true, message: '请选择提供者' }]}
        >
          <Select
            options={[
              { value: 'aliyun', label: '阿里云 OSS' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="accessKeyId"
          label="Access Key ID"
          rules={[{ required: true, message: '请输入 Access Key ID' }]}
        >
          <Input.Password placeholder="请输入 Access Key ID" />
        </Form.Item>

        <Form.Item
          name="accessKeySecret"
          label="Access Key Secret"
          rules={[{ required: true, message: '请输入 Access Key Secret' }]}
        >
          <Input.Password placeholder="请输入 Access Key Secret" />
        </Form.Item>

        <Form.Item
          name="bucket"
          label="存储桶 (Bucket)"
          rules={[{ required: true, message: '请输入存储桶名称' }]}
        >
          <Input placeholder="请输入存储桶名称" />
        </Form.Item>

        <Form.Item
          name="region"
          label="区域 (Region)"
          rules={[{ required: true, message: '请输入区域' }]}
        >
          <Input placeholder="例如: oss-cn-hangzhou" />
        </Form.Item>

        <Form.Item name="cname" label="自定义域名 (CNAME)">
          <Input placeholder="可选，例如: cdn.example.com" />
        </Form.Item>

        <Form.Item name="basePath" label="存储路径前缀">
          <Input placeholder="默认: uploads" />
        </Form.Item>

        <Form.Item name="maxRetries" label="最大重试次数">
          <InputNumber min={0} max={10} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item name="uploadTimeoutMs" label="上传超时 (毫秒)">
          <InputNumber min={1000} max={300000} step={1000} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              onClick={handleSave}
              loading={loading}
            >
              保存配置
            </Button>
            <Button
              icon={<ApiOutlined />}
              onClick={handleTest}
              loading={testLoading}
            >
              测试连接
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              重置
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  );
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/components/SettingsTab.tsx
git commit -m "feat(zhao-oss): add SettingsTab component"
```

---

### Task 6: 操作中心组件

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\components\ActionsTab.tsx`

- [ ] **Step 1: 创建操作中心组件**

```typescript
import React, { useState } from 'react';
import { Card, Form, InputNumber, Button, Space, message, Divider, Typography } from 'antd';
import { SyncOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useOssApi } from '../hooks/useOssApi';

const { Text } = Typography;

export const ActionsTab: React.FC = () => {
  const { loading, triggerSync, batchSync } = useOssApi();
  const [singleForm] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [result, setResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  const handleSingleSync = async () => {
    const values = await singleForm.validateFields();
    const success = await triggerSync(values.fileId);
    if (success) {
      singleForm.resetFields();
    }
  };

  const handleBatchSync = async () => {
    const values = await batchForm.validateFields();
    const result = await batchSync(values.limit, values.offset);
    if (result) {
      setResult(result);
    }
  };

  return (
    <Space direction="vertical" style={{ width: '100%' }} size="large">
      <Card title="单个文件同步">
        <Form form={singleForm} layout="inline" initialValues={{ fileId: null }}>
          <Form.Item
            name="fileId"
            label="文件 ID"
            rules={[{ required: true, message: '请输入文件 ID' }]}
          >
            <InputNumber min={1} placeholder="请输入文件 ID" style={{ width: 150 }} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<SyncOutlined />}
              onClick={handleSingleSync}
              loading={loading}
            >
              同步
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="批量同步">
        <Form
          form={batchForm}
          layout="inline"
          initialValues={{ limit: 50, offset: 0 }}
        >
          <Form.Item name="limit" label="每次数量">
            <InputNumber min={1} max={500} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="offset" label="起始偏移">
            <InputNumber min={0} style={{ width: 100 }} />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              icon={<CloudUploadOutlined />}
              onClick={handleBatchSync}
              loading={loading}
            >
              批量同步
            </Button>
          </Form.Item>
        </Form>

        {result && (
          <>
            <Divider />
            <Space size="large">
              <Text>总计: {result.total}</Text>
              <Text type="success">成功: {result.success}</Text>
              <Text type="danger">失败: {result.failed}</Text>
            </Space>
          </>
        )}
      </Card>

      <Card title="说明">
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>单个文件同步：输入文件 ID，触发该文件的云端备份</li>
          <li>批量同步：从指定偏移开始，同步指定数量的文件</li>
          <li>同步失败会自动重试，重试次数由配置决定</li>
        </ul>
      </Card>
    </Space>
  );
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/components/ActionsTab.tsx
git commit -m "feat(zhao-oss): add ActionsTab component"
```

---

### Task 7: 主页面组件

**Files:**
- Create: `e:\code\plugins\zhao-oss\admin\src\pages\HomePage.tsx`

- [ ] **Step 1: 创建主页面组件**

```typescript
import React from 'react';
import { Tabs, Card } from 'antd';
import { DashboardTab } from '../components/DashboardTab';
import { RecordsTab } from '../components/RecordsTab';
import { SettingsTab } from '../components/SettingsTab';
import { ActionsTab } from '../components/ActionsTab';

export const HomePage: React.FC = () => {
  const items = [
    {
      key: 'dashboard',
      label: '仪表盘',
      children: <DashboardTab />,
    },
    {
      key: 'records',
      label: '同步记录',
      children: <RecordsTab />,
    },
    {
      key: 'settings',
      label: '配置管理',
      children: <SettingsTab />,
    },
    {
      key: 'actions',
      label: '操作中心',
      children: <ActionsTab />,
    },
  ];

  return (
    <Card style={{ margin: 16 }}>
      <Tabs items={items} />
    </Card>
  );
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/pages/HomePage.tsx
git commit -m "feat(zhao-oss): add HomePage with Tab navigation"
```

---

### Task 8: 更新插件入口

**Files:**
- Modify: `e:\code\plugins\zhao-oss\admin\src\index.ts`

- [ ] **Step 1: 更新插件注册**

```typescript
import { App } from "./pages/App";

export default {
  register(app: any) {
    app.addMenuLink({
      label: { id: 'zhao-oss.menu.label', defaultMessage: 'OSS Backup' },
      to: "/plugins/zhao-oss",
      icon: "CloudUpload",
      permissions: [
        { action: 'plugin::zhao-oss.oss.sync.read', subject: null },
      ],
      async Component() {
        const { default: component } = await import("./pages/HomePage");
        return component;
      },
    });

    app.registerPlugin({
      id: "zhao-oss",
      name: "Zhao OSS",
    });
  },

  bootstrap(app: any) {},
};
```

- [ ] **Step 2: 提交代码**

```bash
cd e:\code\plugins\zhao-oss
git add admin/src/index.ts
git commit -m "feat(zhao-oss): update plugin registration with i18n menu label"
```

---

### Task 9: 构建测试

**Files:**
- 无新增文件

- [ ] **Step 1: 安装依赖**

```bash
cd e:\code\plugins\zhao-oss
npm install
```

- [ ] **Step 2: 构建前端代码**

```bash
cd e:\code\plugins\zhao-oss
npm run build
```

预期：构建成功，无错误

- [ ] **Step 3: 提交构建产物**

```bash
cd e:\code\plugins\zhao-oss
git add dist/
git commit -m "build(zhao-oss): build admin UI"
```

---

### Task 10: 最终提交

**Files:**
- 无新增文件

- [ ] **Step 1: 查看所有更改**

```bash
cd e:\code\plugins\zhao-oss
git status
git log --oneline -10
```

- [ ] **Step 2: 推送到远程**

```bash
cd e:\code\plugins\zhao-oss
git push origin main
```

---

## 实现顺序总结

1. ✅ Task 1: API 客户端封装
2. ✅ Task 2: 国际化翻译文件
3. ✅ Task 3: 仪表盘组件
4. ✅ Task 4: 同步记录组件
5. ✅ Task 5: 配置管理组件
6. ✅ Task 6: 操作中心组件
7. ✅ Task 7: 主页面组件
8. ✅ Task 8: 更新插件入口
9. ✅ Task 9: 构建测试
10. ✅ Task 10: 最终提交
