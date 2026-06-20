import { useCallback, useEffect, useState } from "react";
import {
  Main,
  Box,
  Flex,
  Typography,
  Button,
  Table,
  Thead,
  Tbody,
  Tr,
  Td,
  Th,
  Modal,
  Field,
  TextInput,
  Status,
  Card,
  CardHeader,
  CardBody,
  Grid,
  EmptyStateLayout,
  Loader,
} from "@strapi/design-system";
import { Plus, ArrowClockwise, Trash, Play } from "@strapi/icons";
import { useFetchClient } from "@strapi/strapi/admin";

const API_PREFIX = "/admin/plugins/zhao-oss";

const statusVariant: Record<string, "success" | "danger" | "primary" | "warning" | "neutral"> = {
  success: "success",
  failed: "danger",
  pending: "primary",
  syncing: "warning",
  deleted: "neutral",
};

const statusText: Record<string, string> = {
  success: "成功",
  failed: "失败",
  pending: "待同步",
  syncing: "同步中",
  deleted: "已删除",
};

const TAB_LIST = [
  { value: "dashboard", label: "仪表盘" },
  { value: "records", label: "同步记录" },
  { value: "settings", label: "配置管理" },
  { value: "actions", label: "操作中心" },
];

const HomePage = () => {
  const { get, post, put, del } = useFetchClient();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [dashboard, setDashboard] = useState<any>(null);
  const [health, setHealth] = useState<any>(null);
  const [records, setRecords] = useState<any[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsPage, setRecordsPage] = useState(1);
  const [config, setConfig] = useState<any>(null);

  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncFileId, setSyncFileId] = useState("");
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchLimit, setBatchLimit] = useState("50");
  const [batchOffset, setBatchOffset] = useState("0");
  const [batchResult, setBatchResult] = useState<{ total: number; success: number; failed: number } | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/sync/dashboard`);
      setDashboard(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const loadHealth = useCallback(async () => {
    try {
      const { data } = await get(`${API_PREFIX}/sync/health`);
      setHealth(data);
    } catch (e: any) {
      console.error(e);
    }
  }, [get]);

  const loadRecords = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/sync/records?page=${page}&pageSize=20`);
      setRecords(data?.data || []);
      setRecordsTotal(data?.meta?.pagination?.total || 0);
      setRecordsPage(page);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);

  const loadConfig = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await get(`${API_PREFIX}/settings`);
      setConfig(data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [get]);

  useEffect(() => {
    loadDashboard();
    loadHealth();
  }, [loadDashboard, loadHealth]);

  const handleTriggerSync = async (fileId: number) => {
    try {
      await post(`${API_PREFIX}/sync/trigger`, { fileId });
      loadRecords(recordsPage);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleBatchSync = async (limit: number, offset: number) => {
    try {
      const { data } = await post(`${API_PREFIX}/sync/batch`, { limit, offset });
      setBatchResult(data);
      loadRecords(recordsPage);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleDeleteRemote = async (recordId: number) => {
    if (!window.confirm("确定删除远程文件?")) return;
    try {
      await del(`${API_PREFIX}/sync/remote/${recordId}`);
      loadRecords(recordsPage);
    } catch (e: any) {
      console.error(e);
    }
  };

  const handleSaveConfig = async (data: any) => {
    try {
      await put(`${API_PREFIX}/settings`, data);
      setConfig(data);
    } catch (e: any) {
      console.error(e);
    }
  };

  if (loading && !dashboard) return <Loader>加载中...</Loader>;

  return (
    <Main>
      <Box paddingTop={6} paddingBottom={4} paddingLeft={10} paddingRight={10} background="neutral0">
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="alpha" fontWeight="bold" tag="h1">
              OSS 备份管理
            </Typography>
            <Box paddingTop={1}>
              <Typography variant="epsilon" textColor="neutral600" tag="p">
                多媒体文件统一存储备份迁移
              </Typography>
            </Box>
          </Box>
        </Flex>
      </Box>

      <Box paddingLeft={10} paddingRight={10} paddingTop={2} paddingBottom={2}>
        <Flex gap={2} wrap="wrap">
          {TAB_LIST.map((t) => (
            <Button
              key={t.value}
              variant={activeTab === t.value ? "default" : "secondary"}
              onClick={() => {
                setActiveTab(t.value);
                if (t.value === "records" && records.length === 0) loadRecords(1);
                if (t.value === "settings" && !config) loadConfig();
              }}
            >
              {t.label}
            </Button>
          ))}
        </Flex>
      </Box>

      <Box paddingLeft={10} paddingRight={10} paddingTop={4}>
        {activeTab === "dashboard" && (
          <Flex direction="column" gap={4} alignItems="stretch">
            <Grid.Root gridCols={4} gap={4}>
              <Grid.Item col={1}>
                <Card>
                  <CardHeader><Typography variant="sigma">总文件数</Typography></CardHeader>
                  <CardBody><Typography variant="alpha" fontWeight="bold">{dashboard?.stats?.total || 0}</Typography></CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item col={1}>
                <Card>
                  <CardHeader><Typography variant="sigma">已同步</Typography></CardHeader>
                  <CardBody><Typography variant="alpha" fontWeight="bold" textColor="success600">{dashboard?.stats?.synced || 0}</Typography></CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item col={1}>
                <Card>
                  <CardHeader><Typography variant="sigma">同步失败</Typography></CardHeader>
                  <CardBody><Typography variant="alpha" fontWeight="bold" textColor="danger600">{dashboard?.stats?.failed || 0}</Typography></CardBody>
                </Card>
              </Grid.Item>
              <Grid.Item col={1}>
                <Card>
                  <CardHeader><Typography variant="sigma">待同步</Typography></CardHeader>
                  <CardBody><Typography variant="alpha" fontWeight="bold" textColor="primary600">{dashboard?.stats?.pending || 0}</Typography></CardBody>
                </Card>
              </Grid.Item>
            </Grid.Root>

            <Card>
              <CardHeader>
                <Flex justifyContent="space-between" width="100%">
                  <Typography variant="sigma">健康状态</Typography>
                  <Button size="S" variant="tertiary" startIcon={<ArrowClockwise />} onClick={loadHealth}>刷新</Button>
                </Flex>
              </CardHeader>
              <CardBody>
                <Flex gap={4}>
                  <Typography>提供者: {health?.provider || "-"}</Typography>
                  <Status variant={health?.healthy ? "success" : "danger"}>
                    <Typography>{health?.healthy ? "正常" : "异常"}</Typography>
                  </Status>
                </Flex>
              </CardBody>
            </Card>
          </Flex>
        )}

        {activeTab === "records" && (
          <Flex direction="column" gap={4} alignItems="stretch">
            <Flex gap={2}>
              <Button variant="secondary" startIcon={<ArrowClockwise />} onClick={() => loadRecords(recordsPage)}>刷新</Button>
              <Button variant="secondary" startIcon={<Play />} onClick={() => setShowBatchModal(true)}>批量重试</Button>
            </Flex>

            {records.length === 0 ? (
              <Box background="neutral100" padding={8} borderRadius={4}>
                <EmptyStateLayout content="暂无同步记录" />
              </Box>
            ) : (
              <Box background="neutral0" borderRadius={4} shadow="filterShadow">
                <Table colCount={5} rowCount={records.length}>
                  <Thead>
                    <Tr>
                      <Th><Typography variant="sigma">文件 ID</Typography></Th>
                      <Th><Typography variant="sigma">状态</Typography></Th>
                      <Th><Typography variant="sigma">提供者</Typography></Th>
                      <Th><Typography variant="sigma">同步时间</Typography></Th>
                      <Th><Typography variant="sigma">操作</Typography></Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {records.map((record: any) => (
                      <Tr key={record.id}>
                        <Td><Typography>{record.fileId}</Typography></Td>
                        <Td>
                          <Status variant={statusVariant[record.status] || "neutral"}>
                            <Typography>{statusText[record.status] || record.status}</Typography>
                          </Status>
                        </Td>
                        <Td><Typography>{record.provider}</Typography></Td>
                        <Td><Typography textColor="neutral600">{record.lastSyncedAt ? new Date(record.lastSyncedAt).toLocaleString() : "-"}</Typography></Td>
                        <Td>
                          <Flex gap={2}>
                            {record.status === "failed" && (
                              <Button size="S" variant="tertiary" startIcon={<ArrowClockwise />} onClick={() => handleTriggerSync(record.fileId)}>重试</Button>
                            )}
                            {record.status === "success" && (
                              <Button size="S" variant="danger-light" startIcon={<Trash />} onClick={() => handleDeleteRemote(record.id)}>删除</Button>
                            )}
                          </Flex>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              </Box>
            )}

            {recordsTotal > 20 && (
              <Flex justifyContent="center" gap={2} paddingTop={4}>
                <Button variant="tertiary" disabled={recordsPage <= 1} onClick={() => loadRecords(recordsPage - 1)}>上一页</Button>
                <Typography>{recordsPage} / {Math.ceil(recordsTotal / 20)}</Typography>
                <Button variant="tertiary" disabled={recordsPage >= Math.ceil(recordsTotal / 20)} onClick={() => loadRecords(recordsPage + 1)}>下一页</Button>
              </Flex>
            )}
          </Flex>
        )}

        {activeTab === "settings" && (
          <Flex direction="column" gap={4} maxWidth="600px" alignItems="stretch">
            {config ? (
              <>
                <Typography variant="delta">OSS 配置</Typography>
                <Card>
                  <CardBody>
                    <Flex direction="column" gap={3}>
                      <Typography>提供者: {config.provider || "-"}</Typography>
                      <Typography>存储桶: {config.bucket || "-"}</Typography>
                      <Typography>区域: {config.region || "-"}</Typography>
                      <Typography>路径前缀: {config.basePath || "uploads"}</Typography>
                      <Typography>最大重试: {config.maxRetries || 3}</Typography>
                      <Typography>超时(ms): {config.uploadTimeoutMs || 30000}</Typography>
                    </Flex>
                  </CardBody>
                </Card>
                <Button variant="secondary" startIcon={<ArrowClockwise />} onClick={() => loadConfig()}>刷新配置</Button>
              </>
            ) : (
              <Box background="neutral100" padding={8} borderRadius={4}>
                <EmptyStateLayout content="暂无配置信息" />
              </Box>
            )}
          </Flex>
        )}

        {activeTab === "actions" && (
          <Flex direction="column" gap={4} alignItems="stretch">
            <Card>
              <CardHeader><Typography variant="sigma">单个文件同步</Typography></CardHeader>
              <CardBody>
                <Button startIcon={<Play />} onClick={() => setShowSyncModal(true)}>触发同步</Button>
              </CardBody>
            </Card>
            <Card>
              <CardHeader><Typography variant="sigma">批量同步</Typography></CardHeader>
              <CardBody>
                <Flex direction="column" gap={3} alignItems="stretch">
                  <Button startIcon={<Plus />} onClick={() => setShowBatchModal(true)}>批量同步</Button>
                  {batchResult && (
                    <Flex gap={4}>
                      <Typography>总计: {batchResult.total}</Typography>
                      <Typography textColor="success600">成功: {batchResult.success}</Typography>
                      <Typography textColor="danger600">失败: {batchResult.failed}</Typography>
                    </Flex>
                  )}
                </Flex>
              </CardBody>
            </Card>
          </Flex>
        )}
      </Box>

      {showSyncModal && (
        <Modal.Root
          open={showSyncModal}
          onOpenChange={(open: boolean) => {
            if (!open) setShowSyncModal(false);
          }}
        >
          <Modal.Content>
            <Modal.Header closeLabel="关闭">
              <Modal.Title>单个文件同步</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4} alignItems="stretch">
                <Field.Root name="fileId" required>
                  <Field.Label>文件 ID</Field.Label>
                  <TextInput
                    value={syncFileId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSyncFileId(e.target.value)}
                    placeholder="请输入文件 ID"
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Flex justifyContent="space-between" width="100%">
                <Button variant="tertiary" onClick={() => setShowSyncModal(false)}>取消</Button>
                <Button onClick={() => {
                  const id = parseInt(syncFileId);
                  if (!isNaN(id)) {
                    handleTriggerSync(id);
                    setSyncFileId("");
                    setShowSyncModal(false);
                  }
                }}>同步</Button>
              </Flex>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}

      {showBatchModal && (
        <Modal.Root
          open={showBatchModal}
          onOpenChange={(open: boolean) => {
            if (!open) setShowBatchModal(false);
          }}
        >
          <Modal.Content>
            <Modal.Header closeLabel="关闭">
              <Modal.Title>批量同步</Modal.Title>
            </Modal.Header>
            <Modal.Body>
              <Flex direction="column" gap={4} alignItems="stretch">
                <Field.Root name="limit">
                  <Field.Label>每次数量</Field.Label>
                  <TextInput
                    value={batchLimit}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchLimit(e.target.value)}
                    placeholder="50"
                  />
                </Field.Root>
                <Field.Root name="offset">
                  <Field.Label>起始偏移</Field.Label>
                  <TextInput
                    value={batchOffset}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBatchOffset(e.target.value)}
                    placeholder="0"
                  />
                </Field.Root>
              </Flex>
            </Modal.Body>
            <Modal.Footer>
              <Flex justifyContent="space-between" width="100%">
                <Button variant="tertiary" onClick={() => setShowBatchModal(false)}>取消</Button>
                <Button onClick={() => {
                  const limit = parseInt(batchLimit) || 50;
                  const offset = parseInt(batchOffset) || 0;
                  handleBatchSync(limit, offset);
                  setShowBatchModal(false);
                }}>批量同步</Button>
              </Flex>
            </Modal.Footer>
          </Modal.Content>
        </Modal.Root>
      )}
    </Main>
  );
};

export { HomePage };
